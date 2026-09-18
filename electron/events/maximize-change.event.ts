export function bindMaximizeChangeEvents(win: Electron.BrowserWindow): void {

    const notify = (isMaximized: boolean) => {
        win.webContents.send("window:maximized-changed", isMaximized);
    };

    win.on("maximize", () => notify(true));
    win.on("unmaximize", () => notify(false));

}
