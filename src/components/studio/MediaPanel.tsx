import { useRef, useState } from "react";
import { Image as ImageIcon, Play, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { DeckMeta, ProjectionSlide } from "@/lib/projection";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  kind: "image" | "video";
}

interface MediaPanelProps {
  onOpenDeck: (meta: DeckMeta, slides: ProjectionSlide[]) => void;
}

function toSlide(item: MediaItem, fit: "cover" | "contain"): ProjectionSlide {
  return {
    id: `media-${item.id}`,
    kind: "media",
    label: item.name,
    title: item.name,
    lines: [],
    mediaUrl: item.url,
    mediaKind: item.kind,
    mediaFit: fit,
  };
}

export function MediaPanel({ onOpenDeck }: MediaPanelProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [url, setUrl] = useState("");
  const [fit, setFit] = useState<"cover" | "contain">("contain");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const add = (item: MediaItem) => setItems((prev) => [item, ...prev]);

  const upload = async (file: File) => {
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
      add({
        id: crypto.randomUUID(),
        name: file.name,
        url: signed.data.signedUrl,
        kind: file.type.startsWith("video") ? "video" : "image",
      });
      toast.success("Mídia enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  const project = (index: number) => {
    const slides = items.map((item) => toSlide(item, fit));
    const ordered = [...slides.slice(index), ...slides.slice(0, index)];
    onOpenDeck({ title: items[index]?.name ?? "Mídia" }, ordered);
  };

  return (
    <ScrollArea className="-mr-2 h-full pr-3">
      <div className="space-y-4 pb-6">
        <div className="space-y-2">
          <Button className="w-full" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 size-4" /> {uploading ? "Enviando…" : "Enviar imagem ou vídeo"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ou cole uma URL" />
            <Button
              variant="secondary"
              onClick={() => {
                if (!url.trim()) return;
                const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
                add({
                  id: crypto.randomUUID(),
                  name: url.split("/").pop()?.split("?")[0] ?? "Mídia",
                  url: url.trim(),
                  kind: isVideo ? "video" : "image",
                });
                setUrl("");
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Ajuste na tela</Label>
            <Select value={fit} onValueChange={(v) => setFit(v as "cover" | "contain")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">Conter (mostra tudo)</SelectItem>
                <SelectItem value="cover">Preencher (corta)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {!items.length ? (
          <p className="text-xs text-muted-foreground">
            Envie fotos e vídeos para projetar em tela cheia (avisos, clipes, fotos de eventos).
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          {items.map((item, index) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-border/60">
              <div className="relative aspect-video bg-black">
                {item.kind === "video" ? (
                  <video src={`${item.url}#t=0.1`} muted preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">
                  {item.kind === "video" ? "vídeo" : "imagem"}
                </span>
              </div>
              <div className="flex items-center gap-1 p-1">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{item.name}</span>
                <Button variant="ghost" size="icon" title="Projetar" onClick={() => project(index)}>
                  <Play className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Remover"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ImageIcon className="size-3.5" /> A mídia entra no deck e você navega com as setas.
        </p>
      </div>
    </ScrollArea>
  );
}
