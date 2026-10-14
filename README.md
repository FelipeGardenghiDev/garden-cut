# GardenCut 🌿✂️

[![CI - Quality Gate](https://github.com/FelipeGardenghiDev/garden-cut/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeGardenghiDev/garden-cut/actions/workflows/ci.yml)
[![Part of GC Studio](https://img.shields.io/badge/Part%20of-GC%20Studio%20%2F%20Garden%20Apps-06B6D4?style=flat&logo=buffer)](https://github.com/FelipeGardenghiDev/projeto-homestudio)
![Tests](https://img.shields.io/badge/Vitest-36%20passed-emerald?style=flat&logo=vitest)
![PWA](https://img.shields.io/badge/PWA-Installable%20%26%20Offline-blueviolet?style=flat)
![Linter](https://img.shields.io/badge/Oxlint-0%20warnings-cyan?style=flat)
![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178c6?style=flat&logo=typescript)

> Editor de vídeos não-linear moderno e de alta performance web-first, com gravador nativo de tela/câmera, equalizador DSP em tempo real, transições visuais, overlays PIP com Gizmo, keyframes de animação, exportador de GIF animado e PWA offline.

> 📄 **Planejamento de Engenharia:** Consulte o [Roadmap Estratégico de Evolução (Pós-V1)](ROADMAP.md).

---

## 🏗️ Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph UI ["Camada de Interface (React 19 + Tailwind CSS)"]
        Header["Header (Proporções, Snapping, Status Salvo, Guia Atalhos, Undo/Redo)"]
        Sidebar["Sidebar (Mídia, Textos, Stickers/Logos, SFX, IA)"]
        PlayerView["Player Viewport (Gizmo Interativo, Tela Cheia, Filtros, Fades)"]
        TimelineView["Timeline Magnética (Waveforms Visuais, Régua, Fades, Splitting)"]
        InspectorView["Inspector (Transformações, Posição X/Y, Filtros, Fades)"]
        ShortcutsModal["Modal de Atalhos de Teclado (Tecla ?)"]
    end

    subgraph Core ["Motor de Negócio & Utilidades"]
        TimelineMath["Timeline Math (Snapping, Splitting, Fade Transitions, Timecode)"]
        AudioEngine["Web Audio Synthesizer (Lo-Fi, SFX, PCM WAV)"]
        WaveformGen["Waveform Generator (Peak Extraction & Normalization)"]
        ProjectStorage["IndexedDB Storage (Blob Serialization & Auto-Save)"]
        MediaGen["Procedural Media Generator"]
    end

    subgraph ExportEngines ["Motores de Exportação"]
        WebExporter["Client-Side Web Exporter (Canvas Capture + MediaRecorder + Imagens/Vídeo/Áudio)"]
        FFmpegEngine["Local FFmpeg Engine (GPU Acceleration NVENC/AMF)"]
    end

    UI --> Core
    Core --> WebExporter
    Core --> FFmpegEngine
    WebExporter --> DirectDownload["Download Direto (.webm)"]
    FFmpegEngine --> DiskExport["Arquivo em Disco (.mp4)"]
```

---

## 🚀 Funcionalidades Principais

* **Gravador de Tela & Câmera Integrado (`ScreenRecorderModal.tsx`):**
  * Gravação de tela inteira, janelas de aplicativos ou webcam com microfone diretamente no navegador via `getDisplayMedia` e `getUserMedia`.
  * Visualização prévia da gravação, contador de segundos em tempo real e adição instantânea à timeline.
* **Equalizador DSP de Áudio em Tempo Real & Analisador de Espectro:**
  * Presets sonoros instantâneos com filtros biquad: *Normal*, *Bass Boost 808* (+10dB em frequências graves), *Vocal Presence* (destaque de voz humana) e *Lo-Fi Vintage* (filtro passa-faixa com saturação suave).
  * Espectro animado de frequências reativo ao áudio reproduzido no player.
* **Transições Visuais Cinematográficas:**
  * Efeitos matemáticos frame a frame configuráveis no Inspector: *Cross-Dissolve*, *Slide Left*, *Fade to Black* e *Flash White*, renderizados no player e na exportação.
* **Picture-in-Picture & Trilha Overlay (`track-overlay`):**
  * Trilha dedicada para sobreposições de vídeo, reações e gameplays.
  * Manipulação direta pelo Gizmo no canvas com redimensionamento e reposicionamento livre.
* **Keyframes Temporais Paramétricos:**
  * Animação contínua com interpolação linear (Lerp) de Escala, Posição X/Y, Rotação e Opacidade ao longo do clipe.
  * Marcadores visuais em diamante (`◆`) na timeline indicando a presença de keyframes.
* **Exportador de GIF Animado Client-Side (`gifenc`):**
  * Renderização de animações leves para redes sociais com quantização de paleta para 256 cores, delay de frames preciso e download de arquivo `.gif`.
* **PWA & Funcionamento 100% Offline:**
  * Manifesto de aplicativo web (`manifest.webmanifest`) configurado para instalação nativa no desktop e mobile, operando sem dependência de internet.
* **Drag & Drop Nativo do Sistema Operacional (OS):**
  * Arraste arquivos de vídeo (`.mp4`, `.webm`), áudio (`.mp3`, `.wav`) e imagens (`.png`, `.jpg`, `.svg`) direto do seu desktop ou explorador de arquivos para a janela do editor.
  * Overlay visual dinâmico com drop-zone animada e processamento automático de waveforms para faixas de áudio.
* **Manipulação Direta no Canvas (*Bounding Box / Gizmo Interativo*):**
  * Selecione qualquer clipe (vídeo, imagem ou texto) para interagir diretamente no player.
  * Mova livremente elementos pela tela arrastando o corpo do gizmo (atualização contínua de `posX` e `posY`).
  * 4 alças de canto interativas para redimensionamento de escala (*Zoom*) milimétrico direto no canvas.
* **Modo Tela Cheia & Guia Completo de Atalhos (`?`):**
  * Alternância instantânea para modo **Tela Cheia** via botão no player ou tecla de atalho **`F`**.
  * Modal interativo com todos os atalhos de teclado categorizados acessível pelo botão de ajuda no Header ou pressionando a tecla **`?`** a qualquer momento.
* **Camada de Imagens, Logos & Stickers Visuais (`image`):**
  * Suporte nativo a clipes do tipo imagem (PNG, JPG, SVG, WebP) com biblioteca de adesivos rápidos (*Logo GardenCut*, *Selo Ao Vivo*, *Inscreva-se*, *Verificado*).
  * Transformações visuais completas (escala, rotação, opacidade, posição X/Y), filtros de cor e fades de entrada/saída.
  * Renderização e pré-carregamento sincronizado na exportação WebM via Canvas.
* **Persistência Local Completa (IndexedDB):**
  * Salvamento automático com debounce contínuo (`800ms`) diretamente no IndexedDB do navegador.
  * Serialização e restauração binária de mídias Blob: ao recarregar a página (`F5`), seu projeto continua intacto.
  * Indicador de salvamento em tempo real no Header (*"Salvo"* / *"Salvando..."*) e opção de *"Novo Projeto"*.
* **Formas de Onda de Áudio Visuais (*Audio Waveforms*):**
  * Renderização de picos de amplitude sonora (*waveforms*) ao longo dos clipes na timeline no estilo Premiere/CapCut.
  * Extração analítica de picos de `AudioBuffer` decodificados e geração procedural de picos para beats e SFX.
* **Transições Suaves de Fade In & Fade Out:**
  * Controles dedicados no painel Inspector para configurar Fade In e Fade Out (0s a 3s) com presets rápidos.
  * Marcadores triangulares visuais (`◢` e `◣`) nos cantos superiores dos clipes na timeline.
  * Interpolação suave aplicada em tempo real na opacidade de vídeo, volume de áudio e overlays de legendas (tanto no player quanto na exportação final).
* **Interface Dark Moderna & Responsiva:**
  * Proporções de aspecto dinâmicas: **16:9** (YouTube), **9:16** (TikTok, Reels, Shorts), **1:1** (Instagram).
  * Timeline Magnética com atração inteligente por snapping e guias visuais.
  * Histórico completo de Undo / Redo (`Ctrl+Z` / `Ctrl+Y`).
* **Síntese de Áudio Procedural (Web Audio API):**
  * **Trilha Lo-Fi Beat**: Sintetizador procedural embutido com acordes (Fmaj7, Em7, Dm7, Cmaj7), bateria e baixo.
  * **Efeitos Sonoros Reais (SFX)**: *Whoosh*, *Ding de Sucesso*, *Pop Click*, *Bass Drop 808*.
  * Conversão de `AudioBuffer` em PCM 16-bit WAV válido via DataView.
* **Exportação Múltipla com Download Real no Navegador:**
  * **Web MediaRecorder (Client-Side)**: Grava diretamente os frames renderizados e áudio no cliente, gerando arquivos WebM/MP4 para download imediato sem precisar de nenhum servidor Node ou FFmpeg.
  * **GIF Animado em 256 Cores**: Exportação direta otimizada para loops e redes sociais via `gifenc`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Framework UI** | React 19 + TypeScript + Vite 8 |
| **Estilização** | Tailwind CSS v4 |
| **Interatividade** | Direct Canvas Gizmo (Bounding Box) + Drag & Drop Nativo |
| **Persistência** | IndexedDB Nativo (`GardenCut_DB`) com serialização de Blobs |
| **Áudio & Waveforms** | Web Audio API + OfflineAudioContext + Peak Analysis |
| **Renderização Web** | HTML5 Canvas + MediaRecorder API (`video/webm;codecs=vp9,opus`) |
| **Desktop Nativo** | Rust + Tauri 2.0 (`src-tauri`) |
| **Exportação GIF** | `gifenc` (Quantização 256 cores client-side) |
| **PWA & Offline** | Web App Manifest + Service Worker Ready |
| **Testes Unitários** | Vitest (36 testes passando com 100% de precisão) |
| **Linter & Qualidade** | Oxlint (0 avisos, 0 erros em 24 arquivos) |
| **CI/CD** | GitHub Actions Pipeline automatizada |

---

## 🧪 Testes Automatizados & Qualidade de Código

O projeto conta com suíte de testes unitários automatizados validando toda a matemática de corte, snapping, timecode e encoding binário WAV:

```bash
# Rodar todos os testes unitários com Vitest
npm run test

# Rodar testes em modo watch interativo
npm run test:watch

# Rodar análise estática com Oxlint
npm run lint

# Checagem de tipagem estrita com TypeScript
npx tsc -b --noEmit

# Compilação do bundle de produção
npm run build
```

---

## 💻 Como Rodar Localmente

```bash
# 1. Clonar repositório
git clone https://github.com/FelipeGardenghiDev/garden-cut.git
cd garden-cut

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

Abra no navegador em: **`http://localhost:5173/`**

### 📦 Compilar como App Desktop Nativo (.exe com Rust / Tauri)

```bash
# Executar em modo desenvolvimento nativo
npm run tauri dev

# Gerar instalador desktop (.exe / .msi)
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
