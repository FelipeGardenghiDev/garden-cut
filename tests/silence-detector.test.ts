import { describe, it, expect } from 'vitest';
import { 
  linearToDb, 
  calculateWindowRMS, 
  detectSilenceIntervals, 
  computeActiveSpeechIntervals,
  generateAutoJumpCutClips 
} from '../src/utils/silence-detector';
import { ExportQueueManager } from '../src/utils/export-queue';
import { Clip } from '../src/types/editor';

describe('Intelligent Silence Detector & Jump-Cut Engine', () => {
  it('converts linear amplitude to decibels accurately', () => {
    expect(linearToDb(1.0)).toBe(0); // 0 dBFS
    expect(linearToDb(0.1)).toBeCloseTo(-20, 1);
    expect(linearToDb(0.000001)).toBe(-100); // Noise floor
  });

  it('calculates RMS correctly over a buffer slice', () => {
    // Constant signal of amplitude 0.5
    const samples = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const rms = calculateWindowRMS(samples, 0, 4);
    expect(rms).toBeCloseTo(0.5, 3);
  });

  it('detects silence sections when signal drops below threshold', () => {
    const sampleRate = 1000; // 1000 samples per second
    // 2 seconds total:
    // 0.0 - 0.5s: loud (0.8)
    // 0.5 - 1.5s: silent (0.001) -> 1 second of silence
    // 1.5 - 2.0s: loud (0.8)
    const buffer = new Float32Array(2000);
    for (let i = 0; i < 2000; i++) {
      if (i >= 500 && i < 1500) {
        buffer[i] = 0.001; // Silent
      } else {
        buffer[i] = 0.8; // Loud speech
      }
    }

    const silences = detectSilenceIntervals(buffer, sampleRate, {
      thresholdDb: -30,
      minSilenceDurationSec: 0.3,
      windowSizeSec: 0.05
    });

    expect(silences.length).toBe(1);
    expect(silences[0].start).toBeCloseTo(0.5, 1);
    expect(silences[0].end).toBeCloseTo(1.5, 1);
  });

  it('generates active speech intervals inverted from silence with safety padding', () => {
    const silences = [{ start: 1.0, end: 2.0 }];
    const totalDuration = 3.0;
    const speech = computeActiveSpeechIntervals(silences, totalDuration, 0.05);

    expect(speech.length).toBe(2);
    // First speech chunk before silence
    expect(speech[0].start).toBe(0);
    expect(speech[0].end).toBeCloseTo(1.05, 2);

    // Second speech chunk after silence
    expect(speech[1].start).toBeCloseTo(1.95, 2);
    expect(speech[1].end).toBe(3.0);
  });

  it('generates jump-cut subclips automatically from original clip', () => {
    const originalClip: Clip = {
      id: 'clip_1',
      trackId: 'track-video',
      type: 'video',
      title: 'Vlog Takes',
      start: 0,
      duration: 2.0,
      source: 'video.mp4',
      trimStart: 0,
      trimEnd: 2.0,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false
    };

    const sampleRate = 1000;
    const buffer = new Float32Array(2000);
    // Silence between 0.6s and 1.4s (0.8s silence)
    for (let i = 0; i < 2000; i++) {
      buffer[i] = (i >= 600 && i < 1400) ? 0.0001 : 0.7;
    }

    const cutClips = generateAutoJumpCutClips(originalClip, buffer, sampleRate, {
      thresholdDb: -30,
      minSilenceDurationSec: 0.3,
      speechPaddingSec: 0.05
    });

    expect(cutClips.length).toBe(2);
    expect(cutClips[0].id).toBe('clip_1_cut_1');
    expect(cutClips[1].id).toBe('clip_1_cut_2');
    expect(cutClips[1].start).toBeGreaterThan(0);
  });
});

describe('Export Queue State Machine', () => {
  it('transitions through job states (queued -> processing -> completed)', () => {
    const queue = new ExportQueueManager();
    const job = queue.createJob('Render Full 1080p', 100);

    expect(job.status).toBe('queued');
    expect(job.progressPercent).toBe(0);

    const started = queue.startJob();
    expect(started).toBe(true);
    expect(queue.getJob()?.status).toBe('processing');

    queue.updateFrame(50);
    expect(queue.getJob()?.progressPercent).toBe(50);

    queue.completeJob();
    expect(queue.getJob()?.status).toBe('completed');
    expect(queue.getJob()?.progressPercent).toBe(100);
  });

  it('handles cancellation properly', () => {
    const queue = new ExportQueueManager();
    queue.createJob('Cancelable Job', 200);
    queue.startJob();
    queue.cancelJob();

    expect(queue.isCancelled()).toBe(true);
    expect(queue.getJob()?.status).toBe('cancelled');
  });
});
