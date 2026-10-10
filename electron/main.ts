import { app, BrowserWindow, dialog } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { createBrowserWindowConfig } from "./window.config";
import { createBeforeInputHandler } from "./events/before-input.event";
import { handleWindowOpen } from "./events/window-open.event";
import { createNavigationGuard } from "./events/navigation-guard.event";
import { registerPickFolderHandler } from "./ipc/pick-folder.ipc";
import { registerToggleFullscreenHandler } from "./ipc/toggle-fullscreen.ipc";
import { registerWindowControlsHandlers } from "./ipc/window-controls.ipc";
import { bindMaximizeChangeEvents } from "./events/maximize-change.event";
import { bindCloseGuard, registerCloseGuardHandlers } from "./events/close-guard.event";
import { APP_NAME } from "./app.config";
import { createStartupLogger } from "./logger";
import { checkForUpdates } from "./update-check";

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

async function startDesktopApp() {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const PORT = process.env.PORT || "3000";
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

    const win = new BrowserWindow(createBrowserWindowConfig({
      app: app,
      appName: APP_NAME,
      iconPath: iconPath,
      isMac: isMac,
      preloadPath: path.join(__dirname, "preload.cjs")
    }))

    win.loadURL(serverUrl);
    win.setMenu(null);

    win.webContents.on("before-input-event", createBeforeInputHandler({ win, isMac }));

    bindMaximizeChangeEvents(win);

    bindCloseGuard(win, () => serverUrl);

    win.webContents.setWindowOpenHandler(handleWindowOpen);

    const navigationGuard = createNavigationGuard({ appUrl: serverUrl });
    win.webContents.on("will-navigate", navigationGuard);
    win.webContents.on("will-redirect", navigationGuard);

    win.once("ready-to-show", () => {
      win.show();
      if (app.isPackaged) void checkForUpdates(win, log);
    });

  }

  registerPickFolderHandler();
  registerToggleFullscreenHandler();
  registerWindowControlsHandlers();
  registerCloseGuardHandlers();

  const { log, filePath: logFilePath } = createStartupLogger(app.getPath("userData"));

  app.whenReady().then(async () => {

    let stderrTail = "";

    try {

      log(`Launching server (packaged=${app.isPackaged}, port=${PORT})`);

      if (app.isPackaged) {

        const resourcesPath = process.resourcesPath;
        const isWindows = process.platform === "win32";
        const exePath = path.join(resourcesPath, "server", isWindows ? "run.exe" : "run");
        const clientDistDir = path.join(resourcesPath, "client");
        const nodePath = path.join(resourcesPath, "server", "vendor", "node_modules");
        const sevenZipPath = path.join(resourcesPath, "bin", isWindows ? "7z.exe" : "7zz");
        const thumbnailWorkerPath = path.join(resourcesPath, "thumbnail-worker", "worker.cjs");

        log(`Server executable: ${exePath}`);
        log(`Client dist dir: ${clientDistDir}`);
        log(`Working directory: ${app.getPath("userData")}`);

        if (!fs.existsSync(exePath)) {
          throw new Error(`Server executable not found at ${exePath}`);
        }

        if (!fs.existsSync(sevenZipPath)) {
          throw new Error(`Bundled 7-Zip not found at ${sevenZipPath}`);
        }

        if (!fs.existsSync(thumbnailWorkerPath)) {
          throw new Error(`Bundled thumbnail worker not found at ${thumbnailWorkerPath}`);
        }

        serverProcess = spawn(exePath, [], {

          cwd: app.getPath("userData"),

          env: {
            ...process.env,
            PORT,
            CLIENT_DIST_DIR: clientDistDir,
            NODE_PATH: nodePath,
            SEVEN_ZIP_PATH: sevenZipPath,
            THUMBNAIL_RUNTIME_PATH: process.execPath,
            THUMBNAIL_WORKER_PATH: thumbnailWorkerPath,
          },

        });

      } else {

        const projectRoot = path.join(__dirname, "..");

        log(`Dev command: bun run ./src/run.ts (cwd=${projectRoot})`);

        serverProcess = spawn("bun", ["run", "./src/run.ts"], {
          cwd: projectRoot,
          env: { ...process.env, PORT },
        });

      }

      log(`Server process spawned (pid=${serverProcess.pid})`);

      serverProcess.stdout?.on("data", (data) =>
        log(`[server:out] ${data.toString().trimEnd()}`)
      );

      serverProcess.stderr?.on("data", (data) => {
        const text = data.toString();
        stderrTail = (stderrTail + text).slice(-4000);
        log(`[server:err] ${text.trimEnd()}`);
      });

      const port = await waitForServerPort(serverProcess);
      log(`Server announced port ${port}`);
      serverUrl = `http://localhost:${port}/`;
      await waitForServer(`${serverUrl}healthz`, serverProcess);
      log("Server responded to health check");

    } catch (e) {

      const reason = e instanceof Error ? e.message : String(e);

      const cause = /EADDRINUSE|address already in use/i.test(stderrTail)
        ? `Port ${PORT} is already in use by another process. Close any other running instance of ${APP_NAME} and try again.`
        : reason;

      log(`Startup failed: ${reason}`);

      const details = stderrTail.trim();

      dialog.showErrorBox(
        APP_NAME,
        `Failed to start the server: ${cause}`
        + (details ? `\n\nServer output:\n${details}` : "")
        + `\n\nFull logs: ${logFilePath}`
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
