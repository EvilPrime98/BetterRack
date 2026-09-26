import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    resolveSevenZipPath,
    SEVEN_ZIP_ENV_VAR,
    SevenZipDecompressor,
    type TSevenZipLookup
} from './seven-zip-decompressor.model';

const originalSpawn = Bun.spawn.bind(Bun);

const SEVEN_ZIP_NAMES = process.platform === 'win32' ? ['7z'] : ['7zz', '7z', '7za'];

const findSevenZip = (): string | null => {
    for (const name of SEVEN_ZIP_NAMES) {
        const found = Bun.which(name);
        if (found) return found;
    }
    return null;
};

const requireSevenZip = (): string => {
    const bin = findSevenZip();
    if (!bin) throw new Error('7z not found on PATH; required by the SevenZipDecompressor tests.');
    return bin;
};

const runSevenZip = async (args: string[]): Promise<void> => {
    const proc = originalSpawn([requireSevenZip(), ...args], { stdout: 'ignore', stderr: 'ignore' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`7z ${args.join(' ')} failed with code ${exitCode}`);
};

const installSpawnCounter = () => {
    let count = 0;
    Bun.spawn = ((...args: Parameters<typeof originalSpawn>) => {
        count++;
        return originalSpawn(...args);
    }) as typeof Bun.spawn;
    return { count: () => count };
};

const restoreSpawn = () => {
    Bun.spawn = originalSpawn as typeof Bun.spawn;
};

const fixturePath = (name: string) => path.join(import.meta.dir, 'fixtures', name);

const canOpenArchive = (filePath: string): boolean => {
    const bin = findSevenZip();
    if (!bin) return false;
    return Bun.spawnSync([bin, 'l', filePath], { stdout: 'ignore', stderr: 'ignore' }).exitCode === 0;
};

const rarPageContent = (pageNumber: string) => `page-${pageNumber}-${'x'.repeat(400)}`;

const RAR_FIXTURES = [
    { label: 'RAR4', file: 'rar4.cbr' },
    { label: 'RAR4 solid', file: 'rar4-solid.cbr' },
    { label: 'RAR5', file: 'rar5.cbr' },
    { label: 'RAR5 solid', file: 'rar5-solid.cbr' }
];

describe('SevenZipDecompressor on ZIP archives', () => {

    let workDir: string;
    let sourceDir: string;
    let archivePath: string;
    let pagePaths: string[];
    let spawns: { count: () => number };

    beforeEach(async () => {
        workDir = await mkdtemp(path.join(tmpdir(), 'seven-zip-test-'));
        sourceDir = path.join(workDir, 'source');
        archivePath = path.join(workDir, 'comic.cbz');

        await mkdir(sourceDir, { recursive: true });
        pagePaths = await Promise.all(
            Array.from({ length: 23 }, async (_, index) => {
                const pageNumber = String(index + 1).padStart(3, '0');
                const pagePath = path.join(sourceDir, `${pageNumber}.jpg`);
                await writeFile(pagePath, `page-${pageNumber}`);
                return pagePath;
            })
        );
        await writeFile(
            path.join(sourceDir, 'ComicInfo.xml'),
            '<ComicInfo><Pages><Page Image="0" Bookmark="Cover" /></Pages></ComicInfo>'
        );

        await runSevenZip([
            'a',
            archivePath,
            ...pagePaths,
            path.join(sourceDir, 'ComicInfo.xml')
        ]);

        spawns = installSpawnCounter();
    });

    afterEach(async () => {
        restoreSpawn();
        await rm(workDir, { recursive: true, force: true });
    });

    describe('entry-list cache', () => {

        test('lists every page in a 23-page archive', async () => {
            const zip = new SevenZipDecompressor();

            const pages = await zip.listPages({ filePath: archivePath });

            expect(pages).toHaveLength(23);
            expect(pages.at(-1)).toBe('023.jpg');
        });

        test('listPages spawns the listing process once across repeated calls on an unchanged file', async () => {
            const zip = new SevenZipDecompressor();

            const first = await zip.listPages({ filePath: archivePath });
            const spawnsAfterFirst = spawns.count();

            const second = await zip.listPages({ filePath: archivePath });

            expect(second).toEqual(first);
            expect(spawns.count()).toBe(spawnsAfterFirst);
        });

        test('a changed archive on disk bypasses the stale cache entry', async () => {
            const zip = new SevenZipDecompressor();

            const before = await zip.listPages({ filePath: archivePath });
            const spawnsAfterFirst = spawns.count();

            await writeFile(path.join(sourceDir, '024.jpg'), 'page-024');
            await runSevenZip(['a', archivePath, path.join(sourceDir, '024.jpg')]);

            const after = await zip.listPages({ filePath: archivePath });

            expect(after.length).toBe(before.length + 1);
            expect(spawns.count()).toBeGreaterThan(spawnsAfterFirst);
        });

        test('evictArchiveCache forces the next listPages call to re-spawn even on an unchanged file', async () => {
            const zip = new SevenZipDecompressor();

            await zip.listPages({ filePath: archivePath });
            const spawnsAfterFirst = spawns.count();

            zip.evictArchiveCache(archivePath);
            const after = await zip.listPages({ filePath: archivePath });

            expect(after).toHaveLength(23);
            expect(spawns.count()).toBeGreaterThan(spawnsAfterFirst);
        });

        test('removes stale cache entries when an archive changes', async () => {
            const zip = new SevenZipDecompressor();

            await zip.extractComicInfo({ filePath: archivePath });
            await writeFile(path.join(sourceDir, '024.jpg'), 'page-024');
            await runSevenZip(['a', archivePath, path.join(sourceDir, '024.jpg')]);

            await zip.listPages({ filePath: archivePath });

            const internals = zip as unknown as { entryListCache: Map<string, unknown>; comicInfoCache: Map<string, unknown> };
            expect(internals.entryListCache.size).toBe(1);
            expect(internals.comicInfoCache.size).toBe(0);
        });

    });

    describe('ComicInfo cache', () => {

        test('extractBookmarks reuses extractComicInfo\'s cached parse instead of re-extracting the archive', async () => {
            const zip = new SevenZipDecompressor();

            const info = await zip.extractComicInfo({ filePath: archivePath });
            const spawnsAfterInfo = spawns.count();

            const bookmarks = await zip.extractBookmarks({ filePath: archivePath });

            expect(info?.ComicInfo?.Pages?.Page).toBeDefined();
            expect(bookmarks).toEqual([{ page: 1, label: 'Cover' }]);
            expect(spawns.count()).toBe(spawnsAfterInfo);
        });

    });

    describe('ComicInfo spec compliance', () => {

        test('ignores a ComicInfo.xml nested in a subfolder', async () => {
            await mkdir(path.join(sourceDir, 'Sub'), { recursive: true });
            await writeFile(path.join(sourceDir, 'Sub', 'ComicInfo.xml'), '<ComicInfo><Series>Nested</Series></ComicInfo>');
            await runSevenZip(['a', archivePath, path.join(sourceDir, 'Sub')]);

            const zip = new SevenZipDecompressor();
            const info = await zip.extractComicInfo({ filePath: archivePath });

            expect(info?.ComicInfo?.Series).toBeUndefined();
        });

        test('falls back to a sidecar .xml next to the archive when the archive has no ComicInfo.xml', async () => {
            const bareArchive = path.join(workDir, 'bare.cbz');
            await runSevenZip(['a', bareArchive, pagePaths[0]!]);
            await writeFile(path.join(workDir, 'bare.xml'), '<ComicInfo><Series>Sidecar</Series></ComicInfo>');

            const zip = new SevenZipDecompressor();
            const info = await zip.extractComicInfo({ filePath: bareArchive });

            expect(info?.ComicInfo?.Series).toBe('Sidecar');
        });

    });

    describe('page access', () => {

        test('getPageStream returns the bytes of the requested entry', async () => {
            const zip = new SevenZipDecompressor();

            const text = await new Response(zip.getPageStream({ filePath: archivePath, entryName: '002.jpg' })).text();

            expect(text).toBe('page-002');
        });

        test('getPageStream errors when the entry does not exist in the archive', async () => {
            const zip = new SevenZipDecompressor();

            const stream = zip.getPageStream({ filePath: archivePath, entryName: 'missing.jpg' });

            await expect(new Response(stream).text()).rejects.toThrow(/missing\.jpg/);
        });

        test('getPageStream throws when the archive file does not exist', () => {
            const zip = new SevenZipDecompressor();

            expect(() => zip.getPageStream({ filePath: path.join(workDir, 'nope.cbz'), entryName: '001.jpg' }))
                .toThrow(/Archive not found/);
        });

        test('extractPage writes the entry into outDir', async () => {
            const zip = new SevenZipDecompressor();
            const outDir = path.join(workDir, 'out');

            await zip.extractPage({ filePath: archivePath, outDir, entryName: '003.jpg' });

            expect(await readFile(path.join(outDir, '003.jpg'), 'utf-8')).toBe('page-003');
        });

        test('extractEntries writes every requested entry and does nothing for an empty list', async () => {
            const zip = new SevenZipDecompressor();
            const outDir = path.join(workDir, 'out');

            await zip.extractEntries({ filePath: archivePath, outDir, entryNames: [] });
            const spawnsAfterEmpty = spawns.count();
            await zip.extractEntries({ filePath: archivePath, outDir, entryNames: ['001.jpg', '002.jpg'] });

            expect(spawnsAfterEmpty).toBe(0);
            expect(await readFile(path.join(outDir, '001.jpg'), 'utf-8')).toBe('page-001');
            expect(await readFile(path.join(outDir, '002.jpg'), 'utf-8')).toBe('page-002');
        });

        test('getPageMimeType maps image extensions and falls back to octet-stream', () => {
            const zip = new SevenZipDecompressor();

            expect(zip.getPageMimeType('a.JPG')).toBe('image/jpeg');
            expect(zip.getPageMimeType('a.webp')).toBe('image/webp');
            expect(zip.getPageMimeType('a.xml')).toBe('application/octet-stream');
        });

        test('listPages throws when the archive has no image pages', async () => {
            const textOnly = path.join(workDir, 'text-only.zip');
            await runSevenZip(['a', textOnly, path.join(sourceDir, 'ComicInfo.xml')]);
            const zip = new SevenZipDecompressor();

            await expect(zip.listPages({ filePath: textOnly })).rejects.toThrow(/No image pages found/);
        });

    });

    describe('unsafe entry names', () => {

        const unsafeNames = ['../evil.jpg', 'a/../../evil.jpg', '/abs/evil.jpg', '\\share\\evil.jpg', 'C:\\evil.jpg', 'C:evil.jpg', 'a//b.jpg', '', '   '];

        for (const entryName of unsafeNames) {

            test(`getPageStream rejects ${JSON.stringify(entryName)} before spawning anything`, () => {
                const zip = new SevenZipDecompressor();

                expect(() => zip.getPageStream({ filePath: archivePath, entryName })).toThrow(/Rejected suspicious archive entry path/);
                expect(spawns.count()).toBe(0);
            });

            test(`extractEntries rejects ${JSON.stringify(entryName)} before spawning anything`, async () => {
                const zip = new SevenZipDecompressor();

                await expect(zip.extractEntries({ filePath: archivePath, outDir: path.join(workDir, 'out'), entryNames: ['001.jpg', entryName] }))
                    .rejects.toThrow(/Rejected suspicious archive entry path/);
                expect(spawns.count()).toBe(0);
            });

        }

    });

    describe('binary resolution memoization', () => {

        test('resolves the binary once and reuses it across calls', async () => {
            let resolutions = 0;
            const zip = new SevenZipDecompressor({
                resolve7zPath: () => {
                    resolutions++;
                    return requireSevenZip();
                }
            });

            await zip.listPages({ filePath: archivePath });
            zip.evictArchiveCache(archivePath);
            await zip.listPages({ filePath: archivePath });
            await new Response(zip.getPageStream({ filePath: archivePath, entryName: '001.jpg' })).text();

            expect(resolutions).toBe(1);
        });

        test('does not memoize a failed resolution', async () => {
            let resolutions = 0;
            const zip = new SevenZipDecompressor({
                resolve7zPath: () => {
                    resolutions++;
                    if (resolutions === 1) throw new Error('7z executable not found.');
                    return requireSevenZip();
                }
            });

            await expect(zip.listPages({ filePath: archivePath })).rejects.toThrow(/7z executable not found/);
            const pages = await zip.listPages({ filePath: archivePath });

            expect(pages).toHaveLength(23);
            expect(resolutions).toBe(2);
        });

        test('surfaces the missing-binary error from the default resolver', async () => {
            const zip = new SevenZipDecompressor({
                resolve7zPath: () => resolveSevenZipPath({ env: {}, which: () => null, exists: () => false, platform: 'linux' })
            });

            await expect(zip.listPages({ filePath: archivePath })).rejects.toThrow(new RegExp(`7z executable not found.*${SEVEN_ZIP_ENV_VAR}`));
        });

    });

    describe('default resolver reads the environment', () => {

        let originalEnvValue: string | undefined;

        beforeEach(() => {
            originalEnvValue = process.env[SEVEN_ZIP_ENV_VAR];
        });

        afterEach(() => {
            if (originalEnvValue === undefined) delete process.env[SEVEN_ZIP_ENV_VAR];
            else process.env[SEVEN_ZIP_ENV_VAR] = originalEnvValue;
        });

        test('spawns the binary named by SEVEN_ZIP_PATH', async () => {
            process.env[SEVEN_ZIP_ENV_VAR] = requireSevenZip();
            const zip = new SevenZipDecompressor();
            const spawned: unknown[] = [];
            Bun.spawn = ((cmd: unknown[], ...rest: unknown[]) => {
                spawned.push(cmd[0]);
                return (originalSpawn as (...a: unknown[]) => unknown)(cmd, ...rest);
            }) as unknown as typeof Bun.spawn;

            await zip.listPages({ filePath: archivePath });

            expect(spawned[0]).toBe(process.env[SEVEN_ZIP_ENV_VAR]);
        });

    });

});

describe('SevenZipDecompressor on RAR archives', () => {

    let workDir: string;
    let spawns: { count: () => number };

    beforeEach(async () => {
        workDir = await mkdtemp(path.join(tmpdir(), 'seven-zip-rar-test-'));
        spawns = installSpawnCounter();
    });

    afterEach(async () => {
        restoreSpawn();
        await rm(workDir, { recursive: true, force: true });
    });

    for (const { label, file } of RAR_FIXTURES) {

        const archivePath = fixturePath(file);

        describe.skipIf(!canOpenArchive(archivePath))(`${label} (${file})`, () => {

            test('listPages returns the images in natural order and skips other entries', async () => {
                const zip = new SevenZipDecompressor();

                const pages = await zip.listPages({ filePath: archivePath });

                expect(pages).toEqual(['001.jpg', '002.jpg', '010.jpg']);
            });

            test('listEntries includes nested files and excludes directory entries', async () => {
                const zip = new SevenZipDecompressor();

                const entries = (await zip.listEntries(archivePath)).map(entry => entry.replace(/\\/g, '/'));

                expect(entries).toContain('Extras/note.txt');
                expect(entries).not.toContain('Extras');
                expect(entries).toContain('ComicInfo.xml');
            });

            test('listPages spawns the listing process once across repeated calls', async () => {
                const zip = new SevenZipDecompressor();

                await zip.listPages({ filePath: archivePath });
                const spawnsAfterFirst = spawns.count();
                await zip.listPages({ filePath: archivePath });

                expect(spawns.count()).toBe(spawnsAfterFirst);
            });

            test('getPageStream returns the exact bytes of an entry', async () => {
                const zip = new SevenZipDecompressor();

                const text = await new Response(zip.getPageStream({ filePath: archivePath, entryName: '010.jpg' })).text();

                expect(text).toBe(rarPageContent('010'));
            });

            test('getPageStream reads every page independently of the order they are requested in', async () => {
                const zip = new SevenZipDecompressor();

                const texts: string[] = [];
                for (const entryName of ['010.jpg', '001.jpg', '002.jpg']) {
                    texts.push(await new Response(zip.getPageStream({ filePath: archivePath, entryName })).text());
                }

                expect(texts).toEqual([rarPageContent('010'), rarPageContent('001'), rarPageContent('002')]);
            });

            test('getPageStream errors for an entry that is not in the archive', async () => {
                const zip = new SevenZipDecompressor();

                const stream = zip.getPageStream({ filePath: archivePath, entryName: 'missing.jpg' });

                await expect(new Response(stream).text()).rejects.toThrow(/missing\.jpg/);
            });

            test('extractPage writes the entry into outDir', async () => {
                const zip = new SevenZipDecompressor();

                await zip.extractPage({ filePath: archivePath, outDir: workDir, entryName: '002.jpg' });

                expect(await readFile(path.join(workDir, '002.jpg'), 'utf-8')).toBe(rarPageContent('002'));
            });

            test('extractEntries writes several entries including a nested one', async () => {
                const zip = new SevenZipDecompressor();

                await zip.extractEntries({ filePath: archivePath, outDir: workDir, entryNames: ['001.jpg', 'Extras/note.txt'] });

                expect(await readFile(path.join(workDir, '001.jpg'), 'utf-8')).toBe(rarPageContent('001'));
                expect(await readFile(path.join(workDir, 'Extras', 'note.txt'), 'utf-8')).toBe('extra');
            });

            test('extractComicInfo parses the root ComicInfo.xml', async () => {
                const zip = new SevenZipDecompressor();

                const info = await zip.extractComicInfo({ filePath: archivePath });

                expect(info?.ComicInfo?.Series).toBe('Rar Fixture');
            });

            test('extractBookmarks reads bookmarks from the ComicInfo.xml', async () => {
                const zip = new SevenZipDecompressor();

                const bookmarks = await zip.extractBookmarks({ filePath: archivePath });

                expect(bookmarks).toEqual([{ page: 1, label: 'Cover' }]);
            });

            test('rejects unsafe entry names', async () => {
                const zip = new SevenZipDecompressor();

                expect(() => zip.getPageStream({ filePath: archivePath, entryName: '../evil.jpg' })).toThrow(/Rejected suspicious/);
                await expect(zip.extractEntries({ filePath: archivePath, outDir: workDir, entryNames: ['/abs.jpg'] })).rejects.toThrow(/Rejected suspicious/);
            });

        });

    }

});

describe('resolveSevenZipPath', () => {

    const lookup = (overrides: Partial<TSevenZipLookup>): TSevenZipLookup => ({
        env: {},
        which: () => null,
        exists: () => false,
        platform: 'linux',
        ...overrides
    });

    test('prefers SEVEN_ZIP_PATH over PATH and known install locations', () => {
        const resolved = resolveSevenZipPath(lookup({
            env: { [SEVEN_ZIP_ENV_VAR]: '/bundled/7z' },
            which: () => '/usr/bin/7z',
            exists: () => true
        }));

        expect(resolved).toBe('/bundled/7z');
    });

    test('falls through to PATH when SEVEN_ZIP_PATH points at a missing file', () => {
        const resolved = resolveSevenZipPath(lookup({
            env: { [SEVEN_ZIP_ENV_VAR]: '/gone/7z' },
            which: name => name === '7zz' ? '/opt/bin/7zz' : null,
            exists: filePath => filePath !== '/gone/7z'
        }));

        expect(resolved).toBe('/opt/bin/7zz');
    });

    test('ignores an empty SEVEN_ZIP_PATH', () => {
        const resolved = resolveSevenZipPath(lookup({
            env: { [SEVEN_ZIP_ENV_VAR]: '' },
            which: name => name === '7za' ? '/opt/bin/7za' : null
        }));

        expect(resolved).toBe('/opt/bin/7za');
    });

    test('prefers PATH over known install locations', () => {
        const resolved = resolveSevenZipPath(lookup({
            which: name => name === '7z' ? '/somewhere/7z' : null,
            exists: () => true
        }));

        expect(resolved).toBe('/somewhere/7z');
    });

    test('looks up 7zz, 7z, 7za in that order on POSIX', () => {
        const queried: string[] = [];

        expect(() => resolveSevenZipPath(lookup({
            which: name => {
                queried.push(name);
                return null;
            }
        }))).toThrow();

        expect(queried).toEqual(['7zz', '7z', '7za']);
    });

    test('looks up only 7z on Windows', () => {
        const queried: string[] = [];

        expect(() => resolveSevenZipPath(lookup({
            platform: 'win32',
            which: name => {
                queried.push(name);
                return null;
            }
        }))).toThrow();

        expect(queried).toEqual(['7z']);
    });

    test('uses a known Windows install location when nothing else resolves', () => {
        const resolved = resolveSevenZipPath(lookup({
            platform: 'win32',
            exists: filePath => filePath === 'C:\\Program Files (x86)\\7-Zip\\7z.exe'
        }));

        expect(resolved).toBe('C:\\Program Files (x86)\\7-Zip\\7z.exe');
    });

    test('uses a known POSIX install location when nothing else resolves', () => {
        const resolved = resolveSevenZipPath(lookup({
            exists: filePath => filePath === '/usr/local/bin/7zz'
        }));

        expect(resolved).toBe('/usr/local/bin/7zz');
    });

    test('throws an error naming SEVEN_ZIP_PATH when nothing resolves', () => {
        expect(() => resolveSevenZipPath(lookup({}))).toThrow(new RegExp(`7z executable not found.*${SEVEN_ZIP_ENV_VAR}`));
    });

    test('names the missing path when SEVEN_ZIP_PATH is set but nothing resolves', () => {
        expect(() => resolveSevenZipPath(lookup({ env: { [SEVEN_ZIP_ENV_VAR]: '/gone/7z' } })))
            .toThrow(/"\/gone\/7z", which does not exist/);
    });

});
