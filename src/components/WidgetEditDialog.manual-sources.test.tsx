import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { registerWidget, SourcePickerProvider, useNestedWidgetEditor, type SourcePickRequest, type WidgetOptionsProps } from '@firstform/campus-hub-widget-sdk';
import { WidgetEditPanel } from './WidgetEditDialog';

function ManualOptions({ data, onChange }: WidgetOptionsProps) {
  return <>
    <input aria-label="Endpoint" value={String(data.apiUrl ?? '')} onChange={(event) => onChange({ ...data, apiUrl: event.target.value })} />
    <input aria-label="Title" value={String(data.title ?? '')} onChange={(event) => onChange({ ...data, title: event.target.value })} />
  </>;
}
const base = { description: 'Source edit regression', icon: 'calendar' as const, minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null };
const binding = { propName: 'apiUrl', types: ['api' as const], removeSource: () => ({ apiUrl: '', title: 'Unlink reset' }) };
registerWidget({ ...base, type: 'manual-source-options', name: 'Manual source options', acceptsSources: [binding], OptionsComponent: ManualOptions });
registerWidget({ ...base, type: 'manual-source-schema', name: 'Manual source schema', acceptsSources: [binding], optionsSchema: [
  { name: 'apiUrl', label: 'Endpoint', fieldType: 'string' },
  { name: 'title', label: 'Title', fieldType: 'string' },
] });
registerWidget({ ...base, type: 'manual-source-collection', name: 'Manual source collection', acceptsSources: [{ propName: 'slides', types: ['image'], multiple: true, itemUrlProp: 'image' }], OptionsComponent: ({ data, onChange }) => {
  const slides = data.slides as Array<{ id: string; image: string }>;
  return <input aria-label="First poster URL" value={slides[0].image} onChange={(event) => onChange({ ...data, slides: slides.map((slide, index) => index === 0 ? { ...slide, image: event.target.value } : slide) })} />;
} });
registerWidget({ ...base, type: 'manual-source-parent', name: 'Manual source parent', OptionsComponent: ({ data, onChange }) => {
  const edit = useNestedWidgetEditor();
  return <button onClick={() => edit?.({ widgetType: 'manual-source-schema', data: data.child as Record<string, unknown>, onApply: (child) => onChange({ ...data, child }) })}>Edit child</button>;
} });

const saved = { _id: 'saved', name: 'Saved source', sourceType: 'api' as const, url: 'https://example.edu/saved' };
const initialData = { apiUrl: saved.url, title: 'Original', __sourceRef: { sourceId: saved._id, propName: 'apiUrl' } };
const customUrl = 'https://example.edu/manually-entered';

describe('manual source edits in the shared widget editor', () => {
  it.each(['manual-source-options', 'manual-source-schema'])('%s detaches the source and keeps the manually entered URL', (widgetType) => {
    const onSave = vi.fn();
    render(<WidgetEditPanel widgetId="one" widgetType={widgetType} initialData={initialData} sources={[saved]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue(saved.url), { target: { value: customUrl } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ apiUrl: customUrl, title: 'Original' });
  });

  it('retains a source link when only presentation settings change', () => {
    const onSave = vi.fn();
    render(<WidgetEditPanel widgetId="one" widgetType="manual-source-options" initialData={initialData} sources={[saved]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ ...initialData, title: 'Updated title' });
  });

  it('detaches only the collection item whose URL changed', () => {
    const onSave = vi.fn();
    const refs = ['first', 'second'].map((id) => ({ sourceId: id, propName: 'slides', itemId: id, urlProp: 'image' }));
    const slides = [{ id: 'first', image: 'first.jpg' }, { id: 'manual', image: 'manual.jpg' }, { id: 'second', image: 'second.jpg' }];
    render(<WidgetEditPanel widgetId="slides" widgetType="manual-source-collection" initialData={{ slides, __sourceRefs: refs, __sourceRef: refs[1] }} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('First poster URL'), { target: { value: customUrl } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({
      slides: [{ id: 'first', image: customUrl }, slides[1], slides[2]],
      __sourceRefs: [refs[1]], __sourceRef: refs[1],
    });
  });

  it('keeps the binding when the source picker refreshes the same source identity', () => {
    const onSave = vi.fn();
    const openPicker = vi.fn();
    render(<SourcePickerProvider value={openPicker}>
      <WidgetEditPanel widgetId="one" widgetType="manual-source-options" initialData={initialData} sources={[saved]} onSave={onSave} onClose={vi.fn()} />
    </SourcePickerProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }));
    act(() => (openPicker.mock.calls[0][0] as SourcePickRequest).onSelect({ ...saved, url: 'https://example.edu/updated-saved-source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ apiUrl: 'https://example.edu/updated-saved-source', __sourceRef: initialData.__sourceRef });
  });

  it('applies the same manual-edit guard in the nested schema editor', () => {
    const onSave = vi.fn();
    render(<WidgetEditPanel widgetId="parent" widgetType="manual-source-parent" initialData={{ child: initialData }} sources={[saved]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit child' }));
    fireEvent.change(screen.getByDisplayValue(saved.url), { target: { value: customUrl } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({ child: { apiUrl: customUrl, title: 'Original' } });
  });
});
