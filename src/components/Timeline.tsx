import React, { useRef, useState, useEffect } from 'react';
import { 
  Scissors, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Film, 
  Type, 
  Music, 
  GripVertical
} from 'lucide-react';
import { Clip } from '../types/editor';
import { formatSeconds } from '../utils/media-generator';

interface TimelineProps {
  clips: Clip[];
  currentTime: number;
  totalDuration: number;
  zoom: number; // Pixels per second
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onSplitClip: () => void;
  onDeleteClip: (clipId: string) => void;
  onUpdateClip: (updated: Clip, commitHistory?: boolean) => void;
  onZoomChange: (newZoom: number) => void;
}

interface DragState {
  clipId: string;
  mode: 'move' | 'trim-start' | 'trim-end';
  startX: number;
  initialStart: number;
  initialDuration: number;
  initialTrimStart: number;
  initialTrimEnd: number;
  trackId: string;
  hasMoved: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  currentTime,
  totalDuration,
  zoom,
  selectedClipId,
  onSelectClip,
  onSeek,
  onSplitClip,
  onDeleteClip,
  onUpdateClip,
  onZoomChange
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);
  const [dragInfoText, setDragInfoText] = useState<string | null>(null);

  // Keyboard shortcut: Delete or Backspace to remove selected clip, Ctrl+B to split
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        onDeleteClip(selectedClipId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onSplitClip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip, onSplitClip]);

  // Scrubbing on the ruler
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    handleRulerMove(e);
  };

  const handleRulerMove = (e: React.MouseEvent | MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, e.clientX - rect.left);
    const newTime = Math.max(0, offsetX / zoom);
    onSeek(newTime);
  };

  // Start dragging a clip (Move or Trim)
  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: Clip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onSelectClip(clip.id);

    setDragState({
      clipId: clip.id,
      mode,
      startX: e.clientX,
      initialStart: clip.start,
      initialDuration: clip.duration,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
      trackId: clip.trackId,
      hasMoved: false
    });
  };

  // Global Mouse Move and Mouse Up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Scrubbing Playhead
      if (isScrubbing) {
        handleRulerMove(e);
        return;
      }

      // 2. Dragging Clips (Move or Trim)
      if (dragState) {
        const deltaPx = e.clientX - dragState.startX;
        const deltaTime = deltaPx / zoom;
        const clip = clips.find((c) => c.id === dragState.clipId);
        if (!clip) return;

        dragState.hasMoved = true;

        if (dragState.mode === 'move') {
          let newStart = Math.max(0, dragState.initialStart + deltaTime);
          let snapped = false;

          // Smart Snapping (threshold ~14px)
          const snapThreshold = 14 / zoom;

          // Snap to 0
          if (Math.abs(newStart) < snapThreshold) {
            newStart = 0;
            snapped = true;
            setSnapGuideTime(0);
          }

          // Snap to Playhead
          if (!snapped && Math.abs(newStart - currentTime) < snapThreshold) {
            newStart = currentTime;
            snapped = true;
            setSnapGuideTime(currentTime);
          }

          // Snap to other clips on all tracks
          if (!snapped) {
            for (const other of clips) {
              if (other.id === clip.id) continue;
              // Snap clip start to other clip end
              const otherEnd = other.start + other.duration;
              if (Math.abs(newStart - otherEnd) < snapThreshold) {
                newStart = otherEnd;
                snapped = true;
                setSnapGuideTime(otherEnd);
                break;
              }
              // Snap clip start to other clip start
              if (Math.abs(newStart - other.start) < snapThreshold) {
                newStart = other.start;
                snapped = true;
                setSnapGuideTime(other.start);
                break;
              }
              // Snap clip end to other clip start
              if (Math.abs((newStart + clip.duration) - other.start) < snapThreshold) {
                newStart = other.start - clip.duration;
                snapped = true;
                setSnapGuideTime(other.start);
                break;
              }
            }
          }

          if (!snapped) {
            setSnapGuideTime(null);
          }

          setDragInfoText(`Início: ${formatSeconds(newStart)}`);
          onUpdateClip({ ...clip, start: Math.max(0, newStart) }, false);
        } else if (dragState.mode === 'trim-start') {
          const rawNewStart = dragState.initialStart + deltaTime;
          const maxStart = dragState.initialStart + dragState.initialDuration - 0.3;
          const newStart = Math.max(0, Math.min(maxStart, rawNewStart));
          const newDuration = (dragState.initialStart + dragState.initialDuration) - newStart;
          const addedTrim = newStart - dragState.initialStart;

          setDragInfoText(`Início: ${formatSeconds(newStart)} • Dur: ${newDuration.toFixed(1)}s`);
          onUpdateClip({
            ...clip,
            start: newStart,
            duration: newDuration,
            trimStart: Math.max(0, dragState.initialTrimStart + addedTrim)
          }, false);
        } else if (dragState.mode === 'trim-end') {
          const newDuration = Math.max(0.3, dragState.initialDuration + deltaTime);
          setDragInfoText(`Duração: ${newDuration.toFixed(1)}s`);
          onUpdateClip({
            ...clip,
            duration: newDuration,
            trimEnd: dragState.initialTrimStart + newDuration
          }, false);
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }

      if (dragState) {
        const clip = clips.find((c) => c.id === dragState.clipId);
        if (clip && dragState.hasMoved) {
          onUpdateClip(clip, true); // Commit final change to history
        }
        setDragState(null);
        setSnapGuideTime(null);
        setDragInfoText(null);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isScrubbing, dragState, zoom, clips, currentTime, onUpdateClip]);

  // Total width of the timeline canvas
  const timelineDuration = Math.max(totalDuration + 8, 25);
  const timelineWidthPx = timelineDuration * zoom;

  // Generate ruler tick marks
  const ticksCount = Math.ceil(timelineDuration);
  const ticks = Array.from({ length: ticksCount }, (_, i) => i);

  // Filter clips by track
  const textClips = clips.filter((c) => c.trackId === 'track-text');
  const videoClips = clips.filter((c) => c.trackId === 'track-video');
  const audioClips = clips.filter((c) => c.trackId === 'track-audio');

  // Generic render clip block
  const renderClipBlock = (
    clip: Clip,
    colorClasses: {
      selected: string;
      idle: string;
      iconColor: string;
      handleColor: string;
    },
    icon: React.ReactNode,
    displayText: string
  ) => {
    const isSelected = selectedClipId === clip.id;
    const isDraggingThis = dragState?.clipId === clip.id;

    return (
      <div
        key={clip.id}
        onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
        className={`absolute top-1 bottom-1 rounded-lg flex items-center justify-between text-xs font-semibold cursor-grab active:cursor-grabbing select-none group transition-shadow ${
          isSelected
            ? `${colorClasses.selected} ring-2 ring-white shadow-xl z-20`
            : `${colorClasses.idle} z-10 hover:brightness-110`
        } ${isDraggingThis ? 'opacity-90 shadow-2xl scale-[1.01]' : ''}`}
        style={{
          left: `${clip.start * zoom}px`,
          width: `${Math.max(24, clip.duration * zoom)}px`
        }}
      >
        {/* Left Trim Handle */}
        <div
          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-start')}
          className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-lg hover:w-3 cursor-ew-resize flex items-center justify-center transition-all z-30 ${
            isSelected ? colorClasses.handleColor : 'hover:bg-white/30'
          }`}
          title="Arrastar para cortar início"
        >
          <div className="w-[2px] h-3 bg-white/60 rounded-full" />
        </div>

        {/* Clip Body Content */}
        <div className="flex-1 px-3 flex items-center gap-1.5 truncate pointer-events-none">
          <span className={colorClasses.iconColor}>{icon}</span>
          <span className="truncate text-xs font-medium">{displayText}</span>
        </div>

        {/* Duration badge */}
        <span
          className={`text-[10px] font-mono px-1 py-0.5 rounded mr-2 pointer-events-none ${
            isSelected ? 'bg-black/30 text-black font-bold' : 'bg-black/40 text-zinc-400'
          }`}
        >
          {clip.duration.toFixed(1)}s
        </span>

        {/* Right Trim Handle */}
        <div
          onMouseDown={(e) => handleClipMouseDown(e, clip, 'trim-end')}
          className={`absolute right-0 top-0 bottom-0 w-2.5 rounded-r-lg hover:w-3 cursor-ew-resize flex items-center justify-center transition-all z-30 ${
            isSelected ? colorClasses.handleColor : 'hover:bg-white/30'
          }`}
          title="Arrastar para cortar final"
        >
          <div className="w-[2px] h-3 bg-white/60 rounded-full" />
        </div>
      </div>
    );
  };

  return (
    <div className="h-72 bg-[#121319] border-t border-[#232533] flex flex-col select-none relative z-10">
      {/* Timeline Quick Action Toolbar */}
      <div className="h-10 bg-[#161720] border-b border-[#232533] px-4 flex items-center justify-between text-xs">
        {/* Left Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSplitClip}
            className="flex items-center gap-1 px-3 py-1 bg-[#222432] hover:bg-cyan-500 hover:text-black text-zinc-300 font-semibold rounded-lg transition-colors cursor-pointer border border-[#2e3145]"
            title="Dividir / Cortar na Agulha (Ctrl + B)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Dividir (Split)</span>
          </button>

          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-3 py-1 bg-[#222432] hover:bg-rose-500 hover:text-white text-zinc-300 font-semibold rounded-lg transition-colors cursor-pointer border border-[#2e3145] disabled:opacity-30 disabled:hover:bg-[#222432] disabled:hover:text-zinc-300"
            title="Excluir Clipe Selecionado (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>

          <div className="h-4 w-[1px] bg-[#2e3145] mx-1" />

          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            💡 Dica: Arraste os blocos para mudar de posição ou as bordas para cortar!
          </span>
        </div>

        {/* Right Tools: Zoom Slider & Drag Info */}
        <div className="flex items-center gap-3">
          {dragInfoText && (
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded shadow">
              {dragInfoText}
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-[#1b1d27] px-2 py-1 rounded-lg border border-[#2e3145]">
            <button
              onClick={() => onZoomChange(Math.max(20, zoom - 15))}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="20"
              max="160"
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer h-1.5 bg-[#2c2f40] rounded-lg"
            />
            <button
              onClick={() => onZoomChange(Math.min(160, zoom + 15))}
              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Scrollable Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#101117]"
      >
        <div 
          className="relative h-full"
          style={{ width: `${timelineWidthPx + 200}px` }}
        >
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-7 border-b border-[#232533] bg-[#161720] relative cursor-pointer"
          >
            {ticks.map((sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-[#2e3145] pl-1.5 flex items-end pb-1"
                style={{ left: `${sec * zoom}px` }}
              >
                <span className="text-[10px] font-mono text-zinc-500 pointer-events-none">
                  {formatSeconds(sec)}
                </span>
              </div>
            ))}
          </div>

          {/* Tracks Area */}
          <div className="py-2 space-y-2">
            {/* TRACK 1: TEXT & OVERLAYS */}
            <div className="h-10 bg-[#161722]/50 border-y border-[#1e202e] relative flex items-center">
              <div className="sticky left-0 z-20 bg-[#191a26] px-2 py-0.5 rounded text-[10px] font-bold text-amber-300 border border-amber-500/20 shadow-md ml-2 flex items-center gap-1 shrink-0">
                <Type className="w-3 h-3 text-amber-400" />
                <span>Legendas / Texto</span>
              </div>

              {textClips.map((clip) =>
                renderClipBlock(
                  clip,
                  {
                    selected: 'bg-amber-400 text-black',
                    idle: 'bg-[#2b2519] text-amber-200 border border-amber-500/40',
                    iconColor: selectedClipId === clip.id ? 'text-black' : 'text-amber-400',
                    handleColor: 'bg-amber-600/80 hover:bg-amber-700'
                  },
                  <Type className="w-3.5 h-3.5" />,
                  clip.textProps?.content || clip.title
                )
              )}
            </div>

            {/* TRACK 2: MAIN VIDEO TRACK */}
            <div className="h-16 bg-[#161722]/70 border-y border-[#232535] relative flex items-center">
              <div className="sticky left-0 z-20 bg-[#191a26] px-2 py-1 rounded text-[10px] font-bold text-cyan-300 border border-cyan-500/20 shadow-md ml-2 flex items-center gap-1 shrink-0">
                <Film className="w-3 h-3 text-cyan-400" />
                <span>Vídeo Principal</span>
              </div>

              {videoClips.map((clip) =>
                renderClipBlock(
                  clip,
                  {
                    selected: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold',
                    idle: 'bg-gradient-to-r from-[#1e293b] to-[#1e2030] text-zinc-200 border border-cyan-500/30',
                    iconColor: selectedClipId === clip.id ? 'text-black' : 'text-cyan-400',
                    handleColor: 'bg-cyan-600/80 hover:bg-cyan-700'
                  },
                  <Film className="w-3.5 h-3.5" />,
                  clip.title
                )
              )}
            </div>

            {/* TRACK 3: AUDIO / SFX TRACK */}
            <div className="h-11 bg-[#161722]/50 border-y border-[#1e202e] relative flex items-center">
              <div className="sticky left-0 z-20 bg-[#191a26] px-2 py-0.5 rounded text-[10px] font-bold text-emerald-300 border border-emerald-500/20 shadow-md ml-2 flex items-center gap-1 shrink-0">
                <Music className="w-3 h-3 text-emerald-400" />
                <span>Áudio / SFX</span>
              </div>

              {audioClips.map((clip) =>
                renderClipBlock(
                  clip,
                  {
                    selected: 'bg-emerald-400 text-black',
                    idle: 'bg-[#142820] text-emerald-200 border border-emerald-500/40',
                    iconColor: selectedClipId === clip.id ? 'text-black' : 'text-emerald-400',
                    handleColor: 'bg-emerald-600/80 hover:bg-emerald-700'
                  },
                  <Music className="w-3.5 h-3.5" />,
                  clip.title
                )
              )}
            </div>
          </div>

          {/* MAGNETIC SNAP GUIDE LINE */}
          {snapGuideTime !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-30 transition-none"
              style={{ left: `${snapGuideTime * zoom}px` }}
            >
              <div className="w-[1.5px] h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
            </div>
          )}

          {/* PLAYHEAD / RED NEEDLE (Cursor de Reprodução) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-40 transition-none"
            style={{ left: `${currentTime * zoom}px` }}
          >
            {/* Top Playhead Needle Head */}
            <div className="w-3.5 h-3.5 bg-rose-500 rounded-sm rotate-45 -ml-[7px] -mt-1 shadow-md shadow-rose-500/50" />
            {/* Red Line */}
            <div className="w-[2px] h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] -ml-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
