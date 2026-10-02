import { app, BrowserWindow, dialog, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { APP_NAME } from "./app.config";

const LATEST_RELEASE_URL = "https://api.github.com/repos/EvilPrime98/BetterRack/releases/latest";
const REQUEST_TIMEOUT_MS = 10000;

type TReleaseAsset = {
    name: string;
    browser_download_url: string;
    size: number;
};

type TRelease = {
    tag_name: string;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
    assets: TReleaseAsset[];
};

type TUpdateChoice = "download" | "later" | "skip";

type TLog = (line: string) => void;

function parseVersion(version: string): number[] | null {

    const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;

}

function isNewerVersion(candidate: string, current: string): boolean {

    const next = parseVersion(candidate);
    const installed = parseVersion(current);

    if (!next || !installed) return false;

    for (let i = 0; i < next.length; i++) {
        if (next[i] !== installed[i]) return next[i] > installed[i];
    }

    return false;

}

function findInstallerAsset(release: TRelease): TReleaseAsset | undefined {

    const extension = process.platform === "win32" ? ".exe" : process.platform === "linux" ? ".appimage" : null;
    if (!extension) return undefined;

    return release.assets.find((asset) => asset.name.toLowerCase().endsWith(extension));

}

function skippedVersionFile(): string {
    return path.join(app.getPath("userData"), "skipped-update.json");
}

function readSkippedVersion(): string | null {

    try {
        const parsed = JSON.parse(fs.readFileSync(skippedVersionFile(), "utf8")) as { version?: string };
        return parsed.version ?? null;
    } catch {
        return null;
    }

}

function writeSkippedVersion(version: string): void {
    fs.writeFileSync(skippedVersionFile(), JSON.stringify({ version }));
}

async function fetchLatestRelease(): Promise<TRelease | null> {

    const response = await fetch(LATEST_RELEASE_URL, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": APP_NAME },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const release = await response.json() as TRelease;

    return release.draft || release.prerelease ? null : release;

}

async function askUpdateChoice(win: BrowserWindow, version: string): Promise<TUpdateChoice> {

    const choices: TUpdateChoice[] = ["download", "later", "skip"];

    const { response } = await dialog.showMessageBox(win, {
        type: "info",
        title: `${APP_NAME} update`,
        message: `Version ${version} of ${APP_NAME} is available.`,
        detail: `You are running version ${app.getVersion()}. Download the new version now?`,
        buttons: ["Download", "Later", "Skip this version"],
        defaultId: 0,
        cancelId: 1,
    });

    return choices[response] ?? "later";

}

async function downloadAsset(win: BrowserWindow, asset: TReleaseAsset): Promise<string> {

    const targetPath = path.join(app.getPath("downloads"), asset.name);

    const response = await fetch(asset.browser_download_url);

    if (!response.ok || !response.body) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    let received = 0;

    const reportProgress = async function* (chunks: AsyncIterable<Uint8Array>) {
        for await (const chunk of chunks) {
            received += chunk.length;
            if (asset.size > 0 && !win.isDestroyed()) win.setProgressBar(received / asset.size);
            yield chunk;
        }
    };

    try {
        await pipeline(response.body, reportProgress, fs.createWriteStream(targetPath));
    } finally {
        if (!win.isDestroyed()) win.setProgressBar(-1);
    }

    return targetPath;

}

async function openDownloadedInstaller(filePath: string): Promise<void> {

    if (process.platform === "win32") {
        await shell.openPath(filePath);
        return;
    }

    shell.showItemInFolder(filePath);

}

export async function checkForUpdates(win: BrowserWindow, log: TLog): Promise<void> {

    try {

        const release = await fetchLatestRelease();
        if (!release) return;

        const version = release.tag_name.replace(/^v/, "");

        if (!isNewerVersion(version, app.getVersion())) return;
        if (readSkippedVersion() === version) return;

        const asset = findInstallerAsset(release);

        if (!asset) {
            log(`Update ${version} found but no installer asset matches ${process.platform}`);
            return;
        }

        log(`Update ${version} available (current ${app.getVersion()})`);

        const choice = await askUpdateChoice(win, version);

        if (choice === "skip") {
            writeSkippedVersion(version);
            return;
        }

        if (choice === "later") return;

        const filePath = await downloadAsset(win, asset);
        log(`Update ${version} downloaded to ${filePath}`);

        await openDownloadedInstaller(filePath);

    } catch (e) {

        log(`Update check failed: ${e instanceof Error ? e.message : String(e)}`);

    }

}
