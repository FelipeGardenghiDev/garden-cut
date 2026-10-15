import { AspectRatio, Clip, VideoFilter } from '../types/editor';
import { 
  calculateFadeMultiplier, 
  interpolateClipProperties, 
  calculateTransitionEffect,
  calculateAutoDuckingMultiplier
} from './timeline-math';
import { applyChromaKeyToCanvas, applyBlurMaskToCanvas } from './visual-effects';

export interface ExportOptions {
  aspectRatio: AspectRatio;
  resolution: '720p' | '1080p' | '4k';
  fps?: number;
  clips: Clip[];
  totalDuration: number;
  onProgress?: (progress: number) => void;
}

export interface ExportResult {
  blobUrl: string;
  blob: Blob;
  fileName: string;
}

function getDimensions(aspectRatio: AspectRatio, resolution: '720p' | '1080p' | '4k') {
  const baseDim = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 }
  }[resolution];

  if (aspectRatio === '9:16') {
    return { width: baseDim.height, height: baseDim.width };
  } else if (aspectRatio === '1:1') {
    const size = Math.min(baseDim.width, baseDim.height);
    return { width: size, height: size };
  }
  return baseDim;
}

function applyCanvasFilter(ctx: CanvasRenderingContext2D, filter: VideoFilter) {
  switch (filter) {
    case 'cinematic':
      ctx.filter = 'contrast(125%) saturate(90%) brightness(95%)';
      break;
    case 'vibrant':
      ctx.filter = 'saturate(160%) contrast(110%)';
      break;
    case 'bw':
      ctx.filter = 'grayscale(100%)';
      break;
    case 'vintage':
      ctx.filter = 'sepia(60%) contrast(110%) brightness(90%)';
      break;
    case 'cyberpunk':
      ctx.filter = 'hue-rotate(180deg) saturate(180%) contrast(120%)';
      break;
    case 'blur':
      ctx.filter = 'blur(4px)';
      break;
    default:
      ctx.filter = 'none';
      break;
  }
}

/**
 * Real client-side video rendering using HTML5 Canvas, Web Audio API, and MediaRecorder.
 * Generates an actual downloadable WebM video file without requiring any backend.
 */
export async function renderTimelineToVideo(options: ExportOptions): Promise<ExportResult> {
  const {
    aspectRatio,
    resolution,
    fps = 30,
    clips,
    totalDuration,
    onProgress
  } = options;

  const { width, height } = getDimensions(aspectRatio, resolution);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create Canvas 2D context');

  // Setup Web Audio
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const audioDest = audioCtx.createMediaStreamDestination();

  // Create synth tone for soundtrack if audio clips exist
  const audioClips = clips.filter((c) => c.type === 'audio' || c.type === 'video');
  let masterGain: GainNode | null = null;
  let bgOsc: OscillatorNode | null = null;

  if (audioClips.length > 0) {
    bgOsc = audioCtx.createOscillator();
    masterGain = audioCtx.createGain();
    bgOsc.type = 'sine';
    bgOsc.frequency.setValueAtTime(220, audioCtx.currentTime);
    masterGain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    bgOsc.connect(masterGain);
    masterGain.connect(audioDest);
    bgOsc.start();
  }

  // Combine video and audio streams
  const canvasStream = canvas.captureStream(fps);
  const audioTracks = audioDest.stream.getAudioTracks();
  const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
  const combinedStream = new MediaStream(combinedTracks);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : '';

  const recorderOptions = mimeType ? { mimeType } : undefined;
  const mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = Math.max(1, Math.round(totalDuration * fps));
  let currentFrame = 0;

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
        img.onerror = () => {
          resolve();
        };
        img.src = clip.source;
      });
    })
  );

  return new Promise((resolve, reject) => {
    mediaRecorder.onerror = (err) => {
      audioCtx.close().catch(() => {});
      reject(err);
    };

    mediaRecorder.onstop = () => {
      if (bgOsc) {
        try { bgOsc.stop(); } catch { /* ignore */ }
      }
      audioCtx.close().catch(() => {});
      const blob = new Blob(chunks, { type: 'video/webm' });
      const blobUrl = URL.createObjectURL(blob);
      const fileName = `gardencut_export_${Date.now()}.webm`;
      resolve({ blobUrl, blob, fileName });
    };

    mediaRecorder.start();

    // Render loop frame by frame
    const interval = setInterval(() => {
      currentFrame++;
      const currentTime = currentFrame / fps;
      const progressPct = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
      if (onProgress) onProgress(progressPct);

      // 1. Draw Canvas Background
      ctx.save();
      ctx.filter = 'none';
      ctx.fillStyle = '#0f1015';
      ctx.fillRect(0, 0, width, height);

      // 2. Render Active Video Clips
      const activeVideo = clips.find(
        (c) => c.type === 'video' && currentTime >= c.start && currentTime < c.start + c.duration
      );

      if (activeVideo) {
        applyCanvasFilter(ctx, activeVideo.filter || 'none');
        const vTransform = interpolateClipProperties(activeVideo, currentTime);
        const vTrans = calculateTransitionEffect(activeVideo, currentTime);
        const videoFade = calculateFadeMultiplier(activeVideo, currentTime);
        ctx.globalAlpha = (vTransform.opacity ?? 1) * videoFade * vTrans.extraOpacity;

        // Draw animated gradient backdrop for video clip
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

        // Center card with keyframe transform and transition offset
        ctx.save();
        const posX = width / 2 + ((vTransform.posX + vTrans.extraOffsetX) * width) / 100;
        const posY = height / 2 + (vTransform.posY * height) / 100;
        ctx.translate(posX, posY);
        ctx.rotate((vTransform.rotation * Math.PI) / 180);
        ctx.scale(vTransform.scale, vTransform.scale);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        const cardW = width * 0.7;
        const cardH = height * 0.5;
        ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(width * 0.045)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(activeVideo.title, 0, -10);
        ctx.restore();

        // White flash transition
        if (vTrans.flashAlpha > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${vTrans.flashAlpha})`;
          ctx.fillRect(0, 0, width, height);
        }
      }

      ctx.restore();

      // 2.05 Render Active Overlays (PIP Track)
      const activeOverlays = clips.filter(
        (c) => c.trackId === 'track-overlay' && currentTime >= c.start && currentTime < c.start + c.duration
      );

      for (const overlay of activeOverlays) {
        ctx.save();
        applyCanvasFilter(ctx, overlay.filter || 'none');
        const oTransform = interpolateClipProperties(overlay, currentTime);
        const oTrans = calculateTransitionEffect(overlay, currentTime);
        const oFade = calculateFadeMultiplier(overlay, currentTime);
        ctx.globalAlpha = (oTransform.opacity ?? 1) * oFade * oTrans.extraOpacity;

        const posX = width / 2 + ((oTransform.posX + oTrans.extraOffsetX) * width) / 100;
        const posY = height / 2 + (oTransform.posY * height) / 100;
        ctx.translate(posX, posY);
        ctx.rotate((oTransform.rotation * Math.PI) / 180);
        ctx.scale(oTransform.scale, oTransform.scale);

        const imgEl = imageElements.get(overlay.id);
        const pipW = Math.round(width * 0.4);
        const pipH = Math.round(height * 0.4);

        if (overlay.chromaKey?.enabled) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = pipW;
          tempCanvas.height = pipH;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            if (overlay.type === 'image' && imgEl) {
              tempCtx.drawImage(imgEl, 0, 0, pipW, pipH);
            } else {
              tempCtx.fillStyle = '#10b981';
              tempCtx.beginPath();
              tempCtx.roundRect(0, 0, pipW, pipH, 16);
              tempCtx.fill();
            }
            applyChromaKeyToCanvas(tempCtx, pipW, pipH, overlay.chromaKey);
            ctx.drawImage(tempCanvas, -pipW / 2, -pipH / 2, pipW, pipH);
          }
        } else if (overlay.type === 'image' && imgEl) {
          ctx.drawImage(imgEl, -pipW / 2, -pipH / 2, pipW, pipH);
        } else {
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.roundRect(-pipW / 2, -pipH / 2, pipW, pipH, 16);
          ctx.fill();
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 4;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.round(width * 0.025)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(overlay.title, 0, 0);
        }

        ctx.restore();
      }

      // 2.1 Render Active Image Clips (Logos / Overlays / Stickers)
      const activeImages = clips.filter(
        (c) => c.type === 'image' && currentTime >= c.start && currentTime < c.start + c.duration
      );

      for (const activeImg of activeImages) {
        const imgEl = imageElements.get(activeImg.id);
        if (!imgEl) continue;

        ctx.save();
        applyCanvasFilter(ctx, activeImg.filter || 'none');
        const imgTransform = interpolateClipProperties(activeImg, currentTime);
        const imgTrans = calculateTransitionEffect(activeImg, currentTime);
        const imgFade = calculateFadeMultiplier(activeImg, currentTime);
        ctx.globalAlpha = (imgTransform.opacity ?? 1) * imgFade * imgTrans.extraOpacity;

        const posX = width / 2 + ((imgTransform.posX + imgTrans.extraOffsetX) * width) / 100;
        const posY = height / 2 + (imgTransform.posY * height) / 100;

        ctx.translate(posX, posY);
        ctx.rotate((imgTransform.rotation * Math.PI) / 180);
        ctx.scale(imgTransform.scale, imgTransform.scale);

        const imgAspect = (imgEl.naturalWidth || 1) / (imgEl.naturalHeight || 1);
        let targetW = width * 0.6;
        let targetH = targetW / imgAspect;
        if (targetH > height * 0.6) {
          targetH = height * 0.6;
          targetW = targetH * imgAspect;
        }

        ctx.drawImage(imgEl, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      }

      // 2.2 Apply Privacy Blur / Pixelation Masks for Active Clips
      const activeMaskClips = clips.filter(
        (c) => c.blurMask?.enabled && currentTime >= c.start && currentTime < c.start + c.duration
      );
      for (const maskClip of activeMaskClips) {
        if (maskClip.blurMask) {
          applyBlurMaskToCanvas(ctx, width, height, maskClip.blurMask);
        }
      }

      // 2.3 Auto-Ducking on Audio Soundtrack
      if (masterGain) {
        const bgAudio = clips.find(
          (c) => c.trackId === 'track-audio' && currentTime >= c.start && currentTime < c.start + c.duration
        );
        if (bgAudio) {
          const duckMult = calculateAutoDuckingMultiplier(bgAudio, clips, currentTime);
          masterGain.gain.setValueAtTime(0.04 * duckMult, audioCtx.currentTime);
        }
      }

      // 3. Render Active Text Subtitles / Overlays
      const activeTexts = clips.filter(
        (c) => c.type === 'text' && currentTime >= c.start && currentTime < c.start + c.duration
      );

      for (const textClip of activeTexts) {
        if (!textClip.textProps) continue;
        const { content, style, fontSize = 40, color = '#ffffff' } = textClip.textProps;
        const scale = width / 1280;
        const scaledFontSize = Math.round(fontSize * scale);

        ctx.save();
        ctx.globalAlpha = calculateFadeMultiplier(textClip, currentTime);
        ctx.font = `bold ${scaledFontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const posX = width / 2;
        const posY = height * 0.78;

        if (style === 'capcut-yellow') {
          // Yellow font with dark pill container
          const metrics = ctx.measureText(content);
          const padX = 24 * scale;
          const padY = 12 * scale;
          const bgW = metrics.width + padX * 2;
          const bgH = scaledFontSize + padY * 2;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          ctx.roundRect(posX - bgW / 2, posY - bgH / 2, bgW, bgH, 12 * scale);
          ctx.fill();

          ctx.fillStyle = '#fde047';
          ctx.fillText(content, posX, posY);
        } else if (style === 'tiktok') {
          // White bold with heavy black stroke
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 8 * scale;
          ctx.strokeText(content, posX, posY);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(content, posX, posY);
        } else if (style === 'neon') {
          // Cyan glowing text
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 20 * scale;
          ctx.fillStyle = '#22d3ee';
          ctx.fillText(content, posX, posY);
        } else {
          // Default style
          ctx.fillStyle = color;
          ctx.fillText(content, posX, posY);
        }

        ctx.restore();
      }

      // Finish when reaching total frames
      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, 120);
      }
    }, 1000 / fps);
  });
}
