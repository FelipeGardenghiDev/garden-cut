/**
 * Audio Waveform Generator for GardenCut
 * Extracts amplitude peaks from AudioBuffers or generates aesthetic procedural waveforms.
 */

export function generateProceduralWaveform(samplesCount = 50, type = 'beat'): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < samplesCount; i++) {
    // Generate rhythmic pulsating waveform with beats
    const beatPhase = (i % 8) / 8;
    const isKick = i % 8 === 0;
    const isSnare = i % 8 === 4;
    
    let base = 0.2 + 0.3 * Math.sin((i / samplesCount) * Math.PI * 4);
    if (isKick) base = 0.85 + Math.random() * 0.15;
    else if (isSnare) base = 0.65 + Math.random() * 0.15;
    else base = 0.15 + 0.35 * Math.sin(beatPhase * Math.PI) + Math.random() * 0.1;

    if (type === 'ambient') {
      base = 0.2 + 0.4 * Math.sin((i / samplesCount) * Math.PI * 2) + Math.random() * 0.15;
    } else if (type === 'sfx') {
      // Exponential decay
      base = Math.max(0.1, Math.exp(-i / (samplesCount * 0.3)) * 0.9 + Math.random() * 0.1);
    }

    peaks.push(Math.max(0.08, Math.min(1.0, Number(base.toFixed(2)))));
  }
  return peaks;
}

/**
 * Extracts normalized peak amplitude values (0.0 to 1.0) from an audio Blob or URL.
 */
export async function extractWaveformPeaks(
  audioSource: Blob | string,
  samplesCount = 50
): Promise<number[]> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (typeof audioSource === 'string') {
      if (audioSource.startsWith('data:') || audioSource.startsWith('blob:') || audioSource.startsWith('http')) {
        const res = await fetch(audioSource);
        arrayBuffer = await res.arrayBuffer();
      } else {
        return generateProceduralWaveform(samplesCount);
      }
    } else if (audioSource instanceof Blob) {
      arrayBuffer = await audioSource.arrayBuffer();
    } else {
      return generateProceduralWaveform(samplesCount);
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return generateProceduralWaveform(samplesCount);
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    await audioCtx.close().catch(() => {});

    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samplesCount);
    const peaks: number[] = [];

    let maxPeak = 0.001;

    for (let i = 0; i < samplesCount; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      let sum = 0;

      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }

      const avg = sum / (end - start || 1);
      peaks.push(avg);
      if (avg > maxPeak) maxPeak = avg;
    }

    // Normalize peaks to [0.08, 1.0]
    return peaks.map((p) => Math.max(0.08, Math.min(1.0, Number((p / maxPeak).toFixed(2)))));
  } catch (err) {
    console.warn('Could not extract waveform from audio buffer, falling back to procedural:', err);
    return generateProceduralWaveform(samplesCount);
  }
}
