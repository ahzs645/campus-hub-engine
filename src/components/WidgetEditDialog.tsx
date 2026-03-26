'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getWidget, AppIcon } from '@firstform/campus-hub-widget-sdk';
import type { SourceBinding } from '@firstform/campus-hub-widget-sdk';
import { useEngineTheme } from '../lib/ThemeContext';

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
  /** @deprecated Use EngineThemeProvider instead */
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
  accentColor: accentColorProp,
}: WidgetEditDialogProps) {
  const theme = useEngineTheme();
  const accentColor = accentColorProp || theme.accent;
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

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 bg-transparent fixed inset-0 m-0 p-4 w-full h-full max-w-none max-h-none flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div
        className="widget-edit-dialog rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh]"
        style={{ '--dialog-accent': accentColor, '--ui-switch-on': accentColor, '--ui-switch-off': 'rgba(156,163,175,0.4)', backgroundColor: '#111827', color: '#fff', borderWidth: '1px', borderColor: '#1f2937', colorScheme: 'dark' } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon name={widgetDef.icon} className="w-7 h-7 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Configure {widgetDef.name}</h2>
                <p className="text-sm text-gray-400">{widgetDef.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Coming Soon Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
            <div>
              <div className="text-sm font-medium text-white">Coming Soon</div>
              <div className="text-xs text-gray-400">Gray out this widget with a &quot;Coming Soon&quot; overlay</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={comingSoon}
              onClick={() => setComingSoon(!comingSoon)}
              style={comingSoon ? { backgroundColor: accentColor } : undefined}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                comingSoon ? '' : 'bg-gray-600'
              }`}
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
              accentColor={accentColor}
            />
          )}

          {OptionsComponent ? (
            <OptionsComponent data={data} onChange={handleChange} />
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No additional configuration options available for this widget.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-700 bg-gray-800/50 rounded-b-xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{ backgroundColor: accentColor }}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
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
  accentColor = '#10b981',
}: {
  bindings: SourceBinding[];
  sources: ContentSource[];
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
  accentColor?: string;
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
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <span className="text-sm font-medium text-white">Content Source</span>
          {linkedSource && (
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
              {linkedSource.name}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">
            Pick a source from your library to link to this widget. The URL will stay in sync when you update the source.
          </p>

          {linkedSource && (
            <div className="flex items-center justify-between p-2 rounded-lg border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }}>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: accentColor }}>{linkedSource.name}</div>
                <div className="text-xs truncate" style={{ color: `${accentColor}cc` }}>{linkedSource.url}</div>
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
                  style={isLinked ? { backgroundColor: `${accentColor}10` } : undefined}
                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${
                    isLinked
                      ? 'cursor-default'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {source.sourceType === 'image' ? (
                      <img src={source.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-medium text-gray-500 uppercase">{source.sourceType.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white truncate">{source.name}</div>
                    <div className="text-xs text-gray-400 truncate">{source.url}</div>
                  </div>
                  {isLinked && (
                    <span className="text-xs flex-shrink-0" style={{ color: accentColor }}>Linked</span>
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
