export interface BibleBook {
  id: number;
  name: string;
  abbr: string;
  aliases: string[];
  chapters: number;
  testament: "AT" | "NT";
}

export const BIBLE_BOOKS: BibleBook[] = [
  { id: 1, name: "Gênesis", abbr: "Gn", aliases: ["genesis", "gn"], chapters: 50, testament: "AT" },
  { id: 2, name: "Êxodo", abbr: "Ex", aliases: ["exodo", "ex"], chapters: 40, testament: "AT" },
  { id: 3, name: "Levítico", abbr: "Lv", aliases: ["levitico", "lv"], chapters: 27, testament: "AT" },
  { id: 4, name: "Números", abbr: "Nm", aliases: ["numeros", "nm"], chapters: 36, testament: "AT" },
  {
    id: 5,
    name: "Deuteronômio",
    abbr: "Dt",
    aliases: ["deuteronomio", "dt"],
    chapters: 34,
    testament: "AT",
  },
  { id: 6, name: "Josué", abbr: "Js", aliases: ["josue", "js"], chapters: 24, testament: "AT" },
  { id: 7, name: "Juízes", abbr: "Jz", aliases: ["juizes", "jz"], chapters: 21, testament: "AT" },
  { id: 8, name: "Rute", abbr: "Rt", aliases: ["rute", "rt"], chapters: 4, testament: "AT" },
  { id: 9, name: "1 Samuel", abbr: "1Sm", aliases: ["1samuel", "1sm"], chapters: 31, testament: "AT" },
  { id: 10, name: "2 Samuel", abbr: "2Sm", aliases: ["2samuel", "2sm"], chapters: 24, testament: "AT" },
  { id: 11, name: "1 Reis", abbr: "1Rs", aliases: ["1reis", "1rs"], chapters: 22, testament: "AT" },
  { id: 12, name: "2 Reis", abbr: "2Rs", aliases: ["2reis", "2rs"], chapters: 25, testament: "AT" },
  {
    id: 13,
    name: "1 Crônicas",
    abbr: "1Cr",
    aliases: ["1cronicas", "1cr"],
    chapters: 29,
    testament: "AT",
  },
  {
    id: 14,
    name: "2 Crônicas",
    abbr: "2Cr",
    aliases: ["2cronicas", "2cr"],
    chapters: 36,
    testament: "AT",
  },
  { id: 15, name: "Esdras", abbr: "Ed", aliases: ["esdras", "ed"], chapters: 10, testament: "AT" },
  { id: 16, name: "Neemias", abbr: "Ne", aliases: ["neemias", "ne"], chapters: 13, testament: "AT" },
  { id: 17, name: "Ester", abbr: "Et", aliases: ["ester", "et"], chapters: 10, testament: "AT" },
  { id: 18, name: "Jó", abbr: "Jó", aliases: ["jo", "job"], chapters: 42, testament: "AT" },
  { id: 19, name: "Salmos", abbr: "Sl", aliases: ["salmos", "salmo", "sl"], chapters: 150, testament: "AT" },
  {
    id: 20,
    name: "Provérbios",
    abbr: "Pv",
    aliases: ["proverbios", "pv"],
    chapters: 31,
    testament: "AT",
  },
  {
    id: 21,
    name: "Eclesiastes",
    abbr: "Ec",
    aliases: ["eclesiastes", "ec"],
    chapters: 12,
    testament: "AT",
  },
  {
    id: 22,
    name: "Cantares",
    abbr: "Ct",
    aliases: ["cantares", "canticos", "cantico dos canticos", "ct"],
    chapters: 8,
    testament: "AT",
  },
  { id: 23, name: "Isaías", abbr: "Is", aliases: ["isaias", "is"], chapters: 66, testament: "AT" },
  { id: 24, name: "Jeremias", abbr: "Jr", aliases: ["jeremias", "jr"], chapters: 52, testament: "AT" },
  {
    id: 25,
    name: "Lamentações",
    abbr: "Lm",
    aliases: ["lamentacoes", "lm"],
    chapters: 5,
    testament: "AT",
  },
  { id: 26, name: "Ezequiel", abbr: "Ez", aliases: ["ezequiel", "ez"], chapters: 48, testament: "AT" },
  { id: 27, name: "Daniel", abbr: "Dn", aliases: ["daniel", "dn"], chapters: 12, testament: "AT" },
  { id: 28, name: "Oséias", abbr: "Os", aliases: ["oseias", "os"], chapters: 14, testament: "AT" },
  { id: 29, name: "Joel", abbr: "Jl", aliases: ["joel", "jl"], chapters: 3, testament: "AT" },
  { id: 30, name: "Amós", abbr: "Am", aliases: ["amos", "am"], chapters: 9, testament: "AT" },
  { id: 31, name: "Obadias", abbr: "Ob", aliases: ["obadias", "ob"], chapters: 1, testament: "AT" },
  { id: 32, name: "Jonas", abbr: "Jn", aliases: ["jonas", "jn"], chapters: 4, testament: "AT" },
  { id: 33, name: "Miquéias", abbr: "Mq", aliases: ["miqueias", "mq"], chapters: 7, testament: "AT" },
  { id: 34, name: "Naum", abbr: "Na", aliases: ["naum", "na"], chapters: 3, testament: "AT" },
  { id: 35, name: "Habacuque", abbr: "Hc", aliases: ["habacuque", "hc"], chapters: 3, testament: "AT" },
  { id: 36, name: "Sofonias", abbr: "Sf", aliases: ["sofonias", "sf"], chapters: 3, testament: "AT" },
  { id: 37, name: "Ageu", abbr: "Ag", aliases: ["ageu", "ag"], chapters: 2, testament: "AT" },
  { id: 38, name: "Zacarias", abbr: "Zc", aliases: ["zacarias", "zc"], chapters: 14, testament: "AT" },
  { id: 39, name: "Malaquias", abbr: "Ml", aliases: ["malaquias", "ml"], chapters: 4, testament: "AT" },
  { id: 40, name: "Mateus", abbr: "Mt", aliases: ["mateus", "mt"], chapters: 28, testament: "NT" },
  { id: 41, name: "Marcos", abbr: "Mc", aliases: ["marcos", "mc"], chapters: 16, testament: "NT" },
  { id: 42, name: "Lucas", abbr: "Lc", aliases: ["lucas", "lc"], chapters: 24, testament: "NT" },
  { id: 43, name: "João", abbr: "Jo", aliases: ["joao", "jo"], chapters: 21, testament: "NT" },
  { id: 44, name: "Atos", abbr: "At", aliases: ["atos", "at"], chapters: 28, testament: "NT" },
  { id: 45, name: "Romanos", abbr: "Rm", aliases: ["romanos", "rm"], chapters: 16, testament: "NT" },
  {
    id: 46,
    name: "1 Coríntios",
    abbr: "1Co",
    aliases: ["1corintios", "1co"],
    chapters: 16,
    testament: "NT",
  },
  {
    id: 47,
    name: "2 Coríntios",
    abbr: "2Co",
    aliases: ["2corintios", "2co"],
    chapters: 13,
    testament: "NT",
  },
  { id: 48, name: "Gálatas", abbr: "Gl", aliases: ["galatas", "gl"], chapters: 6, testament: "NT" },
  { id: 49, name: "Efésios", abbr: "Ef", aliases: ["efesios", "ef"], chapters: 6, testament: "NT" },
  {
    id: 50,
    name: "Filipenses",
    abbr: "Fp",
    aliases: ["filipenses", "fp"],
    chapters: 4,
    testament: "NT",
  },
  {
    id: 51,
    name: "Colossenses",
    abbr: "Cl",
    aliases: ["colossenses", "cl"],
    chapters: 4,
    testament: "NT",
  },
  {
    id: 52,
    name: "1 Tessalonicenses",
    abbr: "1Ts",
    aliases: ["1tessalonicenses", "1ts"],
    chapters: 5,
    testament: "NT",
  },
  {
    id: 53,
    name: "2 Tessalonicenses",
    abbr: "2Ts",
    aliases: ["2tessalonicenses", "2ts"],
    chapters: 3,
    testament: "NT",
  },
  { id: 54, name: "1 Timóteo", abbr: "1Tm", aliases: ["1timoteo", "1tm"], chapters: 6, testament: "NT" },
  { id: 55, name: "2 Timóteo", abbr: "2Tm", aliases: ["2timoteo", "2tm"], chapters: 4, testament: "NT" },
  { id: 56, name: "Tito", abbr: "Tt", aliases: ["tito", "tt"], chapters: 3, testament: "NT" },
  { id: 57, name: "Filemom", abbr: "Fm", aliases: ["filemom", "fm"], chapters: 1, testament: "NT" },
  { id: 58, name: "Hebreus", abbr: "Hb", aliases: ["hebreus", "hb"], chapters: 13, testament: "NT" },
  { id: 59, name: "Tiago", abbr: "Tg", aliases: ["tiago", "tg"], chapters: 5, testament: "NT" },
  { id: 60, name: "1 Pedro", abbr: "1Pe", aliases: ["1pedro", "1pe"], chapters: 5, testament: "NT" },
  { id: 61, name: "2 Pedro", abbr: "2Pe", aliases: ["2pedro", "2pe"], chapters: 3, testament: "NT" },
  { id: 62, name: "1 João", abbr: "1Jo", aliases: ["1joao", "1jo"], chapters: 5, testament: "NT" },
  { id: 63, name: "2 João", abbr: "2Jo", aliases: ["2joao", "2jo"], chapters: 1, testament: "NT" },
  { id: 64, name: "3 João", abbr: "3Jo", aliases: ["3joao", "3jo"], chapters: 1, testament: "NT" },
  { id: 65, name: "Judas", abbr: "Jd", aliases: ["judas", "jd"], chapters: 1, testament: "NT" },
  {
    id: 66,
    name: "Apocalipse",
    abbr: "Ap",
    aliases: ["apocalipse", "ap"],
    chapters: 22,
    testament: "NT",
  },
];

export interface BibleTranslation {
  code: string;
  label: string;
  short: string;
}

export const TRANSLATIONS: BibleTranslation[] = [
  { code: "ARA", label: "Almeida Revista e Atualizada", short: "ARA" },
  { code: "NAA", label: "Nova Almeida Atualizada", short: "NAA" },
  { code: "ARC09", label: "Almeida Revista e Corrigida", short: "ARC" },
  { code: "ACF11", label: "Almeida Corrigida Fiel", short: "ACF" },
  { code: "NVIPT", label: "Nova Versão Internacional", short: "NVI" },
  { code: "NVT", label: "Nova Versão Transformadora", short: "NVT" },
  { code: "NTLH", label: "Nova Tradução na Linguagem de Hoje", short: "NTLH" },
  { code: "KJA", label: "King James Atualizada", short: "KJA" },
  { code: "ALM21", label: "Almeida Século 21", short: "A21" },
  { code: "TB10", label: "Tradução Brasileira", short: "TB" },
];

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findBook(query: string): BibleBook | null {
  const q = normalize(query).replace(/\s+/g, "");
  if (!q) return null;
  const exact = BIBLE_BOOKS.find(
    (b) => b.aliases.some((a) => a.replace(/\s+/g, "") === q) || normalize(b.name).replace(/\s+/g, "") === q,
  );
  if (exact) return exact;
  return (
    BIBLE_BOOKS.find(
      (b) =>
        normalize(b.name).replace(/\s+/g, "").startsWith(q) ||
        b.aliases.some((a) => a.replace(/\s+/g, "").startsWith(q)),
    ) ?? null
  );
}

export interface ParsedRef {
  book: BibleBook;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
}

/** Aceita entradas como "jo 3:16", "sl 23", "1co 13:4-7", "Gênesis 1.1". */
export function parseReference(input: string): ParsedRef | null {
  const raw = input.trim();
  if (!raw) return null;
  const match = raw.match(/^([0-9]?\s*[^\d:.\-]+)\s*(\d+)?\s*[:.]?\s*(\d+)?\s*(?:[-–]\s*(\d+))?$/);
  if (!match) return null;
  const book = findBook(match[1] ?? "");
  if (!book) return null;
  const chapter = Math.min(Math.max(Number(match[2] ?? 1) || 1, 1), book.chapters);
  const verseStart = match[3] ? Number(match[3]) : null;
  const verseEnd = match[4] ? Number(match[4]) : verseStart;
  return { book, chapter, verseStart, verseEnd };
}

export function formatRef(bookId: number, chapter: number, verseStart?: number | null, verseEnd?: number | null) {
  const book = BIBLE_BOOKS.find((b) => b.id === bookId);
  const name = book?.name ?? "?";
  if (!verseStart) return `${name} ${chapter}`;
  if (verseEnd && verseEnd !== verseStart) return `${name} ${chapter}:${verseStart}-${verseEnd}`;
  return `${name} ${chapter}:${verseStart}`;
}
