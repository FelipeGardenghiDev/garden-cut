import { describe, it, expect } from 'vitest';
import { hexToRgb } from '../src/utils/visual-effects';

describe('visual-effects hexToRgb', () => {
  it('parses standard 6-char hex colors', () => {
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('parses 3-char shorthand hex colors', () => {
    expect(hexToRgb('#0f0')).toEqual([0, 255, 0]);
    expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('falls back to default green on invalid hex input', () => {
    expect(hexToRgb('invalid')).toEqual([0, 255, 0]);
  });
});
