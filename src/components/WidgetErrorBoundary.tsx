'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';

/** How long a failed widget waits before trying to render (and load) again. */
export const DEFAULT_WIDGET_RETRY_DELAY_MS = 60_000;

interface WidgetErrorBoundaryProps {
  /** Widget type, used for the log line and the failed tile's label. */
  widgetType: string;
  theme: { primary: string; accent: string; background: string };
  /**
   * When this value changes (e.g. the widget's props were edited), a failed
   * widget is retried immediately instead of waiting for the timer.
   */
  resetKey?: unknown;
  /** Delay before an automatic retry. 0 or less disables automatic retries. */
  retryDelayMs?: number;
  /**
   * Called when the retry timer fires. The owner should drop any cached lazy
   * component for the widget and remount this boundary.
   */
  onRetry: () => void;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  error: Error | null;
}

/**
 * Isolates one widget on a display. A widget that throws while rendering, or
 * whose lazily-loaded chunk fails to load, shows a small failed tile in its own
 * cell instead of unmounting the whole display, and is retried after a delay.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { error: null };

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(error: unknown): WidgetErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      `[campus-hub-engine] widget "${this.props.widgetType}" failed to render`,
      error,
      info.componentStack,
    );
    this.scheduleRetry();
  }

  componentDidUpdate(previous: WidgetErrorBoundaryProps): void {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.clearRetry();
      this.props.onRetry();
    }
  }

  componentWillUnmount(): void {
    this.clearRetry();
  }

  private scheduleRetry(): void {
    this.clearRetry();
    const delay = this.props.retryDelayMs ?? DEFAULT_WIDGET_RETRY_DELAY_MS;
    if (!(delay > 0)) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.props.onRetry();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    const { theme, widgetType } = this.props;
    return (
      <div
        role="status"
        data-widget-error={widgetType}
        className="h-full w-full flex items-center justify-center rounded-2xl border border-dashed p-2 text-center"
        style={{ borderColor: `${theme.accent}30`, backgroundColor: `${theme.primary}14` }}
      >
        <span className="text-xs text-white/40">Widget unavailable</span>
      </div>
    );
  }
}

export default WidgetErrorBoundary;
