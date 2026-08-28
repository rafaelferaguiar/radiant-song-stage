export type SlideKind = "lyrics" | "bible" | "text";

export interface ProjectionSlide {
  id: string;
  kind: SlideKind;
  label?: string;
  title?: string;
  lines: string[];
  footer?: string;
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
export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

export interface ThemeConfig {
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
}

export interface TimerState {
  serviceStartedAt: number | null;
  servicePausedAt: number | null;
  itemStartedAt: number | null;
  itemDurationMin: number | null;
  itemPausedAt: number | null;
}

export interface LiveState {
  slide: ProjectionSlide | null;
  next: ProjectionSlide | null;
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
}

export const LIVE_STORAGE_KEY = "spresenter:live-state";
const CHANNEL = "spresenter:live";

export const INITIAL_LIVE_STATE: LiveState = {
  slide: null,
  next: null,
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
  },
  timers: {
    serviceStartedAt: null,
    servicePausedAt: null,
    itemStartedAt: null,
    itemDurationMin: null,
    itemPausedAt: null,
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
      timers: { ...INITIAL_LIVE_STATE.timers, ...(parsed.timers ?? {}) },
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
