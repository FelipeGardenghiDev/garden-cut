import { ChromaKeySettings, BlurMaskSettings } from '../types/editor';

/**
 * Parses a hex color string (#00ff00 or #0f0) into [r, g, b] values (0-255).
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [0, 255, 0]; // Default green
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Applies Chroma Key (green/blue screen removal) with spill suppression
 * directly to a 2D canvas context.
 */
export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  chromaKey: ChromaKeySettings
): void {
  if (!chromaKey.enabled || width <= 0 || height <= 0) return;

  const [targetR, targetG, targetB] = hexToRgb(chromaKey.color);
  const tolerance = Math.max(0.01, Math.min(1.0, chromaKey.tolerance));
  const smoothness = Math.max(0.0, Math.min(0.5, chromaKey.smoothness));

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const isGreenKey = targetG > targetR && targetG > targetB;

  // Maximum distance between two RGB colors is sqrt(255^2 * 3) ~ 441.67
  const maxDistance = 441.67295593;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const currentA = data[i + 3];

    if (currentA === 0) continue;

    const dist = Math.hypot(r - targetR, g - targetG, b - targetB) / maxDistance;

    if (dist < tolerance) {
      // Complete transparency
      data[i + 3] = 0;
    } else if (dist < tolerance + smoothness && smoothness > 0) {
      // Soft alpha edge
      const fade = (dist - tolerance) / smoothness;
      data[i + 3] = Math.floor(currentA * fade);

      // Spill suppression on soft edges
      if (isGreenKey) {
        data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
      }
    } else if (isGreenKey && dist < tolerance + 0.15) {
      // Spill suppression nearby
      data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Applies a Privacy Blur or Pixelation Mask to a specific bounding box
 * on the canvas, ideal for obscuring passwords, bank info, or faces.
 */
export function applyBlurMaskToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mask: BlurMaskSettings
): void {
  if (!mask.enabled || width <= 0 || height <= 0) return;

  const boxW = Math.max(8, Math.round((mask.width / 100) * width));
  const boxH = Math.max(8, Math.round((mask.height / 100) * height));
  const boxX = Math.round(width / 2 + (mask.x / 100) * width - boxW / 2);
  const boxY = Math.round(height / 2 + (mask.y / 100) * height - boxH / 2);

  if (mask.type === 'pixelate') {
    // Pixelation effect via downscale and nearest-neighbor upscale
    const pixelSize = Math.max(4, Math.round((mask.blurRadius || 12) * 1.5));
    const smallW = Math.max(2, Math.floor(boxW / pixelSize));
    const smallH = Math.max(2, Math.floor(boxH / pixelSize));

    const offscreen = document.createElement('canvas');
    offscreen.width = smallW;
    offscreen.height = smallH;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Draw downscaled snippet
    offCtx.drawImage(ctx.canvas, boxX, boxY, boxW, boxH, 0, 0, smallW, smallH);

    // Draw back upscaled with smoothing disabled
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, smallW, smallH, boxX, boxY, boxW, boxH);
    ctx.restore();
  } else {
    // Blur mask effect using clip and filter
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.clip();
    ctx.filter = `blur(${mask.blurRadius || 12}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
}
