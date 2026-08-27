import { createServerFn } from "@tanstack/react-start";

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface SearchHit {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

function clean(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export const getChapter = createServerFn({ method: "GET" })
  .inputValidator((input: { translation: string; book: number; chapter: number }) => ({
    translation: String(input.translation).slice(0, 12),
    book: Math.min(Math.max(Math.trunc(input.book), 1), 66),
    chapter: Math.min(Math.max(Math.trunc(input.chapter), 1), 150),
  }))
  .handler(async ({ data }): Promise<{ verses: BibleVerse[]; error?: string }> => {
    try {
      const res = await fetch(
        `https://bolls.life/get-chapter/${data.translation}/${data.book}/${data.chapter}/`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) return { verses: [], error: "Não foi possível carregar o capítulo." };
      const json = (await res.json()) as Array<{ verse: number; text: string }>;
      return { verses: json.map((v) => ({ verse: v.verse, text: clean(v.text) })) };
    } catch {
      return { verses: [], error: "Serviço bíblico indisponível." };
    }
  });

export const searchVerses = createServerFn({ method: "GET" })
  .inputValidator((input: { translation: string; query: string; book?: number | null }) => ({
    translation: String(input.translation).slice(0, 12),
    query: String(input.query).slice(0, 120),
    book: input.book ? Math.min(Math.max(Math.trunc(input.book), 1), 66) : null,
  }))
  .handler(async ({ data }): Promise<{ hits: SearchHit[]; error?: string }> => {
    if (data.query.trim().length < 3) return { hits: [] };
    try {
      const params = new URLSearchParams({ search: data.query.trim(), limit: "60" });
      if (data.book) params.set("book", String(data.book));
      const res = await fetch(`https://bolls.life/find/${data.translation}/?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return { hits: [], error: "Busca indisponível." };
      const json = (await res.json()) as Array<{
        book: number;
        chapter: number;
        verse: number;
        text: string;
      }>;
      return {
        hits: json.map((h) => ({
          book: h.book,
          chapter: h.chapter,
          verse: h.verse,
          text: clean(h.text),
        })),
      };
    } catch {
      return { hits: [], error: "Serviço bíblico indisponível." };
    }
  });

export const compareVerse = createServerFn({ method: "GET" })
  .inputValidator((input: {
    translations: string[];
    book: number;
    chapter: number;
    verse: number;
  }) => ({
    translations: input.translations.slice(0, 4).map((t) => String(t).slice(0, 12)),
    book: Math.min(Math.max(Math.trunc(input.book), 1), 66),
    chapter: Math.min(Math.max(Math.trunc(input.chapter), 1), 150),
    verse: Math.min(Math.max(Math.trunc(input.verse), 1), 200),
  }))
  .handler(async ({ data }): Promise<{ results: Array<{ translation: string; text: string }> }> => {
    const results = await Promise.all(
      data.translations.map(async (translation) => {
        try {
          const res = await fetch(
            `https://bolls.life/get-verse/${translation}/${data.book}/${data.chapter}/${data.verse}/`,
            { headers: { accept: "application/json" } },
          );
          if (!res.ok) return { translation, text: "—" };
          const json = (await res.json()) as { text?: string };
          return { translation, text: clean(json.text ?? "—") };
        } catch {
          return { translation, text: "—" };
        }
      }),
    );
    return { results };
  });
