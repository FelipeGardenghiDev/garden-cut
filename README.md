# GardenCut 🌿✂️

> Editor de vídeos moderno estilo CapCut para PC, 100% gratuito, com áudio multi-trilha real, aceleração por hardware via FFmpeg e preparado para Rust/Tauri.

---

## 🚀 Funcionalidades do MVP

* **Interface Dark Moderna (Estilo CapCut):**
  * Alternador de Proporção: **16:9** (Widescreen/YouTube), **9:16** (TikTok, Reels, Shorts), **1:1** (Instagram).
  * Timeline Magnética com alinhamento inteligente.
  * Undo / Redo (`Ctrl+Z` / `Ctrl+Y`).
* **Sistema de Áudio Real & Multi-Trilhas (Web Audio Synthesizer):**
  * **Trilha Lo-Fi Beat**: Sintetizador musical lo-fi embutido (bateria, acordes de teclado, linha de baixo).
  * **Efeitos Sonoros Reais (SFX)**: *Whoosh*, *Ding de Sucesso*, *Pop Click*, *Bass Drop 808*.
  * **Clipes com Som Embutido**: Vídeos gerados e importados reproduzem som estéreo sincronizado.
* **Player em Tempo Real com Multi-Camadas:**
  * Renderização de vídeo com transformações ao vivo: **Escala/Zoom**, **Posição**, **Rotação**, **Opacidade**.
  * Filtros de Cor: *Cinematográfico*, *Vibrante*, *Cyberpunk*, *Vintage*, *Preto & Branco* e *Blur*.
  * Timecode milimétrico (`MM:SS:FF`) e controles ágeis de reprodução (Espaço para Play/Pause).
* **Timeline Não-Linear Multi-Trilhas:**
  * **Trilha de Legendas & Texto**: Overlays dinâmicos posicionáveis.
  * **Trilha de Vídeo Principal**: Clipes com miniaturas, corte e redimensionamento.
  * **Trilha de Áudio & SFX**: Músicas e efeitos sonoros com volume individual e sincronização ao vivo.
  * Ferramenta de **Corte / Split (`Ctrl + B`)** no ponto exato da agulha (*playhead*).
  * Slider de Zoom contínuo na régua de tempo.
* **Ferramentas Inteligentes de IA (GardenCut AI):**
  * **Auto-Legendas**: Geração instantânea de legendas dinâmicas em amarelo vibrante estilo Shorts/Reels.
  * **Corte Inteligente de Silêncio**: Remoção automática de respirações e pausas sem áudio.
* **Motor de Renderização Duplo:**
  * **FFmpeg 8.1 Nativo**: Exporta arquivos `.mp4` reais com aceleração por GPU (NVENC/AMF) salvos na pasta `/exports`.
  * **Web MediaRecorder**: Exportação direta no navegador com download imediato.

---

## 🛠️ Stack Tecnológica

* **Interface:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide Icons.
* **Motor de Áudio:** Web Audio API (OfflineAudioContext + Real-time Gain/AudioNodes).
* **Motor de Mídia:** FFmpeg 8.1 (Local no Windows via Node child_process bridge).
* **Desktop Nativo:** Configurado para **Rust + Tauri 2.0** (`src-tauri`).

---

## 💻 Como Rodar

```bash
cd garden-cut
npm run dev
```

Abra no navegador em: **`http://localhost:5173/`**

### 📦 Compilar como App Desktop Nativo (.exe com Rust / Tauri)

Quando o *Microsoft C++ Build Tools* estiver instalado no Windows:
```bash
npm run tauri dev
```
ou para gerar o instalador `.exe`:
```bash
npm run tauri build
```

---

## ⌨️ Atalhos do Teclado

| Tecla | Ação |
| :--- | :--- |
| **Barra de Espaço** | Play / Pause |
| **Ctrl + B** | Dividir / Cortar clipe na agulha (*Split*) |
| **Delete / Backspace** | Excluir clipe selecionado |
| **J / L** | Voltar 1s / Avançar 1s |
| **Ctrl + Z / Ctrl + Y** | Desfazer / Refazer |
