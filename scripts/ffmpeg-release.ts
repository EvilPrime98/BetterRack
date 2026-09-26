import path from "node:path";

export type TFfmpegPlatform = "win32" | "linux-x64";

export type TFfmpegRelease = {
    archiveName: string;
    archiveSha256: string;
    archiveKind: "zip" | "tar.xz";
    folder: string;
    binaryName: string;
    binarySha256: string;
};

const RELEASE_TAG = "autobuild-2026-09-25-15-37";

export const FFMPEG_DOWNLOAD_BASE_URL = `https://github.com/BtbN/FFmpeg-Builds/releases/download/${RELEASE_TAG}`;

export const LICENSE_FILE_NAME = "ffmpeg-LICENSE.txt";
export const LICENSE_MEMBER_NAME = "LICENSE.txt";
export const LICENSE_SHA256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768";

export const FFMPEG_RELEASES: Record<TFfmpegPlatform, TFfmpegRelease> = {
    "win32": {
        archiveName: "ffmpeg-n8.1.3-win64-lgpl-8.1.zip",
        archiveSha256: "ed669810ca09ccf1f210d80b79445f70da68da4856a3a0f43e0ab9b2217c9777",
        archiveKind: "zip",
        folder: "ffmpeg-n8.1.3-win64-lgpl-8.1",
        binaryName: "ffmpeg.exe",
        binarySha256: "e3f884883b1509a0958afe375a80ac2791883553108f217df1968982b3fa0137"
    },
    "linux-x64": {
        archiveName: "ffmpeg-n8.1.3-linux64-lgpl-8.1.tar.xz",
        archiveSha256: "703f9f70ae6bfd9f676292d4cac9d8ebda9e17bfc090088882ffc020ffbf384e",
        archiveKind: "tar.xz",
        folder: "ffmpeg-n8.1.3-linux64-lgpl-8.1",
        binaryName: "ffmpeg",
        binarySha256: "e5beb99958e50318c9fbe2ee532e6bd768afb07e63606dc156c0ade5933dbe64"
    }
};

export const PROJECT_ROOT = path.join(import.meta.dir, "..");

export const isFfmpegPlatform = (value: string): value is TFfmpegPlatform =>
    Object.hasOwn(FFMPEG_RELEASES, value);

export const hostPlatform = (): TFfmpegPlatform => {
    if (process.platform === "win32") return "win32";
    if (process.platform === "linux" && process.arch === "x64") return "linux-x64";
    throw new Error(`No bundled ffmpeg build for ${process.platform}/${process.arch}`);
};

export const vendorDir = (platform: TFfmpegPlatform): string =>
    path.join(PROJECT_ROOT, "vendor", "ffmpeg", platform);

export const vendoredBinaryPath = (platform: TFfmpegPlatform): string =>
    path.join(vendorDir(platform), FFMPEG_RELEASES[platform].binaryName);

export const vendoredLicensePath = (platform: TFfmpegPlatform): string =>
    path.join(vendorDir(platform), LICENSE_FILE_NAME);
