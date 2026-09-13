import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Zip7Decompressor } from './decompressor.model';

const originalSpawn = Bun.spawn.bind(Bun);
let spawnCount = 0;

const resolveSevenZip = (): string => {
    const bin = Bun.which('7z') ?? Bun.which('7zz') ?? Bun.which('7za');
    if (!bin) throw new Error('7z not found on PATH; required to build the test fixture archive.');
    return bin;
};

const runSevenZip = async (args: string[]): Promise<void> => {
    const proc = originalSpawn([resolveSevenZip(), ...args], { stdout: 'ignore', stderr: 'ignore' });
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`7z ${args.join(' ')} failed with code ${exitCode}`);
};

let workDir: string;
let sourceDir: string;
let archivePath: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'decompressor-test-'));
    sourceDir = path.join(workDir, 'source');
    archivePath = path.join(workDir, 'comic.cbz');

    await mkdir(sourceDir, { recursive: true });
    await writeFile(path.join(sourceDir, '001.jpg'), 'page-one');
    await writeFile(path.join(sourceDir, '002.jpg'), 'page-two');
    await writeFile(
        path.join(sourceDir, 'ComicInfo.xml'),
        '<ComicInfo><Pages><Page Image="0" Bookmark="Cover" /></Pages></ComicInfo>'
    );

    await runSevenZip([
        'a',
        archivePath,
        path.join(sourceDir, '001.jpg'),
        path.join(sourceDir, '002.jpg'),
        path.join(sourceDir, 'ComicInfo.xml')
    ]);

    spawnCount = 0;
    Bun.spawn = ((...args: Parameters<typeof originalSpawn>) => {
        spawnCount++;
        return originalSpawn(...args);
    }) as typeof Bun.spawn;
});

afterEach(async () => {
    Bun.spawn = originalSpawn as typeof Bun.spawn;
    await rm(workDir, { recursive: true, force: true });
});

describe('Zip7Decompressor entry-list cache', () => {

    test('listPages spawns the listing process once across repeated calls on an unchanged file', async () => {
        const zip = new Zip7Decompressor();

        const first = await zip.listPages({ filePath: archivePath });
        const spawnsAfterFirst = spawnCount;

        const second = await zip.listPages({ filePath: archivePath });

        expect(second).toEqual(first);
        expect(spawnCount).toBe(spawnsAfterFirst);
    });

    test('a changed archive on disk bypasses the stale cache entry', async () => {
        const zip = new Zip7Decompressor();

        const before = await zip.listPages({ filePath: archivePath });
        const spawnsAfterFirst = spawnCount;

        await writeFile(path.join(sourceDir, '003.jpg'), 'page-three');
        await runSevenZip(['a', archivePath, path.join(sourceDir, '003.jpg')]);

        const after = await zip.listPages({ filePath: archivePath });

        expect(after.length).toBe(before.length + 1);
        expect(spawnCount).toBeGreaterThan(spawnsAfterFirst);
    });

});

describe('Zip7Decompressor ComicInfo cache', () => {

    test('extractBookmarks reuses extractComicInfo\'s cached parse instead of re-extracting the archive', async () => {
        const zip = new Zip7Decompressor();

        const info = await zip.extractComicInfo({ filePath: archivePath });
        const spawnsAfterInfo = spawnCount;

        const bookmarks = await zip.extractBookmarks({ filePath: archivePath });

        expect(info?.ComicInfo?.Pages?.Page).toBeDefined();
        expect(bookmarks).toEqual([{ page: 1, label: 'Cover' }]);
        expect(spawnCount).toBe(spawnsAfterInfo);
    });

});

describe('Zip7Decompressor ComicInfo spec compliance', () => {

    test('ignores a ComicInfo.xml nested in a subfolder', async () => {
        await mkdir(path.join(sourceDir, 'Sub'), { recursive: true });
        await writeFile(path.join(sourceDir, 'Sub', 'ComicInfo.xml'), '<ComicInfo><Series>Nested</Series></ComicInfo>');
        await runSevenZip(['a', archivePath, path.join(sourceDir, 'Sub')]);

        const zip = new Zip7Decompressor();
        const info = await zip.extractComicInfo({ filePath: archivePath });

        // The root fixture's ComicInfo.xml (no Series) must win over the nested one.
        expect(info?.ComicInfo?.Series).toBeUndefined();
    });

});
