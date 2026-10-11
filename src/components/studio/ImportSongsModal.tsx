import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  Upload,
  Check,
  X,
  Music4,
  AlertCircle,
  CheckCircle2,
  File,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { localSaveSong } from "@/lib/local-db";
import {
  parseImportFile,
  readFileAsText,
  ACCEPTED_EXTENSIONS,
  type SongImport,
} from "@/lib/holyrics-import";

interface ImportSongsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportPhase = "upload" | "preview" | "importing" | "done";

export function ImportSongsModal({ open, onOpenChange }: ImportSongsModalProps) {
  const [phase, setPhase] = useState<ImportPhase>("upload");
  const [songs, setSongs] = useState<SongImport[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const queryClient = useQueryClient();

  const reset = useCallback(() => {
    setPhase("upload");
    setSongs([]);
    setSelected(new Set());
    setImportedCount(0);
    setErrorMsg("");
    setFileName("");
  }, []);

  const handleClose = useCallback(
    (v: boolean) => {
      if (!v) reset();
      onOpenChange(v);
    },
    [onOpenChange, reset],
  );

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setErrorMsg("");
    const allSongs: SongImport[] = [];
    let lastFileName = "";

    for (const file of Array.from(files)) {
      try {
        const content = await readFileAsText(file);
        const parsed = parseImportFile(file.name, content);
        allSongs.push(...parsed);
        lastFileName = file.name;
      } catch {
        // arquivo inválido, ignora
      }
    }

    if (allSongs.length === 0) {
      setErrorMsg(
        "Nenhuma música encontrada no(s) arquivo(s). Verifique o formato e tente novamente.",
      );
      return;
    }

    setSongs(allSongs);
    setSelected(new Set(allSongs.map((_, i) => i)));
    setFileName(files.length > 1 ? `${files.length} arquivos` : lastFileName);
    setPhase("preview");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles],
  );

  const toggleSong = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === songs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(songs.map((_, i) => i)));
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const toImport = songs.filter((_, i) => selected.has(i));
      let count = 0;
      for (const song of toImport) {
        await localSaveSong({
          id: null,
          title: song.title,
          artist: song.artist,
          song_key: song.song_key,
          bpm: song.bpm,
          ccli: "",
          tags: song.tags,
          lyrics: song.lyrics,
          arrangement: [],
          notes: song.notes,
          sections: {},
        });
        count++;
        setImportedCount(count);
      }
      return count;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      setPhase("done");
      toast.success(`${count} música${count > 1 ? "s" : ""} importada${count > 1 ? "s" : ""} com sucesso!`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao importar músicas");
      setPhase("preview");
    },
  });

  const startImport = () => {
    if (selected.size === 0) return;
    setPhase("importing");
    setImportedCount(0);
    importMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[80vh] max-h-[700px] w-[95vw] max-w-[640px] flex-col gap-3 overflow-hidden p-4 sm:max-w-[640px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" />
            Importar Músicas
            {phase === "preview" && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {songs.length} música{songs.length > 1 ? "s" : ""} encontrada
                {songs.length > 1 ? "s" : ""}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* ── FASE: Upload ─────────────────────────────── */}
          {phase === "upload" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div
                className={`flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/40"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="size-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Arraste e solte arquivos aqui
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ou clique para selecionar
                  </p>
                </div>
                <label>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept={ACCEPTED_EXTENSIONS.join(",")}
                    onChange={handleFileInput}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span>Selecionar arquivo(s)</span>
                  </Button>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Formatos aceitos: .txt, .json, .hlb, .hlc, .muf
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* ── FASE: Preview ─────────────────────────────── */}
          {phase === "preview" && (
            <>
              <div className="mb-2 flex items-center gap-2">
                <File className="size-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{fileName}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {selected.size} de {songs.length} selecionada
                  {selected.size > 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                  {selected.size === songs.length ? "Desmarcar todas" : "Selecionar todas"}
                </Button>
              </div>

              <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
                <ul className="space-y-1.5">
                  {songs.map((song, index) => (
                    <li
                      key={index}
                      className={`group flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selected.has(index)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 bg-secondary/20 opacity-60"
                      }`}
                      onClick={() => toggleSong(index)}
                    >
                      <div
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          selected.has(index)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        }`}
                      >
                        {selected.has(index) && <Check className="size-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Music4 className="size-3.5 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium">
                            {song.title}
                          </span>
                        </div>
                        {song.artist && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {song.artist}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-muted-foreground/70">
                          {song.lyrics.split("\n").filter((l) => l.trim()).length} linhas
                          {song.song_key ? ` · Tom ${song.song_key}` : ""}
                          {song.bpm ? ` · ${song.bpm} BPM` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          )}

          {/* ── FASE: Importando ──────────────────────────── */}
          {phase === "importing" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="flex size-16 animate-pulse items-center justify-center rounded-full bg-primary/10">
                <Upload className="size-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Importando músicas...</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {importedCount} de {selected.size}
                </p>
              </div>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${selected.size > 0 ? (importedCount / selected.size) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* ── FASE: Concluído ───────────────────────────── */}
          {phase === "done" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="size-7 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Importação concluída!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {importedCount} música{importedCount > 1 ? "s" : ""} adicionada
                  {importedCount > 1 ? "s" : ""} à biblioteca
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer com botões de ação ────────────────── */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 pt-3">
          {phase === "upload" && (
            <Button variant="ghost" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
          {phase === "preview" && (
            <>
              <Button variant="ghost" onClick={reset}>
                <X className="mr-1 size-3.5" />
                Voltar
              </Button>
              <Button onClick={startImport} disabled={selected.size === 0}>
                Importar {selected.size} música{selected.size > 1 ? "s" : ""}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
