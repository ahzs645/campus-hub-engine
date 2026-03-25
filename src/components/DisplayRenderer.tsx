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
import { useMemo, useRef, useEffect, useState } from 'react';
import type { DisplayConfig, WidgetConfig } from '../lib/config';
import { normalizeConfig, DEFAULT_CONFIG } from '../lib/config';
import WidgetRenderer from './WidgetRenderer';

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
  const [scale, setScale] = useState(1);

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

  // Responsive scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const scaleX = rect.width / actualDesignWidth;
      const scaleY = rect.height / actualDesignHeight;
      setScale(Math.min(scaleX, scaleY));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
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
        overflow: 'hidden',
        backgroundColor: config.theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: actualDesignWidth,
          height: actualDesignHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
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
