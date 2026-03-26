'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getWidget, AppIcon } from '@firstform/campus-hub-widget-sdk';
import type { SourceBinding } from '@firstform/campus-hub-widget-sdk';

export interface ContentSource {
  _id: string;
  name: string;
  url: string;
  sourceType: string;
  description?: string;
  metadata?: { provider?: string };
}

interface WidgetEditDialogProps {
  isOpen: boolean;
  widgetId: string;
  widgetType: string;
  initialData: Record<string, unknown>;
  comingSoon?: boolean;
  onSave: (widgetId: string, data: Record<string, unknown>, comingSoon: boolean) => void;
  onClose: () => void;
  /** Optional: available content sources for the source picker */
  sources?: ContentSource[];
  /** Optional accent color override — falls back to var(--color-accent) */
  accentColor?: string;
}

export default function WidgetEditDialog({
  isOpen,
  widgetId,
  widgetType,
  initialData,
  comingSoon: initialComingSoon = false,
  onSave,
  onClose,
  sources,
  accentColor,
}: WidgetEditDialogProps) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [comingSoon, setComingSoon] = useState(initialComingSoon);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const widgetDef = getWidget(widgetType);
  const OptionsComponent = widgetDef?.OptionsComponent;

  // Sync initial data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setData(initialData);
      setComingSoon(initialComingSoon);
    }
  }, [isOpen, initialData, initialComingSoon]);

  // Control dialog open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleChange = useCallback((newData: Record<string, unknown>) => {
    setData(newData);
  }, []);

  const handleSave = useCallback(() => {
    onSave(widgetId, data, comingSoon);
    onClose();
  }, [widgetId, data, comingSoon, onSave, onClose]);

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

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-transparent fixed inset-0 m-0 p-4 w-full h-full max-w-none max-h-none flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className="widget-edit-dialog rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] border border-[color:var(--ui-panel-border)] bg-[var(--ui-panel-solid,theme(colors.white))] text-[var(--ui-text)]"
        style={accentOverride}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[color:var(--ui-panel-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon name={widgetDef.icon} className="w-7 h-7 text-[var(--color-accent)]" />
              <div>
                <h2 className="text-xl font-bold text-[var(--ui-text)]">Configure {widgetDef.name}</h2>
                <p className="text-sm text-[var(--ui-text-muted)]">{widgetDef.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors text-[var(--ui-text-muted)] hover:bg-[var(--ui-item-hover)]"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Coming Soon Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--ui-item-bg)] border border-[color:var(--ui-item-border)]">
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

          {/* Source Picker — shown when sources are available and widget accepts them */}
          {sources && sources.length > 0 && widgetDef.acceptsSources && widgetDef.acceptsSources.length > 0 && (
            <SourcePicker
              bindings={widgetDef.acceptsSources}
              sources={sources}
              data={data}
              onChange={handleChange}
            />
          )}

          {OptionsComponent ? (
            <OptionsComponent data={data} onChange={handleChange} />
          ) : (
            <div className="text-center py-8 text-[var(--ui-text-muted)]">
              <p>No additional configuration options available for this widget.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-[color:var(--ui-panel-border)] bg-[var(--ui-item-bg)] rounded-b-xl">
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
    </dialog>
  );
}

/** Source picker panel shown above widget options when sources are available */
function SourcePicker({
  bindings,
  sources,
  data,
  onChange,
}: {
  bindings: SourceBinding[];
  sources: ContentSource[];
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get current source ref if any
  const sourceRef = data.__sourceRef as { sourceId?: string; propName?: string } | undefined;
  const linkedSource = sourceRef?.sourceId
    ? sources.find((s) => s._id === sourceRef.sourceId)
    : undefined;

  const handlePickSource = (binding: SourceBinding, source: ContentSource) => {
    const newData = {
      ...data,
      [binding.propName]: source.url,
      __sourceRef: { sourceId: source._id, propName: binding.propName },
    };
    onChange(newData);
    setExpanded(false);
  };

  const handleUnlink = () => {
    const { __sourceRef, ...rest } = data;
    onChange(rest);
  };

  // Filter sources to only show types this widget accepts
  const acceptedTypes = new Set(bindings.flatMap((b) => b.types));
  const matchingSources = sources.filter((s) => acceptedTypes.has(s.sourceType as any));

  if (matchingSources.length === 0) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)]">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <span className="text-sm font-medium text-[var(--ui-text)]">Content Source</span>
          {linkedSource && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--ui-accent-soft)] text-[var(--color-accent)]">
              {linkedSource.name}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[var(--ui-text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-[color:var(--ui-item-border)] pt-3">
          <p className="text-xs text-[var(--ui-text-muted)] mb-2">
            Pick a source from your library to link to this widget. The URL will stay in sync when you update the source.
          </p>

          {linkedSource && (
            <div className="flex items-center justify-between p-2 rounded-lg border border-[color:var(--ui-accent-soft)] bg-[var(--ui-accent-soft)]">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate text-[var(--color-accent)]">{linkedSource.name}</div>
                <div className="text-xs truncate text-[var(--ui-text-muted)]">{linkedSource.url}</div>
              </div>
              <button
                onClick={handleUnlink}
                className="ml-2 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
              >
                Unlink
              </button>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {matchingSources.map((source) => {
              const isLinked = sourceRef?.sourceId === source._id;
              return (
                <button
                  key={source._id}
                  onClick={() => {
                    if (!isLinked) handlePickSource(bindings[0], source);
                  }}
                  disabled={isLinked}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${
                    isLinked ? 'cursor-default bg-[var(--ui-accent-soft)]' : 'hover:bg-[var(--ui-item-hover)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-[var(--ui-item-bg)]">
                    {source.sourceType === 'image' ? (
                      <img src={source.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium uppercase text-[var(--ui-text-muted)]">{source.sourceType.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate text-[var(--ui-text)]">{source.name}</div>
                    <div className="text-xs truncate text-[var(--ui-text-muted)]">{source.url}</div>
                  </div>
                  {isLinked && (
                    <span className="text-xs flex-shrink-0 text-[var(--color-accent)]">Linked</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
