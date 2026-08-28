import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic2, BookOpen, ListMusic, Command as CommandIcon, Layers, Monitor, Tv, EyeOff, Flame, Timer, Search } from "lucide-react";

import {
  Command as CommandRoot,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchSongs, type SetlistRecord, type SongRecord } from "@/lib/library.functions";
import { parseReference, formatRef, type ParsedRef } from "@/lib/bible-books";

export type QuickAction =
  | { type: "blackout" }
  | { type: "freeze" }
  | { type: "logo" }
  | { type: "clear" }
  | { type: "openProjection" }
  | { type: "openStage" };

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs?: SongRecord[];
  setlists?: SetlistRecord[];
  onOpenSong?: (song: SongRecord) => void;
  onOpenSetlist?: (setlist: SetlistRecord) => void;
  onGoToRef?: (ref: ParsedRef) => void;
  onAction?: (action: QuickAction) => void;
}

const SYSTEM_ACTIONS: { label: string; icon: React.ReactNode; action: QuickAction; keywords: string }[] = [
  { label: "Blackout (B)", icon: <EyeOff className="size-4" />, action: { type: "blackout" }, keywords: "apagar tela escuro blackout" },
  { label: "Tela de abertura (L)", icon: <Monitor className="size-4" />, action: { type: "logo" }, keywords: "logo abertura bem vindo tela inicial" },
  { label: "Congelar / Descongelar (C)", icon: <Layers className="size-4" />, action: { type: "freeze" }, keywords: "congelar freeze segurar travar" },
  { label: "Limpar slide", icon: <Command className="size-4" />, action: { type: "clear" }, keywords: "limpar vazio slide apagar" },
  { label: "Abrir projeção", icon: <Tv className="size-4" />, action: { type: "openProjection" }, keywords: "projetar tela projetor segunda tela" },
  { label: "Abrir retorno de palco", icon: <Timer className="size-4" />, action: { type: "openStage" }, keywords: "palco retorno stage monitora" },
];

export function CommandPalette({
  open,
  onOpenChange,
  songs: initialSongs = [],
  setlists = [],
  onOpenSong,
  onOpenSetlist,
  onGoToRef,
  onAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const search = useServerFn(searchSongs);

  const { data: searchedSongs = [], isFetching } = useQuery({
    queryKey: ["song-search", query],
    queryFn: () => search({ data: { q: query } }),
    enabled: query.trim().length > 1 && !parseReference(query),
    staleTime: 1000 * 30,
  });

  const songResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    if (!isFetching && searchedSongs.length) return searchedSongs;
    return initialSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.lyrics.toLowerCase().includes(q),
    );
  }, [query, searchedSongs, initialSongs, isFetching]);

  const ref = useMemo(() => parseReference(query), [query]);

  const setlistResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return setlists.filter((s) => s.name.toLowerCase().includes(q));
  }, [query, setlists]);

  const systemActions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SYSTEM_ACTIONS;
    return SYSTEM_ACTIONS.filter((a) =>
      `${a.label} ${a.keywords}`.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} loop>
        <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="Buscar música, versículo (jo 3:16), repertório ou ação..."
            value={query}
            onValueChange={setQuery}
          />
        </div>
        <CommandList className="max-h-[60vh]">
          {systemActions.length ? (
            <CommandGroup heading="Ações rápidas">
              {systemActions.map((action) => (
                <CommandItem
                  key={action.label}
                  onSelect={() => {
                    onAction?.(action.action);
                    onOpenChange(false);
                  }}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {ref ? (
            <CommandGroup heading="Bíblia">
              <CommandItem
                onSelect={() => {
                  onGoToRef?.(ref);
                  onOpenChange(false);
                }}
              >
                <BookOpen className="size-4" />
                <span className="ml-2">Ir para {formatRef(ref.book.id, ref.chapter, ref.verseStart, ref.verseEnd)}</span>
              </CommandItem>
            </CommandGroup>
          ) : null}

          {songResults.length ? (
            <CommandGroup heading="Músicas">
              {songResults.slice(0, 8).map((song) => (
                <CommandItem
                  key={song.id}
                  onSelect={() => {
                    onOpenSong?.(song);
                    onOpenChange(false);
                  }}
                >
                  <Mic2 className="size-4" />
                  <span className="ml-2 flex-1 truncate">{song.title}</span>
                  {song.artist ? (
                    <span className="ml-2 text-xs text-muted-foreground">{song.artist}</span>
                  ) : null}
                  {song.song_key ? (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">{song.song_key}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {setlistResults.length ? (
            <CommandGroup heading="Repertórios">
              {setlistResults.map((setlist) => (
                <CommandItem
                  key={setlist.id}
                  onSelect={() => {
                    onOpenSetlist?.(setlist);
                    onOpenChange(false);
                  }}
                >
                  <ListMusic className="size-4" />
                  <span className="ml-2">{setlist.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
            Nada encontrado. Tente um trecho de letra, nome da música ou referência bíblica.
          </CommandEmpty>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
