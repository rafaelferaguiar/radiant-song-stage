import type { JsonObject } from "@/lib/library.functions";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Columns2, ListPlus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BIBLE_BOOKS,
  TRANSLATIONS,
  formatRef,
  parseReference,
} from "@/lib/bible-books";
import { compareVerse, getChapter, searchVerses } from "@/lib/bible.functions";
import { buildBibleSlides } from "@/lib/slides";
import type { ProjectionSlide } from "@/lib/projection";

interface BiblePanelProps {
  versesPerSlide: number;
  onOpenDeck: (title: string, slides: ProjectionSlide[]) => void;
  onSendSlide: (slide: ProjectionSlide) => void;
  onAddToSetlist?: (title: string, payload: JsonObject) => void;
}

export function BiblePanel({ versesPerSlide, onOpenDeck, onSendSlide, onAddToSetlist }: BiblePanelProps) {
  const [translation, setTranslation] = useState("NVIPT");
  const [bookId, setBookId] = useState(43);
  const [chapter, setChapter] = useState(3);
  const [quick, setQuick] = useState("");
  const [term, setTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [compareTargets, setCompareTargets] = useState(["ARA", "NVIPT", "NTLH"]);
  const [compareVerseNumber, setCompareVerseNumber] = useState(16);

  const fetchChapter = useServerFn(getChapter);
  const runSearch = useServerFn(searchVerses);
  const runCompare = useServerFn(compareVerse);

  const book = BIBLE_BOOKS.find((b) => b.id === bookId) ?? BIBLE_BOOKS[42]!;
  const translationLabel = TRANSLATIONS.find((t) => t.code === translation)?.short ?? translation;

  const chapterQuery = useQuery({
    queryKey: ["bible-chapter", translation, bookId, chapter],
    queryFn: () => fetchChapter({ data: { translation, book: bookId, chapter } }),
  });

  const searchQuery = useQuery({
    queryKey: ["bible-search", translation, term],
    queryFn: () => runSearch({ data: { translation, query: term } }),
    enabled: term.trim().length >= 3,
  });

  const compareQuery = useQuery({
    queryKey: ["bible-compare", compareTargets.join(","), bookId, chapter, compareVerseNumber],
    queryFn: () =>
      runCompare({
        data: { translations: compareTargets, book: bookId, chapter, verse: compareVerseNumber },
      }),
  });

  const verses = chapterQuery.data?.verses ?? [];
  const reference = formatRef(bookId, chapter);

  const chapterSlides = useMemo(
    () => buildBibleSlides(reference, translationLabel, verses, versesPerSlide),
    [reference, translationLabel, verses, versesPerSlide],
  );

  const applyQuick = () => {
    const parsed = parseReference(quick);
    if (!parsed) return;
    setBookId(parsed.book.id);
    setChapter(parsed.chapter);
    if (parsed.verseStart) setCompareVerseNumber(parsed.verseStart);
  };

  return (
    <Tabs defaultValue="ler" className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ler">Ler</TabsTrigger>
        <TabsTrigger value="buscar">Buscar</TabsTrigger>
        <TabsTrigger value="comparar">Comparar</TabsTrigger>
      </TabsList>

      <TabsContent value="ler" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid gap-2">
          <Input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyQuick();
            }}
            placeholder="Referência rápida: jo 3:16, sl 23, 1co 13:4-7"
          />
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <Select value={String(bookId)} onValueChange={(v) => setBookId(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {BIBLE_BOOKS.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(chapter)} onValueChange={(v) => setChapter(Number(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
                  <SelectItem key={c} value={String(c)}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={translation} onValueChange={setTranslation}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATIONS.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.short}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onOpenDeck(`${reference} (${translationLabel})`, chapterSlides)}
              disabled={!verses.length}
            >
              <BookOpen className="size-3.5" /> Abrir capítulo
            </Button>
            {onAddToSetlist ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onAddToSetlist(`${reference} (${translationLabel})`, { translation, bookId, chapter })}
                disabled={!verses.length}
              >
                <ListPlus className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
          {chapterQuery.isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Carregando {reference}...</p>
          ) : chapterQuery.data?.error ? (
            <p className="py-6 text-sm text-destructive">{chapterQuery.data.error}</p>
          ) : (
            <ul className="space-y-1">
              {verses.map((v) => (
                <li key={v.verse}>
                  <button
                    type="button"
                    className="w-full rounded-md p-2 text-left text-sm leading-relaxed transition-colors hover:bg-secondary"
                    onClick={() =>
                      onSendSlide({
                        id: `bible-${bookId}-${chapter}-${v.verse}`,
                        kind: "bible",
                        label: `v. ${v.verse}`,
                        title: reference,
                        lines: [v.text],
                        footer: `${reference}:${v.verse} • ${translationLabel}`,
                      })
                    }
                  >
                    <span className="mr-1.5 font-semibold text-primary">{v.verse}</span>
                    {v.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="buscar" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setTerm(searchInput);
              }}
              placeholder="Palavra ou frase (mín. 3 letras)"
            />
          </div>
          <Button size="sm" onClick={() => setTerm(searchInput)}>
            Buscar
          </Button>
        </div>
        <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
          {searchQuery.isFetching ? (
            <p className="py-6 text-sm text-muted-foreground">Procurando...</p>
          ) : !searchQuery.data ? (
            <p className="py-6 text-sm text-muted-foreground">
              Busque por qualquer palavra na tradução {translationLabel}.
            </p>
          ) : (
            <ul className="space-y-1">
              {(searchQuery.data.hits ?? []).map((hit) => (
                <li key={`${hit.book}-${hit.chapter}-${hit.verse}`}>
                  <button
                    type="button"
                    className="w-full rounded-md p-2 text-left text-sm transition-colors hover:bg-secondary"
                    onClick={() =>
                      onSendSlide({
                        id: `hit-${hit.book}-${hit.chapter}-${hit.verse}`,
                        kind: "bible",
                        label: formatRef(hit.book, hit.chapter, hit.verse),
                        title: formatRef(hit.book, hit.chapter),
                        lines: [hit.text],
                        footer: `${formatRef(hit.book, hit.chapter, hit.verse)} • ${translationLabel}`,
                      })
                    }
                  >
                    <Badge variant="outline" className="mb-1 text-[10px]">
                      {formatRef(hit.book, hit.chapter, hit.verse)}
                    </Badge>
                    <span className="block leading-relaxed">{hit.text}</span>
                  </button>
                </li>
              ))}
              {searchQuery.data.hits?.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Nenhum resultado.</p>
              ) : null}
            </ul>
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="comparar" className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid gap-2">
          <Label>
            Versículo em comparação — {formatRef(bookId, chapter, compareVerseNumber)}
          </Label>
          <div className="flex gap-2">
            <Input
              className="w-24"
              inputMode="numeric"
              value={compareVerseNumber}
              onChange={(e) => setCompareVerseNumber(Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))}
            />
            <Select
              value={compareTargets.join(",")}
              onValueChange={(v) => setCompareTargets(v.split(","))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARA,NVIPT,NTLH">ARA · NVI · NTLH</SelectItem>
                <SelectItem value="ACF11,ARC09,NAA">ACF · ARC · NAA</SelectItem>
                <SelectItem value="NVT,KJA,ALM21">NVT · KJA · A21</SelectItem>
                <SelectItem value="ARA,ACF11,NVIPT,NVT">ARA · ACF · NVI · NVT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
          <ul className="space-y-2">
            {(compareQuery.data?.results ?? []).map((row) => (
              <li key={row.translation} className="rounded-md border border-border/60 bg-secondary/40 p-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    <Columns2 className="mr-1 size-3" />
                    {TRANSLATIONS.find((t) => t.code === row.translation)?.short ?? row.translation}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      onSendSlide({
                        id: `cmp-${row.translation}-${compareVerseNumber}`,
                        kind: "bible",
                        label: `v. ${compareVerseNumber}`,
                        title: formatRef(bookId, chapter),
                        lines: [row.text],
                        footer: `${formatRef(bookId, chapter, compareVerseNumber)} • ${row.translation}`,
                      })
                    }
                  >
                    Projetar
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{row.text}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
