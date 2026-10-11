import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ArrowDown, ArrowUp, BookOpen, Image as ImageIcon, Music4, Plus, Trash2, Type } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SetlistItemRecord } from "@/lib/library.functions";
import {
  localListSetlists,
  localListSetlistItems,
  localListSongs,
  localCreateSetlist,
  localDeleteSetlist,
  localRemoveSetlistItem,
  localReorderSetlistItems,
  localAddSetlistItem,
  localUpdateSetlistItem,
} from "@/lib/local-db";
import { getChapter } from "@/lib/bible.functions";
import { buildBibleSlides, buildSongSlides } from "@/lib/slides";
import { formatRef, TRANSLATIONS } from "@/lib/bible-books";
import type { DeckMeta, ProjectionSlide } from "@/lib/projection";
import type { MediaItem } from "@/lib/media";

interface SetlistPanelProps {
  linesPerSlide: number;
  versesPerSlide: number;
  activeSetlistId: string | null;
  onActiveSetlistChange: (id: string | null) => void;
  onOpenDeck: (meta: DeckMeta, slides: ProjectionSlide[]) => void;
}

const KIND_ICON = {
  song: Music4,
  bible: BookOpen,
  text: Type,
  media: ImageIcon,
} as const;

export function SetlistPanel({
  linesPerSlide,
  versesPerSlide,
  activeSetlistId,
  onActiveSetlistChange,
  onOpenDeck,
}: SetlistPanelProps) {
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();
  const fetchChapter = getChapter;
  const { data: setlists = [] } = useQuery({ queryKey: ["setlists"], queryFn: () => localListSetlists() });
  const { data: songs = [] } = useQuery({ queryKey: ["songs"], queryFn: () => localListSongs() });

  useEffect(() => {
    if (!activeSetlistId && setlists.length) onActiveSetlistChange(setlists[0]!.id);
  }, [setlists, activeSetlistId, onActiveSetlistChange]);

  const { data: items = [] } = useQuery({
    queryKey: ["setlist-items", activeSetlistId],
    queryFn: () => localListSetlistItems(activeSetlistId!),
    enabled: Boolean(activeSetlistId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["setlists"] });
    queryClient.invalidateQueries({ queryKey: ["setlist-items", activeSetlistId] });
  };

  const createMutation = useMutation({
    mutationFn: () => localCreateSetlist({ name: newName || "Culto" }),
    onSuccess: (row) => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["setlists"] });
      onActiveSetlistChange(row.id);
      toast.success("Repertório criado");
    },
  });

  const openItem = async (item: SetlistItemRecord) => {
    const durationMin = Number(item.payload["durationMin"]) || null;
    if (item.kind === "song") {
      const songId = String(item.payload["songId"] ?? "");
      const song = songs.find((s) => s.id === songId);
      if (!song) {
        toast.error("Música não encontrada na biblioteca");
        return;
      }
      onOpenDeck(
        {
          title: song.title,
          songKey: song.song_key,
          bpm: song.bpm,
          notes: song.notes,
          durationMin,
        },
        buildSongSlides(song, linesPerSlide),
      );
      return;
    }
    if (item.kind === "bible") {
      const translation = String(item.payload["translation"] ?? "NVIPT");
      const bookId = Number(item.payload["bookId"] ?? 43);
      const chapter = Number(item.payload["chapter"] ?? 1);
      const result = await fetchChapter({ data: { translation, book: bookId, chapter } });
      const label = TRANSLATIONS.find((t) => t.code === translation)?.short ?? translation;
      onOpenDeck(
        { title: item.title, durationMin },
        buildBibleSlides(formatRef(bookId, chapter), label, result.verses, versesPerSlide),
      );
      return;
    }
    if (item.kind === "media") {
      const mediaUrl = String(item.payload["mediaUrl"] ?? "");
      const mediaKind = (item.payload["mediaKind"] as "image" | "video") || "image";
      const mediaFit = (item.payload["mediaFit"] as "cover" | "contain") || "contain";
      const slide: ProjectionSlide = {
        id: `setlist-media-${item.id}`,
        kind: "media",
        label: item.title,
        title: item.title,
        lines: [],
        footer: item.title,
        mediaUrl,
        mediaKind,
        mediaFit,
      };
      onOpenDeck({ title: item.title, durationMin }, [slide]);
      return;
    }
    const lines = String(item.payload["body"] ?? item.title)
      .split("\n")
      .filter(Boolean);
    onOpenDeck({ title: item.title, durationMin }, [
      { id: item.id, kind: "text", title: item.title, lines, footer: item.title },
    ]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!activeSetlistId) {
      toast.error("Selecione ou crie um repertório primeiro");
      return;
    }
    const raw = e.dataTransfer.getData("application/x-rfpresenter-media");
    if (raw) {
      try {
        const media = JSON.parse(raw) as MediaItem;
        await localAddSetlistItem({
          setlistId: activeSetlistId,
          kind: "media",
          title: media.name,
          payload: {
            mediaUrl: media.url,
            mediaKind: media.kind,
            mediaFit: "contain",
            durationMin: 5,
          },
          position: items.length,
        });
        invalidate();
        toast.success(`"${media.name}" adicionado ao repertório`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    await localReorderSetlistItems(next.map((item, i) => ({ id: item.id, position: i })));
    invalidate();
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <Select value={activeSetlistId ?? ""} onValueChange={onActiveSetlistChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Escolha um repertório" />
          </SelectTrigger>
          <SelectContent>
            {setlists.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {s.service_date ? ` · ${s.service_date}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeSetlistId ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            title="Excluir repertório"
            onClick={async () => {
              await localDeleteSetlist(activeSetlistId);
              onActiveSetlistChange(null);
              invalidate();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do novo repertório"
          onKeyDown={(e) => {
            if (e.key === "Enter") createMutation.mutate();
          }}
        />
        <Button size="icon" onClick={() => createMutation.mutate()} title="Criar repertório">
          <Plus className="size-4" />
        </Button>
      </div>

      <ScrollArea
        className="-mr-2 min-h-0 flex-1 pr-2"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => void handleDrop(e)}
      >
        {items.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Adicione músicas, passagens ou <strong>arraste fotos e vídeos</strong> aqui.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((item, index) => {
              const Icon = KIND_ICON[item.kind as keyof typeof KIND_ICON] ?? Type;
              return (
                <li
                  key={item.id}
                  className="group flex items-center gap-2 rounded-md border border-border/60 bg-secondary/40 p-2 transition-colors hover:border-primary/50"
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-2 text-left text-sm"
                    onClick={() => void openItem(item)}
                  >
                    <Icon className="size-3.5 text-primary" />
                    <span className="truncate">{item.title}</span>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <input
                      type="number"
                      min={0}
                      value={Number(item.payload["durationMin"]) || ""}
                      onChange={async (e) => {
                        const v = e.target.value;
                        await localUpdateSetlistItem({
                            id: item.id,
                            payload: { ...item.payload, durationMin: v ? Number(v) : null },
                          });
                        invalidate();
                      }}
                      className="h-7 w-16 rounded border border-border bg-background px-1.5 text-xs"
                      placeholder="min"
                      title="Duração estimada em minutos"
                    />
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => void move(index, -1)}>
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => void move(index, 1)}>
                      <ArrowDown className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive"
                      onClick={async () => {
                        await localRemoveSetlistItem(item.id);
                        invalidate();
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </ScrollArea>

      <Button
        variant="secondary"
        size="sm"
        disabled={!activeSetlistId}
        onClick={async () => {
          if (!activeSetlistId) return;
          await localAddSetlistItem({
            setlistId: activeSetlistId,
            kind: "text",
            title: "Aviso",
            payload: { body: "Escreva o aviso aqui" },
            position: items.length,
          });
          invalidate();
        }}
      >
        <Type className="size-3.5" /> Adicionar texto livre
      </Button>
    </div>
  );
}
