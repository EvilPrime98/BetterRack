import { chmod, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyFfmpegLicense } from "./ffmpeg-license";
import {
    FFMPEG_DOWNLOAD_BASE_URL,
    FFMPEG_RELEASES,
    LICENSE_FILE_NAME,
    LICENSE_MEMBER_NAME,
    LICENSE_SHA256,
    PROJECT_ROOT,
    hostPlatform,
    isFfmpegPlatform,
    vendorDir,
    vendoredBinaryPath,
    vendoredLicensePath,
    type TFfmpegPlatform
} from "./ffmpeg-release";

const sevenZipPath = (): string => {
    if (process.env.SEVEN_ZIP_PATH) return process.env.SEVEN_ZIP_PATH;
    if (process.platform === "win32") return path.join(PROJECT_ROOT, "vendor", "7zip", "win32", "7z.exe");
    if (process.platform === "linux") return path.join(PROJECT_ROOT, "vendor", "7zip", "linux-x64", "7zz");
    throw new Error("Set SEVEN_ZIP_PATH to a 7-Zip binary to extract the ffmpeg archive on this platform");
};

const sha256File = async (filePath: string): Promise<string> => {
    const hasher = new Bun.CryptoHasher("sha256");
    for await (const chunk of Bun.file(filePath).stream()) hasher.update(chunk);
    return hasher.digest("hex");
};

const expectHash = async (filePath: string, expected: string): Promise<void> => {
    const actual = await sha256File(filePath);
    if (actual !== expected) {
        throw new Error(`SHA-256 mismatch for ${path.basename(filePath)}: expected ${expected}, got ${actual}`);
    }
};

const matchesPinnedHash = async (filePath: string, expected: string): Promise<boolean> =>
    existsSync(filePath) && await sha256File(filePath) === expected;

const download = async (url: string, destination: string): Promise<void> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (${response.status} ${response.statusText}): ${url}`);
    await Bun.write(destination, response);
};

const extractMembers = async (
    archivePath: string,
    kind: "zip" | "tar.xz",
    outDir: string,
    members: string[]
): Promise<void> => {

    const sevenZip = sevenZipPath();
    const outArg = `-o${outDir}`;

    if (kind === "zip") {
        const proc = Bun.spawn([sevenZip, "x", archivePath, outArg, "-y", ...members], { stdout: "ignore", stderr: "pipe" });
        const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
        if (exitCode !== 0) throw new Error(`7-Zip failed to extract ${archivePath}: ${stderr.trim()}`);
        return;
    }

    const decompress = Bun.spawn([sevenZip, "x", archivePath, "-so"], { stdout: "pipe", stderr: "pipe" });
    const untar = Bun.spawn([sevenZip, "x", "-si", "-ttar", outArg, "-y", ...members], {
        stdin: decompress.stdout,
        stdout: "ignore",
        stderr: "pipe"
    });

    const [decompressErr, untarErr, decompressExit, untarExit] = await Promise.all([
        new Response(decompress.stderr).text(),
        new Response(untar.stderr).text(),
        decompress.exited,
        untar.exited
    ]);

    if (decompressExit !== 0 || untarExit !== 0) {
        throw new Error(`7-Zip failed to extract ${archivePath}: ${`${decompressErr}${untarErr}`.trim()}`);
    }

};

const fetchPlatform = async (platform: TFfmpegPlatform): Promise<void> => {

    const release = FFMPEG_RELEASES[platform];
    const binaryPath = vendoredBinaryPath(platform);
    const licensePath = vendoredLicensePath(platform);

    const upToDate = await matchesPinnedHash(binaryPath, release.binarySha256)
        && await matchesPinnedHash(licensePath, LICENSE_SHA256);

    if (upToDate) {
        console.log(`[${platform}] ffmpeg already present at ${binaryPath}`);
    } else {

        const workDir = await mkdtemp(path.join(tmpdir(), "ffmpeg-fetch-"));

        try {

            const archivePath = path.join(workDir, release.archiveName);
            console.log(`[${platform}] downloading ${release.archiveName}`);
            await download(`${FFMPEG_DOWNLOAD_BASE_URL}/${release.archiveName}`, archivePath);
            await expectHash(archivePath, release.archiveSha256);

            const binaryMember = `${release.folder}/bin/${release.binaryName}`;
            const licenseMember = `${release.folder}/${LICENSE_MEMBER_NAME}`;
            const extractDir = path.join(workDir, "extracted");

            console.log(`[${platform}] extracting ${release.binaryName}`);
            await extractMembers(archivePath, release.archiveKind, extractDir, [binaryMember, licenseMember]);

            const extractedBinary = path.join(extractDir, binaryMember);
            const extractedLicense = path.join(extractDir, licenseMember);
            await expectHash(extractedBinary, release.binarySha256);
            await expectHash(extractedLicense, LICENSE_SHA256);

            await mkdir(vendorDir(platform), { recursive: true });
            await copyFile(extractedBinary, binaryPath);
            await copyFile(extractedLicense, licensePath);
            await chmod(binaryPath, 0o755);

            console.log(`[${platform}] installed ${binaryPath} and ${LICENSE_FILE_NAME}`);

        } finally {
            await rm(workDir, { recursive: true, force: true });
        }

    }

    if (platform !== hostPlatform()) {
        console.log(`[${platform}] license check skipped: the binary cannot run on this host`);
        return;
    }

    const violations = await verifyFfmpegLicense(binaryPath);
    if (violations.length) {
        throw new Error(`[${platform}] ${binaryPath} is not a redistributable LGPL-only build:\n  - ${violations.join("\n  - ")}`);
    }
    console.log(`[${platform}] license check passed: LGPL-only build with libwebp`);

};

const requested = process.argv.slice(2);
const platforms = requested.length ? requested : [hostPlatform()];

for (const platform of platforms) {
    if (!isFfmpegPlatform(platform)) {
        console.error(`Unknown platform "${platform}". Expected one of: ${Object.keys(FFMPEG_RELEASES).join(", ")}`);
        process.exit(1);
    }
    await fetchPlatform(platform);
}
