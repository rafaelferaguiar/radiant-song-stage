import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, Dices, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localSaveTheme } from "@/lib/local-db";
import type { JsonObject } from "@/lib/library.functions";
import {
  DEFAULT_THEME,
  LOOP_KIND_OPTIONS,
  LOOP_PRESETS,
  type BlendMode,
  type LoopKind,
  type ThemeConfig,
} from "@/lib/projection";
import { renderLoop } from "@/lib/loops";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/loops")({
  head: () => ({
    meta: [
      { title: "Criador de loops de fundo — Estúdio" },
      {
        name: "description",
        content:
          "Crie fundos animados de worship do zero: escolha cores, formas em movimento, velocidade e mesclagem, e salve como tema.",
      },
      { property: "og:title", content: "Criador de loops de fundo — Estúdio" },
      {
        property: "og:description",
        content: "Monte fundos animados personalizados com cores, formas, velocidade e mesclagem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoopStudio,
});

const PALETTES: string[][] = [
  ["#0f172a", "#1e40af", "#38bdf8"],
  ["#431407", "#c2410c", "#f59e0b"],
  ["#020617", "#a5b4fc", "#ffffff"],
  ["#052e16", "#15803d", "#a3e635"],
  ["#2e1065", "#7e22ce", "#f0abfc"],
  ["#111827", "#4b5563", "#e5e7eb"],
];

function LoopStudio() {
  const queryClient = useQueryClient();
  const persist = localSaveTheme;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [name, setName] = useState("Meu loop");
  const [showText, setShowText] = useState(true);
  const [loop, setLoop] = useState({
    loopKind: "gradient" as LoopKind,
    loopColors: ["#0f172a", "#1e40af", "#38bdf8"],
    loopSpeed: 1,
    loopOverlay: 30,
    loopBlend: "normal" as BlendMode,
    bg: "#0b1020",
  });

  const theme: ThemeConfig = useMemo(
    () => ({ ...DEFAULT_THEME, bgKind: "loop", ...loop }),
    [loop],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      renderLoop(canvas, theme, ctx, now - start);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  const save = useMutation({
    mutationFn: () =>
      persist({ id: null, name: name.trim() || "Loop sem nome", config: theme as unknown as Record<string, unknown> }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Loop salvo como tema — já aparece na galeria do estúdio");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar"),
  });

  const setColor = (index: number, value: string) =>
    setLoop((prev) => ({
      ...prev,
      loopColors: prev.loopColors.map((c, i) => (i === index ? value : c)),
    }));

  const randomize = () => {
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)] ?? PALETTES[0]!;
    const kinds = LOOP_KIND_OPTIONS.filter((o) => o.value !== "none");
    const kind = kinds[Math.floor(Math.random() * kinds.length)]?.value ?? "gradient";
    setLoop((prev) => ({
      ...prev,
      loopKind: kind,
      loopColors: [...palette],
      bg: palette[0] ?? prev.bg,
      loopSpeed: Number((0.4 + Math.random() * 1.4).toFixed(2)),
    }));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/estudio">
            <ArrowLeft className="mr-1 size-4" /> Estúdio
          </Link>
        </Button>
        <h1 className="text-sm font-semibold">Criador de loops de fundo</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={randomize}>
            <Dices className="mr-1 size-4" /> Surpreenda-me
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-44"
            placeholder="Nome do loop"
          />
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1 size-4" /> {save.isPending ? "Salvando..." : "Salvar como tema"}
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Palco de preview */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60">
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(0,0,0,${loop.loopOverlay / 100})` }}
            />
            {showText ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-10 text-center">
                <p
                  className="text-[clamp(1.5rem,4vw,3.5rem)] font-bold leading-tight text-white"
                  style={{ textShadow: "0 4px 24px rgba(0,0,0,.55)" }}
                >
                  Grande é o Senhor
                </p>
                <p
                  className="text-[clamp(1.5rem,4vw,3.5rem)] font-bold leading-tight text-white"
                  style={{ textShadow: "0 4px 24px rgba(0,0,0,.55)" }}
                >
                  e muito digno de louvor
                </p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {LOOP_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  setLoop((prev) => ({
                    ...prev,
                    ...(preset.config as Partial<typeof prev>),
                  }))
                }
                className="rounded-lg border border-border/60 px-2 py-2 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <ScrollArea className="min-h-0 rounded-xl border border-border/60 p-4">
          <div className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Formato do movimento</Label>
              <Select
                value={loop.loopKind}
                onValueChange={(v) => setLoop((prev) => ({ ...prev, loopKind: v as LoopKind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOP_KIND_OPTIONS.filter((o) => o.value !== "none").map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Cores</Label>
              <div className="space-y-1.5">
                {loop.loopColors.map((color, index) => (
                  <div key={`${color}-${index}`} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(index, e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <Input
                      value={color}
                      onChange={(e) => setColor(index, e.target.value)}
                      className="h-8 flex-1 font-mono text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      disabled={loop.loopColors.length <= 2}
                      onClick={() =>
                        setLoop((prev) => ({
                          ...prev,
                          loopColors: prev.loopColors.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={loop.loopColors.length >= 6}
                onClick={() =>
                  setLoop((prev) => ({ ...prev, loopColors: [...prev.loopColors, "#ffffff"] }))
                }
              >
                <Plus className="mr-1 size-3.5" /> Adicionar cor
              </Button>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PALETTES.map((palette, i) => (
                  <button
                    key={i}
                    type="button"
                    title="Aplicar paleta"
                    onClick={() =>
                      setLoop((prev) => ({ ...prev, loopColors: [...palette], bg: palette[0] ?? prev.bg }))
                    }
                    className={cn("flex overflow-hidden rounded border border-border/60")}
                  >
                    {palette.map((c) => (
                      <span key={c} className="size-5" style={{ backgroundColor: c }} />
                    ))}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Cor base do palco</Label>
              <input
                type="color"
                value={loop.bg}
                onChange={(e) => setLoop((prev) => ({ ...prev, bg: e.target.value }))}
                className="h-9 w-full cursor-pointer rounded border border-border bg-transparent"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Velocidade {loop.loopSpeed.toFixed(2)}x
              </Label>
              <Slider
                min={0.1}
                max={3}
                step={0.05}
                value={[loop.loopSpeed]}
                onValueChange={([v]) => setLoop((prev) => ({ ...prev, loopSpeed: v ?? prev.loopSpeed }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Escurecer {loop.loopOverlay}%</Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[loop.loopOverlay]}
                onValueChange={([v]) =>
                  setLoop((prev) => ({ ...prev, loopOverlay: v ?? prev.loopOverlay }))
                }
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Mesclagem</Label>
              <Select
                value={loop.loopBlend}
                onValueChange={(v) => setLoop((prev) => ({ ...prev, loopBlend: v as BlendMode }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="multiply">Multiplicar</SelectItem>
                  <SelectItem value="screen">Tela</SelectItem>
                  <SelectItem value="overlay">Overlay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrar letra de exemplo</span>
              <Switch checked={showText} onCheckedChange={setShowText} />
            </div>

            <p className="text-xs text-muted-foreground">
              Ao salvar, o loop entra na galeria de temas do estúdio e pode ser aplicado a qualquer
              música, versículo ou seção.
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
