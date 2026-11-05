import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  registerWidget,
  SourcePickerProvider,
  useNestedWidgetEditor,
  useSourcePicker,
  type SourcePickerFn,
  type SourceDisabledReasonFn,
} from '@firstform/campus-hub-widget-sdk';
import WidgetEditDialog, { WidgetEditPanel } from './WidgetEditDialog';

const binding = { propName: 'sourceUrl', types: ['api' as const], mode: 'reference' as const };
const childType = 'source-portal-child-test';
function ExtraSourceOptions() {
  const pick = useSourcePicker();
  return <button onClick={() => pick?.({ widgetType: childType, bindings: [binding], initialTab: 'store', onSelect: () => {} })}>Add another source</button>;
}
registerWidget({
  type: childType, name: 'Portal child', description: 'Nested source controls', icon: 'calendar',
  minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
  acceptsSources: [binding], OptionsComponent: ExtraSourceOptions,
});
registerWidget({
  type: 'source-portal-url-test', name: 'URL source', description: 'Public URL binding', icon: 'calendar',
  minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
  acceptsSources: [{ ...binding, mode: 'url' }],
});
registerWidget({
  type: 'source-portal-parent-test', name: 'Portal parent', description: 'Container source controls', icon: 'calendar',
  minW: 1, minH: 1, defaultW: 1, defaultH: 1, component: () => null,
  acceptsSources: [binding],
  OptionsComponent: () => {
    const edit = useNestedWidgetEditor();
    return <>
      <ExtraSourceOptions />
      <button onClick={() => edit?.({ widgetType: childType, data: {}, onApply: () => {} })}>Edit child</button>
    </>;
  },
});

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); },
  });
});
afterAll(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});

describe('source overlays in native widget dialogs', () => {
  it('forwards the native dialog container for primary, plugin-specific and nested source controls', async () => {
    const user = userEvent.setup();
    const open = vi.fn<SourcePickerFn>();
    render(<SourcePickerProvider value={open}>
      <WidgetEditDialog isOpen widgetId="parent" widgetType="source-portal-parent-test" initialData={{}}
        sources={[]} onSave={vi.fn()} onClose={vi.fn()} />
    </SourcePickerProvider>);
    const dialog = screen.getByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    await user.click(screen.getByRole('button', { name: 'Add another source' }));
    await user.click(screen.getByRole('button', { name: 'Edit child' }));
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    await user.click(screen.getByRole('button', { name: 'Add another source' }));
    expect(open).toHaveBeenCalledTimes(4);
    for (const [request] of open.mock.calls) expect(request.portalContainer).toBe(dialog);
    expect(open.mock.calls[2][0].widgetType).toBe(childType);
  });

  it('preserves the host picker request for a panel editor without a native dialog', async () => {
    const user = userEvent.setup();
    const open = vi.fn<SourcePickerFn>();
    render(<SourcePickerProvider value={open}>
      <WidgetEditPanel widgetId="child" widgetType={childType} initialData={{}}
        sources={[]} onSave={vi.fn()} onClose={vi.fn()} />
    </SourcePickerProvider>);
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    await user.click(screen.getByRole('button', { name: 'Add another source' }));
    expect(open).toHaveBeenCalledTimes(2);
    for (const [request] of open.mock.calls) expect(request).not.toHaveProperty('portalContainer');
  });

  const personal = { _id: 'personal', name: 'Personal source', sourceType: 'api' as const, url: 'https://example.test/data' };
  const workspacePolicy: SourceDisabledReasonFn = (source, sourceBinding) =>
    sourceBinding.mode === 'reference' && source._id === personal._id ? 'Add this source to the current workspace.' : undefined;

  it('inherits the host eligibility policy through the native wrapper for both inline picks and returned sources', async () => {
    const user = userEvent.setup();
    const open = vi.fn<SourcePickerFn>();
    const onSave = vi.fn();
    render(<SourcePickerProvider value={open} getSourceDisabledReason={workspacePolicy}>
      <WidgetEditDialog isOpen widgetId="child" widgetType={childType} initialData={{}}
        sources={[personal]} onSave={onSave} onClose={vi.fn()} />
    </SourcePickerProvider>);
    expect(screen.getByRole('button', { name: /Personal source/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Add source' }));
    act(() => open.mock.calls[0][0].onSelect(personal));
    expect(screen.getByRole('alert')).toHaveTextContent('Add this source to the current workspace.');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toEqual({});
  });

  it('allows the same personal source when the host policy permits its URL binding', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SourcePickerProvider value={vi.fn()} getSourceDisabledReason={workspacePolicy}>
      <WidgetEditPanel widgetId="url" widgetType="source-portal-url-test" initialData={{}}
        sources={[personal]} onSave={onSave} onClose={vi.fn()} />
    </SourcePickerProvider>);
    await user.click(screen.getByRole('button', { name: 'Data Source' }));
    await user.click(screen.getByRole('button', { name: /Personal source/ }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ sourceUrl: personal.url, __sourceRef: { sourceId: personal._id } });
  });
});
