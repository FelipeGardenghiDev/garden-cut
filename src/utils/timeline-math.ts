import { Clip, EasingType } from '../types/editor';

/**
 * Applies mathematical easing curves to normalized time progress t in [0, 1].
 */
export function applyEasing(t: number, easing: EasingType = 'linear'): number {
  const clampedT = Math.max(0, Math.min(1, t));

  switch (easing) {
    case 'ease-in':
      return clampedT * clampedT * clampedT;
    case 'ease-out':
      return 1 - Math.pow(1 - clampedT, 3);
    case 'ease-in-out':
      return clampedT < 0.5
        ? 4 * clampedT * clampedT * clampedT
        : 1 - Math.pow(-2 * clampedT + 2, 3) / 2;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let progress = clampedT;
      if (progress < 1 / d1) {
        return n1 * progress * progress;
      } else if (progress < 2 / d1) {
        progress -= 1.5 / d1;
        return n1 * progress * progress + 0.75;
      } else if (progress < 2.5 / d1) {
        progress -= 2.25 / d1;
        return n1 * progress * progress + 0.9375;
      } else {
        progress -= 2.625 / d1;
        return n1 * progress * progress + 0.984375;
      }
    }
    case 'spring': {
      if (clampedT === 0) return 0;
      if (clampedT === 1) return 1;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * clampedT) * Math.sin((clampedT * 10 - 0.75) * c4) + 1;
    }
    case 'linear':
    default:
      return clampedT;
  }
}

/**
 * Format seconds to standard Timecode `MM:SS:FF`
 */
export function formatTimecode(seconds: number, fps = 30): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  const frames = Math.round((safeSec % 1) * fps) % fps;

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ff = String(frames).padStart(2, '0');

  return `${mm}:${ss}:${ff}`;
}

/**
 * Format seconds to simple display time `00:05`
 */
export function formatSeconds(seconds: number): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate the total duration of the timeline based on the furthest ending clip.
 * Default minimum duration is 10 seconds.
 */
export function calculateTotalDuration(clips: Clip[], minDuration = 10): number {
  if (!clips || clips.length === 0) return minDuration;
  const maxEnd = clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
  return Math.max(minDuration, maxEnd);
}

/**
 * Splits a clip at a given splitTime.
 * Returns a tuple with the [firstHalf, secondHalf] or null if splitTime is outside clip bounds.
 */
export function splitClip(clip: Clip, splitTime: number, newIdSuffix = ''): [Clip, Clip] | null {
  if (splitTime <= clip.start || splitTime >= clip.start + clip.duration) {
    return null;
  }

  const firstDuration = splitTime - clip.start;
  const secondDuration = clip.duration - firstDuration;

  const firstHalf: Clip = {
    ...clip,
    duration: firstDuration,
    trimEnd: clip.trimStart + firstDuration
  };

  const secondHalf: Clip = {
    ...clip,
    id: `${clip.id}_split_${newIdSuffix || Math.random().toString(36).slice(2, 7)}`,
    start: splitTime,
    duration: secondDuration,
    trimStart: clip.trimStart + firstDuration
  };

  return [firstHalf, secondHalf];
}

export interface SnapResult {
  snappedTime: number;
  snapped: boolean;
  guideTime: number | null;
}

/**
 * Calculates snapping for a clip being dragged on the timeline.
 * Snaps to 0, to the playhead, or to adjacent clip edges within snapThreshold seconds.
 */
export function calculateSnapPoint(
  targetStart: number,
  clipDuration: number,
  otherClips: Clip[],
  currentTime: number,
  snapThreshold = 0.25
): SnapResult {
  let newStart = Math.max(0, targetStart);

  // 1. Snap to 0
  if (Math.abs(newStart) < snapThreshold) {
    return {
      snappedTime: 0,
      snapped: true,
      guideTime: 0
    };
  }

  // 2. Snap to Playhead
  if (Math.abs(newStart - currentTime) < snapThreshold) {
    return {
      snappedTime: currentTime,
      snapped: true,
      guideTime: currentTime
    };
  }

  // 3. Snap to other clip start or end points
  for (const other of otherClips) {
    const otherEnd = other.start + other.duration;

    // Snap clip start to other clip end
    if (Math.abs(newStart - otherEnd) < snapThreshold) {
      return {
        snappedTime: otherEnd,
        snapped: true,
        guideTime: otherEnd
      };
    }

    // Snap clip start to other clip start
    if (Math.abs(newStart - other.start) < snapThreshold) {
      return {
        snappedTime: other.start,
        snapped: true,
        guideTime: other.start
      };
    }

    // Snap clip end to other clip start
    if (Math.abs((newStart + clipDuration) - other.start) < snapThreshold) {
      return {
        snappedTime: Math.max(0, other.start - clipDuration),
        snapped: true,
        guideTime: other.start
      };
    }
  }

  return {
    snappedTime: newStart,
    snapped: false,
    guideTime: null
  };
}

/**
 * Returns the clips that are currently active at a given time on a given track.
 */
export function getActiveClipsAtTime(clips: Clip[], time: number, trackId?: string): Clip[] {
  return clips.filter((c) => {
    const matchesTrack = !trackId || c.trackId === trackId;
    const isWithinTime = time >= c.start && time < c.start + c.duration;
    return matchesTrack && isWithinTime;
  });
}

/**
 * Calculates transition fade multiplier (from 0.0 to 1.0) based on currentTime, fadeIn, and fadeOut.
 */
export function calculateFadeMultiplier(
  clip: { start: number; duration: number; fadeIn?: number; fadeOut?: number },
  currentTime: number
): number {
  if (currentTime < clip.start || currentTime > clip.start + clip.duration) {
    return 0;
  }

  const timeInClip = currentTime - clip.start;
  const timeFromEnd = clip.start + clip.duration - currentTime;

  let multiplier = 1;

  if (clip.fadeIn && clip.fadeIn > 0 && timeInClip < clip.fadeIn) {
    multiplier = Math.max(0, timeInClip / clip.fadeIn);
  }

  if (clip.fadeOut && clip.fadeOut > 0 && timeFromEnd < clip.fadeOut) {
    const fadeOutFactor = Math.max(0, timeFromEnd / clip.fadeOut);
    multiplier = Math.min(multiplier, fadeOutFactor);
  }

  return Math.max(0, Math.min(1, multiplier));
}

export interface InterpolatedTransform {
  scale: number;
  posX: number;
  posY: number;
  opacity: number;
  rotation: number;
}

/**
 * Calculates smoothly interpolated visual properties (scale, posX, posY, opacity, rotation)
 * taking keyframes into account. If no keyframes are defined, returns the static properties.
 */
export function interpolateClipProperties(clip: Clip, currentTime: number): InterpolatedTransform {
  const base: InterpolatedTransform = {
    scale: clip.scale ?? 1,
    posX: clip.posX ?? 0,
    posY: clip.posY ?? 0,
    opacity: clip.opacity ?? 1,
    rotation: clip.rotation ?? 0
  };

  if (!clip.keyframes || clip.keyframes.length === 0) {
    return base;
  }

  const offset = Math.max(0, Math.min(clip.duration, currentTime - clip.start));
  const sorted = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  // Before first keyframe
  if (offset <= sorted[0].timeOffset) {
    const first = sorted[0];
    return {
      scale: first.scale ?? base.scale,
      posX: first.posX ?? base.posX,
      posY: first.posY ?? base.posY,
      opacity: first.opacity ?? base.opacity,
      rotation: first.rotation ?? base.rotation
    };
  }

  // After last keyframe
  const last = sorted[sorted.length - 1];
  if (offset >= last.timeOffset) {
    return {
      scale: last.scale ?? base.scale,
      posX: last.posX ?? base.posX,
      posY: last.posY ?? base.posY,
      opacity: last.opacity ?? base.opacity,
      rotation: last.rotation ?? base.rotation
    };
  }

  // Between two keyframes: find segment
  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (offset >= k1.timeOffset && offset <= k2.timeOffset) {
      const segDuration = k2.timeOffset - k1.timeOffset;
      const rawT = segDuration > 0 ? (offset - k1.timeOffset) / segDuration : 0;
      
      const easingCurve = k2.easing || k1.easing || 'linear';
      const t = applyEasing(rawT, easingCurve);
      
      const lerp = (v1: number, v2: number) => v1 + (v2 - v1) * t;

      const s1 = k1.scale ?? base.scale;
      const s2 = k2.scale ?? base.scale;
      const px1 = k1.posX ?? base.posX;
      const px2 = k2.posX ?? base.posX;
      const py1 = k1.posY ?? base.posY;
      const py2 = k2.posY ?? base.posY;
      const op1 = k1.opacity ?? base.opacity;
      const op2 = k2.opacity ?? base.opacity;
      const rot1 = k1.rotation ?? base.rotation;
      const rot2 = k2.rotation ?? base.rotation;

      return {
        scale: Number(lerp(s1, s2).toFixed(3)),
        posX: Number(lerp(px1, px2).toFixed(2)),
        posY: Number(lerp(py1, py2).toFixed(2)),
        opacity: Number(Math.max(0, Math.min(1, lerp(op1, op2))).toFixed(3)),
        rotation: Number(lerp(rot1, rot2).toFixed(2))
      };
    }
  }

  return base;
}

/**
 * Calculates visual transition offset, opacity, and flash overlay at clip start.
 */
export function calculateTransitionEffect(
  clip: Clip,
  currentTime: number
): { extraOpacity: number; extraOffsetX: number; flashAlpha: number } {
  if (!clip.transition || clip.transition === 'none') {
    return { extraOpacity: 1, extraOffsetX: 0, flashAlpha: 0 };
  }

  const duration = clip.transitionDuration || 0.6;
  const timeInClip = currentTime - clip.start;

  if (timeInClip > duration || timeInClip < 0) {
    return { extraOpacity: 1, extraOffsetX: 0, flashAlpha: 0 };
  }

  const progress = timeInClip / duration;

  switch (clip.transition) {
    case 'cross-dissolve':
      return { extraOpacity: progress, extraOffsetX: 0, flashAlpha: 0 };
    case 'slide-left':
      return { extraOpacity: 1, extraOffsetX: (1 - progress) * 100, flashAlpha: 0 };
    case 'fade-black':
      return { extraOpacity: progress, extraOffsetX: 0, flashAlpha: 0 };
    case 'flash-white':
      return { extraOpacity: 1, extraOffsetX: 0, flashAlpha: (1 - progress) * 0.85 };
    default:
      return { extraOpacity: 1, extraOffsetX: 0, flashAlpha: 0 };
  }
}

/**
 * Calculates dynamic sidechain volume ducking multiplier for background audio tracks.
 * When vocal / dialogue / video clips with sound are active, ducks music down smoothly.
 */
export function calculateAutoDuckingMultiplier(
  clip: Clip,
  allClips: Clip[],
  currentTime: number,
  duckAmount = 0.25
): number {
  const shouldDuck = clip.autoDuck ?? (clip.trackId === 'track-audio');
  if (!shouldDuck) {
    return 1;
  }

  const effectiveDuck = clip.duckAmount ?? duckAmount;

  // Find if any non-background clip is speaking/playing sound at currentTime
  const activeVoiceClips = allClips.filter((other) => {
    if (other.id === clip.id || other.trackId === 'track-audio') return false;
    const isPlayingNow = currentTime >= other.start && currentTime < other.start + other.duration;
    const hasSound = other.volume > 0 && !other.muted && (other.type === 'video' || other.type === 'audio');
    return isPlayingNow && hasSound;
  });

  if (activeVoiceClips.length === 0) {
    return 1;
  }

  // Smooth attack (0.15s) and release (0.2s) envelope
  let minMultiplier = 1;

  for (const voice of activeVoiceClips) {
    const timeInVoice = currentTime - voice.start;
    const timeFromVoiceEnd = voice.start + voice.duration - currentTime;
    const attack = 0.15;
    const release = 0.2;

    let duckFactor = effectiveDuck;
    if (timeInVoice < attack) {
      const progress = Math.max(0, timeInVoice / attack);
      duckFactor = 1 - (1 - effectiveDuck) * progress;
    } else if (timeFromVoiceEnd < release) {
      const progress = Math.max(0, timeFromVoiceEnd / release);
      duckFactor = 1 - (1 - effectiveDuck) * progress;
    }

    if (duckFactor < minMultiplier) {
      minMultiplier = duckFactor;
    }
  }

  return Math.max(0.05, Math.min(1, minMultiplier));
}

/**
 * Slices a clip into audible segments, removing silence intervals detected in the media,
 * and lays out the resulting clips sequentially without dead gaps.
 */
export function removeSilenceFromClip(
  clip: Clip,
  silences: { startSec: number; endSec: number }[],
  minSilenceDuration = 0.3
): Clip[] {
  if (!silences || silences.length === 0) {
    return [clip];
  }

  const clipSourceStart = clip.trimStart;
  const clipSourceEnd = clip.trimEnd;

  // Filter silences that intersect with [clipSourceStart, clipSourceEnd]
  const validSilences = silences
    .filter((s) => s.endSec - s.startSec >= minSilenceDuration)
    .map((s) => ({
      startSec: Math.max(clipSourceStart, s.startSec),
      endSec: Math.min(clipSourceEnd, s.endSec)
    }))
    .filter((s) => s.endSec > s.startSec)
    .sort((a, b) => a.startSec - b.startSec);

  if (validSilences.length === 0) {
    return [clip];
  }

  // Merge overlapping silences
  const mergedSilences: { startSec: number; endSec: number }[] = [];
  let currentSilence = { ...validSilences[0] };

  for (let i = 1; i < validSilences.length; i++) {
    const next = validSilences[i];
    if (next.startSec <= currentSilence.endSec) {
      currentSilence.endSec = Math.max(currentSilence.endSec, next.endSec);
    } else {
      mergedSilences.push(currentSilence);
      currentSilence = { ...next };
    }
  }
  mergedSilences.push(currentSilence);

  // Compute audible segments as the complement in [clipSourceStart, clipSourceEnd]
  const audibleSegments: { startSec: number; endSec: number }[] = [];
  let cursor = clipSourceStart;

  for (const silence of mergedSilences) {
    if (silence.startSec > cursor) {
      audibleSegments.push({ startSec: cursor, endSec: silence.startSec });
    }
    cursor = Math.max(cursor, silence.endSec);
  }

  if (cursor < clipSourceEnd) {
    audibleSegments.push({ startSec: cursor, endSec: clipSourceEnd });
  }

  if (audibleSegments.length === 0) {
    return [clip];
  }

  let currentTimelineStart = clip.start;
  const result: Clip[] = [];

  audibleSegments.forEach((segment, idx) => {
    const segmentDuration = segment.endSec - segment.startSec;
    if (segmentDuration < 0.15 && audibleSegments.length > 1) {
      return;
    }

    result.push({
      ...clip,
      id: idx === 0 ? clip.id : `${clip.id}_cut_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      start: Number(currentTimelineStart.toFixed(3)),
      duration: Number(segmentDuration.toFixed(3)),
      trimStart: Number(segment.startSec.toFixed(3)),
      trimEnd: Number(segment.endSec.toFixed(3))
    });

    currentTimelineStart += segmentDuration;
  });

  return result.length > 0 ? result : [clip];
}

