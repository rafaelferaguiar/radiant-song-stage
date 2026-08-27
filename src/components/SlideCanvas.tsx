import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import type { ProjectionSlide, ThemeConfig } from "@/lib/projection";

interface SlideCanvasProps {
  slide: ProjectionSlide | null;
  theme: ThemeConfig;
  blackout?: boolean;
  showLogo?: boolean;
  logoText?: string;
  className?: string;
  /** Desative em miniaturas para não rodar vários vídeos ao mesmo tempo. */
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

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = theme.bgSpeed || 1;
  }, [theme.bgSpeed, theme.bgUrl]);

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
      {!blackout && theme.bgKind !== "none" && theme.bgUrl ? (
        theme.bgKind === "video" ? (
          media ? (
            <video
              ref={videoRef}
              key={theme.bgUrl}
              src={theme.bgUrl}
              autoPlay
              loop={theme.bgLoop}
              muted={theme.bgMuted}
              playsInline
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{
                objectFit: theme.bgFit,
                filter: theme.bgBlur ? `blur(${theme.bgBlur}px)` : undefined,
              }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-black/40" />
          )
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
        style={{ backgroundColor: "#000", opacity: theme.overlay / 400 }}
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
