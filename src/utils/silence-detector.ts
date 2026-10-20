/**
 * Intelligent Silence Detection & Automatic Jump-Cut Engine
 * Varre o fluxo PCM de áudio calculando a energia RMS em janelas móveis
 * e aplica histerese (threshold em dB, duração mínima e margem de segurança de fala)
 * para gerar cortes automáticos sem destruir o fluxo natural da voz.
 */

import { Clip } from '../types/editor';

export interface SilenceDetectorOptions {
  thresholdDb?: number; // Limiar de silêncio em dB (ex: -35dB a -25dB, default: -30dB)
  minSilenceDurationSec?: number; // Duração mínima para considerar silêncio (ex: 0.35s)
  speechPaddingSec?: number; // Margem de segurança antes e depois da voz (ex: 0.08s)
  windowSizeSec?: number; // Tamanho do frame de análise RMS (ex: 0.025s = 25ms)
}

export interface AudioTimeInterval {
  start: number; // Segundos no áudio original
  end: number;   // Segundos no áudio original
}

/**
 * Converte valor linear de amplitude (0 a 1) para Decibéis (dBFS)
 */
export function linearToDb(linear: number): number {
  if (linear <= 0.00001) return -100;
  return 20 * Math.log10(linear);
}

/**
 * Calcula a Root Mean Square (RMS) de um bloco de amostras PCM
 */
export function calculateWindowRMS(samples: Float32Array, startIdx: number, length: number): number {
  let sum = 0;
  const end = Math.min(samples.length, startIdx + length);
  const actualLength = end - startIdx;
  if (actualLength <= 0) return 0;

  for (let i = startIdx; i < end; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / actualLength);
}

/**
 * Detecta todos os intervalos de silêncio em uma trilha de áudio PCM
 */
export function detectSilenceIntervals(
  pcmData: Float32Array,
  sampleRate = 44100,
  options: SilenceDetectorOptions = {}
): AudioTimeInterval[] {
  const thresholdDb = options.thresholdDb ?? -32;
  const minDuration = options.minSilenceDurationSec ?? 0.35;
  const windowSec = options.windowSizeSec ?? 0.025;

  const windowSamples = Math.max(1, Math.round(windowSec * sampleRate));
  const totalSamples = pcmData.length;
  const totalDuration = totalSamples / sampleRate;

  const silenceIntervals: AudioTimeInterval[] = [];
  let inSilence = false;
  let silenceStartSec = 0;

  for (let idx = 0; idx < totalSamples; idx += windowSamples) {
    const rms = calculateWindowRMS(pcmData, idx, windowSamples);
    const db = linearToDb(rms);
    const currentTime = idx / sampleRate;

    const isCurrentSilent = db < thresholdDb;

    if (isCurrentSilent && !inSilence) {
      inSilence = true;
      silenceStartSec = currentTime;
    } else if (!isCurrentSilent && inSilence) {
      inSilence = false;
      const duration = currentTime - silenceStartSec;
      if (duration >= minDuration) {
        silenceIntervals.push({
          start: Number(silenceStartSec.toFixed(3)),
          end: Number(currentTime.toFixed(3))
        });
      }
    }
  }

  // Se terminou o áudio em silêncio
  if (inSilence) {
    const duration = totalDuration - silenceStartSec;
    if (duration >= minDuration) {
      silenceIntervals.push({
        start: Number(silenceStartSec.toFixed(3)),
        end: Number(totalDuration.toFixed(3))
      });
    }
  }

  return silenceIntervals;
}

/**
 * Inverte os intervalos de silêncio gerando os trechos com fala ativa (Speech/Voice Intervals)
 * aplicando margens de padding nas pontas para não cortar respirações nem consoantes oclusivas.
 */
export function computeActiveSpeechIntervals(
  silenceIntervals: AudioTimeInterval[],
  totalDuration: number,
  paddingSec = 0.08
): AudioTimeInterval[] {
  if (silenceIntervals.length === 0) {
    return [{ start: 0, end: totalDuration }];
  }

  const speech: AudioTimeInterval[] = [];
  let lastEnd = 0;

  for (const silence of silenceIntervals) {
    const segStart = lastEnd === 0 ? 0 : Math.max(0, lastEnd - paddingSec);
    const segEnd = Math.min(totalDuration, silence.start + paddingSec);

    if (segEnd > segStart + 0.05) {
      speech.push({
        start: Number(segStart.toFixed(3)),
        end: Number(segEnd.toFixed(3))
      });
    }

    lastEnd = silence.end;
  }

  // Segmento final após o último silêncio
  if (lastEnd < totalDuration - 0.05) {
    const finalStart = Math.max(0, lastEnd - paddingSec);
    speech.push({
      start: Number(finalStart.toFixed(3)),
      end: Number(totalDuration.toFixed(3))
    });
  }

  return speech;
}

/**
 * Pega um clipe existente e gera uma sequência de subclipes com jump-cuts automáticos
 */
export function generateAutoJumpCutClips(
  originalClip: Clip,
  pcmData: Float32Array,
  sampleRate = 44100,
  options: SilenceDetectorOptions = {}
): Clip[] {
  const silences = detectSilenceIntervals(pcmData, sampleRate, options);
  const totalClipDuration = originalClip.duration;
  const padding = options.speechPaddingSec ?? 0.08;
  const activeSegments = computeActiveSpeechIntervals(silences, totalClipDuration, padding);

  if (activeSegments.length === 0) {
    return [originalClip];
  }

  let timelineCursor = originalClip.start;

  return activeSegments.map((seg, idx) => {
    const duration = Math.max(0.1, Number((seg.end - seg.start).toFixed(3)));
    const newClip: Clip = {
      ...originalClip,
      id: `${originalClip.id}_cut_${idx + 1}`,
      title: `${originalClip.title} [Parte ${idx + 1}]`,
      start: Number(timelineCursor.toFixed(3)),
      duration,
      trimStart: originalClip.trimStart + seg.start,
      trimEnd: originalClip.trimStart + seg.end
    };

    timelineCursor += duration;
    return newClip;
  });
}
