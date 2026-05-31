/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS Desktop — Electron main process.
 * Boots the Express/Gemini backend (reusing server.ts) and opens the UI in a
 * native, frameless-styled window instead of a browser.
 */

const { app, BrowserWindow, Menu, shell, dialog, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PORT = Number(process.env.PORT) || 3000;
const APP_URL = `http://localhost:${PORT}`;
const isDev = !app.isPackaged;

let serverProcess = null;
let mainWindow = null;

/** Poll the backend health endpoint until it answers (or we time out). */
function waitForServer(timeoutMs = 30000, intervalMs = 350) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(`${APP_URL}/api/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return resolve(true);
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) {
        return reject(new Error("Backend did not start in time."));
      }
      setTimeout(ping, intervalMs);
    };
    ping();
  });
}

/** True if a backend is already serving the port (e.g. `npm run dev`). */
function isServerAlreadyUp() {
  return new Promise((resolve) => {
    const req = http.get(`${APP_URL}/api/health`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Launch the backend as a child process (Node in prod, tsx in dev). */
function startBackend() {
  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: isDev ? "development" : "production",
  };

  if (isDev) {
    // Reuse the existing dev server (Vite middleware + API). Run tsx through
    // Electron's bundled Node runtime so paths with spaces work and we avoid
    // shell/.cmd quoting issues entirely.
    const projectRoot = path.join(__dirname, "..");
    const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
    serverProcess = spawn(process.execPath, [tsxCli, "server.ts"], {
      cwd: projectRoot,
      env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
      stdio: "inherit",
    });
  } else {
    // Packaged: run the bundled server with Electron's embedded Node runtime.
    const serverPath = path.join(process.resourcesPath, "server.cjs");
    env.ELECTRON_RUN_AS_NODE = "1";
    env.JARVIS_DIST_PATH = path.join(process.resourcesPath, "app-dist");
    // Let users drop a .env next to the executable to provide GEMINI_API_KEY.
    env.JARVIS_ENV_PATH = path.join(path.dirname(process.execPath), ".env");
    // Persist JARVIS's learned memory in the writable user-data directory.
    env.JARVIS_MEMORY_PATH = path.join(app.getPath("userData"), "jarvis-memory.json");

    serverProcess = spawn(process.execPath, [serverPath], {
      env,
      stdio: "ignore",
    });
  }

  serverProcess.on("error", (err) => {
    console.error("Failed to start JARVIS backend:", err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#020617",
    title: "J.A.R.V.I.S. — Autonomous Maker Assistant",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  // Open external links (grounding sources) in the system browser, not in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: "JARVIS",
      submenu: [
        { role: "reload", label: "Перезавантажити" },
        { role: "forceReload", label: "Примусове перезавантаження" },
        { type: "separator" },
        { role: "togglefullscreen", label: "На весь екран" },
        { role: "toggleDevTools", label: "Інструменти розробника" },
        { type: "separator" },
        { role: "quit", label: "Вийти" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/** Allow microphone (and media) access so voice input works in the desktop app. */
function grantMediaPermissions() {
  const ses = session.defaultSession;

  // This is a local, trusted desktop app — grant mic/camera/media permissions.
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(true));
  ses.setPermissionCheckHandler(() => true);

  // Auto-approve the getUserMedia device selection prompt for the microphone.
  if (typeof ses.setDevicePermissionHandler === "function") {
    ses.setDevicePermissionHandler(() => true);
  }
}

app.whenReady().then(async () => {
  buildMenu();
  grantMediaPermissions();

  const alreadyUp = await isServerAlreadyUp();
  if (!alreadyUp) startBackend();

  try {
    await waitForServer();
  } catch (err) {
    dialog.showErrorBox(
      "JARVIS — помилка запуску",
      "Не вдалося запустити нейронне ядро (бекенд). Перевірте, чи вільний порт " +
        PORT +
        ".\n\n" +
        String(err)
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

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch (e) {
      /* ignore */
    }
  }
});
