import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VisibilitySignal } from '@firstform/campus-hub-widget-sdk';
import type { WidgetConfig } from './config';
import { useWidgetVisibility } from './widget-visibility';

const whileMatchedWidget: WidgetConfig = {
  id: 'while',
  type: 'notice',
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  visibilityCondition: {
    source: { kind: 'signal', key: 'emergency' },
    operator: 'equals',
    value: true,
    behavior: 'while-matched',
  },
};

const pulseWidget: WidgetConfig = {
  ...whileMatchedWidget,
  id: 'pulse',
  visibilityCondition: {
    ...whileMatchedWidget.visibilityCondition!,
    behavior: 'pulse',
    autoHideSeconds: 5,
  },
};

function signal(
  value: boolean,
  revision = 'revision-1',
  expiresAt?: number,
): VisibilitySignal {
  return {
    key: 'emergency',
    value,
    revision,
    updatedAt: Date.now(),
    expiresAt,
  };
}

describe('useWidgetVisibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an initial match and hides a missing live signal', () => {
    const matching = renderHook(() =>
      useWidgetVisibility([whileMatchedWidget], [signal(true)]),
    );
    expect(matching.result.current.get('while')).toBe(true);

    const missing = renderHook(() =>
      useWidgetVisibility([whileMatchedWidget], []),
    );
    expect(missing.result.current.get('while')).toBe(false);
  });

  it('triggers a pulse on a rising edge', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useWidgetVisibility([pulseWidget], [signal(value)]),
      { initialProps: { value: false } },
    );
    expect(result.current.get('pulse')).toBe(false);

    rerender({ value: true });
    expect(result.current.get('pulse')).toBe(true);
  });

  it('auto-hides and resets the timer for a new matching revision', () => {
    const { result, rerender } = renderHook(
      ({ revision }) =>
        useWidgetVisibility([pulseWidget], [signal(true, revision)]),
      { initialProps: { revision: 'revision-1' } },
    );
    expect(result.current.get('pulse')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    rerender({ revision: 'revision-2' });
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current.get('pulse')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.get('pulse')).toBe(false);
  });

  it('treats an expired signal as missing and rechecks at its deadline', () => {
    const now = Date.now();
    const { result } = renderHook(() =>
      useWidgetVisibility(
        [whileMatchedWidget],
        [signal(true, 'revision-1', now + 1_000)],
      ),
    );
    expect(result.current.get('while')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.get('while')).toBe(false);
  });

  it('cleans up pulse and expiration timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const now = Date.now();
    const { unmount } = renderHook(() =>
      useWidgetVisibility(
        [pulseWidget],
        [signal(true, 'revision-1', now + 20_000)],
      ),
    );

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    clearTimeoutSpy.mockRestore();
  });
});
