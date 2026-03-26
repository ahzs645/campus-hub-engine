// === Core Components ===
export { DisplayRenderer } from './components/DisplayRenderer';
export { Configurator } from './components/Configurator';
export { default as WidgetRenderer } from './components/WidgetRenderer';
export { default as WidgetEditDialog, type ContentSource } from './components/WidgetEditDialog';
export { default as GridStackWrapper, type GridStackItem, type GridStackWrapperRef } from './components/GridStackWrapper';

// === Re-export SDK (backward compatibility) ===
export {
  // Widget Registry
  registerWidget,
  getWidget,
  getAllWidgets,
  getWidgetComponent,
  registerWidgetLoader,
  getWidgetLoader,
  getAllWidgetLoaders,
  type WidgetDefinition,
  type WidgetComponentProps,
  type WidgetOptionsProps,
  // Data Utilities
  fetchJsonWithCache,
  fetchTextWithCache,
  buildCacheKey,
  buildProxyUrl,
  isEntryFresh,
  // Feeds
  parseICal,
  parseRss,
  // Hooks
  useFitScale,
  useAdaptiveFitScale,
  useEvents,
  type CalendarEvent,
  type UseEventsOptions,
  // Icon Names
  type IconName,
  // Components
  AppIcon,
  FormInput,
  FormSelect,
  FormSwitch,
  FormStepper,
} from '@firstform/campus-hub-widget-sdk';

// === Config Types & Utilities ===
export {
  DEFAULT_CONFIG,
  normalizeConfig,
  isWidgetInBounds,
  filterInBoundsLayout,
  type DisplayConfig,
  type WidgetConfig,
  type LogoConfig,
  type ShareUrlMode,
} from './lib/config';

export {
  buildConfigThumbnailSvg,
  generateConfigThumbnailDataUri,
} from './lib/config-thumbnail';

// === Display Widget Components (lazy loaded) ===
export {
  DISPLAY_WIDGET_COMPONENTS,
  preloadDisplayWidgetComponent,
} from './lib/display-widget-components';

// === Widget Tags ===
export { getWidgetTags, ALL_TAGS, WIDGET_TAGS } from './lib/widget-tags';
