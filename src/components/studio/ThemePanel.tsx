import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Trash2 } from "lucide-react";
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
import { deleteTheme, listThemes, saveTheme, type JsonObject } from "@/lib/library.functions";
import { DEFAULT_THEME, FONT_OPTIONS, type ThemeConfig } from "@/lib/projection";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const fetchThemes = useServerFn(listThemes);
  const persist = useServerFn(saveTheme);
  const remove = useServerFn(deleteTheme);

  const { data: themes = [] } = useQuery({ queryKey: ["themes"], queryFn: () => fetchThemes() });

  const save = useMutation({
    mutationFn: () => persist({ data: { name, config: theme as unknown as JsonObject } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Tema salvo");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = (patch: Partial<ThemeConfig>) => onChange({ ...theme, ...patch });

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-4 pb-6">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Temas salvos</Label>
          <div className="flex gap-2">
            <Select
              onValueChange={(id) => {
                const found = themes.find((t) => t.id === id);
                if (found) onChange({ ...DEFAULT_THEME, ...(found.config as Partial<ThemeConfig>) });
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Carregar tema" />
              </SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {themes.length ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={async () => {
                  const last = themes[themes.length - 1]!;
                  await remove({ data: { id: last.id } });
                  queryClient.invalidateQueries({ queryKey: ["themes"] });
                }}
                title="Excluir último tema salvo"
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do tema" />
            <Button size="icon" onClick={() => save.mutate()} title="Salvar tema atual">
              <Save className="size-4" />
            </Button>
          </div>
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
              </SelectContent>
            </Select>
          </Row>

          {theme.bgKind !== "none" ? (
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
