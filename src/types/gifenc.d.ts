declare module 'gifenc' {
  export interface GIFEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface GIFFrameOptions {
    palette?: number[][];
    delay?: number;
    dispose?: number;
    transparent?: boolean;
    transparentIndex?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame: (indexData: Uint8Array, width: number, height: number, options?: GIFFrameOptions) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    reset: () => void;
  }

  export function GIFEncoder(options?: GIFEncoderOptions): GIFEncoderInstance;

  export function quantize(
    rgbaData: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: { format?: string; clearAlpha?: boolean }
  ): number[][];

  export function applyPalette(
    rgbaData: Uint8ClampedArray | Uint8Array,
    palette: number[][],
    format?: string
  ): Uint8Array;
}
