import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Layers as LayersIcon, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  LOOP_KIND_OPTIONS,
  createLayer,
  type BlendMode,
  type LayerKind,
  type LoopKind,
  type ProjectionLayer,
  type ThemeConfig,
} from "@/lib/projection";

const BLEND_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
];

const KIND_OPTIONS: { value: LayerKind; label: string }[] = [
  { value: "color", label: "Cor" },
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "loop", label: "Loop animado" },
];

interface LayersPanelProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

export function LayersPanel({ theme, onChange }: LayersPanelProps) {
  const layers = theme.layers ?? [];
  const setLayers = (next: ProjectionLayer[]) => onChange({ ...theme, layers: next });
  const patch = (id: string, p: Partial<ProjectionLayer>) =>
    setLayers(layers.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    setLayers(next);
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, layerId: string) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada");
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("backgrounds").upload(path, file, { upsert: true });
      if (error) throw error;
      const signed = await supabase.storage.from("backgrounds").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (!signed.data?.signedUrl) throw new Error("Não foi possível gerar o link");
      patch(layerId, {
        url: signed.data.signedUrl,
        kind: file.type.startsWith("video") ? "video" : "image",
      });
      toast.success("Mídia adicionada à camada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-4 pb-6">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <LayersIcon className="size-3.5" /> Camadas (a letra fica sempre no topo)
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setLayers([...layers, createLayer({ name: `Camada ${layers.length + 1}` })])}
          >
            <Plus className="mr-1 size-3.5" /> Nova
          </Button>
        </div>

        {!layers.length ? (
          <p className="text-xs text-muted-foreground">
            Empilhe cores, imagens, vídeos e loops sobre o fundo e ajuste a opacidade e o blend de cada um.
          </p>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && uploadFor) void upload(file, uploadFor);
            e.target.value = "";
          }}
        />

        {/* topo da lista = camada mais à frente */}
        {[...layers]
          .reverse()
          .map((layer) => {
            const index = layers.findIndex((l) => l.id === layer.id);
            return (
              <div key={layer.id} className="space-y-3 rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-1">
                  <Input
                    className="h-8"
                    value={layer.name}
                    onChange={(e) => patch(layer.id, { name: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    title={layer.visible ? "Ocultar" : "Mostrar"}
                    onClick={() => patch(layer.id, { visible: !layer.visible })}
                  >
                    {layer.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Subir" onClick={() => move(index, 1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Descer" onClick={() => move(index, -1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remover"
                    onClick={() => setLayers(layers.filter((l) => l.id !== layer.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <Select value={layer.kind} onValueChange={(v) => patch(layer.id, { kind: v as LayerKind })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KIND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-[11px] text-muted-foreground">Blend</Label>
                    <Select value={layer.blend} onValueChange={(v) => patch(layer.id, { blend: v as BlendMode })}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BLEND_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {layer.kind === "color" ? (
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground">Cor</Label>
                    <Input
                      type="color"
                      className="h-8 w-16 p-1"
                      value={layer.color ?? "#000000"}
                      onChange={(e) => patch(layer.id, { color: e.target.value })}
                    />
                  </div>
                ) : null}

                {layer.kind === "image" || layer.kind === "video" ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        className="h-8"
                        value={layer.url ?? ""}
                        onChange={(e) => patch(layer.id, { url: e.target.value })}
                        placeholder="URL da mídia"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={uploading}
                        onClick={() => {
                          setUploadFor(layer.id);
                          inputRef.current?.click();
                        }}
                      >
                        <Upload className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={layer.fit ?? "cover"}
                        onValueChange={(v) => patch(layer.id, { fit: v as "cover" | "contain" })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cover">Preencher</SelectItem>
                          <SelectItem value="contain">Conter</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Label className="text-[11px] text-muted-foreground">Blur</Label>
                        <Slider
                          value={[layer.blur ?? 0]}
                          min={0}
                          max={40}
                          step={1}
                          onValueChange={([v]) => patch(layer.id, { blur: v ?? 0 })}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {layer.kind === "loop" ? (
                  <div className="space-y-2">
                    <Select
                      value={layer.loopKind ?? "gradient"}
                      onValueChange={(v) => patch(layer.id, { loopKind: v as LoopKind })}
                    >
                      <SelectTrigger className="h-8">
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
                    <div className="flex items-center gap-2">
                      {(layer.loopColors ?? []).map((color, i) => (
                        <Input
                          key={i}
                          type="color"
                          className="h-8 w-12 p-1"
                          value={color}
                          onChange={(e) => {
                            const next = [...(layer.loopColors ?? [])];
                            next[i] = e.target.value;
                            patch(layer.id, { loopColors: next });
                          }}
                        />
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch(layer.id, { loopColors: [...(layer.loopColors ?? []), "#ffffff"] })}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      {(layer.loopColors ?? []).length > 1 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => patch(layer.id, { loopColors: (layer.loopColors ?? []).slice(0, -1) })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Velocidade {(layer.loopSpeed ?? 1).toFixed(1)}x
                      </Label>
                      <Slider
                        value={[layer.loopSpeed ?? 1]}
                        min={0.1}
                        max={3}
                        step={0.1}
                        onValueChange={([v]) => patch(layer.id, { loopSpeed: v ?? 1 })}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-muted-foreground">Opacidade {layer.opacity}%</Label>
                  <Slider
                    value={[layer.opacity]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => patch(layer.id, { opacity: v ?? 100 })}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </ScrollArea>
  );
}
