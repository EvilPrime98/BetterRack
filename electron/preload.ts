import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

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
  },

  minimizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke("window:minimize")
  },

  toggleMaximizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke("window:toggle-maximize")
  },

  closeWindow: (): Promise<void> => {
    return ipcRenderer.invoke("window:close")
  },

  isWindowMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke("window:is-maximized")
  },

  confirmClose: (): Promise<void> => {
    return ipcRenderer.invoke("window:confirm-close")
  },

  cancelClose: (): Promise<void> => {
    return ipcRenderer.invoke("window:cancel-close")
  },

  onCloseRequested: (callback: (activeDownloads: number) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, activeDownloads: number) => callback(activeDownloads);
    ipcRenderer.on("window:close-requested", listener);
    return () => ipcRenderer.removeListener("window:close-requested", listener);
  },

  onMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on("window:maximized-changed", listener);
    return () => ipcRenderer.removeListener("window:maximized-changed", listener);
  }

});
