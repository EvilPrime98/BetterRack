import { BrowserWindow, ipcMain } from "electron";

export function registerToggleFullscreenHandler(): void {

    ipcMain.handle("window:toggle-fullscreen", (event) => {

        const win = BrowserWindow.fromWebContents(event.sender);
        win?.setFullScreen(!win.isFullScreen());

    });

}
