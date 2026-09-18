const WINDOW_TITLE_BG = "#313238"; // <client>/main.css -> --bg-chrome

export const createBrowserWindowConfig = ({
    app,
    appName,
    iconPath,
    isMac = false,
    preloadPath
}: {
    app: typeof Electron.app,
    appName: string;
    iconPath: string;
    isMac?: boolean;
    preloadPath: string;
}): Electron.BrowserWindowConstructorOptions => ({

    width: 1240,

    height: 950,

    minWidth: 900,

    minHeight: 600,

    title: appName,

    ...(app.isPackaged ? {} : { icon: iconPath }),

    show: false,

    backgroundColor: WINDOW_TITLE_BG,

    // win32/linux: frameless, the renderer draws its own window controls.
    // macOS keeps the native traffic lights.
    ...(isMac ? { titleBarStyle: "hiddenInset" as const } : { frame: false }),

    webPreferences: {
        preload: preloadPath
    },

})
