import { Clip } from '../types/editor';

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
