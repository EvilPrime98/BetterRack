import { app, BrowserWindow, dialog, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import { APP_NAME } from "./app.config";

const LATEST_RELEASE_URL = "https://api.github.com/repos/EvilPrime98/BetterRack/releases/latest";

type TReleaseAsset = { name: string; browser_download_url: string; size: number };
type TRelease = { tag_name: string; draft: boolean; prerelease: boolean; assets: TReleaseAsset[] };

function isNewer(candidate: string, current: string): boolean {

    const a = candidate.replace(/^v/, "").split(".").map(Number);
    const b = current.replace(/^v/, "").split(".").map(Number);

    for (let i = 0; i < 3; i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }

    return false;

}

export async function checkForUpdates(win: BrowserWindow, log: (line: string) => void): Promise<void> {

    const skipFile = path.join(app.getPath("userData"), "skipped-update.json");

    try {

        const response = await fetch(LATEST_RELEASE_URL, {
            headers: { Accept: "application/vnd.github+json", "User-Agent": APP_NAME },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return;

        const release = await response.json() as TRelease;
        const version = release.tag_name.replace(/^v/, "");

        if (release.draft || release.prerelease || !isNewer(version, app.getVersion())) return;

        const skipped = fs.existsSync(skipFile) ? fs.readFileSync(skipFile, "utf8") : "";
        if (skipped === version) return;

        const extension = process.platform === "win32" ? ".exe" : ".appimage";
        const asset = release.assets.find((a) => a.name.toLowerCase().endsWith(extension));

        if (!asset) return;

        const { response: choice } = await dialog.showMessageBox(win, {
            type: "info",
            title: `${APP_NAME} update`,
            message: `Version ${version} of ${APP_NAME} is available.`,
            detail: `You are running version ${app.getVersion()}. Download the new version now?`,
            buttons: ["Download", "Later", "Skip this version"],
            defaultId: 0,
            cancelId: 1,
        });

        if (choice === 2) fs.writeFileSync(skipFile, version);
        if (choice !== 0) return;

        const download = await fetch(asset.browser_download_url);
        if (!download.ok || !download.body) throw new Error(`Download failed (${download.status})`);

        const filePath = path.join(app.getPath("downloads"), asset.name);
        const out = fs.createWriteStream(filePath);
        let received = 0;

        try {

            for await (const chunk of download.body) {
                if (!out.write(chunk)) await once(out, "drain");
                received += chunk.length;
                if (asset.size > 0 && !win.isDestroyed()) win.setProgressBar(received / asset.size);
            }

            out.end();
            await once(out, "finish");

        } finally {

            out.destroy();
            if (!win.isDestroyed()) win.setProgressBar(-1);

        }

        log(`Update ${version} downloaded to ${filePath}`);

        if (process.platform === "win32") await shell.openPath(filePath);
        else shell.showItemInFolder(filePath);

    } catch (e) {

        log(`Update check failed: ${e instanceof Error ? e.message : String(e)}`);

    }

}
