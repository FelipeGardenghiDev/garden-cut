import React from 'react';
import { 
  Sliders, 
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
  const isImage = selectedClip.type === 'image';
  const isVisual = isVideo || isImage;
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

        {/* VISUAL (VIDEO & IMAGE) TRANSFORM CONTROLS */}
        {isVisual && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Transformação & Posição
            </span>

            {/* Position X / Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[10px]">
                  <span>Posição X</span>
                  <span className="font-mono text-cyan-400">{selectedClip.posX || 0}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={selectedClip.posX || 0}
                  onChange={(e) =>
                    onUpdateClip({ ...selectedClip, posX: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400 text-[10px]">
                  <span>Posição Y</span>
                  <span className="font-mono text-cyan-400">{selectedClip.posY || 0}%</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={selectedClip.posY || 0}
                  onChange={(e) =>
                    onUpdateClip({ ...selectedClip, posY: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
            {(selectedClip.posX !== 0 || selectedClip.posY !== 0) && (
              <button
                onClick={() => onUpdateClip({ ...selectedClip, posX: 0, posY: 0 })}
                className="w-full py-1 rounded bg-[#14151c] hover:bg-[#20222e] border border-[#2d3040] text-[10px] text-zinc-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
              >
                Centralizar Posição (0, 0)
              </button>
            )}

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

            {/* Audio Effects / Equalizer */}
            <div className="space-y-1.5 pt-2 border-t border-[#262835]">
              <span className="text-[10px] text-zinc-400 font-semibold block">Efeito de Áudio (Equalizador)</span>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'none', label: 'Normal' },
                  { id: 'bass-boost', label: 'Bass Boost 808' },
                  { id: 'vocal-enhance', label: 'Voz Nítida' },
                  { id: 'lo-fi', label: 'Abafado Lo-Fi' }
                ].map((eff) => (
                  <button
                    key={eff.id}
                    onClick={() => onUpdateClip({ ...selectedClip, audioEffect: eff.id as any })}
                    className={`py-1 px-1.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      (selectedClip.audioEffect || 'none') === eff.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border-[#2d3040] bg-[#14151b] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TRANSITIONS & FADES */}
        <div className="space-y-3 pt-3 border-t border-[#262835]">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Transições & Fade
          </span>

          {/* Fade In */}
          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Fade In (Entrada)</span>
              <span className="font-mono text-cyan-400">{(selectedClip.fadeIn || 0).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.min(3, Math.max(0.5, selectedClip.duration / 2))}
              step="0.1"
              value={selectedClip.fadeIn || 0}
              onChange={(e) =>
                onUpdateClip({ ...selectedClip, fadeIn: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Fade Out */}
          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Fade Out (Saída)</span>
              <span className="font-mono text-cyan-400">{(selectedClip.fadeOut || 0).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.min(3, Math.max(0.5, selectedClip.duration / 2))}
              step="0.1"
              value={selectedClip.fadeOut || 0}
              onChange={(e) =>
                onUpdateClip({ ...selectedClip, fadeOut: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-3 gap-1 pt-1">
            {[
              { label: 'Sem Fade', in: 0, out: 0 },
              { label: 'Rápido', in: 0.5, out: 0.5 },
              { label: 'Suave', in: 1.0, out: 1.0 }
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() =>
                  onUpdateClip({
                    ...selectedClip,
                    fadeIn: preset.in,
                    fadeOut: preset.out
                  })
                }
                className="py-1 px-1.5 rounded bg-[#14151c] hover:bg-[#20222e] border border-[#2d3040] text-[10px] text-zinc-400 hover:text-white font-medium transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Visual Transitions (For Visual clips) */}
          {isVisual && (
            <div className="space-y-1.5 pt-2 border-t border-[#262835]">
              <span className="text-[10px] text-zinc-400 font-semibold block">Efeito de Transição (Corte)</span>
              <select
                value={selectedClip.transition || 'none'}
                onChange={(e) => onUpdateClip({ ...selectedClip, transition: e.target.value as any })}
                className="w-full bg-[#121319] border border-[#2d3040] text-zinc-200 rounded-lg p-2 text-xs outline-none"
              >
                <option value="none">Nenhuma (Corte Seco)</option>
                <option value="cross-dissolve">Dissolver (Cross-Dissolve)</option>
                <option value="slide-left">Deslizar (Slide Left)</option>
                <option value="fade-black">Fade to Black</option>
                <option value="flash-white">Flash Branco</option>
              </select>
            </div>
          )}
        </div>

        {/* KEYFRAME ANIMATIONS (For Visual and Text clips) */}
        {(isVisual || isText) && (
          <div className="space-y-3 pt-3 border-t border-[#262835]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Animação por Keyframes
              </span>
              <button
                onClick={() => {
                  const newKf = {
                    id: `kf_${Date.now()}`,
                    timeOffset: 0.5,
                    scale: selectedClip.scale,
                    posX: selectedClip.posX,
                    posY: selectedClip.posY,
                    opacity: selectedClip.opacity
                  };
                  const keyframes = [...(selectedClip.keyframes || []), newKf];
                  onUpdateClip({ ...selectedClip, keyframes });
                }}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                + Adicionar Ponto
              </button>
            </div>

            {selectedClip.keyframes && selectedClip.keyframes.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedClip.keyframes.map((kf, idx) => (
                  <div key={kf.id} className="p-2 rounded bg-[#14151c] border border-[#2d3040] flex items-center justify-between text-[11px]">
                    <span className="text-zinc-300 font-mono">
                      Ponto {idx + 1} ({kf.timeOffset.toFixed(1)}s): {Math.round((kf.scale || 1) * 100)}%
                    </span>
                    <button
                      onClick={() => {
                        const nextKf = selectedClip.keyframes?.filter((k) => k.id !== kf.id);
                        onUpdateClip({ ...selectedClip, keyframes: nextKf });
                      }}
                      className="text-zinc-500 hover:text-rose-400 text-xs px-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500">
                Adicione pontos-chave para animar escala e posição suavemente.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
