import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ComicInfoModel } from "#src/models/comicInfo.model.ts";
import type { IComicInfoXML, TComicInfoModel } from "#src/types.ts";

const SEVEN_ZIP_BIN_NAMES = process.platform === "win32"
? ["7z"]
: ["7zz", "7z", "7za"];

const FALLBACK_7Z_PATHS = process.platform === "win32"
? [
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe"
]
: [
    "/usr/bin/7zz",
    "/usr/local/bin/7zz",
    "/usr/bin/7z",
    "/usr/local/bin/7z",
    "/usr/bin/7za",
    "/usr/local/bin/7za"
];

const UNRAR_BIN_NAMES = ["unrar"];

const FALLBACK_UNRAR_PATHS = process.platform === "win32"
? [
    "C:\\Program Files\\WinRAR\\UnRAR.exe",
    "C:\\Program Files (x86)\\WinRAR\\UnRAR.exe"
]
: [
    "/usr/bin/unrar",
    "/usr/local/bin/unrar"
];

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

const RAR_EXTENSIONS = new Set(['.cbr', '.rar']);

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp'
};

const ARCHIVE_CACHE_MAX_SIZE = 50;

export class Zip7Decompressor {

    private resolve7z: () => string;
    private resolveUnrar: () => string;
    private comicInfoModel: TComicInfoModel;
    private entryListCache = new Map<string, string[]>();
    private comicInfoCache = new Map<string, IComicInfoXML | null>();
    private lastCacheKeyByPath = new Map<string, string>();

    constructor(overrides?: { //overrides for testing
        resolve7zPath?: () => string,
        resolveUnrarPath?: () => string,
        comicInfoModel?: TComicInfoModel
    }) {
        this.resolve7z = overrides?.resolve7zPath ?? this.resolve7zPath;
        this.resolveUnrar = overrides?.resolveUnrarPath ?? this.resolveUnrarPath;
        this.comicInfoModel = overrides?.comicInfoModel ?? new ComicInfoModel();
    }

    private archiveCacheKey = (filePath: string): string => {

        const stat = statSync(filePath);
        const cacheKey = `${filePath}:${stat.size}:${stat.mtimeMs}`;

        const previousCacheKey = this.lastCacheKeyByPath.get(filePath);
        if (previousCacheKey !== undefined && previousCacheKey !== cacheKey) {
            this.entryListCache.delete(previousCacheKey);
            this.comicInfoCache.delete(previousCacheKey);
        }
        this.lastCacheKeyByPath.set(filePath, cacheKey);

        return cacheKey;
        
    };

    private getCached = <T>(cache: Map<string, T>, key: string): T | undefined => {
        if (!cache.has(key)) return undefined;
        const value = cache.get(key) as T;
        cache.delete(key);
        cache.set(key, value);
        return value;
    };

    private setCached = <T>(cache: Map<string, T>, key: string, value: T): void => {
        if (cache.size >= ARCHIVE_CACHE_MAX_SIZE) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
        cache.set(key, value);
    };

    private isSafeEntryName = (entryName: string): boolean => {
        if (!entryName || !entryName.trim()) return false;
        if (path.isAbsolute(entryName)) return false;
        if (/^[a-zA-Z]:/.test(entryName)) return false;
        if (entryName.startsWith('/') || entryName.startsWith('\\')) return false;
        const segments = entryName.replace(/\\/g, '/').split('/');
        if (segments.some(segment => segment === '..' || segment === '')) return false;
        return true;
    };

    private assertSafeEntryName = (entryName: string) => {
        if (!this.isSafeEntryName(entryName)) {
            throw new Error(`Rejected suspicious archive entry path: "${entryName}"`);
        }
    };

    private resolveBin = (names: string[], fallbackPaths: string[]) => {
        for (const name of names) {
            const onPath = Bun.which(name);
            if (onPath) return onPath;
        }
        return fallbackPaths.find(existsSync) ?? null;
    };

    private resolve7zPath = () => {
        const bin = this.resolveBin(SEVEN_ZIP_BIN_NAMES, FALLBACK_7Z_PATHS);
        if (!bin) throw new Error("7z executable not found. Install 7-Zip (or p7zip) or add it to PATH.");
        return bin;
    };

    private resolveUnrarPath = () => {
        const bin = this.resolveBin(UNRAR_BIN_NAMES, FALLBACK_UNRAR_PATHS);
        if (!bin) throw new Error("unrar executable not found. 7-Zip does not support RAR decoding on Linux; install unrar to read .cbr/.rar archives.");
        return bin;
    };

    private isRarFile = (filePath: string) => RAR_EXTENSIONS.has(path.extname(filePath).toLowerCase());

    private toPageStream = ({
        proc,
        filePath,
        entryName
    }: {
        proc: { stdout: ReadableStream<Uint8Array>, stderr: ReadableStream<Uint8Array>, exited: Promise<number>, kill: () => void },
        filePath: string,
        entryName: string
    }): ReadableStream<Uint8Array> => {

        const reader = proc.stdout.getReader();
        const stderrPromise = new Response(proc.stderr).text();
        let bytesEmitted = 0;

        return new ReadableStream<Uint8Array>({

            async pull(controller) {

                let result: { done?: boolean, value?: Uint8Array };

                try {
                    result = await reader.read();
                } catch (err) {
                    controller.error(err);
                    return;
                }

                if (!result.done && result.value) {
                    bytesEmitted += result.value.byteLength;
                    controller.enqueue(result.value);
                    return;
                }

                const [exitCode, stderrText] = await Promise.all([proc.exited, stderrPromise]);

                if (exitCode !== 0) {
                    controller.error(new Error(
                        `Failed to read page "${entryName}" from "${filePath}": extraction process exited with code ${exitCode}${stderrText.trim() ? `: ${stderrText.trim()}` : ''}`
                    ));
                    return;
                }

                if (bytesEmitted === 0) {
                    controller.error(new Error(
                        `Failed to read page "${entryName}" from "${filePath}": no data was produced; the entry may not exist in the archive.`
                    ));
                    return;
                }

                controller.close();

            },

            cancel(reason) {
                reader.cancel(reason).catch(() => { });
                try {
                    proc.kill();
                } catch { //
                }
            }

        });

    }

    listPages = async ({
        filePath
    }: {
        filePath: string
    }): Promise<string[]> => {

        const pages = this.isRarFile(filePath)
            ? await this.listPagesUnrar(filePath)
            : await this.listPages7z(filePath);

        if (pages.length === 0) {
            throw new Error(`No image pages found in "${filePath}". The archive may use a format unsupported by the installed extractor.`);
        }

        return pages;

    }

    listEntries7z = async (filePath: string): Promise<string[]> => {

        const cacheKey = this.archiveCacheKey(filePath);
        const cached = this.getCached(this.entryListCache, cacheKey);
        if (cached) return cached;

        const proc = Bun.spawn([
            this.resolve7zPath(),
            "l",
            "-slt",
            "-ba",
            filePath
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        const output = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Listing archive failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

        const entries = output
            .split(/\r?\n\r?\n/)
            .map(block => ({
                entryPath: block.match(/^Path = (.+)$/m)?.[1],
                isDir: (block.match(/^Attributes = (.+)$/m)?.[1] ?? '').includes('D')
            }))
            .filter((entry): entry is { entryPath: string, isDir: boolean } => !!entry.entryPath && !entry.isDir)
            .map(entry => entry.entryPath);

        this.setCached(this.entryListCache, cacheKey, entries);

        return entries;

    }

    listPages7z = async (filePath: string): Promise<string[]> => {

        const entries = await this.listEntries7z(filePath);

        return entries
            .filter(entryPath => IMAGE_EXTENSIONS.has(path.extname(entryPath).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    }

    listEntriesUnrar = async (filePath: string): Promise<string[]> => {

        const cacheKey = this.archiveCacheKey(filePath);
        const cached = this.getCached(this.entryListCache, cacheKey);
        if (cached) return cached;

        const proc = Bun.spawn([
            this.resolveUnrarPath(),
            "lb",
            "-y",
            filePath
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        const output = await new Response(proc.stdout).text();
        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Listing archive failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

        const entries = output
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        this.setCached(this.entryListCache, cacheKey, entries);

        return entries;

    }

    listPagesUnrar = async (filePath: string): Promise<string[]> => {

        const entries = await this.listEntriesUnrar(filePath);

        return entries
            .filter(entryPath => IMAGE_EXTENSIONS.has(path.extname(entryPath).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    }

    extractBookmarks = async ({
        filePath
    }: {
        filePath: string
    }): Promise<{ page: number, label: string }[]> => {

        const data = await this.extractComicInfo({ filePath });

        if (!data) return [];

        const rawPages = data?.ComicInfo?.Pages?.Page;
        const pageList = Array.isArray(rawPages) ? rawPages : rawPages ? [rawPages] : [];

        return pageList
        .filter(page => page["@_Bookmark"]?.trim())
        .map(page => ({
            page: Number(page["@_Image"]) + 1,
            label: page["@_Bookmark"]!.trim()
        }))
        .filter(bookmark => Number.isInteger(bookmark.page) && bookmark.page >= 1);

    }
    
    private readSidecarComicInfo = async (
        filePath: string
    ): Promise<string | null> => {

        const sidecarPath = path.join(path.dirname(filePath), `${path.parse(filePath).name}.xml`);
        if (!existsSync(sidecarPath)) return null;

        return readFile(sidecarPath, 'utf-8');

    }

    extractComicInfo = async ({
        filePath
    }: {
        filePath: string
    }): Promise<IComicInfoXML|null> => {

        const cacheKey = this.archiveCacheKey(filePath);
        const cached = this.getCached(this.comicInfoCache, cacheKey);
        if (cached !== undefined) return cached;

        const entries = this.isRarFile(filePath)
        ? await this.listEntriesUnrar(filePath)
        : await this.listEntries7z(filePath);

        const comicInfoEntry = entries.find(entry => {
            //a nested file in a subfolder is not a valid ComicInfo.xml.
            const normalized = entry.replace(/\\/g, '/');
            return !normalized.includes('/') && normalized.toLowerCase() === 'comicinfo.xml';
        });

        const xml = comicInfoEntry
            ? await new Response(
                this.getPageStream({ filePath, entryName: comicInfoEntry })
            ).text()
            : await this.readSidecarComicInfo(filePath);

        const result = xml ? this.comicInfoModel.parse(xml) : null;

        this.setCached(this.comicInfoCache, cacheKey, result);

        return result;

    }

    extractPage = async ({
        filePath,
        outDir,
        entryName
    }: {
        filePath: string,
        outDir: string,
        entryName: string
    }) => {

        if (this.isRarFile(filePath)) {
            await this.extractPageUnrar({ filePath, outDir, entryName });
        } else {
            await this.extractPage7z({ filePath, outDir, entryName });
        }

    }

    extractPage7z = async ({
        filePath,
        outDir,
        entryName
    }: {
        filePath: string,
        outDir: string,
        entryName: string
    }) => {

        const proc = Bun.spawn([
            this.resolve7zPath(),
            "x",
            filePath,
            `-o${outDir}`,
            entryName,
            "-y"
        ], {
            stdout: "ignore",
            stderr: "pipe"
        });

        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Extraction failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

    }

    extractPageUnrar = async ({
        filePath,
        outDir,
        entryName
    }: {
        filePath: string,
        outDir: string,
        entryName: string
    }) => {

        const proc = Bun.spawn([
            this.resolveUnrarPath(),
            "x",
            "-y",
            filePath,
            entryName,
            `${outDir}${path.sep}`
        ], {
            stdout: "ignore",
            stderr: "pipe"
        });

        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Extraction failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

    }

    getPageStream = ({
        filePath,
        entryName
    }: {
        filePath: string,
        entryName: string
    }): ReadableStream<Uint8Array> => {

        this.assertSafeEntryName(entryName);

        if (!existsSync(filePath)) {
            throw new Error(`Archive not found: "${filePath}"`);
        }

        return this.isRarFile(filePath)
            ? this.getPageStreamUnrar({ filePath, entryName })
            : this.getPageStream7z({ filePath, entryName });

    }

    getPageStream7z = ({
        filePath,
        entryName
    }: {
        filePath: string,
        entryName: string
    }): ReadableStream<Uint8Array> => {

        const proc = Bun.spawn([
            this.resolve7z(),
            "x",
            filePath,
            entryName,
            "-so",
            "-y"
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        return this.toPageStream({ proc, filePath, entryName });

    }

    getPageStreamUnrar = ({
        filePath,
        entryName
    }: {
        filePath: string,
        entryName: string
    }): ReadableStream<Uint8Array> => {

        const proc = Bun.spawn([
            this.resolveUnrar(),
            "p",
            "-inul",
            "-y",
            filePath,
            entryName
        ], {
            stdout: "pipe",
            stderr: "pipe"
        });

        return this.toPageStream({ proc, filePath, entryName });

    }

    getPageMimeType = (entryName: string): string => {
        return MIME_TYPES[path.extname(entryName).toLowerCase()] ?? 'application/octet-stream';
    }

    extractEntries = async ({
        filePath,
        outDir,
        entryNames
    }: {
        filePath: string,
        outDir: string,
        entryNames: string[]
    }): Promise<void> => {

        for (const entryName of entryNames) {
            this.assertSafeEntryName(entryName);
        }

        if (entryNames.length === 0) return;

        const proc = this.isRarFile(filePath)
            ? Bun.spawn([
                this.resolveUnrarPath(),
                "x",
                "-y",
                filePath,
                ...entryNames,
                `${outDir}${path.sep}`
            ], { stdout: "ignore", stderr: "pipe" })
            : Bun.spawn([
                this.resolve7zPath(),
                "x",
                filePath,
                `-o${outDir}`,
                ...entryNames,
                "-y"
            ], { stdout: "ignore", stderr: "pipe" });

        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Extraction failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

    }

}