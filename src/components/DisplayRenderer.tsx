'use client';
/**
 * DisplayRenderer — The main component for rendering a campus-hub display.
 *
 * Consumers pass a DisplayConfig and this component renders the full
 * widget grid layout. No iframe needed.
 *
 * Usage:
 *   import { DisplayRenderer } from '@campus-hub/engine'
 *   <DisplayRenderer config={config} />
 */
import { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { DisplayConfig, WidgetConfig } from '../lib/config';
import { normalizeConfig, DEFAULT_CONFIG } from '../lib/config';
import WidgetRenderer from './WidgetRenderer';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface DisplayRendererProps {
  /** The display configuration to render */
  config: DisplayConfig | null | undefined;
  /** Optional CSS class for the outer container */
  className?: string;
  /** Reference width for scaling (default 1920) */
  designWidth?: number;
  /** Reference height for scaling (default 1080) */
  designHeight?: number;
}

export function DisplayRenderer({
  config: rawConfig,
  className,
  designWidth = 1920,
  designHeight = 1080,
}: DisplayRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  const config = useMemo(
    () => (rawConfig ? normalizeConfig(rawConfig) : DEFAULT_CONFIG),
    [rawConfig]
  );

  const gridCols = config.gridCols ?? 12;
  const gridRows = config.gridRows ?? 8;
  const aspectRatio = config.aspectRatio ?? 16 / 9;

  // Derive actual design dimensions from the aspect ratio
  const actualDesignWidth = designWidth;
  const actualDesignHeight = Math.round(designWidth / aspectRatio);

  // Responsive scaling — measure before paint to avoid a 1:1 → scaled flash
  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;

      if ((width <= 0 || height <= 0) && container.parentElement) {
        const parentRect = container.parentElement.getBoundingClientRect();
        width = width > 0 ? width : parentRect.width;
        height = height > 0 ? height : parentRect.height;
      }

      if (width <= 0 || height <= 0) return;

      const scaleX = width / actualDesignWidth;
      const scaleY = height / actualDesignHeight;
      const nextScale = Math.min(scaleX, scaleY);
      setScale((currentScale) =>
        currentScale !== null && Math.abs(currentScale - nextScale) < 0.0001
          ? currentScale
          : nextScale
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    if (container.parentElement) {
      observer.observe(container.parentElement);
    }
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [actualDesignWidth, actualDesignHeight]);

  const cellWidth = actualDesignWidth / gridCols;
  const cellHeight = actualDesignHeight / gridRows;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        aspectRatio,
        overflow: 'hidden',
        backgroundColor: config.theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: actualDesignWidth,
          height: actualDesignHeight,
          transform: `scale(${scale ?? 0})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          visibility: scale === null ? 'hidden' : 'visible',
        }}
      >
        {config.layout.map((widget: WidgetConfig) => (
          <div
            key={widget.id}
            style={{
              position: 'absolute',
              left: widget.x * cellWidth,
              top: widget.y * cellHeight,
              width: widget.w * cellWidth,
              height: widget.h * cellHeight,
              padding: 4,
            }}
          >
            <WidgetRenderer
              widget={widget}
              theme={config.theme}

            />
          </div>
        ))}
      </div>
    </div>
  );
}
