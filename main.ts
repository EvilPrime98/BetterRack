import { app, BrowserWindow, dialog } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

function waitForServer(
  url: string,
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

    const attempt = (remaining: number) => {

      if (settled) return;

      const req = http.get(url, (res) => {
        res.destroy();
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      });

      req.on("error", () => {
        if (settled) return;
        if (remaining <= 0) {
          settled = true;
          cleanup();
          reject(new Error(`Server did not respond at ${url}`));
          return;
        }
        setTimeout(() => attempt(remaining - 1), delayMs);
      });

    };

    attempt(retries);

  });

}

const APP_NAME = "Better Rack";

async function startDesktopApp() {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const PORT = process.env.PORT || "3000";
  const SERVER_URL = `http://localhost:${PORT}/`;
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

    const win = new BrowserWindow({
      width: 1240,
      height: 950,
      minWidth: 900,
      minHeight: 600,
      title: APP_NAME,
      ...(app.isPackaged ? {} : { icon: iconPath }),
      backgroundColor: "#0a0a0a",
      titleBarStyle: isMac ? "hiddenInset" : "hidden",
      ...(isMac ? {} : {
        titleBarOverlay: {
          color: "#0a0a0a",
          symbolColor: "#ffffff",
          height: 54,
        },
      }),
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    win.loadURL(SERVER_URL);
    win.setMenu(null)

  }

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

      await waitForServer(SERVER_URL, serverProcess);

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
