// src/lib/lyrics-search.ts
// Módulo de busca de letras de músicas:
// - Suporta busca por título, artista ou FRASES DA LETRA (ex: "Deus enviou seu filho amado", "porque ele vive posso crer")
// - Integração híbrida:
//   1. Letras Solr (indexa o texto completo de letras e trechos)
//   2. LRCLIB API (metadados e letras sincronizadas)

export interface LyricsResult {
  id: string | number;
  title: string;
  artist: string;
  album?: string;
  duration: number; // segundos
  lyrics: string; // letra completa (pode vir pré-carregada ou ser carregada ao selecionar)
  syncedLyrics?: string | null;
  snippet?: string; // trecho da música encontrado na pesquisa por frase
  dns?: string; // slug do artista no Letras
  urlSlug?: string; // slug da música no Letras
  source: "letras" | "lrclib";
}

const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT = "RFPresenter/1.0 (https://rfpresenter.com)";

/**
 * Remove tags HTML e decodifica entidades básicas
 */
function cleanHtmlText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/?[^>]+(>|$)/gi, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Busca trecho da letra ou música no Solr do Letras
 */
async function searchLetras(query: string): Promise<LyricsResult[]> {
  try {
    const url = `https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(query)}&wt=json`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const raw = await response.text();
    // O retorno pode vir como LetrasSug({...}) ou puro JSON
    const jsonMatch = raw.match(/^[a-zA-Z0-9_]+\(([\s\S]*)\)\s*;?$/);
    const cleanedJson = jsonMatch ? jsonMatch[1] : raw;
    const data = JSON.parse(cleanedJson);

    const docs = data?.response?.docs || [];
    const highlighting = data?.highlighting || {};

    // Filtrar apenas músicas (t === "2" ou com dns e url válidos)
    return docs
      .filter((d: any) => (d.t === "2" || !d.t) && d.dns && d.url && d.txt)
      .slice(0, 15)
      .map((d: any) => {
        let snippet = "";
        if (highlighting[d.id]?.letra?.[0]) {
          snippet = cleanHtmlText(highlighting[d.id].letra[0]);
        }

        return {
          id: `letras-${d.id || d.url}`,
          title: d.txt,
          artist: d.art || "",
          album: d.g || "",
          duration: 0,
          lyrics: "", // carregada sob demanda
          syncedLyrics: null,
          snippet: snippet || undefined,
          dns: d.dns,
          urlSlug: d.url,
          source: "letras" as const,
        };
      });
  } catch (err) {
    console.warn("Erro ao buscar no Letras Solr:", err);
    return [];
  }
}

/**
 * Busca por título / artista na API LRCLIB
 */
async function searchLrclib(query: string): Promise<LyricsResult[]> {
  try {
    const url = `${LRCLIB_BASE}/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) return [];

    const data: any[] = await response.json();
    return data
      .filter((item) => item.plainLyrics && item.plainLyrics.trim())
      .slice(0, 15)
      .map((item) => ({
        id: `lrclib-${item.id}`,
        title: item.trackName || item.name || "",
        artist: item.artistName || "",
        album: item.albumName || "",
        duration: item.duration || 0,
        lyrics: item.plainLyrics || "",
        syncedLyrics: item.syncedLyrics || null,
        source: "lrclib" as const,
      }));
  } catch (err) {
    console.warn("Erro ao buscar no LRCLIB:", err);
    return [];
  }
}

/**
 * Busca músicas pelo nome, artista ou frases cantadas na letra.
 * Combina resultados do Letras (trechos) e LRCLIB.
 */
export async function searchLyrics(query: string): Promise<LyricsResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Executa ambas as buscas em paralelo
  const [letrasRes, lrclibRes] = await Promise.allSettled([
    searchLetras(q),
    searchLrclib(q),
  ]);

  const letrasItems = letrasRes.status === "fulfilled" ? letrasRes.value : [];
  const lrclibItems = lrclibRes.status === "fulfilled" ? lrclibRes.value : [];

  // Mesclar e priorizar:
  // 1. Itens que possuem trecho correspondente (snippet) vêm primeiro
  // 2. De-duplicação por título + artista normalizados
  const seen = new Set<string>();
  const merged: LyricsResult[] = [];

  // Se houver resultados com snippet de frase, coloque-os no topo
  const withSnippet = letrasItems.filter((item) => !!item.snippet);
  for (const item of withSnippet) {
    const key = `${normalizeStr(item.title)}::${normalizeStr(item.artist)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Depois adicione os resultados do LRCLIB (já têm a letra pronta)
  for (const item of lrclibItems) {
    const key = `${normalizeStr(item.title)}::${normalizeStr(item.artist)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Por fim, adicione os demais itens do Letras
  for (const item of letrasItems) {
    const key = `${normalizeStr(item.title)}::${normalizeStr(item.artist)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged.slice(0, 25);
}

/**
 * Normaliza string para comparação
 */
function normalizeStr(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Carrega a letra completa de um resultado (caso ainda não esteja carregada)
 */
export async function loadFullLyrics(result: LyricsResult): Promise<string> {
  if (result.lyrics && result.lyrics.trim().length > 10) {
    return result.lyrics;
  }

  // 1. Se tem slug do Letras, tentar extrair a letra da página oficial
  if (result.dns && result.urlSlug) {
    const pageUrl = `https://www.letras.mus.br/${result.dns}/${result.urlSlug}/`;
    try {
      let html = "";
      const electronApi =
        typeof window !== "undefined" ? (window as any).electronAPI : null;

      if (electronApi?.fetchText) {
        html = await electronApi.fetchText(pageUrl);
      } else {
        const res = await fetch(pageUrl);
        if (res.ok) html = await res.text();
      }

      if (html) {
        // Tenta encontrar <div class="lyric-original">
        const matchOriginal = html.match(
          /<div class="lyric-original">([\s\S]*?)<\/div>/i,
        );
        if (matchOriginal && matchOriginal[1]) {
          const clean = cleanHtmlText(matchOriginal[1]);
          if (clean.length > 20) {
            result.lyrics = clean;
            return clean;
          }
        }

        // Fallback: qualquer div com classe lyric
        const matchDivs = [
          ...html.matchAll(/<div class="[^"]*lyric[^"]*">([\s\S]*?)<\/div>/gi),
        ];
        for (const m of matchDivs) {
          if (m[1].includes("<p>")) {
            const clean = cleanHtmlText(m[1]);
            if (clean.length > 20) {
              result.lyrics = clean;
              return clean;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar letra no Letras:", err);
    }
  }

  // 2. Fallback para busca no LRCLIB com artista + título
  try {
    const searchTerms = `${result.artist} ${result.title}`.trim();
    const lrcUrl = `${LRCLIB_BASE}/search?q=${encodeURIComponent(searchTerms)}`;
    const lrcRes = await fetch(lrcUrl, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (lrcRes.ok) {
      const data = await lrcRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const best = data.find((d) => d.plainLyrics && d.plainLyrics.trim());
        if (best) {
          result.lyrics = best.plainLyrics;
          result.syncedLyrics = best.syncedLyrics || null;
          return best.plainLyrics;
        }
      }
    }
  } catch (err) {
    console.warn("Erro no fallback do LRCLIB:", err);
  }

  return "";
}

/**
 * Formata a duração em segundos para mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
