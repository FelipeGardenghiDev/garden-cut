import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { AspectRatio, Clip } from '../types/editor';
import { 
  calculateFadeMultiplier, 
  interpolateClipProperties, 
  calculateTransitionEffect 
} from './timeline-math';

export interface GifExportOptions {
  aspectRatio: AspectRatio;
  clips: Clip[];
  totalDuration: number;
  fps?: number;
  onProgress?: (progress: number) => void;
}

export interface GifExportResult {
  blobUrl: string;
  blob: Blob;
  fileName: string;
}

function getGifDimensions(aspectRatio: AspectRatio) {
  switch (aspectRatio) {
    case '9:16':
      return { width: 270, height: 480 };
    case '1:1':
      return { width: 360, height: 360 };
    case '4:5':
      return { width: 320, height: 400 };
    case '16:9':
    default:
      return { width: 480, height: 270 };
  }
}

export async function renderTimelineToGif(options: GifExportOptions): Promise<GifExportResult> {
  const { aspectRatio, clips, totalDuration, fps = 12, onProgress } = options;
  const { width, height } = getGifDimensions(aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create Canvas 2D context for GIF');

  // Preload image elements for any image clips
  const imageElements = new Map<string, HTMLImageElement>();
  const imageClips = clips.filter((c) => c.type === 'image' && c.source);
  await Promise.all(
    imageClips.map((clip) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageElements.set(clip.id, img);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = clip.source;
      });
    })
  );

  const gif = GIFEncoder();
  const maxGifDuration = Math.min(8, totalDuration); // Cap GIF to 8s max
  const totalFrames = Math.max(1, Math.round(maxGifDuration * fps));
  const delay = Math.round(1000 / fps);

  for (let f = 0; f < totalFrames; f++) {
    const currentTime = f / fps;
    const progress = Math.min(99, Math.round((f / totalFrames) * 100));
    if (onProgress) onProgress(progress);

    // 1. Draw Canvas Background
    ctx.save();
    ctx.fillStyle = '#0f1015';
    ctx.fillRect(0, 0, width, height);

    // 2. Render Active Video
    const activeVideo = clips.find(
      (c) => c.type === 'video' && currentTime >= c.start && currentTime < c.start + c.duration
    );

    if (activeVideo) {
      const vTransform = interpolateClipProperties(activeVideo, currentTime);
      const vTrans = calculateTransitionEffect(activeVideo, currentTime);
      const videoFade = calculateFadeMultiplier(activeVideo, currentTime);
      ctx.globalAlpha = (vTransform.opacity ?? 1) * videoFade * vTrans.extraOpacity;

      const relTime = currentTime - activeVideo.start;
      const grad = ctx.createLinearGradient(
        0,
        0,
        width * (0.5 + 0.5 * Math.cos(relTime)),
        height * (0.5 + 0.5 * Math.sin(relTime))
      );
      grad.addColorStop(0, '#06b6d4');
      grad.addColorStop(0.5, '#3b82f6');
      grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Center card
      ctx.save();
      const posX = width / 2 + ((vTransform.posX + vTrans.extraOffsetX) * width) / 100;
      const posY = height / 2 + (vTransform.posY * height) / 100;
      ctx.translate(posX, posY);
      ctx.rotate((vTransform.rotation * Math.PI) / 180);
      ctx.scale(vTransform.scale, vTransform.scale);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      const cardW = width * 0.7;
      const cardH = height * 0.5;
      ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(width * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(activeVideo.title, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // 3. Render Active Overlays & Images
    const activeOverlays = clips.filter(
      (c) => (c.trackId === 'track-overlay' || c.type === 'image') && currentTime >= c.start && currentTime < c.start + c.duration
    );

    for (const overlay of activeOverlays) {
      const imgEl = imageElements.get(overlay.id);
      if (overlay.type === 'image' && imgEl) {
        ctx.save();
        const oTransform = interpolateClipProperties(overlay, currentTime);
        const oFade = calculateFadeMultiplier(overlay, currentTime);
        ctx.globalAlpha = (oTransform.opacity ?? 1) * oFade;

        const posX = width / 2 + (oTransform.posX * width) / 100;
        const posY = height / 2 + (oTransform.posY * height) / 100;
        ctx.translate(posX, posY);
        ctx.rotate((oTransform.rotation * Math.PI) / 180);
        ctx.scale(oTransform.scale, oTransform.scale);

        const imgAspect = (imgEl.naturalWidth || 1) / (imgEl.naturalHeight || 1);
        let targetW = width * 0.5;
        let targetH = targetW / imgAspect;
        if (targetH > height * 0.5) {
          targetH = height * 0.5;
          targetW = targetH * imgAspect;
        }

        ctx.drawImage(imgEl, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      }
    }

    // 4. Render Active Text
    const activeTexts = clips.filter(
      (c) => c.type === 'text' && currentTime >= c.start && currentTime < c.start + c.duration
    );

    for (const textClip of activeTexts) {
      if (!textClip.textProps) continue;
      const { content, style, fontSize = 32, color = '#ffffff' } = textClip.textProps;
      const scale = width / 640;
      const scaledFontSize = Math.round(fontSize * scale);

      ctx.save();
      ctx.globalAlpha = calculateFadeMultiplier(textClip, currentTime);
      ctx.font = `bold ${scaledFontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const posX = width / 2;
      const posY = height * 0.78;

      if (style === 'capcut-yellow') {
        const metrics = ctx.measureText(content);
        const padX = 14 * scale;
        const padY = 8 * scale;
        const bgW = metrics.width + padX * 2;
        const bgH = scaledFontSize + padY * 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(posX - bgW / 2, posY - bgH / 2, bgW, bgH, 8);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillText(content, posX, posY);
      } else {
        ctx.fillStyle = color;
        ctx.fillText(content, posX, posY);
      }
      ctx.restore();
    }

    // Capture Frame to GIF
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgba = imageData.data;
    const palette = quantize(rgba, 256);
    const index = applyPalette(rgba, palette);
    gif.writeFrame(index, width, height, { palette, delay });
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
  const blobUrl = URL.createObjectURL(blob);
  const fileName = `gardencut_animation_${Date.now()}.gif`;

  if (onProgress) onProgress(100);
  return { blobUrl, blob, fileName };
}
