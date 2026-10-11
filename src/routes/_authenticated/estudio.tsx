import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
  Layers,
  LogOut,
  Monitor,
  Music4,
  Palette,
  Play,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Snowflake,
  Power,
  Square,
  Type,
  Search,
  Timer,
  ArrowUpCircle,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { SlideCanvas } from "@/components/SlideCanvas";
import { StagePreview } from "@/components/stage/StageDisplay";
import { BiblePanel } from "@/components/studio/BiblePanel";
import { CommandPalette, type QuickAction } from "@/components/studio/CommandPalette";
import { LayersPanel } from "@/components/studio/LayersPanel";
import { MediaPanel } from "@/components/studio/MediaPanel";
import { SetlistPanel } from "@/components/studio/SetlistPanel";
import { SongsPanel } from "@/components/studio/SongsPanel";
import { StagePanel } from "@/components/studio/StagePanel";
import { ThemePanel } from "@/components/studio/ThemePanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { JsonObject, SongRecord } from "@/lib/library.functions";
import { getChapter } from "@/lib/bible.functions";
import { localListSongs, localListSetlists, localAddSetlistItem } from "@/lib/local-db";
import {
  createNamedTimer,
  DEFAULT_THEME,
  INITIAL_LIVE_STATE,
  publishLiveState,
  syncLyricsLayerTitle,
  type DeckMeta,
  type LiveState,
  type ProjectionSlide,
  type StageState,
  type ThemeConfig,
  type TimerState,
} from "@/lib/projection";
import { buildBibleSlides, buildSongSlides, buildTextSlides } from "@/lib/slides";
import { formatRef, parseReference } from "@/lib/bible-books";
import { toProjectionSlide, uploadMediaFile, type MediaItem } from "@/lib/media";
import { DisplayManagerModal } from "@/components/studio/DisplayManagerModal";
import { UpdateModal } from "@/components/studio/UpdateModal";
import {
  getAppVersion,
  subscribeToUpdater,
  type UpdaterStatus,
} from "@/lib/updater";
import { StageLayoutEditor, DEFAULT_STAGE_LAYOUT } from "@/components/studio/StageLayoutEditor";
import type { StageWidget } from "@/lib/projection";
import {
  openScreen,
  isElectron,
  getScreenStatus,
  getElectronAPI,
  type ScreenStatus,
} from "@/lib/screens";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/estudio")({
  head: () => ({
    meta: [
      { title: "Estúdio de projeção — Palco" },
      {
        name: "description",
        content:
          "Console ao vivo: músicas, Bíblia, repertórios, temas, preview e envio de slides para a tela de projeção.",
      },
      { property: "og:title", content: "Estúdio de projeção — Palco" },
      {
        property: "og:description",
        content: "Controle preview e ao vivo, blackout e temas do seu sistema de projeção.",
      },
    ],
  }),
  component: Studio,
});

function Studio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectionWindow = useRef<Window | null>(null);
  const stageWindow = useRef<Window | null>(null);

  const [theme, setTheme] = useState<ThemeConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("rfpresenter_active_theme");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("rfpresenter_active_theme", JSON.stringify(theme));
      } catch {}
    }
  }, [theme]);

  const [linesPerSlide, setLinesPerSlide] = useState(4);
  const [versesPerSlide, setVersesPerSlide] = useState(1);
  const [logoText, setLogoText] = useState("Bem-vindos");

  const [deckTitle, setDeckTitle] = useState("");
  const [deck, setDeck] = useState<ProjectionSlide[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [liveIndex, setLiveIndex] = useState(-1);
  const [liveSlide, setLiveSlide] = useState<ProjectionSlide | null>(null);
  const [blackout, setBlackout] = useState(false);
  const [showLogo, setShowLogo] = useState(false);

  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState({ title: "Aviso", body: "" });
  const [freeze, setFreeze] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const [commandOpen, setCommandOpen] = useState(false);

  const [stage, setStage] = useState<StageState>(INITIAL_LIVE_STATE.stage);
  const [timers, setTimers] = useState<TimerState>(INITIAL_LIVE_STATE.timers);
  const [songKey, setSongKey] = useState("");
  const [bpm, setBpm] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const [stageLayout, setStageLayout] = useState<StageWidget[] | undefined>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("rfpresenter_stage_layout");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return undefined;
  });

  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (stageLayout && stageLayout.length > 0) {
          window.localStorage.setItem("rfpresenter_stage_layout", JSON.stringify(stageLayout));
        } else {
          window.localStorage.removeItem("rfpresenter_stage_layout");
        }
      } catch {}
    }
  }, [stageLayout]);

  const fetchChapter = getChapter;

  const [displayModalOpen, setDisplayModalOpen] = useState(false);
  const [screenStatus, setScreenStatus] = useState<ScreenStatus>({
    displays: [],
    projecaoOpen: false,
    palcoOpen: false,
    assignments: { projecao: null, palco: null },
  });

  useEffect(() => {
    if (isElectron()) {
      getScreenStatus().then(setScreenStatus);
      const api = getElectronAPI();
      if (api?.onScreenStatusChange) {
        const cleanup = api.onScreenStatusChange((newStatus: ScreenStatus) => {
          setScreenStatus(newStatus);
        });
        return cleanup;
      }
    }
  }, []);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>({ status: "idle" });

  useEffect(() => {
    getAppVersion().then(setAppVersion);
    const unsubscribe = subscribeToUpdater((newStatus) => {
      setUpdaterStatus(newStatus);
      if (newStatus.status === "downloaded") {
        toast.success(
          `Nova versão ${newStatus.version ? `v${newStatus.version}` : ""} baixada e pronta para instalar!`,
          {
            duration: 10000,
            action: {
              label: "Ver Atualização",
              onClick: () => setUpdateModalOpen(true),
            },
          }
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: songs = [] } = useQuery({ queryKey: ["songs"], queryFn: () => localListSongs() });
  const { data: setlists = [] } = useQuery({ queryKey: ["setlists"], queryFn: () => localListSetlists() });

  const addItem = useMutation({
    mutationFn: localAddSetlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setlist-items"] });
      toast.success("Adicionado ao repertório");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // primeiro slide da próxima seção distinta (usado no retorno de palco)
  // Usa liveIndex (slide ao vivo) e não previewIndex (hover) para não
  // alterar o "próxima parte" no retorno de palco ao passar o mouse.
  const nextSectionSlide = useMemo(() => {
    if (liveIndex < 0) return null;
    const current = deck[liveIndex];
    if (!current || current.kind !== "lyrics") return null;
    const key = current.sectionKey;
    for (let i = liveIndex + 1; i < deck.length; i++) {
      const candidate = deck[i];
      if (candidate && candidate.sectionKey !== key) return candidate;
    }
    return null;
  }, [deck, liveIndex]);

  const state: LiveState = useMemo(
    () => ({
      slide: liveSlide,
      next: liveIndex >= 0 ? (deck[liveIndex + 1] ?? null) : null,
      nextSection: nextSectionSlide,
      blackout,
      freeze,
      showLogo,
      logoText,
      theme,
      stage,
      timers,
      songKey,
      bpm,
      notes,
      stageLayout,
      updatedAt: Date.now(),
    }),
    [liveSlide, deck, liveIndex, nextSectionSlide, blackout, showLogo, logoText, theme, stage, timers, songKey, bpm, notes, stageLayout, freeze],
  );

  useEffect(() => {
    publishLiveState(state);
  }, [state]);

  const openDeck = useCallback((meta: DeckMeta, slides: ProjectionSlide[]) => {
    setDeckTitle(meta.title);
    setDeck(slides);
    setPreviewIndex(0);
    setLiveIndex(-1);
    setSongKey(meta.songKey ?? "");
    setBpm(meta.bpm ?? null);
    setNotes(meta.notes ?? "");

    // Sincroniza a camada de transmissão na timeline de camadas automaticamente
    setTheme((prevTheme) => ({
      ...prevTheme,
      layers: syncLyricsLayerTitle(prevTheme.layers, meta.title),
    }));

    // cria um NamedTimer auto-iniciado se o item trouxer duração
    if (meta.durationMin && meta.durationMin > 0) {
      const timer = createNamedTimer(meta.title, meta.durationMin);
      setTimers((prev) => ({
        ...prev,
        items: [
          { ...timer, startedAt: Date.now(), pausedAt: null },
          ...prev.items,
        ],
      }));
    }
  }, []);

  const goLive = useCallback(
    (index: number) => {
      const slide = deck[index];
      if (!slide) return;
      setPreviewIndex(index);
      setLiveIndex(index);
      setLiveSlide(slide);
      setShowLogo(false);
      setBlackout(false);

      // Garante que a camada de transmissão na timeline de camadas esteja ativa e com o título atual
      const activeTitle =
        slide.title ||
        deckTitle ||
        (slide.kind === "lyrics" ? "Música" : slide.kind === "bible" ? "Bíblia" : "Apresentação");
      setTheme((prevTheme) => ({
        ...prevTheme,
        layers: syncLyricsLayerTitle(prevTheme.layers, activeTitle),
      }));
    },
    [deck, deckTitle],
  );

  const step = useCallback(
    (delta: number) => {
      if (!deck.length) return;
      const next = Math.min(Math.max(previewIndex + delta, 0), deck.length - 1);
      goLive(next);
    },
    [deck.length, previewIndex, goLive],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key.toLowerCase() === "b") {
        setBlackout((v) => !v);
      } else if (event.key.toLowerCase() === "c") {
        setFreeze((v) => !v);
      } else if (event.key.toLowerCase() === "l") {
        setShowLogo((v) => !v);
      } else if (event.key === "Escape") {
        setLiveSlide(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const openWindow = (path: string, ref: React.MutableRefObject<Window | null>, name: string) => {
    const win = window.open(
      path,
      name,
      "popup=yes,width=1280,height=720,left=100,top=100",
    );
    if (!win) {
      toast.error("Permita pop-ups para abrir a tela");
      return null;
    }
    ref.current = win;
    publishLiveState(state);
    return win;
  };

  const openProjection = async () => {
    if (isElectron()) {
      await openScreen("projecao");
      publishLiveState(state);
    } else {
      openWindow("/projecao", projectionWindow, "palco-projecao");
    }
  };

  const openStage = async () => {
    if (isElectron()) {
      await openScreen("palco");
      publishLiveState(state);
    } else {
      openWindow("/palco", stageWindow, "palco-stage");
    }
  };

  const addSongToSetlist = (song: SongRecord) => {
    if (!activeSetlistId) {
      toast.error("Selecione um repertório na aba Repertório");
      return;
    }
    addItem.mutate({
      data: {
        setlistId: activeSetlistId,
        kind: "song",
        title: song.title,
        payload: {
          songId: song.id,
          songKey: song.song_key,
          bpm: song.bpm,
          notes: song.notes,
          durationMin: 5,
        },
      },
    });
  };

  const addBibleToSetlist = (title: string, payload: JsonObject) => {
    if (!activeSetlistId) {
      toast.error("Selecione um repertório na aba Repertório");
      return;
    }
    addItem.mutate({ data: { setlistId: activeSetlistId, kind: "bible", title, payload } });
  };

  const handleCommandAction = (action: QuickAction) => {
    if (action.type === "blackout") setBlackout((v) => !v);
    if (action.type === "freeze") setFreeze((v) => !v);
    if (action.type === "logo") setShowLogo((v) => !v);
    if (action.type === "clear") setLiveSlide(null);
    if (action.type === "openProjection") openProjection();
    if (action.type === "openStage") openStage();
  };

  const handleGoToRef = async (ref: ReturnType<typeof parseReference>) => {
    if (!ref) return;
    const label = "NVI";
    const result = await fetchChapter({
      data: { translation: "NVIPT", book: ref.book.id, chapter: ref.chapter },
    });
    const slides = buildBibleSlides(
      formatRef(ref.book.id, ref.chapter, ref.verseStart, ref.verseEnd),
      label,
      result.verses.slice((ref.verseStart ?? 1) - 1, ref.verseEnd ?? undefined),
      versesPerSlide,
    );
    openDeck({ title: formatRef(ref.book.id, ref.chapter, ref.verseStart, ref.verseEnd) }, slides);
  };

  const handleCanvasDrop = async (target: "preview" | "live", e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Dropping from MediaPanel
    const rawMedia = e.dataTransfer.getData("application/x-rfpresenter-media");
    if (rawMedia) {
      try {
        const item = JSON.parse(rawMedia) as MediaItem;
        const slide = toProjectionSlide(item, "contain");
        openDeck({ title: item.name }, [slide]);
        if (target === "live") {
          setPreviewIndex(0);
          setLiveIndex(0);
          setLiveSlide(slide);
          setShowLogo(false);
          setBlackout(false);
        }
        toast.success(`Mídia "${item.name}" enviada para ${target === "live" ? "Ao Vivo" : "Preview"}`);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Dropping file from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) {
        try {
          const item = await uploadMediaFile(file);
          const slide = toProjectionSlide(item, "contain");
          openDeck({ title: item.name }, [slide]);
          if (target === "live") {
            setPreviewIndex(0);
            setLiveIndex(0);
            setLiveSlide(slide);
            setShowLogo(false);
            setBlackout(false);
          }
          toast.success(`Arquivo "${item.name}" carregado e enviado para ${target === "live" ? "Ao Vivo" : "Preview"}`);
        } catch (err) {
          toast.error("Falha ao carregar arquivo na tela");
        }
      }
    }
  };

  const previewSlide = deck[previewIndex] ?? null;
  const nextSlide = deck[previewIndex + 1] ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stage">
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        songs={songs}
        setlists={setlists}
        onOpenSong={(song) => {
          openDeck(
            { title: song.title, songKey: song.song_key, bpm: song.bpm, notes: song.notes },
            buildSongSlides(song, linesPerSlide),
          );
        }}
        onOpenSetlist={(setlist) => setActiveSetlistId(setlist.id)}
        onGoToRef={handleGoToRef}
        onAction={handleCommandAction}
      />

      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-bold">
            <img src="/logo.png" alt="RFPresenter" className="size-6 object-contain drop-shadow" />
            <span>RFPresenter</span>
          </Link>
          <button
            onClick={() => setUpdateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-border/80 bg-zinc-900/90 px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:border-primary/50 hover:bg-zinc-850 transition-colors cursor-pointer"
            title="Clique para ver detalhes da versão e verificar atualizações"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                updaterStatus.status === "downloaded" && "bg-emerald-400 animate-ping",
                updaterStatus.status === "downloading" && "bg-blue-400 animate-pulse",
                updaterStatus.status === "checking" && "bg-amber-400 animate-pulse",
                updaterStatus.status === "available" && "bg-purple-400 animate-pulse",
                (updaterStatus.status === "idle" || updaterStatus.status === "not-available") && "bg-emerald-500",
                updaterStatus.status === "error" && "bg-rose-400",
              )}
            />
            <span>v{appVersion}</span>
          </button>
          <span className="hidden text-xs text-muted-foreground md:inline">
            ← → navega · B blackout · L logo · C congela · Esc limpa · Ctrl+F busca
          </span>
        </div>
        <div className="flex items-center gap-2">
          {updaterStatus.status === "downloaded" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1.5 animate-pulse shadow-md"
              onClick={() => setUpdateModalOpen(true)}
              title="Nova versão pronta para instalar! Clique para aplicar."
            >
              <ArrowUpCircle className="size-4" />
              <span>Atualização Pronta</span>
            </Button>
          )}
          {updaterStatus.status === "downloading" && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500/40 bg-blue-950/30 text-blue-300 gap-1.5 text-xs font-mono"
              onClick={() => setUpdateModalOpen(true)}
              title="Baixando nova versão em segundo plano"
            >
              <span className="size-2 rounded-full bg-blue-400 animate-ping" />
              <span>Baixando {updaterStatus.percent}%</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 bg-accent/30 gap-1.5"
            onClick={() => setDisplayModalOpen(true)}
            title="Gerenciar telas, projetores e saídas de vídeo"
          >
            <Monitor className="size-4 text-primary" />
            <span>Monitores</span>
            {screenStatus.displays.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-0.5 font-mono">
                {screenStatus.displays.length}
              </Badge>
            )}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCommandOpen(true)}>
            <Search className="mr-1 size-4" /> Buscar
          </Button>
          <Button
            variant={screenStatus.palcoOpen ? "default" : "secondary"}
            size="sm"
            onClick={openStage}
            className={screenStatus.palcoOpen ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
            title="Abrir retorno de palco (Monitor 3 / Secundário)"
          >
            <Timer className="mr-1 size-4" /> Palco
          </Button>
          <Button
            variant={blackout ? "destructive" : "secondary"}
            size="sm"
            onClick={() => setBlackout((v) => !v)}
          >
            <Square className="mr-1 size-4" /> Blackout
          </Button>
          <Button
            variant={showLogo ? "default" : "secondary"}
            size="sm"
            onClick={() => setShowLogo((v) => !v)}
          >
            <Power className="mr-1 size-4" /> Abertura
          </Button>
          <Button
            variant={freeze ? "default" : "secondary"}
            size="sm"
            title="Congela a imagem na tela de projeção (C)"
            onClick={() => setFreeze((v) => !v)}
          >
            <Snowflake className="mr-1 size-4" /> Congelar
          </Button>
          <Button
            size="sm"
            onClick={openProjection}
            className={screenStatus.projecaoOpen ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
            title="Abrir projeção em tela cheia (Monitor 2 / Projetor)"
          >
            <Monitor className="mr-1 size-4" /> Projeção
          </Button>

        </div>
      </header>

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 gap-3 p-3",
          leftOpen && rightOpen && "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,27rem)]",
          leftOpen && !rightOpen && "lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_3rem]",
          !leftOpen && rightOpen && "lg:grid-cols-[3rem_minmax(0,1fr)_minmax(0,27rem)]",
          !leftOpen && !rightOpen && "lg:grid-cols-[3rem_minmax(0,1fr)_3rem]",
        )}
      >
        {leftOpen ? (
          <section className="panel flex min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Biblioteca</span>
              <Button variant="ghost" size="icon" title="Encolher painel" onClick={() => setLeftOpen(false)}>
                <PanelLeftClose className="size-4" />
              </Button>
            </div>
            <Tabs defaultValue="musicas" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="musicas">
                  <Music4 className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="biblia">
                  <BookOpen className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="repertorio">
                  <Layers className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="midia">
                  <ImageIcon className="size-4" />
                </TabsTrigger>
                <TabsTrigger value="aviso">
                  <Type className="size-4" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="musicas" className="mt-3 min-h-0 flex-1">
                <SongsPanel
                  linesPerSlide={linesPerSlide}
                  theme={theme}
                  onOpenDeck={openDeck}
                  onAddToSetlist={addSongToSetlist}
                />
              </TabsContent>
              <TabsContent value="biblia" className="mt-3 min-h-0 flex-1">
                <BiblePanel
                  versesPerSlide={versesPerSlide}
                  onOpenDeck={openDeck}
                  onSendSlide={(slide) => {
                    setDeckTitle(slide.title ?? "Bíblia");
                    setDeck([slide]);
                    setPreviewIndex(0);
                    setLiveSlide(slide);
                    setShowLogo(false);
                  }}
                  onAddToSetlist={addBibleToSetlist}
                />
              </TabsContent>
              <TabsContent value="midia" className="mt-3 min-h-0 flex-1">
                <MediaPanel
                  theme={theme}
                  onThemeChange={setTheme}
                  onOpenDeck={openDeck}
                  onAddToSetlist={(title, payload) => {
                    if (!activeSetlistId) {
                      toast.error("Selecione um repertório na aba Repertório");
                      return;
                    }
                    addItem.mutate({
                      data: {
                        setlistId: activeSetlistId,
                        kind: "media",
                        title,
                        payload,
                      },
                    });
                  }}
                />
              </TabsContent>
              <TabsContent value="repertorio" className="mt-3 min-h-0 flex-1">
                <SetlistPanel
                  linesPerSlide={linesPerSlide}
                  versesPerSlide={versesPerSlide}
                  activeSetlistId={activeSetlistId}
                  onActiveSetlistChange={setActiveSetlistId}
                  onOpenDeck={openDeck}
                />
              </TabsContent>
              <TabsContent value="aviso" className="mt-3 min-h-0 flex-1 space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <Input
                    value={announcement.title}
                    onChange={(e) => setAnnouncement((a) => ({ ...a, title: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Texto (linha em branco separa slides)</Label>
                  <Textarea
                    rows={10}
                    value={announcement.body}
                    onChange={(e) => setAnnouncement((a) => ({ ...a, body: e.target.value }))}
                    placeholder={"Culto de oração\nQuarta, 19h30"}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    openDeck(
                      { title: announcement.title || "Aviso" },
                      buildTextSlides(announcement.title || "Aviso", announcement.body, linesPerSlide),
                    )
                  }
                >
                  Carregar no preview
                </Button>
              </TabsContent>
            </Tabs>
          </section>
        ) : (
          <section className="panel flex min-h-0 flex-col items-center gap-2 p-2">
            <Button variant="ghost" size="icon" title="Expandir biblioteca" onClick={() => setLeftOpen(true)}>
              <PanelLeftOpen className="size-4" />
            </Button>
            <span className="mt-1 text-[10px] tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
              BIBLIOTECA
            </span>
          </section>
        )}

        <section className="flex min-h-0 flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div
              className="panel overflow-hidden transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => void handleCanvasDrop("preview", e)}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Eye className="size-3.5" /> Preview
                </span>
                <span className="text-[10px] opacity-70">Solte foto/vídeo aqui</span>
              </div>
              <div className="aspect-video">
                <SlideCanvas slide={previewSlide} theme={theme} />
              </div>
            </div>
            <div
              className="panel overflow-hidden ring-1 ring-primary/40 transition-colors"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => void handleCanvasDrop("live", e)}
            >
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs font-medium text-primary">
                <span className="flex items-center gap-2">
                  <Play className="size-3.5" /> Ao vivo
                </span>
                <span className="text-[10px] opacity-70">Solte para projetar ao vivo</span>
              </div>
              <div className="aspect-video">
                <SlideCanvas
                  slide={liveSlide}
                  theme={theme}
                  blackout={blackout}
                  showLogo={showLogo}
                  logoText={logoText}
                />
              </div>
            </div>
            {/* ── Preview do Retorno de Palco ── */}
            <div className="panel overflow-hidden ring-1 ring-purple-500/30 transition-colors">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 text-xs font-medium text-purple-400">
                <span className="flex items-center gap-2">
                  <Timer className="size-3.5" /> Retorno Palco
                </span>
                <div className="flex items-center gap-1.5">
                  {stage.showMessage && stage.message && (
                    <span
                      title={`Mensagem ativa no retorno de palco: "${stage.message}"`}
                      className="flex items-center gap-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow animate-pulse"
                    >
                      <MessageSquare className="size-2.5" />
                      AVISO AO VIVO
                    </span>
                  )}
                  {stage.showBigText && stage.bigText && (
                    <span
                      title="Texto grande ativo cobrindo o retorno de palco"
                      className="rounded bg-indigo-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow"
                    >
                      TEXTO GRANDE
                    </span>
                  )}
                  {screenStatus.palcoOpen ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ON AIR
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={openStage}
                      className="text-[10px] text-muted-foreground hover:text-white transition-colors cursor-pointer"
                      title="Clique para abrir tela de retorno de palco"
                    >
                      OFFLINE
                    </button>
                  )}
                </div>
              </div>
              <div className="aspect-video relative overflow-hidden bg-[#080a10]">
                <StagePreview state={state} media={false} />
              </div>
            </div>
          </div>

          <div className="panel flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">
                {deckTitle || "Nenhum item carregado"}
                {deck.length ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {previewIndex + 1}/{deck.length}
                  </span>
                ) : null}
              </p>
              <p className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">
                {nextSlide ? `Próximo: ${nextSlide.lines[0] ?? nextSlide.label ?? ""}` : ""}
              </p>
              <div className="flex gap-1">
                <Button variant="secondary" size="icon" onClick={() => step(-1)} disabled={!deck.length}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => step(1)} disabled={!deck.length}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="-mr-2 min-h-0 flex-1 pr-3">
              {deck.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {deck.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => goLive(index)}
                      onMouseEnter={() => setPreviewIndex(index)}
                      className={cn(
                        "group overflow-hidden rounded-lg border text-left transition-colors",
                        liveSlide?.id === slide.id
                          ? "border-primary ring-1 ring-primary/50"
                          : "border-border/60 hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 px-2 py-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{slide.label ?? `Slide ${index + 1}`}</span>
                        <span>{index + 1}</span>
                      </div>
                      <div className="aspect-video">
                        <SlideCanvas slide={slide} theme={theme} media={false} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Escolha uma música, passagem bíblica ou aviso para gerar os slides.
                </p>
              )}
            </ScrollArea>
          </div>
        </section>

        {rightOpen ? (
          <section className="panel flex min-h-0 flex-col p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <Palette className="size-3.5" /> Configurações
              </span>
              <Button variant="ghost" size="icon" title="Encolher painel" onClick={() => setRightOpen(false)}>
                <PanelRightClose className="size-4" />
              </Button>
            </div>
            <Tabs defaultValue="tema" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tema">Tema</TabsTrigger>
                <TabsTrigger value="camadas">Camadas</TabsTrigger>
                <TabsTrigger value="palco">Retorno</TabsTrigger>
              </TabsList>
              <TabsContent value="tema" className="mt-3 min-h-0 flex-1">
                <ThemePanel
                  theme={theme}
                  onChange={setTheme}
                  linesPerSlide={linesPerSlide}
                  onLinesPerSlideChange={setLinesPerSlide}
                  versesPerSlide={versesPerSlide}
                  onVersesPerSlideChange={setVersesPerSlide}
                  logoText={logoText}
                  onLogoTextChange={setLogoText}
                />
              </TabsContent>
              <TabsContent value="camadas" className="mt-3 min-h-0 flex-1">
                <LayersPanel theme={theme} onChange={setTheme} />
              </TabsContent>
              <TabsContent value="palco" className="mt-3 min-h-0 flex-1">
                <StagePanel
                  stage={stage}
                  onStageChange={setStage}
                  timers={timers}
                  onTimersChange={setTimers}
                  notes={notes}
                  onOpenStage={openStage}
                  onOpenLayoutEditor={() => setLayoutEditorOpen(true)}
                />
              </TabsContent>
            </Tabs>
          </section>
        ) : (
          <section className="panel flex min-h-0 flex-col items-center gap-2 p-2">
            <Button variant="ghost" size="icon" title="Expandir painel" onClick={() => setRightOpen(true)}>
              <PanelRightOpen className="size-4" />
            </Button>
            <span className="mt-1 text-[10px] tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
              CONFIG
            </span>
          </section>
        )}
      </div>

      <DisplayManagerModal
        open={displayModalOpen}
        onOpenChange={setDisplayModalOpen}
      />

      <UpdateModal
        open={updateModalOpen}
        onOpenChange={setUpdateModalOpen}
        status={updaterStatus}
        onStatusChange={setUpdaterStatus}
      />

      {layoutEditorOpen && (
        <StageLayoutEditor
          layout={stageLayout && stageLayout.length > 0 ? stageLayout : DEFAULT_STAGE_LAYOUT}
          onChange={(next) => setStageLayout(next)}
          onClose={() => setLayoutEditorOpen(false)}
        />
      )}
    </div>
  );
}
