import { describe, expect, it } from 'vitest';
import { normalizeConfig } from './config';

const validCondition = {
  source: { kind: 'signal', key: 'emergency' },
  operator: 'equals',
  value: true,
  behavior: 'pulse',
  autoHideSeconds: 15,
} as const;

describe('normalizeConfig visibility conditions', () => {
  it('preserves and round-trips a valid condition', () => {
    const normalized = normalizeConfig({
      layout: [{
        id: 'alert-1',
        type: 'notice',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        visibilityCondition: validCondition,
      }],
    });

    expect(normalized.layout[0]?.visibilityCondition).toEqual(validCondition);
    expect(normalizeConfig(normalized)).toEqual(normalized);
  });

  it('strips a malformed condition', () => {
    const normalized = normalizeConfig({
      layout: [{
        id: 'alert-1',
        type: 'notice',
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        visibilityCondition: {
          source: { kind: 'signal', key: 'spaces are invalid' },
          operator: 'equals',
          value: true,
          behavior: 'while-matched',
        },
      }],
    });

    expect(normalized.layout[0]?.visibilityCondition).toBeUndefined();
  });
});

describe('normalizeConfig z-index layers', () => {
  it('preserves finite values, truncates fractions, and falls back to array order', () => {
    const normalized = normalizeConfig({
      layout: [
        { id: 'back', type: 'clock', x: 0, y: 0, w: 2, h: 1, zIndex: -2 },
        { id: 'front', type: 'clock', x: 0, y: 0, w: 2, h: 1, zIndex: 7.9 },
        { id: 'legacy', type: 'clock', x: 0, y: 0, w: 2, h: 1 },
        { id: 'invalid', type: 'clock', x: 0, y: 0, w: 2, h: 1, zIndex: Number.NaN },
      ],
    });

    expect(normalized.layout.map((widget) => widget.zIndex)).toEqual([
      -2,
      7,
      2,
      3,
    ]);
  });

  it('round-trips normalized layer values', () => {
    const normalized = normalizeConfig({
      layout: [
        { id: 'back', type: 'clock', x: 0, y: 0, w: 2, h: 1, zIndex: 0 },
        { id: 'front', type: 'clock', x: 0, y: 0, w: 2, h: 1, zIndex: 4 },
      ],
    });

    expect(normalizeConfig(normalized)).toEqual(normalized);
  });
});
