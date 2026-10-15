import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Maximize,
  Minimize
} from 'lucide-react';
import { AspectRatio, Clip } from '../types/editor';
import { 
  formatTimecode, 
  calculateFadeMultiplier,
  interpolateClipProperties,
  calculateTransitionEffect,
  calculateAutoDuckingMultiplier
} from '../utils/timeline-math';
import { applyChromaKeyToCanvas } from '../utils/visual-effects';

interface PlayerProps {
  aspectRatio: AspectRatio;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  activeVideoClip: Clip | null;
  activeOverlayClips?: Clip[];
  activeTextClips: Clip[];
  activeAudioClips: Clip[];
  allClips?: Clip[];
  selectedClip?: Clip | null;
  onUpdateClip?: (updated: Clip, commitHistory?: boolean) => void;
  onSelectClip?: (clipId: string | null) => void;
}

// Frequency spectrum audio visualizer
const VisualSpectrum: React.FC<{ isPlaying: boolean; effect?: string }> = ({ isPlaying, effect }) => {
  const [bars, setBars] = useState([15, 25, 40, 30, 20, 35]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const interval = window.setInterval(() => {
      setBars([
        Math.floor(20 + Math.random() * 60),
        Math.floor(30 + Math.random() * 70),
        Math.floor(15 + Math.random() * 85),
        Math.floor(25 + Math.random() * 65),
        Math.floor(35 + Math.random() * 55),
        Math.floor(10 + Math.random() * 50)
      ]);
    }, 80);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#121319] border border-[#2b2d3d] rounded-md shadow-inner">
      <div className="flex items-end gap-0.5 h-3.5">
        {bars.map((h, idx) => (
          <div
            key={idx}
            className="w-1 rounded-sm bg-gradient-to-t from-cyan-500 to-fuchsia-500 transition-all duration-75"
            style={{ height: isPlaying ? `${h}%` : '20%' }}
          />
        ))}
      </div>
      {effect && effect !== 'none' && (
        <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
          {effect === 'bass-boost' ? 'BASS' : effect === 'vocal-enhance' ? 'VOCAL' : 'LO-FI'}
        </span>
      )}
    </div>
  );
};

const AudioTrackPlayer: React.FC<{
  clip: Clip;
  currentTime: number;
  isPlaying: boolean;
  allClips?: Clip[];
}> = ({ clip, currentTime, isPlaying, allClips = [] }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!audioRef.current || !clip.source) return;
    const targetOffset = (currentTime - clip.start) * clip.speed + clip.trimStart;

    if (Math.abs(audioRef.current.currentTime - targetOffset) > 0.25) {
      audioRef.current.currentTime = Math.max(0, targetOffset);
    }

    const fadeFactor = calculateFadeMultiplier(clip, currentTime);
    const duckFactor = calculateAutoDuckingMultiplier(clip, allClips, currentTime);
    audioRef.current.volume = Math.max(0, Math.min(1, clip.volume * fadeFactor * duckFactor));
    audioRef.current.muted = clip.muted;
    audioRef.current.playbackRate = clip.speed;

    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [currentTime, isPlaying, clip, allClips]);

  return <audio ref={audioRef} src={clip.source} preload="auto" />;
};

const ChromaKeyCanvas: React.FC<{
  clip: Clip;
  isPlaying: boolean;
  filterStyle?: string;
}> = ({ clip, isPlaying, filterStyle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !clip.chromaKey?.enabled) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animId: number;
    const render = () => {
      const sourceEl = clip.type === 'image' ? imgRef.current : videoRef.current;
      if (sourceEl) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(sourceEl, 0, 0, canvas.width, canvas.height);
        applyChromaKeyToCanvas(ctx, canvas.width, canvas.height, clip.chromaKey!);
      }
      if (isPlaying && clip.type === 'video') {
        animId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [clip, isPlaying]);

  return (
    <div className="w-full h-full relative">
      {clip.type === 'image' ? (
        <img
          ref={imgRef}
          src={clip.source}
          alt={clip.title}
          className="hidden"
          crossOrigin="anonymous"
          onLoad={() => {
            const canvas = canvasRef.current;
            if (canvas && clip.chromaKey?.enabled) {
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx && imgRef.current) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
                applyChromaKeyToCanvas(ctx, canvas.width, canvas.height, clip.chromaKey);
              }
            }
          }}
        />
      ) : (
        <video
          ref={videoRef}
          src={clip.source}
          className="hidden"
          playsInline
          muted
          autoPlay
          loop
        />
      )}
      <canvas
        ref={canvasRef}
        width={320}
        height={240}
        className="w-full h-full object-contain rounded-lg drop-shadow-xl"
        style={{ filter: filterStyle }}
      />
    </div>
  );
};

export const Player: React.FC<PlayerProps> = ({
  aspectRatio,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  activeVideoClip,
  activeOverlayClips = [],
  activeTextClips,
  activeAudioClips,
  allClips = [],
  selectedClip,
  onUpdateClip,
  onSelectClip
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync HTML5 video element with current timeline position
  useEffect(() => {
    if (!videoRef.current || !activeVideoClip || activeVideoClip.type !== 'video') return;
    
    // Calculate media source offset
    const clipOffset = (currentTime - activeVideoClip.start) * activeVideoClip.speed + activeVideoClip.trimStart;
    
    if (Math.abs(videoRef.current.currentTime - clipOffset) > 0.25) {
      videoRef.current.currentTime = Math.max(0, clipOffset);
    }

    const fadeFactor = calculateFadeMultiplier(activeVideoClip, currentTime);
    videoRef.current.volume = Math.max(0, Math.min(1, activeVideoClip.volume * fadeFactor));
    videoRef.current.playbackRate = activeVideoClip.speed;
    videoRef.current.muted = activeVideoClip.muted;

    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [currentTime, isPlaying, activeVideoClip]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Toggle fullscreen mode
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (playerContainerRef.current) {
        playerContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard shortcuts: Space for Play/Pause, F for Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, handleToggleFullscreen]);

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

  // Gizmo drag handler for direct manipulation (moving and scaling)
  const handleStartGizmoDrag = (
    e: React.MouseEvent,
    clip: Clip,
    action: 'move' | 'scale'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onUpdateClip || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initPosX = clip.posX || 0;
    const initPosY = clip.posY || 0;
    const initScale = clip.scale || 1;

    // Viewport center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const initialDist = Math.max(20, Math.hypot(startX - centerX, startY - centerY));

    let currentClip: Clip = { ...clip };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const deltaXPct = (deltaX / rect.width) * 100;
      const deltaYPct = (deltaY / rect.height) * 100;

      if (action === 'move') {
        const newPosX = Math.max(-150, Math.min(150, Math.round(initPosX + deltaXPct)));
        const newPosY = Math.max(-150, Math.min(150, Math.round(initPosY + deltaYPct)));
        currentClip = { ...clip, posX: newPosX, posY: newPosY };
        onUpdateClip(currentClip, false);
      } else if ((action as string) === 'move-mask' && clip.blurMask) {
        const initMaskX = clip.blurMask.x || 0;
        const initMaskY = clip.blurMask.y || 0;
        const newMaskX = Math.max(-50, Math.min(50, Math.round(initMaskX + deltaXPct)));
        const newMaskY = Math.max(-50, Math.min(50, Math.round(initMaskY + deltaYPct)));
        currentClip = {
          ...clip,
          blurMask: {
            ...clip.blurMask,
            x: newMaskX,
            y: newMaskY
          }
        };
        onUpdateClip(currentClip, false);
      } else {
        const currentDist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
        const ratio = currentDist / initialDist;
        const newScale = Math.max(0.2, Math.min(3.0, Number((initScale * ratio).toFixed(2))));
        currentClip = { ...clip, scale: newScale };
        onUpdateClip(currentClip, false);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      onUpdateClip(currentClip, true);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Visual transforms and transitions for active video clip
  const visualTransform = activeVideoClip ? interpolateClipProperties(activeVideoClip, currentTime) : null;
  const visualTransition = activeVideoClip ? calculateTransitionEffect(activeVideoClip, currentTime) : null;
  const isVisualSelected = selectedClip && activeVideoClip && selectedClip.id === activeVideoClip.id;

  return (
    <div 
      ref={playerContainerRef}
      className={`flex-1 bg-[#0c0d12] flex flex-col items-center justify-between p-4 overflow-hidden relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50 p-6' : ''
      }`}
    >
      {/* Background Audio Players for Track-Audio clips */}
      {activeAudioClips.map((audioClip) => (
        <AudioTrackPlayer
          key={audioClip.id}
          clip={audioClip}
          currentTime={currentTime}
          isPlaying={isPlaying}
          allClips={allClips}
        />
      ))}

      {/* Viewport Area */}
      <div 
        className="w-full flex-1 flex items-center justify-center relative min-h-0"
      >
        <div 
          ref={viewportRef}
          onClick={() => {
            if (activeVideoClip && onSelectClip) {
              onSelectClip(activeVideoClip.id);
            }
          }}
          className={`relative bg-black rounded-xl overflow-hidden border border-[#232533] shadow-2xl shadow-black flex items-center justify-center cursor-pointer ${getAspectRatioClasses()}`}
          style={{ maxWidth: '100%' }}
        >
          {/* Main Visual Layer: Video or Image */}
          {activeVideoClip && activeVideoClip.source && visualTransform && visualTransition ? (
            activeVideoClip.type === 'image' ? (
              <img
                src={activeVideoClip.source}
                alt={activeVideoClip.title}
                className="w-full h-full object-contain pointer-events-none transition-transform"
                style={{
                  filter: getFilterStyle(activeVideoClip.filter),
                  transform: `translate(${visualTransform.posX + visualTransition.extraOffsetX}%, ${visualTransform.posY}%) scale(${visualTransform.scale}) rotate(${visualTransform.rotation}deg)`,
                  opacity: visualTransform.opacity * calculateFadeMultiplier(activeVideoClip, currentTime) * visualTransition.extraOpacity
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={activeVideoClip.source}
                className="w-full h-full object-contain pointer-events-none transition-transform"
                style={{
                  filter: getFilterStyle(activeVideoClip.filter),
                  transform: `translate(${visualTransform.posX + visualTransition.extraOffsetX}%, ${visualTransform.posY}%) scale(${visualTransform.scale}) rotate(${visualTransform.rotation}deg)`,
                  opacity: visualTransform.opacity * calculateFadeMultiplier(activeVideoClip, currentTime) * visualTransition.extraOpacity
                }}
                playsInline
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-zinc-600 gap-2 p-6 text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-700 flex items-center justify-center">
                <Play className="w-5 h-5 text-zinc-600 ml-0.5" />
              </div>
              <span className="text-xs font-medium text-zinc-500">
                Arraste arquivos ou adicione clipes na Timeline abaixo
              </span>
            </div>
          )}

          {/* Flash White Transition Overlay */}
          {visualTransition && visualTransition.flashAlpha > 0 && (
            <div
              className="absolute inset-0 bg-white pointer-events-none z-30 transition-opacity"
              style={{ opacity: visualTransition.flashAlpha }}
            />
          )}

          {/* Picture-in-Picture (PIP) / Overlay Clips Layer */}
          {activeOverlayClips.map((overlayClip) => {
            const transform = interpolateClipProperties(overlayClip, currentTime);
            const transition = calculateTransitionEffect(overlayClip, currentTime);
            const isSelected = selectedClip?.id === overlayClip.id;

            return (
              <div
                key={overlayClip.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectClip) onSelectClip(overlayClip.id);
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-15"
              >
                <div
                  className="relative pointer-events-auto cursor-pointer"
                  style={{
                    width: '45%',
                    height: '45%',
                    transform: `translate(${transform.posX + transition.extraOffsetX}%, ${transform.posY}%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                    opacity: transform.opacity * calculateFadeMultiplier(overlayClip, currentTime) * transition.extraOpacity
                  }}
                >
                  {overlayClip.chromaKey?.enabled ? (
                    <ChromaKeyCanvas
                      clip={overlayClip}
                      isPlaying={isPlaying}
                      filterStyle={getFilterStyle(overlayClip.filter)}
                    />
                  ) : overlayClip.type === 'image' ? (
                    <img
                      src={overlayClip.source}
                      alt={overlayClip.title}
                      className="w-full h-full object-contain drop-shadow-xl"
                      style={{ filter: getFilterStyle(overlayClip.filter) }}
                    />
                  ) : (
                    <video
                      src={overlayClip.source}
                      className="w-full h-full object-cover rounded-lg border border-purple-500/40 shadow-xl"
                      style={{ filter: getFilterStyle(overlayClip.filter) }}
                      playsInline
                      muted
                      autoPlay
                      loop
                    />
                  )}

                  {/* Gizmo for Overlay Clip when selected */}
                  {isSelected && onUpdateClip && (
                    <div
                      className="absolute inset-0 border-2 border-dashed border-purple-400 pointer-events-auto cursor-move select-none shadow-[0_0_15px_rgba(168,85,247,0.7)]"
                      onMouseDown={(e) => handleStartGizmoDrag(e, overlayClip, 'move')}
                    >
                      <div className="absolute -top-6 left-0 bg-purple-500 text-black font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                        PIP ({Math.round(transform.scale * 100)}%)
                      </div>
                      <div
                        onMouseDown={(e) => handleStartGizmoDrag(e, overlayClip, 'scale')}
                        className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded cursor-nwse-resize shadow"
                      />
                      <div
                        onMouseDown={(e) => handleStartGizmoDrag(e, overlayClip, 'scale')}
                        className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded cursor-nwse-resize shadow"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Interactive Bounding Box / Gizmo for Main Visual Element */}
          {isVisualSelected && onUpdateClip && visualTransform && (
            <div
              className="absolute inset-0 pointer-events-auto cursor-move select-none z-20"
              style={{
                transform: `translate(${visualTransform.posX}%, ${visualTransform.posY}%) scale(${visualTransform.scale}) rotate(${visualTransform.rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onMouseDown={(e) => handleStartGizmoDrag(e, activeVideoClip, 'move')}
            >
              {/* Glowing Dashed Border */}
              <div className="absolute inset-0 border-2 border-dashed border-cyan-400/90 pointer-events-none shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                {/* Title and Scale Tag */}
                <div className="absolute -top-7 left-0 bg-cyan-500 text-black font-extrabold text-[10px] px-2 py-0.5 rounded shadow flex items-center gap-1">
                  <span>{activeVideoClip.type === 'image' ? 'IMAGEM' : 'VÍDEO'}</span>
                  <span className="opacity-75 font-mono">{Math.round(visualTransform.scale * 100)}%</span>
                </div>
              </div>

              {/* 4 Corner Resize Handles */}
              <div
                onMouseDown={(e) => handleStartGizmoDrag(e, activeVideoClip, 'scale')}
                className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Arrastar para Redimensionar (Escala)"
              />
              <div
                onMouseDown={(e) => handleStartGizmoDrag(e, activeVideoClip, 'scale')}
                className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                title="Arrastar para Redimensionar (Escala)"
              />
              <div
                onMouseDown={(e) => handleStartGizmoDrag(e, activeVideoClip, 'scale')}
                className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                title="Arrastar para Redimensionar (Escala)"
              />
              <div
                onMouseDown={(e) => handleStartGizmoDrag(e, activeVideoClip, 'scale')}
                className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                title="Arrastar para Redimensionar (Escala)"
              />
            </div>
          )}

          {/* Text & Auto-Captions Overlays Layer */}
          {activeTextClips.map((textClip) => {
            const props = textClip.textProps;
            if (!props) return null;

            const isTextSelected = selectedClip?.id === textClip.id;
            const textTransform = interpolateClipProperties(textClip, currentTime);

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
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectClip) onSelectClip(textClip.id);
                }}
                className="absolute inset-x-0 px-6 flex justify-center z-20 pointer-events-auto cursor-pointer"
                style={{
                  bottom: props.style === 'capcut-yellow' ? '12%' : '18%',
                  transform: `translate(${textTransform.posX}%, ${textTransform.posY}%) scale(${textTransform.scale})`,
                  opacity: textTransform.opacity * calculateFadeMultiplier(textClip, currentTime)
                }}
              >
                <div
                  onMouseDown={isTextSelected && onUpdateClip ? (e) => handleStartGizmoDrag(e, textClip, 'move') : undefined}
                  className={`text-center text-xl sm:text-2xl transition-all duration-75 select-none relative ${styleClasses} ${
                    isTextSelected
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black/60 shadow-[0_0_15px_rgba(6,182,212,0.8)] cursor-move'
                      : ''
                  }`}
                  style={{
                    color: props.color,
                    fontSize: `${props.fontSize}px`
                  }}
                >
                  {props.content}

                  {/* Corner handles for selected text */}
                  {isTextSelected && onUpdateClip && (
                    <>
                      <div
                        onMouseDown={(e) => handleStartGizmoDrag(e, textClip, 'scale')}
                        className="absolute -top-2 -left-2 w-3.5 h-3.5 bg-white border border-cyan-500 rounded-sm cursor-nwse-resize shadow"
                        title="Redimensionar Texto"
                      />
                      <div
                        onMouseDown={(e) => handleStartGizmoDrag(e, textClip, 'scale')}
                        className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-white border border-cyan-500 rounded-sm cursor-nwse-resize shadow"
                        title="Redimensionar Texto"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Privacy Blur & Pixelation Masks */}
          {allClips
            .filter((c) => c.blurMask?.enabled && currentTime >= c.start && currentTime < c.start + c.duration)
            .map((maskClip) => {
              const mask = maskClip.blurMask!;
              const isMaskSelected = selectedClip?.id === maskClip.id;

              return (
                <div
                  key={`mask_${maskClip.id}`}
                  className={`absolute rounded-md z-25 overflow-hidden select-none transition-shadow ${
                    isMaskSelected
                      ? 'border-2 border-dashed border-amber-400 pointer-events-auto cursor-move shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                      : 'pointer-events-none'
                  }`}
                  style={{
                    width: `${mask.width}%`,
                    height: `${mask.height}%`,
                    left: `calc(50% + ${mask.x}% - ${mask.width / 2}%)`,
                    top: `calc(50% + ${mask.y}% - ${mask.height / 2}%)`,
                    backdropFilter: mask.type === 'pixelate' ? 'blur(1px)' : `blur(${mask.blurRadius || 12}px)`,
                    backgroundColor: mask.type === 'pixelate' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.05)'
                  }}
                  onMouseDown={isMaskSelected && onUpdateClip ? (e) => handleStartGizmoDrag(e, maskClip, 'move-mask' as any) : undefined}
                >
                  {isMaskSelected && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-black font-extrabold text-[8px] px-1 py-0.5 rounded shadow">
                      {mask.type === 'pixelate' ? 'PIXELATE' : 'BLUR'}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="h-12 w-full max-w-xl bg-[#161820] border border-[#262835] rounded-xl px-4 flex items-center justify-between shadow-lg mt-2 z-20">
        {/* Left: Timecode & Spectrum Visualizer */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 font-mono text-xs text-zinc-300">
            <span className="text-cyan-400 font-bold">{formatTimecode(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">{formatTimecode(totalDuration)}</span>
          </div>

          <VisualSpectrum
            isPlaying={isPlaying}
            effect={activeAudioClips[0]?.audioEffect || activeVideoClip?.audioEffect}
          />
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

        {/* Right: Quick Tools & Fullscreen */}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <button
            onClick={() => onSeek(0)}
            className="p-1.5 hover:text-white hover:bg-[#232533] rounded-lg transition-colors cursor-pointer"
            title="Voltar ao Início (Home)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleFullscreen}
            className={`p-1.5 hover:text-cyan-300 hover:bg-[#232533] rounded-lg transition-colors cursor-pointer ${
              isFullscreen ? 'text-cyan-400 bg-cyan-500/20' : ''
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia (F)' : 'Tela Cheia (F)'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
