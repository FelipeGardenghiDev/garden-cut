import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Camera, 
  Square, 
  RotateCcw, 
  Plus, 
  X,
  Video
} from 'lucide-react';
import { formatSeconds } from '../utils/timeline-math';

interface ScreenRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordComplete: (blobUrl: string, duration: number, title: string) => void;
}

export const ScreenRecorderModal: React.FC<ScreenRecorderModalProps> = ({
  isOpen,
  onClose,
  onRecordComplete
}) => {
  const [sourceType, setSourceType] = useState<'screen' | 'camera'>('screen');
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Stop active stream and timers
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Cleanup active media streams on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const handleClose = () => {
    stopStream();
    setRecordState('idle');
    setRecordingSeconds(0);
    setRecordedBlobUrl(null);
    onClose();
  };

  const handleStartCapture = async (type: 'screen' | 'camera') => {
    stopStream();
    setSourceType(type);
    setRecordedBlobUrl(null);

    try {
      let stream: MediaStream;
      if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        });
      }

      streamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        previewVideoRef.current.play().catch(() => {});
      }

      // Setup recorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setRecordState('preview');
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = null;
          previewVideoRef.current.src = url;
          previewVideoRef.current.muted = false;
        }
      };

      // Listen for browser native "Stop Sharing" button
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state === 'recording') {
          handleStopRecording();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500);

      setRecordingSeconds(0);
      setRecordState('recording');

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('User canceled or denied media permission:', err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopStream();
  };

  const handleAddToProject = () => {
    if (!recordedBlobUrl) return;
    const title = sourceType === 'screen' ? 'Gravação de Tela' : 'Gravação de Câmera';
    const duration = Math.max(1, recordingSeconds);
    onRecordComplete(recordedBlobUrl, duration, title);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#14151e] border border-[#2d3042] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-[#262835] px-6 flex items-center justify-between bg-[#121319]">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <Video className="w-5 h-5 text-rose-500" />
            <span>Gravador de Tela & Câmera</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Preview */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#2b2d3d] relative flex items-center justify-center shadow-inner">
            <video
              ref={previewVideoRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={recordState !== 'preview'}
              controls={recordState === 'preview'}
            />

            {recordState === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500 bg-[#0d0e14]/90 p-4 text-center">
                <Video className="w-12 h-12 text-zinc-600" />
                <span className="text-sm font-medium text-zinc-400">
                  Escolha uma fonte para iniciar a gravação direta no navegador
                </span>
              </div>
            )}

            {recordState === 'recording' && (
              <div className="absolute top-4 left-4 bg-rose-600/90 text-white font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                <span>REC {formatSeconds(recordingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="w-full flex items-center justify-between pt-2">
            {recordState === 'idle' && (
              <div className="flex items-center gap-3 w-full justify-center">
                <button
                  onClick={() => handleStartCapture('screen')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1e202d] hover:bg-cyan-500 hover:text-black border border-[#2d3042] text-zinc-200 font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  <Monitor className="w-4 h-4" />
                  <span>Gravar Tela / Janela</span>
                </button>
                <button
                  onClick={() => handleStartCapture('camera')}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1e202d] hover:bg-rose-500 hover:text-white border border-[#2d3042] text-zinc-200 font-bold text-xs transition-all cursor-pointer shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>Gravar Câmera & Microfone</span>
                </button>
              </div>
            )}

            {recordState === 'recording' && (
              <div className="flex items-center justify-center w-full gap-4">
                <button
                  onClick={handleStopRecording}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Finalizar Gravação ({formatSeconds(recordingSeconds)})</span>
                </button>
              </div>
            )}

            {recordState === 'preview' && (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => {
                    setRecordState('idle');
                    setRecordedBlobUrl(null);
                    setRecordingSeconds(0);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#2d3042] text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Gravar Novamente</span>
                </button>

                <button
                  onClick={handleAddToProject}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Adicionar à Timeline</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
