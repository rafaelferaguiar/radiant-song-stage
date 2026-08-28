import type { BlendMode, LoopKind, ThemeConfig } from "./projection";

export function renderLoop(
  canvas: HTMLCanvasElement,
  theme: ThemeConfig,
  ctx: CanvasRenderingContext2D,
  time: number,
) {
  const { loopKind, loopColors, loopSpeed } = theme;
  if (loopKind === "none") return;
  const w = canvas.width;
  const h = canvas.height;
  const t = time * (loopSpeed || 1) * 0.001;
  const colors = loopColors.length ? loopColors : ["#ffffff", "#000000"];

  ctx.save();

  if (loopKind === "gradient") {
    const angle = t * 0.2;
    const x0 = w * 0.5 + Math.cos(angle) * w * 0.5;
    const y0 = h * 0.5 + Math.sin(angle) * h * 0.5;
    const x1 = w * 0.5 - Math.cos(angle) * w * 0.5;
    const y1 = h * 0.5 - Math.sin(angle) * h * 0.5;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  if (loopKind === "particles") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const count = Math.min(80, Math.max(24, Math.floor((w * h) / 18000)));
    for (let i = 0; i < count; i++) {
      const seed = i * 12.9898;
      const sx = fract(seed);
      const sy = fract(seed * 1.2345);
      const r = 2 + fract(seed * 2.34) * 5;
      const x = (sx * w + (t * 20) * (0.5 + fract(seed * 0.345))) % w;
      const y = (sy * h + Math.sin(t + seed) * 40) % h;
      const color = colors[i % colors.length] ?? theme.fg ?? "#ffffff";
      const alpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.5 + seed));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(color, alpha);
      ctx.fill();
    }
  }

  if (loopKind === "waves") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const baseColor = colors[0];
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 10) {
        const y =
          h * 0.5 +
          Math.sin(x * 0.005 + t * (0.5 + i * 0.15) + i * 1.5) *
            (40 + i * 20);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = colorWithAlpha(
        colors[(i + 1) % colors.length] ?? theme.fg ?? "#ffffff",
        0.2 + 0.1 * Math.sin(t + i),
      );
      ctx.fill();
    }
  }

  if (loopKind === "pulse") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
    const radius = Math.max(w, h) * (0.3 + pulse * 0.4);
    const grad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.5,
      radius * 0.2,
      w * 0.5,
      h * 0.5,
      radius,
    );
    grad.addColorStop(0, colorWithAlpha(colors[0] ?? theme.fg ?? "#ffffff", 0.6 + pulse * 0.3));
    grad.addColorStop(
      1,
      colorWithAlpha(colors[1] ?? colors[0] ?? theme.fg ?? "#ffffff", 0),
    );
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

export function applyBlend(overlay: HTMLDivElement, blend: BlendMode) {
  if (blend === "multiply") overlay.style.mixBlendMode = "multiply";
  else if (blend === "screen") overlay.style.mixBlendMode = "screen";
  else if (blend === "overlay") overlay.style.mixBlendMode = "overlay";
  else overlay.style.mixBlendMode = "normal";
}

function fract(n: number) {
  return n - Math.floor(n);
}

function colorWithAlpha(hex: string, alpha: number) {
  const c = hexToRgb(hex);
  if (!c) return `rgba(255,255,255,${alpha})`;
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
