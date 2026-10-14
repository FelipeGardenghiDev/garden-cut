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
  Volume2,
  Image as ImageIcon,
  Video
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
import { generateProceduralWaveform, extractWaveformPeaks } from '../utils/waveform-generator';

const createClipId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

interface SidebarProps {
  activeTab: 'media' | 'text' | 'effects' | 'ai' | 'audio';
  onTabChange: (tab: 'media' | 'text' | 'effects' | 'ai' | 'audio') => void;
  onAddClip: (clip: Clip) => void;
  onApplyFilterToSelected: (filter: VideoFilter) => void;
  onGenerateAutoSubtitles: () => void;
  onSmartSilenceCut: () => void;
  isAiProcessing: boolean;
  onOpenScreenRecorder?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onAddClip,
  onApplyFilterToSelected,
  onGenerateAutoSubtitles,
  onSmartSilenceCut,
  isAiProcessing,
  onOpenScreenRecorder
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');
      let waveform: number[] | undefined;
      if (isAudio) {
        waveform = await extractWaveformPeaks(file, 40);
      }
      
      const newClip: Clip = {
        id: createClipId(isImage ? 'clip_img' : isAudio ? 'clip_aud' : 'clip_vid'),
        trackId: isAudio ? 'track-audio' : 'track-video',
        type: isImage ? 'image' : isAudio ? 'audio' : 'video',
        title: file.name,
        start: 0,
        duration: isImage ? 4 : 5,
        source: url,
        trimStart: 0,
        trimEnd: isImage ? 4 : 5,
        scale: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        filter: 'none',
        volume: 1,
        speed: 1,
        muted: false,
        fadeIn: 0,
        fadeOut: 0,
        waveform
      };

      onAddClip(newClip);
    }
  };

  const handleAddDemoClip = async (title: string, startCol: string, endCol: string, duration = 5) => {
    const blobUrl = await createDemoVideoBlob(title, startCol, endCol, duration);
    const waveform = generateProceduralWaveform(40, 'ambient');
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
      muted: false,
      fadeIn: 0.5,
      fadeOut: 0.5,
      waveform
    };
    onAddClip(newClip);
  };

  const handleAddStickerClip = (title: string, svgContent: string) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const newClip: Clip = {
      id: createClipId('sticker'),
      trackId: 'track-video',
      type: 'image',
      title,
      start: 0,
      duration: 4,
      source: url,
      trimStart: 0,
      trimEnd: 4,
      scale: 0.85,
      posX: 0,
      posY: 0,
      rotation: 0,
      opacity: 1,
      filter: 'none',
      volume: 1,
      speed: 1,
      muted: true,
      fadeIn: 0.3,
      fadeOut: 0.3
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
      fadeIn: 0.3,
      fadeOut: 0.3,
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

    const waveform = generateProceduralWaveform(40, type === 'lofi' ? 'beat' : 'sfx');

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
      muted: false,
      fadeIn: 0,
      fadeOut: type === 'lofi' ? 1.0 : 0,
      waveform
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
              <span className="text-xs font-semibold">Importar Mídia</span>
              <span className="text-[10px] text-zinc-500">Vídeos, Áudios ou Imagens (MP4, PNG, JPG, SVG)</span>
            </button>

            {onOpenScreenRecorder && (
              <button
                onClick={onOpenScreenRecorder}
                className="w-full py-3 px-4 border border-[#2d3042] hover:border-rose-500/80 rounded-xl flex items-center justify-between text-zinc-300 hover:text-white transition-all bg-[#1a1b26] hover:bg-[#201d2a] cursor-pointer group shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Gravar Tela ou Câmera</span>
                    <span className="text-[10px] text-zinc-500">Gravação em tempo real</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-400 font-mono px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/30">
                  REC
                </span>
              </button>
            )}

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

            {/* Visual Logos & Stickers */}
            <div className="pt-2 border-t border-[#262835]">
              <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                  <span>Logos & Stickers Rápidos</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    name: 'Logo GardenCut',
                    desc: 'Emblema Neon',
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 90" width="320" height="90"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#06b6d4" /><stop offset="50%" stop-color="#3b82f6" /><stop offset="100%" stop-color="#a855f7" /></linearGradient></defs><rect x="5" y="5" width="310" height="80" rx="18" fill="#14151f" stroke="#06b6d4" stroke-width="2.5"/><circle cx="45" cy="45" r="22" fill="url(#g1)" /><path d="M40 33 L55 45 L40 57 Z" fill="#ffffff" /><text x="78" y="53" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="28" letter-spacing="1">GardenCut</text></svg>'
                  },
                  {
                    name: 'Selo Ao Vivo',
                    desc: 'Badge Vermelho',
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 65" width="200" height="65"><rect x="4" y="4" width="192" height="57" rx="28" fill="#e11d48" /><circle cx="34" cy="32" r="10" fill="#ffffff" /><text x="56" y="43" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="28" letter-spacing="2">AO VIVO</text></svg>'
                  },
                  {
                    name: 'Inscreva-se',
                    desc: 'Botão YouTube',
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 70" width="260" height="70"><rect x="3" y="3" width="254" height="64" rx="32" fill="#ef4444" /><polygon points="36,23 54,35 36,47" fill="#ffffff"/><text x="64" y="44" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="22" letter-spacing="1">INSCREVA-SE</text></svg>'
                  },
                  {
                    name: 'Verificado',
                    desc: 'Selo Oficial',
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="70" height="70"><circle cx="35" cy="35" r="30" fill="#06b6d4" stroke="#ffffff" stroke-width="2"/><path d="M22 35 L31 44 L48 26" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                  }
                ].map((sticker, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleAddStickerClip(sticker.name, sticker.svg)}
                    className="p-2.5 rounded-lg border border-[#2e3040] hover:border-pink-500/80 bg-[#161722] hover:bg-[#1c1d2b] cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-zinc-200 group-hover:text-pink-300 transition-colors">
                        {sticker.name}
                      </span>
                      <div className="w-5 h-5 rounded-full bg-[#202230] group-hover:bg-pink-500 text-zinc-400 group-hover:text-black flex items-center justify-center transition-all">
                        <Plus className="w-3 h-3" />
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-500">{sticker.desc}</span>
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
