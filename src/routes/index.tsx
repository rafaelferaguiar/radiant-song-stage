import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Layers, Monitor, Music4, Palette, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Palco — Projeção de louvor, letras e Bíblia" },
      {
        name: "description",
        content:
          "Projete músicas, letras e passagens bíblicas com editor de slides, temas personalizáveis, comparação de traduções e segunda tela dedicada.",
      },
      { property: "og:title", content: "Palco — Projeção de louvor, letras e Bíblia" },
      {
        property: "og:description",
        content:
          "Console de projeção completo para igrejas: biblioteca de músicas, Bíblia em várias traduções, repertórios e tela de projeção separada.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Music4,
    title: "Biblioteca de músicas",
    text: "Editor com seções, arranjo, tom, BPM, CCLI e tags. A letra vira slides automaticamente.",
  },
  {
    icon: BookOpen,
    title: "Bíblia completa",
    text: "10 traduções em português, referência rápida (jo 3:16), busca por palavra e comparação lado a lado.",
  },
  {
    icon: Monitor,
    title: "Segunda tela real",
    text: "Janela de projeção independente para o monitor/projetor, sincronizada em tempo real.",
  },
  {
    icon: Palette,
    title: "Editor de temas",
    text: "Fonte, tamanho, cores, margens, sombra, rodapé e transições — salvos na sua conta.",
  },
  {
    icon: Layers,
    title: "Repertórios",
    text: "Monte a ordem do culto com músicas, passagens e avisos, e reordene em segundos.",
  },
  {
    icon: Sparkles,
    title: "Operação ao vivo",
    text: "Preview e ao vivo separados, blackout, tela de abertura e atalhos de teclado.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-stage">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">
          Palco<span className="text-primary">.</span>
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/estudio">Abrir estúdio</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 md:pt-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" /> Projeção profissional no navegador
        </p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] font-bold md:text-6xl">
          Toda a projeção do culto em um só console.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          Letras, Bíblia em várias traduções, avisos e temas personalizados — controlados de um lado,
          projetados do outro, sem instalar nada.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/estudio">Começar agora</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/projecao">Ver tela de projeção</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="panel p-5">
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Palco · sistema de projeção para igrejas e eventos
      </footer>
    </main>
  );
}
