import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createConcurrencyLimiter } from "#utils/concurrencyLimiter";
import {
    BACKGROUND_BLUR_SIGMA,
    BACKGROUND_CACHE_DIR,
    BACKGROUND_QUALITY,
    BACKGROUND_WIDTH,
    EXTRACT_CONCURRENCY,
    RAW_EXTRACT_DIR,
    THUMBNAIL_CACHE_DIR,
    THUMBNAIL_QUALITY,
    THUMBNAIL_WIDTH
} from "./constants";
import type { TLogger, TCompressorModel } from "./types";

type TImageVariant = 'thumbnail' | 'background';

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

    private cacheKey = (
        variant: TImageVariant,
        uid: string
    ): string => `${variant}:${uid}`;

    private cacheDirFor = (
        variant: TImageVariant
    ): string => variant === 'thumbnail' ? THUMBNAIL_CACHE_DIR : BACKGROUND_CACHE_DIR;

    private generate = async (
        uid: string,
        filePath: string,
        variant: TImageVariant
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

            const rawDir = path.join(RAW_EXTRACT_DIR, variant, uid);

            await this.compressorModel.extractPage({
                filePath,
                outDir: rawDir,
                entryName: pages[0]!
            });

            let generated: string | null = null;

            try {
                generated = await this.optimize(uid, rawDir, variant);
            } finally {
                await rm(rawDir, { recursive: true, force: true });
            }

            if (!generated) this.unavailable.add(uid);

            return generated;

        } finally {
            release();
        }

    }

    private optimize = async (
        uid: string,
        rawDir: string,
        variant: TImageVariant
    ): Promise<string | null> => {

        if (!existsSync(rawDir)) return null;

        const entries = await readdir(rawDir, { withFileTypes: true, recursive: true });
        const rawEntry = entries.find(entry => entry.isFile());
        if (!rawEntry) return null;

        const rawPath = path.join(rawEntry.parentPath, rawEntry.name);

        const outDir = path.join(this.cacheDirFor(variant), uid);
        await mkdir(outDir, { recursive: true });
        const outPath = path.join(outDir, `${uid}.webp`);

        const pipeline = sharp(rawPath).resize(
            variant === 'thumbnail' ? THUMBNAIL_WIDTH : BACKGROUND_WIDTH,
            undefined,
            { fit: 'inside', withoutEnlargement: true }
        );

        if (variant === 'background') pipeline.blur(BACKGROUND_BLUR_SIGMA);

        await pipeline
            .webp({ quality: variant === 'thumbnail' ? THUMBNAIL_QUALITY : BACKGROUND_QUALITY })
            .toFile(outPath);

        this.resolved.set(this.cacheKey(variant, uid), outPath);

        return outPath;

    }

    private findCached = async (
        uid: string,
        variant: TImageVariant
    ): Promise<string | null> => {

        const outDir = path.join(this.cacheDirFor(variant), uid);
        if (!existsSync(outDir)) return null;

        const entries = await readdir(outDir, { withFileTypes: true, recursive: true });
        const fileEntry = entries.find(entry => entry.isFile());
        if (!fileEntry) return null;

        const resolvedPath = path.join(fileEntry.parentPath, fileEntry.name);
        this.resolved.set(this.cacheKey(variant, uid), resolvedPath);

        return resolvedPath;

    }

    private getVariant = async (
        variant: TImageVariant,
        uid: string,
        filePath?: string
    ): Promise<string | null> => {

        this.log?.info(`Generating ${variant} for: ${uid}`);

        const cacheKey = this.cacheKey(variant, uid);

        const memoised = this.resolved.get(cacheKey);
        if (memoised) return memoised;

        const cached = await this.findCached(uid, variant);
        if (cached) return cached;

        if (!filePath || this.unavailable.has(uid)) return null;

        const existing = this.inFlight.get(cacheKey);
        if (existing) return existing;

        const job = this.generate(uid, filePath, variant)
            .catch((e) => {
                this.log?.error({ err: e }, `Failed to generate ${variant} for: ${uid}`);
                this.unavailable.add(uid);
                return null;
            })
            .finally(() => this.inFlight.delete(cacheKey));

        this.inFlight.set(cacheKey, job);

        return job;

    }

    getThumbnail = (
        uid: string,
        filePath?: string
    ): Promise<string | null> => this.getVariant('thumbnail', uid, filePath);

    getBackground = (
        uid: string,
        filePath?: string
    ): Promise<string | null> => this.getVariant('background', uid, filePath);

}
