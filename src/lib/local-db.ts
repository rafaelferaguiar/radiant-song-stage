// src/lib/local-db.ts
// Adapter que detecta se está rodando no Electron e usa a API local (IPC),
// ou faz fallback seguro para localStorage quando rodando no navegador.

export interface SongRecord {
  id: string;
  title: string;
  artist: string;
  song_key: string;
  bpm: number | null;
  ccli: string;
  tags: string[];
  lyrics: string;
  arrangement: string[];
  notes: string;
  sections: Record<string, unknown>;
  updated_at: string;
}

export interface SetlistRecord {
  id: string;
  name: string;
  service_date: string | null;
  notes: string;
}

export interface SetlistItemRecord {
  id: string;
  setlist_id: string;
  position: number;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
}

export interface ThemeRecord {
  id: string;
  name: string;
  config: Record<string, unknown>;
  is_default: boolean;
}

// Verifica se está rodando no Electron
export function isElectron(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window && (window as any).electronAPI?.isElectron === true;
}

// Acesso tipado à API do Electron
function api(): any {
  return typeof window !== "undefined" ? (window as any).electronAPI : null;
}

function getStorage(key: string, defaultVal: string = "[]"): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return defaultVal;
  try {
    return localStorage.getItem(key) || defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorage(key: string, val: string): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, val);
  } catch {}
}

// ── SONGS ───────────────────────────────────────────────────────────────────

export async function localListSongs(): Promise<SongRecord[]> {
  if (isElectron()) return api().listSongs();
  return JSON.parse(getStorage("rfp:songs", "[]"));
}

export async function localSaveSong(input: {
  id?: string | null;
  title: string;
  artist?: string;
  song_key?: string;
  bpm?: number | null;
  ccli?: string;
  tags?: string[];
  lyrics?: string;
  arrangement?: string[];
  notes?: string;
  sections?: Record<string, unknown>;
}): Promise<SongRecord> {
  if (isElectron()) return api().saveSong(input);

  // localStorage fallback
  const songs: SongRecord[] = JSON.parse(getStorage("rfp:songs", "[]"));
  const now = new Date().toISOString();
  if (input.id) {
    const idx = songs.findIndex((s) => s.id === input.id);
    if (idx !== -1) {
      songs[idx] = { ...songs[idx], ...input, updated_at: now } as SongRecord;
      setStorage("rfp:songs", JSON.stringify(songs));
      return songs[idx];
    }
  }
  const song: SongRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title || "Sem título",
    artist: input.artist || "",
    song_key: input.song_key || "",
    bpm: input.bpm ?? null,
    ccli: input.ccli || "",
    tags: input.tags || [],
    lyrics: input.lyrics || "",
    arrangement: input.arrangement || [],
    notes: input.notes || "",
    sections: input.sections || {},
    updated_at: now,
  };
  songs.push(song);
  setStorage("rfp:songs", JSON.stringify(songs));
  return song;
}

export async function localDeleteSong(id: string): Promise<{ ok: boolean }> {
  if (isElectron()) return api().deleteSong(id);
  const songs: SongRecord[] = JSON.parse(getStorage("rfp:songs", "[]"));
  setStorage("rfp:songs", JSON.stringify(songs.filter((s) => s.id !== id)));
  return { ok: true };
}

export async function localSearchSongs(q: string): Promise<SongRecord[]> {
  if (isElectron()) return api().searchSongs(q);
  if (!q) return [];
  const lower = q.toLowerCase();
  const songs: SongRecord[] = JSON.parse(getStorage("rfp:songs", "[]"));
  return songs
    .filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower) ||
        s.lyrics.toLowerCase().includes(lower),
    )
    .slice(0, 12);
}

// ── SETLISTS ────────────────────────────────────────────────────────────────

export async function localListSetlists(): Promise<SetlistRecord[]> {
  if (isElectron()) return api().listSetlists();
  return JSON.parse(getStorage("rfp:setlists", "[]"));
}

export async function localCreateSetlist(input: {
  name: string;
  service_date?: string | null;
}): Promise<SetlistRecord> {
  if (isElectron()) return api().createSetlist(input);
  const setlists: SetlistRecord[] = JSON.parse(getStorage("rfp:setlists", "[]"));
  const record: SetlistRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name || "Novo repertório",
    service_date: input.service_date || null,
    notes: "",
  };
  setlists.unshift(record);
  setStorage("rfp:setlists", JSON.stringify(setlists));
  return record;
}

export async function localDeleteSetlist(id: string): Promise<{ ok: boolean }> {
  if (isElectron()) return api().deleteSetlist(id);
  const setlists: SetlistRecord[] = JSON.parse(getStorage("rfp:setlists", "[]"));
  setStorage("rfp:setlists", JSON.stringify(setlists.filter((s) => s.id !== id)));
  const items: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  setStorage("rfp:setlist_items", JSON.stringify(items.filter((i) => i.setlist_id !== id)));
  return { ok: true };
}

// ── SETLIST ITEMS ───────────────────────────────────────────────────────────

export async function localListSetlistItems(setlistId: string): Promise<SetlistItemRecord[]> {
  if (isElectron()) return api().listSetlistItems(setlistId);
  const items: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  return items.filter((i) => i.setlist_id === setlistId).sort((a, b) => a.position - b.position);
}

export async function localAddSetlistItem(input: {
  setlistId: string;
  kind: string;
  title: string;
  payload?: Record<string, unknown>;
  position?: number;
}): Promise<SetlistItemRecord> {
  if (isElectron()) return api().addSetlistItem(input);
  const items: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  const record: SetlistItemRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    setlist_id: input.setlistId,
    position: input.position ?? 0,
    kind: input.kind || "text",
    title: input.title || "",
    payload: input.payload || {},
  };
  items.push(record);
  setStorage("rfp:setlist_items", JSON.stringify(items));
  return record;
}

export async function localRemoveSetlistItem(id: string): Promise<{ ok: boolean }> {
  if (isElectron()) return api().removeSetlistItem(id);
  const items: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  setStorage("rfp:setlist_items", JSON.stringify(items.filter((i) => i.id !== id)));
  return { ok: true };
}

export async function localUpdateSetlistItem(input: {
  id: string;
  title?: string;
  payload?: Record<string, unknown>;
  position?: number;
}): Promise<SetlistItemRecord> {
  if (isElectron()) return api().updateSetlistItem(input);
  const items: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  const idx = items.findIndex((i) => i.id === input.id);
  if (idx !== -1) {
    if (input.title !== undefined) items[idx].title = input.title;
    if (input.payload !== undefined) items[idx].payload = input.payload;
    if (input.position !== undefined) items[idx].position = input.position;
    setStorage("rfp:setlist_items", JSON.stringify(items));
    return items[idx];
  }
  throw new Error("Item não encontrado");
}

export async function localReorderSetlistItems(
  items: Array<{ id: string; position: number }>,
): Promise<{ ok: boolean }> {
  if (isElectron()) return api().reorderSetlistItems(items);
  const stored: SetlistItemRecord[] = JSON.parse(getStorage("rfp:setlist_items", "[]"));
  for (const { id, position } of items) {
    const idx = stored.findIndex((i) => i.id === id);
    if (idx !== -1) stored[idx].position = position;
  }
  setStorage("rfp:setlist_items", JSON.stringify(stored));
  return { ok: true };
}

// ── THEMES ──────────────────────────────────────────────────────────────────

export async function localListThemes(): Promise<ThemeRecord[]> {
  if (isElectron()) return api().listThemes();
  return JSON.parse(getStorage("rfp:themes", "[]"));
}

export async function localSaveTheme(input: {
  id?: string | null;
  name: string;
  config: Record<string, unknown>;
}): Promise<ThemeRecord> {
  if (isElectron()) return api().saveTheme(input);
  const themes: ThemeRecord[] = JSON.parse(getStorage("rfp:themes", "[]"));
  if (input.id) {
    const idx = themes.findIndex((t) => t.id === input.id);
    if (idx !== -1) {
      themes[idx] = { ...themes[idx], name: input.name, config: input.config };
      setStorage("rfp:themes", JSON.stringify(themes));
      return themes[idx];
    }
  }
  const record: ThemeRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name || "Tema",
    config: input.config || {},
    is_default: false,
  };
  themes.push(record);
  setStorage("rfp:themes", JSON.stringify(themes));
  return record;
}

export async function localDeleteTheme(id: string): Promise<{ ok: boolean }> {
  if (isElectron()) return api().deleteTheme(id);
  const themes: ThemeRecord[] = JSON.parse(getStorage("rfp:themes", "[]"));
  setStorage("rfp:themes", JSON.stringify(themes.filter((t) => t.id !== id)));
  return { ok: true };
}
