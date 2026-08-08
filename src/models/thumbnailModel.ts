import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { TThumbnailModel, TZipModel } from "#src/types.ts";
import { logger } from "#utils/logger";
import { createConcurrencyLimiter } from "#utils/concurrencyLimiter";

const log = logger.child({ module: 'ThumbnailModel' });

export const THUMBNAIL_CACHE_DIR = path.resolve('./tmp-thumbnails');

/** Raw pages are extracted here before being re-encoded, then discarded; keeps THUMBNAIL_CACHE_DIR holding only the final webp per uid. */
const RAW_EXTRACT_DIR = path.join(THUMBNAIL_CACHE_DIR, '.raw');
/** Extraction spawns a 7z/unrar process per comic, so cap how many can run at once. */
const EXTRACT_CONCURRENCY = 4;
/** Cards never render wider than ~340px; this comfortably covers high-DPI grids without shipping full-page scans. */
const THUMBNAIL_WIDTH = 300;
/** Image quality for Sharp library */
const THUMBNAIL_QUALITY = 82;

export class ThumbnailModel implements TThumbnailModel {

    private zipModel: TZipModel;
    /** uid -> on-disk thumbnail path, so a cache hit never re-walks the cache dir. */
    private resolved = new Map<string, string>();
    /** Archives that produced no usable page this session; stops us re-spawning 7z for them. */
    private unavailable = new Set<string>();
    /** In-flight extractions, so concurrent requests for the same comic share one job. */
    private inFlight = new Map<string, Promise<string | null>>();
    private limiter = createConcurrencyLimiter(EXTRACT_CONCURRENCY);

    constructor(zipModel: TZipModel) {
        this.zipModel = zipModel;
    }

    getThumbnail = async (
        uid: string, 
        filePath?: string
    ): Promise<string | null> => {

        log.info(`Generating thumbnail for: ${uid}`);

        const memoised = this.resolved.get(uid);
        if (memoised) return memoised;

        const cached = await this.findCached(uid);
        if (cached) return cached;

        if (!filePath || this.unavailable.has(uid)) return null;

        const existing = this.inFlight.get(uid);
        if (existing) return existing;

        const job = this.generate(uid, filePath)
            .catch((e) => {
                log.error({ err: e }, `Failed to generate thumbnail for: ${uid}`);
                this.unavailable.add(uid);
                return null;
            })
            .finally(() => this.inFlight.delete(uid));

        this.inFlight.set(uid, job);

        return job;

    }

    private generate = async (uid: string, filePath: string): Promise<string | null> => {

        const release = await this.limiter.acquire();

        try {

            const file = Bun.file(filePath);
            if (!(await file.exists())) {
                this.unavailable.add(uid);
                return null;
            }

            const pages = await this.zipModel.listPages({ filePath });
            if (!pages.length) {
                this.unavailable.add(uid);
                return null;
            }

            const rawDir = path.join(RAW_EXTRACT_DIR, uid);

            await this.zipModel.extractPage({
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

    /** Re-encodes the extracted page into a size-capped webp so thumbnails aren't served at full page resolution/format. */
    private optimize = async (uid: string, rawDir: string): Promise<string | null> => {

        if (!existsSync(rawDir)) return null;

        const entries = await readdir(rawDir, { withFileTypes: true, recursive: true });
        const rawEntry = entries.find(entry => entry.isFile());
        if (!rawEntry) return null;

        const rawPath = path.join(rawEntry.parentPath, rawEntry.name);

        const outDir = path.join(THUMBNAIL_CACHE_DIR, uid);
        await mkdir(outDir, { recursive: true });
        const outPath = path.join(outDir, `${uid}.webp`);

        await sharp(rawPath)
            .resize(THUMBNAIL_WIDTH, undefined, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: THUMBNAIL_QUALITY })
            .toFile(outPath);

        this.resolved.set(uid, outPath);

        return outPath;

    }

    private findCached = async (uid: string): Promise<string | null> => {

        const outDir = path.join(THUMBNAIL_CACHE_DIR, uid);
        if (!existsSync(outDir)) return null;

        const entries = await readdir(outDir, { withFileTypes: true, recursive: true });
        const fileEntry = entries.find(entry => entry.isFile());
        if (!fileEntry) return null;

        const resolvedPath = path.join(fileEntry.parentPath, fileEntry.name);
        this.resolved.set(uid, resolvedPath);

        return resolvedPath;

    }

}
