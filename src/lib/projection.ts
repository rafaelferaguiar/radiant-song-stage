export type SlideKind = "lyrics" | "bible" | "text";

export interface ProjectionSlide {
  id: string;
  kind: SlideKind;
  label?: string;
  title?: string;
  lines: string[];
  footer?: string;
}

export type BackgroundKind = "none" | "image" | "video";

export interface ThemeConfig {
  bgKind: BackgroundKind;
  bgUrl: string;
  bgFit: "cover" | "contain";
  bgLoop: boolean;
  bgMuted: boolean;
  bgSpeed: number;
  bgBlur: number;
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

export const FONT_OPTIONS = [
  { value: "'DM Sans', system-ui, sans-serif", label: "DM Sans" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
  { value: "Impact, 'Arial Black', sans-serif", label: "Impact" },
];

export interface LiveState {
  slide: ProjectionSlide | null;
  blackout: boolean;
  freeze: boolean;
  showLogo: boolean;
  logoText: string;
  theme: ThemeConfig;
  updatedAt: number;
}

export const LIVE_STORAGE_KEY = "spresenter:live-state";
const CHANNEL = "spresenter:live";

export const INITIAL_LIVE_STATE: LiveState = {
  slide: null,
  blackout: false,
  freeze: false,
  showLogo: false,
  logoText: "",
  theme: DEFAULT_THEME,
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
