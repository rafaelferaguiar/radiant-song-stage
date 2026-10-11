import { useRef, useState, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Copy,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  MoreVertical,
  Music4,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Unlock,
  Upload,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BLEND_MODE_OPTIONS,
  createLayer,
  createLayerFromLoop,
  createLayerFromMedia,
  LOOP_KIND_OPTIONS,
  LOOP_PRESETS,
  type BlendMode,
  type LayerKind,
  type LoopKind,
  type ProjectionLayer,
  type ThemeConfig,
} from "@/lib/projection";
import { getStoredMedia, uploadMediaFile, type MediaItem } from "@/lib/media";
import { cn } from "@/lib/utils";

const KIND_OPTIONS: { value: LayerKind; label: string; icon: any }[] = [
  { value: "lyrics", label: "Letra da Música / Apresentação", icon: Music4 },
  { value: "color", label: "Cor sólida / Overlay", icon: Palette },
  { value: "image", label: "Imagem / Foto", icon: ImageIcon },
  { value: "video", label: "Vídeo", icon: Video },
  { value: "loop", label: "Loop animado", icon: Sparkles },
  { value: "text", label: "Texto / Marca d'água", icon: Type },
  { value: "camera", label: "Câmera (webcam / captura)", icon: Camera },
  { value: "browser", label: "Browser Source (URL ao vivo)", icon: Globe },
];

interface LayersPanelProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

// Hook: enumerate available camera devices
function useCameraDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devs) => setDevices(devs.filter((d) => d.kind === "videoinput")))
      .catch(() => setDevices([]));
  }, []);
  return devices;
}

export function LayersPanel({ theme, onChange }: LayersPanelProps) {
  const layers = theme.layers ?? [];
  const setLayers = (next: ProjectionLayer[]) => onChange({ ...theme, layers: next });

  const patch = (id: string, p: Partial<ProjectionLayer>) =>
    setLayers(layers.map((l) => (l.id === id ? { ...l, ...p } : l)));

  // Drag & Drop State for layers reordering and external drops
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);

  // File Upload State
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Media Library Quick Picker Dialog/State
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null);
  const storedMedia = getStoredMedia();

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= layers.length) return;
    const next = [...layers];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    setLayers(next);
  };

  const duplicateLayer = (layer: ProjectionLayer) => {
    const copy: ProjectionLayer = {
      ...layer,
      id: `layer-${Math.random().toString(36).slice(2, 9)}`,
      name: `${layer.name} (cópia)`,
    };
    const index = layers.findIndex((l) => l.id === layer.id);
    const next = [...layers];
    next.splice(index + 1, 0, copy);
    setLayers(next);
    toast.success("Camada duplicada");
  };

  const upload = async (file: File, layerId?: string) => {
    setUploading(true);
    try {
      const item = await uploadMediaFile(file);
      if (layerId) {
        patch(layerId, {
          url: item.url,
          kind: item.kind,
          name: file.name.replace(/\.[^/.]+$/, ""),
        });
      } else {
        const newLayer = createLayerFromMedia({
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: item.url,
          kind: item.kind,
        });
        setLayers([...layers, newLayer]);
      }
      toast.success("Mídia carregada na camada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  // Reorder layer drop
  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLayerId(id);
    e.dataTransfer.setData("application/x-rfpresenter-layer-id", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleLayerDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingExternal) setIsDraggingExternal(true);
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingExternal(false);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingExternal(false);
    setDragOverIndex(null);

    // 1. Reordering existing layer
    const sourceLayerId = e.dataTransfer.getData("application/x-rfpresenter-layer-id") || draggedLayerId;
    if (sourceLayerId) {
      const fromIndex = layers.findIndex((l) => l.id === sourceLayerId);
      if (fromIndex >= 0 && targetIndex !== undefined && fromIndex !== targetIndex) {
        const next = [...layers];
        const [moved] = next.splice(fromIndex, 1);
        if (moved) {
          next.splice(targetIndex, 0, moved);
          setLayers(next);
        }
      }
      setDraggedLayerId(null);
      return;
    }

    // 2. Dropping a Media Item from MediaPanel
    const rawMediaData = e.dataTransfer.getData("application/x-rfpresenter-media");
    if (rawMediaData) {
      try {
        const media = JSON.parse(rawMediaData) as MediaItem;
        const newLayer = createLayerFromMedia(media);
        if (targetIndex !== undefined) {
          const next = [...layers];
          next.splice(targetIndex, 0, newLayer);
          setLayers(next);
        } else {
          setLayers([...layers, newLayer]);
        }
        toast.success(`Camada "${media.name}" adicionada`);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    // 3. Dropping a Loop preset
    const rawLoopData = e.dataTransfer.getData("application/x-rfpresenter-loop");
    if (rawLoopData) {
      try {
        const loop = JSON.parse(rawLoopData) as { name: string; kind: LoopKind; colors: string[]; speed?: number };
        const newLayer = createLayerFromLoop(loop);
        if (targetIndex !== undefined) {
          const next = [...layers];
          next.splice(targetIndex, 0, newLayer);
          setLayers(next);
        } else {
          setLayers([...layers, newLayer]);
        }
        toast.success(`Loop "${loop.name}" adicionado como camada`);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    // 4. Dropping files from OS (Desktop / Explorer)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov)$/i.test(f.name)
      );
      if (!files.length) {
        toast.error("Formato de arquivo não suportado");
        return;
      }
      for (const file of files) {
        await upload(file);
      }
    }
  };

  // We display layers reversed so that the top item on screen matches the visual top layer!
  const reversedLayers = [...layers].map((layer, originalIndex) => ({ layer, originalIndex })).reverse();

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div
        className={cn(
          "space-y-4 pb-6 transition-colors",
          isDraggingExternal && "rounded-lg bg-primary/5 ring-2 ring-primary/40 ring-offset-2",
        )}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={(e) => void handleDrop(e)}
      >
        {/* Header & Quick Add Menu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <LayersIcon className="size-3.5 text-primary" /> Camadas ({layers.length})
            </span>
            <span className="text-[10px] text-muted-foreground">O topo da lista fica acima na tela</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="default" className="h-8 gap-1.5 shadow-sm">
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Inserir Nova Camada</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setLayers([
                    ...layers,
                    createLayer({
                      name: "Letra da Música / Apresentação",
                      kind: "lyrics",
                    }),
                  ]);
                  toast.success("Camada de letra adicionada");
                }}
              >
                <Music4 className="mr-2 size-4 text-primary" /> Letra da Música / Apresentação
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setUploadFor(null);
                  inputRef.current?.click();
                }}
              >
                <Upload className="mr-2 size-4 text-primary" /> Enviar Foto ou Vídeo
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  const media = storedMedia[0];
                  if (media) {
                    setLayers([...layers, createLayerFromMedia(media)]);
                    toast.success("Foto da biblioteca inserida");
                  } else {
                    toast.error("Nenhuma mídia salva na biblioteca");
                  }
                }}
              >
                <ImageIcon className="mr-2 size-4 text-blue-400" /> Foto da Biblioteca
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  const preset = LOOP_PRESETS[0] ?? {
                    name: "Worship Blue",
                    config: { loopKind: "gradient", loopColors: ["#0f172a", "#1e40af"], loopSpeed: 0.8 },
                  };
                  setLayers([
                    ...layers,
                    createLayerFromLoop({
                      name: preset.name,
                      kind: (preset.config.loopKind as LoopKind) || "gradient",
                      colors: preset.config.loopColors || ["#0f172a", "#1e40af"],
                      speed: preset.config.loopSpeed || 0.8,
                    }),
                  ]);
                  toast.success("Loop animado inserido");
                }}
              >
                <Sparkles className="mr-2 size-4 text-amber-400" /> Loop Animado
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setLayers([
                    ...layers,
                    createLayer({
                      name: "Texto Sobreposto",
                      kind: "text",
                      text: "Culto de Celebração",
                      position: "bottom",
                      fontSize: 2.8,
                    }),
                  ]);
                  toast.success("Camada de texto inserida");
                }}
              >
                <Type className="mr-2 size-4 text-emerald-400" /> Texto / Marca d'água
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setLayers([
                    ...layers,
                    createLayer({
                      name: "Câmera ao Vivo",
                      kind: "camera",
                      cameraDeviceId: "",
                      cameraMirrored: false,
                      opacity: 100,
                      blend: "normal",
                    }),
                  ]);
                  toast.success("Camada de câmera adicionada");
                }}
              >
                <Camera className="mr-2 size-4 text-cyan-400" /> Câmera (webcam)
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setLayers([
                    ...layers,
                    createLayer({
                      name: "Browser Source",
                      kind: "browser",
                      browserUrl: "https://",
                      opacity: 100,
                      blend: "normal",
                    }),
                  ]);
                  toast.success("Camada de browser source adicionada");
                }}
              >
                <Globe className="mr-2 size-4 text-violet-400" /> Browser Source (URL)
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() =>
                  setLayers([
                    ...layers,
                    createLayer({
                      name: `Cor ${layers.length + 1}`,
                      kind: "color",
                      color: "#000000",
                      opacity: 40,
                    }),
                  ])
                }
              >
                <Palette className="mr-2 size-4 text-purple-400" /> Cor / Overlay Escuro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dropzone helper banner */}
        <div
          className={cn(
            "rounded-lg border border-dashed border-border/80 bg-muted/20 p-2.5 text-center text-xs transition-colors",
            isDraggingExternal && "border-primary bg-primary/10 text-primary font-medium",
          )}
        >
          <p className="text-[11px] text-muted-foreground">
            💡 Dica: <strong className="text-foreground">Arraste e solte</strong> fotos, vídeos ou loops aqui para criar ou reordenar camadas.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file, uploadFor ?? undefined);
            e.target.value = "";
          }}
        />

        {!layers.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-8 text-center">
            <LayersIcon className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">Nenhuma camada ativa</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione fotos, vídeos, loops e cores para compor o visual do slide.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setLayers([createLayer({ name: "Fundo Escuro", color: "#000000", opacity: 50 })])}
            >
              <Plus className="mr-1.5 size-3.5" /> Criar primeira camada
            </Button>
          </div>
        ) : null}

        {/* Layers Stack List */}
        <div className="space-y-2.5">
          {reversedLayers.map(({ layer, originalIndex }) => {
            const isDraggingThis = draggedLayerId === layer.id;
            const isDropTarget = dragOverIndex === originalIndex;
            const KindIcon = KIND_OPTIONS.find((k) => k.value === layer.kind)?.icon ?? Palette;

            return (
              <div
                key={layer.id}
                draggable={!layer.locked}
                onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                onDragOver={(e) => handleLayerDragOver(e, originalIndex)}
                onDrop={(e) => void handleDrop(e, originalIndex)}
                className={cn(
                  "relative space-y-3 rounded-lg border bg-card/70 p-3 shadow-sm transition-all",
                  layer.visible ? "border-border/80" : "border-border/40 opacity-60",
                  isDraggingThis && "opacity-40 ring-2 ring-primary/50",
                  isDropTarget && "border-primary bg-primary/10 ring-2 ring-primary",
                )}
              >
                {/* Drag Indicator Top Line */}
                {isDropTarget && (
                  <div className="absolute -top-1.5 left-0 right-0 h-1 rounded-full bg-primary shadow-sm" />
                )}

                {/* Layer Header */}
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "cursor-grab p-0.5 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing",
                      layer.locked && "cursor-not-allowed opacity-30",
                    )}
                    title={layer.locked ? "Camada bloqueada" : "Arraste para reordenar"}
                  >
                    <GripVertical className="size-4" />
                  </div>

                  {/* Thumbnail / Kind Icon Badge */}
                  <div
                    className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border border-border/60 bg-muted/60"
                    title={`Tipo: ${layer.kind}`}
                  >
                    {layer.kind === "lyrics" ? (
                      <Music4 className="size-3.5 text-primary" />
                    ) : layer.kind === "color" ? (
                      <div className="size-full" style={{ backgroundColor: layer.color ?? "#000" }} />
                    ) : layer.kind === "image" && layer.url ? (
                      <img src={layer.url} alt="" className="size-full object-cover" />
                    ) : layer.kind === "video" && layer.url ? (
                      <video src={`${layer.url}#t=0.1`} className="size-full object-cover" muted />
                    ) : (
                      <KindIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <Input
                      className="h-8 flex-1 text-xs font-medium"
                      value={layer.name}
                      disabled={layer.locked}
                      onChange={(e) => patch(layer.id, { name: e.target.value })}
                    />
                    {layer.kind === "lyrics" && (
                      <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        AO VIVO
                      </span>
                    )}
                  </div>

                  {/* Quick Controls */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    title={layer.visible ? "Ocultar camada" : "Mostrar camada"}
                    onClick={() => patch(layer.id, { visible: !layer.visible })}
                  >
                    {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5 text-destructive" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                    title={layer.locked ? "Desbloquear" : "Bloquear contra edição"}
                    onClick={() => patch(layer.id, { locked: !layer.locked })}
                  >
                    {layer.locked ? <Lock className="size-3.5 text-amber-500" /> : <Unlock className="size-3.5" />}
                  </Button>

                  {/* More actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                        title="Mais ações"
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => move(originalIndex, 1)}>
                        <ArrowUp className="mr-2 size-3.5" /> Mover para cima
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => move(originalIndex, -1)}>
                        <ArrowDown className="mr-2 size-3.5" /> Mover para baixo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => duplicateLayer(layer)}>
                        <Copy className="mr-2 size-3.5" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setLayers(layers.filter((l) => l.id !== layer.id))}
                      >
                        <Trash2 className="mr-2 size-3.5" /> Excluir camada
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Layer Body Configuration */}
                {!layer.locked && (
                  <div className="space-y-3 pt-1">
                    {/* Base layer settings: stacked so long type names stay readable. */}
                    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
                      <div className="grid gap-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo de camada</Label>
                        <Select
                          value={layer.kind}
                          onValueChange={(v) => patch(layer.id, { kind: v as LayerKind })}
                        >
                          <SelectTrigger className="h-8 text-xs">
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

                      <div className="grid gap-1 border-t border-border/50 pt-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo de mesclagem</Label>
                          <span className="text-[10px] text-muted-foreground">Como ela aparece sobre as outras</span>
                        </div>
                        <Select
                          value={layer.blend}
                          onValueChange={(v) => patch(layer.id, { blend: v as BlendMode })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLEND_MODE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Specific Controls: Lyrics / Presentation */}
                    {layer.kind === "lyrics" ? (
                      <div className="space-y-1 rounded-md border border-primary/20 bg-primary/5 p-2">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Music4 className="size-3.5 text-primary" /> Letra da Música & Conteúdo Ao Vivo
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Esta camada representa o texto da música transmitida. Ocultar esta camada pelo botão de olho desativa o texto na tela mantendo vídeos e fundos tocando.
                        </p>
                      </div>
                    ) : null}

                    {/* Specific Controls: Color */}
                    {layer.kind === "color" ? (
                      <div className="flex items-center gap-2 rounded-md bg-muted/30 p-2">
                        <Label className="text-xs text-muted-foreground">Cor da camada</Label>
                        <Input
                          type="color"
                          className="h-7 w-12 cursor-pointer p-0.5"
                          value={layer.color ?? "#000000"}
                          onChange={(e) => patch(layer.id, { color: e.target.value })}
                        />
                        <Input
                          type="text"
                          className="h-7 w-24 text-xs font-mono"
                          value={layer.color ?? "#000000"}
                          onChange={(e) => patch(layer.id, { color: e.target.value })}
                        />
                      </div>
                    ) : null}

                    {/* Specific Controls: Image / Video */}
                    {layer.kind === "image" || layer.kind === "video" ? (
                      <div className="space-y-2 rounded-md bg-muted/30 p-2">
                        <div className="flex gap-1.5">
                          <Input
                            className="h-7 flex-1 text-xs"
                            value={layer.url ?? ""}
                            onChange={(e) => patch(layer.id, { url: e.target.value })}
                            placeholder="URL da mídia (https://...)"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2"
                            disabled={uploading}
                            title="Fazer upload de arquivo"
                            onClick={() => {
                              setUploadFor(layer.id);
                              inputRef.current?.click();
                            }}
                          >
                            <Upload className="size-3.5" />
                          </Button>

                          {/* Quick Select from Media Library */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 px-2" title="Escolher da Biblioteca">
                                <ImageIcon className="size-3.5 text-primary" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-64 w-60 overflow-y-auto">
                              <DropdownMenuLabel className="text-xs">Mídias Salvas</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {storedMedia.map((m) => (
                                <DropdownMenuItem
                                  key={m.id}
                                  onClick={() =>
                                    patch(layer.id, {
                                      url: m.url,
                                      kind: m.kind,
                                      name: m.name,
                                    })
                                  }
                                  className="gap-2 text-xs"
                                >
                                  <div className="size-5 shrink-0 overflow-hidden rounded bg-black">
                                    <img src={m.url} alt="" className="size-full object-cover" />
                                  </div>
                                  <span className="truncate">{m.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-[10px] text-muted-foreground">Ajuste de Tela</Label>
                            <Select
                              value={layer.fit ?? "cover"}
                              onValueChange={(v) => patch(layer.id, { fit: v as "cover" | "contain" | "fill" })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">Preencher (Cover)</SelectItem>
                                <SelectItem value="contain">Conter (Contain)</SelectItem>
                                <SelectItem value="fill">Esticar (Fill)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Desfoque (Blur)</span>
                              <span>{layer.blur ?? 0}px</span>
                            </div>
                            <Slider
                              value={[layer.blur ?? 0]}
                              min={0}
                              max={40}
                              step={1}
                              onValueChange={([v]) => patch(layer.id, { blur: v ?? 0 })}
                            />
                          </div>
                        </div>

                        {layer.kind === "video" && (
                          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
                            <div className="flex items-center gap-2">
                              <Button
                                variant={layer.videoMuted !== false ? "secondary" : "default"}
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => patch(layer.id, { videoMuted: layer.videoMuted === false ? true : false })}
                              >
                                {layer.videoMuted !== false ? (
                                  <>
                                    <VolumeX className="mr-1 size-3" /> Mudo
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="mr-1 size-3" /> Áudio
                                  </>
                                )}
                              </Button>

                              <div className="flex items-center gap-1">
                                <Switch
                                  id={`loop-${layer.id}`}
                                  checked={layer.videoLoop !== false}
                                  onCheckedChange={(checked) => patch(layer.id, { videoLoop: checked })}
                                />
                                <Label htmlFor={`loop-${layer.id}`} className="text-[10px] text-muted-foreground">
                                  Repetir (Loop)
                                </Label>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">{(layer.videoSpeed ?? 1).toFixed(1)}x</span>
                              <Slider
                                className="w-16"
                                value={[layer.videoSpeed ?? 1]}
                                min={0.2}
                                max={2.5}
                                step={0.1}
                                onValueChange={([v]) => patch(layer.id, { videoSpeed: v ?? 1 })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Specific Controls: Loop Animado */}
                    {layer.kind === "loop" ? (
                      <div className="space-y-2 rounded-md bg-muted/30 p-2">
                        <div className="grid gap-1">
                          <Label className="text-[10px] text-muted-foreground">Estilo do Loop</Label>
                          <Select
                            value={layer.loopKind ?? "gradient"}
                            onValueChange={(v) => patch(layer.id, { loopKind: v as LoopKind })}
                          >
                            <SelectTrigger className="h-7 text-xs">
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

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Paleta de Cores</Label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(layer.loopColors ?? ["#1e40af", "#7c2d12"]).map((color, i) => (
                              <Input
                                key={i}
                                type="color"
                                className="size-7 cursor-pointer rounded p-0.5"
                                value={color}
                                onChange={(e) => {
                                  const next = [...(layer.loopColors ?? ["#1e40af", "#7c2d12"])];
                                  next[i] = e.target.value;
                                  patch(layer.id, { loopColors: next });
                                }}
                              />
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="size-7 p-0"
                              title="Adicionar cor ao loop"
                              onClick={() => patch(layer.id, { loopColors: [...(layer.loopColors ?? ["#1e40af"]), "#38bdf8"] })}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                            {(layer.loopColors ?? []).length > 1 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Remover última cor"
                                onClick={() => patch(layer.id, { loopColors: (layer.loopColors ?? []).slice(0, -1) })}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Velocidade</span>
                            <span>{(layer.loopSpeed ?? 1).toFixed(1)}x</span>
                          </div>
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

                    {/* Specific Controls: Text Overlay */}
                    {layer.kind === "text" ? (
                      <div className="space-y-2 rounded-md bg-muted/30 p-2">
                        <div className="grid gap-1">
                          <Label className="text-[10px] text-muted-foreground">Texto a exibir</Label>
                          <Input
                            className="h-7 text-xs"
                            value={layer.text ?? ""}
                            onChange={(e) => patch(layer.id, { text: e.target.value })}
                            placeholder="Ex: Igreja Local · Ao Vivo"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1">
                            <Label className="text-[10px] text-muted-foreground">Posição Vertical</Label>
                            <Select
                              value={layer.position ?? "bottom"}
                              onValueChange={(v) => patch(layer.id, { position: v as "top" | "center" | "bottom" })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Topo</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="bottom">Rodapé</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <Label className="text-[10px] text-muted-foreground">Alinhamento</Label>
                            <Select
                              value={layer.textAlign ?? "center"}
                              onValueChange={(v) => patch(layer.id, { textAlign: v as "left" | "center" | "right" })}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Esquerda</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="right">Direita</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-muted-foreground">Cor</Label>
                            <Input
                              type="color"
                              className="size-6 p-0.5"
                              value={layer.textColor ?? "#ffffff"}
                              onChange={(e) => patch(layer.id, { textColor: e.target.value })}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-[10px] text-muted-foreground">Fundo</Label>
                            <Input
                              type="color"
                              className="size-6 p-0.5"
                              value={layer.textBgColor ?? "#000000"}
                              onChange={(e) => patch(layer.id, { textBgColor: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-1 items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">Tamanho</Label>
                            <Slider
                              value={[layer.fontSize ?? 3]}
                              min={1}
                              max={8}
                              step={0.2}
                              onValueChange={([v]) => patch(layer.id, { fontSize: v ?? 3 })}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Specific Controls: Camera */}
                    {layer.kind === "camera" ? (
                      <CameraLayerControls layer={layer} patch={patch} />
                    ) : null}

                    {/* Specific Controls: Browser Source */}
                    {layer.kind === "browser" ? (
                      <div className="space-y-2 rounded-md bg-muted/30 p-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400">
                          <Globe className="size-3.5" /> Browser Source
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Cole o link <strong className="font-medium text-foreground">https://</strong> da página, player ou overlay que deseja projetar.
                          Links RTSP, RTMP e arquivos <code>.m3u8</code> precisam de um conversor/overlay web antes de serem usados aqui.
                        </p>
                        <div className="grid gap-1">
                          <Label className="text-[10px] text-muted-foreground">URL da fonte</Label>
                          <Input
                            className="h-7 text-xs font-mono"
                            value={layer.browserUrl ?? ""}
                            onChange={(e) => patch(layer.id, { browserUrl: e.target.value })}
                            placeholder="https://exemplo.com/overlay"
                          />
                        </div>
                        {layer.browserUrl && (
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-muted-foreground">Largura</span>
                            <Input
                              type="number"
                              className="h-6 w-20 text-[10px]"
                              value={layer.browserWidth ?? 1920}
                              onChange={(e) => patch(layer.id, { browserWidth: Number(e.target.value) || 1920 })}
                            />
                            <span className="text-muted-foreground">×</span>
                            <span className="text-muted-foreground">Altura</span>
                            <Input
                              type="number"
                              className="h-6 w-20 text-[10px]"
                              value={layer.browserHeight ?? 1080}
                              onChange={(e) => patch(layer.id, { browserHeight: Number(e.target.value) || 1080 })}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`browser-interactive-${layer.id}`}
                            checked={layer.browserInteractive ?? false}
                            onCheckedChange={(v) => patch(layer.id, { browserInteractive: v })}
                          />
                          <Label htmlFor={`browser-interactive-${layer.id}`} className="text-[10px] text-muted-foreground">
                            Interativo (use para login ou iniciar um player)
                          </Label>
                        </div>
                      </div>
                    ) : null}

                    {/* Common Controls: Opacity Slider */}

                    <div className="grid gap-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Opacidade Geral</span>
                        <span className="font-medium">{layer.opacity}%</span>
                      </div>
                      <Slider
                        value={[layer.opacity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([v]) => patch(layer.id, { opacity: v ?? 100 })}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Camera Layer Controls sub-component ─────────────────────────────────────

function CameraLayerControls({
  layer,
  patch,
}: {
  layer: ProjectionLayer;
  patch: (id: string, p: Partial<ProjectionLayer>) => void;
}) {
  const devices = useCameraDevices();

  return (
    <div className="space-y-2 rounded-md bg-muted/30 p-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
        <Camera className="size-3.5" /> Câmera ao Vivo
      </div>
      <div className="grid gap-1">
        <Label className="text-[10px] text-muted-foreground">Dispositivo de câmera</Label>
        <Select
          value={layer.cameraDeviceId ?? ""}
          onValueChange={(v) => patch(layer.id, { cameraDeviceId: v })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Câmera padrão do sistema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Câmera padrão</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.deviceId} value={d.deviceId}>
                {d.label || `Câmera ${d.deviceId.slice(0, 8)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {devices.length === 0 && (
          <p className="text-[10px] text-amber-400/80">
            Nenhuma câmera detectada. Permita acesso à câmera quando solicitado.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={`cam-mirror-${layer.id}`}
          checked={layer.cameraMirrored ?? false}
          onCheckedChange={(v) => patch(layer.id, { cameraMirrored: v })}
        />
        <Label htmlFor={`cam-mirror-${layer.id}`} className="text-[10px] text-muted-foreground">
          Espelhar (mirror)
        </Label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        A câmera captura ao vivo via <code className="text-cyan-400">getUserMedia</code>. 
        Combine com o blend mode para efeitos de chroma key ou overlay.
      </p>
    </div>
  );
}
