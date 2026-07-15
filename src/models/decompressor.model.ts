import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

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

const LAST_ACCESS_FILE = ".last-access";

const resolveBin = (names: string[], fallbackPaths: string[]) => {
    for (const name of names) {
        const onPath = Bun.which(name);
        if (onPath) return onPath;
    }
    return fallbackPaths.find(existsSync) ?? null;
};

const resolve7zPath = () => {
    const bin = resolveBin(SEVEN_ZIP_BIN_NAMES, FALLBACK_7Z_PATHS);
    if (!bin) throw new Error("7z executable not found. Install 7-Zip (or p7zip) or add it to PATH.");
    return bin;
};

const resolveUnrarPath = () => {
    const bin = resolveBin(UNRAR_BIN_NAMES, FALLBACK_UNRAR_PATHS);
    if (!bin) throw new Error("unrar executable not found. 7-Zip does not support RAR decoding on Linux; install unrar to read .cbr/.rar archives.");
    return bin;
};

const isRarFile = (filePath: string) => RAR_EXTENSIONS.has(path.extname(filePath).toLowerCase());

export class Zip7Decompressor {

    listPages = async ({
        filePath
    }: {
        filePath: string
    }): Promise<string[]> => {

        const pages = isRarFile(filePath)
            ? await this.listPagesUnrar(filePath)
            : await this.listPages7z(filePath);

        if (pages.length === 0) {
            throw new Error(`No image pages found in "${filePath}". The archive may use a format unsupported by the installed extractor.`);
        }

        return pages;

    }

    listPages7z = async (filePath: string): Promise<string[]> => {

        const proc = Bun.spawn([
            resolve7zPath(),
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

        return output
            .split(/\r?\n\r?\n/)
            .map(block => ({
                entryPath: block.match(/^Path = (.+)$/m)?.[1],
                isDir: (block.match(/^Attributes = (.+)$/m)?.[1] ?? '').includes('D')
            }))
            .filter((entry): entry is { entryPath: string, isDir: boolean } => !!entry.entryPath && !entry.isDir)
            .map(entry => entry.entryPath)
            .filter(entryPath => IMAGE_EXTENSIONS.has(path.extname(entryPath).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    }

    listPagesUnrar = async (filePath: string): Promise<string[]> => {

        const proc = Bun.spawn([
            resolveUnrarPath(),
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

        return output
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .filter(entryPath => IMAGE_EXTENSIONS.has(path.extname(entryPath).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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

        if (isRarFile(filePath)) {
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
            resolve7zPath(),
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
            resolveUnrarPath(),
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

    touchAccess = async ({
        outDir
    }: {
        outDir: string
    }) => {
        await Bun.write(path.join(outDir, LAST_ACCESS_FILE), String(Date.now()));
    }

    sweepStale = async ({
        baseDir,
        ttlMs
    }: {
        baseDir: string,
        ttlMs: number
    }) => {

        if (!existsSync(baseDir)) return;

        const entries = await readdir(baseDir, { withFileTypes: true });
        const now = Date.now();

        for (const entry of entries) {

            if (!entry.isDirectory()) continue;

            const dirPath = path.join(baseDir, entry.name);
            const markerPath = path.join(dirPath, LAST_ACCESS_FILE);

            const lastAccess = existsSync(markerPath)
                ? Number(await Bun.file(markerPath).text())
                : (await stat(dirPath)).mtimeMs;

            if (now - lastAccess > ttlMs) {
                await rm(dirPath, { recursive: true, force: true });
            }

        }

    }

}
