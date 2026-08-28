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
    colors.forEach((c, i) => grad.addColorStop(i / Math.max(1, colors.length - 1), c ?? theme.fg ?? "#ffffff"));
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

  if (loopKind === "aurora") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < colors.length + 2; i++) {
      const color = colors[i % colors.length] ?? theme.fg ?? "#ffffff";
      const cx = w * (0.5 + 0.35 * Math.sin(t * 0.35 + i * 1.7));
      const cy = h * (0.45 + 0.3 * Math.cos(t * 0.27 + i * 1.1));
      const r = Math.max(w, h) * (0.35 + 0.12 * Math.sin(t * 0.5 + i));
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, colorWithAlpha(color, 0.55));
      grad.addColorStop(1, colorWithAlpha(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  if (loopKind === "blobs") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const count = Math.max(4, Math.min(9, colors.length * 3));
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length] ?? theme.fg ?? "#ffffff";
      const cx = w * (0.5 + 0.36 * Math.sin(t * (0.3 + i * 0.05) + i));
      const cy = h * (0.5 + 0.34 * Math.cos(t * (0.24 + i * 0.06) + i * 2));
      const base = Math.min(w, h) * (0.18 + 0.06 * Math.sin(t + i));
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 24) {
        const wob = 1 + 0.22 * Math.sin(a * 3 + t * 1.4 + i) + 0.12 * Math.cos(a * 5 - t);
        const x = cx + Math.cos(a) * base * wob;
        const y = cy + Math.sin(a) * base * wob;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.4);
      grad.addColorStop(0, colorWithAlpha(color, 0.75));
      grad.addColorStop(1, colorWithAlpha(color, 0.05));
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  if (loopKind === "bokeh") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const count = Math.min(40, Math.max(14, Math.floor((w * h) / 40000)));
    for (let i = 0; i < count; i++) {
      const seed = i * 7.531;
      const color = colors[i % colors.length] ?? theme.fg ?? "#ffffff";
      const r = Math.min(w, h) * (0.03 + fract(seed * 1.7) * 0.09);
      const x = (fract(seed) * w + t * 12 * (0.4 + fract(seed * 3.1))) % (w + r * 2) - r;
      const y = h * fract(seed * 2.3) + Math.sin(t * 0.6 + seed) * h * 0.05;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, colorWithAlpha(color, 0.35 + 0.25 * fract(seed * 5.2)));
      grad.addColorStop(0.7, colorWithAlpha(color, 0.12));
      grad.addColorStop(1, colorWithAlpha(color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (loopKind === "rays") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * (0.15 + 0.05 * Math.sin(t * 0.4));
    const rays = 18;
    for (let i = 0; i < rays; i++) {
      const color = colors[i % colors.length] ?? theme.fg ?? "#ffffff";
      const angle = (i / rays) * Math.PI * 2 + t * 0.15;
      const spread = 0.06 + 0.03 * Math.sin(t * 1.2 + i);
      const len = Math.max(w, h) * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - spread) * len, cy + Math.sin(angle - spread) * len);
      ctx.lineTo(cx + Math.cos(angle + spread) * len, cy + Math.sin(angle + spread) * len);
      ctx.closePath();
      ctx.fillStyle = colorWithAlpha(color, 0.06 + 0.06 * Math.abs(Math.sin(t + i)));
      ctx.fill();
    }
  }

  if (loopKind === "grid") {
    ctx.fillStyle = theme.bg || "#000000";
    ctx.fillRect(0, 0, w, h);
    const cell = Math.max(40, Math.min(w, h) / 14);
    const offset = (t * 20) % cell;
    ctx.lineWidth = Math.max(1, cell * 0.02);
    for (let x = -cell + offset; x <= w + cell; x += cell) {
      ctx.strokeStyle = colorWithAlpha(colors[0] ?? "#ffffff", 0.18);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = -cell + offset; y <= h + cell; y += cell) {
      ctx.strokeStyle = colorWithAlpha(colors[1] ?? colors[0] ?? "#ffffff", 0.14);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const gx = w * (0.5 + 0.3 * Math.sin(t * 0.5));
    const gy = h * (0.5 + 0.3 * Math.cos(t * 0.42));
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.min(w, h) * 0.55);
    glow.addColorStop(0, colorWithAlpha(colors[colors.length - 1] ?? "#ffffff", 0.35));
    glow.addColorStop(1, colorWithAlpha(colors[colors.length - 1] ?? "#ffffff", 0));
    ctx.fillStyle = glow;
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
        r: parseInt(result[1] ?? "00", 16),
        g: parseInt(result[2] ?? "00", 16),
        b: parseInt(result[3] ?? "00", 16),
      }
    : null;
}
