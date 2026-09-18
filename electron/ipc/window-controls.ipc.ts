import { BrowserWindow, ipcMain } from "electron";

export function registerWindowControlsHandlers(): void {

    ipcMain.handle("window:minimize", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.handle("window:toggle-maximize", (event) => {

        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win) return;

        if (win.isMaximized()) win.unmaximize();
        else win.maximize();

    });

    ipcMain.handle("window:close", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.handle("window:is-maximized", (event) => {
        return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
    });

}
