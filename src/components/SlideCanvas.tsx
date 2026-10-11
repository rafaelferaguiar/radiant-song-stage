import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ProjectionLayer, ProjectionSlide, ThemeConfig } from "@/lib/projection";
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

function LayerView({ layer, theme, media }: { layer: ProjectionLayer; theme: ThemeConfig; media: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && layer.kind === "video") {
      video.playbackRate = layer.videoSpeed || 1;
    }
  }, [layer.videoSpeed, layer.kind]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || layer.kind !== "loop") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * scale));
      canvas.height = Math.max(1, Math.floor(rect.height * scale));
    };
    resize();
    const layerTheme: ThemeConfig = {
      ...theme,
      loopKind: layer.loopKind ?? "gradient",
      loopColors: layer.loopColors ?? theme.loopColors,
      loopSpeed: layer.loopSpeed ?? 1,
    };
    let raf = 0;
    if (media) {
      const tick = (time: number) => {
        renderLoop(canvas, layerTheme, ctx, time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      renderLoop(canvas, layerTheme, ctx, 0);
    }
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [layer, theme, media]);

  const style: React.CSSProperties = {
    opacity: layer.opacity / 100,
    mixBlendMode: layer.blend === "normal" ? undefined : (layer.blend as any),
    filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
  };

  if (layer.kind === "color") {
    return (
      <div
        className="pointer-events-none absolute inset-0"
        style={{ ...style, backgroundColor: layer.color ?? "#000" }}
      />
    );
  }

  if (layer.kind === "loop") {
    return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={style} />;
  }

  if (layer.kind === "text") {
    const positionClass =
      layer.position === "top"
        ? "justify-start pt-6"
        : layer.position === "bottom"
          ? "justify-end pb-6"
          : "justify-center";

    const alignClass =
      layer.textAlign === "left"
        ? "items-start text-left pl-6"
        : layer.textAlign === "right"
          ? "items-end text-right pr-6"
          : "items-center text-center px-4";

    return (
      <div
        className={cn("pointer-events-none absolute inset-0 flex flex-col", positionClass, alignClass)}
        style={style}
      >
        <div
          className="rounded px-3 py-1"
          style={{
            backgroundColor: layer.textBgColor || "transparent",
            color: layer.textColor || "#ffffff",
            fontSize: `${layer.fontSize ?? 3}cqw`,
            fontWeight: layer.fontBold !== false ? 700 : 400,
            textShadow: "0 0.2cqw 0.8cqw rgba(0,0,0,0.8)",
          }}
        >
          {layer.text || ""}
        </div>
      </div>
    );
  }

  if (layer.kind === "camera") {
    return <CameraLayerView layer={layer} style={style} />;
  }

  if (layer.kind === "browser") {
    if (!layer.browserUrl) return null;
    // Electron supports <webview> with full browser rendering (like OBS Browser Source)
    // In a regular browser we use <iframe> as fallback
    const isElectronEnv = typeof window !== "undefined" && "electronAPI" in window;
    if (isElectronEnv) {
      return (
        <webview
          key={`${layer.id}-${layer.browserUrl}`}
          src={layer.browserUrl}
          className={cn(
            "absolute inset-0 h-full w-full",
            layer.browserInteractive ? "pointer-events-auto" : "pointer-events-none",
          )}
          // @ts-ignore — webview is an Electron-specific element
          style={style}
          allowpopups="false"
          disablewebsecurity="false"
          webpreferences="contextIsolation=true, javascript=true"
        />
      );
    }
    return (
      <iframe
        key={`${layer.id}-${layer.browserUrl}`}
        src={layer.browserUrl}
        title={`browser-source-${layer.id}`}
        className={cn(
          "absolute inset-0 h-full w-full border-0",
          layer.browserInteractive ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={style}
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="camera; microphone; autoplay; fullscreen"
      />
    );
  }

  if (!layer.url) return null;


  if (layer.kind === "video") {
    return (
      <video
        ref={videoRef}
        key={`${layer.id}-${media ? "live" : "still"}`}
        src={media ? layer.url : `${layer.url}#t=0.1`}
        autoPlay={media}
        loop={layer.videoLoop !== false}
        muted={layer.videoMuted !== false}
        playsInline
        preload={media ? "auto" : "metadata"}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ ...style, objectFit: (layer.fit as any) ?? "cover" }}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        ...style,
        backgroundImage: `url(${layer.url})`,
        backgroundSize: layer.fit === "fill" ? "100% 100%" : (layer.fit ?? "cover"),
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

// Camera layer — getUserMedia (like OBS Virtual Camera / Webcam source)
function CameraLayerView({
  layer,
  style,
}: {
  layer: ProjectionLayer;
  style: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const constraints: MediaStreamConstraints = {
      video: layer.cameraDeviceId
        ? { deviceId: { exact: layer.cameraDeviceId } }
        : true,
      audio: false,
    };
    navigator.mediaDevices
      ?.getUserMedia(constraints)
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => console.warn("Camera layer: getUserMedia error", err));
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [layer.cameraDeviceId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        ...style,
        objectFit: "cover",
        transform: layer.cameraMirrored ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

function LyricsLayerView({
  slide,
  theme,
  empty,
  layer,
}: {
  slide: ProjectionSlide | null;
  theme: ThemeConfig;
  empty: boolean;
  layer?: ProjectionLayer;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const opacity = layer ? layer.opacity / 100 : 1;
  const blendMode = layer && layer.blend !== "normal" ? (layer.blend as any) : undefined;

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || empty || !slide?.lines?.length) {
      setFitScale(1);
      return;
    }

    const computeFit = () => {
      content.style.transform = "none";
      const containerH = container.clientHeight;
      const containerW = container.clientWidth;
      const contentH = content.scrollHeight;
      const contentW = content.scrollWidth;

      if (containerH > 0 && containerW > 0 && contentH > 0 && contentW > 0) {
        // Se ultrapassar a altura ou largura útil (com margem de 95% para segurança e respiro)
        const scaleH = (containerH * 0.95) / contentH;
        const scaleW = (containerW * 0.96) / contentW;
        const targetScale = Math.min(scaleH, scaleW, 1);
        setFitScale(targetScale);
      } else {
        setFitScale(1);
      }
    };

    computeFit();
    const ro = new ResizeObserver(() => computeFit());
    ro.observe(container);
    return () => ro.disconnect();
  }, [slide, theme, empty]);

  const origin =
    theme.vAlign === "center"
      ? (theme.align === "center" ? "center center" : "left center")
      : (theme.align === "center" ? "center bottom" : "left bottom");

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 flex flex-col overflow-hidden",
        theme.vAlign === "center" ? "justify-center" : "justify-end",
        theme.align === "center" ? "items-center text-center" : "items-start text-left",
      )}
      style={{
        padding: `${theme.padding}cqw`,
        opacity,
        mixBlendMode: blendMode,
      }}
    >
      <div
        ref={contentRef}
        className="w-full flex flex-col"
        style={{
          transform: fitScale < 1 ? `scale(${fitScale})` : undefined,
          transformOrigin: origin,
          transition: "transform 0.1s ease-out",
        }}
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

        {empty || !slide ? (
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
            className="mt-3"
            style={{
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
    </div>
  );
}

export function SlideCanvas({
  slide,
  theme: baseTheme,
  blackout = false,
  showLogo = false,
  logoText = "",
  className,
  media = true,
}: SlideCanvasProps) {
  // cada seção da música pode sobrescrever parte do tema
  const theme = slide?.themeOverride ? { ...baseTheme, ...slide.themeOverride } : baseTheme;
  const isMediaSlide = slide?.kind === "media" && !!slide.mediaUrl;
  const empty = !slide || (!slide.lines.length && !isMediaSlide);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const layers = theme.layers ?? [];
  const hasLyricsLayer = layers.some((l) => l.kind === "lyrics");

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

      {/* Camadas empilhadas respeitando a timeline (fundo → topo) */}
      {!blackout
        ? layers.map((layer) => {
            if (!layer.visible) return null;
            if (layer.kind === "lyrics") {
              if (isMediaSlide || showLogo) return null;
              return (
                <LyricsLayerView
                  key={layer.id}
                  slide={slide}
                  theme={theme}
                  empty={empty}
                  layer={layer}
                />
              );
            }
            return <LayerView key={layer.id} layer={layer} theme={theme} media={media} />;
          })
        : null}

      {/* mídia projetada em tela cheia */}
      {!blackout && isMediaSlide ? (
        slide?.mediaKind === "video" ? (
          <video
            key={`${slide.mediaUrl}-${media ? "live" : "still"}`}
            src={media ? slide.mediaUrl : `${slide.mediaUrl}#t=0.1`}
            autoPlay={media}
            loop
            playsInline
            muted
            preload={media ? "auto" : "metadata"}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ objectFit: slide.mediaFit ?? "contain" }}
          />
        ) : (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${slide?.mediaUrl})`,
              backgroundSize: slide?.mediaFit ?? "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        )
      ) : null}

      {/* Fallback de letra se não houver camada de lyrics explícita */}
      {!blackout && !hasLyricsLayer && !isMediaSlide && !showLogo ? (
        <LyricsLayerView slide={slide} theme={theme} empty={empty} />
      ) : null}

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
      ) : null}
    </div>
  );
}
