import { describe, it, expect } from 'vitest';
import { generateProceduralWaveform } from '../src/utils/waveform-generator';

describe('waveform-generator', () => {
  it('generates the specified count of normalized peaks', () => {
    const peaks = generateProceduralWaveform(40);
    expect(peaks).toHaveLength(40);
  });

  it('keeps all peak values clamped within [0.08, 1.0]', () => {
    const peaks = generateProceduralWaveform(60, 'beat');
    for (const val of peaks) {
      expect(val).toBeGreaterThanOrEqual(0.08);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });

  it('generates different envelopes for beat vs ambient vs sfx', () => {
    const beatPeaks = generateProceduralWaveform(50, 'beat');
    const sfxPeaks = generateProceduralWaveform(50, 'sfx');

    expect(beatPeaks).toHaveLength(50);
    expect(sfxPeaks).toHaveLength(50);
    // SFX starts high and decays
    expect(sfxPeaks[0]).toBeGreaterThan(sfxPeaks[49]);
  });
});
