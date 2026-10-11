import type { DeckMeta, ProjectionSlide } from "./projection";

export type MediaKind = "image" | "video";
export type MediaCategory = "all" | "background" | "announcement" | "general" | "presets";

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  kind: MediaKind;
  category?: "background" | "announcement" | "general";
  createdAt: number;
  size?: number;
  isPreset?: boolean;
}

export const MEDIA_STORAGE_KEY = "spresenter:media-library";

export const PRESET_MEDIA: MediaItem[] = [
  {
    id: "preset-worship-1",
    name: "Céu Estrelado & Nebulosa",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000000000,
    isPreset: true,
  },
  {
    id: "preset-worship-2",
    name: "Luz Suave da Manhã",
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000001000,
    isPreset: true,
  },
  {
    id: "preset-worship-3",
    name: "Montanhas ao Pôr do Sol",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000002000,
    isPreset: true,
  },
  {
    id: "preset-worship-4",
    name: "Ondas do Mar em Luz Dourada",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000003000,
    isPreset: true,
  },
  {
    id: "preset-worship-5",
    name: "Partículas & Bokeh Worship",
    url: "https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000004000,
    isPreset: true,
  },
  {
    id: "preset-worship-6",
    name: "Abstrato Gradiente Noturno",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80",
    kind: "image",
    category: "background",
    createdAt: 1700000005000,
    isPreset: true,
  },
];

export function getStoredMedia(): MediaItem[] {
  if (typeof window === "undefined") return PRESET_MEDIA;
  try {
    const raw = window.localStorage.getItem(MEDIA_STORAGE_KEY);
    if (!raw) {
      return PRESET_MEDIA;
    }
    const parsed = JSON.parse(raw) as MediaItem[];
    const userItems = parsed.filter((item) => !item.isPreset);
    return [...userItems, ...PRESET_MEDIA];
  } catch {
    return PRESET_MEDIA;
  }
}

export function saveMediaLibrary(items: MediaItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const customItems = items.filter((item) => !item.isPreset);
    window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(customItems));
  } catch (err) {
    console.error("Erro ao salvar mídias no LocalStorage", err);
  }
}

export async function uploadMediaFile(file: File): Promise<MediaItem> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i.test(file.name);
  const kind: MediaKind = isVideo ? "video" : "image";

  // Se estiver rodando no Electron, usa IPC para salvar na pasta appdata/media/ de forma permanente
  if (typeof window !== "undefined" && (window as any).electronAPI?.isElectron) {
    try {
      const api = (window as any).electronAPI;
      if (api?.uploadMediaBuffer) {
        const arrayBuffer = await file.arrayBuffer();
        const item = await api.uploadMediaBuffer(arrayBuffer, file.name, file.type);
        return item;
      }
      const filePath = (file as any).path;
      if (filePath && api?.uploadMedia) {
        const item = await api.uploadMedia(filePath, file.name, file.type);
        return item;
      }
    } catch (err) {
      console.warn("Upload Electron IPC falhou, tentando fallback local:", err);
    }
  }

  // Fallback local via Data URL ou Blob URL
  return new Promise((resolve, reject) => {
    if (file.size <= 12 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: reader.result as string,
          kind,
          createdAt: Date.now(),
          size: file.size,
        });
      };
      reader.onerror = () => reject(new Error("Falha ao ler arquivo local"));
      reader.readAsDataURL(file);
    } else {
      const objectUrl = URL.createObjectURL(file);
      resolve({
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        url: objectUrl,
        kind,
        createdAt: Date.now(),
        size: file.size,
      });
    }
  });
}

export function toProjectionSlide(item: MediaItem, fit: "cover" | "contain" = "contain"): ProjectionSlide {
  return {
    id: `media-slide-${item.id}`,
    kind: "media",
    label: item.name,
    title: item.name,
    lines: [],
    footer: item.name,
    mediaUrl: item.url,
    mediaKind: item.kind,
    mediaFit: fit,
  };
}

export function buildMediaDeck(
  items: MediaItem[],
  startIndex = 0,
  fit: "cover" | "contain" = "contain",
): { meta: DeckMeta; slides: ProjectionSlide[] } {
  const slides = items.map((item) => toProjectionSlide(item, fit));
  const activeItem = items[startIndex] ?? items[0];
  const orderedSlides = [...slides.slice(startIndex), ...slides.slice(0, startIndex)];
  return {
    meta: {
      title: activeItem ? `Mídia: ${activeItem.name}` : "Mídia",
    },
    slides: orderedSlides,
  };
}
