// src/lib/holyrics-import.ts
// Módulo de parsing para importar músicas de diferentes formatos de arquivo
// Suporta: .txt, .json, .hlb, .hlc, .muf

export interface SongImport {
  title: string;
  artist: string;
  lyrics: string;
  tags: string[];
  song_key: string;
  bpm: number | null;
  notes: string;
}

/**
 * Ponto de entrada principal: recebe nome do arquivo e conteúdo (string),
 * retorna array de músicas parseadas.
 */
export function parseImportFile(fileName: string, content: string): SongImport[] {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  switch (ext) {
    case "json":
      return parseJSON(content, fileName);
    case "txt":
      return parsePlainText(content, fileName);
    case "hlb":
    case "hlc":
    case "muf":
      // Esses formatos podem ser JSON compactado ou texto estruturado
      return parseHolyrics(content, fileName);
    default:
      // Tenta detectar automaticamente
      return parseAuto(content, fileName);
  }
}

// ── PARSER: Texto Puro (.txt) ─────────────────────────────────────────────

function parsePlainText(content: string, fileName: string): SongImport[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Verifica se o conteúdo tem múltiplas músicas separadas por delimitadores
  // Padrões comuns: "---", "===", "###", ou linhas com apenas "="
  const multiSongSeparators = /\n\s*(?:---+|===+|###\s+.+)\s*\n/;
  if (multiSongSeparators.test(normalized)) {
    return parseMultiSongText(normalized);
  }

  // Arquivo com uma única música
  return [parseSingleSongText(normalized, fileNameToTitle(fileName))];
}

function parseMultiSongText(content: string): SongImport[] {
  // Divide por separadores e trata cada bloco como uma música
  const blocks = content.split(/\n\s*(?:---+|===+)\s*\n/).filter((b) => b.trim());
  return blocks.map((block) => {
    const lines = block.trim().split("\n");
    const title = lines[0]?.trim() || "Sem título";
    const rest = lines.slice(1).join("\n").trim();
    return parseSingleSongText(rest, title);
  });
}

function parseSingleSongText(content: string, defaultTitle: string): SongImport {
  const lines = content.trim().split("\n");
  let title = defaultTitle;
  let artist = "";
  let lyricsStart = 0;

  // Tenta detectar título e artista nas primeiras linhas
  // Padrão: "Título - Artista" ou "Título" seguido de "Artista" na próxima linha
  if (lines.length > 0) {
    const firstLine = lines[0]?.trim() || "";
    // Verifica se a primeira linha é um título (sem ser uma seção [Verso 1])
    if (firstLine && !firstLine.match(/^\[.+\]$/) && !firstLine.match(/^(Verso|Refrão|Chorus|Bridge|Ponte|Pré-Refrão|Intro)/i)) {
      if (firstLine.includes(" - ")) {
        const parts = firstLine.split(" - ");
        title = parts[0]?.trim() || defaultTitle;
        artist = parts.slice(1).join(" - ").trim();
        lyricsStart = 1;
      } else {
        title = firstLine;
        lyricsStart = 1;
        // Verifica se a segunda linha é o artista (linha curta sem ser seção)
        if (lines[1] && !lines[1].match(/^\[.+\]$/) && lines[1].trim().length < 60 && lines[1].trim().length > 0 && lines[2]?.trim() === "") {
          artist = lines[1].trim();
          lyricsStart = 3; // pula título, artista e linha em branco
        }
      }
    }
  }

  const lyrics = lines.slice(lyricsStart).join("\n").trim();

  return {
    title,
    artist,
    lyrics,
    tags: [],
    song_key: "",
    bpm: null,
    notes: "",
  };
}

// ── PARSER: JSON ──────────────────────────────────────────────────────────

function parseJSON(content: string, fileName: string): SongImport[] {
  try {
    const data = JSON.parse(content);

    // Formato: array de músicas
    if (Array.isArray(data)) {
      return data.map(jsonSongToImport).filter((s): s is SongImport => s !== null);
    }

    // Formato: objeto com propriedade "songs" ou "musicas" ou "items"
    if (data.songs && Array.isArray(data.songs)) {
      return data.songs.map(jsonSongToImport).filter((s): s is SongImport => s !== null);
    }
    if (data.musicas && Array.isArray(data.musicas)) {
      return data.musicas.map(jsonSongToImport).filter((s): s is SongImport => s !== null);
    }
    if (data.items && Array.isArray(data.items)) {
      return data.items.map(jsonSongToImport).filter((s): s is SongImport => s !== null);
    }

    // Formato Holyrics: objeto com "data" contendo array
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(jsonSongToImport).filter((s): s is SongImport => s !== null);
    }

    // Formato: objeto único (uma música)
    const single = jsonSongToImport(data);
    if (single) return [single];

    return [];
  } catch {
    // Se não é JSON válido, tenta como texto
    return parsePlainText(content, fileName);
  }
}

function jsonSongToImport(obj: any): SongImport | null {
  if (!obj || typeof obj !== "object") return null;

  // Tenta extrair título de vários campos possíveis
  const title =
    obj.title || obj.titulo || obj.name || obj.nome || obj.song_title || obj.songTitle || "";
  // Tenta extrair letra de vários campos possíveis
  const lyrics =
    obj.lyrics || obj.letra || obj.text || obj.texto || obj.content || obj.body || obj.corpo || "";

  if (!title && !lyrics) return null;

  return {
    title: String(title).trim() || "Sem título",
    artist: String(obj.artist || obj.artista || obj.author || obj.autor || "").trim(),
    lyrics: String(lyrics).trim(),
    tags: Array.isArray(obj.tags) ? obj.tags.map(String) : [],
    song_key: String(obj.song_key || obj.key || obj.tom || obj.tonalidade || "").trim(),
    bpm: obj.bpm ? Number(obj.bpm) : null,
    notes: String(obj.notes || obj.notas || obj.observacoes || "").trim(),
  };
}

// ── PARSER: Holyrics (.hlb, .hlc, .muf) ──────────────────────────────────

function parseHolyrics(content: string, fileName: string): SongImport[] {
  // Tenta primeiro como JSON (muitos backups do Holyrics são JSON)
  try {
    const data = JSON.parse(content);
    return parseJSON(content, fileName);
  } catch {
    // Não é JSON, continua...
  }

  // Tenta detectar se é um formato de texto estruturado do Holyrics
  // Formato comum: TITLE=... / AUTHOR=... / LYRICS=... separados por quebra de linha
  if (content.includes("TITLE=") || content.includes("title=")) {
    return parseHolyricsKeyValue(content);
  }

  // Tenta detectar múltiplas músicas separadas por delimitadores do Holyrics
  // Formato: {TITLE} ... {/TITLE} ou tags XML-like
  if (content.includes("<title>") || content.includes("<lyrics>") || content.includes("<song>")) {
    return parseHolyricsXml(content);
  }

  // Fallback: trata como texto simples
  return parsePlainText(content, fileName);
}

function parseHolyricsKeyValue(content: string): SongImport[] {
  const songs: SongImport[] = [];
  // Divide por separadores de músicas
  const blocks = content.split(/\n\s*---+\s*\n|\n\s*===+\s*\n/).filter((b) => b.trim());

  for (const block of blocks) {
    const props: Record<string, string> = {};
    let lyricsLines: string[] = [];
    let inLyrics = false;

    for (const line of block.split("\n")) {
      const match = line.match(/^(\w+)\s*=\s*(.*)$/);
      if (match && !inLyrics) {
        const key = match[1]!.toLowerCase();
        props[key] = match[2]!.trim();
        if (key === "lyrics" || key === "letra") {
          inLyrics = true;
          if (props[key]) lyricsLines.push(props[key]!);
        }
      } else if (inLyrics) {
        lyricsLines.push(line);
      }
    }

    if (props.title || props.titulo || lyricsLines.length > 0) {
      songs.push({
        title: props.title || props.titulo || "Sem título",
        artist: props.artist || props.artista || props.author || props.autor || "",
        lyrics: lyricsLines.join("\n").trim() || props.lyrics || props.letra || "",
        tags: [],
        song_key: props.key || props.tom || "",
        bpm: props.bpm ? Number(props.bpm) : null,
        notes: props.notes || props.notas || "",
      });
    }
  }

  return songs;
}

function parseHolyricsXml(content: string): SongImport[] {
  const songs: SongImport[] = [];
  // Parser simples para XML-like tags
  const songBlocks = content.match(/<song[^>]*>[\s\S]*?<\/song>/gi);
  if (!songBlocks) {
    // Tenta sem tag <song>
    const title = extractXmlTag(content, "title");
    const lyrics = extractXmlTag(content, "lyrics") || extractXmlTag(content, "text");
    if (title || lyrics) {
      songs.push({
        title: title || "Sem título",
        artist: extractXmlTag(content, "artist") || extractXmlTag(content, "author") || "",
        lyrics: lyrics || "",
        tags: [],
        song_key: extractXmlTag(content, "key") || "",
        bpm: null,
        notes: "",
      });
    }
    return songs;
  }

  for (const block of songBlocks) {
    const title = extractXmlTag(block, "title");
    const lyrics = extractXmlTag(block, "lyrics") || extractXmlTag(block, "text");
    if (title || lyrics) {
      songs.push({
        title: title || "Sem título",
        artist: extractXmlTag(block, "artist") || extractXmlTag(block, "author") || "",
        lyrics: lyrics || "",
        tags: [],
        song_key: extractXmlTag(block, "key") || "",
        bpm: null,
        notes: "",
      });
    }
  }

  return songs;
}

function extractXmlTag(content: string, tag: string): string {
  const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

// ── PARSER: Auto-detect ───────────────────────────────────────────────────

function parseAuto(content: string, fileName: string): SongImport[] {
  const trimmed = content.trim();
  // JSON?
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return parseJSON(trimmed, fileName);
    } catch {
      // Não é JSON
    }
  }
  // XML?
  if (trimmed.startsWith("<")) {
    return parseHolyricsXml(trimmed);
  }
  // Key=Value?
  if (/^(TITLE|title|LYRICS|lyrics)\s*=/m.test(trimmed)) {
    return parseHolyricsKeyValue(trimmed);
  }
  // Texto puro
  return parsePlainText(trimmed, fileName);
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, "") // remove extensão
    .replace(/[_-]/g, " ") // substitui underscores/hífens por espaços
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lê o conteúdo de um File como string (UTF-8).
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsText(file, "utf-8");
  });
}

/** Extensões aceitas para importação */
export const ACCEPTED_EXTENSIONS = [".txt", ".json", ".hlb", ".hlc", ".muf"];
export const ACCEPTED_MIME_TYPES = ["text/plain", "application/json"];
