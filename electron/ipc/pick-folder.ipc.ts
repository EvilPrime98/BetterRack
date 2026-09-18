import { BrowserWindow, dialog, ipcMain } from "electron";

export function registerPickFolderHandler(): void {

    ipcMain.handle("dialog:pick-folder", async (event) => {

        const win = BrowserWindow.fromWebContents(event.sender);

        const options: Electron.OpenDialogOptions = {
            title: "Select library folder",
            properties: ["openDirectory"],
        };

        const { canceled, filePaths } = win
            ? await dialog.showOpenDialog(win, options)
            : await dialog.showOpenDialog(options);

        return canceled || filePaths.length === 0 ? null : filePaths[0];

    });

}
