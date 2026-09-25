import React from 'react';
import { 
  Sliders, 
  RotateCw, 
  Eye, 
  Volume2, 
  FastForward, 
  Type, 
  Palette,
  Maximize2,
  X
} from 'lucide-react';
import { Clip, VideoFilter, TextStyle } from '../types/editor';

interface InspectorProps {
  selectedClip: Clip | null;
  onUpdateClip: (updated: Clip) => void;
  onClose: () => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedClip,
  onUpdateClip,
  onClose
}) => {
  if (!selectedClip) {
    return (
      <div className="w-72 bg-[#181920] border-l border-[#262833] p-4 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
        <Sliders className="w-8 h-8 text-zinc-600 mb-2" />
        <p className="font-semibold text-zinc-400">Nenhum clipe selecionado</p>
        <p className="text-[11px] mt-1 text-zinc-600">
          Clique em um clipe na timeline para editar propriedades e efeitos.
        </p>
      </div>
    );
  }

  const isVideo = selectedClip.type === 'video';
  const isText = selectedClip.type === 'text';
  const isAudio = selectedClip.type === 'audio';

  return (
    <div className="w-76 bg-[#181920] border-l border-[#262833] flex flex-col h-full z-20 text-xs">
      {/* Header */}
      <div className="h-12 border-b border-[#262833] px-4 flex items-center justify-between bg-[#14151b]">
        <div className="flex items-center gap-2 font-bold text-zinc-200">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="truncate max-w-[170px]">{selectedClip.title}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Properties List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TEXT SPECIFIC CONTROLS */}
        {isText && selectedClip.textProps && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Conteúdo do Texto
              </label>
              <textarea
                value={selectedClip.textProps.content}
                onChange={(e) =>
                  onUpdateClip({
                    ...selectedClip,
                    textProps: { ...selectedClip.textProps!, content: e.target.value }
                  })
                }
                rows={3}
                className="w-full bg-[#121319] border border-[#2d3040] focus:border-cyan-400 rounded-lg p-2 text-white font-medium text-xs resize-none outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Tamanho da Fonte ({selectedClip.textProps.fontSize}px)
              </label>
              <input
                type="range"
                min="18"
                max="72"
                value={selectedClip.textProps.fontSize}
                onChange={(e) =>
                  onUpdateClip({
                    ...selectedClip,
                    textProps: { ...selectedClip.textProps!, fontSize: Number(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Estilo de Legenda
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'capcut-yellow', label: 'CapCut Amarelo' },
                  { id: 'tiktok', label: 'TikTok Bold' },
                  { id: 'neon', label: 'Neon Cyber' },
                  { id: 'glitch', label: 'Glitch' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() =>
                      onUpdateClip({
                        ...selectedClip,
                        textProps: {
                          ...selectedClip.textProps!,
                          style: s.id as TextStyle,
                          color: s.id === 'capcut-yellow' ? '#fde047' : '#ffffff'
                        }
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                      selectedClip.textProps?.style === s.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-[#2d3040] bg-[#14151c] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIDEO SPECIFIC TRANSFORM CONTROLS */}
        {isVideo && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Transformação & Posição
            </span>

            {/* Scale / Zoom */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Escala (Zoom)</span>
                <span className="font-mono text-cyan-400">{Math.round(selectedClip.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={selectedClip.scale}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, scale: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Rotação</span>
                <span className="font-mono text-cyan-400">{selectedClip.rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={selectedClip.rotation}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, rotation: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Opacidade</span>
                <span className="font-mono text-cyan-400">{Math.round(selectedClip.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedClip.opacity}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, opacity: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Filter */}
            <div className="space-y-1.5 pt-2 border-t border-[#262835]">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Filtro Aplicado
              </span>
              <select
                value={selectedClip.filter}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, filter: e.target.value as VideoFilter })
                }
                className="w-full bg-[#121319] border border-[#2d3040] text-zinc-200 rounded-lg p-2 text-xs outline-none"
              >
                <option value="none">Original (Sem Filtro)</option>
                <option value="cinematic">Cinematográfico</option>
                <option value="vibrant">Vibrante</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="vintage">Vintage Retrô</option>
                <option value="bw">Preto & Branco</option>
                <option value="blur">Desfoque (Blur)</option>
              </select>
            </div>
          </div>
        )}

        {/* AUDIO PROPERTIES (For Video or Audio clips) */}
        {(isVideo || isAudio) && (
          <div className="space-y-3 pt-3 border-t border-[#262835]">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Áudio & Velocidade
            </span>

            {/* Volume */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Volume</span>
                <span className="font-mono text-cyan-400">{Math.round(selectedClip.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={selectedClip.volume}
                onChange={(e) =>
                  onUpdateClip({ ...selectedClip, volume: Number(e.target.value) })
                }
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Speed Multiplier */}
            <div className="space-y-1">
              <div className="flex justify-between text-zinc-400">
                <span>Velocidade de Reprodução</span>
                <span className="font-mono text-cyan-400">{selectedClip.speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onUpdateClip({ ...selectedClip, speed: spd })}
                    className={`py-1 rounded-md text-[11px] font-semibold border transition-all ${
                      selectedClip.speed === spd
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-[#2d3040] bg-[#14151b] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
