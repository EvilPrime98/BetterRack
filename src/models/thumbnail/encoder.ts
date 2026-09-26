import { THUMBNAIL_QUALITY, THUMBNAIL_WIDTH } from "./constants";
import type { TThumbnailEncoder } from "./types";

export const THUMBNAIL_WORKER_ENV_VAR = "THUMBNAIL_WORKER_PATH";

export const THUMBNAIL_RUNTIME_ENV_VAR = "THUMBNAIL_RUNTIME_PATH";

const createSharpEncoder = (): TThumbnailEncoder => async (inputPath, outputPath) => {
    const { default: sharp } = await import("sharp");
    sharp.cache(false);
    await sharp(inputPath)
    .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toFile(outputPath);
};

export const createWorkerEncoder = (
    runtimePath: string,
    workerPath: string
): TThumbnailEncoder => async (inputPath, outputPath) => {

    const proc = Bun.spawn([
        runtimePath,
        workerPath,
        inputPath,
        outputPath,
        String(THUMBNAIL_WIDTH),
        String(THUMBNAIL_QUALITY)
    ], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        stdout: "ignore",
        stderr: "pipe"
    });

    const errorOutput = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
        throw new Error(`Thumbnail encoding failed with code ${exitCode}${errorOutput.trim() ? `: ${errorOutput.trim()}` : ''}`);
    }

};

export const createThumbnailEncoder = (
    env: Record<string, string | undefined> = process.env
): TThumbnailEncoder => {
    const runtimePath = env[THUMBNAIL_RUNTIME_ENV_VAR];
    const workerPath = env[THUMBNAIL_WORKER_ENV_VAR];
    return runtimePath && workerPath
        ? createWorkerEncoder(runtimePath, workerPath)
        : createSharpEncoder();
};
