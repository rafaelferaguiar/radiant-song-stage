import type { ProjectionSlide, ThemeConfig } from "./projection";

export interface LyricSection {
  label: string;
  lines: string[];
}

const LABEL_RE = /^\s*(?:\[(.+?)\]|([A-Za-zÀ-ÿ0-9º°ª ]{2,24}):)\s*$/;

/** Divide a letra em seções rotuladas ("[Verso 1]", "Refrão:" ou blocos vazios). */
export function parseSections(lyrics: string): LyricSection[] {
  const sections: LyricSection[] = [];
  let current: LyricSection | null = null;
  let autoIndex = 1;

  const pushCurrent = () => {
    if (current && current.lines.length) sections.push(current);
    current = null;
  };

  for (const rawLine of lyrics.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trimEnd();
    const labelMatch = line.match(LABEL_RE);
    if (labelMatch) {
      pushCurrent();
      current = { label: (labelMatch[1] ?? labelMatch[2] ?? "").trim(), lines: [] };
      continue;
    }
    if (!line.trim()) {
      pushCurrent();
      continue;
    }
    if (!current) current = { label: `Parte ${autoIndex++}`, lines: [] };
    current.lines.push(line.trim());
  }
  pushCurrent();
  return sections;
}

export function sectionKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "");
}

/** Aplica o arranjo (ordem de seções) sobre as seções da letra. */
export function applyArrangement(sections: LyricSection[], arrangement: string[]): LyricSection[] {
  if (!arrangement.length) return sections;
  const out: LyricSection[] = [];
  for (const entry of arrangement) {
    const found = sections.find((s) => sectionKey(s.label) === sectionKey(entry));
    if (found) out.push(found);
  }
  return out.length ? out : sections;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += Math.max(1, size)) out.push(items.slice(i, i + Math.max(1, size)));
  return out;
}

export interface SectionConfig {
  /** tom específico desta seção */
  songKey?: string;
  /** linhas por slide apenas nesta seção */
  linesPerSlide?: number | null;
  /** id do tema salvo usado como base desta seção (apenas informativo na UI) */
  themeId?: string | null;
  /** ajustes de tema desta seção */
  theme?: Partial<ThemeConfig>;
}

export type SectionConfigMap = Record<string, SectionConfig>;

export interface SongLike {
  id?: string;
  title: string;
  artist?: string;
  song_key?: string;
  lyrics: string;
  arrangement?: string[];
  sections?: SectionConfigMap;
}

export function buildSongSlides(song: SongLike, linesPerSlide = 4): ProjectionSlide[] {
  const sections = applyArrangement(parseSections(song.lyrics), song.arrangement ?? []);
  const configs = song.sections ?? {};
  const slides: ProjectionSlide[] = [];
  sections.forEach((section, si) => {
    const key = sectionKey(section.label);
    const config = configs[key] ?? {};
    const perSlide =
      config.linesPerSlide && config.linesPerSlide > 0 ? config.linesPerSlide : linesPerSlide;
    const override =
      config.theme && Object.keys(config.theme).length
        ? config.theme
        : undefined;
    chunk(section.lines, perSlide).forEach((lines, ci) => {
      slides.push({
        id: `${song.id ?? "song"}-${si}-${ci}`,
        kind: "lyrics",
        label: section.label,
        title: song.title,
        lines,
        footer: [song.title, song.artist].filter(Boolean).join(" • "),
        sectionKey: key,
        songKey: config.songKey || song.song_key || undefined,
        ...(override ? { themeOverride: override } : {}),
      });
    });
  });
  return slides;
}

export interface VerseLike {
  verse: number;
  text: string;
}

export function buildBibleSlides(
  reference: string,
  translationLabel: string,
  verses: VerseLike[],
  versesPerSlide = 1,
): ProjectionSlide[] {
  return chunk(verses, versesPerSlide).map((group, index) => ({
    id: `bible-${reference}-${index}`,
    kind: "bible" as const,
    label:
      group.length > 1
        ? `v. ${group[0]?.verse}-${group[group.length - 1]?.verse}`
        : `v. ${group[0]?.verse}`,
    title: reference,
    lines: group.map((v) => v.text),
    footer: `${reference}${group.length === 1 ? `:${group[0]?.verse}` : ""} • ${translationLabel}`,
  }));
}

export function buildTextSlides(title: string, body: string, linesPerSlide = 4): ProjectionSlide[] {
  const blocks = body
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").map((l) => l.trim()).filter(Boolean))
    .filter((b) => b.length);
  const source = blocks.length ? blocks : [[body.trim() || title]];
  const slides: ProjectionSlide[] = [];
  source.forEach((block, bi) => {
    chunk(block, linesPerSlide).forEach((lines, ci) => {
      slides.push({
        id: `text-${bi}-${ci}`,
        kind: "text",
        label: `Bloco ${bi + 1}`,
        title,
        lines,
        footer: title,
      });
    });
  });
  return slides;
}
