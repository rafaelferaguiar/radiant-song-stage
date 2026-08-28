import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { SlideCanvas } from "@/components/SlideCanvas";
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
import { deleteTheme, listThemes, saveTheme, type JsonObject } from "@/lib/library.functions";
import {
  DEFAULT_THEME,
  FONT_OPTIONS,
  LOOP_KIND_OPTIONS,
  LOOP_PRESETS,
  type BlendMode,
  type LoopKind,
  type ProjectionSlide,
  type ThemeConfig,
} from "@/lib/projection";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";

const SAMPLE_SLIDE: ProjectionSlide = {
  id: "theme-preview",
  kind: "lyrics",
  title: "Grande é o Senhor",
  lines: ["Grande é o Senhor", "e muito digno de louvor"],
  footer: "Salmos 48:1",
};

interface ThemePanelProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
  linesPerSlide: number;
  onLinesPerSlideChange: (value: number) => void;
  versesPerSlide: number;
  onVersesPerSlideChange: (value: number) => void;
  logoText: string;
  onLogoTextChange: (value: string) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function parseColors(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^#?[0-9a-fA-F]{6}$/.test(s))
    .map((s) => (s.startsWith("#") ? s : `#${s}`));
}

function formatColors(colors: string[]) {
  return colors.join(", ");
}

export function ThemePanel({
  theme,
  onChange,
  linesPerSlide,
  onLinesPerSlideChange,
  versesPerSlide,
  onVersesPerSlideChange,
  logoText,
  onLogoTextChange,
}: ThemePanelProps) {
  const [name, setName] = useState("Tema principal");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const fetchThemes = useServerFn(listThemes);
  const persist = useServerFn(saveTheme);
  const remove = useServerFn(deleteTheme);

  const { data: themes = [] } = useQuery({ queryKey: ["themes"], queryFn: () => fetchThemes() });

  const save = useMutation({
    mutationFn: () =>
      persist({ data: { id: editingId, name, config: theme as unknown as JsonObject } }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      setSelectedId(row.id);
      setEditingId(row.id);
      toast.success(editingId ? "Tema atualizado" : "Tema criado");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = (patch: Partial<ThemeConfig>) => onChange({ ...theme, ...patch });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadBackground = async (file: File) => {
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Faça login novamente para enviar arquivos");
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("backgrounds").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const signed = await supabase.storage.from("backgrounds").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Falha ao gerar link");
      set({ bgUrl: signed.data.signedUrl, bgKind: file.type.startsWith("video") ? "video" : "image" });
      toast.success("Fundo enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-4 pb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Temas salvos</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setSelectedId(null);
                setEditingId(null);
                setName("Novo tema");
              }}
            >
              <Plus className="size-3.5" /> Novo
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {themes.map((t) => {
              const config = { ...DEFAULT_THEME, ...(t.config as Partial<ThemeConfig>) };
              const active = selectedId === t.id;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border transition-colors",
                    active ? "border-primary ring-1 ring-primary/50" : "border-border/60 hover:border-primary/50",
                  )}
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => {
                      setSelectedId(t.id);
                      setEditingId(null);
                      setName(t.name);
                      onChange(config);
                    }}
                    title={`Usar “${t.name}”`}
                  >
                    <div className="aspect-video">
                      <SlideCanvas slide={SAMPLE_SLIDE} theme={config} media={false} />
                    </div>
                    <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{t.name}</p>
                  </button>
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-6"
                      title="Editar tema"
                      onClick={() => {
                        setSelectedId(t.id);
                        setEditingId(t.id);
                        setName(t.name);
                        onChange(config);
                      }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-6 text-destructive"
                      title="Excluir tema"
                      onClick={async () => {
                        await remove({ data: { id: t.id } });
                        if (selectedId === t.id) setSelectedId(null);
                        if (editingId === t.id) setEditingId(null);
                        queryClient.invalidateQueries({ queryKey: ["themes"] });
                        toast.success("Tema excluído");
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {!themes.length ? (
              <p className="col-span-2 rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                Ajuste o tema abaixo e salve para criar seu primeiro preset.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do tema" />
            <Button
              size="icon"
              disabled={save.isPending}
              onClick={() => save.mutate()}
              title={editingId ? "Salvar alterações" : "Salvar como novo tema"}
            >
              <Save className="size-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {editingId
              ? "Editando o tema selecionado — as mudanças abaixo serão gravadas nele."
              : "Salvar cria um novo tema com os ajustes atuais."}
          </p>
        </div>

        <div className="border-t border-border/60 pt-2">
          <Row label="Fonte">
            <Select value={theme.fontFamily} onValueChange={(v) => set({ fontFamily: v })}>
              <SelectTrigger className="w-44">
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
          <Row label={`Tamanho ${theme.fontSize.toFixed(1)}`}>
            <Slider
              className="w-40"
              min={2}
              max={10}
              step={0.1}
              value={[theme.fontSize]}
              onValueChange={([v]) => set({ fontSize: v ?? theme.fontSize })}
            />
          </Row>
          <Row label={`Entrelinha ${theme.lineHeight.toFixed(2)}`}>
            <Slider
              className="w-40"
              min={0.9}
              max={2}
              step={0.05}
              value={[theme.lineHeight]}
              onValueChange={([v]) => set({ lineHeight: v ?? theme.lineHeight })}
            />
          </Row>
          <Row label={`Margem ${theme.padding}%`}>
            <Slider
              className="w-40"
              min={0}
              max={18}
              step={1}
              value={[theme.padding]}
              onValueChange={([v]) => set({ padding: v ?? theme.padding })}
            />
          </Row>
          <Row label={`Escurecer fundo ${theme.overlay}%`}>
            <Slider
              className="w-40"
              min={0}
              max={100}
              step={5}
              value={[theme.overlay]}
              onValueChange={([v]) => set({ overlay: v ?? theme.overlay })}
            />
          </Row>
        </div>

        <div className="border-t border-border/60 pt-2">
          <Row label="Cor de fundo">
            <input
              type="color"
              value={theme.bg}
              onChange={(e) => set({ bg: e.target.value })}
              className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
            />
          </Row>
          <Row label="Cor do texto">
            <input
              type="color"
              value={theme.fg}
              onChange={(e) => set({ fg: e.target.value })}
              className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
            />
          </Row>
          <Row label="Cor de destaque">
            <input
              type="color"
              value={theme.accentFg}
              onChange={(e) => set({ accentFg: e.target.value })}
              className="h-8 w-14 cursor-pointer rounded border border-border bg-transparent"
            />
          </Row>
        </div>

        <div className="space-y-2 border-t border-border/60 pt-2">
          <Row label="Fundo">
            <Select
              value={theme.bgKind}
              onValueChange={(v) => set({ bgKind: v as ThemeConfig["bgKind"] })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Cor sólida</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="loop">Loop animado</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          {theme.bgKind !== "none" && theme.bgKind !== "loop" ? (
            <div className="space-y-2">
              <Input
                value={theme.bgUrl}
                onChange={(e) => set({ bgUrl: e.target.value })}
                placeholder={theme.bgKind === "video" ? "URL do vídeo (mp4/webm)" : "URL da imagem"}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4" /> {uploading ? "Enviando…" : "Enviar arquivo"}
                </Button>
                {theme.bgUrl ? (
                  <Button variant="ghost" size="icon" onClick={() => set({ bgUrl: "" })} title="Remover fundo">
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={theme.bgKind === "video" ? "video/*" : "image/*"}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadBackground(file);
                }}
              />
              <Row label="Ajuste">
                <Select value={theme.bgFit} onValueChange={(v) => set({ bgFit: v as ThemeConfig["bgFit"] })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">Preencher</SelectItem>
                    <SelectItem value="contain">Conter</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label={`Desfoque ${theme.bgBlur}px`}>
                <Slider
                  className="w-40"
                  min={0}
                  max={30}
                  step={1}
                  value={[theme.bgBlur]}
                  onValueChange={([v]) => set({ bgBlur: v ?? theme.bgBlur })}
                />
              </Row>
              {theme.bgKind === "video" ? (
                <>
                  <Row label="Loop contínuo">
                    <Switch checked={theme.bgLoop} onCheckedChange={(v) => set({ bgLoop: v })} />
                  </Row>
                  <Row label="Sem áudio (mudo)">
                    <Switch checked={theme.bgMuted} onCheckedChange={(v) => set({ bgMuted: v })} />
                  </Row>
                  <Row label={`Velocidade ${theme.bgSpeed.toFixed(2)}x`}>
                    <Slider
                      className="w-40"
                      min={0.25}
                      max={2}
                      step={0.05}
                      value={[theme.bgSpeed]}
                      onValueChange={([v]) => set({ bgSpeed: v ?? theme.bgSpeed })}
                    />
                  </Row>
                </>
              ) : null}
            </div>
          ) : null}

          {theme.bgKind === "loop" ? (
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/loops">
                  <Sparkles className="mr-1 size-3.5" /> Abrir criador de loops
                </Link>
              </Button>
              <div className="grid grid-cols-3 gap-1.5">
                {LOOP_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => set(preset.config)}
                    className="relative overflow-hidden rounded border border-border/60 bg-card hover:border-primary/60"
                  >
                    <div className="aspect-video">
                      <SlideCanvas
                        slide={SAMPLE_SLIDE}
                        theme={{ ...theme, ...preset.config }}
                        media={false}
                      />
                    </div>
                    <span className="block px-1.5 py-1 text-[10px] text-muted-foreground">{preset.name}</span>
                  </button>
                ))}
              </div>

              <Row label="Tipo de loop">
                <Select
                  value={theme.loopKind}
                  onValueChange={(v) => set({ loopKind: v as LoopKind })}
                >
                  <SelectTrigger className="w-32">
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
              </Row>

              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">Cores (hex separadas por vírgula)</Label>
                <Input
                  value={formatColors(theme.loopColors)}
                  onChange={(e) => {
                    const colors = parseColors(e.target.value);
                    if (colors.length) set({ loopColors: colors });
                  }}
                  placeholder="#1e3a8a, #7c2d12"
                />
                <div className="flex flex-wrap gap-1">
                  {theme.loopColors.map((c) => (
                    <span
                      key={c}
                      className="inline-block size-4 rounded-full border border-border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <Row label={`Velocidade ${theme.loopSpeed.toFixed(2)}x`}>
                <Slider
                  className="w-40"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={[theme.loopSpeed]}
                  onValueChange={([v]) => set({ loopSpeed: v ?? theme.loopSpeed })}
                />
              </Row>
              <Row label={`Escurecer loop ${theme.loopOverlay}%`}>
                <Slider
                  className="w-40"
                  min={0}
                  max={100}
                  step={5}
                  value={[theme.loopOverlay]}
                  onValueChange={([v]) => set({ loopOverlay: v ?? theme.loopOverlay })}
                />
              </Row>
              <Row label="Mesclagem">
                <Select
                  value={theme.loopBlend}
                  onValueChange={(v) => set({ loopBlend: v as BlendMode })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="multiply">Multiplicar</SelectItem>
                    <SelectItem value="screen">Tela</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 pt-2">
          <Row label="Alinhamento">
            <Select value={theme.align} onValueChange={(v) => set({ align: v as ThemeConfig["align"] })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Centralizado</SelectItem>
                <SelectItem value="left">À esquerda</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Posição vertical">
            <Select value={theme.vAlign} onValueChange={(v) => set({ vAlign: v as ThemeConfig["vAlign"] })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="bottom">Rodapé</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Transição">
            <Select
              value={theme.transition}
              onValueChange={(v) => set({ transition: v as ThemeConfig["transition"] })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
                <SelectItem value="none">Nenhuma</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Negrito">
            <Switch checked={theme.bold} onCheckedChange={(v) => set({ bold: v })} />
          </Row>
          <Row label="MAIÚSCULAS">
            <Switch checked={theme.uppercase} onCheckedChange={(v) => set({ uppercase: v })} />
          </Row>
          <Row label="Sombra no texto">
            <Switch checked={theme.shadow} onCheckedChange={(v) => set({ shadow: v })} />
          </Row>
          <Row label="Mostrar título">
            <Switch checked={theme.showTitle} onCheckedChange={(v) => set({ showTitle: v })} />
          </Row>
          <Row label="Mostrar rodapé/referência">
            <Switch checked={theme.showFooter} onCheckedChange={(v) => set({ showFooter: v })} />
          </Row>
        </div>

        <div className="border-t border-border/60 pt-2">
          <Row label={`Linhas por slide (letras): ${linesPerSlide}`}>
            <Slider
              className="w-32"
              min={1}
              max={8}
              step={1}
              value={[linesPerSlide]}
              onValueChange={([v]) => onLinesPerSlideChange(v ?? linesPerSlide)}
            />
          </Row>
          <Row label={`Versículos por slide: ${versesPerSlide}`}>
            <Slider
              className="w-32"
              min={1}
              max={4}
              step={1}
              value={[versesPerSlide]}
              onValueChange={([v]) => onVersesPerSlideChange(v ?? versesPerSlide)}
            />
          </Row>
          <div className="space-y-1.5 pt-1.5">
            <Label className="text-xs text-muted-foreground">Texto da tela de abertura (logo)</Label>
            <Input value={logoText} onChange={(e) => onLogoTextChange(e.target.value)} placeholder="Bem-vindos" />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
