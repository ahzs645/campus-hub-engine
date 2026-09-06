import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OptionsPreview,
  registerWidget,
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

afterEach(cleanup);

describe('WidgetLivePreview', () => {
  it('renders the real widget from the live form data', () => {
    render(<WidgetLivePreview widgetType="preview-plain" data={{ label: 'hello' }} />);

    expect(screen.getByText(/label is hello/)).toBeInTheDocument();
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
    expect(screen.getAllByText('Preview')).toHaveLength(1);
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
