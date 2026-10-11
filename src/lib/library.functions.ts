import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SectionConfigMap } from "@/lib/slides";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

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
  sections: SectionConfigMap;
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
  payload: JsonObject;
}

export interface ThemeRecord {
  id: string;
  name: string;
  config: JsonObject;
  is_default: boolean;
}

const songInput = (input: {
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
  sections?: SectionConfigMap;
}) => ({
  id: input.id ?? null,
  title: String(input.title).trim().slice(0, 200) || "Sem título",
  artist: String(input.artist ?? "").slice(0, 200),
  song_key: String(input.song_key ?? "").slice(0, 12),
  bpm: input.bpm && Number.isFinite(input.bpm) ? Math.trunc(input.bpm) : null,
  ccli: String(input.ccli ?? "").slice(0, 40),
  tags: (input.tags ?? []).slice(0, 20).map((t) => String(t).slice(0, 40)),
  lyrics: String(input.lyrics ?? "").slice(0, 20000),
  arrangement: (input.arrangement ?? []).slice(0, 60).map((t) => String(t).slice(0, 40)),
  notes: String(input.notes ?? "").slice(0, 4000),
  sections: (input.sections ?? {}) as JsonObject,
});

export const listSongs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SongRecord[]> => {
    const { data, error } = await context.supabase
      .from("songs")
      .select("id, title, artist, song_key, bpm, ccli, tags, lyrics, arrangement, notes, sections, updated_at")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as SongRecord[];
  });

export const saveSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(songInput)
  .handler(async ({ data, context }): Promise<SongRecord> => {
    const { id, ...values } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("songs")
        .update(values)
        .eq("id", id)
        .select("id, title, artist, song_key, bpm, ccli, tags, lyrics, arrangement, notes, sections, updated_at")
        .single();
      if (error) throw new Error(error.message);
      return row as SongRecord;
    }
    const { data: row, error } = await context.supabase
      .from("songs")
      .insert({ ...values, user_id: context.userId })
      .select("id, title, artist, song_key, bpm, ccli, tags, lyrics, arrangement, notes, sections, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as SongRecord;
  });

export const deleteSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("songs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSetlists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SetlistRecord[]> => {
    const { data, error } = await context.supabase
      .from("setlists")
      .select("id, name, service_date, notes")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SetlistRecord[];
  });

export const createSetlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; service_date?: string | null }) => ({
    name: String(input.name).trim().slice(0, 120) || "Novo repertório",
    service_date: input.service_date ? String(input.service_date).slice(0, 10) : null,
  }))
  .handler(async ({ data, context }): Promise<SetlistRecord> => {
    const { data: row, error } = await context.supabase
      .from("setlists")
      .insert({ ...data, user_id: context.userId })
      .select("id, name, service_date, notes")
      .single();
    if (error) throw new Error(error.message);
    return row as SetlistRecord;
  });

export const deleteSetlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("setlists").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSetlistItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { setlistId: string }) => ({ setlistId: String(input.setlistId) }))
  .handler(async ({ data, context }): Promise<SetlistItemRecord[]> => {
    const { data: rows, error } = await context.supabase
      .from("setlist_items")
      .select("id, setlist_id, position, kind, title, payload")
      .eq("setlist_id", data.setlistId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as SetlistItemRecord[];
  });

export const addSetlistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    setlistId: string;
    kind: string;
    title: string;
    payload?: JsonObject;
    position?: number;
  }) => ({
    setlistId: String(input.setlistId),
    kind: ["song", "bible", "text", "media"].includes(input.kind) ? input.kind : "text",
    title: String(input.title).slice(0, 200),
    payload: input.payload ?? {},
    position: Number.isFinite(input.position) ? Math.trunc(input.position as number) : 0,
  }))
  .handler(async ({ data, context }): Promise<SetlistItemRecord> => {
    const { data: row, error } = await context.supabase
      .from("setlist_items")
      .insert({
        setlist_id: data.setlistId,
        user_id: context.userId,
        kind: data.kind,
        title: data.title,
        payload: data.payload,
        position: data.position,
      })
      .select("id, setlist_id, position, kind, title, payload")
      .single();
    if (error) throw new Error(error.message);
    return row as SetlistItemRecord;
  });

export const removeSetlistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("setlist_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSetlistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; title?: string; payload?: JsonObject; position?: number }) => ({
    id: String(input.id),
    title: input.title !== undefined ? String(input.title).slice(0, 200) : undefined,
    payload: input.payload,
    position: Number.isFinite(input.position) ? Math.trunc(input.position as number) : undefined,
  }))
  .handler(async ({ data, context }): Promise<SetlistItemRecord> => {
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update["title"] = data.title;
    if (data.payload !== undefined) update["payload"] = data.payload;
    if (data.position !== undefined) update["position"] = data.position;
    const { data: row, error } = await context.supabase
      .from("setlist_items")
      .update(update as any)
      .eq("id", data.id)
      .select("id, setlist_id, position, kind, title, payload")
      .single();
    if (error) throw new Error(error.message);
    return row as SetlistItemRecord;
  });

export const reorderSetlistItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { items: Array<{ id: string; position: number }> }) => ({
    items: input.items.slice(0, 200).map((i) => ({ id: String(i.id), position: Math.trunc(i.position) })),
  }))
  .handler(async ({ data, context }) => {
    for (const item of data.items) {
      const { error } = await context.supabase
        .from("setlist_items")
        .update({ position: item.position })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const searchSongs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q: string }) => ({ q: String(input.q).slice(0, 120) }))
  .handler(async ({ data, context }): Promise<SongRecord[]> => {
    const q = data.q.trim();
    if (!q) return [];
    const terms = q.split(/\s+/).map((t) => `${t}:*`).join(" & ");
    const { data: rows, error } = await context.supabase
      .from("songs")
      .select("id, title, artist, song_key, bpm, ccli, tags, lyrics, arrangement, notes, sections, updated_at")
      .textSearch("search_vector", terms)
      .limit(12);
    if (error) {
      // fallback simples se search_vector não existir ainda
      const { data: fallback, error: fallbackError } = await context.supabase
        .from("songs")
        .select("id, title, artist, song_key, bpm, ccli, tags, lyrics, arrangement, notes, sections, updated_at")
        .or(`title.ilike.%${q}%,artist.ilike.%${q}%,lyrics.ilike.%${q}%`)
        .limit(12);
      if (fallbackError) throw new Error(fallbackError.message);
      return (fallback ?? []) as SongRecord[];
    }
    return (rows ?? []) as SongRecord[];
  });

export const listThemes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ThemeRecord[]> => {
    const { data, error } = await context.supabase
      .from("themes")
      .select("id, name, config, is_default")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ThemeRecord[];
  });

export const saveTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string | null; name: string; config: JsonObject }) => ({
    id: input.id ?? null,
    name: String(input.name).trim().slice(0, 80) || "Tema",
    config: input.config ?? {},
  }))
  .handler(async ({ data, context }): Promise<ThemeRecord> => {
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("themes")
        .update({ name: data.name, config: data.config })
        .eq("id", data.id)
        .select("id, name, config, is_default")
        .single();
      if (error) throw new Error(error.message);
      return row as ThemeRecord;
    }
    const { data: row, error } = await context.supabase
      .from("themes")
      .insert({ name: data.name, config: data.config, user_id: context.userId })
      .select("id, name, config, is_default")
      .single();
    if (error) throw new Error(error.message);
    return row as ThemeRecord;
  });

export const deleteTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("themes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
