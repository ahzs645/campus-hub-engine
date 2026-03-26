'use client';
/**
 * Configurator — Embeddable drag-and-drop layout editor.
 *
 * This is a simplified wrapper that exposes the core configurator
 * functionality as a React component. Consumers handle their own
 * save/load logic.
 *
 * Usage:
 *   import { Configurator } from '@campus-hub/engine'
 *   <Configurator
 *     config={config}
 *     onChange={setConfig}
 *   />
 */
import { useCallback, useState, useRef, useEffect } from 'react';
import type { DisplayConfig, WidgetConfig } from '../lib/config';
import { normalizeConfig, DEFAULT_CONFIG } from '../lib/config';
import { EngineThemeProvider } from '../lib/ThemeContext';
import { getAllWidgets, getWidget } from '@firstform/campus-hub-widget-sdk';
import WidgetRenderer from './WidgetRenderer';
import WidgetEditDialog from './WidgetEditDialog';
import type { GridStackWrapperRef } from './GridStackWrapper';

interface ConfiguratorProps {
  /** Initial config to load */
  config?: DisplayConfig;
  /** Called whenever the config changes */
  onChange?: (config: DisplayConfig) => void;
  /** Optional CSS class */
  className?: string;
}

export function Configurator({
  config: initialConfig,
  onChange,
  className,
}: ConfiguratorProps) {
  const [config, setConfig] = useState<DisplayConfig>(
    initialConfig ? normalizeConfig(initialConfig) : DEFAULT_CONFIG
  );
  const [editingWidget, setEditingWidget] = useState<string | null>(null);
  const gridRef = useRef<GridStackWrapperRef>(null);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(config);
  }, [config, onChange]);

  // Sync external config changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(normalizeConfig(initialConfig));
    }
  }, [initialConfig]);

  const handleLayoutChange = useCallback(
    (items: Array<{ id: string; x: number; y: number; w: number; h: number }>) => {
      setConfig((prev) => ({
        ...prev,
        layout: prev.layout.map((widget) => {
          const item = items.find((i) => i.id === widget.id);
          return item
            ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h }
            : widget;
        }),
      }));
    },
    []
  );

  const handleAddWidget = useCallback(
    (type: string) => {
      const def = getWidget(type);
      if (!def) return;
      const id = `${type}-${Date.now()}`;
      const newWidget: WidgetConfig = {
        id,
        type: type as WidgetConfig['type'],
        x: 0,
        y: 0,
        w: def.defaultW,
        h: def.defaultH,
        props: def.defaultProps ?? {},
      };
      setConfig((prev) => ({
        ...prev,
        layout: [...prev.layout, newWidget],
      }));
    },
    []
  );

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setConfig((prev) => ({
      ...prev,
      layout: prev.layout.filter((w) => w.id !== widgetId),
    }));
  }, []);

  const handleSaveWidgetOptions = useCallback(
    (widgetId: string, data: Record<string, unknown>, comingSoon: boolean) => {
      setConfig((prev) => ({
        ...prev,
        layout: prev.layout.map((widget) =>
          widget.id === widgetId
            ? { ...widget, props: data, comingSoon: comingSoon || undefined }
            : widget
        ),
      }));
      setEditingWidget(null);
    },
    []
  );

  const widgets = getAllWidgets();
  const editingWidgetData = editingWidget
    ? config.layout.find((w) => w.id === editingWidget)
    : null;

  return (
    <EngineThemeProvider theme={config.theme}>
    <div className={`flex h-full ${className ?? ''}`}>
      {/* Widget palette */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto p-4 shrink-0">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
          Widgets
        </h3>
        <div className="space-y-1">
          {widgets.map((def) => (
            <button
              key={def.type}
              onClick={() => handleAddWidget(def.type)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {def.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid editor */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div
          className="w-full h-full rounded-xl border border-gray-800 overflow-hidden"
          style={{ backgroundColor: config.theme.background }}
        >
          {/* Simple absolute-positioned layout for now */}
          {/* Full GridStack integration can be added by consumers or via a separate GridConfigurator component */}
          <div className="relative w-full h-full">
            {config.layout.map((widget) => {
              const cols = config.gridCols ?? 12;
              const rows = config.gridRows ?? 8;
              return (
                <div
                  key={widget.id}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${(widget.x / cols) * 100}%`,
                    top: `${(widget.y / rows) * 100}%`,
                    width: `${(widget.w / cols) * 100}%`,
                    height: `${(widget.h / rows) * 100}%`,
                    padding: 2,
                  }}
                  onClick={() => setEditingWidget(widget.id)}
                >
                  <div className="w-full h-full rounded-lg overflow-hidden ring-0 group-hover:ring-2 ring-white/30 transition-all">
                    <WidgetRenderer
                      widget={widget}
                      theme={config.theme}

                    />
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveWidget(widget.id);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Widget edit dialog */}
      {editingWidgetData && (
        <WidgetEditDialog
          isOpen={!!editingWidget}
          widgetId={editingWidgetData.id}
          widgetType={editingWidgetData.type}
          initialData={editingWidgetData.props ?? {}}
          comingSoon={editingWidgetData.comingSoon}
          onSave={handleSaveWidgetOptions}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
    </EngineThemeProvider>
  );
}
