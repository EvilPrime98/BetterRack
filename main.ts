import { app, BrowserWindow, dialog } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import http from "node:http";

function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function waitForServer(
  url: string,
  retries = 20,
  delayMs = 300
): Promise<void> {

  return new Promise((resolve, reject) => {

    const attempt = (remaining: number) => {

      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });

      req.on("error", () => {
        if (remaining <= 0) {
          reject(new Error(`Server did not respond at ${url}`));
          return;
        }
        setTimeout(() => attempt(remaining - 1), delayMs);
      });

    };

    attempt(retries);

  });

}

async function startDesktopApp() {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const PORT = process.env.PORT || "3000";
  const SERVER_URL = `http://localhost:${PORT}/`;
  let serverProcess: ChildProcess | null = null;

  function createWindow(): void {

    const isMac = process.platform === "darwin";

    const win = new BrowserWindow({
      width: 1240,
      height: 840,
      minWidth: 900,
      minHeight: 600,
      backgroundColor: "#0a0a0a",
      titleBarStyle: isMac ? "hiddenInset" : "hidden",
      ...(isMac ? {} : {
        titleBarOverlay: {
          color: "#0a0a0a",
          symbolColor: "#ffffff",
          height: 64,
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
        const bundledEnv = parseEnvFile(path.join(resourcesPath, ".env"));

        serverProcess = spawn(exePath, [], {

          cwd: app.getPath("userData"),

          env: {
            ...process.env,
            ...bundledEnv,
            PORT,
            CLIENT_DIST_DIR: path.join(resourcesPath, "client"),
          },

        });

      } else {

        const projectRoot = path.join(__dirname, "..");

        serverProcess = spawn("bun", ["run", "./src/run.ts"], {
          cwd: projectRoot,
          env: { ...process.env, PORT },
        });

      }

      serverProcess.stdout?.on("data", (data) => console.log(`[server] ${data}`));
      serverProcess.stderr?.on("data", (data) => console.error(`[server] ${data}`));
      
      await waitForServer(SERVER_URL);

    } catch (e) {

      dialog.showErrorBox("Better Rack", `Failed to start the server: ${e instanceof Error ? e.message : String(e)}`);
      
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
