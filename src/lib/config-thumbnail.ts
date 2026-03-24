import { normalizeConfig, type DisplayConfig } from './config';

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const FALLBACK_COLOR = 'rgba(255,255,255,0.18)';

function withAlpha(hex: string | undefined, alpha: number) {
  if (!hex) {
    return FALLBACK_COLOR;
  }

  const value = hex.trim().replace('#', '');
  const normalized =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return FALLBACK_COLOR;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function escapeXml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatWidgetName(type: string) {
  return type
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildConfigThumbnailSvg(
  config: Partial<DisplayConfig> | null | undefined,
  {
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
  }: {
    width?: number;
    height?: number;
  } = {},
) {
  const normalized = normalizeConfig(config);
  const aspectRatio = normalized.aspectRatio ?? 16 / 9;
  const gridCols = normalized.gridCols ?? 12;
  const gridRows = normalized.gridRows ?? 8;

  let displayWidth = width;
  let displayHeight = displayWidth / aspectRatio;
  if (displayHeight > height) {
    displayHeight = height;
    displayWidth = displayHeight * aspectRatio;
  }

  const displayX = (width - displayWidth) / 2;
  const displayY = (height - displayHeight) / 2;
  const cellWidth = displayWidth / gridCols;
  const cellHeight = displayHeight / gridRows;
  const footerHeight = Math.max(28, displayHeight * 0.12);
  const footerY = displayY + displayHeight - footerHeight;

  const widgets = normalized.layout
    .map((widget, index) => {
      const x = displayX + widget.x * cellWidth;
      const y = displayY + widget.y * cellHeight;
      const widgetWidth = widget.w * cellWidth;
      const widgetHeight = widget.h * cellHeight;
      const labelSize = Math.max(
        10,
        Math.min(16, Math.min(widgetWidth, widgetHeight) * 0.12),
      );
      const showLabel = widgetWidth >= 110 && widgetHeight >= 55;
      const padding = Math.max(6, Math.min(widgetWidth, widgetHeight) * 0.08);
      const accentOpacity = 0.24 + (index % 3) * 0.08;

      return `
        <g>
          <rect
            x="${x.toFixed(2)}"
            y="${y.toFixed(2)}"
            width="${widgetWidth.toFixed(2)}"
            height="${widgetHeight.toFixed(2)}"
            rx="${Math.max(8, Math.min(widgetWidth, widgetHeight) * 0.08).toFixed(2)}"
            fill="${withAlpha(normalized.theme.primary, 0.26)}"
            stroke="${withAlpha(normalized.theme.accent, 0.5)}"
            stroke-width="1.2"
          />
          <rect
            x="${(x + padding).toFixed(2)}"
            y="${(y + padding).toFixed(2)}"
            width="${Math.max(16, widgetWidth * 0.12).toFixed(2)}"
            height="${Math.max(4, widgetHeight * 0.04).toFixed(2)}"
            rx="3"
            fill="${withAlpha('#ffffff', accentOpacity)}"
          />
          <rect
            x="${(x + padding).toFixed(2)}"
            y="${(y + padding + Math.max(8, widgetHeight * 0.08)).toFixed(2)}"
            width="${Math.max(22, widgetWidth * 0.16).toFixed(2)}"
            height="${Math.max(4, widgetHeight * 0.04).toFixed(2)}"
            rx="3"
            fill="${withAlpha('#ffffff', 0.12)}"
          />
          ${
            showLabel
              ? `<text
                  x="${(x + padding).toFixed(2)}"
                  y="${(y + widgetHeight - padding).toFixed(2)}"
                  fill="${withAlpha('#ffffff', 0.9)}"
                  font-family="DM Sans, system-ui, sans-serif"
                  font-size="${labelSize.toFixed(2)}"
                  font-weight="600"
                >${escapeXml(formatWidgetName(widget.type))}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  const schoolName = escapeXml(normalized.schoolName.toUpperCase());
  const widgetCountLabel = `${normalized.layout.length} WIDGET${normalized.layout.length === 1 ? '' : 'S'}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
      <defs>
        <linearGradient id="thumbnail-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${withAlpha(normalized.theme.primary, 0.45)}" />
          <stop offset="100%" stop-color="${withAlpha(normalized.theme.accent, 0.1)}" />
        </linearGradient>
        <radialGradient id="thumbnail-glow" cx="1" cy="0" r="1.1">
          <stop offset="0%" stop-color="${withAlpha(normalized.theme.accent, 0.24)}" />
          <stop offset="100%" stop-color="${withAlpha(normalized.theme.accent, 0)}" />
        </radialGradient>
        <pattern
          id="thumbnail-grid"
          x="${displayX}"
          y="${displayY}"
          width="${cellWidth}"
          height="${cellHeight}"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M ${cellWidth} 0 L 0 0 0 ${cellHeight}"
            fill="none"
            stroke="${withAlpha('#ffffff', 0.08)}"
            stroke-width="1"
          />
        </pattern>
        <clipPath id="thumbnail-clip">
          <rect
            x="${displayX.toFixed(2)}"
            y="${displayY.toFixed(2)}"
            width="${displayWidth.toFixed(2)}"
            height="${displayHeight.toFixed(2)}"
            rx="16"
          />
        </clipPath>
      </defs>

      <rect width="${width}" height="${height}" fill="#040816" />

      <g clip-path="url(#thumbnail-clip)">
        <rect
          x="${displayX.toFixed(2)}"
          y="${displayY.toFixed(2)}"
          width="${displayWidth.toFixed(2)}"
          height="${displayHeight.toFixed(2)}"
          rx="16"
          fill="${normalized.theme.background}"
        />
        <rect
          x="${displayX.toFixed(2)}"
          y="${displayY.toFixed(2)}"
          width="${displayWidth.toFixed(2)}"
          height="${displayHeight.toFixed(2)}"
          fill="url(#thumbnail-bg)"
        />
        <rect
          x="${displayX.toFixed(2)}"
          y="${displayY.toFixed(2)}"
          width="${displayWidth.toFixed(2)}"
          height="${displayHeight.toFixed(2)}"
          fill="url(#thumbnail-glow)"
        />
        <rect
          x="${displayX.toFixed(2)}"
          y="${displayY.toFixed(2)}"
          width="${displayWidth.toFixed(2)}"
          height="${displayHeight.toFixed(2)}"
          fill="url(#thumbnail-grid)"
        />
        ${widgets}
        <rect
          x="${displayX.toFixed(2)}"
          y="${footerY.toFixed(2)}"
          width="${displayWidth.toFixed(2)}"
          height="${footerHeight.toFixed(2)}"
          fill="${withAlpha(normalized.theme.primary, 0.4)}"
        />
        <text
          x="${(displayX + 14).toFixed(2)}"
          y="${(footerY + footerHeight * 0.65).toFixed(2)}"
          fill="${withAlpha('#ffffff', 0.72)}"
          font-family="JetBrains Mono, monospace"
          font-size="${Math.max(11, footerHeight * 0.34).toFixed(2)}"
          font-weight="700"
          letter-spacing="2"
        >${schoolName}</text>
        <text
          x="${(displayX + displayWidth - 14).toFixed(2)}"
          y="${(footerY + footerHeight * 0.65).toFixed(2)}"
          fill="${withAlpha('#ffffff', 0.72)}"
          font-family="JetBrains Mono, monospace"
          font-size="${Math.max(11, footerHeight * 0.34).toFixed(2)}"
          font-weight="700"
          text-anchor="end"
          letter-spacing="2"
        >${widgetCountLabel}</text>
      </g>

      <rect
        x="${displayX.toFixed(2)}"
        y="${displayY.toFixed(2)}"
        width="${displayWidth.toFixed(2)}"
        height="${displayHeight.toFixed(2)}"
        rx="16"
        stroke="${withAlpha(normalized.theme.accent, 0.5)}"
        stroke-width="1.2"
      />
    </svg>
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function generateConfigThumbnailDataUri(
  config: Partial<DisplayConfig> | null | undefined,
  options?: {
    width?: number;
    height?: number;
  },
) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildConfigThumbnailSvg(config, options),
  )}`;
}
