import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("versions", {
  chrome: process.versions.chrome,
  node: process.versions.node,
  electron: process.versions.electron,
  platform: process.platform,
});

contextBridge.exposeInMainWorld("desktop", {

  pickLibraryFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke("dialog:pick-folder")
  },

  toggleFullscreen: (): Promise<void> => {
    return ipcRenderer.invoke("window:toggle-fullscreen")
  }

});
