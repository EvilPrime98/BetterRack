import { BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as TWebReadableStream } from "node:stream/web";

type TDownloadComicRequest = {
    url: string;
    name: string;
    headers?: Record<string, string>;
};

let activeComicDownloads = 0;

export function countActiveComicDownloads(): number {
    return activeComicDownloads;
}

function isHttpUrl(value: string): boolean {

    try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
    } catch {
        return false;
    }

}

async function saveStreamTo(filePath: string, request: TDownloadComicRequest): Promise<void> {

    activeComicDownloads++;

    try {

        const response = await fetch(request.url, { headers: request.headers });

        if (!response.ok || !response.body) {
            throw new Error(`Download failed (HTTP ${response.status})`);
        }

        await pipeline(
            Readable.fromWeb(response.body as unknown as TWebReadableStream),
            fs.createWriteStream(filePath)
        );

    } catch (e) {

        await fs.promises.rm(filePath, { force: true });

        throw e instanceof Error ? e : new Error("There was an error downloading the comic.");

    } finally {

        activeComicDownloads--;

    }

}

export function registerDownloadComicHandler(): void {

    ipcMain.handle("dialog:save-comic", async (event, request: TDownloadComicRequest): Promise<string | null> => {

        if (!request || !isHttpUrl(request.url) || typeof request.name !== "string") {
            throw new Error("Invalid download request");
        }

        const win = BrowserWindow.fromWebContents(event.sender);

        const options: Electron.SaveDialogOptions = {
            title: "Save comic",
            defaultPath: request.name,
        };

        const { canceled, filePath } = win
            ? await dialog.showSaveDialog(win, options)
            : await dialog.showSaveDialog(options);

        if (canceled || !filePath) return null;

        await saveStreamTo(filePath, request);

        return filePath;

    });

}
