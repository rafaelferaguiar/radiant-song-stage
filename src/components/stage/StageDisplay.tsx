import { useEffect, useMemo, useRef, useState } from "react";
import { SlideCanvas } from "@/components/SlideCanvas";
import type { LiveState, NamedTimer, StageWidget } from "@/lib/projection";
import { DEFAULT_THEME } from "@/lib/projection";
import { cn } from "@/lib/utils";

// ─── Time & Tick Hooks ───────────────────────────────────────────────────────

export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function formatDuration(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

// ─── Clock & Timers ──────────────────────────────────────────────────────────

export function Clock({ scale = 1 }: { scale?: number }) {
  const now = useNow();
  return (
    <div
      style={{ fontSize: `${Math.round(64 * scale)}px` }}
      className="font-bold tabular-nums tracking-tight text-white"
    >
      {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}

export function ServiceTimer({
  timers,
  large = false,
  scale = 1,
}: {
  timers: LiveState["timers"];
  large?: boolean;
  scale?: number;
}) {
  const now = useTick();
  const elapsed = useMemo(() => {
    if (!timers.serviceStartedAt) return 0;
    return (timers.servicePausedAt ?? now) - timers.serviceStartedAt;
  }, [timers, now]);

  const timeStr = formatDuration(Math.floor(elapsed / 1000));

  return (
    <div className="text-center">
      <div
        className="uppercase tracking-wider text-white/50 font-medium"
        style={{ fontSize: `${Math.round((large ? 18 : 13) * scale)}px` }}
      >
        Culto
      </div>
      <div
        className="font-bold tabular-nums text-white"
        style={{ fontSize: `${Math.round((large ? 54 : 36) * scale)}px` }}
      >
        {timeStr}
      </div>
    </div>
  );
}

export function BigItemTimer({ timer, scale = 1 }: { timer: NamedTimer; scale?: number }) {
  const now = useTick();
  const remaining = useMemo(() => {
    if (!timer.startedAt) return null;
    const elapsed = (timer.pausedAt ?? now) - timer.startedAt;
    if (!timer.durationMin) return -elapsed;
    return timer.durationMin * 60 * 1000 - elapsed;
  }, [timer, now]);

  if (remaining === null) return null;
  const seconds = Math.floor(remaining / 1000);
  const warning = seconds < 60 && seconds >= 0;
  const late = seconds < 0;

  const timeColor = late ? "#ef4444" : warning ? "#facc15" : "#ffffff";
  const glowColor = late ? "rgba(239,68,68,0.4)" : warning ? "rgba(250,204,21,0.3)" : "rgba(99,102,241,0.2)";

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 px-6 py-4"
      style={{
        background: "linear-gradient(135deg, #0f1117 0%, #1a1d26 100%)",
        boxShadow: `0 0 32px ${glowColor}, 0 2px 12px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        className="mb-1 max-w-full truncate font-medium uppercase tracking-widest text-white/60"
        style={{ fontSize: `${Math.round(20 * scale)}px` }}
      >
        {timer.name}
      </div>
      <div
        className={cn(
          "font-black tabular-nums leading-none",
          late && "animate-pulse",
        )}
        style={{
          fontSize: `${Math.round(84 * scale)}px`,
          color: timeColor,
          textShadow: `0 0 40px ${glowColor}, 0 2px 8px rgba(0,0,0,0.5)`,
          letterSpacing: "-0.03em",
        }}
      >
        {formatDuration(seconds)}
      </div>
      {warning && !late ? (
        <div
          className="mt-2 font-semibold uppercase tracking-widest text-yellow-400/80"
          style={{ fontSize: `${Math.round(15 * scale)}px` }}
        >
          Encerramento em breve
        </div>
      ) : late ? (
        <div
          className="mt-2 font-semibold uppercase tracking-widest text-red-400/80 animate-pulse"
          style={{ fontSize: `${Math.round(15 * scale)}px` }}
        >
          Tempo excedido
        </div>
      ) : null}
    </div>
  );
}

// ─── Big Text Overlay ─────────────────────────────────────────────────────────

export function BigTextOverlay({ text }: { text: string }) {
  const len = text.length;
  const fontSize = len > 140 ? "52px" : len > 80 ? "70px" : len > 35 ? "95px" : "125px";

  return (
    <div
      className="absolute inset-0 z-40 flex h-full w-full items-center justify-center p-16"
      style={{
        background: "radial-gradient(ellipse at center, #0f172a 0%, #050709 100%)",
      }}
    >
      <p
        className="text-center font-bold text-white whitespace-pre-wrap max-w-[90%]"
        style={{
          fontSize,
          textShadow: "0 0 80px rgba(99,102,241,0.5), 0 4px 32px rgba(0,0,0,0.8)",
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ─── Stage Traditional View ───────────────────────────────────────────────────

function StageTraditionalView({
  state,
  theme,
  isLyrics,
  nextSection,
  activeTimers,
  media = true,
}: {
  state: LiveState;
  theme: any;
  isLyrics: boolean;
  nextSection: any;
  activeTimers: NamedTimer[];
  media?: boolean;
}) {
  const showHeader =
    state.stage.showClock || state.stage.showService || (state.stage.showTimers && activeTimers.length > 0);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header: relógio + cronômetro de culto */}
      {showHeader ? (
        <header
          className="flex shrink-0 items-center justify-between border-b border-white/10 px-8"
          style={{ height: "100px", background: "linear-gradient(180deg, #111318 0%, #0a0c12 100%)" }}
        >
          {state.stage.showClock ? <Clock /> : <span />}
          <div className="flex items-center gap-8">
            {state.stage.showService ? <ServiceTimer timers={state.timers} large /> : null}
          </div>
        </header>
      ) : null}

      {/* Área Central */}
      <main
        className={cn(
          "grid min-h-0 flex-1 gap-6 p-6",
          isLyrics ? "grid-cols-[1.4fr_1fr]" : "grid-cols-1",
        )}
      >
        {/* Slide atual */}
        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e15] shadow-2xl">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-xl">
            <SlideCanvas
              slide={state.slide}
              theme={theme}
              blackout={state.blackout}
              showLogo={state.showLogo}
              logoText={state.logoText}
              className="h-full w-full"
              media={media}
            />
            {state.freeze ? (
              <div
                className="absolute left-6 top-6 rounded-lg bg-yellow-500/95 px-4 py-2 font-black text-black shadow-lg"
                style={{ fontSize: "20px" }}
              >
                TELA CONGELADA
              </div>
            ) : null}
            {state.blackout ? (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/95 font-black text-white/50 tracking-widest"
                style={{ fontSize: "48px" }}
              >
                BLACKOUT
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-white/40" style={{ fontSize: "16px" }}>
            <span>Slide atual</span>
            <span className="font-medium text-white/70">{state.slide?.label ?? state.slide?.title ?? "—"}</span>
          </div>
        </section>

        {/* Coluna direita: próxima parte ou observações */}
        {isLyrics ? (
          <aside className="flex min-h-0 flex-col gap-6">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e111a] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-semibold uppercase tracking-wider text-white/40" style={{ fontSize: "16px" }}>
                <span>Próxima parte</span>
                <span className="text-primary font-bold">{nextSection?.label ?? "—"}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 px-8 py-6 overflow-hidden">
                {nextSection?.lines?.length ? (
                  nextSection.lines.map((line: string, i: number) => (
                    <p
                      key={`${line}-${i}`}
                      style={{ fontSize: "40px", lineHeight: 1.25 }}
                      className="font-bold text-white/95 leading-tight"
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-center text-white/40" style={{ fontSize: "28px" }}>
                    Fim da música
                  </p>
                )}
              </div>
              {nextSection?.songKey && nextSection.songKey !== state.songKey ? (
                <div className="border-t border-white/10 px-5 py-3" style={{ fontSize: "18px" }}>
                  Tom da próxima parte:{" "}
                  <span className="font-bold text-primary">{nextSection.songKey}</span>
                </div>
              ) : null}
            </section>

            {state.stage.showNotes && state.notes ? (
              <section className="shrink-0 rounded-2xl border border-white/10 bg-[#0e111a] p-6">
                <span className="font-semibold uppercase tracking-wider text-white/40" style={{ fontSize: "15px" }}>
                  Observações
                </span>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-white/80" style={{ fontSize: "20px" }}>
                  {state.notes}
                </p>
              </section>
            ) : null}
          </aside>
        ) : state.stage.showNotes && state.notes ? (
          <section className="rounded-2xl border border-white/10 bg-[#0e111a] p-6">
            <span className="font-semibold uppercase tracking-wider text-white/40" style={{ fontSize: "16px" }}>
              Observações
            </span>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-white/80" style={{ fontSize: "24px" }}>
              {state.notes}
            </p>
          </section>
        ) : null}
      </main>

      {/* Footer: Timers dedicados */}
      {state.stage.showTimers && activeTimers.length > 0 ? (
        <footer
          className="shrink-0 border-t border-white/10 px-6 py-4"
          style={{ background: "#080a10", height: "180px" }}
        >
          <div
            className={cn(
              "grid h-full gap-6",
              activeTimers.length === 1 && "grid-cols-1",
              activeTimers.length === 2 && "grid-cols-2",
              activeTimers.length >= 3 && "grid-cols-3",
            )}
          >
            {activeTimers.map((timer) => (
              <BigItemTimer key={timer.id} timer={timer} />
            ))}
          </div>
        </footer>
      ) : null}
    </div>
  );
}

// ─── Stage Custom Layout View ─────────────────────────────────────────────────

function StageCustomLayoutView({
  state,
  theme,
  layout,
  nextSection,
  activeTimers,
  isLyrics,
  media = true,
}: {
  state: LiveState;
  theme: any;
  layout: StageWidget[];
  nextSection: any;
  activeTimers: NamedTimer[];
  isLyrics: boolean;
  media?: boolean;
}) {
  const { bigText, showBigText } = state.stage;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {layout.map((widget, index) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${widget.x}%`,
          top: `${widget.y}%`,
          width: `${widget.w}%`,
          height: `${widget.h}%`,
          overflow: "hidden",
          zIndex: index + 1,
        };

        if (widget.kind === "clock") {
          if (!state.stage.showClock) return null;
          return (
            <div key={widget.id} style={style} className="flex items-center justify-center">
              <Clock scale={widget.scale ?? 1} />
            </div>
          );
        }

        if (widget.kind === "service") {
          if (!state.stage.showService) return null;
          return (
            <div key={widget.id} style={style} className="flex items-center justify-center">
              <ServiceTimer timers={state.timers} large scale={widget.scale ?? 1} />
            </div>
          );
        }

        if (widget.kind === "slide") {
          const hasNextSection = layout.some((w) => w.kind === "nextSection");
          const slideStyle: React.CSSProperties =
            !isLyrics && hasNextSection
              ? { ...style, left: "1%", width: "98%" }
              : style;

          return (
            <div
              key={widget.id}
              style={slideStyle}
              className="relative flex flex-col rounded-2xl border border-white/10 bg-[#0c0e15] overflow-hidden shadow-2xl"
            >
              <SlideCanvas
                slide={state.slide}
                theme={theme}
                blackout={state.blackout}
                showLogo={state.showLogo}
                logoText={state.logoText}
                className="h-full w-full"
                media={media}
              />
              {state.freeze ? (
                <div
                  className="absolute left-4 top-4 rounded-md bg-yellow-500/90 px-3 py-1 font-bold text-black shadow"
                  style={{ fontSize: "16px" }}
                >
                  CONGELADO
                </div>
              ) : null}
              {state.blackout ? (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-black/95 font-bold text-white/50"
                  style={{ fontSize: "36px" }}
                >
                  BLACKOUT
                </div>
              ) : null}
            </div>
          );
        }

        if (widget.kind === "nextSection") {
          if (!isLyrics || !nextSection) return null;
          return (
            <div
              key={widget.id}
              style={style}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#0e111a] p-6 overflow-hidden shadow-2xl"
            >
              <div
                className="mb-2 uppercase tracking-wider text-white/40 font-semibold"
                style={{ fontSize: `${Math.round(15 * (widget.scale ?? 1))}px` }}
              >
                Próxima parte
              </div>
              <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden">
                {nextSection.lines.map((line: string, i: number) => (
                  <p
                    key={`${line}-${i}`}
                    className="font-bold leading-tight text-white/95"
                    style={{ fontSize: `${Math.round(38 * (widget.scale ?? 1))}px` }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (widget.kind === "timer") {
          if (!state.stage.showTimers || activeTimers.length === 0) return null;
          const timersToShow = widget.timerId
            ? activeTimers.filter((t) => t.id === widget.timerId)
            : activeTimers;
          return (
            <div
              key={widget.id}
              style={{
                ...style,
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(timersToShow.length, 3)}, 1fr)`,
              }}
              className="gap-4 p-2"
            >
              {timersToShow.map((t) => (
                <BigItemTimer key={t.id} timer={t} scale={widget.scale ?? 1} />
              ))}
            </div>
          );
        }

        if (widget.kind === "message") {
          if (!state.stage.showMessage || !state.stage.message) return null;
          return (
            <div
              key={widget.id}
              style={{ ...style, backgroundColor: "#dc2626" }}
              className={cn(
                "flex items-center justify-center font-black uppercase tracking-wider text-white px-6 shadow-2xl",
                state.stage.blink && "animate-pulse",
              )}
            >
              <span style={{ fontSize: `${Math.round(38 * (widget.scale ?? 1))}px` }}>
                ⚠️ {state.stage.message} ⚠️
              </span>
            </div>
          );
        }

        if (widget.kind === "notes") {
          if (!state.stage.showNotes || !state.notes) return null;
          return (
            <div
              key={widget.id}
              style={style}
              className="rounded-2xl border border-white/10 bg-[#0e111a] p-6 overflow-auto shadow-2xl"
            >
              <span
                className="font-semibold uppercase tracking-wider text-white/40"
                style={{ fontSize: `${Math.round(15 * (widget.scale ?? 1))}px` }}
              >
                Observações
              </span>
              <p
                className="mt-2 whitespace-pre-wrap leading-relaxed text-white/80"
                style={{ fontSize: `${Math.round(20 * (widget.scale ?? 1))}px` }}
              >
                {state.notes}
              </p>
            </div>
          );
        }

        if (widget.kind === "bigText") {
          if (!showBigText || !bigText) return null;
          return (
            <div key={widget.id} style={style} className="flex items-center justify-center p-8">
              <p
                className="text-center font-bold text-white whitespace-pre-wrap"
                style={{
                  fontSize: `${Math.round(80 * (widget.scale ?? 1))}px`,
                  textShadow: "0 4px 28px rgba(0,0,0,0.9)",
                }}
              >
                {bigText}
              </p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// ─── StageDisplay Component (Full 1920x1080 Stage Monitor) ────────────────────

export interface StageDisplayProps {
  state: LiveState;
  media?: boolean;
}

export function StageDisplay({ state, media = true }: StageDisplayProps) {
  const theme = state.theme ?? DEFAULT_THEME;
  const isLyrics = Boolean(
    state.slide &&
      state.slide.kind === "lyrics" &&
      state.slide.lines &&
      state.slide.lines.length > 0 &&
      !state.blackout
  );
  const nextSection = state.nextSection ?? (isLyrics ? state.next : null);
  const activeTimers = (state.timers.items ?? []).filter((t) => t.startedAt);
  const { bigText, showBigText } = state.stage;

  // Banner global de aviso para o palco (visível em destaque absoluto em qualquer modo)
  const messageBanner =
    state.stage.showMessage && state.stage.message ? (
      <div
        className={cn(
          "absolute top-0 left-0 right-0 z-50 flex items-center justify-center border-b-4 border-white px-8 py-5 text-center font-black uppercase tracking-wider shadow-2xl transition-all",
          state.stage.blink && "animate-pulse",
        )}
        style={{
          backgroundColor: "#dc2626",
          color: "#ffffff",
          fontSize: "44px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.85)",
        }}
      >
        <span>⚠️ {state.stage.message} ⚠️</span>
      </div>
    ) : null;

  const hasCustomLayout = state.stageLayout && state.stageLayout.length > 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: "#080a10",
        color: "#e5e7eb",
        fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {messageBanner}

      {/* Se BigText estiver ativo e não houver layout customizado que já cuide dele */}
      {showBigText && bigText && !hasCustomLayout ? (
        <BigTextOverlay text={bigText} />
      ) : hasCustomLayout ? (
        <StageCustomLayoutView
          state={state}
          theme={theme}
          layout={state.stageLayout!}
          nextSection={nextSection}
          activeTimers={activeTimers}
          isLyrics={isLyrics}
          media={media}
        />
      ) : (
        <StageTraditionalView
          state={state}
          theme={theme}
          isLyrics={isLyrics}
          nextSection={nextSection}
          activeTimers={activeTimers}
          media={media}
        />
      )}
    </div>
  );
}

// ─── StagePreview Component (Scales 1920x1080 into any Container) ────────────

export interface StagePreviewProps {
  state: LiveState;
  className?: string;
  media?: boolean;
}

export function StagePreview({ state, className, media = false }: StagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Proporção 16:9 em relação a 1920x1080
        const scaleX = rect.width / 1920;
        const scaleY = rect.height / 1080;
        setScale(Math.min(scaleX, scaleY));
      }
    };

    updateScale();

    const ro = new ResizeObserver(() => {
      updateScale();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
      style={{ backgroundColor: "#080a10" }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          width: 1920,
          height: 1080,
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <StageDisplay state={state} media={media} />
      </div>
    </div>
  );
}
