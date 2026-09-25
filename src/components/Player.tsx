import React, { useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward
} from 'lucide-react';
import { AspectRatio, Clip } from '../types/editor';
import { formatTimecode } from '../utils/media-generator';

interface PlayerProps {
  aspectRatio: AspectRatio;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  activeVideoClip: Clip | null;
  activeTextClips: Clip[];
  activeAudioClips: Clip[];
}

const AudioTrackPlayer: React.FC<{ clip: Clip; currentTime: number; isPlaying: boolean }> = ({
  clip,
  currentTime,
  isPlaying
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !clip.source) return;
    const targetOffset = (currentTime - clip.start) * clip.speed + clip.trimStart;

    if (Math.abs(audioRef.current.currentTime - targetOffset) > 0.25) {
      audioRef.current.currentTime = Math.max(0, targetOffset);
    }

    audioRef.current.volume = Math.max(0, Math.min(1, clip.volume));
    audioRef.current.muted = clip.muted;
    audioRef.current.playbackRate = clip.speed;

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [currentTime, isPlaying, clip]);

  return <audio ref={audioRef} src={clip.source} preload="auto" />;
};

export const Player: React.FC<PlayerProps> = ({
  aspectRatio,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  activeVideoClip,
  activeTextClips,
  activeAudioClips
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync HTML5 video element with current timeline position
  useEffect(() => {
    if (!videoRef.current || !activeVideoClip) return;
    
    // Calculate media source offset
    const clipOffset = (currentTime - activeVideoClip.start) * activeVideoClip.speed + activeVideoClip.trimStart;
    
    if (Math.abs(videoRef.current.currentTime - clipOffset) > 0.25) {
      videoRef.current.currentTime = Math.max(0, clipOffset);
    }

    videoRef.current.volume = Math.max(0, Math.min(1, activeVideoClip.volume));
    videoRef.current.playbackRate = activeVideoClip.speed;
    videoRef.current.muted = activeVideoClip.muted;

    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [currentTime, isPlaying, activeVideoClip]);

  // Keyboard shortcut: Space for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay]);

  // CSS Filter string mapping
  const getFilterStyle = (filter?: string) => {
    switch (filter) {
      case 'cinematic': return 'contrast(1.25) saturate(0.9) brightness(0.95)';
      case 'vibrant': return 'saturate(1.6) contrast(1.1)';
      case 'cyberpunk': return 'hue-rotate(180deg) saturate(1.8) contrast(1.2)';
      case 'vintage': return 'sepia(0.6) contrast(1.1) brightness(0.9)';
      case 'bw': return 'grayscale(1) contrast(1.2)';
      case 'blur': return 'blur(3px)';
      default: return 'none';
    }
  };

  // Aspect ratio class calculation
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[82%]';
      case '1:1':
        return 'aspect-square max-h-[82%]';
      case '4:5':
        return 'aspect-[4/5] max-h-[82%]';
      case '16:9':
      default:
        return 'aspect-video max-h-[82%]';
    }
  };

  return (
    <div className="flex-1 bg-[#0c0d12] flex flex-col items-center justify-between p-4 overflow-hidden relative select-none">
      {/* Background Audio Players for Track-Audio clips */}
      {activeAudioClips.map((audioClip) => (
        <AudioTrackPlayer
          key={audioClip.id}
          clip={audioClip}
          currentTime={currentTime}
          isPlaying={isPlaying}
        />
      ))}

      {/* Viewport Area */}
      <div 
        ref={containerRef}
        className="w-full flex-1 flex items-center justify-center relative min-h-0"
      >
        <div 
          className={`relative bg-black rounded-xl overflow-hidden border border-[#232533] shadow-2xl shadow-black flex items-center justify-center ${getAspectRatioClasses()}`}
          style={{ maxWidth: '100%' }}
        >
          {/* Video Layer */}
          {activeVideoClip && activeVideoClip.source ? (
            <video
              ref={videoRef}
              src={activeVideoClip.source}
              className="w-full h-full object-contain pointer-events-none transition-transform"
              style={{
                filter: getFilterStyle(activeVideoClip.filter),
                transform: `scale(${activeVideoClip.scale}) translate(${activeVideoClip.posX}%, ${activeVideoClip.posY}%) rotate(${activeVideoClip.rotation}deg)`,
                opacity: activeVideoClip.opacity
              }}
              playsInline
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-6 text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                <Play className="w-5 h-5 text-zinc-600 ml-0.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500">
                Arraste ou adicione clipes na Timeline abaixo
              </span>
            </div>
          )}

          {/* Text & Auto-Captions Overlays Layer */}
          {activeTextClips.map((textClip) => {
            const props = textClip.textProps;
            if (!props) return null;

            let styleClasses = 'text-white font-bold drop-shadow-md';
            if (props.style === 'capcut-yellow') {
              styleClasses = 'text-[#FEF08A] bg-black/80 px-4 py-1.5 rounded-lg font-black tracking-wide border border-yellow-400/40 shadow-lg';
            } else if (props.style === 'tiktok') {
              styleClasses = 'text-white font-extrabold tracking-wider stroke-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)]';
            } else if (props.style === 'neon') {
              styleClasses = 'text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] font-black';
            } else if (props.style === 'glitch') {
              styleClasses = 'text-rose-400 font-mono tracking-widest bg-black/60 px-3 py-1';
            }

            return (
              <div
                key={textClip.id}
                className="absolute inset-x-0 px-6 flex justify-center pointer-events-none z-20"
                style={{
                  bottom: props.style === 'capcut-yellow' ? '12%' : '18%',
                  transform: `scale(${textClip.scale})`
                }}
              >
                <div
                  className={`text-center text-xl sm:text-2xl transition-all duration-75 select-none ${styleClasses}`}
                  style={{
                    color: props.color,
                    fontSize: `${props.fontSize}px`
                  }}
                >
                  {props.content}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="h-12 w-full max-w-xl bg-[#161820] border border-[#262835] rounded-xl px-4 flex items-center justify-between shadow-lg mt-2">
        {/* Left: Timecode */}
        <div className="flex items-center gap-1 font-mono text-xs text-zinc-300">
          <span className="text-cyan-400 font-bold">{formatTimecode(currentTime)}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-500">{formatTimecode(totalDuration)}</span>
        </div>

        {/* Center: Play/Pause/Skip */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1))}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#232533] rounded-lg transition-colors cursor-pointer"
            title="Voltar 1s (J)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-md shadow-cyan-500/25 transition-transform active:scale-95 cursor-pointer font-bold"
            title="Play / Pause (Barra de Espaço)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black stroke-black" />
            ) : (
              <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onSeek(Math.min(totalDuration, currentTime + 1))}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#232533] rounded-lg transition-colors cursor-pointer"
            title="Avançar 1s (L)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2 text-zinc-400">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 hover:text-white hover:bg-[#232533] rounded-lg transition-colors cursor-pointer"
            title="Voltar ao Início"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
