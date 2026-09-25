/**
 * High-performance Web Audio Synthesizer for GardenCut.
 * Generates real, audible WAV files on the fly using OfflineAudioContext.
 */

// Helper to convert AudioBuffer to WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write PCM audio samples
  let offset = 44;
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channels[channel][i];
      // Clip sample
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Synthesizes a real, groovy Lo-Fi chill beat audio track
 */
export async function generateLofiBeatAudioBlob(durationSec = 10): Promise<string> {
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * durationSec, sampleRate);

  const tempo = 85; // BPM
  const beatDuration = 60 / tempo; // ~0.705s per beat
  const totalBeats = Math.floor(durationSec / beatDuration);

  // Chord frequencies (Lo-Fi progression: Fmaj7, Em7, Dm7, Cmaj7)
  const chordProgression = [
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [164.81, 196.00, 246.94, 293.66], // Em7
    [146.83, 174.61, 220.00, 261.63], // Dm7
    [130.81, 164.81, 196.00, 246.94], // Cmaj7
  ];

  // 1. Synth Chords
  for (let beat = 0; beat < totalBeats; beat += 2) {
    const chordIndex = Math.floor(beat / 4) % chordProgression.length;
    const chord = chordProgression[chordIndex];
    const startTime = beat * beatDuration;

    chord.forEach((freq) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      const filter = offlineCtx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + beatDuration * 2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + beatDuration * 2);
    });
  }

  // 2. Drums (Kick & Snare & Hi-Hat)
  for (let beat = 0; beat < totalBeats; beat++) {
    const time = beat * beatDuration;

    // Kick on beats 0, 2, 4...
    if (beat % 2 === 0) {
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(130, time);
      kickOsc.frequency.exponentialRampToValueAtTime(35, time + 0.2);

      kickGain.gain.setValueAtTime(0.3, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

      kickOsc.connect(kickGain);
      kickGain.connect(offlineCtx.destination);

      kickOsc.start(time);
      kickOsc.stop(time + 0.25);
    }

    // Snare / Rimshot on beats 1, 3, 5...
    if (beat % 2 === 1) {
      const snareOsc = offlineCtx.createOscillator();
      const snareGain = offlineCtx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(200, time);
      snareGain.gain.setValueAtTime(0.15, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      snareOsc.connect(snareGain);
      snareGain.connect(offlineCtx.destination);

      snareOsc.start(time);
      snareOsc.stop(time + 0.15);
    }

    // Hi-hat on every half beat
    [0, 0.5].forEach((offset) => {
      const hatTime = time + offset * beatDuration;
      if (hatTime < durationSec) {
        const hatOsc = offlineCtx.createOscillator();
        const hatGain = offlineCtx.createGain();
        const hatFilter = offlineCtx.createBiquadFilter();

        hatOsc.type = 'square';
        hatOsc.frequency.setValueAtTime(6000, hatTime);
        hatFilter.type = 'highpass';
        hatFilter.frequency.setValueAtTime(5000, hatTime);

        hatGain.gain.setValueAtTime(0.04, hatTime);
        hatGain.gain.exponentialRampToValueAtTime(0.001, hatTime + 0.05);

        hatOsc.connect(hatFilter);
        hatFilter.connect(hatGain);
        hatGain.connect(offlineCtx.destination);

        hatOsc.start(hatTime);
        hatOsc.stop(hatTime + 0.06);
      }
    });
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  return URL.createObjectURL(wavBlob);
}

/**
 * Synthesizes a Whoosh Transition Sound Effect
 */
export async function generateWhooshSfxBlob(): Promise<string> {
  const sampleRate = 44100;
  const duration = 0.8;
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  // White noise buffer
  const bufferSize = sampleRate * duration;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(200, 0);
  filter.frequency.exponentialRampToValueAtTime(2500, 0.4);
  filter.frequency.exponentialRampToValueAtTime(200, 0.8);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, 0);
  gain.gain.linearRampToValueAtTime(0.4, 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, 0.8);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  whiteNoise.start(0);
  whiteNoise.stop(duration);

  const rendered = await ctx.startRendering();
  return URL.createObjectURL(audioBufferToWav(rendered));
}

/**
 * Synthesizes a Ding Chime Sound Effect
 */
export async function generateDingSfxBlob(): Promise<string> {
  const sampleRate = 44100;
  const duration = 1.2;
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1318.5, 0); // E6

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2637.0, 0); // E7 harmonic

  gain.gain.setValueAtTime(0.35, 0);
  gain.gain.exponentialRampToValueAtTime(0.0001, duration);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(0);
  osc2.start(0);
  osc.stop(duration);
  osc2.stop(duration);

  const rendered = await ctx.startRendering();
  return URL.createObjectURL(audioBufferToWav(rendered));
}

/**
 * Synthesizes a Pop Sound Effect
 */
export async function generatePopSfxBlob(): Promise<string> {
  const sampleRate = 44100;
  const duration = 0.2;
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, 0);
  osc.frequency.exponentialRampToValueAtTime(80, 0.12);

  gain.gain.setValueAtTime(0.4, 0);
  gain.gain.exponentialRampToValueAtTime(0.001, 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(0);
  osc.stop(duration);

  const rendered = await ctx.startRendering();
  return URL.createObjectURL(audioBufferToWav(rendered));
}

/**
 * Synthesizes a Bass Drop Sound Effect
 */
export async function generateBassDropBlob(): Promise<string> {
  const sampleRate = 44100;
  const duration = 2.0;
  const ctx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, 0);
  osc.frequency.exponentialRampToValueAtTime(32, 1.8);

  gain.gain.setValueAtTime(0.5, 0);
  gain.gain.linearRampToValueAtTime(0.4, 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, 2.0);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(0);
  osc.stop(duration);

  const rendered = await ctx.startRendering();
  return URL.createObjectURL(audioBufferToWav(rendered));
}
