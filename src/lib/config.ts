// Configuration types and pure utilities (no Node.js dependencies)
import {
  normalizeVisibilityCondition,
  type SimpleVisibilityCondition,
} from '@firstform/campus-hub-widget-sdk';

export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  props?: Record<string, unknown>;
  comingSoon?: boolean;
  visibilityCondition?: SimpleVisibilityCondition;
}

export interface LogoConfig {
  type: 'svg' | 'url';
  value: string;
}

export interface DisplayConfig {
  layout: WidgetConfig[];
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  schoolName: string;
  tickerEnabled: boolean;
  comingSoon?: boolean;
  gridRows?: number;
  gridCols?: number;
  logo?: LogoConfig;
  aspectRatio?: number;
  corsProxy?: string;
}

export type ShareUrlMode = 'fullscreen' | 'edit';

export const DEFAULT_CONFIG: DisplayConfig = {
  layout: [
    { id: 'clock-1', type: 'clock', x: 10, y: 0, w: 2, h: 1 },
    { id: 'poster-1', type: 'poster-carousel', x: 0, y: 1, w: 8, h: 5, props: { rotationSeconds: 10 } },
    { id: 'events-1', type: 'events-list', x: 8, y: 1, w: 4, h: 3 },
    { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
  ],
  theme: {
    primary: '#035642',
    accent: '#B79527',
    background: '#022b21',
  },
  schoolName: 'Campus Hub',
  tickerEnabled: true,
  gridRows: 8,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeConfig(raw: unknown): DisplayConfig {
  const safe = isRecord(raw) ? raw : {};
  const rawLayout = Array.isArray(safe.layout) ? safe.layout : DEFAULT_CONFIG.layout;
  const layout = rawLayout.map((candidate, index) => {
    const item = isRecord(candidate) ? candidate : {};
    const type = typeof item.type === 'string' ? item.type : 'clock';
    return {
      id: typeof item.id === 'string' ? item.id : `${type}-${index}`,
      type,
      x: finiteNumber(item.x, 0),
      y: finiteNumber(item.y, 0),
      w: finiteNumber(item.w, 1),
      h: finiteNumber(item.h, 1),
      zIndex:
        typeof item.zIndex === 'number' && Number.isFinite(item.zIndex)
          ? Math.trunc(item.zIndex)
          : index,
      props: isRecord(item.props) ? item.props : undefined,
      comingSoon: item.comingSoon === true ? true : undefined,
      visibilityCondition: normalizeVisibilityCondition(item.visibilityCondition),
    };
  });
  const tickerEnabled = layout.some((item) => item.type === 'news-ticker');
  const rawTheme = isRecord(safe.theme) ? safe.theme : {};

  return {
    layout,
    theme: {
      primary:
        typeof rawTheme.primary === 'string'
          ? rawTheme.primary
          : DEFAULT_CONFIG.theme.primary,
      accent:
        typeof rawTheme.accent === 'string'
          ? rawTheme.accent
          : DEFAULT_CONFIG.theme.accent,
      background:
        typeof rawTheme.background === 'string'
          ? rawTheme.background
          : DEFAULT_CONFIG.theme.background,
    },
    schoolName:
      typeof safe.schoolName === 'string' && safe.schoolName.trim().length > 0
        ? safe.schoolName
        : DEFAULT_CONFIG.schoolName,
    tickerEnabled,
    comingSoon: safe.comingSoon === true ? true : undefined,
    gridRows:
      typeof safe.gridRows === 'number' && Number.isFinite(safe.gridRows)
        ? safe.gridRows
        : DEFAULT_CONFIG.gridRows,
    gridCols:
      typeof safe.gridCols === 'number' && Number.isFinite(safe.gridCols)
        ? safe.gridCols
        : undefined,
    logo:
      isRecord(safe.logo) &&
      (safe.logo.type === 'svg' || safe.logo.type === 'url') &&
      typeof safe.logo.value === 'string' &&
      safe.logo.value.trim().length > 0
        ? { type: safe.logo.type, value: safe.logo.value }
        : undefined,
    aspectRatio:
      typeof safe.aspectRatio === 'number' && Number.isFinite(safe.aspectRatio) && safe.aspectRatio > 0
        ? safe.aspectRatio
        : undefined,
    corsProxy:
      typeof safe.corsProxy === 'string' && safe.corsProxy.trim().length > 0
        ? safe.corsProxy
        : undefined,
  };
}

/** Check whether a widget fits entirely within the grid bounds. */
export function isWidgetInBounds(
  widget: WidgetConfig,
  cols: number,
  rows: number,
): boolean {
  return (
    widget.x >= 0 &&
    widget.y >= 0 &&
    widget.x + widget.w <= cols &&
    widget.y + widget.h <= rows
  );
}

/** Return a copy of the config with only in-bounds widgets. */
export function filterInBoundsLayout(config: DisplayConfig): DisplayConfig {
  const cols = config.gridCols ?? 12;
  const rows = config.gridRows ?? 8;
  const layout = config.layout.filter((w) => isWidgetInBounds(w, cols, rows));
  return {
    ...config,
    layout,
    tickerEnabled: layout.some((w) => w.type === 'news-ticker'),
  };
}
