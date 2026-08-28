import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music4, Palette, RotateCcw, Type } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlideCanvas } from "@/components/SlideCanvas";
import { listThemes, saveSong, type SongRecord } from "@/lib/library.functions";
import { buildSongSlides, parseSections, sectionKey, type SectionConfigMap } from "@/lib/slides";
import { DEFAULT_THEME, FONT_OPTIONS, type ThemeConfig } from "@/lib/projection";
import { cn } from "@/lib/utils";

interface SongEditorProps {
  open: boolean;
  song: SongRecord | null;
  baseTheme?: ThemeConfig | undefined;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = {
  title: "",
  artist: "",
  song_key: "",
  bpm: "",
  ccli: "",
  tags: "",
  lyrics: "",
  arrangement: "",
  notes: "",
};

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SongEditor({ open, song, baseTheme, onOpenChange }: SongEditorProps) {
  const [form, setForm] = useState(EMPTY);
  const [sections, setSections] = useState<SectionConfigMap>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const save = useServerFn(saveSong);
  const fetchThemes = useServerFn(listThemes);

  const { data: themes = [] } = useQuery({
    queryKey: ["themes"],
    queryFn: () => fetchThemes(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setForm(
      song
        ? {
            title: song.title,
            artist: song.artist,
            song_key: song.song_key,
            bpm: song.bpm ? String(song.bpm) : "",
            ccli: song.ccli,
            tags: song.tags.join(", "),
            lyrics: song.lyrics,
            arrangement: song.arrangement.join(", "),
            notes: song.notes,
          }
        : EMPTY,
    );
    setSections((song?.sections ?? {}) as SectionConfigMap);
    setActiveKey(null);
  }, [open, song]);

  const parsed = useMemo(() => parseSections(form.lyrics), [form.lyrics]);

  useEffect(() => {
    if (!activeKey && parsed[0]) setActiveKey(sectionKey(parsed[0].label));
  }, [parsed, activeKey]);

  const previewTheme = baseTheme ?? DEFAULT_THEME;

  const previewSlides = useMemo(
    () =>
      buildSongSlides(
        {
          id: song?.id ?? "preview",
          title: form.title || "Sem título",
          artist: form.artist,
          song_key: form.song_key,
          lyrics: form.lyrics,
          arrangement: form.arrangement
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          sections,
        },
        4,
      ),
    [form, sections, song?.id],
  );

  const activeSlide =
    previewSlides.find((s) => s.sectionKey === activeKey) ?? previewSlides[0] ?? null;

  const activeConfig = activeKey ? (sections[activeKey] ?? {}) : {};
  const activeOverride: Partial<ThemeConfig> = activeConfig.theme ?? {};

  const patchSection = (patch: Partial<(typeof sections)[string]>) => {
    if (!activeKey) return;
    setSections((prev) => ({ ...prev, [activeKey]: { ...(prev[activeKey] ?? {}), ...patch } }));
  };

  const patchOverride = (patch: Partial<ThemeConfig>) => {
    if (!activeKey) return;
    setSections((prev) => {
      const current = prev[activeKey] ?? {};
      const theme: Partial<ThemeConfig> = { ...(current.theme ?? {}), ...patch };
      return { ...prev, [activeKey]: { ...current, theme } };
    });
  };

  const clearSection = () => {
    if (!activeKey) return;
    setSections((prev) => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: song?.id ?? null,
          title: form.title,
          artist: form.artist,
          song_key: form.song_key,
          bpm: form.bpm ? Number(form.bpm) : null,
          ccli: form.ccli,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          lyrics: form.lyrics,
          arrangement: form.arrangement
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: form.notes,
          sections,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success(song ? "Música atualizada" : "Música criada");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[94vh] w-[97vw] max-w-[1400px] flex-col gap-3 overflow-hidden p-4 sm:max-w-[1400px]"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="size-4 text-primary" />
            {song ? "Editar música" : "Nova música"}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {parsed.length} seções · {previewSlides.length} slides
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          {/* Coluna esquerda: letra e metadados */}
          <div className="flex min-h-0 flex-col">
            <Tabs defaultValue="letra" className="flex min-h-0 flex-1 flex-col">
              <TabsList>
                <TabsTrigger value="letra">Letra</TabsTrigger>
                <TabsTrigger value="info">Informações</TabsTrigger>
              </TabsList>

              <TabsContent value="letra" className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
                <Label htmlFor="lyrics" className="text-xs text-muted-foreground">
                  Use <code>[Verso 1]</code>, <code>[Refrão]</code> ou linhas em branco para separar seções
                </Label>
                <Textarea
                  id="lyrics"
                  value={form.lyrics}
                  onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
                  className="min-h-0 flex-1 resize-none font-mono text-sm"
                  placeholder={"[Verso 1]\nLinha um da letra\nLinha dois\n\n[Refrão]\nRefrão aqui"}
                />
                <div className="flex flex-wrap gap-1.5">
                  {parsed.map((s) => {
                    const key = sectionKey(s.label);
                    const custom = sections[key];
                    return (
                      <button key={key} type="button" onClick={() => setActiveKey(key)}>
                        <Badge
                          variant={activeKey === key ? "default" : custom ? "outline" : "secondary"}
                          className={cn(custom && activeKey !== key && "border-primary/60 text-primary")}
                        >
                          {s.label} · {s.lines.length}
                          {custom?.songKey ? ` · ${custom.songKey}` : ""}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="info" className="mt-3 min-h-0 flex-1">
                <ScrollArea className="h-full pr-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="Grande é o Senhor"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="artist">Artista / autor</Label>
                      <Input
                        id="artist"
                        value={form.artist}
                        onChange={(e) => setForm({ ...form, artist: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="key">Tom</Label>
                        <Input
                          id="key"
                          value={form.song_key}
                          onChange={(e) => setForm({ ...form, song_key: e.target.value })}
                          placeholder="G"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bpm">BPM</Label>
                        <Input
                          id="bpm"
                          inputMode="numeric"
                          value={form.bpm}
                          onChange={(e) =>
                            setForm({ ...form, bpm: e.target.value.replace(/\D/g, "") })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ccli">CCLI</Label>
                        <Input
                          id="ccli"
                          value={form.ccli}
                          onChange={(e) => setForm({ ...form, ccli: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="arrangement">Arranjo (ordem das seções)</Label>
                      <Input
                        id="arrangement"
                        value={form.arrangement}
                        onChange={(e) => setForm({ ...form, arrangement: e.target.value })}
                        placeholder="Verso 1, Refrão, Verso 2, Refrão"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="adoração, natal"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="notes">Observações para a equipe</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna direita: preview + personalização da seção */}
          <div className="flex min-h-0 flex-col gap-3">
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Palette className="size-3.5" /> Preview da seção
                </span>
                <span className="truncate">{activeSlide?.label ?? "—"}</span>
              </div>
              <div className="aspect-video">
                <SlideCanvas slide={activeSlide} theme={previewTheme} media={false} />
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 pr-3">
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs text-muted-foreground">Seção em edição</Label>
                  <Select value={activeKey ?? ""} onValueChange={setActiveKey}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma seção" />
                    </SelectTrigger>
                    <SelectContent>
                      {parsed.map((s) => (
                        <SelectItem key={sectionKey(s.label)} value={sectionKey(s.label)}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {activeKey ? (
                  <>
                    <Row label="Tom da seção">
                      <Select
                        value={activeConfig.songKey || "__none"}
                        onValueChange={(v) => patchSection({ songKey: v === "__none" ? "" : v })}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Herdar</SelectItem>
                          {KEYS.map((k) => (
                            <SelectItem key={k} value={k}>
                              {k}
                            </SelectItem>
                          ))}
                          {KEYS.map((k) => (
                            <SelectItem key={`${k}m`} value={`${k}m`}>
                              {k}m
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Row>

                    <Row label="Linhas por slide">
                      <Input
                        className="w-20"
                        inputMode="numeric"
                        value={activeConfig.linesPerSlide ? String(activeConfig.linesPerSlide) : ""}
                        placeholder="auto"
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/\D/g, ""));
                          patchSection({ linesPerSlide: n > 0 ? n : null });
                        }}
                      />
                    </Row>

                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Tema salvo como base</Label>
                      <Select
                        value={activeConfig.themeId ?? "__none"}
                        onValueChange={(v) => {
                          if (v === "__none") {
                            patchSection({ themeId: null, theme: {} });
                            return;
                          }
                          const found = themes.find((t) => t.id === v);
                          patchSection({
                            themeId: v,
                            theme: (found?.config ?? {}) as Partial<ThemeConfig>,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Tema atual da projeção</SelectItem>
                          {themes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 rounded-lg border border-border/60 p-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Type className="size-3.5" /> Ajustes visuais desta seção
                      </p>
                      <Row label="Cor de fundo">
                        <input
                          type="color"
                          className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
                          value={activeOverride.bg ?? previewTheme.bg}
                          onChange={(e) => patchOverride({ bg: e.target.value })}
                        />
                      </Row>
                      <Row label="Cor do texto">
                        <input
                          type="color"
                          className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
                          value={activeOverride.fg ?? previewTheme.fg}
                          onChange={(e) => patchOverride({ fg: e.target.value })}
                        />
                      </Row>
                      <Row label="Fonte">
                        <Select
                          value={activeOverride.fontFamily ?? previewTheme.fontFamily}
                          onValueChange={(v) => patchOverride({ fontFamily: v })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row
                        label={`Tamanho ${(activeOverride.fontSize ?? previewTheme.fontSize).toFixed(1)}`}
                      >
                        <Slider
                          className="w-36"
                          min={2}
                          max={12}
                          step={0.2}
                          value={[activeOverride.fontSize ?? previewTheme.fontSize]}
                          onValueChange={([v]) =>
                            patchOverride({ fontSize: v ?? previewTheme.fontSize })
                          }
                        />
                      </Row>
                      <Row label="Maiúsculas">
                        <Switch
                          checked={activeOverride.uppercase ?? previewTheme.uppercase}
                          onCheckedChange={(v) => patchOverride({ uppercase: v })}
                        />
                      </Row>
                      <Row label="Negrito">
                        <Switch
                          checked={activeOverride.bold ?? previewTheme.bold}
                          onCheckedChange={(v) => patchOverride({ bold: v })}
                        />
                      </Row>
                      <Row label={`Escurecer fundo ${activeOverride.overlay ?? previewTheme.overlay}%`}>
                        <Slider
                          className="w-36"
                          min={0}
                          max={100}
                          step={5}
                          value={[activeOverride.overlay ?? previewTheme.overlay]}
                          onValueChange={([v]) => patchOverride({ overlay: v ?? previewTheme.overlay })}
                        />
                      </Row>
                      <Button variant="ghost" size="sm" className="w-full" onClick={clearSection}>
                        <RotateCcw className="mr-1 size-3.5" /> Limpar personalização da seção
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Escreva a letra para gerar as seções e personalizá-las.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title.trim()}>
            {mutation.isPending ? "Salvando..." : "Salvar música"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
