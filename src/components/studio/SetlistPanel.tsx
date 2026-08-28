import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, BookOpen, Music4, Plus, Trash2, Type } from "lucide-react";
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
import {
  addSetlistItem,
  createSetlist,
  deleteSetlist,
  listSetlistItems,
  listSetlists,
  listSongs,
  removeSetlistItem,
  reorderSetlistItems,
  updateSetlistItem,
  type SetlistItemRecord,
} from "@/lib/library.functions";
import { getChapter } from "@/lib/bible.functions";
import { buildBibleSlides, buildSongSlides } from "@/lib/slides";
import { formatRef, TRANSLATIONS } from "@/lib/bible-books";
import type { DeckMeta, ProjectionSlide } from "@/lib/projection";

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
  const fetchSetlists = useServerFn(listSetlists);
  const fetchItems = useServerFn(listSetlistItems);
  const fetchSongs = useServerFn(listSongs);
  const fetchChapter = useServerFn(getChapter);
  const create = useServerFn(createSetlist);
  const removeList = useServerFn(deleteSetlist);
  const removeItem = useServerFn(removeSetlistItem);
  const reorder = useServerFn(reorderSetlistItems);
  const addItem = useServerFn(addSetlistItem);

  const { data: setlists = [] } = useQuery({ queryKey: ["setlists"], queryFn: () => fetchSetlists() });
  const { data: songs = [] } = useQuery({ queryKey: ["songs"], queryFn: () => fetchSongs() });

  useEffect(() => {
    if (!activeSetlistId && setlists.length) onActiveSetlistChange(setlists[0]!.id);
  }, [setlists, activeSetlistId, onActiveSetlistChange]);

  const { data: items = [] } = useQuery({
    queryKey: ["setlist-items", activeSetlistId],
    queryFn: () => fetchItems({ data: { setlistId: activeSetlistId! } }),
    enabled: Boolean(activeSetlistId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["setlists"] });
    queryClient.invalidateQueries({ queryKey: ["setlist-items", activeSetlistId] });
  };

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name: newName || "Culto" } }),
    onSuccess: (row) => {
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["setlists"] });
      onActiveSetlistChange(row.id);
      toast.success("Repertório criado");
    },
  });

  const openItem = async (item: SetlistItemRecord) => {
    if (item.kind === "song") {
      const songId = String(item.payload["songId"] ?? "");
      const song = songs.find((s) => s.id === songId);
      if (!song) {
        toast.error("Música não encontrada na biblioteca");
        return;
      }
      onOpenDeck(song.title, buildSongSlides(song, linesPerSlide));
      return;
    }
    if (item.kind === "bible") {
      const translation = String(item.payload["translation"] ?? "NVIPT");
      const bookId = Number(item.payload["bookId"] ?? 43);
      const chapter = Number(item.payload["chapter"] ?? 1);
      const result = await fetchChapter({ data: { translation, book: bookId, chapter } });
      const label = TRANSLATIONS.find((t) => t.code === translation)?.short ?? translation;
      onOpenDeck(item.title, buildBibleSlides(formatRef(bookId, chapter), label, result.verses, versesPerSlide));
      return;
    }
    const lines = String(item.payload["body"] ?? item.title)
      .split("\n")
      .filter(Boolean);
    onOpenDeck(item.title, [
      { id: item.id, kind: "text", title: item.title, lines, footer: item.title },
    ]);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    await reorder({ data: { items: next.map((item, i) => ({ id: item.id, position: i })) } });
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
              await removeList({ data: { id: activeSetlistId } });
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

      <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
        {items.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Adicione músicas e passagens a partir das abas Músicas e Bíblia.
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
                  <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
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
                        await removeItem({ data: { id: item.id } });
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
          await addItem({
            data: {
              setlistId: activeSetlistId,
              kind: "text",
              title: "Aviso",
              payload: { body: "Escreva o aviso aqui" },
              position: items.length,
            },
          });
          invalidate();
        }}
      >
        <Type className="size-3.5" /> Adicionar texto livre
      </Button>
    </div>
  );
}
