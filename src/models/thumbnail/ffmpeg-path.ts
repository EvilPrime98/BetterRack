import { existsSync } from "node:fs";

export const FFMPEG_ENV_VAR = "FFMPEG_PATH";

const WINDOWS_FALLBACK_PATHS = [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"
];

const POSIX_FALLBACK_PATHS = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg"
];

export type TFfmpegLookup = {
    env: Record<string, string | undefined>;
    which: (name: string) => string | null;
    exists: (filePath: string) => boolean;
    platform: NodeJS.Platform;
};

export const resolveFfmpegPath = (lookup: TFfmpegLookup): string => {

    const configuredPath = lookup.env[FFMPEG_ENV_VAR];

    if (configuredPath && lookup.exists(configuredPath)) return configuredPath;

    const onPath = lookup.which("ffmpeg");
    if (onPath) return onPath;

    const installed = (lookup.platform === "win32" ? WINDOWS_FALLBACK_PATHS : POSIX_FALLBACK_PATHS).find(lookup.exists);
    if (installed) return installed;

    const configuredHint = configuredPath
        ? ` ${FFMPEG_ENV_VAR} points to "${configuredPath}", which does not exist.`
        : "";

    throw new Error(
        `ffmpeg executable not found.${configuredHint} Set ${FFMPEG_ENV_VAR} to an ffmpeg binary, or install ffmpeg (https://ffmpeg.org/download.html) and add it to PATH.`
    );

};

export const defaultFfmpegLookup = (): TFfmpegLookup => ({
    env: process.env,
    which: name => Bun.which(name),
    exists: existsSync,
    platform: process.platform
});
