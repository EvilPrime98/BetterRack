import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { createConcurrencyLimiter } from "#utils/concurrencyLimiter";
import { EXTRACT_CONCURRENCY, RAW_EXTRACT_DIR, THUMBNAIL_CACHE_DIR, THUMBNAIL_QUALITY, THUMBNAIL_WIDTH } from "./constants";
import type { TLogger, TCompressorModel } from "./types";

const FALLBACK_FFMPEG_PATHS = process.platform === "win32"
? [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"
]
: [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg"
];

export class ThumbnailModel {

    private log: TLogger | undefined;
    private compressorModel: TCompressorModel;
    private resolved = new Map<string, string>();
    private unavailable = new Set<string>();
    private inFlight = new Map<string, Promise<string | null>>();
    private limiter = createConcurrencyLimiter(EXTRACT_CONCURRENCY);

    constructor(
        compressorModel: TCompressorModel,
        log?: TLogger
    ) {
        this.log = log;
        this.compressorModel = compressorModel;
    }

    private generate = async (
        uid: string,
        filePath: string
    ): Promise<string | null> => {

        const release = await this.limiter.acquire();

        try {

            const file = Bun.file(filePath);
            if (!(await file.exists())) {
                this.unavailable.add(uid);
                return null;
            }

            const pages = await this.compressorModel.listPages({ filePath });
            if (!pages.length) {
                this.unavailable.add(uid);
                return null;
            }

            const rawDir = path.join(RAW_EXTRACT_DIR, uid);

            await this.compressorModel.extractPage({
                filePath,
                outDir: rawDir,
                entryName: pages[0]!
            });

            let generated: string | null = null;

            try {
                generated = await this.optimize(uid, rawDir);
            } finally {
                await rm(rawDir, { recursive: true, force: true });
            }

            if (!generated) this.unavailable.add(uid);

            return generated;

        } finally {
            release();
        }

    }

    private resolveFfmpegPath = (): string => {
        const bin = Bun.which("ffmpeg") ?? FALLBACK_FFMPEG_PATHS.find(existsSync);
        if (!bin) throw new Error("ffmpeg executable not found. Install ffmpeg (https://ffmpeg.org/download.html) or add it to PATH.");
        return bin;
    };

    private optimize = async (
        uid: string,
        rawDir: string
    ): Promise<string | null> => {

        if (!existsSync(rawDir)) return null;

        const entries = await readdir(rawDir, { withFileTypes: true, recursive: true });
        const rawEntry = entries.find(entry => entry.isFile());
        if (!rawEntry) return null;

        const rawPath = path.join(rawEntry.parentPath, rawEntry.name);

        const outDir = path.join(THUMBNAIL_CACHE_DIR, uid);
        await mkdir(outDir, { recursive: true });
        const outPath = path.join(outDir, `${uid}.webp`);

        const proc = Bun.spawn([
            this.resolveFfmpegPath(),
            "-y",
            "-i", rawPath,
            "-vf", `scale='min(iw,${THUMBNAIL_WIDTH})':-1`,
            "-c:v", "libwebp",
            "-quality", String(THUMBNAIL_QUALITY),
            "-frames:v", "1",
            outPath
        ], {
            stdout: "ignore",
            stderr: "pipe"
        });

        const errorOutput = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
            throw new Error(`Thumbnail encoding failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
        }

        this.resolved.set(uid, outPath);

        return outPath;

    }

    private findCached = async (
        uid: string
    ): Promise<string | null> => {

        const outDir = path.join(THUMBNAIL_CACHE_DIR, uid);
        if (!existsSync(outDir)) return null;

        const entries = await readdir(outDir, { withFileTypes: true, recursive: true });
        const fileEntry = entries.find(entry => entry.isFile());
        if (!fileEntry) return null;

        const resolvedPath = path.join(fileEntry.parentPath, fileEntry.name);
        this.resolved.set(uid, resolvedPath);

        return resolvedPath;

    }

    getThumbnail = async (
        uid: string,
        filePath?: string
    ): Promise<string | null> => {

        this.log?.info(`Generating thumbnail for: ${uid}`);

        const memoised = this.resolved.get(uid);
        if (memoised) return memoised;

        const cached = await this.findCached(uid);
        if (cached) return cached;

        if (!filePath || this.unavailable.has(uid)) return null;

        const existing = this.inFlight.get(uid);
        if (existing) return existing;

        const job = this.generate(uid, filePath)
            .catch((e) => {
                this.log?.error({ err: e }, `Failed to generate thumbnail for: ${uid}`);
                this.unavailable.add(uid);
                return null;
            })
            .finally(() => this.inFlight.delete(uid));

        this.inFlight.set(uid, job);

        return job;

    }

}
