import React, { useRef } from 'react';
import { 
  FolderPlus, 
  Type, 
  Sparkles, 
  Bot, 
  Music, 
  Plus, 
  Upload, 
  Sliders, 
  Check, 
  Volume2
} from 'lucide-react';
import { Clip, VideoFilter, TextStyle } from '../types/editor';
import { createDemoVideoBlob } from '../utils/media-generator';
import { 
  generateWhooshSfxBlob, 
  generateDingSfxBlob, 
  generatePopSfxBlob, 
  generateBassDropBlob,
  generateLofiBeatAudioBlob
} from '../utils/audio-engine';

const createClipId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

interface SidebarProps {
  activeTab: 'media' | 'text' | 'effects' | 'ai' | 'audio';
  onTabChange: (tab: 'media' | 'text' | 'effects' | 'ai' | 'audio') => void;
  onAddClip: (clip: Clip) => void;
  onApplyFilterToSelected: (filter: VideoFilter) => void;
  onGenerateAutoSubtitles: () => void;
  onSmartSilenceCut: () => void;
  isAiProcessing: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onAddClip,
  onApplyFilterToSelected,
  onGenerateAutoSubtitles,
  onSmartSilenceCut,
  isAiProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      
      const newClip: Clip = {
        id: createClipId(`clip_${i}`),
        trackId: isAudio ? 'track-audio' : 'track-video',
        type: isAudio ? 'audio' : 'video',
        title: file.name,
        start: 0,
        duration: 5,
        source: url,
        trimStart: 0,
        trimEnd: 5,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false
      };

      onAddClip(newClip);
    }
  };

  const handleAddDemoClip = async (title: string, startCol: string, endCol: string, duration = 5) => {
    const blobUrl = await createDemoVideoBlob(title, startCol, endCol, duration);
    const newClip: Clip = {
      id: createClipId('clip_demo'),
      trackId: 'track-video',
      type: 'video',
      title,
      start: 0,
      duration,
      source: blobUrl,
      trimStart: 0,
      trimEnd: duration,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false
    };
    onAddClip(newClip);
  };

  const handleAddTextPreset = (style: TextStyle, label: string) => {
    const newClip: Clip = {
      id: createClipId('text'),
      trackId: 'track-text',
      type: 'text',
      title: label,
      start: 0,
      duration: 3,
      source: '',
      trimStart: 0,
      trimEnd: 3,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false,
      textProps: {
        content: label,
        style,
        fontSize: style === 'capcut-yellow' ? 44 : 36,
        color: style === 'capcut-yellow' ? '#fde047' : '#ffffff',
        backgroundColor: style === 'capcut-yellow' ? 'rgba(0,0,0,0.7)' : 'transparent',
        align: 'center',
        bold: true
      }
    };
    onAddClip(newClip);
  };

  const handleAddSfx = async (type: 'whoosh' | 'ding' | 'pop' | 'boom' | 'lofi') => {
    let source = '';
    let name = '';
    let dur = 1;

    if (type === 'whoosh') {
      source = await generateWhooshSfxBlob();
      name = 'Transição Whoosh';
      dur = 0.8;
    } else if (type === 'ding') {
      source = await generateDingSfxBlob();
      name = 'Ding de Sucesso';
      dur = 1.2;
    } else if (type === 'pop') {
      source = await generatePopSfxBlob();
      name = 'Pop Click';
      dur = 0.2;
    } else if (type === 'boom') {
      source = await generateBassDropBlob();
      name = 'Cinematic Bass Drop';
      dur = 2.0;
    } else if (type === 'lofi') {
      source = await generateLofiBeatAudioBlob(12);
      name = 'Trilha Lo-Fi Beat (12s)';
      dur = 12;
    }

    const newClip: Clip = {
      id: createClipId('sfx'),
      trackId: 'track-audio',
      type: 'audio',
      title: name,
      start: 0,
      duration: dur,
      source,
      trimStart: 0,
      trimEnd: dur,
      scale: 1,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: false
    };
    onAddClip(newClip);
  };

  return (
    <div className="w-84 bg-[#181920] border-r border-[#262833] flex flex-col h-full z-20">
      {/* Category Tabs Header */}
      <div className="flex border-b border-[#262833] bg-[#121318]">
        {[
          { id: 'media', label: 'Mídia', icon: FolderPlus },
          { id: 'text', label: 'Texto', icon: Type },
          { id: 'effects', label: 'Filtros', icon: Sparkles },
          { id: 'ai', label: 'IA Garden', icon: Bot },
          { id: 'audio', label: 'Áudio', icon: Music },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 gap-1 text-[11px] font-medium transition-all relative cursor-pointer ${
                isActive
                  ? 'text-cyan-400 bg-[#1b1c24]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161720]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-zinc-400'}`} />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: MEDIA */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="video/*,audio/*,image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-[#343747] hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-cyan-300 transition-all bg-[#1e202b]/50 hover:bg-[#1e202b] cursor-pointer"
            >
              <Upload className="w-6 h-6" />
              <span className="text-xs font-semibold">Importar Vídeo ou Áudio</span>
              <span className="text-[10px] text-zinc-500">MP4, WEBM, MP3, WAV</span>
            </button>

            <div>
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Clipes com Áudio Embutido</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Intro Tech', start: '#06b6d4', end: '#3b82f6', dur: 5 },
                  { name: 'Pôr do Sol', start: '#f97316', end: '#ec4899', dur: 4 },
                  { name: 'Cyberpunk', start: '#10b981', end: '#06b6d4', dur: 6 },
                  { name: 'Energia Neon', start: '#8b5cf6', end: '#f43f5e', dur: 5 },
                ].map((demo, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAddDemoClip(demo.name, demo.start, demo.end, demo.dur)}
                    className="group relative rounded-lg overflow-hidden border border-[#2e3040] hover:border-cyan-400 cursor-pointer transition-all aspect-video flex flex-col justify-end p-2 bg-[#121319]"
                    style={{
                      background: `linear-gradient(135deg, ${demo.start}33, ${demo.end}33)`
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center">
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-white z-10">{demo.name}</span>
                    <span className="text-[9px] text-zinc-400 z-10">{demo.dur}s • Som Stereo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEXT */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Estilos de Texto & Legendas
            </span>
            {[
              {
                style: 'capcut-yellow' as TextStyle,
                label: 'LEGENDA GARDENCUT',
                desc: 'Amarelo vibrante com fundo escuro',
                bg: 'bg-yellow-400 text-black font-black'
              },
              {
                style: 'tiktok' as TextStyle,
                label: 'VIRAL SHORTS',
                desc: 'Branco em negrito com contorno preto',
                bg: 'bg-white text-black font-extrabold'
              },
              {
                style: 'neon' as TextStyle,
                label: 'NEON CYBER',
                desc: 'Ciano fluorescente com brilho',
                bg: 'bg-cyan-500 text-black font-bold'
              },
              {
                style: 'glitch' as TextStyle,
                label: 'TÍTULO GLITCH',
                desc: 'Vermelho e ciano futurista',
                bg: 'bg-rose-500 text-white font-mono'
              }
            ].map((preset, idx) => (
              <div
                key={idx}
                onClick={() => handleAddTextPreset(preset.style, preset.label)}
                className="p-3 bg-[#1e202b] hover:bg-[#252836] border border-[#2d3040] hover:border-cyan-400/80 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className={`inline-block px-2 py-0.5 rounded text-xs tracking-wider mb-1 ${preset.bg}`}>
                    {preset.label}
                  </div>
                  <p className="text-[11px] text-zinc-400">{preset.desc}</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#14151b] group-hover:bg-cyan-500 text-zinc-400 group-hover:text-black flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: EFFECTS & FILTERS */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Filtros de Cor do Clipe
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'Normal / Original' },
                { id: 'cinematic', label: 'Cinematográfico' },
                { id: 'vibrant', label: 'Vibrante / Pop' },
                { id: 'cyberpunk', label: 'Cyberpunk' },
                { id: 'vintage', label: 'Vintage Retrô' },
                { id: 'bw', label: 'Preto & Branco' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => onApplyFilterToSelected(f.id as VideoFilter)}
                  className="p-3 text-left rounded-xl bg-[#1e202b] hover:bg-[#262836] border border-[#2d3040] hover:border-cyan-400 transition-all text-xs font-semibold text-zinc-200 cursor-pointer flex flex-col justify-between h-20"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI GARDEN TOOLS */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Ferramentas de IA (100% Locais)
            </span>

            {/* Auto Subtitles */}
            <div className="p-3.5 bg-gradient-to-br from-[#1e202b] to-[#1c1d29] border border-cyan-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Legendas Automáticas</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Gera legendas sincronizadas palavra por palavra instantaneamente estilo CapCut e Shorts.
              </p>
              <button
                onClick={onGenerateAutoSubtitles}
                disabled={isAiProcessing}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 text-black font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                {isAiProcessing ? (
                  <span className="animate-spin text-sm">⏳</span>
                ) : (
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{isAiProcessing ? 'Processando IA...' : 'Gerar Auto-Legendas'}</span>
              </button>
            </div>

            {/* Smart Silence Cut */}
            <div className="p-3.5 bg-[#1e202b] border border-[#2d3040] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Corte Inteligente de Silêncio</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Detecta pausas longas, respirações e silêncios no áudio e remove automaticamente.
              </p>
              <button
                onClick={onSmartSilenceCut}
                className="w-full py-2 bg-[#282a39] hover:bg-[#323548] text-amber-300 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar Smart Cut</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIO & SOUND EFFECTS */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Trilhas & Efeitos Sonoros Reais
            </span>

            {/* Music track */}
            <div
              onClick={() => handleAddSfx('lofi')}
              className="p-3 bg-gradient-to-r from-emerald-950/60 to-[#1e202b] hover:border-emerald-400 border border-emerald-500/40 rounded-xl flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                    Trilha Lo-Fi Beat (Completa)
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Bateria + Teclado • 12s áudio real</span>
                </div>
              </div>
              <Plus className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />
            </div>

            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pt-2">
              Efeitos de Transição (SFX)
            </div>

            {[
              { id: 'whoosh', name: 'Transição Whoosh', desc: 'Efeito sonoro de corte rápido' },
              { id: 'ding', name: 'Ding de Sucesso', desc: 'Chime de alerta e destaque' },
              { id: 'pop', name: 'Pop Click', desc: 'Estalo de botão e sticker' },
              { id: 'boom', name: 'Cinematic Bass Drop', desc: 'Sub grave 808 de impacto' },
            ].map((sfx) => (
              <div
                key={sfx.id}
                onClick={() => handleAddSfx(sfx.id as any)}
                className="p-2.5 bg-[#1e202b] hover:bg-[#252836] border border-[#2d3040] hover:border-cyan-400 rounded-xl flex items-center justify-between cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs text-zinc-200 block font-medium group-hover:text-cyan-300">{sfx.name}</span>
                    <span className="text-[10px] text-zinc-500">{sfx.desc}</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#14151b] group-hover:bg-cyan-500 group-hover:text-black text-zinc-500 flex items-center justify-center transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
