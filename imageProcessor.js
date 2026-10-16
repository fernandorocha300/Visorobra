// Client-side image processing: resize to max 1920px wide, compress to WebP
// targeting 300KB–500KB via adaptive quality, and stamp a technical watermark
// (Obra + Data/Hora) at the bottom-right. Returns a processed File, or the
// original if processing isn't possible.

const MAX_W = 1920;
const MAX_H = 1440;
const TARGET_MIN = 300 * 1024; // 300 KB
const TARGET_MAX = 500 * 1024; // 500 KB

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

export function fmtWatermark(ts = Date.now()) {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function drawWatermark(ctx, w, h, obraName, timestamp) {
  const text = `Obra: ${obraName} | Data: ${fmtWatermark(timestamp)}`;
  const fontSize = Math.max(12, Math.round(h * 0.03));
  ctx.font = `bold ${fontSize}px "Courier New", monospace`;
  ctx.textBaseline = "bottom";

  const padX = Math.round(h * 0.02);
  const padY = Math.round(h * 0.022);
  const tw = ctx.measureText(text).width;
  const th = fontSize;
  const bx = w - tw - padX * 1.5;
  const by = h - padY - th;
  const bw = tw + padX;
  const bh = th + padY * 0.5;

  ctx.fillStyle = "rgba(11, 14, 20, 0.62)";
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#F59E0B";
  ctx.fillText(text, bx + padX * 0.75, by + th + padY * 0.18);
}

function toBlob(canvas, quality) {
  return new Promise((res) => canvas.toBlob(res, "image/webp", quality));
}

// Adaptive compression: try decreasing quality, then downscaling, to land in
// the 300–500 KB band. Never upscales quality beyond what's needed.
async function compressToTarget(img, w, h, obraName, timestamp) {
  let curW = w;
  let curH = h;
  let quality = 0.85;
  let best = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = curW;
    canvas.height = curH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, curW, curH);
    drawWatermark(ctx, curW, curH, obraName, timestamp);

    const blob = await toBlob(canvas, quality);
    if (!blob) break;

    if (blob.size <= TARGET_MAX && blob.size >= TARGET_MIN) {
      best = blob;
      break;
    }
    if (blob.size <= TARGET_MAX) {
      // under target but acceptable — keep the best (largest under cap) so far
      if (!best || blob.size > best.size) best = blob;
      // small enough; stop lowering quality
      if (quality >= 0.6) {
        best = blob;
        break;
      }
      quality += 0.05;
      continue;
    }
    // over target: lower quality first, then downscale
    if (quality > 0.4) {
      quality -= 0.12;
    } else {
      curW = Math.round(curW * 0.85);
      curH = Math.round(curH * 0.85);
      quality = 0.7;
      if (curW < 640) {
        best = blob;
        break;
      }
    }
    best = blob;
  }

  return best;
}

export async function processImage(file, { obraName = "—", timestamp = Date.now() } = {}) {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  try {
    const blob = await compressToTarget(img, w, h, obraName, timestamp);
    if (!blob) return file;
    return new File([blob], `foto_${timestamp}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}

export function fileKb(file) {
  return Math.max(1, Math.round((file?.size || 0) / 1024));
}