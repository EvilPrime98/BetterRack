import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ComicInfoModel } from "#src/models/comic-info/comicInfo.model.ts";
import type { IComicInfoXML, TComicInfoModel } from "#src/types.ts";

export const SEVEN_ZIP_ENV_VAR = "SEVEN_ZIP_PATH";

const WINDOWS_BIN_NAMES = ["7z"];
const POSIX_BIN_NAMES = ["7zz", "7z", "7za"];

const WINDOWS_FALLBACK_PATHS = [
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe"
];

const POSIX_FALLBACK_PATHS = [
    "/usr/bin/7zz",
    "/usr/local/bin/7zz",
    "/usr/bin/7z",
    "/usr/local/bin/7z",
    "/usr/bin/7za",
    "/usr/local/bin/7za"
];

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']);

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp'
};

const ARCHIVE_CACHE_MAX_SIZE = 50;

export type TSevenZipLookup = {
    env: Record<string, string | undefined>;
    which: (name: string) => string | null;
    exists: (filePath: string) => boolean;
    platform: NodeJS.Platform;
};

export const resolveSevenZipPath = (lookup: TSevenZipLookup): string => {

    const isWindows = lookup.platform === "win32";
    const configuredPath = lookup.env[SEVEN_ZIP_ENV_VAR];

    if (configuredPath && lookup.exists(configuredPath)) return configuredPath;

    for (const name of isWindows ? WINDOWS_BIN_NAMES : POSIX_BIN_NAMES) {
        const onPath = lookup.which(name);
        if (onPath) return onPath;
    }

    const installed = (isWindows ? WINDOWS_FALLBACK_PATHS : POSIX_FALLBACK_PATHS).find(lookup.exists);
    if (installed) return installed;

    const configuredHint = configuredPath
        ? ` ${SEVEN_ZIP_ENV_VAR} points to "${configuredPath}", which does not exist.`
        : "";

    throw new Error(
        `7z executable not found.${configuredHint} Set ${SEVEN_ZIP_ENV_VAR} to a 7-Zip binary, or install 7-Zip (7zz/7z/7za) and add it to PATH.`
    );

};

const defaultLookup = (): TSevenZipLookup => ({
    env: process.env,
    which: name => Bun.which(name),
    exists: existsSync,
    platform: process.platform
});

export class SevenZipDecompressor {

    private resolveBinary: () => string;
    private resolvedBinary: string | null = null;
    private comicInfoModel: TComicInfoModel;
    private entryListCache = new Map<string, string[]>();
    private comicInfoCache = new Map<string, IComicInfoXML | null>();
    private lastCacheKeyByPath = new Map<string, string>();

    constructor(overrides?: {
        resolve7zPath?: () => string,
        comicInfoModel?: TComicInfoModel
    }) {
        this.resolveBinary = overrides?.resolve7zPath ?? (() => resolveSevenZipPath(defaultLookup()));
        this.comicInfoModel = overrides?.comicInfoModel ?? new ComicInfoModel();
    }

    private sevenZipPath = (): string => {
        this.resolvedBinary ??= this.resolveBinary();
        return this.resolvedBinary;
    };

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

    evictArchiveCache = (filePath: string): void => {
        const cacheKey = this.archiveCacheKey(filePath);
        this.entryListCache.delete(cacheKey);
        this.comicInfoCache.delete(cacheKey);
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
                } catch {
                    return;
                }
            }

        });

    };

    listEntries = async (filePath: string): Promise<string[]> => {

        const cacheKey = this.archiveCacheKey(filePath);
        const cached = this.getCached(this.entryListCache, cacheKey);
        if (cached) return cached;

        const proc = Bun.spawn([
            this.sevenZipPath(),
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

    };

    listPages = async ({
        filePath
    }: {
        filePath: string
    }): Promise<string[]> => {

        const entries = await this.listEntries(filePath);

        const pages = entries
            .filter(entryPath => IMAGE_EXTENSIONS.has(path.extname(entryPath).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        if (pages.length === 0) {
            throw new Error(`No image pages found in "${filePath}".`);
        }

        return pages;

    };

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

    };

    private readSidecarComicInfo = async (
        filePath: string
    ): Promise<string | null> => {

        const sidecarPath = path.join(path.dirname(filePath), `${path.parse(filePath).name}.xml`);
        if (!existsSync(sidecarPath)) return null;

        return readFile(sidecarPath, 'utf-8');

    };

    extractComicInfo = async ({
        filePath
    }: {
        filePath: string
    }): Promise<IComicInfoXML | null> => {

        const cacheKey = this.archiveCacheKey(filePath);
        const cached = this.getCached(this.comicInfoCache, cacheKey);
        if (cached !== undefined) return cached;

        const entries = await this.listEntries(filePath);

        const comicInfoEntry = entries.find(entry => {
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

    };

    extractPage = async ({
        filePath,
        outDir,
        entryName
    }: {
        filePath: string,
        outDir: string,
        entryName: string
    }): Promise<void> => {

        await this.extractEntries({ filePath, outDir, entryNames: [entryName] });

    };

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

        const proc = Bun.spawn([
            this.sevenZipPath(),
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

    };

    getPageMimeType = (entryName: string): string => {
        return MIME_TYPES[path.extname(entryName).toLowerCase()] ?? 'application/octet-stream';
    };

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

        const proc = Bun.spawn([
            this.sevenZipPath(),
            "x",
            filePath,
            `-o${outDir}`,
            ...entryNames,
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

    };

}
