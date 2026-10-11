export type SlideKind = "lyrics" | "bible" | "text" | "media";

export interface ProjectionSlide {
  id: string;
  kind: SlideKind;
  label?: string;
  title?: string;
  lines: string[];
  footer?: string;
  /** mídia projetada em tela cheia (kind === "media") */
  mediaUrl?: string;
  mediaKind?: "image" | "video";
  mediaFit?: "cover" | "contain";
  /** chave normalizada da seção (verso/refrão) a que este slide pertence */
  sectionKey?: string;
  /** tom específico desta seção, quando definido no editor da música */
  songKey?: string;
  /** ajustes de tema aplicados apenas a este slide/seção */
  themeOverride?: Partial<ThemeConfig>;
}

export interface DeckMeta {
  title: string;
  songKey?: string;
  bpm?: number | null;
  notes?: string;
  durationMin?: number | null;
}

export type BackgroundKind = "none" | "image" | "video" | "loop";
export type LoopKind =
  | "none"
  | "gradient"
  | "particles"
  | "waves"
  | "pulse"
  | "aurora"
  | "blobs"
  | "bokeh"
  | "rays"
  | "grid";

export const LOOP_KIND_OPTIONS: { value: LoopKind; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "gradient", label: "Gradiente" },
  { value: "particles", label: "Partículas" },
  { value: "waves", label: "Ondas" },
  { value: "pulse", label: "Pulsação" },
  { value: "aurora", label: "Aurora" },
  { value: "blobs", label: "Bolhas líquidas" },
  { value: "bokeh", label: "Bokeh" },
  { value: "rays", label: "Raios de luz" },
  { value: "grid", label: "Grade" },
];
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiplicação" },
  { value: "screen", label: "Divisão / Screen" },
  { value: "overlay", label: "Sobreposição / Overlay" },
  { value: "soft-light", label: "Luz Suave" },
  { value: "hard-light", label: "Luz Direta" },
  { value: "darken", label: "Escurecer" },
  { value: "lighten", label: "Clarear" },
  { value: "color-dodge", label: "Subexposição de Cores" },
  { value: "color-burn", label: "Superexposição de Cores" },
  { value: "difference", label: "Diferença" },
  { value: "exclusion", label: "Exclusão" },
];

export type LayerKind = "lyrics" | "color" | "image" | "video" | "loop" | "text" | "camera" | "browser";

export interface ProjectionLayer {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked?: boolean;
  opacity: number; // 0-100
  blend: BlendMode;
  url?: string;
  color?: string;
  fit?: "cover" | "contain" | "fill";
  blur?: number;
  // Loop properties
  loopKind?: LoopKind;
  loopColors?: string[];
  loopSpeed?: number;
  // Video properties
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoSpeed?: number;
  // Text layer properties (watermarks, live subtitle, announcements, logo overlays)
  text?: string;
  textColor?: string;
  textBgColor?: string;
  fontSize?: number; // cqw percentage
  fontBold?: boolean;
  textAlign?: "left" | "center" | "right";
  position?: "top" | "center" | "bottom";
  textPadding?: number;
  // Camera layer
  cameraDeviceId?: string; // "" = default
  cameraMirrored?: boolean;
  // Browser source layer (like OBS Browser Source)
  browserUrl?: string;
  browserWidth?: number;
  browserHeight?: number;
  browserInteractive?: boolean;
}

export const DEFAULT_LYRICS_LAYER: ProjectionLayer = {
  id: "layer-lyrics-main",
  name: "Letra da Música / Conteúdo",
  kind: "lyrics",
  visible: true,
  locked: false,
  opacity: 100,
  blend: "normal",
};

export function createLayer(patch: Partial<ProjectionLayer> = {}): ProjectionLayer {
  return {
    id: `layer-${Math.random().toString(36).slice(2, 9)}`,
    name: "Camada",
    kind: "color",
    visible: true,
    locked: false,
    opacity: 100,
    blend: "normal",
    color: "#1e40af",
    fit: "cover",
    blur: 0,
    loopKind: "gradient",
    loopColors: ["#1e3a8a", "#7c2d12"],
    loopSpeed: 1,
    videoLoop: true,
    videoMuted: true,
    videoSpeed: 1,
    text: "",
    textColor: "#ffffff",
    fontSize: 3,
    fontBold: true,
    textAlign: "center",
    position: "bottom",
    ...patch,
  };
}

export function syncLyricsLayerTitle(layers: ProjectionLayer[] | undefined, title: string): ProjectionLayer[] {
  const currentLayers = layers && layers.length ? [...layers] : [{ ...DEFAULT_LYRICS_LAYER }];
  const formattedTitle = title ? (title.startsWith("Música:") || title.startsWith("Bíblia:") || title.startsWith("Aviso:") || title.startsWith("Mídia:") ? title : `Música: ${title}`) : "Letra da Música / Conteúdo";
  const lyricsIndex = currentLayers.findIndex((l) => l.kind === "lyrics");
  if (lyricsIndex >= 0) {
    const target = currentLayers[lyricsIndex];
    if (target) {
      currentLayers[lyricsIndex] = { ...target, name: formattedTitle };
    }
    return currentLayers;
  }
  // Se não existir, insere no topo
  return [...currentLayers, { ...DEFAULT_LYRICS_LAYER, name: formattedTitle }];
}

export function createLayerFromMedia(media: { name: string; url: string; kind: "image" | "video" }): ProjectionLayer {
  return createLayer({
    name: media.name || (media.kind === "video" ? "Vídeo" : "Imagem"),
    kind: media.kind,
    url: media.url,
    opacity: 100,
    blend: "normal",
    fit: "cover",
    videoLoop: true,
    videoMuted: true,
  });
}

export function createLayerFromLoop(loop: { name?: string; kind: LoopKind; colors: string[]; speed?: number }): ProjectionLayer {
  return createLayer({
    name: loop.name || `Loop ${loop.kind}`,
    kind: "loop",
    loopKind: loop.kind,
    loopColors: loop.colors,
    loopSpeed: loop.speed ?? 1,
    opacity: 100,
    blend: "normal",
  });
}

export interface ThemeConfig {
  /** camadas empilhadas entre o fundo e o texto (índice 0 = mais ao fundo) */
  layers?: ProjectionLayer[];
  bgKind: BackgroundKind;
  bgUrl: string;
  bgFit: "cover" | "contain";
  bgLoop: boolean;
  bgMuted: boolean;
  bgSpeed: number;
  bgBlur: number;
  loopKind: LoopKind;
  loopColors: string[];
  loopSpeed: number;
  loopOverlay: number;
  loopBlend: BlendMode;
  bg: string;
  fg: string;
  accentFg: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center";
  vAlign: "center" | "bottom";
  uppercase: boolean;
  bold: boolean;
  shadow: boolean;
  overlay: number;
  showFooter: boolean;
  showTitle: boolean;
  padding: number;
  transition: "fade" | "slide" | "none";
}

export const DEFAULT_THEME: ThemeConfig = {
  layers: [DEFAULT_LYRICS_LAYER],
  bgKind: "none",
  bgUrl: "",
  bgFit: "cover",
  bgLoop: true,
  bgMuted: true,
  bgSpeed: 1,
  bgBlur: 0,
  loopKind: "none",
  loopColors: ["#1e3a8a", "#7c2d12"],
  loopSpeed: 1,
  loopOverlay: 30,
  loopBlend: "normal",
  bg: "#07090f",
  fg: "#ffffff",
  accentFg: "#f6c46a",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 5.4,
  lineHeight: 1.25,
  letterSpacing: 0,
  align: "center",
  vAlign: "center",
  uppercase: false,
  bold: true,
  shadow: true,
  overlay: 40,
  showFooter: true,
  showTitle: false,
  padding: 6,
  transition: "fade",
};

export const LOOP_PRESETS: { name: string; config: Partial<ThemeConfig> }[] = [
  {
    name: "Worship Blue",
    config: {
      bgKind: "loop",
      loopKind: "gradient",
      loopColors: ["#0f172a", "#1e40af", "#1e3a8a"],
      loopSpeed: 0.8,
      loopOverlay: 35,
      loopBlend: "normal",
      bg: "#0f172a",
    },
  },
  {
    name: "Pôr do Sol",
    config: {
      bgKind: "loop",
      loopKind: "gradient",
      loopColors: ["#431407", "#c2410c", "#f59e0b"],
      loopSpeed: 1.2,
      loopOverlay: 25,
      loopBlend: "normal",
      bg: "#2a0f06",
    },
  },
  {
    name: "Galáxia",
    config: {
      bgKind: "loop",
      loopKind: "particles",
      loopColors: ["#ffffff", "#a5b4fc"],
      loopSpeed: 0.6,
      loopOverlay: 45,
      loopBlend: "screen",
      bg: "#020617",
    },
  },
  {
    name: "Ondas",
    config: {
      bgKind: "loop",
      loopKind: "waves",
      loopColors: ["#0c4a6e", "#075985", "#38bdf8"],
      loopSpeed: 1,
      loopOverlay: 30,
      loopBlend: "overlay",
      bg: "#082f49",
    },
  },
  {
    name: "Pulsação",
    config: {
      bgKind: "loop",
      loopKind: "pulse",
      loopColors: ["#3f2e18", "#78350f"],
      loopSpeed: 1,
      loopOverlay: 40,
      loopBlend: "normal",
      bg: "#1a120b",
    },
  },
];

export const FONT_OPTIONS = [
  { value: "'DM Sans', system-ui, sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
  { value: "Impact, 'Arial Black', sans-serif", label: "Impact" },
];

export interface StageState {
  message: string;
  showMessage: boolean;
  blink: boolean;
  showNotes: boolean;
  showTimers: boolean;
  /** relógio no topo do retorno de palco */
  showClock: boolean;
  /** timer de duração do culto */
  showService: boolean;
  /** texto grande tipo letra de música exibido no palco */
  bigText: string;
  showBigText: boolean;
}

/** Widget posicionável no layout do palco (editor visual) */
export interface StageWidget {
  id: string;
  kind: "clock" | "service" | "timer" | "message" | "slide" | "nextSection" | "bigText" | "notes";
  label?: string;
  /** posição em % da tela (0-100) */
  x: number;
  y: number;
  /** tamanho em % da tela (0-100) */
  w: number;
  h: number;
  /** multiplicador de tamanho do texto (1 = padrão) */
  scale?: number;
  timerId?: string; // para kind === "timer", qual timer exibir
}

/** timer nomeado, criado livremente pelo operador (ex: "Pregação") */
export interface NamedTimer {
  id: string;
  name: string;
  durationMin: number | null;
  startedAt: number | null;
  pausedAt: number | null;
}

export function createNamedTimer(name = "Novo timer", durationMin: number | null = 10): NamedTimer {
  return {
    id: `timer-${Math.random().toString(36).slice(2, 9)}`,
    name,
    durationMin,
    startedAt: null,
    pausedAt: null,
  };
}

export interface TimerState {
  serviceStartedAt: number | null;
  servicePausedAt: number | null;
  items: NamedTimer[];
}

export interface LiveState {
  slide: ProjectionSlide | null;
  next: ProjectionSlide | null;
  /** primeiro slide da próxima seção (próximo verso) — usado no retorno de palco */
  nextSection: ProjectionSlide | null;
  blackout: boolean;
  freeze: boolean;
  showLogo: boolean;
  logoText: string;
  theme: ThemeConfig;
  stage: StageState;
  timers: TimerState;
  songKey: string;
  bpm: number | null;
  notes: string;
  updatedAt: number;
  /** layout customizado do palco (editor visual) — undefined = layout padrão */
  stageLayout?: StageWidget[];
}

export const LIVE_STORAGE_KEY = "spresenter:live-state";
const CHANNEL = "spresenter:live";

export const INITIAL_LIVE_STATE: LiveState = {
  slide: null,
  next: null,
  nextSection: null,
  blackout: false,
  freeze: false,
  showLogo: false,
  logoText: "",
  theme: DEFAULT_THEME,
  stage: {
    message: "",
    showMessage: false,
    blink: false,
    showNotes: true,
    showTimers: true,
    showClock: true,
    showService: true,
    bigText: "",
    showBigText: false,
  },
  timers: {
    serviceStartedAt: null,
    servicePausedAt: null,
    items: [],
  },
  songKey: "",
  bpm: null,
  notes: "",
  updatedAt: 0,
};

export function readLiveState(): LiveState {
  if (typeof window === "undefined") return INITIAL_LIVE_STATE;
  try {
    const raw = window.localStorage.getItem(LIVE_STORAGE_KEY);
    if (!raw) return INITIAL_LIVE_STATE;
    const parsed = JSON.parse(raw) as Partial<LiveState>;
    return {
      ...INITIAL_LIVE_STATE,
      ...parsed,
      theme: { ...DEFAULT_THEME, ...(parsed.theme ?? {}) },
      stage: { ...INITIAL_LIVE_STATE.stage, ...(parsed.stage ?? {}) },
      timers: {
        ...INITIAL_LIVE_STATE.timers,
        ...(parsed.timers ?? {}),
        items: parsed.timers?.items ?? [],
      },
    };
  } catch {
    return INITIAL_LIVE_STATE;
  }
}

export function publishLiveState(state: LiveState) {
  if (typeof window === "undefined") return;
  const payload: LiveState = { ...state, updatedAt: Date.now() };
  try {
    window.localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage cheio ou bloqueado — o canal ainda entrega */
  }
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(payload);
    channel.close();
  }
}

export function subscribeLiveState(handler: (state: LiveState) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let channel: BroadcastChannel | null = null;
  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => handler(event.data as LiveState);
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === LIVE_STORAGE_KEY) handler(readLiveState());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
