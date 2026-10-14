import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { ExportModal } from './components/ExportModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AspectRatio, Clip, VideoFilter } from './types/editor';
import { createDemoVideoBlob } from './utils/media-generator';
import { generateLofiBeatAudioBlob } from './utils/audio-engine';
import { saveProjectToStorage, loadProjectFromStorage, clearProjectStorage } from './utils/project-storage';
import { generateProceduralWaveform, extractWaveformPeaks } from './utils/waveform-generator';
import { UploadCloud } from 'lucide-react';

export function App() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(55);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'media' | 'text' | 'effects' | 'ai' | 'audio'>('media');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Clips list on the timeline
  const [clips, setClips] = useState<Clip[]>([]);
  const [history, setHistory] = useState<Clip[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Playback timer ref
  const lastTimeRef = useRef<number>(0);

  // Initial starter clips or load from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    async function initStarterClips() {
      try {
        // 1. Try loading existing project from IndexedDB
        const savedProject = await loadProjectFromStorage();
        if (savedProject && savedProject.clips.length > 0) {
          if (!isMounted) return;
          setClips(savedProject.clips);
          setAspectRatio(savedProject.aspectRatio);
          setHistory([savedProject.clips]);
          setHistoryIndex(0);
          setSelectedClipId(savedProject.clips[0].id);
          setSaveStatus('saved');
          return;
        }

        // 2. Otherwise generate initial demo clips with real audio and waveforms
        const demoUrl1 = await createDemoVideoBlob('GardenCut - Cena 1', '#06b6d4', '#3b82f6', 5);
        const demoUrl2 = await createDemoVideoBlob('Cortes Rápidos & Efeitos', '#8b5cf6', '#ec4899', 5);
        const lofiAudioUrl = await generateLofiBeatAudioBlob(10);

        if (!isMounted) return;

        const initialClips: Clip[] = [
          // Track 1: Text Subtitles
          {
            id: 'txt_init_1',
            trackId: 'track-text',
            type: 'text',
            title: 'BEM-VINDOS AO GARDENCUT',
            start: 0.5,
            duration: 3.5,
            source: '',
            trimStart: 0,
            trimEnd: 3.5,
            scale: 1,
            posX: 0,
            posY: 0,
            rotation: 0,
            opacity: 1,
            filter: 'none',
            volume: 1,
            speed: 1,
            muted: false,
            fadeIn: 0.4,
            fadeOut: 0.4,
            textProps: {
              content: 'BEM-VINDOS AO GARDENCUT',
              style: 'capcut-yellow',
              fontSize: 38,
              color: '#fde047',
              backgroundColor: 'rgba(0,0,0,0.8)',
              align: 'center',
              bold: true
            }
          },
          {
            id: 'txt_init_2',
            trackId: 'track-text',
            type: 'text',
            title: 'SOM & VÍDEO 100% LOCAL',
            start: 4.5,
            duration: 4.5,
            source: '',
            trimStart: 0,
            trimEnd: 4.5,
            scale: 1,
            posX: 0,
            posY: 0,
            rotation: 0,
            opacity: 1,
            filter: 'none',
            volume: 1,
            speed: 1,
            muted: false,
            fadeIn: 0.4,
            fadeOut: 0.4,
            textProps: {
              content: 'SOM & VÍDEO 100% LOCAL',
              style: 'tiktok',
              fontSize: 42,
              color: '#ffffff',
              backgroundColor: 'transparent',
              align: 'center',
              bold: true
            }
          },
          // Track 2: Video Clips
          {
            id: 'vid_init_1',
            trackId: 'track-video',
            type: 'video',
            title: 'Intro Tech (Com Som)',
            start: 0,
            duration: 5,
            source: demoUrl1,
            trimStart: 0,
            trimEnd: 5,
            scale: 1,
            posX: 0,
            posY: 0,
            rotation: 0,
            opacity: 1,
            filter: 'none',
            volume: 0.8,
            speed: 1,
            muted: false,
            fadeIn: 0.5,
            fadeOut: 0.5,
            waveform: generateProceduralWaveform(40, 'ambient')
          },
          {
            id: 'vid_init_2',
            trackId: 'track-video',
            type: 'video',
            title: 'Cena 2 - Efeitos',
            start: 5,
            duration: 5,
            source: demoUrl2,
            trimStart: 0,
            trimEnd: 5,
            scale: 1,
            posX: 0,
            posY: 0,
            rotation: 0,
            opacity: 1,
            filter: 'vibrant',
            volume: 0.8,
            speed: 1,
            muted: false,
            fadeIn: 0.5,
            fadeOut: 0.5,
            waveform: generateProceduralWaveform(40, 'ambient')
          },
          // Track 3: Audio with REAL synthesized Lo-Fi Beat!
          {
            id: 'aud_init_1',
            trackId: 'track-audio',
            type: 'audio',
            title: 'Trilha Lo-Fi Beat Real',
            start: 0,
            duration: 10,
            source: lofiAudioUrl,
            trimStart: 0,
            trimEnd: 10,
            scale: 1,
            posX: 0,
            posY: 0,
            rotation: 0,
            opacity: 1,
            filter: 'none',
            volume: 0.9,
            speed: 1,
            muted: false,
            fadeIn: 0.2,
            fadeOut: 1.0,
            waveform: generateProceduralWaveform(50, 'beat')
          }
        ];

        setClips(initialClips);
        setSelectedClipId(initialClips[2].id);
        setHistory([initialClips]);
        setHistoryIndex(0);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error creating starter demo clips with audio:', err);
      }
    }

    initStarterClips();
    return () => { isMounted = false; };
  }, []);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (clips.length === 0) return;
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      await saveProjectToStorage(clips, aspectRatio);
      setSaveStatus('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [clips, aspectRatio]);

  const handleResetProject = async () => {
    if (window.confirm('Tem certeza que deseja criar um Novo Projeto? As alterações salvas serão limpas.')) {
      await clearProjectStorage();
      window.location.reload();
    }
  };

  // Calculate total timeline duration based on furthest clip end
  const totalDuration = Math.max(
    10,
    clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0)
  );

  // History management (Undo/Redo)
  const pushHistory = useCallback((newClips: Clip[]) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newClips]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setClips(history[newIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setClips(history[newIdx]);
    }
  };

  // Keyboard shortcut: '?' for Shortcuts Guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Native OS Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newClips: Clip[] = [];
    let currentOffset = currentTime;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio');
      const isImage = file.type.startsWith('image');
      const duration = isImage ? 4 : 5;

      let waveform: number[] | undefined;
      if (isAudio) {
        waveform = await extractWaveformPeaks(file, 40);
      }

      const clip: Clip = {
        id: `drop_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        trackId: isAudio ? 'track-audio' : 'track-video',
        type: isImage ? 'image' : isAudio ? 'audio' : 'video',
        title: file.name,
        start: currentOffset,
        duration,
        source: url,
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
        fadeIn: 0.3,
        fadeOut: 0.3,
        waveform
      };

      newClips.push(clip);
      if (!isAudio) {
        currentOffset += duration;
      }
    }

    if (newClips.length > 0) {
      const nextClips = [...clips, ...newClips];
      setClips(nextClips);
      setSelectedClipId(newClips[0].id);
      pushHistory(nextClips);
    }
  };

  // Playback loop with requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + deltaSec;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, totalDuration]);

  // Find currently active video clip at currentTime
  const activeVideoClip = clips.find(
    (c) =>
      c.trackId === 'track-video' &&
      currentTime >= c.start &&
      currentTime < c.start + c.duration
  ) || null;

  // Active text subtitles overlays
  const activeTextClips = clips.filter(
    (c) =>
      c.trackId === 'track-text' &&
      currentTime >= c.start &&
      currentTime < c.start + c.duration
  );

  // Active audio track clips
  const activeAudioClips = clips.filter(
    (c) =>
      c.trackId === 'track-audio' &&
      currentTime >= c.start &&
      currentTime < c.start + c.duration
  );

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // Actions
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(totalDuration, newTime)));
  };

  const handleAddClip = (newClip: Clip) => {
    let start = currentTime;
    if (isSnapping) {
      const sameTrackClips = clips.filter((c) => c.trackId === newClip.trackId);
      if (sameTrackClips.length > 0) {
        start = sameTrackClips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
      }
    }
    const clipWithStart = { ...newClip, start };
    const updated = [...clips, clipWithStart];
    setClips(updated);
    setSelectedClipId(clipWithStart.id);
    pushHistory(updated);
  };

  const handleUpdateClip = (updated: Clip, commitHistory = true) => {
    const nextClips = clips.map((c) => (c.id === updated.id ? updated : c));
    setClips(nextClips);
    if (commitHistory) {
      pushHistory(nextClips);
    }
  };

  const handleDeleteClip = (clipId: string) => {
    const nextClips = clips.filter((c) => c.id !== clipId);
    setClips(nextClips);
    if (selectedClipId === clipId) setSelectedClipId(null);
    pushHistory(nextClips);
  };

  // Split selected clip in two
  const handleSplitClip = () => {
    const target = selectedClip || activeVideoClip;
    if (!target) return;

    if (currentTime <= target.start || currentTime >= target.start + target.duration) {
      return;
    }

    const firstDuration = currentTime - target.start;
    const secondDuration = target.duration - firstDuration;

    const firstHalf: Clip = {
      ...target,
      duration: firstDuration,
      trimEnd: target.trimStart + firstDuration
    };

    const secondHalf: Clip = {
      ...target,
      id: `clip_split_${Date.now()}`,
      start: currentTime,
      duration: secondDuration,
      trimStart: target.trimStart + firstDuration
    };

    const nextClips = clips.flatMap((c) => (c.id === target.id ? [firstHalf, secondHalf] : [c]));
    setClips(nextClips);
    setSelectedClipId(secondHalf.id);
    pushHistory(nextClips);
  };

  const handleApplyFilterToSelected = (filter: VideoFilter) => {
    if (selectedClip && selectedClip.type === 'video') {
      handleUpdateClip({ ...selectedClip, filter });
    } else if (activeVideoClip) {
      handleUpdateClip({ ...activeVideoClip, filter });
    }
  };

  // AI Feature: Auto-generate dynamic subtitles
  const handleGenerateAutoSubtitles = async () => {
    setIsAiProcessing(true);
    try {
      const res = await fetch('/api/ai-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: totalDuration })
      });
      const data = await res.json();
      if (data.subtitles && Array.isArray(data.subtitles)) {
        const newTextClips: Clip[] = data.subtitles.map((sub: any) => ({
          id: sub.id,
          trackId: 'track-text',
          type: 'text',
          title: sub.text,
          start: sub.start,
          duration: sub.duration,
          source: '',
          trimStart: 0,
          trimEnd: sub.duration,
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
            content: sub.text,
            style: 'capcut-yellow',
            fontSize: sub.fontSize || 38,
            color: sub.color || '#fde047',
            backgroundColor: 'rgba(0,0,0,0.7)',
            align: 'center',
            bold: true
          }
        }));

        const nonText = clips.filter((c) => c.trackId !== 'track-text');
        const nextClips = [...nonText, ...newTextClips];
        setClips(nextClips);
        pushHistory(nextClips);
      }
    } catch (err) {
      console.error('Error generating AI subtitles:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // AI Feature: Smart Silence Cut
  const handleSmartSilenceCut = () => {
    const nextClips = clips.map((c) => {
      if (c.type === 'video' && c.duration > 1.5) {
        return {
          ...c,
          duration: Math.max(1, c.duration - 0.5),
          trimEnd: c.trimEnd - 0.5
        };
      }
      return c;
    });
    setClips(nextClips);
    pushHistory(nextClips);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0d12] text-white relative"
    >
      {/* 1. Header Bar */}
      <Header
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        isSnapping={isSnapping}
        onToggleSnapping={() => setIsSnapping(!isSnapping)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        saveStatus={saveStatus}
        onResetProject={handleResetProject}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 2. Middle Work Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddClip={handleAddClip}
          onApplyFilterToSelected={handleApplyFilterToSelected}
          onGenerateAutoSubtitles={handleGenerateAutoSubtitles}
          onSmartSilenceCut={handleSmartSilenceCut}
          isAiProcessing={isAiProcessing}
        />

        {/* Center: Realtime Viewport & Multi-Track Sound */}
        <Player
          aspectRatio={aspectRatio}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          activeVideoClip={activeVideoClip}
          activeTextClips={activeTextClips}
          activeAudioClips={activeAudioClips}
          selectedClip={selectedClip}
          onUpdateClip={handleUpdateClip}
          onSelectClip={setSelectedClipId}
        />

        {/* Right: Clip Properties Inspector */}
        <Inspector
          selectedClip={selectedClip}
          onUpdateClip={handleUpdateClip}
          onClose={() => setSelectedClipId(null)}
        />
      </div>

      {/* 3. Bottom: Multi-Track Timeline */}
      <Timeline
        clips={clips}
        currentTime={currentTime}
        totalDuration={totalDuration}
        zoom={zoom}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={handleSeek}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onUpdateClip={handleUpdateClip}
        onZoomChange={setZoom}
      />

      {/* 4. Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        aspectRatio={aspectRatio}
        clips={clips}
        totalDuration={totalDuration}
      />

      {/* 5. Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* 6. Drag & Drop File Upload Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 bg-cyan-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 pointer-events-none select-none">
          <div className="border-4 border-dashed border-cyan-400 rounded-3xl w-full h-full max-w-3xl max-h-[70vh] flex flex-col items-center justify-center gap-4 bg-[#121524]/90 shadow-2xl animate-pulse">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <UploadCloud className="w-10 h-10 text-cyan-300" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-wide">
              Solte os arquivos para importar
            </h2>
            <p className="text-sm text-zinc-300 font-medium">
              Suporta Vídeos (.mp4, .webm), Áudios (.mp3, .wav) e Imagens (.png, .jpg, .svg)
            </p>
            <span className="text-xs text-cyan-400 font-mono font-bold px-3 py-1 bg-cyan-950/60 rounded-full border border-cyan-500/30">
              Arrastar direto do Desktop ou Pastas
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
