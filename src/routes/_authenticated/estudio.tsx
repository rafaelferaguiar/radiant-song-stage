import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  LogOut,
  Monitor,
  Music4,
  Palette,
  Play,
  Power,
  Square,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { SlideCanvas } from "@/components/SlideCanvas";
import { BiblePanel } from "@/components/studio/BiblePanel";
import { SetlistPanel } from "@/components/studio/SetlistPanel";
import { SongsPanel } from "@/components/studio/SongsPanel";
import { ThemePanel } from "@/components/studio/ThemePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { addSetlistItem, type SongRecord } from "@/lib/library.functions";
import {
  DEFAULT_THEME,
  publishLiveState,
  type LiveState,
  type ProjectionSlide,
  type ThemeConfig,
} from "@/lib/projection";
import { buildTextSlides } from "@/lib/slides";
import { supabase } from "@/integrations/supabase/client";
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

  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [linesPerSlide, setLinesPerSlide] = useState(4);
  const [versesPerSlide, setVersesPerSlide] = useState(1);
  const [logoText, setLogoText] = useState("Bem-vindos");

  const [deckTitle, setDeckTitle] = useState("");
  const [deck, setDeck] = useState<ProjectionSlide[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [liveSlide, setLiveSlide] = useState<ProjectionSlide | null>(null);
  const [blackout, setBlackout] = useState(false);
  const [showLogo, setShowLogo] = useState(false);

  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState({ title: "Aviso", body: "" });

  const appendItem = useServerFn(addSetlistItem);
  const addItem = useMutation({
    mutationFn: appendItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setlist-items"] });
      toast.success("Adicionado ao repertório");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const state: LiveState = useMemo(
    () => ({
      slide: liveSlide,
      blackout,
      freeze: false,
      showLogo,
      logoText,
      theme,
      updatedAt: Date.now(),
    }),
    [liveSlide, blackout, showLogo, logoText, theme],
  );

  useEffect(() => {
    publishLiveState(state);
  }, [state]);

  const openDeck = useCallback((title: string, slides: ProjectionSlide[]) => {
    setDeckTitle(title);
    setDeck(slides);
    setPreviewIndex(0);
  }, []);

  const goLive = useCallback(
    (index: number) => {
      const slide = deck[index];
      if (!slide) return;
      setPreviewIndex(index);
      setLiveSlide(slide);
      setShowLogo(false);
      setBlackout(false);
    },
    [deck],
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
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key.toLowerCase() === "b") {
        setBlackout((v) => !v);
      } else if (event.key.toLowerCase() === "l") {
        setShowLogo((v) => !v);
      } else if (event.key === "Escape") {
        setLiveSlide(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const openProjection = () => {
    const win = window.open(
      "/projecao",
      "palco-projecao",
      "popup=yes,width=1280,height=720,left=100,top=100",
    );
    if (!win) {
      toast.error("Permita pop-ups para abrir a tela de projeção");
      return;
    }
    projectionWindow.current = win;
    publishLiveState(state);
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
        songId: song.id,
        payload: {},
      },
    });
  };

  const addBibleToSetlist = (title: string, payload: Record<string, unknown>) => {
    if (!activeSetlistId) {
      toast.error("Selecione um repertório na aba Repertório");
      return;
    }
    addItem.mutate({ data: { setlistId: activeSetlistId, kind: "bible", title, payload } });
  };

  const previewSlide = deck[previewIndex] ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stage">
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-display text-base font-bold">
            Palco<span className="text-primary">.</span>
          </Link>
          <span className="hidden text-xs text-muted-foreground md:inline">
            ← → navega · B blackout · L logo · Esc limpa
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={blackout ? "destructive" : "secondary"}
            size="sm"
            onClick={() => setBlackout((v) => !v)}
          >
            <Square className="size-4" /> Blackout
          </Button>
          <Button
            variant={showLogo ? "default" : "secondary"}
            size="sm"
            onClick={() => setShowLogo((v) => !v)}
          >
            <Power className="size-4" /> Abertura
          </Button>
          <Button size="sm" onClick={openProjection}>
            <Monitor className="size-4" /> Tela de projeção
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sair"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,22rem)]">
        <section className="panel flex min-h-0 flex-col p-3">
          <Tabs defaultValue="musicas" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="musicas">
                <Music4 className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="biblia">
                <BookOpen className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="repertorio">
                <Layers className="size-4" />
              </TabsTrigger>
              <TabsTrigger value="aviso">
                <Type className="size-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="musicas" className="mt-3 min-h-0 flex-1">
              <SongsPanel
                linesPerSlide={linesPerSlide}
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
                    announcement.title || "Aviso",
                    buildTextSlides(announcement.title || "Aviso", announcement.body, linesPerSlide),
                  )
                }
              >
                Carregar no preview
              </Button>
            </TabsContent>
          </Tabs>
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <Eye className="size-3.5" /> Preview
              </div>
              <div className="aspect-video">
                <SlideCanvas slide={previewSlide} theme={theme} />
              </div>
            </div>
            <div className="panel overflow-hidden ring-1 ring-primary/40">
              <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs font-medium text-primary">
                <Play className="size-3.5" /> Ao vivo
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
                        <SlideCanvas slide={slide} theme={theme} />
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

        <section className="panel flex min-h-0 flex-col p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Palette className="size-3.5" /> Tema e projeção
          </div>
          <div className="min-h-0 flex-1">
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
          </div>
        </section>
      </div>
    </div>
  );
}
