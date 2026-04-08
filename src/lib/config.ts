// Configuration types and pure utilities (no Node.js dependencies)

export interface WidgetConfig {
  id: string;
  type:
    | 'clock'
    | 'poster-carousel'
    | 'events-list'
    | 'news-ticker'
    | 'stock-quotes'
    | 'weather'
    | 'team-schedule'
    | 'horoscope'
    | 'youtube'
    | 'web'
    | 'image'
    | 'media-player'
    | 'slideshow'
    | 'poster-feed'
    | 'widget-stack'
    | 'bus-connection'
    | 'climbing-gym'
    | 'group-fitness'
    | 'qrcode'
    | 'library-availability'
    | 'confessions';
  x: number;
  y: number;
  w: number;
  h: number;
  props?: Record<string, unknown>;
  comingSoon?: boolean;
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

export function normalizeConfig(raw: Partial<DisplayConfig> | null | undefined): DisplayConfig {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const layout = Array.isArray(safe.layout)
    ? safe.layout.map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `${item.type ?? 'widget'}-${index}`,
        type: (typeof item.type === 'string' ? item.type : 'clock') as WidgetConfig['type'],
        x: Number.isFinite(item.x) ? item.x : 0,
        y: Number.isFinite(item.y) ? item.y : 0,
        w: Number.isFinite(item.w) ? item.w : 1,
        h: Number.isFinite(item.h) ? item.h : 1,
        props:
          item.props && typeof item.props === 'object'
            ? (item.props as Record<string, unknown>)
            : undefined,
        comingSoon: item.comingSoon === true ? true : undefined,
      }))
    : DEFAULT_CONFIG.layout;
  const tickerEnabled = layout.some((item) => item.type === 'news-ticker');

  return {
    layout,
    theme: { ...DEFAULT_CONFIG.theme, ...(safe.theme ?? {}) },
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
      safe.logo &&
      typeof safe.logo === 'object' &&
      (safe.logo.type === 'svg' || safe.logo.type === 'url') &&
      typeof safe.logo.value === 'string' &&
      safe.logo.value.trim().length > 0
        ? { type: safe.logo.type, value: safe.logo.value }
        : undefined,
    aspectRatio:
      typeof safe.aspectRatio === 'number' && Number.isFinite(safe.aspectRatio) && safe.aspectRatio > 0
        ? safe.aspectRatio
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
