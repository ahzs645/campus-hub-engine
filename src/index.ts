// === Core Components ===
export { DisplayRenderer } from './components/DisplayRenderer';
export { Configurator } from './components/Configurator';
export { default as WidgetRenderer } from './components/WidgetRenderer';
export { default as WidgetEditDialog } from './components/WidgetEditDialog';
export { default as GridStackWrapper } from './components/GridStackWrapper';
export { default as AppIcon } from './components/AppIcon';

// === Widget Registry ===
export {
  registerWidget,
  getWidget,
  getAllWidgets,
  getWidgetComponent,
  type WidgetDefinition,
  type WidgetComponentProps,
  type WidgetOptionsProps,
} from './lib/widget-registry';

// === Config Types & Utilities ===
export {
  DEFAULT_CONFIG,
  normalizeConfig,
  encodeConfig,
  decodeConfig,
  generateShareUrl,
  generateSharePath,
  isWidgetInBounds,
  filterInBoundsLayout,
  type DisplayConfig,
  type WidgetConfig,
  type LogoConfig,
  type ShareUrlMode,
} from './lib/config';

// === Data Utilities ===
export {
  fetchJsonWithCache,
  fetchTextWithCache,
  buildCacheKey,
  buildProxyUrl,
  isEntryFresh,
} from './lib/data-cache';

export { parseICal, parseRss } from './lib/feeds';

// === Display Widget Components (lazy loaded) ===
export {
  DISPLAY_WIDGET_COMPONENTS,
  preloadDisplayWidgetComponent,
} from './lib/display-widget-components';

// === Hooks ===
export { useFitScale, useAdaptiveFitScale } from './hooks/useFitScale';
export { useEvents, type CalendarEvent, type UseEventsOptions } from './hooks/useEvents';

// === Widget Tags ===
export { getWidgetTags, ALL_TAGS, WIDGET_TAGS } from './lib/widget-tags';

// === Icon Names ===
export type { IconName } from './lib/icon-names';

// === UI Form Components ===
export { default as FormInput } from './components/ui/FormInput';
export { default as FormSelect } from './components/ui/FormSelect';
export { default as FormSwitch } from './components/ui/FormSwitch';
export { default as FormStepper } from './components/ui/FormStepper';

// === Side-effect: Register all widgets ===
// Import this to ensure all widgets are registered in the registry
export * as widgetRegistration from './widgets/index';
