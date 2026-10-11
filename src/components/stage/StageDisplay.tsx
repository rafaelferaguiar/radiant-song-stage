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
      style={{ fontSize: `clamp(1.8rem, ${3.5 * scale}vw, ${4.5 * scale}rem)` }}
      className="font-bold tabular-nums tracking-tight text-white leading-none"
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
        style={{ fontSize: large ? "clamp(0.7rem, 1vw, 1.1rem)" : "0.75rem" }}
      >
        Culto
      </div>
      <div
        className="font-bold tabular-nums text-white leading-none"
        style={{ fontSize: large ? `clamp(1.8rem, ${3.2 * scale}vw, ${3.8 * scale}rem)` : "1.4rem" }}
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
      className="flex flex-col items-center justify-center rounded-2xl border border-white/10 px-4 py-2"
      style={{
        background: "linear-gradient(135deg, #0f1117 0%, #1a1d26 100%)",
        boxShadow: `0 0 24px ${glowColor}, 0 2px 10px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        className="mb-0.5 max-w-full truncate font-medium uppercase tracking-widest text-white/60"
        style={{ fontSize: `clamp(0.7rem, ${1.2 * scale}vw, 1.2rem)` }}
      >
        {timer.name}
      </div>
      <div
        className={cn(
          "font-black tabular-nums leading-none",
          late && "animate-pulse",
        )}
        style={{
          fontSize: `clamp(2.5rem, ${5.5 * scale}vw, ${6 * scale}rem)`,
          color: timeColor,
          textShadow: `0 0 35px ${glowColor}, 0 2px 8px rgba(0,0,0,0.5)`,
          letterSpacing: "-0.03em",
        }}
      >
        {formatDuration(seconds)}
      </div>
      {warning && !late ? (
        <div
          className="mt-1 font-semibold uppercase tracking-widest text-yellow-400/80"
          style={{ fontSize: `clamp(0.65rem, ${0.9 * scale}vw, 0.95rem)` }}
        >
          Encerramento em breve
        </div>
      ) : late ? (
        <div
          className="mt-1 font-semibold uppercase tracking-widest text-red-400/80 animate-pulse"
          style={{ fontSize: `clamp(0.65rem, ${0.9 * scale}vw, 0.95rem)` }}
        >
          Tempo excedido
        </div>
      ) : null}
    </div>
  );
}

// ─── Adaptive Lines Component (Auto-Fit for text blocks) ─────────────────────

export function AdaptiveLines({
  lines,
  baseFontSize = "clamp(1.3rem, 2.8vw, 3rem)",
  className,
}: {
  lines: string[];
  baseFontSize?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || !lines.length) {
      setScale(1);
      return;
    }

    const checkFit = () => {
      content.style.transform = "none";
      const cH = container.clientHeight;
      const cW = container.clientWidth;
      const sH = content.scrollHeight;
      const sW = content.scrollWidth;

      if (cH > 0 && cW > 0 && sH > 0 && sW > 0) {
        const scaleH = (cH * 0.95) / sH;
        const scaleW = (cW * 0.98) / sW;
        setScale(Math.min(scaleH, scaleW, 1));
      } else {
        setScale(1);
      }
    };

    checkFit();
    const ro = new ResizeObserver(checkFit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [lines]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden w-full">
      <div
        ref={contentRef}
        className="flex flex-col gap-2 w-full"
        style={{
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "center left",
          transition: "transform 0.1s ease-out",
        }}
      >
        {lines.map((line, i) => (
          <p
            key={`${line}-${i}`}
            style={{ fontSize: baseFontSize, lineHeight: 1.25 }}
            className={cn("font-bold text-white/95 leading-tight", className)}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Big Text Overlay (Auto-Fit Scale) ────────────────────────────────────────

export function BigTextOverlay({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || !text) {
      setScale(1);
      return;
    }

    const checkFit = () => {
      content.style.transform = "none";
      const cH = container.clientHeight;
      const cW = container.clientWidth;
      const sH = content.scrollHeight;
      const sW = content.scrollWidth;

      if (cH > 0 && cW > 0 && sH > 0 && sW > 0) {
        const scaleH = (cH * 0.92) / sH;
        const scaleW = (cW * 0.94) / sW;
        setScale(Math.min(scaleH, scaleW, 1));
      } else {
        setScale(1);
      }
    };

    checkFit();
    const ro = new ResizeObserver(checkFit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40 flex h-full w-full items-center justify-center p-6 md:p-12 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at center, #0f172a 0%, #050709 100%)",
      }}
    >
      <p
        ref={contentRef}
        className="text-center font-bold text-white whitespace-pre-wrap max-w-[96%] leading-tight"
        style={{
          fontSize: "clamp(2.5rem, 7vw, 9rem)",
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "center center",
          transition: "transform 0.1s ease-out",
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

// ─── Stage Traditional View (Fluida e sem barras pretas) ──────────────────────

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

  const hasNextSection = Boolean(
    isLyrics && nextSection && nextSection.lines && nextSection.lines.length > 0
  );
  const showNotes = Boolean(state.stage.showNotes && state.notes);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header: relógio + cronômetro de culto */}
      {showHeader ? (
        <header
          className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 md:px-8 py-2 md:py-3"
          style={{ minHeight: "4.5rem", background: "linear-gradient(180deg, #111318 0%, #0a0c12 100%)" }}
        >
          {state.stage.showClock ? <Clock /> : <span />}
          <div className="flex items-center gap-6">
            {state.stage.showService ? <ServiceTimer timers={state.timers} large /> : null}
          </div>
        </header>
      ) : null}

      {/* Área Central — se ajusta em 100% da tela projetada */}
      <main
        className={cn(
          "grid min-h-0 flex-1 gap-3 md:gap-4 p-3 md:p-4",
          hasNextSection || showNotes
            ? "grid-cols-1 md:grid-cols-[1.3fr_1fr]"
            : "grid-cols-1",
        )}
      >
        {/* Slide atual */}
        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0c0e15] shadow-2xl">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg">
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
              <div className="absolute left-4 top-4 rounded bg-yellow-500/95 px-3 py-1 text-sm font-black text-black shadow-lg">
                TELA CONGELADA
              </div>
            ) : null}
            {state.blackout ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/95 text-3xl md:text-5xl font-black text-white/50 tracking-widest">
                BLACKOUT
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs md:text-sm text-white/40">
            <span>Slide atual</span>
            <span className="font-semibold text-white/70">{state.slide?.label ?? state.slide?.title ?? "—"}</span>
          </div>
        </section>

        {/* Coluna direita: próxima parte ou observações */}
        {hasNextSection ? (
          <aside className="flex min-h-0 flex-col gap-3">
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0e111a] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs md:text-sm font-semibold uppercase tracking-wider text-white/40">
                <span>Próxima parte</span>
                <span className="text-primary font-bold">{nextSection?.label ?? "—"}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-4 overflow-hidden">
                <AdaptiveLines lines={nextSection.lines} />
              </div>
              {nextSection?.songKey && nextSection.songKey !== state.songKey ? (
                <div className="border-t border-white/10 px-4 py-2 text-xs md:text-sm">
                  Tom da próxima parte:{" "}
                  <span className="font-bold text-primary">{nextSection.songKey}</span>
                </div>
              ) : null}
            </section>

            {showNotes ? (
              <section className="shrink-0 rounded-xl border border-white/10 bg-[#0e111a] p-4">
                <span className="text-xs uppercase tracking-wider text-white/40 font-semibold">
                  Observações
                </span>
                <p className="mt-1 whitespace-pre-wrap text-sm md:text-base leading-relaxed text-white/80">
                  {state.notes}
                </p>
              </section>
            ) : null}
          </aside>
        ) : showNotes ? (
          <section className="rounded-xl border border-white/10 bg-[#0e111a] p-5 flex flex-col justify-center">
            <span className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-2">
              Observações
            </span>
            <p className="whitespace-pre-wrap text-base md:text-lg leading-relaxed text-white/80">
              {state.notes}
            </p>
          </section>
        ) : null}
      </main>

      {/* Footer: Timers dedicados */}
      {state.stage.showTimers && activeTimers.length > 0 ? (
        <footer
          className="shrink-0 border-t border-white/10 px-4 py-2.5"
          style={{ background: "#080a10" }}
        >
          <div
            className={cn(
              "grid gap-4",
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
              className="relative flex flex-col rounded-xl border border-white/10 bg-[#0c0e15] overflow-hidden shadow-2xl"
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
                <div className="absolute left-3 top-3 rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-bold text-black shadow">
                  CONGELADO
                </div>
              ) : null}
              {state.blackout ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/95 text-2xl font-bold text-white/50">
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
              className="flex flex-col rounded-xl border border-white/10 bg-[#0e111a] p-4 overflow-hidden shadow-2xl"
            >
              <div
                className="mb-1 uppercase tracking-wider text-white/40 font-semibold"
                style={{ fontSize: `clamp(0.65rem, ${1.2 * (widget.scale ?? 1)}vw, 1.1rem)` }}
              >
                Próxima parte
              </div>
              <AdaptiveLines
                lines={nextSection.lines}
                baseFontSize={`clamp(1rem, ${2.5 * (widget.scale ?? 1)}vw, 3rem)`}
              />
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
              className="gap-3 p-1"
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
                "flex items-center justify-center font-black uppercase tracking-wider text-white px-4 shadow-2xl",
                state.stage.blink && "animate-pulse",
              )}
            >
              <span style={{ fontSize: `clamp(1rem, ${2.5 * (widget.scale ?? 1)}vw, 2.5rem)` }}>
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
              className="rounded-xl border border-white/10 bg-[#0e111a] p-4 overflow-auto shadow-2xl"
            >
              <span
                className="font-semibold uppercase tracking-wider text-white/40"
                style={{ fontSize: `clamp(0.65rem, ${1 * (widget.scale ?? 1)}vw, 1rem)` }}
              >
                Observações
              </span>
              <p
                className="mt-1 whitespace-pre-wrap leading-relaxed text-white/80"
                style={{ fontSize: `clamp(0.8rem, ${1.4 * (widget.scale ?? 1)}vw, 1.4rem)` }}
              >
                {state.notes}
              </p>
            </div>
          );
        }

        if (widget.kind === "bigText") {
          if (!showBigText || !bigText) return null;
          return (
            <div key={widget.id} style={style} className="flex items-center justify-center p-6">
              <p
                className="text-center font-bold text-white whitespace-pre-wrap"
                style={{
                  fontSize: `clamp(2rem, ${6 * (widget.scale ?? 1)}vw, 7rem)`,
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

// ─── StageDisplay Component (Fluido para monitor e preview) ───────────────────

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
          "absolute top-0 left-0 right-0 z-50 flex items-center justify-center border-b-4 border-white px-6 py-3 md:py-4 text-center font-black uppercase tracking-wider shadow-2xl transition-all",
          state.stage.blink && "animate-pulse",
        )}
        style={{
          backgroundColor: "#dc2626",
          color: "#ffffff",
          fontSize: "clamp(1.3rem, 3.2vw, 3rem)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.85)",
        }}
      >
        <span>⚠️ {state.stage.message} ⚠️</span>
      </div>
    ) : null;

  const hasCustomLayout = state.stageLayout && state.stageLayout.length > 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden select-none flex flex-col"
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

// ─── StagePreview Component (Renderiza StageDisplay perfeitamente no Studio) ──

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
        // Usa 1600x900 de referência para miniatura de estúdio
        const scaleX = rect.width / 1600;
        const scaleY = rect.height / 900;
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
          width: 1600,
          height: 900,
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
