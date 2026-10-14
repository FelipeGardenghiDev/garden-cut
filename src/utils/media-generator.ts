/**
 * Generates sample video clips dynamically using HTML5 Canvas & Web Audio & MediaRecorder
 * with REAL embedded sound and visuals!
 */
export async function createDemoVideoBlob(
  title: string,
  gradientStart: string,
  gradientEnd: string,
  durationSec = 5,
  width = 1280,
  height = 720
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  // Video track from canvas
  const canvasStream = canvas.captureStream(30);

  // Audio track from Web Audio
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioDest = audioCtx.createMediaStreamDestination();

  // Create musical tone chords for the video clip
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4

  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioDest);

  osc1.start();
  osc2.start();

  // Combine video track + audio track
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks()
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';

  const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
  const chunks: Blob[] = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const fps = 30;
  const totalFrames = durationSec * fps;
  let currentFrame = 0;

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      osc1.stop();
      osc2.stop();
      audioCtx.close().catch(() => {});
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };

    mediaRecorder.start();

    const interval = setInterval(() => {
      currentFrame++;
      const progress = currentFrame / totalFrames;

      // Draw background gradient
      const grad = ctx.createLinearGradient(
        0,
        0,
        width * Math.cos(progress * Math.PI * 2),
        height * Math.sin(progress * Math.PI * 2)
      );
      grad.addColorStop(0, gradientStart);
      grad.addColorStop(1, gradientEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw dynamic animated shapes
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(progress * Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(-200, -200, 400, 400, [40]);
      ctx.fill();
      ctx.restore();

      // Title & Frame counter
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(title, width / 2, height / 2 - 20);

      // Subtitle
      ctx.fillStyle = '#fde047';
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.fillText(
        `GardenCut • Frame ${currentFrame} / ${totalFrames} (${(currentFrame / fps).toFixed(1)}s)`,
        width / 2,
        height / 2 + 40
      );

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => mediaRecorder.stop(), 100);
      }
    }, 1000 / fps);
  });
}

export { formatTimecode, formatSeconds } from './timeline-math';
