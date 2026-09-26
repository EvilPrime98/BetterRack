import { existsSync } from "node:fs";
import { verifyFfmpegLicense } from "./ffmpeg-license";
import { hostPlatform, vendoredBinaryPath } from "./ffmpeg-release";

const binaryPath = process.argv[2] ?? vendoredBinaryPath(hostPlatform());

if (!existsSync(binaryPath)) {
    console.error(`ffmpeg binary not found at ${binaryPath}. Run \`bun run ffmpeg:fetch\` first.`);
    process.exit(1);
}

const violations = await verifyFfmpegLicense(binaryPath);

if (violations.length) {
    console.error(`${binaryPath} is not a redistributable LGPL-only build:`);
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exit(1);
}

console.log(`${binaryPath}: LGPL-only build with libwebp`);
