import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

function waitForServerPort(
  serverProcess: ChildProcess,
  timeoutMs = 30000
): Promise<number> {

  return new Promise((resolve, reject) => {

    let settled = false;
    let buffer = "";

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      serverProcess.stdout?.off("data", onData);
      serverProcess.off("exit", onExit);
      serverProcess.off("error", onError);
      fn();
    };

    const onData = (data: Buffer) => {
      buffer += data.toString();
      const match = /BR_SERVER_LISTENING (\d+)/.exec(buffer);
      if (match) finish(() => resolve(Number(match[1])));
    };

    const onExit = (code: number | null) => {
      finish(() => reject(new Error(
        `Server process exited before announcing its port (code ${code})`
      )));
    };

    const onError = (err: Error) => {
      finish(() => reject(new Error(
        `Failed to start server process: ${err.message}`
      )));
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error(
        "Timed out waiting for the server to announce its port"
      )));
    }, timeoutMs);

    serverProcess.stdout?.on("data", onData);
    serverProcess.once("exit", onExit);
    serverProcess.once("error", onError);

  });

}

function waitForServer(
  healthUrl: string,
  serverProcess: ChildProcess,
  retries = 60,
  delayMs = 500
): Promise<void> {

  return new Promise((resolve, reject) => {

    let settled = false;

    const onExit = (code: number | null) => {
      if (settled) return;
      settled = true;
      reject(new Error(
        `Server process exited before responding (code ${code})`
      ));
    };

    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(new Error(
        `Failed to start server process: ${err.message}`
      ));
    };

    serverProcess.once("exit", onExit);
    serverProcess.once("error", onError);

    const cleanup = () => {
      serverProcess.off("exit", onExit);
      serverProcess.off("error", onError);
    };

    const retryOrFail = (
      remaining: number,
      reason: string
    ) => {
      if (settled) return;
      if (remaining <= 0) {
        settled = true;
        cleanup();
        reject(new Error(
          `Server at ${healthUrl} did not identify as BetterRack (${reason})`
        ));
        return;
      }
      setTimeout(() => attempt(remaining - 1), delayMs);
    };

    const attempt = (remaining: number) => {

      if (settled) return;

      const req = http.get(healthUrl, (res) => {

        if (res.statusCode !== 200) {
          res.resume();
          retryOrFail(remaining, `status ${res.statusCode}`);
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          if (settled) return;
          try {
            const parsed = JSON.parse(body) as { app?: string };
            if (parsed.app === "betterrack") {
              settled = true;
              cleanup();
              resolve();
              return;
            }
            retryOrFail(remaining, "identity mismatch");
          } catch {
            retryOrFail(remaining, "invalid response body");
          }
        });

      });

      req.on("error", () => {
        retryOrFail(remaining, "connection refused");
      });

    };

    attempt(retries);

  });

}

const APP_NAME = "Better Rack";

async function startDesktopApp() {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const PORT = process.env.PORT || "0";
  let serverUrl = "";
  let serverProcess: ChildProcess | null = null;

  const iconPath = path.join(__dirname, "..", "build", "icon.png");

  app.setName(APP_NAME);

  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: `Copyright © ${new Date().getFullYear()} AminPerez`,
    website: "https://github.com/EvilPrime98/BetterRack",
  });

  function createWindow(): void {

    const isMac = process.platform === "darwin";

    const titleBarOverlay = {
      color: "#0a0a0a",
      symbolColor: "#ffffff",
      height: 54,
    };

    const win = new BrowserWindow({
      width: 1240,
      height: 950,
      minWidth: 900,
      minHeight: 600,
      title: APP_NAME,
      ...(app.isPackaged ? {} : { icon: iconPath }),
      show: false,
      backgroundColor: "#0a0a0a",
      titleBarStyle: isMac ? "hiddenInset" : "hidden",
      ...(isMac ? {} : { titleBarOverlay }),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    win.loadURL(serverUrl);
    win.setMenu(null)

    win.webContents.on("before-input-event", (event, input) => {

      if (input.type !== "keyDown") return;

      const isF11 = input.key === "F11";
      const isMacFullscreen =
        isMac && input.meta && input.control && input.key.toLowerCase() === "f";

      if (isF11 || isMacFullscreen) {
        event.preventDefault();
        win.setFullScreen(!win.isFullScreen());
      }

    });

    if (!isMac) {
      win.on("leave-full-screen", () => win.setTitleBarOverlay(titleBarOverlay));
    }

    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });

    win.once("ready-to-show", () => {
      win.show();
    });

  }

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

  app.whenReady().then(async () => {

    try {

      if (app.isPackaged) {

        const resourcesPath = process.resourcesPath;
        const exePath = path.join(resourcesPath, "server", "run.exe");

        serverProcess = spawn(exePath, [], {

          cwd: app.getPath("userData"),

          env: {
            ...process.env,
            PORT,
            CLIENT_DIST_DIR: path.join(resourcesPath, "client"),
            NODE_PATH: path.join(resourcesPath, "server", "vendor", "node_modules"),
          },

        });

      } else {

        const projectRoot = path.join(__dirname, "..");

        serverProcess = spawn("bun", ["run", "./src/run.ts"], {
          cwd: projectRoot,
          env: { ...process.env, PORT },
        });

      }

      serverProcess.stdout?.on("data", (data) =>
        console.log(`[server] ${data}`)
      );

      serverProcess.stderr?.on("data", (data) =>
        console.error(`[server] ${data}`)
      );

      const port = await waitForServerPort(serverProcess);
      serverUrl = `http://localhost:${port}/`;
      await waitForServer(`${serverUrl}healthz`, serverProcess);

    } catch (e) {

      dialog.showErrorBox(
        APP_NAME,
        `Failed to start the server: ${e instanceof Error
          ? e.message
          : String(e)
        }`
      );

      app.quit();

      return;

    }

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

  });

  app.on("window-all-closed", () => {

    if (process.platform !== "darwin") app.quit();

  });

  app.on("will-quit", () => {
    serverProcess?.kill();
    serverProcess = null;
  });

}

startDesktopApp()
