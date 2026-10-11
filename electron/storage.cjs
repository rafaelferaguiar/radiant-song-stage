// electron/storage.cjs
// Gerencia o banco de dados local (JSON) do RFPresenter Desktop.
// Os dados ficam em: <pasta do executável>/appdata/data.json
// As mídias ficam em: <pasta do executável>/appdata/media/

const fs = require("fs");
const path = require("path");
let electron = null;
try {
  electron = require("electron");
} catch {}

function getAppDataDir() {
  const app = electron?.app;
  if (app && app.isPackaged) {
    // Pasta persistente padrão do usuário no Windows (%APPDATA%/RFPresenter/appdata)
    return path.join(app.getPath("userData"), "appdata");
  }
  // Desenvolvimento ou Node standalone: pasta appdata dentro do projeto
  return path.join(__dirname, "..", "appdata");
}

function getDbPath() {
  return path.join(getAppDataDir(), "data.json");
}

function getMediaDir() {
  return path.join(getAppDataDir(), "media");
}

const DEFAULT_DB = {
  songs: [],
  setlists: [],
  setlist_items: [],
  themes: [],
  media: [],
};

function ensureDirs() {
  const appDataDir = getAppDataDir();
  const mediaDir = getMediaDir();
  if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
  if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
}

function readDB() {
  ensureDirs();
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    const initial = { ...DEFAULT_DB };
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    const raw = fs.readFileSync(dbPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DB, ...parsed };
  } catch {
    return { ...DEFAULT_DB };
  }
}

function writeDB(db) {
  ensureDirs();
  fs.writeFileSync(getDbPath(), JSON.stringify(db, null, 2), "utf-8");
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── SONGS ──────────────────────────────────────────────────────────────────

function listSongs() {
  const db = readDB();
  return db.songs.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

function saveSong(input) {
  const db = readDB();
  const now = new Date().toISOString();

  if (input.id) {
    const idx = db.songs.findIndex((s) => s.id === input.id);
    if (idx === -1) throw new Error("Música não encontrada");
    db.songs[idx] = { ...db.songs[idx], ...input, updated_at: now };
    writeDB(db);
    return db.songs[idx];
  }

  const song = {
    id: generateId(),
    title: String(input.title || "").trim() || "Sem título",
    artist: String(input.artist || ""),
    song_key: String(input.song_key || ""),
    bpm: input.bpm ?? null,
    ccli: String(input.ccli || ""),
    tags: input.tags ?? [],
    lyrics: String(input.lyrics || ""),
    arrangement: input.arrangement ?? [],
    notes: String(input.notes || ""),
    sections: input.sections ?? {},
    updated_at: now,
  };
  db.songs.push(song);
  writeDB(db);
  return song;
}

function deleteSong(id) {
  const db = readDB();
  db.songs = db.songs.filter((s) => s.id !== id);
  writeDB(db);
  return { ok: true };
}

function searchSongs(q) {
  if (!q) return [];
  const lower = q.toLowerCase();
  return listSongs()
    .filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower) ||
        s.lyrics.toLowerCase().includes(lower),
    )
    .slice(0, 12);
}

// ── SETLISTS ───────────────────────────────────────────────────────────────

function listSetlists() {
  const db = readDB();
  return [...db.setlists].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

function createSetlist(input) {
  const db = readDB();
  const record = {
    id: generateId(),
    name: String(input.name || "Novo repertório").slice(0, 120),
    service_date: input.service_date || null,
    notes: String(input.notes || ""),
    created_at: new Date().toISOString(),
  };
  db.setlists.push(record);
  writeDB(db);
  return record;
}

function deleteSetlist(id) {
  const db = readDB();
  db.setlists = db.setlists.filter((s) => s.id !== id);
  db.setlist_items = db.setlist_items.filter((i) => i.setlist_id !== id);
  writeDB(db);
  return { ok: true };
}

// ── SETLIST ITEMS ──────────────────────────────────────────────────────────

function listSetlistItems(setlistId) {
  const db = readDB();
  return db.setlist_items
    .filter((i) => i.setlist_id === setlistId)
    .sort((a, b) => a.position - b.position);
}

function addSetlistItem(input) {
  const db = readDB();
  const record = {
    id: generateId(),
    setlist_id: input.setlistId,
    position: input.position ?? 0,
    kind: input.kind || "text",
    title: String(input.title || "").slice(0, 200),
    payload: input.payload ?? {},
  };
  db.setlist_items.push(record);
  writeDB(db);
  return record;
}

function removeSetlistItem(id) {
  const db = readDB();
  db.setlist_items = db.setlist_items.filter((i) => i.id !== id);
  writeDB(db);
  return { ok: true };
}

function updateSetlistItem(input) {
  const db = readDB();
  const idx = db.setlist_items.findIndex((i) => i.id === input.id);
  if (idx === -1) throw new Error("Item não encontrado");
  if (input.title !== undefined) db.setlist_items[idx].title = input.title;
  if (input.payload !== undefined) db.setlist_items[idx].payload = input.payload;
  if (input.position !== undefined) db.setlist_items[idx].position = input.position;
  writeDB(db);
  return db.setlist_items[idx];
}

function reorderSetlistItems(items) {
  const db = readDB();
  for (const { id, position } of items) {
    const idx = db.setlist_items.findIndex((i) => i.id === id);
    if (idx !== -1) db.setlist_items[idx].position = position;
  }
  writeDB(db);
  return { ok: true };
}

// ── THEMES ─────────────────────────────────────────────────────────────────

function listThemes() {
  const db = readDB();
  return db.themes;
}

function saveTheme(input) {
  const db = readDB();
  if (input.id) {
    const idx = db.themes.findIndex((t) => t.id === input.id);
    if (idx !== -1) {
      db.themes[idx] = { ...db.themes[idx], name: input.name, config: input.config };
      writeDB(db);
      return db.themes[idx];
    }
  }
  const record = {
    id: generateId(),
    name: String(input.name || "Tema").slice(0, 80),
    config: input.config ?? {},
    is_default: false,
  };
  db.themes.push(record);
  writeDB(db);
  return record;
}

function deleteTheme(id) {
  const db = readDB();
  db.themes = db.themes.filter((t) => t.id !== id);
  writeDB(db);
  return { ok: true };
}

// ── MEDIA ──────────────────────────────────────────────────────────────────

function listMedia() {
  const db = readDB();
  return db.media;
}

function saveMediaRecord(record) {
  const db = readDB();
  db.media.push(record);
  writeDB(db);
  return record;
}

function deleteMediaRecord(id) {
  const db = readDB();
  const item = db.media.find((m) => m.id === id);
  if (item && item.localPath && fs.existsSync(item.localPath)) {
    try { fs.unlinkSync(item.localPath); } catch {}
  }
  db.media = db.media.filter((m) => m.id !== id);
  writeDB(db);
  return { ok: true };
}

module.exports = {
  getAppDataDir,
  getMediaDir,
  readDB,
  writeDB,
  generateId,
  listSongs,
  saveSong,
  deleteSong,
  searchSongs,
  listSetlists,
  createSetlist,
  deleteSetlist,
  listSetlistItems,
  addSetlistItem,
  removeSetlistItem,
  updateSetlistItem,
  reorderSetlistItems,
  listThemes,
  saveTheme,
  deleteTheme,
  listMedia,
  saveMediaRecord,
  deleteMediaRecord,
};
