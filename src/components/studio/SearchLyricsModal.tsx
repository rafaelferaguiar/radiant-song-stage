import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Search,
  Music4,
  User,
  Disc3,
  Clock,
  Download,
  ArrowLeft,
  Loader2,
  SearchX,
  Quote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { localSaveSong } from "@/lib/local-db";
import {
  searchLyrics,
  loadFullLyrics,
  formatDuration,
  type LyricsResult,
} from "@/lib/lyrics-search";

interface SearchLyricsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchLyricsModal({
  open,
  onOpenChange,
}: SearchLyricsModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LyricsResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<LyricsResult | null>(
    null,
  );
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editLyrics, setEditLyrics] = useState("");
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const queryClient = useQueryClient();

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setLoadingLyrics(false);
      setHasSearched(false);
      setSelectedResult(null);
      setEditTitle("");
      setEditArtist("");
      setEditLyrics("");
      setSearchError("");
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const data = await searchLyrics(q);
      setResults(data);
      setHasSearched(true);
    } catch (err: any) {
      setSearchError(err.message || "Erro na busca");
      setResults([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const selectResult = async (result: LyricsResult) => {
    setSelectedResult(result);
    setEditTitle(result.title);
    setEditArtist(result.artist);
    setEditLyrics(result.lyrics || "");

    // Se a letra completa ainda não estiver carregada (ex: veio do Letras via frase), carrega agora
    if (!result.lyrics || result.lyrics.trim().length < 10) {
      setLoadingLyrics(true);
      try {
        const full = await loadFullLyrics(result);
        setEditLyrics(full);
      } catch (err) {
        console.error("Erro ao carregar letra completa:", err);
      } finally {
        setLoadingLyrics(false);
      }
    }
  };

  const backToResults = () => {
    setSelectedResult(null);
    setLoadingLyrics(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResult) throw new Error("Nenhuma música selecionada");
      if (!editLyrics.trim()) throw new Error("A letra da música está vazia");
      return localSaveSong({
        id: null,
        title: editTitle.trim() || selectedResult.title,
        artist: editArtist.trim(),
        song_key: "",
        bpm: null,
        ccli: "",
        tags: [],
        lyrics: editLyrics.trim(),
        arrangement: [],
        notes: "",
        sections: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success(`"${editTitle}" adicionada à biblioteca!`);
      setSelectedResult(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar música");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[780px] w-[95vw] max-w-[720px] flex-col gap-3 overflow-hidden p-4 sm:max-w-[720px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Buscar Letras na Internet
          </DialogTitle>
        </DialogHeader>

        {/* ── Barra de busca ────────────────────────────── */}
        {!selectedResult && (
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite o título, cantor ou qualquer frase da música..."
              className="pl-9 pr-4"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          {/* ── Lista de resultados ────────────────────── */}
          {!selectedResult && (
            <>
              {!hasSearched && !searching && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary/5">
                    <Search className="size-7 text-primary/40" />
                  </div>
                  <p className="text-sm">
                    Pesquise por nome da música, artista ou frases cantadas
                  </p>
                  <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
                    Ex: "Deus enviou seu filho amado", "Porque ele vive", "Fernandinho", "entra na minha casa"
                  </p>
                </div>
              )}

              {searchError && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <SearchX className="size-10 text-destructive/50" />
                  <p className="text-sm text-destructive">{searchError}</p>
                </div>
              )}

              {hasSearched && !searchError && results.length === 0 && !searching && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <SearchX className="size-10 text-muted-foreground/30" />
                  <p className="text-sm">
                    Nenhum resultado encontrado para "{query}"
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Tente outras palavras ou um trecho mais marcante
                  </p>
                </div>
              )}

              {results.length > 0 && (
                <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
                  <ul className="space-y-2">
                    {results.map((result) => (
                      <li
                        key={result.id}
                        className="group cursor-pointer rounded-lg border border-border/40 bg-secondary/20 p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
                        onClick={() => selectResult(result)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Music4 className="size-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">
                                {result.title}
                              </p>
                              {result.snippet && (
                                <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  Frase encontrada
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                              {result.artist && (
                                <span className="flex items-center gap-1 truncate">
                                  <User className="size-3" />
                                  {result.artist}
                                </span>
                              )}
                              {result.album && (
                                <span className="hidden items-center gap-1 truncate sm:flex">
                                  <Disc3 className="size-3" />
                                  {result.album}
                                </span>
                              )}
                              {result.duration > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDuration(result.duration)}
                                </span>
                              )}
                            </div>

                            {/* Trecho com a frase encontrada na letra */}
                            {result.snippet && (
                              <div className="mt-2 flex items-start gap-1.5 rounded bg-muted/60 p-1.5 text-xs text-muted-foreground border border-border/30">
                                <Quote className="size-3 shrink-0 mt-0.5 text-primary" />
                                <span className="line-clamp-2 italic">
                                  "{result.snippet}"
                                </span>
                              </div>
                            )}

                            {/* Se não tem snippet, mostra as primeiras linhas */}
                            {!result.snippet && result.lyrics && (
                              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                                {result.lyrics
                                  .split("\n")
                                  .filter((l) => l.trim())
                                  .slice(0, 3)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </>
          )}

          {/* ── Preview da música selecionada ─────────── */}
          {selectedResult && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={backToResults}
                >
                  <ArrowLeft className="size-3" />
                  Voltar aos resultados
                </Button>
              </div>

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="import-title" className="text-xs">
                    Título
                  </Label>
                  <Input
                    id="import-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="import-artist" className="text-xs">
                    Artista
                  </Label>
                  <Input
                    id="import-artist"
                    value={editArtist}
                    onChange={(e) => setEditArtist(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {selectedResult.album && (
                    <span className="mr-3">
                      Álbum / Gênero: {selectedResult.album}
                    </span>
                  )}
                  {selectedResult.duration > 0 && (
                    <span>
                      Duração: {formatDuration(selectedResult.duration)}
                    </span>
                  )}
                </div>
                {loadingLyrics && (
                  <span className="flex items-center gap-1 text-primary">
                    <Loader2 className="size-3 animate-spin" />
                    Obtendo letra completa...
                  </span>
                )}
              </div>

              <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
                {loadingLyrics && !editLyrics ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-xs">Carregando letra da música...</p>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap rounded-lg border border-border/40 bg-secondary/20 p-4 font-mono text-xs leading-relaxed">
                    {editLyrics || "Nenhuma letra encontrada."}
                  </pre>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 pt-3">
          {!selectedResult && (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
          {selectedResult && (
            <>
              <Button variant="ghost" onClick={backToResults}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  loadingLyrics ||
                  !editTitle.trim() ||
                  !editLyrics.trim()
                }
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 size-3.5" />
                    Importar para biblioteca
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
