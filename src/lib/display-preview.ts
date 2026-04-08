import type { CSSProperties } from 'react';

export const DEFAULT_DISPLAY_ASPECT_RATIO = 16 / 9;
export const DEFAULT_DISPLAY_GRID_COLS = 12;
export const DEFAULT_DISPLAY_GRID_ROWS = 8;
export const DISPLAY_REFERENCE_HEIGHT = 1080;

export interface DisplayPreviewMetricsInput {
  aspectRatio?: number;
  gridCols?: number;
  gridRows?: number;
  displayWidth?: number;
  displayHeight?: number;
  referenceHeight?: number;
}

export interface DisplayPreviewMetricsForCellHeightInput
  extends Omit<DisplayPreviewMetricsInput, 'displayWidth' | 'displayHeight'> {
  previewCellHeight: number;
}

export interface DisplayPreviewMetrics {
  aspectRatio: number;
  gridCols: number;
  gridRows: number;
  displayWidth: number;
  displayHeight: number;
  cellWidth: number;
  cellHeight: number;
  gridMargin: number;
  contentScale: number;
}

function coercePositiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

export function resolveDisplayPreviewMetrics({
  aspectRatio = DEFAULT_DISPLAY_ASPECT_RATIO,
  gridCols = DEFAULT_DISPLAY_GRID_COLS,
  gridRows = DEFAULT_DISPLAY_GRID_ROWS,
  displayWidth,
  displayHeight,
  referenceHeight = DISPLAY_REFERENCE_HEIGHT,
}: DisplayPreviewMetricsInput = {}): DisplayPreviewMetrics {
  const normalizedAspectRatio = coercePositiveNumber(
    aspectRatio,
    DEFAULT_DISPLAY_ASPECT_RATIO,
  );
  const normalizedGridCols = Math.max(
    1,
    Math.round(coercePositiveNumber(gridCols, DEFAULT_DISPLAY_GRID_COLS)),
  );
  const normalizedGridRows = Math.max(
    1,
    Math.round(coercePositiveNumber(gridRows, DEFAULT_DISPLAY_GRID_ROWS)),
  );
  const normalizedReferenceHeight = coercePositiveNumber(
    referenceHeight,
    DISPLAY_REFERENCE_HEIGHT,
  );

  let resolvedWidth =
    typeof displayWidth === 'number' && Number.isFinite(displayWidth) && displayWidth > 0
      ? displayWidth
      : 0;
  let resolvedHeight =
    typeof displayHeight === 'number' && Number.isFinite(displayHeight) && displayHeight > 0
      ? displayHeight
      : 0;

  if (resolvedWidth > 0 && resolvedHeight <= 0) {
    resolvedHeight = resolvedWidth / normalizedAspectRatio;
  } else if (resolvedHeight > 0 && resolvedWidth <= 0) {
    resolvedWidth = resolvedHeight * normalizedAspectRatio;
  } else if (resolvedWidth <= 0 && resolvedHeight <= 0) {
    resolvedHeight = normalizedReferenceHeight;
    resolvedWidth = resolvedHeight * normalizedAspectRatio;
  }

  const cellWidth = resolvedWidth / normalizedGridCols;
  const cellHeight = resolvedHeight / normalizedGridRows;

  return {
    aspectRatio: normalizedAspectRatio,
    gridCols: normalizedGridCols,
    gridRows: normalizedGridRows,
    displayWidth: resolvedWidth,
    displayHeight: resolvedHeight,
    cellWidth,
    cellHeight,
    gridMargin: Math.max(2, Math.round(resolvedHeight * 0.0075)),
    contentScale: resolvedHeight / normalizedReferenceHeight,
  };
}

export function resolveDisplayPreviewMetricsForCellHeight({
  previewCellHeight,
  gridRows = DEFAULT_DISPLAY_GRID_ROWS,
  ...rest
}: DisplayPreviewMetricsForCellHeightInput): DisplayPreviewMetrics {
  const normalizedGridRows = Math.max(
    1,
    Math.round(coercePositiveNumber(gridRows, DEFAULT_DISPLAY_GRID_ROWS)),
  );
  const normalizedPreviewCellHeight = coercePositiveNumber(
    previewCellHeight,
    DISPLAY_REFERENCE_HEIGHT / normalizedGridRows,
  );

  return resolveDisplayPreviewMetrics({
    ...rest,
    gridRows: normalizedGridRows,
    displayHeight: normalizedPreviewCellHeight * normalizedGridRows,
  });
}

export function getContentScaleStyle(contentScale: number): CSSProperties {
  return {
    transform: `scale(${contentScale})`,
    transformOrigin: 'top left',
    width: `${100 / contentScale}%`,
    height: `${100 / contentScale}%`,
  };
}
