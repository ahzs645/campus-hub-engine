'use client';
import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import {
  AppIcon,
  getWidget,
  OptionsPreview,
  type IconName,
} from '@firstform/campus-hub-widget-sdk';
import { useEngineTheme, type EngineTheme } from '../lib/ThemeContext';
import {
  DEFAULT_DISPLAY_ASPECT_RATIO,
  DEFAULT_DISPLAY_GRID_COLS,
  DEFAULT_DISPLAY_GRID_ROWS,
  DISPLAY_REFERENCE_HEIGHT,
  getContentScaleStyle,
} from '../lib/display-preview';

/**
 * Widgets the editor stands down to a static card instead of previewing live,
 * because a preview would mean loading someone else's page, video or audio
 * stream into a 300px box every time the options form is opened.
 *
 * This list is the editor's own policy and deliberately lives here rather than
 * on each widget: a widget should never have to know it is being previewed.
 */
const STATIC_PREVIEW_TYPES = new Set([
  'canva',
  'google-sheets',
  'media-player',
  'powerpoint',
  'radio-station',
  'stream-player',
  'web',
  'web-region',
  'youtube',
]);

const MIN_STAGE_HEIGHT = 96;
const MAX_STAGE_HEIGHT = 260;
/** Used until the frame reports a width (first paint, or no ResizeObserver). */
const FALLBACK_FRAME_WIDTH = 320;

/** Widget aspect ratio in cells, converted to pixels on a reference display. */
function stageAspectRatio(defaultW: number, defaultH: number): number {
  const cellWidth =
    (DISPLAY_REFERENCE_HEIGHT * DEFAULT_DISPLAY_ASPECT_RATIO) / DEFAULT_DISPLAY_GRID_COLS;
  const cellHeight = DISPLAY_REFERENCE_HEIGHT / DEFAULT_DISPLAY_GRID_ROWS;
  const width = Math.max(1, defaultW) * cellWidth;
  const height = Math.max(1, defaultH) * cellHeight;
  return width / height;
}

/**
 * A widget that throws must not take the options form down with it — the whole
 * point of the preview is to edit options until the widget stops throwing.
 */
class PreviewErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // Editing an option is the user's attempt at a fix; give it another go.
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[widget preview] render failed', error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function PreviewNotice({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-[var(--ui-text-muted)]">
      <AppIcon name={icon} className="h-6 w-6 opacity-60" />
      <p className="max-w-[28ch] text-xs">{children}</p>
    </div>
  );
}

export interface WidgetLivePreviewProps {
  widgetType: string;
  /** Live form state, so the preview tracks edits as they are made. */
  data: Record<string, unknown>;
  /** Falls back to the surrounding EngineThemeProvider. */
  theme?: EngineTheme;
}

/**
 * The editor's one preview: renders the real widget with the options currently
 * in the form, scaled down the way the canvas scales it.
 *
 * It replaces the hand-written mock-ups widgets used to carry in their own
 * options UIs — those only ever approximated the widget, drifted from it, and
 * existed for barely half the catalogue.
 */
export function WidgetLivePreview({ widgetType, data, theme }: WidgetLivePreviewProps) {
  const contextTheme = useEngineTheme();
  const resolvedTheme = theme ?? contextTheme;
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => setFrameWidth(frame.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const widgetDef = getWidget(widgetType);
  if (!widgetDef) return null;

  const isStatic = STATIC_PREVIEW_TYPES.has(widgetType);
  const aspect = stageAspectRatio(widgetDef.defaultW, widgetDef.defaultH);
  const availableWidth = frameWidth || FALLBACK_FRAME_WIDTH;
  const stageHeight = Math.min(
    MAX_STAGE_HEIGHT,
    Math.max(MIN_STAGE_HEIGHT, availableWidth / aspect),
  );
  const stageWidth = Math.min(availableWidth, stageHeight * aspect);
  // The widget renders at reference-display size and is scaled into the stage,
  // so its own fit-to-size hooks see the dimensions they would get on a screen.
  const contentScale =
    (stageHeight * DEFAULT_DISPLAY_GRID_ROWS) /
    Math.max(1, widgetDef.defaultH) /
    DISPLAY_REFERENCE_HEIGHT;

  const WidgetComponent = widgetDef.component;

  return (
    <OptionsPreview>
      <div ref={frameRef} className="flex w-full justify-center">
        {isStatic ? (
          <PreviewNotice icon={widgetDef.icon}>
            {widgetDef.name} plays external content, so it is previewed on the
            canvas rather than here.
          </PreviewNotice>
        ) : stageWidth > 0 ? (
          <div
            // Non-interactive: this is a picture of the widget, not a copy of
            // it to click on.
            className="pointer-events-none overflow-hidden rounded-lg"
            style={{
              width: stageWidth,
              height: stageHeight,
              backgroundColor: `${resolvedTheme.primary}40`,
            }}
          >
            <PreviewErrorBoundary
              resetKey={JSON.stringify(data)}
              fallback={
                <PreviewNotice icon="warning">
                  This widget could not render with the options above.
                </PreviewNotice>
              }
            >
              <Suspense fallback={null}>
                <div style={getContentScaleStyle(contentScale)}>
                  <WidgetComponent config={data} theme={resolvedTheme} />
                </div>
              </Suspense>
            </PreviewErrorBoundary>
          </div>
        ) : null}
      </div>
    </OptionsPreview>
  );
}

export default WidgetLivePreview;
