import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ProjectionSlide, ThemeConfig } from "@/lib/projection";
import { renderLoop } from "@/lib/loops";

interface SlideCanvasProps {
  slide: ProjectionSlide | null;
  theme: ThemeConfig;
  blackout?: boolean;
  showLogo?: boolean;
  logoText?: string;
  className?: string;
  /** Desative em miniaturas para não rodar vários vídeos/loops ao mesmo tempo. */
  media?: boolean;
}

export function SlideCanvas({
  slide,
  theme,
  blackout = false,
  showLogo = false,
  logoText = "",
  className,
  media = true,
}: SlideCanvasProps) {
  const empty = !slide || !slide.lines.length;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = theme.bgSpeed || 1;
  }, [theme.bgSpeed, theme.bgUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || theme.bgKind !== "loop" || theme.loopKind === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // resolução interna para evitar blur em tela grande
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(rect.width * scale);
      canvas.height = Math.floor(rect.height * scale);
    };
    resize();

    let raf = 0;
    if (media) {
      const loop = (time: number) => {
        renderLoop(canvas, theme, ctx, time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      renderLoop(canvas, theme, ctx, 0);
    }
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [theme, media]);

  const overlayOpacity = theme.loopKind !== "none" ? theme.loopOverlay / 100 : theme.overlay / 400;

  return (
    <div
      className={cn("relative isolate h-full w-full overflow-hidden", className)}
      style={{
        containerType: "size",
        backgroundColor: theme.bg,
        color: theme.fg,
        fontFamily: theme.fontFamily,
      }}
    >
      {!blackout && theme.bgKind === "loop" && theme.loopKind !== "none" ? (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ opacity: 1 }}
        />
      ) : !blackout && theme.bgKind !== "none" && theme.bgUrl ? (
        theme.bgKind === "video" ? (
          <video
            ref={videoRef}
            key={`${theme.bgUrl}-${media ? "live" : "still"}`}
            src={media ? theme.bgUrl : `${theme.bgUrl}#t=0.1`}
            autoPlay={media}
            loop={theme.bgLoop}
            muted={media ? theme.bgMuted : true}
            playsInline
            preload={media ? "auto" : "metadata"}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{
              objectFit: theme.bgFit,
              filter: theme.bgBlur ? `blur(${theme.bgBlur}px)` : undefined,
            }}
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${theme.bgUrl})`,
              backgroundSize: theme.bgFit,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: theme.bgBlur ? `blur(${theme.bgBlur}px)` : undefined,
            }}
          />
        )
      ) : null}

      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "#000", opacity: overlayOpacity }}
      />

      {blackout ? null : showLogo ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            style={{
              fontSize: "7cqw",
              color: theme.accentFg,
              letterSpacing: "0.12em",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {logoText || "Bem-vindos"}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col",
            theme.vAlign === "center" ? "justify-center" : "justify-end",
            theme.align === "center" ? "items-center text-center" : "items-start text-left",
          )}
          style={{ padding: `${theme.padding}cqw` }}
        >
          {theme.showTitle && slide?.title ? (
            <p
              style={{
                fontSize: `${Math.max(theme.fontSize * 0.4, 1.6)}cqw`,
                color: theme.accentFg,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: "1.6cqw",
                opacity: 0.9,
              }}
            >
              {slide.title}
            </p>
          ) : null}

          {empty ? (
            <p style={{ fontSize: "2.4cqw", opacity: 0.35 }}>Sem conteúdo na tela</p>
          ) : (
            <div className="w-full" style={{ display: "grid", gap: `${theme.lineHeight * 0.25}cqw` }}>
              {slide.lines.map((line, index) => (
                <p
                  key={`${slide.id}-${index}`}
                  style={{
                    fontSize: `${theme.fontSize}cqw`,
                    lineHeight: theme.lineHeight,
                    letterSpacing: `${theme.letterSpacing}em`,
                    fontWeight: theme.bold ? 700 : 400,
                    textTransform: theme.uppercase ? "uppercase" : "none",
                    textShadow: theme.shadow ? "0 0.35cqw 1.2cqw rgba(0,0,0,0.6)" : "none",
                    margin: 0,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {theme.showFooter && slide?.footer && !empty ? (
            <p
              className="absolute"
              style={{
                bottom: `${Math.max(theme.padding * 0.35, 1.5)}cqw`,
                fontSize: `${Math.max(theme.fontSize * 0.3, 1.3)}cqw`,
                color: theme.accentFg,
                opacity: 0.8,
                letterSpacing: "0.06em",
              }}
            >
              {slide.footer}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
