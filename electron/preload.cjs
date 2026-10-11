// electron/preload.cjs
// Expõe a API local para o renderer de forma segura via contextBridge.
// O React acessa via window.electronAPI.*

const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("electronAPI", {
  // ── SONGS ──────────────────────────────────────────
  listSongs: () => invoke("db:listSongs"),
  saveSong: (input) => invoke("db:saveSong", input),
  deleteSong: (id) => invoke("db:deleteSong", id),
  searchSongs: (q) => invoke("db:searchSongs", q),

  // ── SETLISTS ────────────────────────────────────────
  listSetlists: () => invoke("db:listSetlists"),
  createSetlist: (input) => invoke("db:createSetlist", input),
  deleteSetlist: (id) => invoke("db:deleteSetlist", id),

  // ── SETLIST ITEMS ───────────────────────────────────
  listSetlistItems: (setlistId) => invoke("db:listSetlistItems", setlistId),
  addSetlistItem: (input) => invoke("db:addSetlistItem", input),
  removeSetlistItem: (id) => invoke("db:removeSetlistItem", id),
  updateSetlistItem: (input) => invoke("db:updateSetlistItem", input),
  reorderSetlistItems: (items) => invoke("db:reorderSetlistItems", items),

  // ── THEMES ──────────────────────────────────────────
  listThemes: () => invoke("db:listThemes"),
  saveTheme: (input) => invoke("db:saveTheme", input),
  deleteTheme: (id) => invoke("db:deleteTheme", id),

  // ── MEDIA ───────────────────────────────────────────
  listMedia: () => invoke("db:listMedia"),
  uploadMedia: (filePath, fileName, mimeType) =>
    invoke("db:uploadMedia", filePath, fileName, mimeType),
  uploadMediaBuffer: (arrayBuffer, fileName, mimeType) =>
    invoke("db:uploadMediaBuffer", arrayBuffer, fileName, mimeType),
  deleteMedia: (id) => invoke("db:deleteMedia", id),

  // ── MULTI-MONITOR & SCREENS ──────────────────────────
  getDisplays: () => invoke("screen:getDisplays"),
  openScreenWindow: (type, displayId) => invoke("screen:openWindow", type, displayId),
  closeScreenWindow: (type) => invoke("screen:closeWindow", type),
  getScreenStatus: () => invoke("screen:getWindowStatus"),
  setScreenAssignment: (type, displayId) => invoke("screen:setAssignment", type, displayId),
  onScreenStatusChange: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("screen:statusChange", listener);
    return () => ipcRenderer.removeListener("screen:statusChange", listener);
  },

  // ── AUTO-UPDATER ────────────────────────────────────
  getAppVersion: () => invoke("updater:getVersion"),
  checkForUpdates: () => invoke("updater:check"),
  quitAndInstallUpdate: () => invoke("updater:quitAndInstall"),
  onUpdaterStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("updater:status", listener);
    return () => ipcRenderer.removeListener("updater:status", listener);
  },

  // ── APP INFO ────────────────────────────────────────
  getAppDataDir: () => invoke("app:getAppDataDir"),
  fetchText: (url) => invoke("net:fetchText", url),
  isElectron: true,
});
