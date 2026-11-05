import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OptionsPreview,
  registerWidget,
  useEventsState,
  useWidgetPreview,
  type WidgetDefinition,
} from '@firstform/campus-hub-widget-sdk';
import { WidgetLivePreview } from './WidgetLivePreview';
import { WidgetEditPanel } from './WidgetEditDialog';

function register(
  type: string,
  component: WidgetDefinition['component'],
  over: Partial<WidgetDefinition> = {},
) {
  registerWidget({
    type,
    name: `Widget ${type}`,
    description: 'Test widget',
    icon: 'clock',
    minW: 1,
    minH: 1,
    defaultW: 4,
    defaultH: 3,
    component,
    ...over,
  });
}

register('preview-plain', ({ config }) => <div>label is {String(config?.label)}</div>);
register('web', () => <div>an iframe you did not want</div>);
register('preview-banner', () => <div>banner body</div>, { defaultW: 12, defaultH: 1 });
register('preview-source', ({ config }) => {
  const sample = useWidgetPreview();
  const state = useEventsState({
    apiUrl: config?.apiUrl as string | undefined,
    defaultEvents: [{ id: 'sample', title: 'Sample news' }],
  });
  return <div>{sample ? 'Sample mode' : 'Live mode'}: {state.events[0]?.title} · {String(config?.label)}</div>;
}, { acceptsSources: [{ propName: 'apiUrl', types: ['api'] }] });
register('preview-throws', () => {
  throw new Error('widget blew up');
});
register('preview-with-own', ({ config }) => <div>real {String(config?.label)}</div>, {
  OptionsComponent: () => (
    <div>
      <p>options body</p>
      <OptionsPreview>
        <span>hand-written mock-up</span>
      </OptionsPreview>
    </div>
  ),
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('WidgetLivePreview', () => {
  it('renders the real widget from the live form data', () => {
    render(<WidgetLivePreview widgetType="preview-plain" data={{ label: 'hello' }} />);

    expect(screen.getByText(/label is hello/)).toBeInTheDocument();
  });

  it('previews sample data without requesting a selected source or changing saved configuration', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const data = {
      apiUrl: 'https://example.edu/news', label: 'Large text',
      __sourceRef: { sourceId: 'news', propName: 'apiUrl' },
    };
    render(<WidgetLivePreview widgetType="preview-source" data={data} />);

    expect(screen.getByText('Sample mode: Sample news · Large text')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(data.apiUrl).toBe('https://example.edu/news');
    vi.unstubAllGlobals();
  });

  it('gives banner-shaped widgets a short stage so they render near full width', () => {
    render(<WidgetLivePreview widgetType="preview-banner" data={{}} />);

    const stage = screen.getByText('banner body').closest('.overflow-hidden') as HTMLElement;
    // 12x1 on a 16:9, 12x8 reference display is ~14:1. The 96px floor used to
    // make it render only ~450 of its ~1920 reference pixels wide.
    expect(stage.style.height).toBe('48px');
    const scaled = screen.getByText('banner body').parentElement as HTMLElement;
    expect(parseFloat(scaled.style.width)).toBeGreaterThan(250); // % of the stage
  });

  it('stands widgets that load external content down to a static card', () => {
    render(<WidgetLivePreview widgetType="web" data={{}} />);

    expect(screen.queryByText(/an iframe you did not want/)).not.toBeInTheDocument();
    expect(screen.getByText(/previewed on the canvas/)).toBeInTheDocument();
  });

  it('keeps the options form usable when the widget throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<WidgetLivePreview widgetType="preview-throws" data={{}} />);

    expect(screen.getByText(/could not render with the options above/)).toBeInTheDocument();
    warn.mockRestore();
  });

  it('renders nothing for a widget type that is not registered', () => {
    const { container } = render(<WidgetLivePreview widgetType="nope" data={{}} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('WidgetEditPanel preview', () => {
  it('previews every widget once, replacing the widget\'s own mock-up', () => {
    render(
      <WidgetEditPanel
        widgetId="w1"
        widgetType="preview-with-own"
        initialData={{ label: 'live' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('options body')).toBeInTheDocument();
    // The widget still ships an OptionsPreview; the panel's own preview wins.
    expect(screen.queryByText('hand-written mock-up')).not.toBeInTheDocument();
    expect(screen.getByText(/real live/)).toBeInTheDocument();
    expect(screen.getAllByText('Sample preview')).toHaveLength(1);
  });

  it('gives a schema-only widget a preview too', () => {
    render(
      <WidgetEditPanel
        widgetId="w2"
        widgetType="preview-plain"
        initialData={{ label: 'from schema' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/label is from schema/)).toBeInTheDocument();
  });
});

