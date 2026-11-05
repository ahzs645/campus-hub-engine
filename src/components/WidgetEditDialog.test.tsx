import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  registerWidget,
  SourcePickerProvider,
  useNestedWidgetEditor,
  type SourcePickRequest,
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

registerWidget({
  type: 'source-picker-image-test', name: 'Image source test', description: 'Needs images',
  icon: 'carousel', minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
  acceptsSources: [{ propName: 'feedUrl', types: ['feed'], requires: { hasImages: true } }],
});

registerWidget({
  type: 'source-picker-slides-test', name: 'Slide sources', description: 'Multiple saved images',
  icon: 'carousel', minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
  acceptsSources: [{ propName: 'slides', types: ['image'], multiple: true }],
});

describe('WidgetEditPanel source picker', () => {
  it('links several sources and unlinks one while keeping manual and other saved slides', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    const manual = { id: 'manual', url: 'data:image/svg+xml,manual' };
    render(
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId="slides" widgetType="source-picker-slides-test" initialData={{ slides: [manual] }}
          sources={[]} onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    act(() => (openPicker.mock.calls[0][0] as SourcePickRequest).onSelect({
      _id: 'one', name: 'Poster one', sourceType: 'image', url: 'https://example.edu/one.jpg',
    }));
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    act(() => (openPicker.mock.calls[1][0] as SourcePickRequest).onSelect({
      _id: 'two', name: 'Poster two', sourceType: 'image', url: 'https://example.edu/two.jpg',
    }));
    expect(screen.getByText('Poster one')).toBeInTheDocument();
    expect(screen.getByText('Poster two')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unlink Poster one' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    const data = onSave.mock.calls[0][1];
    expect(data.slides).toEqual([manual, { id: 'two', url: 'https://example.edu/two.jpg' }]);
    expect(data.__sourceRefs).toEqual([{ sourceId: 'two', propName: 'slides', itemId: 'two', urlProp: 'url' }]);
  });

  it('can add and immediately link the first source without losing the widget draft', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    render(
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId="first" widgetType="source-picker-test" initialData={{ title: 'My draft' }}
          sources={[]} onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>,
    );

    expect(screen.getByText('No compatible sources saved yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    const request = openPicker.mock.calls[0][0] as SourcePickRequest;
    expect(request).toMatchObject({ widgetType: 'source-picker-test', initialTab: 'create' });
    act(() => request.onSelect({
      _id: 'new-source', name: 'New campus source', sourceType: 'api', url: 'https://example.edu/data',
    }));

    // The supplied sources list is still empty: the returned saved source is enough.
    expect(screen.getByText('New campus source')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({
      title: 'My draft', apiUrl: 'https://example.edu/data',
      __sourceRef: { sourceId: 'new-source', propName: 'apiUrl' },
    });
  });

  it('opens the same host picker at the store and preserves the draft when it is cancelled', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    render(
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId="first" widgetType="source-picker-test" initialData={{ title: 'My draft' }}
          sources={[]} onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Browse source store' }));
    expect(openPicker.mock.calls[0][0]).toMatchObject({ initialTab: 'store' });
    // Cancellation calls no onSelect; all existing form state remains intact.
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ title: 'My draft' });
  });

  it('rejects known incompatible sources from both the list and a host picker callback', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    const textOnly = {
      _id: 'text', name: 'Text only news', sourceType: 'feed' as const, url: 'https://example.edu/feed',
      capabilities: { format: 'rss' as const, hasImages: false, hasText: true, hasDates: true,
        hasLinks: true, fields: [], detectedAt: 1 },
    };
    render(
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId="image" widgetType="source-picker-image-test" initialData={{}}
          sources={[textOnly]} onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>,
    );

    expect(screen.getByRole('button', { name: /Text only news/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    act(() => (openPicker.mock.calls[0][0] as SourcePickRequest).onSelect(textOnly));
    expect(screen.getByRole('alert')).toHaveTextContent(/No images/i);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({});
  });

  it('clears the copied endpoint when unlinking, including a deleted library source', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<WidgetEditPanel widgetId="old" widgetType="source-picker-test" sources={[]}
      initialData={{ apiUrl: 'https://example.edu/old', title: 'Keep me',
        __sourceRef: { sourceId: 'deleted', propName: 'apiUrl' } }}
      onSave={onSave} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Unlink source' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ title: 'Keep me', dataSource: 'default' });
  });

  it('ignores a returned source after the editor has moved to a different widget', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    const view = (widgetId: string) => (
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId={widgetId} widgetType="source-picker-test" initialData={{ title: widgetId }}
          sources={[]} onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>
    );
    const { rerender } = render(view('first'));
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    const request = openPicker.mock.calls[0][0] as SourcePickRequest;
    rerender(view('second'));
    act(() => request.onSelect({ _id: 'late', name: 'Late source', url: 'https://example.edu/late', sourceType: 'api' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ title: 'second' });
  });

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

  it('adds a child source through the shared host dialog in an empty library', async () => {
    const user = userEvent.setup();
    const openPicker = vi.fn();
    const onSave = vi.fn();
    render(
      <SourcePickerProvider value={openPicker}>
        <WidgetEditPanel widgetId="stack-new" widgetType="nested-container-test"
          initialData={{ child: { headline: 'Keep headline' } }} sources={[]}
          onSave={onSave} onClose={vi.fn()} />
      </SourcePickerProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Edit child' }));
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    const request = openPicker.mock.calls[0][0] as SourcePickRequest;
    expect(request.widgetType).toBe('nested-child-test');
    act(() => request.onSelect(feedSource));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave.mock.calls[0][1]).toEqual({ child: {
      headline: 'Keep headline', feedUrl: feedSource.url,
      __sourceRef: { sourceId: feedSource._id, propName: 'feedUrl' },
    } });
  });

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

