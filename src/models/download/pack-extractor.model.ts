import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Zip7Decompressor } from '#models/decompressor.model.ts';

// The library already indexes these members. A wrapper archive that holds
// at least one of them is a pack, not a single comic.
const COMIC_MEMBER_EXTENSIONS = new Set(['.cbz', '.cbr', '.cb7', '.cbt']);

const IMAGE_MEMBER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

const NESTED_ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z']);

// A real .cbz/.cbr is a renamed .zip/.rar. A mis-named download can
// therefore hold the pack members under a comic extension.
const INSPECTABLE_EXTENSIONS = new Set(['.zip', '.rar', '.7z', '.cbz', '.cbr']);

const RAR_EXTENSIONS = new Set(['.rar', '.cbr']);

// Below this size a download is almost never a multi-issue pack. The code
// skips the listing spawn below the gate to keep the common single-comic
// path cheap.
const SIZE_GATE_BYTES = 20 * 1024 * 1024;

const MAX_NESTED_DEPTH = 2;

export type TPackExtractProgress = (done: number, total: number) => void;

export type TPackExtractResult = {
    action: 'extracted' | 'renamed' | 'skipped';
    // Absolute paths of comic members that now sit in the library tree.
    members: string[];
    wrapperRemoved: boolean;
    // Set when action is 'extracted'.
    destDir?: string;
    // Set when action is 'renamed'.
    renamedTo?: string;
};

const SKIPPED: TPackExtractResult = { action: 'skipped', members: [], wrapperRemoved: false };

export class PackExtractor {

    private decompressor: Zip7Decompressor;

    constructor(decompressor: Zip7Decompressor) {
        this.decompressor = decompressor;
    }

    // The download path calls this cheap gate before it does other work.
    // Only archive-shaped files over the size threshold are worth a listing.
    shouldInspect = (filePath: string, sizeBytes: number): boolean => {
        const ext = path.extname(filePath).toLowerCase();
        return INSPECTABLE_EXTENSIONS.has(ext) && sizeBytes >= SIZE_GATE_BYTES;
    };

    private isRar = (filePath: string): boolean =>
        RAR_EXTENSIONS.has(path.extname(filePath).toLowerCase());

    private listEntries = (filePath: string): Promise<string[]> =>
        this.isRar(filePath)
            ? this.decompressor.listEntriesUnrar(filePath)
            : this.decompressor.listEntries7z(filePath);

    private classify = (entries: string[]) => {
        const comics: string[] = [];
        const images: string[] = [];
        const archives: string[] = [];

        for (const entry of entries) {
            const ext = path.extname(entry).toLowerCase();
            if (COMIC_MEMBER_EXTENSIONS.has(ext)) comics.push(entry);
            else if (IMAGE_MEMBER_EXTENSIONS.has(ext)) images.push(entry);
            else if (NESTED_ARCHIVE_EXTENSIONS.has(ext)) archives.push(entry);
        }

        return { comics, images, archives };
    };

    // Return a path that does not yet exist. Append " (2)", " (3)"... before
    // the extension when the first choice is taken.
    private dedupe = (targetPath: string): string => {
        if (!existsSync(targetPath)) return targetPath;

        const dir = path.dirname(targetPath);
        const ext = path.extname(targetPath);
        const stem = path.basename(targetPath, ext);

        let index = 2;
        while (existsSync(path.join(dir, `${stem} (${index})${ext}`))) index += 1;

        return path.join(dir, `${stem} (${index})${ext}`);
    };

    private collectFiles = async (dir: string, extensions: Set<string>): Promise<string[]> => {
        const entries = await readdir(dir, { withFileTypes: true, recursive: true });

        return entries
            .filter(entry => entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()))
            .map(entry => path.join(entry.parentPath ?? dir, entry.name));
    };

    // Inspect a freshly downloaded file. If the file wraps comic members,
    // unpack the members into outputDir/<packName>/ and delete the wrapper.
    // If the file is a .zip of loose page images, it is a mis-named single
    // comic: rename it to .cbz instead. Leave anything else untouched. A
    // listing failure (encrypted, corrupt, or unsupported codec) also
    // leaves the file untouched.
    extractPack = async ({
        filePath,
        outputDir,
        onProgress,
        depth = 0
    }: {
        filePath: string,
        outputDir: string,
        onProgress?: TPackExtractProgress,
        depth?: number
    }): Promise<TPackExtractResult> => {

        let entries: string[];
        try {
            entries = await this.listEntries(filePath);
        } catch {
            return SKIPPED;
        }

        const { comics, images, archives } = this.classify(entries);
        const ext = path.extname(filePath).toLowerCase();

        if (comics.length === 0 && archives.length === 0) {
            if (images.length === 0) return SKIPPED;
            if (ext === '.cbz' || ext === '.cbr') return SKIPPED;

            const renamedTo = this.dedupe(`${filePath.slice(0, -ext.length)}.cbz`);
            await rename(filePath, renamedTo);

            return { action: 'renamed', members: [renamedTo], wrapperRemoved: true, renamedTo };
        }

        const canRecurse = depth < MAX_NESTED_DEPTH;
        const toExtract = canRecurse ? [...comics, ...archives] : [...comics];

        if (toExtract.length === 0) return SKIPPED;

        // The temp dir lives under outputDir so the final rename stays on one
        // volume and is atomic-ish. A crash during extraction leaves only the
        // hidden temp dir, never a half-populated pack folder.
        await mkdir(outputDir, { recursive: true });
        const tempDir = await mkdtemp(path.join(outputDir, '.betterrack-pack-'));

        try {
            let done = 0;
            onProgress?.(done, toExtract.length);

            for (const entry of toExtract) {
                await this.decompressor.extractEntries({ filePath, outDir: tempDir, entryNames: [entry] });
                done += 1;
                onProgress?.(done, toExtract.length);
            }

            if (canRecurse && archives.length > 0) {
                const nested = await this.collectFiles(tempDir, NESTED_ARCHIVE_EXTENSIONS);
                for (const nestedArchive of nested) {
                    const inner = await this.extractPack({
                        filePath: nestedArchive,
                        outputDir: tempDir,
                        depth: depth + 1
                    });
                    if (inner.action !== 'skipped') {
                        await rm(nestedArchive, { force: true });
                    }
                }
            }

            const packName = path.basename(filePath, ext);
            const destDir = this.dedupe(path.join(outputDir, packName));
            await rename(tempDir, destDir);

            const members = await this.collectFiles(destDir, COMIC_MEMBER_EXTENSIONS);
            await rm(filePath, { force: true });

            return { action: 'extracted', members, wrapperRemoved: true, destDir };

        } catch (error) {
            await rm(tempDir, { recursive: true, force: true });
            throw error;
        }

    };

}
