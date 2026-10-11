// electron/main.cjs
// Processo principal do RFPresenter Desktop.
// Abre a janela do app, inicia o servidor local autônomo e gerencia o armazenamento 100% local.

const { app, BrowserWindow, ipcMain, protocol, net: electronNet, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");
const http = require("http");
const net = require("net");

const storage = require("./storage.cjs");
const { autoUpdater } = require("electron-updater");

// Registra o protocolo local de mídias como privilegiado ANTES de app.whenReady
// Essencial para permitir streaming de vídeos (<video src="...">), Range requests e CORS.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "rfpresenter-media",
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function log(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ') + '\n';
  console.log(msg.trim());
  try {
    const dir = storage.getAppDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const logFile = path.join(dir, 'app.log');
    fs.appendFileSync(logFile, msg);
  } catch {}
}

const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
let mainWindow = null;
let splashWindow = null;
let projectionWindow = null;
let stageWindow = null;
let currentServerUrl = "http://localhost:5173";
let displayAssignments = {
  projecao: null, // target displayId (number) or null for automatic
  palco: null,     // target displayId (number) or null for automatic
};

// ── CONFIGURAÇÃO DO AUTO-UPDATER (GITHUB RELEASES) ─────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdaterStatus(status, data = {}) {
  log("AutoUpdater:", status, JSON.stringify(data));
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updater:status", { status, ...data });
  }
}

autoUpdater.on("checking-for-update", () => {
  sendUpdaterStatus("checking");
});

autoUpdater.on("update-available", (info) => {
  sendUpdaterStatus("available", {
    version: info ? info.version : undefined,
    releaseDate: info ? info.releaseDate : undefined,
    releaseNotes: info ? info.releaseNotes : undefined,
  });
});

autoUpdater.on("update-not-available", (info) => {
  sendUpdaterStatus("not-available", {
    version: info ? info.version : undefined,
  });
});

autoUpdater.on("download-progress", (progressObj) => {
  sendUpdaterStatus("downloading", {
    percent: Math.round(progressObj.percent),
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on("update-downloaded", (info) => {
  sendUpdaterStatus("downloaded", {
    version: info ? info.version : undefined,
    releaseNotes: info ? info.releaseNotes : undefined,
  });
});

autoUpdater.on("error", (err) => {
  let errorMsg = err == null ? "Erro desconhecido" : (err.message || String(err));
  if (errorMsg.includes("404") || errorMsg.includes("releases.atom")) {
    errorMsg = "Nenhuma release publicada encontrada no GitHub (ou o repositório está privado). Para que as atualizações automáticas funcionem para todos, torne o repositório público no GitHub e publique a release na página de Releases.";
  }
  sendUpdaterStatus("error", {
    error: errorMsg,
  });
});


// Browser Sources load user-provided web pages. Keep the embedded page isolated
// from the application and only allow regular web URLs to be attached.
function configureBrowserSourceWebviews(win) {
  win.webContents.on("will-attach-webview", (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;

    if (!/^https?:\/\//i.test(params.src || "")) {
      log("Browser Source bloqueado: URL inválida", params.src);
      event.preventDefault();
    }
  });
}

// ── SPLASH SCREEN ────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    title: "RFPresenter",
    icon: path.join(__dirname, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload-splash.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.show();
  log("Splash screen aberta");
}

function splashProgress(step, error) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  if (error) {
    splashWindow.webContents.send("splash:progress", { error: String(error) });
  } else {
    splashWindow.webContents.send("splash:progress", { step });
  }
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

// ── MULTI-MONITOR / MULTI-DISPLAY LOGIC ─────────────────────────────────────

function getConnectedDisplays() {
  if (!app.isReady()) return [];
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  return displays.map((d, index) => ({
    id: d.id,
    index: index + 1,
    label: d.label || `Monitor ${index + 1}${d.id === primary.id ? " (Principal)" : ""}`,
    bounds: d.bounds,
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === primary.id,
    scaleFactor: d.scaleFactor,
  }));
}

function resolveTargetDisplay(type, customDisplayId) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondaries = displays.filter((d) => d.id !== primary.id);

  const assignedId = customDisplayId || displayAssignments[type];
  if (assignedId) {
    const found = displays.find((d) => d.id === assignedId);
    if (found) return found;
  }

  // Automático:
  // - Projeção: Monitor 2 (se houver) ou primário
  // - Palco: Monitor 3 (se houver) ou Monitor 2 (se 2 monitores) ou primário
  if (type === "projecao") {
    return secondaries.length > 0 ? secondaries[0] : primary;
  } else if (type === "palco") {
    return secondaries.length > 1 ? secondaries[1] : (secondaries[0] || primary);
  }
  return primary;
}

function getScreenStatus() {
  return {
    displays: getConnectedDisplays(),
    projecaoOpen: !!(projectionWindow && !projectionWindow.isDestroyed()),
    palcoOpen: !!(stageWindow && !stageWindow.isDestroyed()),
    assignments: displayAssignments,
  };
}

function notifyScreenStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("screen:statusChange", getScreenStatus());
  }
}

function openScreenWindow(type, targetDisplayId) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const targetDisplay = resolveTargetDisplay(type, targetDisplayId);
  const { x, y, width, height } = targetDisplay.bounds;
  const isTargetPrimary = targetDisplay.id === primary.id;

  let existingWin = type === "projecao" ? projectionWindow : stageWindow;

  if (existingWin && !existingWin.isDestroyed()) {
    existingWin.setBounds({ x, y, width, height });
    if (!isTargetPrimary || displays.length > 1) {
      existingWin.setFullScreen(true);
    }
    existingWin.show();
    existingWin.focus();
    notifyScreenStatus();
    return { success: true, alreadyOpen: true };
  }

  const isFullscreen = displays.length > 1 || !isTargetPrimary;

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    fullscreen: isFullscreen,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    title: type === "projecao" ? "RFPresenter — Projeção" : "RFPresenter — Retorno de Palco",
    icon: path.join(__dirname, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: true,
    },
    show: false,
  });

  configureBrowserSourceWebviews(win);

  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape" || input.key.toLowerCase() === "f") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });

  win.once("ready-to-show", () => {
    win.setBounds({ x, y, width, height });
    if (isFullscreen) {
      win.setFullScreen(true);
    }
    win.show();
    notifyScreenStatus();
  });

  win.on("closed", () => {
    if (type === "projecao") projectionWindow = null;
    if (type === "palco") stageWindow = null;
    notifyScreenStatus();
  });

  const baseUrl = isDev ? "http://localhost:5173" : currentServerUrl;
  const targetUrl = `${baseUrl}/${type}`;
  log(`Abrindo janela [${type}] no monitor:`, targetDisplay.id, "URL:", targetUrl);
  win.loadURL(targetUrl);

  if (type === "projecao") projectionWindow = win;
  if (type === "palco") stageWindow = win;

  notifyScreenStatus();
  return { success: true };
}

function closeScreenWindow(type) {
  if (type === "projecao" && projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.close();
    projectionWindow = null;
  }
  if (type === "palco" && stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.close();
    stageWindow = null;
  }
  notifyScreenStatus();
  return { success: true };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function waitForServer(targetUrl, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(targetUrl, (res) => {
        resolve();
      });
      req.on("error", (err) => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Tempo esgotado aguardando inicialização do servidor: " + err.message));
        } else {
          setTimeout(check, 30);
        }
      });
      req.setTimeout(1000, () => req.destroy());
    };
    check();
  });
}

async function startProductionServer() {
  try {
    const port = await getFreePort();
    process.env.NITRO_PORT = String(port);
    process.env.PORT = String(port);
    process.env.NITRO_HOST = "127.0.0.1";
    process.env.HOST = "127.0.0.1";
    process.env.NODE_ENV = "production";

    // Procura o arquivo do servidor seja empacotado (asar.unpacked) ou direto
    const unpackedPath = path.join(path.dirname(app.getAppPath()), "app.asar.unpacked", ".output", "server", "index.mjs");
    const regularPath = path.join(__dirname, "..", ".output", "server", "index.mjs");
    const serverEntry = fs.existsSync(unpackedPath) ? unpackedPath : regularPath;

    splashProgress(1); // step: "Localizando servidor local..."
    log("Iniciando servidor local a partir de:", serverEntry, "na porta:", port);

    if (!fs.existsSync(serverEntry)) {
      throw new Error("Arquivo do servidor não encontrado: " + serverEntry);
    }

    const serverUrl = url.pathToFileURL(serverEntry).href;
    await import(serverUrl);

    splashProgress(2); // step: "Aguardando servidor HTTP..."
    const targetUrl = `http://127.0.0.1:${port}`;
    await waitForServer(targetUrl);
    log("Servidor local pronto em:", targetUrl);
    return targetUrl;
  } catch (err) {
    log("Falha ao iniciar servidor de produção:", err && err.stack ? err.stack : err);
    throw err;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    title: "RFPresenter",
    icon: path.join(__dirname, "logo.png"),
    backgroundColor: "#0a0a0f",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: true,
    },
    show: false,
  });

  configureBrowserSourceWebviews(mainWindow);

  let hasShown = false;
  const showMainWindow = () => {
    if (hasShown || !mainWindow || mainWindow.isDestroyed()) return;
    hasShown = true;
    log("Exibindo janela principal");
    closeSplash();
    mainWindow.show();
    mainWindow.maximize();
  };

  // Eventos de exibição registrados ANTES de iniciar a navegação
  mainWindow.once("ready-to-show", () => {
    log("Evento ready-to-show disparado");
    showMainWindow();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    log("Evento did-finish-load disparado");
    showMainWindow();
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    log(`[Renderer L${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    log(`[Renderer Load Failed] Code ${errorCode}: ${errorDescription} URL: ${validatedURL}`);
    splashProgress(null, `Erro ao carregar: ${errorDescription} (${errorCode})`);
  });

  mainWindow.on("closed", () => {
    // Fecha todas as janelas secundárias junto com a principal
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.close();
      projectionWindow = null;
    }
    if (stageWindow && !stageWindow.isDestroyed()) {
      stageWindow.close();
      stageWindow = null;
    }
    mainWindow = null;
  });

  try {
    if (isDev) {
      currentServerUrl = "http://localhost:5173";
      splashProgress(1);
      log("Modo DEV: carregando http://localhost:5173/estudio");
      splashProgress(3);
      await mainWindow.loadURL("http://localhost:5173/estudio");
    } else {
      splashProgress(1);
      log("Modo Produção: iniciando servidor local");
      const serverUrl = await startProductionServer();
      currentServerUrl = serverUrl;
      splashProgress(3);
      log("Carregando URL:", `${serverUrl}/estudio`);
      await mainWindow.loadURL(`${serverUrl}/estudio`);
    }

    log("loadURL concluído com sucesso");
    if (!isDev) {
      setTimeout(() => {
        log("Iniciando verificação de atualizações em background...");
        autoUpdater.checkForUpdates().catch((err) => {
          log("Erro silencioso ao checar atualizações:", err && err.message ? err.message : err);
        });
      }, 5000);
    }
    // Fallback garantido: caso os eventos de renderização já tenham disparado antes
    setTimeout(() => {
      showMainWindow();
    }, 200);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    log("Erro ao carregar URL no Electron:", err && err.stack ? err.stack : err);
    splashProgress(null, msg);
  }
}

// ── PROTOCOLO LOCAL PARA MÍDIAS ─────────────────────────────────────────────
// Permite que src="rfpresenter-media://nomeDoArquivo.jpg" carregue arquivos locais da pasta appdata/media/

app.whenReady().then(() => {
  const MIME_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
  };

  protocol.handle("rfpresenter-media", async (request) => {
    try {
      let rawName = request.url.replace(/^rfpresenter-media:\/\//i, "");
      rawName = rawName.replace(/^\/+/, "").split("?")[0].split("#")[0];
      const fileName = decodeURIComponent(rawName);
      const filePath = path.join(storage.getMediaDir(), fileName);

      if (!fs.existsSync(filePath)) {
        log("Mídia não encontrada no disco:", filePath);
        return new Response("Not found", { status: 404 });
      }

      const ext = path.extname(fileName).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const rangeHeader = request.headers.get("range");

      if (rangeHeader) {
        // Suporte a Range requests (necessário para <video> funcionar)
        const [, rangeStr] = rangeHeader.match(/bytes=(.+)/) || [];
        const [startStr, endStr] = (rangeStr || "0-").split("-");
        const start = parseInt(startStr, 10) || 0;
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        log(`Range request: ${start}-${end}/${fileSize} para ${fileName}`);

        const nodeStream = fs.createReadStream(filePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
            nodeStream.on("end", () => controller.close());
            nodeStream.on("error", (err) => controller.error(err));
          },
          cancel() { nodeStream.destroy(); },
        });

        return new Response(webStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        });
      } else {
        // Requisição normal completa
        const nodeStream = fs.createReadStream(filePath);
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
            nodeStream.on("end", () => controller.close());
            nodeStream.on("error", (err) => controller.error(err));
          },
          cancel() { nodeStream.destroy(); },
        });

        return new Response(webStream, {
          status: 200,
          headers: {
            "Content-Length": String(fileSize),
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
          },
        });
      }
    } catch (err) {
      log("Erro ao carregar mídia local:", err);
      return new Response("Error", { status: 500 });
    }
  });

  // Monitora conexões/desconexões de telas/projetores em tempo real
  screen.on("display-added", () => {
    log("Monitor conectado");
    notifyScreenStatus();
  });
  screen.on("display-removed", () => {
    log("Monitor desconectado");
    notifyScreenStatus();
  });
  screen.on("display-metrics-changed", () => {
    notifyScreenStatus();
  });

  // Show splash immediately, then create the main window in background
  createSplash();
  // Small delay so splash has time to render before heavy work starts
  setTimeout(() => {
    createWindow();
  }, 300);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ── IPC HANDLERS (100% LOCAL CRUD & MULTI-SCREEN) ────────────────────────────

// SCREENS & DISPLAYS
ipcMain.handle("screen:getDisplays", () => getConnectedDisplays());
ipcMain.handle("screen:getWindowStatus", () => getScreenStatus());
ipcMain.handle("screen:openWindow", (_, type, displayId) => openScreenWindow(type, displayId));
ipcMain.handle("screen:closeWindow", (_, type) => closeScreenWindow(type));
ipcMain.handle("screen:setAssignment", (_, type, displayId) => {
  displayAssignments[type] = displayId || null;
  notifyScreenStatus();
  return { success: true };
});

// SONGS
ipcMain.handle("db:listSongs", () => storage.listSongs());
ipcMain.handle("db:saveSong", (_, input) => storage.saveSong(input));
ipcMain.handle("db:deleteSong", (_, id) => storage.deleteSong(id));
ipcMain.handle("db:searchSongs", (_, q) => storage.searchSongs(q));

// SETLISTS
ipcMain.handle("db:listSetlists", () => storage.listSetlists());
ipcMain.handle("db:createSetlist", (_, input) => storage.createSetlist(input));
ipcMain.handle("db:deleteSetlist", (_, id) => storage.deleteSetlist(id));

// SETLIST ITEMS
ipcMain.handle("db:listSetlistItems", (_, setlistId) => storage.listSetlistItems(setlistId));
ipcMain.handle("db:addSetlistItem", (_, input) => storage.addSetlistItem(input));
ipcMain.handle("db:removeSetlistItem", (_, id) => storage.removeSetlistItem(id));
ipcMain.handle("db:updateSetlistItem", (_, input) => storage.updateSetlistItem(input));
ipcMain.handle("db:reorderSetlistItems", (_, items) => storage.reorderSetlistItems(items));

// THEMES
ipcMain.handle("db:listThemes", () => storage.listThemes());
ipcMain.handle("db:saveTheme", (_, input) => storage.saveTheme(input));
ipcMain.handle("db:deleteTheme", (_, id) => storage.deleteTheme(id));

// MEDIA
ipcMain.handle("db:listMedia", () => storage.listMedia());
ipcMain.handle("db:uploadMediaBuffer", async (_, arrayBuffer, fileName, mimeType) => {
  const mediaDir = storage.getMediaDir();
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  const sanitized = fileName.replace(/[^a-zA-Z0-9À-ÿ._-]/g, "_");
  const destName = `${Date.now()}-${sanitized}`;
  const destPath = path.join(mediaDir, destName);

  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);
  const stat = fs.statSync(destPath);

  const isVideo =
    /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(fileName) ||
    (mimeType && mimeType.startsWith("video/"));
  const kind = isVideo ? "video" : "image";

  const record = {
    id: `media-${storage.generateId()}`,
    name: fileName.replace(/\.[^/.]+$/, ""),
    url: `rfpresenter-media://${encodeURIComponent(destName)}`,
    localPath: destPath,
    kind,
    createdAt: Date.now(),
    size: stat.size,
  };

  storage.saveMediaRecord(record);
  log("Mídia salva em disco com sucesso:", record.url, "tamanho:", stat.size);
  return record;
});
ipcMain.handle("db:uploadMedia", async (_, sourcePath, fileName, mimeType) => {
  const mediaDir = storage.getMediaDir();
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  const sanitized = fileName.replace(/[^a-zA-Z0-9À-ÿ._-]/g, "_");
  const destName = `${Date.now()}-${sanitized}`;
  const destPath = path.join(mediaDir, destName);

  fs.copyFileSync(sourcePath, destPath);
  const stat = fs.statSync(destPath);

  const isVideo =
    /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(fileName) ||
    (mimeType && mimeType.startsWith("video/"));
  const kind = isVideo ? "video" : "image";

  const record = {
    id: `media-${storage.generateId()}`,
    name: fileName.replace(/\.[^/.]+$/, ""),
    url: `rfpresenter-media://${encodeURIComponent(destName)}`,
    localPath: destPath,
    kind,
    createdAt: Date.now(),
    size: stat.size,
  };

  storage.saveMediaRecord(record);
  return record;
});

ipcMain.handle("db:deleteMedia", (_, id) => storage.deleteMediaRecord(id));

// APP INFO
ipcMain.handle("app:getAppDataDir", () => storage.getAppDataDir());

// NETWORKING / EXTERNAL FETCH (Bypasses CORS for lyrics search & scrapers)
ipcMain.handle("net:fetchText", async (_, targetUrl) => {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    log("Erro ao buscar URL externa:", targetUrl, err.message);
    return null;
  }
});


// ── AUTO-UPDATER IPC HANDLERS ──────────────────────────────
ipcMain.handle("updater:getVersion", () => app.getVersion());

ipcMain.handle("updater:check", async () => {
  if (isDev) {
    return {
      isDev: true,
      currentVersion: app.getVersion(),
      message: "Modo de desenvolvimento. O auto-update via GitHub funciona na versão empacotada.",
    };
  }
  try {
    log("Verificação manual de atualizações solicitada...");
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (err) {
    const errorMsg = err && err.message ? err.message : String(err);
    log("Erro ao verificar atualização:", errorMsg);
    return { error: errorMsg };
  }
});

ipcMain.handle("updater:quitAndInstall", () => {
  try {
    log("Reiniciando para aplicar atualização baixada...");
    autoUpdater.quitAndInstall(false, true);
  } catch (err) {
    log("Erro ao reiniciar e instalar:", err);
  }
});
