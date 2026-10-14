import React from 'react';
import { 
  Film, 
  Download, 
  Smartphone, 
  Monitor, 
  Square, 
  Magnet, 
  Undo2, 
  Redo2
} from 'lucide-react';
import { AspectRatio } from '../types/editor';

interface HeaderProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  isSnapping: boolean;
  onToggleSnapping: () => void;
  onOpenExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveStatus?: 'saved' | 'saving' | 'idle';
  onResetProject?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  aspectRatio,
  onAspectRatioChange,
  isSnapping,
  onToggleSnapping,
  onOpenExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  saveStatus = 'idle',
  onResetProject
}) => {
  return (
    <header className="h-14 bg-[#14151b] border-b border-[#232530] px-4 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-blue-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Film className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400">
            GardenCut
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Garden Edition
          </span>
        </div>
      </div>

      {/* Center: Controls & Aspect Ratio */}
      <div className="flex items-center gap-2 bg-[#1b1d25] p-1 rounded-xl border border-[#2b2d3c]">
        <button
          onClick={() => onAspectRatioChange('16:9')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            aspectRatio === '16:9'
              ? 'bg-cyan-500 text-black shadow-md font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-[#252834]'
          }`}
          title="16:9 Widescreen (YouTube, PC)"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>16:9</span>
        </button>

        <button
          onClick={() => onAspectRatioChange('9:16')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            aspectRatio === '9:16'
              ? 'bg-cyan-500 text-black shadow-md font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-[#252834]'
          }`}
          title="9:16 Vertical (TikTok, Reels, Shorts)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>9:16 Shorts</span>
        </button>

        <button
          onClick={() => onAspectRatioChange('1:1')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            aspectRatio === '1:1'
              ? 'bg-cyan-500 text-black shadow-md font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-[#252834]'
          }`}
          title="1:1 Quadrado (Instagram Post)"
        >
          <Square className="w-3.5 h-3.5" />
          <span>1:1</span>
        </button>

        <div className="w-[1px] h-4 bg-[#2f3243] mx-1" />

        {/* Snap magnet button */}
        <button
          onClick={onToggleSnapping}
          className={`p-1.5 rounded-lg text-xs transition-all ${
            isSnapping 
              ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/40' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title={isSnapping ? 'Timeline Magnética Ativa' : 'Timeline Livre'}
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 rounded-lg text-xs text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Persistence Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-[11px] text-amber-300 flex items-center gap-1.5 animate-pulse font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Salvo
            </span>
          )}
          {onResetProject && (
            <button
              onClick={onResetProject}
              className="text-[11px] text-zinc-400 hover:text-rose-400 px-2.5 py-1 rounded-lg border border-[#2b2d3c] hover:border-rose-500/40 transition-colors cursor-pointer"
              title="Resetar projeto e limpar dados salvos"
            >
              Novo Projeto
            </button>
          )}
        </div>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Exportar Vídeo</span>
        </button>
      </div>
    </header>
  );
};
