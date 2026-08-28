import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { SlideCanvas } from "@/components/SlideCanvas";
import type { LiveState, NamedTimer } from "@/lib/projection";
import { DEFAULT_THEME, readLiveState, subscribeLiveState } from "@/lib/projection";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/palco")({
  head: () => ({
    meta: [
      { title: "Retorno de palco — Palco" },
      { name: "description", content: "Monitor de retorno de palco com slide atual, próximo verso e timers." },
      { property: "og:title", content: "Retorno de palco — Palco" },
      { property: "og:description", content: "Monitor de retorno de palco com slide atual, próximo verso e timers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StagePage,
});

function StagePage() {
  const [state, setState] = useState<LiveState>(readLiveState());

  useEffect(() => {
    setState(readLiveState());
    return subscribeLiveState(setState);
  }, []);

  const theme = state.theme ?? DEFAULT_THEME;
  const isLyrics = state.slide?.kind === "lyrics";
  const nextSection = state.nextSection ?? (isLyrics ? state.next : null);
  const activeTimers = (state.timers.items ?? []).filter((t) => t.startedAt);
  const showHeader = state.stage.showClock || state.stage.showService || (state.stage.showTimers && activeTimers.length > 0);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: "#0a0c12", color: "#e5e7eb" }}
    >
      {showHeader ? (
        <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-white/10 bg-black/40 px-6">
          {state.stage.showClock ? <Clock /> : <span />}
          <div className="flex items-center gap-6">
            {state.stage.showService ? <ServiceTimer timers={state.timers} /> : null}
            {state.stage.showTimers
              ? activeTimers.map((timer) => <ItemTimer key={timer.id} timer={timer} />)
              : null}
          </div>
        </header>
      ) : null}

      {/* Mensagem de palco piscante */}
      {state.stage.showMessage && state.stage.message ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center border-b border-white/10 px-4 py-3 text-center font-bold uppercase tracking-wider",
            state.stage.blink && "animate-pulse",
          )}
          style={{ backgroundColor: "#b91c1c", color: "#ffffff" }}
        >
          {state.stage.message}
        </div>
      ) : null}

      <main
        className={cn(
          "grid min-h-0 flex-1 gap-4 p-4",
          isLyrics ? "grid-cols-1 md:grid-cols-[1fr_minmax(22rem,40%)]" : "grid-cols-1",
        )}
      >
        {/* Slide atual */}
        <section className="panel relative flex min-h-0 flex-col overflow-hidden rounded-xl">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg">
            <SlideCanvas
              slide={state.slide}
              theme={theme}
              blackout={state.blackout}
              showLogo={state.showLogo}
              logoText={state.logoText}
              className="h-full w-full"
              media
            />
            {state.freeze ? (
              <div className="absolute left-4 top-4 rounded-md bg-yellow-500/90 px-3 py-1.5 text-sm font-semibold text-black shadow">
                TELA CONGELADA
              </div>
            ) : null}
            {state.blackout ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-2xl font-bold text-white/50">
                BLACKOUT
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs text-white/50">
            <span>Slide atual</span>
            <span>{state.slide?.label ?? state.slide?.title ?? "—"}</span>
          </div>
        </section>

        {/* Próximo verso — apenas para músicas */}
        {isLyrics ? (
          <aside className="flex min-h-0 flex-col gap-4">
            <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs font-medium uppercase tracking-wider text-white/50">
                <span>Próxima parte</span>
                <span className="text-primary">{nextSection?.label ?? "—"}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 px-5 py-5">
                {nextSection?.lines.length ? (
                  nextSection.lines.map((line, i) => (
                    <p key={`${line}-${i}`} className="text-[clamp(1.5rem,3.2vw,3.2rem)] font-bold leading-tight">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-center text-lg text-white/40">Fim da música</p>
                )}
              </div>
              {nextSection?.songKey && nextSection.songKey !== state.songKey ? (
                <div className="border-t border-white/10 px-3 py-2 text-sm">
                  Tom da próxima parte: <span className="font-bold text-primary">{nextSection.songKey}</span>
                </div>
              ) : null}
            </section>
            {state.stage.showNotes && state.notes ? (
              <section className="panel rounded-xl p-4">
                <span className="text-xs uppercase tracking-wider text-white/50">Observações</span>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{state.notes}</p>
              </section>
            ) : null}
          </aside>
        ) : state.stage.showNotes && state.notes ? (
          <section className="panel rounded-xl p-4">
            <span className="text-xs uppercase tracking-wider text-white/50">Observações</span>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{state.notes}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-3xl font-bold tabular-nums tracking-tight">
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function ServiceTimer({ timers }: { timers: LiveState["timers"] }) {
  const now = useTick();
  const elapsed = useMemo(() => {
    if (!timers.serviceStartedAt) return 0;
    const base = (timers.servicePausedAt ?? now) - timers.serviceStartedAt;
    return base;
  }, [timers, now]);

  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/50">Culto</div>
      <div className="text-xl font-bold tabular-nums">{formatDuration(Math.floor(elapsed / 1000))}</div>
    </div>
  );
}

function ItemTimer({ timer }: { timer: NamedTimer }) {
  const now = useTick();
  const remaining = useMemo(() => {
    if (!timer.startedAt) return null;
    const elapsed = (timer.pausedAt ?? now) - timer.startedAt;
    if (!timer.durationMin) return -elapsed; // contagem crescente quando sem duração
    return timer.durationMin * 60 * 1000 - elapsed;
  }, [timer, now]);

  if (remaining === null) return null;
  const seconds = Math.floor(remaining / 1000);
  const warning = seconds < 30 && seconds >= 0;
  const late = seconds < 0;

  return (
    <div className="text-center">
      <div className="max-w-[10rem] truncate text-[10px] uppercase tracking-wider text-white/50">{timer.name}</div>
      <div
        className={cn(
          "text-xl font-bold tabular-nums",
          late ? "text-red-500" : warning ? "text-yellow-400" : "text-white",
        )}
      >
        {formatDuration(seconds)}
      </div>
    </div>
  );
}
