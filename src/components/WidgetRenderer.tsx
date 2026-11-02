import { useCallback, useState, type CSSProperties } from 'react';
import {
  DISPLAY_WIDGET_COMPONENTS,
  invalidateDisplayWidgetComponent,
} from '../lib/display-widget-components';
import type { WidgetConfig } from '../lib/config';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface WidgetRendererProps {
  widget: WidgetConfig;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  corsProxy?: string;
  /**
   * Mount and blur the real widget behind the "Coming Soon" veil instead of
   * substituting a static placeholder. Intended for the editor canvas, where
   * the author needs to see and position what they are configuring.
   *
   * Displays leave this off: a blurred widget is unreadable but still pays for
   * its own data polling, animation, and lazily-loaded chunk, and a CSS filter
   * over animating content forces the compositor to re-rasterise it every
   * frame for no one's benefit.
   */
  previewComingSoon?: boolean;
  /**
   * Delay before a widget that threw (or whose chunk failed to load) is
   * retried. Defaults to 60 seconds; 0 disables automatic retries.
   */
  retryDelayMs?: number;
}

function ComingSoonBadge({ theme, veiled }: { theme: WidgetRendererProps['theme']; veiled: boolean }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-xl${veiled ? ' bg-black/40' : ''}`}
    >
      <span
        className="text-lg font-bold tracking-wide uppercase px-4 py-2 rounded-lg"
        style={{ color: theme.accent, backgroundColor: `${theme.primary}80` }}
      >
        Coming Soon
      </span>
    </div>
  );
}

export default function WidgetRenderer({
  widget,
  theme,
  corsProxy,
  previewComingSoon = false,
  retryDelayMs,
}: WidgetRendererProps) {
  // Bumped to remount the error boundary (and re-resolve the lazy component)
  // when a failed widget is retried.
  const [attempt, setAttempt] = useState(0);
  const widgetType = widget.type;
  const retry = useCallback(() => {
    invalidateDisplayWidgetComponent(widgetType);
    setAttempt((current) => current + 1);
  }, [widgetType]);

  const placeholderStyle = {
    borderColor: `${theme.accent}40`,
    backgroundColor: `${theme.primary}20`,
  };

  // Resolving the component from the registry is what triggers its lazy chunk
  // load, so a placeholder-only render must not touch it.
  if (widget.comingSoon && !previewComingSoon) {
    return (
      <div
        className="h-full w-full relative rounded-2xl border-2 border-dashed"
        style={placeholderStyle}
      >
        <ComingSoonBadge theme={theme} veiled={false} />
      </div>
    );
  }

  const Component = DISPLAY_WIDGET_COMPONENTS[widget.type];

  if (!Component) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center border-2 border-dashed"
        style={placeholderStyle}
      >
        <span className="text-white/50 text-sm">Unknown widget: {widget.type}</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative" style={{ '--widget-theme-tint': `${theme.primary}18` } as CSSProperties}>
      <div className={widget.comingSoon ? 'h-full w-full blur-sm grayscale pointer-events-none select-none' : 'h-full w-full'}>
        <WidgetErrorBoundary
          key={attempt}
          widgetType={widget.type}
          theme={theme}
          resetKey={widget.props}
          retryDelayMs={retryDelayMs}
          onRetry={retry}
        >
          <Component config={widget.props} theme={theme} corsProxy={corsProxy} />
        </WidgetErrorBoundary>
      </div>
      {widget.comingSoon && <ComingSoonBadge theme={theme} veiled />}
    </div>
  );
}
