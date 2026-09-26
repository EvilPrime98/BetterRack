export function createBeforeInputHandler({
    win,
    isMac,
}: {
    win: Electron.BrowserWindow;
    isMac: boolean;
}) {

    return (event: Electron.Event, input: Electron.Input) => {

        if (input.type !== "keyDown") return;

        const isF11 = input.key === "F11";
        const isMacFullscreen = isMac
            && input.meta
            && input.control
            && input.key.toLowerCase() === "f";

        if (isF11 || isMacFullscreen) {
            event.preventDefault();
            win.setFullScreen(!win.isFullScreen());
            return;
        }

        const modifier = isMac ? input.meta : input.control;
        
        const key = input.key.toLowerCase();
        
        const isBrowserShortcut = modifier && ["p", "s", "u"].includes(key);

        if (isBrowserShortcut) {
            event.preventDefault();
            return;
        }

        const isDevToolsShortcut = input.key === "F12" ||
            (isMac
                ? input.meta && input.alt && input.key.toLowerCase() === "i"
                : input.control && input.shift && input.key.toLowerCase() === "i");

        if (isDevToolsShortcut) {
            event.preventDefault();
            win.webContents.toggleDevTools();
        }

    };

}
