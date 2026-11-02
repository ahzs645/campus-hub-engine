'use client';
/**
 * DisplayRenderer — The main component for rendering a campus-hub display.
 *
 * Consumers pass a DisplayConfig and this component renders the full
 * widget grid layout. No iframe needed.
 *
 * Usage:
 *   import { DisplayRenderer } from '@firstform/campus-hub-engine'
 *   <DisplayRenderer config={config} />
 */
import { useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { VisibilitySignal } from '@firstform/campus-hub-widget-sdk';
import type { LogoConfig, WidgetConfig } from '../lib/config';
import { normalizeConfig, DEFAULT_CONFIG } from '../lib/config';
import { useWidgetVisibility } from '../lib/widget-visibility';
import WidgetRenderer from './WidgetRenderer';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface DisplayRendererProps {
  /** The display configuration to render */
  config: unknown;
  /** Optional CSS class for the outer container */
  className?: string;
  /**
   * Reference width for scaling (default 1920). The reference height follows
   * from the config's aspect ratio.
   */
  designWidth?: number;
  /** Runtime signals. Undefined keeps all widgets visible for editing/previews. */
  visibilitySignals?: readonly VisibilitySignal[];
}

export function DisplayRenderer({
  config: rawConfig,
  className,
  designWidth = 1920,
  visibilitySignals,
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
      // Layout size (offsetWidth/Height) ignores CSS transforms on ancestors,
      // so a rotated or scaled wrapper doesn't corrupt the fit calculation.
      let width = container.offsetWidth;
      let height = container.offsetHeight;

      if ((width <= 0 || height <= 0) && container.parentElement) {
        const parent = container.parentElement;
        width = width > 0 ? width : parent.offsetWidth;
        height = height > 0 ? height : parent.offsetHeight;
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
  const widgetVisibility = useWidgetVisibility(
    config.layout,
    visibilitySignals,
  );

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
        <div
          data-coming-soon-veil={config.comingSoon ? 'true' : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            ...(config.comingSoon
              ? { filter: 'blur(8px) grayscale(1)', pointerEvents: 'none', userSelect: 'none' }
              : null),
          }}
        >
        {config.layout.map((widget: WidgetConfig, index) => {
          const visible =
            widgetVisibility.get(widget.id) ??
            (visibilitySignals === undefined || !widget.visibilityCondition);
          return (
            <div
              key={widget.id}
              style={{
                position: 'absolute',
                zIndex: widget.zIndex ?? index,
                left: widget.x * cellWidth,
                top: widget.y * cellHeight,
                width: widget.w * cellWidth,
                height: widget.h * cellHeight,
                padding: 4,
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? 'auto' : 'none',
                visibility: visible ? 'visible' : 'hidden',
              }}
            >
              {/* Hidden widgets are unmounted, not just CSS-hidden: autoplaying
                  audio/video and data polling must stop while a visibility
                  condition holds the widget off-screen. Reveal remounts the
                  widget fresh. */}
              {visible ? (
                <WidgetRenderer
                  widget={widget}
                  theme={config.theme}
                />
              ) : null}
            </div>
          );
        })}
        </div>
        {config.comingSoon && (
          <ComingSoonOverlay theme={config.theme} logo={config.logo} />
        )}
      </div>
    </div>
  );
}

function logoSrc(logo: LogoConfig): string {
  // Raw SVG is rendered through <img>, which never runs scripts or loads
  // external resources from inside the SVG.
  return logo.type === 'svg'
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo.value)}`
    : logo.value;
}

/** Display-level "Coming Soon" holding screen over the blurred layout. */
function ComingSoonOverlay({
  theme,
  logo,
}: {
  theme: { primary: string; accent: string; background: string };
  logo?: LogoConfig;
}) {
  return (
    <div
      role="status"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      {logo?.value && (
        <img
          src={logoSrc(logo)}
          alt=""
          style={{ maxWidth: '30%', maxHeight: 180, objectFit: 'contain' }}
        />
      )}
      <span
        style={{
          color: theme.accent,
          backgroundColor: `${theme.primary}80`,
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          padding: '16px 40px',
          borderRadius: 24,
        }}
      >
        Coming Soon
      </span>
    </div>
  );
}
