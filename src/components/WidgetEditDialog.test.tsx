import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { registerWidget } from '@firstform/campus-hub-widget-sdk';
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
});
