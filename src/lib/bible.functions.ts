// src/lib/bible.functions.ts
// Versão Client-only: faz chamadas diretas à API bolls.life, sem useServerFn/createServerFn.

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

export async function getChapter(input: {
  data: { translation: string; book: number; chapter: number };
}): Promise<{ verses: BibleVerse[]; error?: string }> {
  const { translation, book, chapter } = input.data;
  try {
    const res = await fetch(
      `https://bolls.life/get-chapter/${translation}/${book}/${chapter}/`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return { verses: [], error: "Não foi possível carregar o capítulo." };
    const json = (await res.json()) as Array<{ verse: number; text: string }>;
    return { verses: json.map((v) => ({ verse: v.verse, text: clean(v.text) })) };
  } catch {
    return { verses: [], error: "Serviço bíblico indisponível." };
  }
}

export async function searchVerses(input: {
  data: { translation: string; query: string; book?: number | null };
}): Promise<{ hits: SearchHit[]; error?: string }> {
  const { translation, query, book } = input.data;
  if (query.trim().length < 3) return { hits: [] };
  try {
    const params = new URLSearchParams({ search: query.trim(), limit: "60" });
    if (book) params.set("book", String(book));
    const res = await fetch(`https://bolls.life/find/${translation}/?${params.toString()}`, {
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
}

export async function compareVerse(input: {
  data: { translations: string[]; book: number; chapter: number; verse: number };
}): Promise<{ results: Array<{ translation: string; text: string }> }> {
  const { translations, book, chapter, verse } = input.data;
  const results = await Promise.all(
    translations.map(async (translation) => {
      try {
        const res = await fetch(
          `https://bolls.life/get-verse/${translation}/${book}/${chapter}/${verse}/`,
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
}
