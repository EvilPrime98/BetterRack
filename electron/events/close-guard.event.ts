import { app, BrowserWindow, ipcMain } from "electron";

type TJobSummary = { state: string };

type TCloseGuard = {
    win: BrowserWindow;
    getServerUrl: () => string;
    isConfirmed: boolean;
    isChecking: boolean;
    isQuitRequested: boolean;
};

let activeGuard: TCloseGuard | null = null;

async function countActiveDownloads(serverUrl: string): Promise<number> {

    try {

        const response = await fetch(`${serverUrl}api/downloads/jobs`);
        if (!response.ok) return 0;

        const { jobs } = await response.json() as { jobs: TJobSummary[] };

        return jobs.filter((job) => job.state === "queued" || job.state === "running").length;

    } catch {

        return 0;

    }

}

function finishClose(guard: TCloseGuard): void {

    guard.isConfirmed = true;

    if (guard.isQuitRequested) app.quit();
    else guard.win.close();

}

export function bindCloseGuard(
    win: BrowserWindow,
    getServerUrl: () => string
): void {

    const guard: TCloseGuard = {
        win,
        getServerUrl,
        isConfirmed: false,
        isChecking: false,
        isQuitRequested: false,
    };

    activeGuard = guard;

    win.on("close", (event) => {

        if (guard.isConfirmed) return;

        event.preventDefault();

        if (guard.isChecking) return;
        guard.isChecking = true;

        countActiveDownloads(guard.getServerUrl()).then((activeCount) => {

            guard.isChecking = false;

            if (win.isDestroyed()) return;

            if (activeCount === 0) finishClose(guard);
            else win.webContents.send("window:close-requested", activeCount);

        });

    });

    win.on("closed", () => {
        if (activeGuard === guard) activeGuard = null;
    });

}

export function registerCloseGuardHandlers(): void {

    ipcMain.handle("window:confirm-close", () => {
        if (activeGuard) finishClose(activeGuard);
    });

    ipcMain.handle("window:cancel-close", () => {
        if (activeGuard) activeGuard.isQuitRequested = false;
    });

    app.on("before-quit", (event) => {

        const guard = activeGuard;

        if (!guard || guard.isConfirmed || guard.win.isDestroyed()) return;

        event.preventDefault();
        guard.isQuitRequested = true;
        guard.win.close();

    });

}
