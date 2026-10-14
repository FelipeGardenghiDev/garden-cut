import { describe, it, expect } from 'vitest';
import { audioBufferToWav } from '../src/utils/audio-engine';

describe('audio-engine audioBufferToWav', () => {
  it('converts an AudioBuffer into a valid 16-bit PCM WAV Blob', async () => {
    const sampleRate = 44100;
    const numChannels = 2;
    const length = 100; // 100 samples

    // Mock AudioBuffer structure
    const mockChannelDataLeft = new Float32Array(length).fill(0.5);
    const mockChannelDataRight = new Float32Array(length).fill(-0.5);

    const mockBuffer = {
      numberOfChannels: numChannels,
      sampleRate: sampleRate,
      length: length,
      duration: length / sampleRate,
      getChannelData: (channel: number) => {
        return channel === 0 ? mockChannelDataLeft : mockChannelDataRight;
      }
    } as unknown as AudioBuffer;

    const wavBlob = audioBufferToWav(mockBuffer);

    expect(wavBlob).toBeInstanceOf(Blob);
    expect(wavBlob.type).toBe('audio/wav');

    // Expected byte size:
    // Header = 44 bytes
    // Audio data = length * numChannels * (bitDepth / 8) = 100 * 2 * 2 = 400 bytes
    // Total = 444 bytes
    expect(wavBlob.size).toBe(444);

    const arrayBuffer = await wavBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Verify RIFF header
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    expect(riff).toBe('RIFF');

    // Verify WAVE identifier
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    );
    expect(wave).toBe('WAVE');

    // Verify fmt chunk
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15)
    );
    expect(fmt).toBe('fmt ');

    // Verify audio format is 1 (PCM)
    expect(view.getUint16(20, true)).toBe(1);

    // Verify channel count
    expect(view.getUint16(22, true)).toBe(2);

    // Verify sample rate
    expect(view.getUint32(24, true)).toBe(44100);

    // Verify bit depth
    expect(view.getUint16(34, true)).toBe(16);

    // Verify data chunk marker
    const dataMarker = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39)
    );
    expect(dataMarker).toBe('data');
    expect(view.getUint32(40, true)).toBe(400);
  });

  it('clamps extreme sample values to [-1, 1] range', async () => {
    const mockChannelData = new Float32Array([2.5, -3.0]); // Out of bounds samples
    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate: 48000,
      length: 2,
      duration: 2 / 48000,
      getChannelData: () => mockChannelData
    } as unknown as AudioBuffer;

    const wavBlob = audioBufferToWav(mockBuffer);
    const arrayBuffer = await wavBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // Byte 44 is first sample, byte 46 is second sample
    const sample1 = view.getInt16(44, true);
    const sample2 = view.getInt16(46, true);

    // Max 16-bit positive is 0x7fff (32767), min negative is -0x8000 (-32768)
    expect(sample1).toBe(32767);
    expect(sample2).toBe(-32768);
  });
});
