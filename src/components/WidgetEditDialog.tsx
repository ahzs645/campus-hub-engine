'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWidget,
  AppIcon,
  SchemaOptionsForm,
  describeCapabilities,
  isVisibilitySignalKey,
  meetsRequirement,
  parseVisibilityScalar,
} from '@firstform/campus-hub-widget-sdk';
import type {
  LinkedSource,
  SimpleVisibilityCondition,
  SourceBinding,
  SourceCapabilities,
} from '@firstform/campus-hub-widget-sdk';

export interface ContentSource {
  _id: string;
  presetId?: string;
  name: string;
  url: string;
  sourceType: string;
  description?: string;
  metadata?: { provider?: string; thumbnailUrl?: string };
  capabilities?: SourceCapabilities;
}

export interface WidgetEditDialogProps {
  isOpen: boolean;
  widgetId: string;
  widgetType: string;
  initialData: Record<string, unknown>;
  comingSoon?: boolean;
  initialVisibilityCondition?: SimpleVisibilityCondition;
  onSave: (
    widgetId: string,
    data: Record<string, unknown>,
    comingSoon: boolean,
    visibilityCondition?: SimpleVisibilityCondition,
  ) => void;
  onClose: () => void;
  /** Optional: available content sources for the source picker */
  sources?: ContentSource[];
  /** Optional accent color override — falls back to var(--color-accent) */
  accentColor?: string;
  /** Optional: host-provided navigation to a linked source's detail view */
  onViewSource?: (sourceId: string) => void;
}

export type WidgetEditPanelProps = Omit<WidgetEditDialogProps, 'isOpen'>;

export default function WidgetEditDialog({
  isOpen,
  widgetId,
  widgetType,
  initialData,
  comingSoon: initialComingSoon = false,
  initialVisibilityCondition,
  onSave,
  onClose,
  sources,
  accentColor,
  onViewSource,
}: WidgetEditDialogProps) {
  if (!isOpen) return null;

  return (
    <WidgetEditForm
      widgetId={widgetId}
      widgetType={widgetType}
      initialData={initialData}
      comingSoon={initialComingSoon}
      initialVisibilityCondition={initialVisibilityCondition}
      sources={sources}
      accentColor={accentColor}
      onSave={onSave}
      onClose={onClose}
      onViewSource={onViewSource}
      presentation="dialog"
    />
  );
}

export function WidgetEditPanel(props: WidgetEditPanelProps) {
  return <WidgetEditForm {...props} presentation="panel" />;
}

function WidgetEditForm({
  widgetId,
  widgetType,
  initialData,
  comingSoon: initialComingSoon = false,
  initialVisibilityCondition,
  onSave,
  onClose,
  sources,
  accentColor,
  onViewSource,
  presentation,
}: WidgetEditPanelProps & { presentation: 'dialog' | 'panel' }) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [comingSoon, setComingSoon] = useState(initialComingSoon);
  const [visibilityEnabled, setVisibilityEnabled] = useState(
    initialVisibilityCondition !== undefined,
  );
  const [signalKey, setSignalKey] = useState(
    initialVisibilityCondition?.source.key ?? 'emergency',
  );
  const [visibilityOperator, setVisibilityOperator] = useState<
    SimpleVisibilityCondition['operator']
  >(initialVisibilityCondition?.operator ?? 'equals');
  const [expectedValue, setExpectedValue] = useState(
    initialVisibilityCondition?.value === null
      ? 'null'
      : String(initialVisibilityCondition?.value ?? 'true'),
  );
  const [visibilityBehavior, setVisibilityBehavior] = useState<
    SimpleVisibilityCondition['behavior']
  >(initialVisibilityCondition?.behavior ?? 'while-matched');
  const [autoHideSeconds, setAutoHideSeconds] = useState(
    initialVisibilityCondition?.autoHideSeconds ?? 15,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  const widgetDef = getWidget(widgetType);
  const OptionsComponent = widgetDef?.OptionsComponent;
  const optionsSchema = widgetDef?.optionsSchema;

  // Resolve the currently-linked library source (if any) so options UIs can
  // reflect it — the picker writes `__sourceRef` when a source is linked.
  const sourceRef = data.__sourceRef as { sourceId?: string; propName?: string } | undefined;
  const linkedSource = sourceRef?.sourceId
    ? (sources?.find((s) => s._id === sourceRef.sourceId) as LinkedSource | undefined)
    : undefined;

  const isDialog = presentation === 'dialog';

  // Sync initial data when the edited widget changes.
  useEffect(() => {
    setData(initialData);
    setComingSoon(initialComingSoon);
    setVisibilityEnabled(initialVisibilityCondition !== undefined);
    setSignalKey(initialVisibilityCondition?.source.key ?? 'emergency');
    setVisibilityOperator(initialVisibilityCondition?.operator ?? 'equals');
    setExpectedValue(
      initialVisibilityCondition?.value === null
        ? 'null'
        : String(initialVisibilityCondition?.value ?? 'true'),
    );
    setVisibilityBehavior(
      initialVisibilityCondition?.behavior ?? 'while-matched',
    );
    setAutoHideSeconds(initialVisibilityCondition?.autoHideSeconds ?? 15);
  }, [
    widgetId,
    initialData,
    initialComingSoon,
    initialVisibilityCondition,
  ]);

  // Control dialog open/close
  useEffect(() => {
    if (!isDialog) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    return () => {
      dialog.close();
    };
  }, [isDialog]);

  const handleChange = useCallback((newData: Record<string, unknown>) => {
    setData(newData);
  }, []);

  const handleSave = useCallback(() => {
    const trimmedSignalKey = signalKey.trim();
    if (visibilityEnabled && !isVisibilitySignalKey(trimmedSignalKey)) return;
    if (
      visibilityEnabled &&
      visibilityBehavior === 'pulse' &&
      (!Number.isFinite(autoHideSeconds) || autoHideSeconds <= 0)
    ) {
      return;
    }

    const requiresExpectedValue =
      visibilityOperator === 'equals' ||
      visibilityOperator === 'not-equals';
    const visibilityCondition = visibilityEnabled
      ? {
          source: { kind: 'signal' as const, key: trimmedSignalKey },
          operator: visibilityOperator,
          ...(requiresExpectedValue
            ? { value: parseVisibilityScalar(expectedValue) }
            : {}),
          behavior: visibilityBehavior,
          ...(visibilityBehavior === 'pulse' ? { autoHideSeconds } : {}),
        }
      : undefined;
    onSave(widgetId, data, comingSoon, visibilityCondition);
    onClose();
  }, [
    autoHideSeconds,
    comingSoon,
    data,
    expectedValue,
    onClose,
    onSave,
    signalKey,
    visibilityBehavior,
    visibilityEnabled,
    visibilityOperator,
    widgetId,
  ]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  if (!widgetDef) return null;

  // Only set inline accent override if explicitly provided
  const accentOverride = accentColor
    ? { '--color-accent': accentColor, '--ui-switch-on': accentColor } as React.CSSProperties
    : undefined;

  const content = (
    <div
      className={
        isDialog
          ? 'widget-edit-dialog rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] border border-[color:var(--ui-panel-border)] bg-[var(--ui-panel-solid,theme(colors.white))] text-[var(--ui-text)]'
          : 'widget-edit-dialog flex h-full min-h-0 flex-col border-l border-[color:var(--ui-panel-border)] bg-[var(--ui-panel-solid,theme(colors.white))] text-[var(--ui-text)]'
      }
      style={accentOverride}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-[color:var(--ui-panel-border)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)]">
              <AppIcon name={widgetDef.icon} className="w-5 h-5 text-[var(--ui-text)]" />
            </span>
            <div className="min-w-0">
              <h2 className={isDialog ? 'text-xl font-bold text-[var(--ui-text)]' : 'text-sm font-semibold text-[var(--ui-text)]'}>
                {isDialog ? `Configure ${widgetDef.name}` : widgetDef.name}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--ui-text-muted)]">{widgetDef.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors text-[var(--ui-text-muted)] hover:bg-[var(--ui-item-hover)]"
            aria-label="Close"
            title="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className={isDialog ? 'flex-1 overflow-y-auto p-6 space-y-6' : 'flex-1 overflow-y-auto p-4 space-y-5'}>
        {/* Coming Soon Toggle */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)]">
          <div>
            <div className="text-sm font-medium text-[var(--ui-text)]">Coming Soon</div>
            <div className="text-xs text-[var(--ui-text-muted)]">Gray out this widget with a &quot;Coming Soon&quot; overlay</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={comingSoon}
            onClick={() => setComingSoon(!comingSoon)}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
            style={{ backgroundColor: comingSoon ? `var(--ui-switch-on)` : `var(--ui-switch-off)` }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                comingSoon ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Runtime Visibility */}
        <div className="rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)]">
          <div className="flex items-center justify-between gap-4 p-3">
            <div>
              <div className="text-sm font-medium text-[var(--ui-text)]">Visibility</div>
              <div className="text-xs text-[var(--ui-text-muted)]">
                Only show this widget when a live display signal matches
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Conditional visibility"
              aria-checked={visibilityEnabled}
              onClick={() => setVisibilityEnabled((enabled) => !enabled)}
              className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
              style={{
                backgroundColor: visibilityEnabled
                  ? 'var(--ui-switch-on)'
                  : 'var(--ui-switch-off)',
              }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  visibilityEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {visibilityEnabled && (
            <div className="space-y-4 border-t border-[color:var(--ui-item-border)] p-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--ui-text-muted)]">
                  Signal key
                </span>
                <input
                  value={signalKey}
                  onChange={(event) => setSignalKey(event.target.value)}
                  placeholder="emergency"
                  aria-invalid={!isVisibilitySignalKey(signalKey.trim())}
                  className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-panel-solid,white)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--color-accent)]"
                />
                {!isVisibilitySignalKey(signalKey.trim()) && (
                  <span className="mt-1 block text-xs text-red-500">
                    Use 1–64 letters, numbers, dots, colons, underscores, or hyphens.
                  </span>
                )}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--ui-text-muted)]">
                    Condition
                  </span>
                  <select
                    value={visibilityOperator}
                    onChange={(event) =>
                      setVisibilityOperator(
                        event.target.value as SimpleVisibilityCondition['operator'],
                      )
                    }
                    className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-panel-solid,white)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="equals">Equals</option>
                    <option value="not-equals">Does not equal</option>
                    <option value="truthy">Is truthy</option>
                    <option value="falsy">Is falsy</option>
                  </select>
                </label>

                {(visibilityOperator === 'equals' ||
                  visibilityOperator === 'not-equals') && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--ui-text-muted)]">
                      Expected value
                    </span>
                    <input
                      value={expectedValue}
                      onChange={(event) => setExpectedValue(event.target.value)}
                      placeholder="true"
                      className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-panel-solid,white)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--ui-text-muted)]">
                    Behavior
                  </span>
                  <select
                    value={visibilityBehavior}
                    onChange={(event) =>
                      setVisibilityBehavior(
                        event.target.value as SimpleVisibilityCondition['behavior'],
                      )
                    }
                    className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-panel-solid,white)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="while-matched">While condition matches</option>
                    <option value="pulse">Show for a duration</option>
                  </select>
                </label>

                {visibilityBehavior === 'pulse' && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--ui-text-muted)]">
                      Auto-hide seconds
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={autoHideSeconds}
                      onChange={(event) =>
                        setAutoHideSeconds(Number(event.target.value))
                      }
                      className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-panel-solid,white)] px-3 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--color-accent)]"
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Source Picker — shown when sources are available and widget accepts them */}
        {sources && sources.length > 0 && widgetDef.acceptsSources && widgetDef.acceptsSources.length > 0 && (
          <SourcePicker
            bindings={widgetDef.acceptsSources}
            sources={sources}
            data={data}
            onChange={handleChange}
            onViewSource={onViewSource}
          />
        )}

        {OptionsComponent ? (
          <OptionsComponent data={data} onChange={handleChange} linkedSource={linkedSource} />
        ) : optionsSchema && optionsSchema.length > 0 ? (
          <SchemaOptionsForm schema={optionsSchema} data={data} onChange={handleChange} />
        ) : (
          <div className="text-center py-8 text-[var(--ui-text-muted)]">
            <p>No additional configuration options available for this widget.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={isDialog ? 'flex-shrink-0 px-6 py-4 border-t border-[color:var(--ui-panel-border)] bg-[var(--ui-item-bg)] rounded-b-xl' : 'flex-shrink-0 px-4 py-3 border-t border-[color:var(--ui-panel-border)] bg-[var(--ui-item-bg)]'}>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--ui-text-muted)] bg-[var(--ui-item-bg)] hover:bg-[var(--ui-item-hover)] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90 bg-[var(--color-accent)]"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  if (!isDialog) {
    return content;
  }

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-transparent fixed inset-0 m-0 p-4 w-full h-full max-w-none max-h-none flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {content}
    </dialog>
  );
}

/** Source picker panel shown above widget options when sources are available */
function SourcePicker({
  bindings,
  sources,
  data,
  onChange,
  onViewSource,
}: {
  bindings: SourceBinding[];
  sources: ContentSource[];
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
  onViewSource?: (sourceId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get current source ref if any
  const sourceRef = data.__sourceRef as { sourceId?: string; propName?: string } | undefined;
  const linkedSource = sourceRef?.sourceId
    ? sources.find((s) => s._id === sourceRef.sourceId)
    : undefined;
  const linkedBinding = sourceRef?.propName
    ? bindings.find((binding) => binding.propName === sourceRef.propName)
    : undefined;
  const linkedCapabilityChips = linkedSource?.capabilities
    ? describeCapabilities(linkedSource.capabilities)
    : [];

  const handlePickSource = (binding: SourceBinding, source: ContentSource) => {
    const mappedData = binding.applySource
      ? binding.applySource(source as any, data)
      : { [binding.propName]: source.url };
    const newData = {
      ...data,
      ...mappedData,
      __sourceRef: { sourceId: source._id, propName: binding.propName },
    };
    onChange(newData);
    setExpanded(false);
  };

  const handleUnlink = () => {
    const { __sourceRef, ...rest } = data;
    const mappedData = linkedBinding?.removeSource
      ? linkedBinding.removeSource(rest)
      : {};
    onChange({ ...rest, ...mappedData });
    setExpanded(false);
  };

  // Resolve, for each accepted source, its binding + whether it satisfies the
  // binding's capability requirement. Sources that don't meet `requires` are
  // still shown (greyed, with a reason) rather than hidden, so the choice stays
  // legible — capabilities can be stale or unknown.
  const findBinding = (source: ContentSource) =>
    bindings.find((binding) =>
      binding.types.includes(source.sourceType as any) &&
      (!binding.matchSource || binding.matchSource(source as any))
    );

  type PickerEntry = { source: ContentSource; binding: SourceBinding; meets: boolean; reason?: string };
  const matchingSources: PickerEntry[] = [];
  for (const source of sources) {
    const binding = findBinding(source);
    if (!binding) continue;
    const requirement = meetsRequirement(source.capabilities, binding.requires);
    matchingSources.push({ source, binding, meets: requirement.ok, reason: requirement.reason });
  }
  // Sources that meet requirements float to the top.
  matchingSources.sort((a, b) => Number(b.meets) - Number(a.meets));
  const pickerSources = linkedSource
    ? matchingSources.filter(({ source }) => source._id !== linkedSource._id)
    : matchingSources;

  const hint = bindings.find((b) => b.capabilityHint)?.capabilityHint;

  if (matchingSources.length === 0) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <span className="text-sm font-medium text-[var(--ui-text)]">Data Source</span>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--ui-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {linkedSource && (
        <div className="border-t border-[color:var(--ui-item-border)] px-3 py-3">
          <div className="rounded-lg border border-[color:var(--ui-accent-soft)] bg-[var(--ui-accent-soft)] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--color-accent)]">Linked source</div>
                <div className="mt-0.5 truncate text-sm font-medium text-[var(--ui-text)]">{linkedSource.name}</div>
                <div className="truncate text-xs text-[var(--ui-text-muted)]">{linkedSource.url}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {onViewSource && sourceRef?.sourceId && (
                  <button
                    type="button"
                    onClick={() => onViewSource(sourceRef.sourceId!)}
                    className="rounded px-2 py-1 text-xs font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--ui-item-hover)]"
                  >
                    View source
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnlink}
                  className="rounded px-2 py-1 text-xs font-medium text-[var(--ui-text-muted)] transition-colors hover:bg-[var(--ui-item-hover)] hover:text-[var(--ui-text)]"
                >
                  {linkedBinding?.unlinkLabel ?? 'Unlink'}
                </button>
              </div>
            </div>
            {linkedCapabilityChips.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {linkedCapabilityChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ui-text-muted)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
            {linkedSource.description && (
              <div className="mt-2 text-xs text-[var(--ui-text-muted)]">{linkedSource.description}</div>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-[color:var(--ui-item-border)] pt-3">
          <p className="text-xs text-[var(--ui-text-muted)] mb-2">
            Pick a source from your library to link to this widget. The URL will stay in sync when you update the source.
          </p>
          {hint && (
            <p className="text-xs text-[var(--color-accent)] mb-2">{hint}</p>
          )}

          <div className="max-h-64 overflow-y-auto space-y-1">
            {pickerSources.map(({ source, binding, meets, reason }) => {
              const chips = source.capabilities ? describeCapabilities(source.capabilities) : [];
              return (
                <button
                  key={source._id}
                  onClick={() => handlePickSource(binding, source)}
                  title={!meets && reason ? reason : undefined}
                  className={`w-full text-left p-2 rounded-lg flex items-start gap-3 transition-colors ${
                    !meets ? 'opacity-60' : ''
                  } hover:bg-[var(--ui-item-hover)]`}
                >
                  <div className="w-8 h-8 mt-0.5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-[var(--ui-item-bg)]">
                    {source.sourceType === 'image' ? (
                      <img src={source.url} alt="" className="w-full h-full object-cover" />
                    ) : source.metadata?.thumbnailUrl ? (
                      <img src={source.metadata.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium uppercase text-[var(--ui-text-muted)]">{source.sourceType.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate text-[var(--ui-text)]">{source.name}</span>
                    </div>
                    {chips.length > 0 ? (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full bg-[var(--ui-item-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--ui-text-muted)] border border-[color:var(--ui-item-border)]"
                          >
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs truncate text-[var(--ui-text-muted)]">{source.url}</div>
                    )}
                    {!meets && reason && (
                      <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">⚠ {reason}</div>
                    )}
                  </div>
                </button>
              );
            })}
            {pickerSources.length === 0 && (
              <div className="py-2 text-xs text-[var(--ui-text-muted)]">No other compatible sources available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
