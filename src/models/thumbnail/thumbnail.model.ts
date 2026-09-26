import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { createConcurrencyLimiter } from "#utils/concurrencyLimiter";
import { EXTRACT_CONCURRENCY, RAW_EXTRACT_DIR, THUMBNAIL_CACHE_DIR, THUMBNAIL_QUALITY, THUMBNAIL_WIDTH } from "./constants";
import { defaultFfmpegLookup, resolveFfmpegPath } from "./ffmpeg-path";
import type { TLogger, TCompressorModel } from "./types";

export class ThumbnailModel {

    private log: TLogger | undefined;
    private compressorModel: TCompressorModel;
    private resolved = new Map<string, string>();
    private failedSignatures = new Map<string, string>();
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

            const pages = await this.compressorModel.listPages({ filePath });
            if (!pages.length) return null;

            const rawDir = path.join(RAW_EXTRACT_DIR, uid);

            await this.compressorModel.extractPage({
                filePath,
                outDir: rawDir,
                entryName: pages[0]!
            });

            try {
                return await this.optimize(uid, rawDir);
            } finally {
                await rm(rawDir, { recursive: true, force: true });
            }

        } finally {
            release();
        }

    }

    private fileSignature = async (
        filePath: string
    ): Promise<string | null> => {
        try {
            const stats = await stat(filePath);
            return `${stats.size}:${stats.mtimeMs}`;
        } catch {
            return null;
        }
    }

    private attempt = async (
        uid: string,
        filePath: string
    ): Promise<string | null> => {

        const signature = await this.fileSignature(filePath);
        if (signature === null || this.failedSignatures.get(uid) === signature) return null;

        const generated = await this.generate(uid, filePath).catch((e) => {
            this.log?.error({ err: e }, `Failed to generate thumbnail for: ${uid}`);
            return null;
        });

        if (generated) this.failedSignatures.delete(uid);
        else this.failedSignatures.set(uid, signature);

        return generated;

    }

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
            resolveFfmpegPath(defaultFfmpegLookup()),
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

        if (!filePath) return null;

        const existing = this.inFlight.get(uid);
        if (existing) return existing;

        const job = this.attempt(uid, filePath)
            .finally(() => this.inFlight.delete(uid));

        this.inFlight.set(uid, job);

        return job;

    }

    retry = async (
        uid: string,
        filePath: string
    ): Promise<string | null> => {

        await this.inFlight.get(uid);

        this.failedSignatures.delete(uid);
        this.resolved.delete(uid);
        await rm(path.join(THUMBNAIL_CACHE_DIR, uid), { recursive: true, force: true });

        return this.getThumbnail(uid, filePath);

    }

}
