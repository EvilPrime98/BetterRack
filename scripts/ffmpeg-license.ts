const FORBIDDEN_FLAGS = ["--enable-gpl", "--enable-nonfree"];
const REQUIRED_FLAGS = ["--enable-libwebp"];
const LGPL_MARKER = "GNU Lesser General Public License";
const CONFIGURATION_PREFIX = "configuration:";

export const licenseViolations = (versionOutput: string, licenseOutput: string): string[] => {

    const configurationLine = versionOutput
        .split(/\r?\n/)
        .map(line => line.trim())
        .find(line => line.startsWith(CONFIGURATION_PREFIX));

    if (!configurationLine) return ["`ffmpeg -version` printed no configuration line"];

    const flags = configurationLine.slice(CONFIGURATION_PREFIX.length).trim().split(/\s+/);

    return [
        ...FORBIDDEN_FLAGS.filter(flag => flags.includes(flag)).map(flag => `build was configured with ${flag}`),
        ...REQUIRED_FLAGS.filter(flag => !flags.includes(flag)).map(flag => `build lacks ${flag}`),
        ...(licenseOutput.includes(LGPL_MARKER) ? [] : [`\`ffmpeg -L\` does not report the ${LGPL_MARKER}`])
    ];

};

const runFfmpeg = async (binaryPath: string, args: string[]): Promise<string> => {

    const proc = Bun.spawn([binaryPath, ...args], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
    ]);

    if (exitCode !== 0) throw new Error(`${binaryPath} ${args.join(" ")} exited with code ${exitCode}: ${stderr.trim()}`);

    return stdout;

};

export const verifyFfmpegLicense = async (binaryPath: string): Promise<string[]> => {
    const versionOutput = await runFfmpeg(binaryPath, ["-hide_banner", "-version"]);
    const licenseOutput = await runFfmpeg(binaryPath, ["-hide_banner", "-L"]);
    return licenseViolations(versionOutput, licenseOutput);
};
