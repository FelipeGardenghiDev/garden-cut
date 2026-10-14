import React, { useEffect } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    {
      title: 'Reprodução & Navegação',
      items: [
        { key: 'Espaço', desc: 'Iniciar ou Pausar a reprodução do vídeo' },
        { key: 'J', desc: 'Voltar 1 segundo na agulha' },
        { key: 'L', desc: 'Avançar 1 segundo na agulha' },
        { key: 'Home', desc: 'Retornar ao início da timeline (00:00:00)' },
      ]
    },
    {
      title: 'Edição & Timeline',
      items: [
        { key: 'Ctrl + B', desc: 'Dividir / Cortar clipe na posição da agulha (Split)' },
        { key: 'Delete / Backspace', desc: 'Excluir o clipe selecionado na timeline' },
        { key: 'Arrastar Bordas', desc: 'Cortar início (Trim Start) ou final (Trim End)' },
        { key: 'Arrastar Clipe', desc: 'Mover posição na timeline com alinhamento magnético' },
      ]
    },
    {
      title: 'Visualização & Histórico',
      items: [
        { key: 'F', desc: 'Alternar modo Tela Cheia no player' },
        { key: 'Ctrl + Z', desc: 'Desfazer a última ação (Undo)' },
        { key: 'Ctrl + Y', desc: 'Refazer a última ação desfeita (Redo)' },
        { key: '?', desc: 'Abrir este guia de atalhos rápidos' },
      ]
    },
    {
      title: 'Interatividade no Player',
      items: [
        { key: 'Arrastar no Player', desc: 'Reposicionar texto ou vídeo livremente na tela' },
        { key: 'Alças dos Cantos', desc: 'Redimensionar escala (Zoom) diretamente no canvas' },
        { key: 'Soltar Arquivos', desc: 'Arrastar vídeos, áudios e imagens direto do computador' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#181922] border border-[#2d3042] rounded-2xl shadow-2xl overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="h-14 border-b border-[#262835] px-6 flex items-center justify-between bg-[#14151c]">
          <div className="flex items-center gap-2.5 font-bold text-white text-base">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <span>Guia de Atalhos do Teclado</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
          {categories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-2.5">
              <h4 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5" />
                <span>{cat.title}</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-2.5 rounded-xl bg-[#14151e] border border-[#262838] flex items-center justify-between gap-3"
                  >
                    <span className="text-zinc-300 font-medium">{item.desc}</span>
                    <kbd className="px-2 py-1 rounded bg-[#202230] border border-[#34384e] font-mono text-[11px] text-cyan-300 font-semibold shadow-inner shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-[#262835] px-6 flex items-center justify-between bg-[#14151c] text-zinc-500 text-xs">
          <span>💡 Dica: Você pode pressionar <kbd className="text-cyan-400 font-mono">?</kbd> a qualquer momento no editor.</span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs cursor-pointer shadow-md transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
