import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveSong, type SongRecord } from "@/lib/library.functions";
import { parseSections, sectionKey } from "@/lib/slides";

interface SongEditorProps {
  open: boolean;
  song: SongRecord | null;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = {
  title: "",
  artist: "",
  song_key: "",
  bpm: "",
  ccli: "",
  tags: "",
  lyrics: "",
  arrangement: "",
  notes: "",
};

export function SongEditor({ open, song, onOpenChange }: SongEditorProps) {
  const [form, setForm] = useState(EMPTY);
  const queryClient = useQueryClient();
  const save = useServerFn(saveSong);

  useEffect(() => {
    if (!open) return;
    setForm(
      song
        ? {
            title: song.title,
            artist: song.artist,
            song_key: song.song_key,
            bpm: song.bpm ? String(song.bpm) : "",
            ccli: song.ccli,
            tags: song.tags.join(", "),
            lyrics: song.lyrics,
            arrangement: song.arrangement.join(", "),
            notes: song.notes,
          }
        : EMPTY,
    );
  }, [open, song]);

  const sections = useMemo(() => parseSections(form.lyrics), [form.lyrics]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: song?.id ?? null,
          title: form.title,
          artist: form.artist,
          song_key: form.song_key,
          bpm: form.bpm ? Number(form.bpm) : null,
          ccli: form.ccli,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          lyrics: form.lyrics,
          arrangement: form.arrangement
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: form.notes,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast.success(song ? "Música atualizada" : "Música criada");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto scroll-slim">
        <DialogHeader>
          <DialogTitle>{song ? "Editar música" : "Nova música"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Grande é o Senhor"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="artist">Artista / autor</Label>
            <Input
              id="artist"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-2">
              <Label htmlFor="key">Tom</Label>
              <Input
                id="key"
                value={form.song_key}
                onChange={(e) => setForm({ ...form, song_key: e.target.value })}
                placeholder="G"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                inputMode="numeric"
                value={form.bpm}
                onChange={(e) => setForm({ ...form, bpm: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ccli">CCLI</Label>
              <Input
                id="ccli"
                value={form.ccli}
                onChange={(e) => setForm({ ...form, ccli: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="lyrics">
              Letra — use <code>[Verso 1]</code>, <code>[Refrão]</code> ou linhas em branco para separar
              seções
            </Label>
            <Textarea
              id="lyrics"
              value={form.lyrics}
              onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
              rows={14}
              className="font-mono text-sm"
              placeholder={"[Verso 1]\nLinha um da letra\nLinha dois da letra\n\n[Refrão]\nRefrão aqui"}
            />
            <div className="flex flex-wrap gap-1.5">
              {sections.map((s) => (
                <Badge key={sectionKey(s.label) + s.lines.length} variant="secondary">
                  {s.label} · {s.lines.length} linhas
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="arrangement">Arranjo (ordem das seções, separadas por vírgula)</Label>
            <Input
              id="arrangement"
              value={form.arrangement}
              onChange={(e) => setForm({ ...form, arrangement: e.target.value })}
              placeholder="Verso 1, Refrão, Verso 2, Refrão"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="adoração, natal"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="notes">Observações para a equipe</Label>
            <Textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.title.trim()}>
            {mutation.isPending ? "Salvando..." : "Salvar música"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
