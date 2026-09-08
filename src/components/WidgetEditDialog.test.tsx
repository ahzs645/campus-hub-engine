import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  registerWidget,
  useNestedWidgetEditor,
  type WidgetOptionsProps,
} from '@firstform/campus-hub-widget-sdk';
import { WidgetEditPanel } from './WidgetEditDialog';

registerWidget({
  type: 'source-picker-test',
  name: 'Source picker test',
  description: 'Test widget',
  icon: 'carousel',
  minW: 1,
  minH: 1,
  defaultW: 1,
  defaultH: 1,
  component: () => null,
  OptionsComponent: () => <div>Carousel Settings</div>,
  acceptsSources: [{
    propName: 'apiUrl',
    types: ['api'],
    unlinkLabel: 'Use manual posters',
    removeSource: () => ({ dataSource: 'default' }),
  }],
});

describe('WidgetEditPanel source picker', () => {
  it('shows one consolidated source section and applies widget-specific unlink state', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <WidgetEditPanel
        widgetId="poster-1"
        widgetType="source-picker-test"
        initialData={{
          dataSource: 'unbc-news',
          __sourceRef: { sourceId: 'unbc-news', propName: 'apiUrl' },
        }}
        sources={[{
          _id: 'unbc-news',
          name: 'UNBC News Releases',
          description: 'Latest news stories with images and dates.',
          url: 'https://www.unbc.ca/our-stories/releases',
          sourceType: 'api',
        }]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Data Source')).toHaveLength(1);
    expect(screen.getByText('UNBC News Releases')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use manual posters' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    const savedData = onSave.mock.calls[0][1] as Record<string, unknown>;
    expect(savedData.dataSource).toBe('default');
    expect(savedData).not.toHaveProperty('__sourceRef');
  });

  it('fires onViewSource with the linked source id when provided', async () => {
    const user = userEvent.setup();
    const onViewSource = vi.fn();

    render(
      <WidgetEditPanel
        widgetId="poster-1"
        widgetType="source-picker-test"
        initialData={{
          __sourceRef: { sourceId: 'unbc-news', propName: 'apiUrl' },
        }}
        sources={[{
          _id: 'unbc-news',
          name: 'UNBC News Releases',
          url: 'https://www.unbc.ca/our-stories/releases',
          sourceType: 'api',
        }]}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onViewSource={onViewSource}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'View source' }));
    expect(onViewSource).toHaveBeenCalledWith('unbc-news');
  });

  it('hides the view-source affordance when the host does not provide one', () => {
    render(
      <WidgetEditPanel
        widgetId="poster-1"
        widgetType="source-picker-test"
        initialData={{
          __sourceRef: { sourceId: 'unbc-news', propName: 'apiUrl' },
        }}
        sources={[{
          _id: 'unbc-news',
          name: 'UNBC News Releases',
          url: 'https://www.unbc.ca/our-stories/releases',
          sourceType: 'api',
        }]}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'View source' })).not.toBeInTheDocument();
  });

  it('saves a common visibility condition', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <WidgetEditPanel
        widgetId="poster-1"
        widgetType="source-picker-test"
        initialData={{}}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('switch', { name: 'Conditional visibility' }));
    await user.selectOptions(screen.getByLabelText('Behavior'), 'pulse');
    await user.clear(screen.getByLabelText('Auto-hide seconds'));
    await user.type(screen.getByLabelText('Auto-hide seconds'), '10');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).toHaveBeenCalledWith(
      'poster-1',
      {},
      false,
      {
        source: { kind: 'signal', key: 'emergency' },
        operator: 'equals',
        value: true,
        behavior: 'pulse',
        autoHideSeconds: 10,
      },
    );
  });
});

// ── Nested child editor ──
// A container widget's options ask the host to drill into one child's full
// editor. The child here is schema-driven with a data-source binding, so the
// test covers both the auto-rendered form and the source picker that the
// container's own panel never had room for.
registerWidget({
  type: 'nested-child-test',
  name: 'Nested child',
  description: 'A schema-driven child widget',
  icon: 'clock',
  minW: 1,
  minH: 1,
  defaultW: 1,
  defaultH: 1,
  component: () => null,
  optionsSchema: [
    { name: 'headline', label: 'Headline', fieldType: 'string', placeholder: 'Headline text' },
  ],
  acceptsSources: [{ propName: 'feedUrl', types: ['feed'] }],
});

function ContainerOptions({ data, onChange }: WidgetOptionsProps) {
  const openNested = useNestedWidgetEditor();
  const child = (data.child as Record<string, unknown> | undefined) ?? {};
  return (
    <div>
      <div>Container Settings</div>
      <button
        type="button"
        disabled={!openNested}
        onClick={() =>
          openNested?.({
            widgetType: 'nested-child-test',
            data: child,
            context: 'Widget 1 of 1',
            onApply: (next) => onChange({ ...data, child: next }),
          })
        }
      >
        Edit child
      </button>
    </div>
  );
}

registerWidget({
  type: 'nested-container-test',
  name: 'Nested container',
  description: 'Holds one child',
  icon: 'layers',
  minW: 1,
  minH: 1,
  defaultW: 1,
  defaultH: 1,
  component: () => null,
  OptionsComponent: ContainerOptions,
});

describe('WidgetEditPanel nested child editor', () => {
  const feedSource = {
    _id: 'campus-feed',
    name: 'Campus feed',
    url: 'https://example.edu/feed.xml',
    sourceType: 'feed' as const,
  };

  it('drills into the child with its schema form and data sources, and applies edits back', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <WidgetEditPanel
        widgetId="stack-1"
        widgetType="nested-container-test"
        initialData={{ child: { headline: 'Old' } }}
        sources={[feedSource]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit child' }));

    // The header now describes the child, with the container as context.
    expect(screen.getByRole('heading', { name: 'Nested child' })).toBeInTheDocument();
    expect(screen.getByText('Nested container · Widget 1 of 1')).toBeInTheDocument();
    // The child's own options and source picker are the ones from its full editor.
    expect(screen.getByText('Data Source')).toBeInTheDocument();
    const headline = screen.getByPlaceholderText('Headline text');
    expect(headline).toHaveValue('Old');
    // The container's form is parked, not discarded.
    expect(screen.getByText('Container Settings')).not.toBeVisible();

    await user.clear(headline);
    await user.type(headline, 'New');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(screen.getByRole('heading', { name: 'Nested container' })).toBeInTheDocument();
    expect(screen.getByText('Container Settings')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    const savedData = onSave.mock.calls[0][1] as Record<string, unknown>;
    expect(savedData.child).toEqual({ headline: 'New' });
  });

  it('discards child edits on cancel or back', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <WidgetEditPanel
        widgetId="stack-1"
        widgetType="nested-container-test"
        initialData={{ child: { headline: 'Old' } }}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Edit child' }));
    await user.type(screen.getByPlaceholderText('Headline text'), ' edited');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Nested container' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit child' }));
    expect(screen.getByPlaceholderText('Headline text')).toHaveValue('Old');
    await user.click(screen.getByRole('button', { name: 'Back to Nested container' }));

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    const savedData = onSave.mock.calls[0][1] as Record<string, unknown>;
    expect(savedData.child).toEqual({ headline: 'Old' });
  });
});
