import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PackExtractor } from './pack-extractor.model';

// This fake replaces Zip7Decompressor. It reports a scripted entry list for
// each archive path and writes stub files on an extract call. The tests can
// then exercise the orchestration (classify, temp dir, rename, wrapper
// removal, recursion cap) without 7z or unrar installed.
class FakeDecompressor {

    entriesByFile: Record<string, string[]> = {};
    extractCalls: { filePath: string, outDir: string, entryNames: string[] }[] = [];

    listEntries7z = async (filePath: string) => this.entriesByFile[filePath] ?? [];
    listEntriesUnrar = async (filePath: string) => this.entriesByFile[filePath] ?? [];

    extractEntries = async ({ filePath, outDir, entryNames }: { filePath: string, outDir: string, entryNames: string[] }) => {
        this.extractCalls.push({ filePath, outDir, entryNames });
        for (const entry of entryNames) {
            const target = path.join(outDir, entry);
            await mkdir(path.dirname(target), { recursive: true });
            await writeFile(target, `stub:${entry}`);
        }
    };

}

let workDir: string;

beforeEach(async () => {
    workDir = await mkdtemp(path.join(tmpdir(), 'pack-extractor-test-'));
});

afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
});

const makePackExtractor = () => {
    const fake = new FakeDecompressor();
    // The class only calls the three methods FakeDecompressor implements.
    const extractor = new PackExtractor(fake as unknown as ConstructorParameters<typeof PackExtractor>[0]);
    return { fake, extractor };
};

const writeWrapper = async (name: string) => {
    const wrapperPath = path.join(workDir, name);
    await writeFile(wrapperPath, 'wrapper-bytes');
    return wrapperPath;
};

describe('PackExtractor.shouldInspect', () => {

    const { extractor } = makePackExtractor();
    const gate = 20 * 1024 * 1024;

    test('accepts an archive at or above the size gate', () => {
        expect(extractor.shouldInspect('/tmp/pack.zip', gate)).toBe(true);
        expect(extractor.shouldInspect('/tmp/pack.zip', gate + 1)).toBe(true);
    });

    test('rejects an archive below the size gate', () => {
        expect(extractor.shouldInspect('/tmp/pack.zip', gate - 1)).toBe(false);
    });

    test('accepts a mis-named .cbz above the gate', () => {
        expect(extractor.shouldInspect('/tmp/weekly.cbz', gate)).toBe(true);
    });

    test('rejects a non-archive extension regardless of size', () => {
        expect(extractor.shouldInspect('/tmp/comic.pdf', gate * 4)).toBe(false);
    });

});

describe('PackExtractor.extractPack', () => {

    test('extracts comic members into outputDir/<packName>/ and drops the wrapper', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('Weekly Pack.zip');
        fake.entriesByFile[wrapper] = ['Batman 001.cbz', 'Batman 002.cbz', 'readme.txt'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.action).toBe('extracted');
        expect(result.wrapperRemoved).toBe(true);
        expect(existsSync(wrapper)).toBe(false);
        expect(existsSync(path.join(workDir, 'Weekly Pack'))).toBe(true);
        expect(result.members.map(member => path.basename(member)).sort()).toEqual(['Batman 001.cbz', 'Batman 002.cbz']);
        // The code hands only the comic members to the extractor, never the .txt.
        expect(fake.extractCalls.flatMap(call => call.entryNames).sort()).toEqual(['Batman 001.cbz', 'Batman 002.cbz']);
    });

    test('reports extraction progress as done / total member counts', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('pack.zip');
        fake.entriesByFile[wrapper] = ['a.cbz', 'b.cbz', 'c.cbz'];

        const seen: { done: number, total: number }[] = [];
        await extractor.extractPack({
            filePath: wrapper,
            outputDir: workDir,
            onProgress: (done, total) => seen.push({ done, total })
        });

        expect(seen[0]).toEqual({ done: 0, total: 3 });
        expect(seen.at(-1)).toEqual({ done: 3, total: 3 });
    });

    test('renames a .zip of loose page images to .cbz instead of extracting', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('Amazing Spider-Man 050.zip');
        fake.entriesByFile[wrapper] = ['001.jpg', '002.jpg', '003.jpg'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.action).toBe('renamed');
        expect(result.renamedTo).toBe(path.join(workDir, 'Amazing Spider-Man 050.cbz'));
        expect(existsSync(wrapper)).toBe(false);
        expect(existsSync(path.join(workDir, 'Amazing Spider-Man 050.cbz'))).toBe(true);
        expect(fake.extractCalls).toHaveLength(0);
    });

    test('leaves a .cbz of loose images untouched', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('single.cbz');
        fake.entriesByFile[wrapper] = ['001.jpg', '002.jpg'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.action).toBe('skipped');
        expect(existsSync(wrapper)).toBe(true);
        expect(fake.extractCalls).toHaveLength(0);
    });

    test('leaves an archive with no comic members and no images untouched', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('mystery.zip');
        fake.entriesByFile[wrapper] = ['notes.txt', 'cover.psd'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.action).toBe('skipped');
        expect(existsSync(wrapper)).toBe(true);
    });

    test('does not recurse into nested archives once the depth cap is reached', async () => {
        const { fake, extractor } = makePackExtractor();
        const wrapper = await writeWrapper('nested.zip');
        fake.entriesByFile[wrapper] = ['inner.zip'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir, depth: 2 });

        expect(result.action).toBe('skipped');
        expect(fake.extractCalls).toHaveLength(0);
    });

    test('de-duplicates the pack folder when the name is already taken', async () => {
        const { fake, extractor } = makePackExtractor();
        await mkdir(path.join(workDir, 'Weekly Pack'));
        const wrapper = await writeWrapper('Weekly Pack.zip');
        fake.entriesByFile[wrapper] = ['issue.cbz'];

        const result = await extractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.destDir).toBe(path.join(workDir, 'Weekly Pack (2)'));
        expect(existsSync(path.join(workDir, 'Weekly Pack (2)', 'issue.cbz'))).toBe(true);
    });

    test('leaves the wrapper in place when listing the archive fails', async () => {
        const { extractor } = makePackExtractor();
        const wrapper = await writeWrapper('corrupt.zip');
        // The standard fake returns [] for an unknown path, which is a "no
        // members" case, not a listing failure. Use a separate stub that
        // throws to test the failure path.
        const throwingExtractor = new PackExtractor({
            listEntries7z: async () => { throw new Error('unsupported codec'); },
            listEntriesUnrar: async () => { throw new Error('unsupported codec'); },
            extractEntries: async () => { throw new Error('should not be called'); }
        } as unknown as ConstructorParameters<typeof PackExtractor>[0]);

        const result = await throwingExtractor.extractPack({ filePath: wrapper, outputDir: workDir });

        expect(result.action).toBe('skipped');
        expect(existsSync(wrapper)).toBe(true);
        void extractor;
    });

});
