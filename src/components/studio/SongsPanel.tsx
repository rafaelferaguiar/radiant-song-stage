import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music4, Pencil, Plus, Search, Trash2, ListPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteSong, listSongs, type SongRecord } from "@/lib/library.functions";
import { buildSongSlides } from "@/lib/slides";
import type { ProjectionSlide } from "@/lib/projection";
import { SongEditor } from "./SongEditor";

interface SongsPanelProps {
  linesPerSlide: number;
  onOpenDeck: (title: string, slides: ProjectionSlide[]) => void;
  onAddToSetlist?: (song: SongRecord) => void;
}

export function SongsPanel({ linesPerSlide, onOpenDeck, onAddToSetlist }: SongsPanelProps) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SongRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const queryClient = useQueryClient();
  const fetchSongs = useServerFn(listSongs);
  const removeSong = useServerFn(deleteSong);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: () => fetchSongs(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeSong({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Música removida");
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((s) =>
      [s.title, s.artist, s.lyrics, s.tags.join(" ")].join(" ").toLowerCase().includes(q),
    );
  }, [songs, query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, letra ou tag"
            className="pl-8"
          />
        </div>
        <Button
          size="icon"
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          title="Nova música"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <ScrollArea className="-mr-2 flex-1 pr-2">
        {isLoading ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">Carregando biblioteca...</p>
        ) : filtered.length === 0 ? (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            Nenhuma música ainda. Crie a primeira com o botão +.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((song) => (
              <li
                key={song.id}
                className="group rounded-md border border-border/60 bg-secondary/40 p-2.5 transition-colors hover:border-primary/50"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onOpenDeck(song.title, buildSongSlides(song, linesPerSlide))}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Music4 className="size-3.5 text-primary" />
                    {song.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[song.artist, song.song_key && `Tom ${song.song_key}`, song.bpm && `${song.bpm} BPM`]
                      .filter(Boolean)
                      .join(" • ") || "Sem metadados"}
                  </span>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  {song.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                  <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100">
                    {onAddToSetlist ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Adicionar ao repertório"
                        onClick={() => onAddToSetlist(song)}
                      >
                        <ListPlus className="size-3.5" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Editar"
                      onClick={() => {
                        setEditing(song);
                        setEditorOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Excluir"
                      onClick={() => remove.mutate(song.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>

      <SongEditor open={editorOpen} song={editing} onOpenChange={setEditorOpen} />
    </div>
  );
}
