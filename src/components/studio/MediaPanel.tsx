import { useEffect, useRef, useState } from "react";
import {
  Film,
  GripVertical,
  Image as ImageIcon,
  Layers,
  Monitor,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildMediaDeck,
  getStoredMedia,
  saveMediaLibrary,
  toProjectionSlide,
  uploadMediaFile,
  type MediaCategory,
  type MediaItem,
} from "@/lib/media";
import { createLayerFromMedia, type DeckMeta, type ProjectionSlide, type ThemeConfig } from "@/lib/projection";
import { cn } from "@/lib/utils";

interface MediaPanelProps {
  theme?: ThemeConfig;
  onThemeChange?: (theme: ThemeConfig) => void;
  onOpenDeck: (meta: DeckMeta, slides: ProjectionSlide[]) => void;
  onAddToSetlist?: (title: string, payload: any) => void;
}

export function MediaPanel({ theme, onThemeChange, onOpenDeck, onAddToSetlist }: MediaPanelProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MediaCategory>("all");
  const [url, setUrl] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("contain");
  const [uploading, setUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load stored media
  useEffect(() => {
    setItems(getStoredMedia());
  }, []);

  const persistItems = (next: MediaItem[]) => {
    setItems(next);
    saveMediaLibrary(next);
  };

  const addMediaItem = (item: MediaItem) => {
    const next = [item, ...items.filter((i) => i.id !== item.id)];
    persistItems(next);
  };

  const removeMediaItem = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    persistItems(next);
    toast.success("Mídia removida");
  };

  // Upload handler for single and multiple files
  const handleUploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const item = await uploadMediaFile(file);
        addMediaItem(item);
        count++;
      }
      toast.success(`${count} ${count === 1 ? "mídia adicionada" : "mídias adicionadas"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar arquivo(s)");
    } finally {
      setUploading(false);
    }
  };

  // Dropzone drag events
  const handleDropzoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDropzoneDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDropzoneDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Drag start for dragging media onto Layers, Setlist, or Canvas
  const handleMediaDragStart = (e: React.DragEvent, item: MediaItem) => {
    e.dataTransfer.setData("application/x-rfpresenter-media", JSON.stringify(item));
    e.dataTransfer.setData("text/plain", item.url);
    e.dataTransfer.effectAllowed = "copyMove";
  };

  // Action: Project media in deck
  const projectMedia = (index: number) => {
    const filtered = filteredItems;
    const { meta, slides } = buildMediaDeck(filtered, index, fit);
    onOpenDeck(meta, slides);
    toast.success(`Projetando: ${filtered[index]?.name}`);
  };

  // Action: Add as Layer to current theme
  const addAsLayer = (item: MediaItem) => {
    if (!theme || !onThemeChange) {
      toast.error("Tema não disponível");
      return;
    }
    const newLayer = createLayerFromMedia(item);
    onThemeChange({
      ...theme,
      layers: [...(theme.layers ?? []), newLayer],
    });
    toast.success(`"${item.name}" adicionado como camada`);
  };

  // Action: Set as background in current theme
  const setAsBackground = (item: MediaItem) => {
    if (!theme || !onThemeChange) {
      toast.error("Tema não disponível");
      return;
    }
    onThemeChange({
      ...theme,
      bgKind: item.kind,
      bgUrl: item.url,
      bgFit: fit,
    });
    toast.success(`"${item.name}" definido como fundo do tema`);
  };

  // Action: Add to active setlist
  const addToSetlist = (item: MediaItem) => {
    if (!onAddToSetlist) {
      toast.error("Repertório não disponível");
      return;
    }
    onAddToSetlist(item.name, {
      mediaUrl: item.url,
      mediaKind: item.kind,
      mediaFit: fit,
      durationMin: 5,
    });
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (category === "all") return true;
    if (category === "background") return item.kind === "image";
    if (category === "presets") return !!item.isPreset;
    if (category === "general") return item.kind === "video";
    return true;
  });

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-4 pb-6">
        {/* Upload Dropzone */}
        <div
          onDragOver={handleDropzoneDragOver}
          onDragLeave={handleDropzoneDragLeave}
          onDrop={(e) => void handleDropzoneDrop(e)}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-4 text-center transition-all",
            isDraggingOver && "border-primary bg-primary/10 ring-2 ring-primary/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            {uploading ? <Sparkles className="size-5 animate-spin" /> : <Upload className="size-5" />}
          </div>
          <p className="mt-2 text-xs font-semibold text-foreground">
            {uploading ? "Enviando arquivos…" : "Arraste fotos e vídeos aqui"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Suporta JPG, PNG, WEBP, GIF, MP4, WEBM e MOV
          </p>

          <Button
            size="sm"
            variant="secondary"
            className="mt-2.5 h-7 text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-1.5 size-3.5" /> Escolher do Computador
          </Button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleUploadFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />
        </div>

        {/* URL Add Input */}
        <div className="flex gap-1.5">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ou cole uma URL de foto/vídeo"
            className="h-8 text-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 px-3"
            onClick={() => {
              if (!url.trim()) return;
              const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
              addMediaItem({
                id: `media-${Date.now()}`,
                name: url.split("/").pop()?.split("?")[0] || "Mídia URL",
                url: url.trim(),
                kind: isVideo ? "video" : "image",
                createdAt: Date.now(),
              });
              setUrl("");
              toast.success("Mídia adicionada via URL");
            }}
          >
            <Plus className="mr-1 size-3.5" /> Inserir
          </Button>
        </div>

        {/* Controls: Search, Filters & Screen Fit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={fit} onValueChange={(v) => setFit(v as "cover" | "contain")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Conter (Tela inteira)</SelectItem>
                <SelectItem value="cover">Preencher (Sem bordas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            <Button
              variant={category === "all" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={() => setCategory("all")}
            >
              Todas ({items.length})
            </Button>
            <Button
              variant={category === "background" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={() => setCategory("background")}
            >
              <ImageIcon className="mr-1 size-3" /> Fotos
            </Button>
            <Button
              variant={category === "general" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={() => setCategory("general")}
            >
              <Video className="mr-1 size-3" /> Vídeos
            </Button>
            <Button
              variant={category === "presets" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2.5 text-[11px]"
              onClick={() => setCategory("presets")}
            >
              <Sparkles className="mr-1 size-3" /> Presets
            </Button>
          </div>
        </div>

        {/* Media Grid Cards */}
        {!filteredItems.length ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nenhuma mídia encontrada. Envie fotos e vídeos para projetar ou usar como fundo.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          {filteredItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleMediaDragStart(e, item)}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-all hover:border-primary/60 hover:shadow-md"
            >
              {/* Media Thumbnail with hover overlay */}
              <div
                className="relative aspect-video w-full cursor-grab bg-black active:cursor-grabbing"
                onClick={() => projectMedia(index)}
                title="Clique para projetar ou arraste para camadas / tela"
              >
                {item.kind === "video" ? (
                  <video
                    src={`${item.url}#t=0.1`}
                    muted
                    preload="metadata"
                    className="size-full object-cover"
                  />
                ) : (
                  <img src={item.url} alt={item.name} className="size-full object-cover" />
                )}

                {/* Badges */}
                <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                  <span className="flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                    {item.kind === "video" ? <Video className="size-2.5" /> : <ImageIcon className="size-2.5" />}
                    {item.kind === "video" ? "VÍDEO" : "FOTO"}
                  </span>
                  {item.isPreset && (
                    <span className="rounded bg-primary/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                      PRESET
                    </span>
                  )}
                </div>

                {/* Hover Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110">
                    <Play className="ml-0.5 size-4" />
                  </div>
                </div>
              </div>

              {/* Card Footer & Quick Actions */}
              <div className="flex items-center justify-between gap-1 p-1.5">
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground" title={item.name}>
                  {item.name}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-6 shrink-0 text-muted-foreground hover:text-foreground">
                      <Plus className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    <DropdownMenuItem onClick={() => projectMedia(index)}>
                      <Play className="mr-2 size-3.5 text-primary" /> Projetar em Tela Cheia
                    </DropdownMenuItem>

                    {theme && onThemeChange && (
                      <>
                        <DropdownMenuItem onClick={() => addAsLayer(item)}>
                          <Layers className="mr-2 size-3.5 text-blue-400" /> Adicionar como Camada
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAsBackground(item)}>
                          <Monitor className="mr-2 size-3.5 text-amber-400" /> Definir como Fundo
                        </DropdownMenuItem>
                      </>
                    )}

                    {onAddToSetlist && (
                      <DropdownMenuItem onClick={() => addToSetlist(item)}>
                        <Film className="mr-2 size-3.5 text-emerald-400" /> Adicionar ao Repertório
                      </DropdownMenuItem>
                    )}

                    {!item.isPreset && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => removeMediaItem(item.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-3.5" /> Excluir Mídia
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <GripVertical className="size-3.5" /> Você pode <strong>arrastar</strong> qualquer foto ou vídeo para o painel de <strong>Camadas</strong> ou para a tela de <strong>Projeção</strong>.
        </p>
      </div>
    </ScrollArea>
  );
}
