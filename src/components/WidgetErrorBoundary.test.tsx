import type { ComponentType } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type StubProps = Record<string, unknown>;
type Loader = () => Promise<{ default: ComponentType<StubProps> }>;

const { registry, loadCounts, invalidated } = vi.hoisted(() => ({
  registry: new Map<string, Loader>(),
  loadCounts: new Map<string, number>(),
  invalidated: [] as string[],
}));

// Mirrors the real module: one cached lazy wrapper per type, dropped by
// invalidateDisplayWidgetComponent so the next render calls the loader again.
vi.mock('../lib/display-widget-components', async () => {
  const { lazy, Suspense, createElement } = await import('react');
  const cache = new Map<string, ComponentType<StubProps>>();
  return {
    DISPLAY_WIDGET_COMPONENTS: new Proxy({} as Record<string, ComponentType<StubProps>>, {
      get(_target, type: string) {
        const loader = registry.get(type);
        if (!loader) return undefined;
        if (!cache.has(type)) {
          const Lazy = lazy(loader);
          cache.set(type, (props: StubProps) =>
            createElement(Suspense, { fallback: null }, createElement(Lazy, props)));
        }
        return cache.get(type);
      },
    }),
    invalidateDisplayWidgetComponent: (type: string) => {
      invalidated.push(type);
      cache.delete(type);
    },
    preloadDisplayWidgetComponent: () => {},
  };
});

import WidgetRenderer from './WidgetRenderer';

const theme = { primary: '#122738', accent: '#f85c14', background: '#0a1620' };

const widget = (type: string, overrides: Record<string, unknown> = {}) =>
  ({ id: `${type}-1`, type, x: 0, y: 0, w: 4, h: 2, props: {}, ...overrides }) as never;

function Live({ config }: StubProps) {
  return <div data-testid="live-widget">{String((config as { label?: string })?.label ?? 'live')}</div>;
}

function Throws({ config }: StubProps) {
  if ((config as { fail?: boolean })?.fail !== false) throw new Error('boom');
  return <div data-testid="live-widget">recovered</div>;
}

beforeEach(() => {
  registry.clear();
  loadCounts.clear();
  invalidated.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('WidgetRenderer error isolation', () => {
  it('contains a widget that throws while rendering to its own tile', async () => {
    registry.set('throws-render', async () => ({ default: Throws as ComponentType<StubProps> }));
    registry.set('fine', async () => ({ default: Live as ComponentType<StubProps> }));

    render(
      <>
        <WidgetRenderer widget={widget('throws-render')} theme={theme} retryDelayMs={0} />
        <WidgetRenderer widget={widget('fine')} theme={theme} retryDelayMs={0} />
      </>,
    );

    await waitFor(() => expect(screen.getByText('Widget unavailable')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('live-widget').textContent).toBe('live'));
  });

  it('re-attempts a failed lazy chunk after the retry delay', async () => {
    let attempts = 0;
    registry.set('flaky-chunk', async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('chunk failed to load');
      return { default: Live as ComponentType<StubProps> };
    });

    render(<WidgetRenderer widget={widget('flaky-chunk')} theme={theme} retryDelayMs={20} />);

    await waitFor(() => expect(screen.getByText('Widget unavailable')).toBeTruthy());
    expect(attempts).toBe(1);

    await waitFor(() => expect(screen.getByTestId('live-widget')).toBeTruthy());
    expect(attempts).toBe(2);
    expect(invalidated).toEqual(['flaky-chunk']);
  });

  it('retries immediately when the widget props change', async () => {
    registry.set('fixable', async () => ({ default: Throws as ComponentType<StubProps> }));

    const { rerender } = render(
      <WidgetRenderer widget={widget('fixable', { props: { fail: true } })} theme={theme} retryDelayMs={0} />,
    );
    await waitFor(() => expect(screen.getByText('Widget unavailable')).toBeTruthy());

    await act(async () => {
      rerender(
        <WidgetRenderer widget={widget('fixable', { props: { fail: false } })} theme={theme} retryDelayMs={0} />,
      );
    });

    await waitFor(() => expect(screen.getByTestId('live-widget').textContent).toBe('recovered'));
  });

  it('cancels a pending retry when the widget unmounts', async () => {
    vi.useFakeTimers();
    registry.set('unmounted', async () => ({ default: Throws as ComponentType<StubProps> }));

    const { unmount } = render(
      <WidgetRenderer widget={widget('unmounted')} theme={theme} retryDelayMs={1_000} />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText('Widget unavailable')).toBeTruthy();

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(invalidated).toEqual([]);
  });
});
