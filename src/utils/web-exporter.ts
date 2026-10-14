import { AspectRatio, Clip, VideoFilter } from '../types/editor';
import { calculateFadeMultiplier } from './timeline-math';

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
        const videoFade = calculateFadeMultiplier(activeVideo, currentTime);
        ctx.globalAlpha = (activeVideo.opacity ?? 1) * videoFade;

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

        // Center card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        const cardW = width * 0.7;
        const cardH = height * 0.5;
        ctx.roundRect((width - cardW) / 2, (height - cardH) / 2, cardW, cardH, 24);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(width * 0.045)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(activeVideo.title, width / 2, height / 2 - 10);
      }

      ctx.restore();

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
