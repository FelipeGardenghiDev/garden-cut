export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type ClipType = 'video' | 'audio' | 'text' | 'image';

export type VideoFilter = 'none' | 'cinematic' | 'vibrant' | 'bw' | 'vintage' | 'cyberpunk' | 'blur';

export type TextStyle = 'default' | 'capcut-yellow' | 'neon' | 'tiktok' | 'glitch';

export interface TextProperties {
  content: string;
  style: TextStyle;
  fontSize: number;
  color: string;
  backgroundColor: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
}

export type AudioEffect = 'none' | 'bass-boost' | 'vocal-enhance' | 'lo-fi';

export type VisualTransition = 'none' | 'cross-dissolve' | 'slide-left' | 'fade-black' | 'flash-white';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'spring';

export interface Keyframe {
  id: string;
  timeOffset: number; // Seconds from clip start (0 to clip.duration)
  scale?: number;
  posX?: number;
  posY?: number;
  opacity?: number;
  rotation?: number;
  easing?: EasingType;
}

export interface ChromaKeySettings {
  enabled: boolean;
  color: string; // e.g. '#00ff00'
  tolerance: number; // 0.05 to 0.8
  smoothness: number; // 0.0 to 0.4
}

export interface BlurMaskSettings {
  enabled: boolean;
  x: number; // % offset (-50 to 50)
  y: number; // % offset (-50 to 50)
  width: number; // % width (5 to 100)
  height: number; // % height (5 to 100)
  blurRadius: number; // 2 to 30
  type: 'blur' | 'pixelate';
}

export interface Clip {
  id: string;
  trackId: 'track-text' | 'track-overlay' | 'track-video' | 'track-audio';
  type: ClipType;
  title: string;
  start: number; // Seconds on timeline
  duration: number; // Duration in seconds
  source: string; // URL, data URL, or synthetic generator
  color?: string; // Visual accent color on timeline
  
  // Trimming
  trimStart: number;
  trimEnd: number;

  // Video / Visual Transform
  scale: number; // 0.5 - 3.0
  posX: number; // -100 to 100 (%)
  posY: number; // -100 to 100 (%)
  rotation: number; // 0 - 360
  opacity: number; // 0 - 1
  filter: VideoFilter;

  // Audio Properties
  volume: number; // 0.0 - 2.0
  speed: number; // 0.5 - 2.0
  muted: boolean;
  audioEffect?: AudioEffect;
  autoDuck?: boolean; // When true, music automatically ducks when voice/video is active
  duckAmount?: number; // Volume multiplier during ducking (0.05 to 0.6, default 0.25)

  // Visual Effects & Overlays
  chromaKey?: ChromaKeySettings;
  blurMask?: BlurMaskSettings;

  // Transitions
  fadeIn?: number; // Fade In duration in seconds (0 = none)
  fadeOut?: number; // Fade Out duration in seconds (0 = none)
  transition?: VisualTransition;
  transitionDuration?: number; // Duration of visual transition in seconds

  // Keyframe Animations
  keyframes?: Keyframe[];

  // Waveform Peaks (Normalized 0..1 amplitude values)
  waveform?: number[];

  // Text Properties (if type === 'text')
  textProps?: TextProperties;
}

export interface ProjectState {
  name: string;
  aspectRatio: AspectRatio;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  zoom: number; // Pixels per second (e.g. 40 - 160)
  selectedClipId: string | null;
  clips: Clip[];
  isSnapping: boolean;
  activeTab: 'media' | 'text' | 'effects' | 'transitions' | 'ai' | 'audio';
}
