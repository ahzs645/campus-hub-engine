import type { ComponentType } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Props the mocked registry hands to a widget. */
type StubProps = Record<string, unknown>;
type Loader = () => Promise<{ default: ComponentType<StubProps> }>;

// vi.mock factories are hoisted above imports, so anything they close over has
// to be hoisted too.
const { registry, loadCounts } = vi.hoisted(() => ({
  registry: new Map<string, Loader>(),
  loadCounts: new Map<string, number>(),
}));

// Mocked so the test drives widget resolution directly, and so importing this
// module does not pull the whole widget SDK into the test.
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
    preloadDisplayWidgetComponent: () => {},
  };
});

import WidgetRenderer from './WidgetRenderer';

const theme = { primary: '#122738', accent: '#f85c14', background: '#0a1620' };

function Live() {
  return <div data-testid="live-widget">live</div>;
}

// The mock caches its lazy wrapper per type and React.lazy caches the resolved
// module, so a type loaded once never invokes its loader again. Each test uses
// its own type so the load counts stay meaningful.
const TYPES = ['t-plain', 't-soon', 't-soon-css', 't-preview'];

beforeEach(() => {
  loadCounts.clear();
  registry.clear();
  for (const type of TYPES) {
    registry.set(type, async () => {
      loadCounts.set(type, (loadCounts.get(type) ?? 0) + 1);
      return { default: Live as unknown as ComponentType<StubProps> };
    });
  }
});

afterEach(() => {
  cleanup();
});

const widget = (type: string, overrides: Record<string, unknown> = {}) =>
  ({ id: `${type}-1`, type, x: 0, y: 0, w: 12, h: 1, props: {}, ...overrides }) as never;

describe('WidgetRenderer coming-soon handling', () => {
  it('mounts the widget normally when it is not flagged', async () => {
    render(<WidgetRenderer widget={widget('t-plain')} theme={theme} />);
    await waitFor(() => expect(screen.getByTestId('live-widget')).toBeTruthy());
    expect(loadCounts.get('t-plain')).toBe(1);
  });

  it('does not mount or lazy-load a coming-soon widget on a display', async () => {
    render(<WidgetRenderer widget={widget('t-soon', { comingSoon: true })} theme={theme} />);

    expect(screen.getByText('Coming Soon')).toBeTruthy();
    // Give any stray lazy import a chance to resolve before asserting.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByTestId('live-widget')).toBeNull();
    expect(loadCounts.get('t-soon')).toBeUndefined();
  });

  it('renders no blur or backdrop-filter for a coming-soon widget on a display', () => {
    const { container } = render(
      <WidgetRenderer widget={widget('t-soon-css', { comingSoon: true })} theme={theme} />,
    );
    expect(container.querySelector('.blur-sm')).toBeNull();
    expect(container.querySelector('.grayscale')).toBeNull();
    expect(container.querySelector('.backdrop-blur-sm')).toBeNull();
  });

  it('still mounts the real widget behind the veil in editor preview mode', async () => {
    const { container } = render(
      <WidgetRenderer
        widget={widget('t-preview', { comingSoon: true })}
        theme={theme}
        previewComingSoon
      />,
    );
    await waitFor(() => expect(screen.getByTestId('live-widget')).toBeTruthy());
    expect(loadCounts.get('t-preview')).toBe(1);
    expect(container.querySelector('.blur-sm')).toBeTruthy();
    expect(screen.getByText('Coming Soon')).toBeTruthy();
  });

  it('falls back to the unknown-widget panel for unregistered types', () => {
    render(<WidgetRenderer widget={widget('nope')} theme={theme} />);
    expect(screen.getByText('Unknown widget: nope')).toBeTruthy();
  });
});
