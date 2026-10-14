export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type ClipType = 'video' | 'audio' | 'text';

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

export interface Clip {
  id: string;
  trackId: 'track-text' | 'track-video' | 'track-audio';
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

  // Transitions
  fadeIn?: number; // Fade In duration in seconds (0 = none)
  fadeOut?: number; // Fade Out duration in seconds (0 = none)

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
