import { lazy, Suspense, type ComponentType } from 'react';
import type { WidgetComponentProps } from '@firstform/campus-hub-widget-sdk';
import { getWidgetLoader, getAllWidgetLoaders } from '@firstform/campus-hub-widget-sdk';

type DisplayWidgetComponent = ComponentType<WidgetComponentProps>;

function WidgetLoadingFallback() {
  return <div className="h-full w-full" />;
}

// Create React.lazy wrappers for each widget
const lazyCache = new Map<string, DisplayWidgetComponent>();

function getLazyWidget(type: string): DisplayWidgetComponent | undefined {
  if (lazyCache.has(type)) return lazyCache.get(type)!;

  const loader = getWidgetLoader(type);
  if (!loader) return undefined;

  const LazyComponent = lazy(loader);

  // Wrap with Suspense
  const WrappedComponent: DisplayWidgetComponent = (props) => (
    <Suspense fallback={<WidgetLoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  lazyCache.set(type, WrappedComponent);
  return WrappedComponent;
}

// Proxy object that lazily creates components on access
export const DISPLAY_WIDGET_COMPONENTS: Record<string, DisplayWidgetComponent> = new Proxy(
  {} as Record<string, DisplayWidgetComponent>,
  {
    get(_target, prop: string) {
      return getLazyWidget(prop);
    },
    has(_target, prop: string) {
      return !!getWidgetLoader(prop);
    },
    ownKeys() {
      return Array.from(getAllWidgetLoaders().keys());
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (getWidgetLoader(prop)) {
        return { configurable: true, enumerable: true };
      }
      return undefined;
    },
  }
);

export function preloadDisplayWidgetComponent(type: string): void {
  const loader = getWidgetLoader(type);
  if (!loader) return;
  void loader();
}
