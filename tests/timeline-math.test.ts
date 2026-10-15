import { describe, it, expect } from 'vitest';
import { 
  formatTimecode, 
  formatSeconds, 
  calculateTotalDuration, 
  splitClip, 
  calculateSnapPoint,
  getActiveClipsAtTime,
  calculateFadeMultiplier,
  interpolateClipProperties,
  calculateTransitionEffect,
  applyEasing,
  calculateAutoDuckingMultiplier,
  removeSilenceFromClip
} from '../src/utils/timeline-math';
import { Clip } from '../src/types/editor';

describe('timeline-math utility', () => {
  describe('formatTimecode', () => {
    it('formats 0 seconds as 00:00:00', () => {
      expect(formatTimecode(0)).toBe('00:00:00');
    });

    it('formats whole seconds accurately', () => {
      expect(formatTimecode(65, 30)).toBe('01:05:00');
    });

    it('handles frame fractions based on fps', () => {
      expect(formatTimecode(1.5, 30)).toBe('00:01:15');
      expect(formatTimecode(10.2, 30)).toBe('00:10:06');
    });

    it('handles negative or invalid values gracefully', () => {
      expect(formatTimecode(-5)).toBe('00:00:00');
      expect(formatTimecode(NaN)).toBe('00:00:00');
    });
  });

  describe('formatSeconds', () => {
    it('formats standard seconds to mm:ss', () => {
      expect(formatSeconds(0)).toBe('00:00');
      expect(formatSeconds(9)).toBe('00:09');
      expect(formatSeconds(60)).toBe('01:00');
      expect(formatSeconds(125)).toBe('02:05');
    });

    it('handles negative numbers', () => {
      expect(formatSeconds(-10)).toBe('00:00');
    });
  });

  describe('calculateTotalDuration', () => {
    it('returns default minimum duration for empty clips', () => {
      expect(calculateTotalDuration([], 10)).toBe(10);
      expect(calculateTotalDuration([], 20)).toBe(20);
    });

    it('calculates duration based on the furthest ending clip', () => {
      const mockClips: Clip[] = [
        {
          id: '1',
          trackId: 'track-video',
          type: 'video',
          title: 'Clip 1',
          start: 0,
          duration: 5,
          source: '',
          trimStart: 0,
          trimEnd: 5,
          scale: 1,
          posX: 0,
          posY: 0,
          rotation: 0,
          opacity: 1,
          filter: 'none',
          volume: 1,
          speed: 1,
          muted: false
        },
        {
          id: '2',
          trackId: 'track-video',
          type: 'video',
          title: 'Clip 2',
          start: 8,
          duration: 7, // ends at 15
          source: '',
          trimStart: 0,
          trimEnd: 7,
          scale: 1,
          posX: 0,
          posY: 0,
          rotation: 0,
          opacity: 1,
          filter: 'none',
          volume: 1,
          speed: 1,
          muted: false
        }
      ];

      expect(calculateTotalDuration(mockClips, 10)).toBe(15);
    });
  });

  describe('splitClip', () => {
    const baseClip: Clip = {
      id: 'clip_abc',
      trackId: 'track-video',
      type: 'video',
      title: 'Test Clip',
      start: 2,
      duration: 8, // spans from 2 to 10
      source: 'blob:mock',
      trimStart: 1,
      trimEnd: 9,
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

    it('splits clip in two segments with accurate offsets', () => {
      const result = splitClip(baseClip, 5, 'fixed');
      expect(result).not.toBeNull();
      if (!result) return;

      const [firstHalf, secondHalf] = result;

      // First half: from start=2 to splitTime=5 => duration 3
      expect(firstHalf.start).toBe(2);
      expect(firstHalf.duration).toBe(3);
      expect(firstHalf.trimStart).toBe(1);
      expect(firstHalf.trimEnd).toBe(4); // trimStart(1) + 3

      // Second half: from splitTime=5 to end=10 => duration 5
      expect(secondHalf.start).toBe(5);
      expect(secondHalf.duration).toBe(5);
      expect(secondHalf.trimStart).toBe(4); // trimStart(1) + 3
      expect(secondHalf.id).toContain('clip_abc_split_fixed');
    });

    it('returns null if splitTime is before clip start', () => {
      expect(splitClip(baseClip, 1)).toBeNull();
      expect(splitClip(baseClip, 2)).toBeNull();
    });

    it('returns null if splitTime is after or at clip end', () => {
      expect(splitClip(baseClip, 10)).toBeNull();
      expect(splitClip(baseClip, 12)).toBeNull();
    });
  });

  describe('calculateSnapPoint', () => {
    const otherClips: Clip[] = [
      {
        id: 'c1',
        trackId: 'track-video',
        type: 'video',
        title: 'Clip 1',
        start: 0,
        duration: 4, // 0 to 4
        source: '',
        trimStart: 0,
        trimEnd: 4,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false
      },
      {
        id: 'c2',
        trackId: 'track-video',
        type: 'video',
        title: 'Clip 2',
        start: 10,
        duration: 5, // 10 to 15
        source: '',
        trimStart: 0,
        trimEnd: 5,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false
      }
    ];

    it('snaps to 0 when within threshold', () => {
      const snap = calculateSnapPoint(0.1, 3, otherClips, 8, 0.25);
      expect(snap.snapped).toBe(true);
      expect(snap.snappedTime).toBe(0);
      expect(snap.guideTime).toBe(0);
    });

    it('snaps to playhead when within threshold', () => {
      const snap = calculateSnapPoint(8.1, 3, otherClips, 8.0, 0.25);
      expect(snap.snapped).toBe(true);
      expect(snap.snappedTime).toBe(8.0);
      expect(snap.guideTime).toBe(8.0);
    });

    it('snaps to adjacent clip end', () => {
      // Clip 1 ends at 4.0; dragging to 4.15 should snap to 4.0
      const snap = calculateSnapPoint(4.15, 3, otherClips, 20, 0.25);
      expect(snap.snapped).toBe(true);
      expect(snap.snappedTime).toBe(4.0);
      expect(snap.guideTime).toBe(4.0);
    });

    it('does not snap when distance exceeds threshold', () => {
      const snap = calculateSnapPoint(6.5, 3, otherClips, 20, 0.25);
      expect(snap.snapped).toBe(false);
      expect(snap.snappedTime).toBe(6.5);
      expect(snap.guideTime).toBeNull();
    });
  });

  describe('getActiveClipsAtTime', () => {
    const clips: Clip[] = [
      {
        id: 'v1',
        trackId: 'track-video',
        type: 'video',
        title: 'Video 1',
        start: 0,
        duration: 5,
        source: '',
        trimStart: 0,
        trimEnd: 5,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false
      },
      {
        id: 't1',
        trackId: 'track-text',
        type: 'text',
        title: 'Title',
        start: 2,
        duration: 4, // 2 to 6
        source: '',
        trimStart: 0,
        trimEnd: 4,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false
      }
    ];

    it('filters clips active at a specific timestamp', () => {
      expect(getActiveClipsAtTime(clips, 1)).toHaveLength(1);
      expect(getActiveClipsAtTime(clips, 3)).toHaveLength(2);
      expect(getActiveClipsAtTime(clips, 5.5)).toHaveLength(1);
      expect(getActiveClipsAtTime(clips, 7)).toHaveLength(0);
    });

    it('filters clips by trackId when specified', () => {
      expect(getActiveClipsAtTime(clips, 3, 'track-video')).toHaveLength(1);
      expect(getActiveClipsAtTime(clips, 3, 'track-text')).toHaveLength(1);
      expect(getActiveClipsAtTime(clips, 3, 'track-audio')).toHaveLength(0);
    });
  });

  describe('calculateFadeMultiplier', () => {
    const testClip = {
      start: 2,
      duration: 10, // from 2 to 12
      fadeIn: 2,    // 0 to 2s fade in (t=2..4)
      fadeOut: 2    // 2s fade out (t=10..12)
    };

    it('returns 0 when currentTime is before clip start or after clip end', () => {
      expect(calculateFadeMultiplier(testClip, 1)).toBe(0);
      expect(calculateFadeMultiplier(testClip, 13)).toBe(0);
    });

    it('ramps up linearly from 0 to 1 during fadeIn period', () => {
      expect(calculateFadeMultiplier(testClip, 2)).toBe(0);
      expect(calculateFadeMultiplier(testClip, 3)).toBe(0.5);
      expect(calculateFadeMultiplier(testClip, 4)).toBe(1);
    });

    it('returns 1 during middle of clip outside fade zones', () => {
      expect(calculateFadeMultiplier(testClip, 7)).toBe(1);
    });

    it('ramps down linearly from 1 to 0 during fadeOut period', () => {
      expect(calculateFadeMultiplier(testClip, 10)).toBe(1);
      expect(calculateFadeMultiplier(testClip, 11)).toBe(0.5);
      expect(calculateFadeMultiplier(testClip, 12)).toBe(0);
    });

    it('defaults to 1 if no fadeIn or fadeOut is configured', () => {
      const clipWithoutFade = { start: 0, duration: 5 };
      expect(calculateFadeMultiplier(clipWithoutFade, 2.5)).toBe(1);
    });

    it('accurately calculates fade multiplier for image clips', () => {
      const imageClip: Clip = {
        id: 'img1',
        trackId: 'track-video',
        type: 'image',
        title: 'Logo Overlay',
        start: 1,
        duration: 4,
        source: 'data:image/svg+xml,...',
        trimStart: 0,
        trimEnd: 4,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: true,
        fadeIn: 0.5,
        fadeOut: 0.5
      };
      expect(getActiveClipsAtTime([imageClip], 2)).toHaveLength(1);
      expect(getActiveClipsAtTime([imageClip], 5.5)).toHaveLength(0);
      expect(calculateFadeMultiplier(imageClip, 1.25)).toBe(0.5);
    });
  });

  describe('interpolateClipProperties', () => {
    const baseClip: Clip = {
      id: 'clip_kf',
      trackId: 'track-video',
      type: 'video',
      title: 'Clip with Keyframes',
      start: 2,
      duration: 10,
      source: '',
      trimStart: 0,
      trimEnd: 10,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false,
      keyframes: [
        { id: 'k1', timeOffset: 1, scale: 1.0, posX: 0, opacity: 1 },
        { id: 'k2', timeOffset: 5, scale: 2.0, posX: 50, opacity: 0.5 }
      ]
    };

    it('returns base values if clip has no keyframes', () => {
      const { keyframes: _, ...noKf } = baseClip;
      const res = interpolateClipProperties(noKf as Clip, 4);
      expect(res.scale).toBe(1);
      expect(res.posX).toBe(0);
    });

    it('clamps to first keyframe when before offset', () => {
      // clip start = 2, so currentTime = 2.5 is offset 0.5 (before k1 at offset 1)
      const res = interpolateClipProperties(baseClip, 2.5);
      expect(res.scale).toBe(1.0);
      expect(res.posX).toBe(0);
    });

    it('clamps to last keyframe when after offset', () => {
      // offset = 6 (after k2 at offset 5)
      const res = interpolateClipProperties(baseClip, 8);
      expect(res.scale).toBe(2.0);
      expect(res.posX).toBe(50);
      expect(res.opacity).toBe(0.5);
    });

    it('linearly interpolates halfway between keyframes', () => {
      // k1 at 1 (scale 1.0, posX 0), k2 at 5 (scale 2.0, posX 50).
      // Midway is offset 3 (currentTime = start(2) + offset(3) = 5)
      const res = interpolateClipProperties(baseClip, 5);
      expect(res.scale).toBe(1.5);
      expect(res.posX).toBe(25);
      expect(res.opacity).toBe(0.75);
    });
  });

  describe('calculateTransitionEffect', () => {
    const transClip: Clip = {
      id: 'clip_tr',
      trackId: 'track-video',
      type: 'video',
      title: 'Transition Clip',
      start: 5,
      duration: 5,
      source: '',
      trimStart: 0,
      trimEnd: 5,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false,
      transition: 'cross-dissolve',
      transitionDuration: 1.0
    };

    it('returns full opacity outside the transition window', () => {
      // currentTime 7 is after start(5) + trans(1) = 6
      const effect = calculateTransitionEffect(transClip, 7);
      expect(effect.extraOpacity).toBe(1);
    });

    it('ramps cross-dissolve opacity from 0 to 1 during transition window', () => {
      // start at 5, duration 1.0. At t=5.5 progress is 0.5
      const effect = calculateTransitionEffect(transClip, 5.5);
      expect(effect.extraOpacity).toBe(0.5);
    });

    it('calculates slide-left offset during transition window', () => {
      const slideClip: Clip = { ...transClip, transition: 'slide-left', transitionDuration: 1.0 };
      const effect = calculateTransitionEffect(slideClip, 5.5);
      expect(effect.extraOffsetX).toBe(50);
    });

    it('calculates flash-white alpha during transition window', () => {
      const flashClip: Clip = { ...transClip, transition: 'flash-white', transitionDuration: 1.0 };
      const effect = calculateTransitionEffect(flashClip, 5.0);
      expect(effect.flashAlpha).toBeCloseTo(0.85, 2);
    });
  });

  describe('applyEasing', () => {
    it('calculates linear progress identically', () => {
      expect(applyEasing(0, 'linear')).toBe(0);
      expect(applyEasing(0.5, 'linear')).toBe(0.5);
      expect(applyEasing(1, 'linear')).toBe(1);
    });

    it('calculates ease-in cubic curve (slow start)', () => {
      expect(applyEasing(0, 'ease-in')).toBe(0);
      expect(applyEasing(0.5, 'ease-in')).toBe(0.125);
      expect(applyEasing(1, 'ease-in')).toBe(1);
    });

    it('calculates ease-out cubic curve (fast start, slow landing)', () => {
      expect(applyEasing(0, 'ease-out')).toBe(0);
      expect(applyEasing(0.5, 'ease-out')).toBe(0.875);
      expect(applyEasing(1, 'ease-out')).toBe(1);
    });

    it('calculates ease-in-out symmetric s-curve', () => {
      expect(applyEasing(0, 'ease-in-out')).toBe(0);
      expect(applyEasing(0.5, 'ease-in-out')).toBe(0.5);
      expect(applyEasing(1, 'ease-in-out')).toBe(1);
    });

    it('calculates bounce and spring endpoints properly', () => {
      expect(applyEasing(0, 'bounce')).toBe(0);
      expect(applyEasing(1, 'bounce')).toBeCloseTo(1, 2);
      expect(applyEasing(0, 'spring')).toBe(0);
      expect(applyEasing(1, 'spring')).toBe(1);
    });
  });

  describe('interpolateClipProperties with easing', () => {
    it('applies ease-in curve to keyframe interpolation', () => {
      const clip: Clip = {
        id: 'clip_ease',
        trackId: 'track-video',
        type: 'video',
        title: 'Easing Video',
        start: 0,
        duration: 10,
        source: '',
        trimStart: 0,
        trimEnd: 10,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false,
        keyframes: [
          { id: 'k1', timeOffset: 0, scale: 1.0, easing: 'ease-in' },
          { id: 'k2', timeOffset: 10, scale: 2.0, easing: 'ease-in' }
        ]
      };

      // At t=5 (midway), linear would be 1.5. Ease-in progress is 0.5^3 = 0.125, scale = 1.0 + 0.125 = 1.125
      const res = interpolateClipProperties(clip, 5);
      expect(res.scale).toBe(1.125);
    });

    it('applies ease-out curve to keyframe interpolation', () => {
      const clip: Clip = {
        id: 'clip_ease_out',
        trackId: 'track-video',
        type: 'video',
        title: 'Easing Out Video',
        start: 0,
        duration: 10,
        source: '',
        trimStart: 0,
        trimEnd: 10,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false,
        keyframes: [
          { id: 'k1', timeOffset: 0, scale: 1.0 },
          { id: 'k2', timeOffset: 10, scale: 2.0, easing: 'ease-out' }
        ]
      };

      // At t=5 (midway), ease-out progress is 1 - 0.5^3 = 0.875, scale = 1.0 + 0.875 = 1.875
      const res = interpolateClipProperties(clip, 5);
      expect(res.scale).toBe(1.875);
    });
  });

  describe('calculateAutoDuckingMultiplier', () => {
    const musicClip: Clip = {
      id: 'music_1',
      trackId: 'track-audio',
      type: 'audio',
      title: 'Background Music',
      start: 0,
      duration: 20,
      source: '',
      trimStart: 0,
      trimEnd: 20,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false,
      autoDuck: true,
      duckAmount: 0.2
    };

    const speechClip: Clip = {
      id: 'voice_1',
      trackId: 'track-video',
      type: 'video',
      title: 'Presenter Speaking',
      start: 5,
      duration: 5, // from 5s to 10s
      source: '',
      trimStart: 0,
      trimEnd: 5,
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

    it('returns 1.0 when no voice clip is playing', () => {
      const mult = calculateAutoDuckingMultiplier(musicClip, [musicClip, speechClip], 2.0);
      expect(mult).toBe(1.0);
    });

    it('ducks volume down during active speech', () => {
      // At t=7 (deep inside 5..10s voice clip)
      const mult = calculateAutoDuckingMultiplier(musicClip, [musicClip, speechClip], 7.0);
      expect(mult).toBe(0.2);
    });

    it('does not duck if the voice clip is muted', () => {
      const mutedVoice: Clip = { ...speechClip, muted: true };
      const mult = calculateAutoDuckingMultiplier(musicClip, [musicClip, mutedVoice], 7.0);
      expect(mult).toBe(1.0);
    });

    it('does not duck if autoDuck is disabled on non-audio clip', () => {
      const nonDuckClip: Clip = { ...musicClip, trackId: 'track-video', autoDuck: false };
      const mult = calculateAutoDuckingMultiplier(nonDuckClip, [nonDuckClip, speechClip], 7.0);
      expect(mult).toBe(1.0);
    });
  });

  describe('removeSilenceFromClip', () => {
    const sourceClip: Clip = {
      id: 'clip_speech',
      trackId: 'track-video',
      type: 'video',
      title: 'Speech Video',
      start: 2,
      duration: 10,
      source: '',
      trimStart: 0,
      trimEnd: 10,
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

    it('returns original clip if no silence intervals are provided', () => {
      const res = removeSilenceFromClip(sourceClip, []);
      expect(res.length).toBe(1);
      expect(res[0]).toEqual(sourceClip);
    });

    it('cuts out middle silence and snaps audible parts sequentially', () => {
      // Silence between 3s and 5s in source media
      const silences = [{ startSec: 3.0, endSec: 5.0 }];
      const res = removeSilenceFromClip(sourceClip, silences);

      expect(res.length).toBe(2);

      // Part 1: from 0 to 3s (duration 3s, timeline start 2s)
      expect(res[0].start).toBe(2);
      expect(res[0].duration).toBe(3);
      expect(res[0].trimStart).toBe(0);
      expect(res[0].trimEnd).toBe(3);

      // Part 2: from 5 to 10s (duration 5s, timeline start 2 + 3 = 5s)
      expect(res[1].start).toBe(5);
      expect(res[1].duration).toBe(5);
      expect(res[1].trimStart).toBe(5);
      expect(res[1].trimEnd).toBe(10);
    });

    it('handles multiple silences and ignores silences outside clip bounds', () => {
      const silences = [
        { startSec: 1.0, endSec: 2.0 },
        { startSec: 7.0, endSec: 8.5 },
        { startSec: 15.0, endSec: 20.0 } // outside clip trimEnd (10s)
      ];
      const res = removeSilenceFromClip(sourceClip, silences);

      // Audible: [0, 1], [2, 7], [8.5, 10]
      expect(res.length).toBe(3);
      expect(res[0].duration).toBe(1);
      expect(res[1].duration).toBe(5);
      expect(res[2].duration).toBe(1.5);
    });
  });
});
