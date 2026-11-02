// Widget Registry Index - Import all widget packages to register them
//
// Convenience entry for hosts without the SDK's `campusHubWidgets()` Vite
// discovery plugin (the Next.js campus-hub app aliases
// `@firstform/campus-hub-engine/widgets` to this file). The widget packages
// are supplied by that host and are not dependencies of the engine; hosts using
// the discovery plugin should not import this file.

// Import widget packages (side-effect: triggers registerWidget + registerWidgetLoader calls)
import '@firstform/campus-hub-widgets-time';
import '@firstform/campus-hub-widgets-media';
import '@firstform/campus-hub-widgets-campus';
import '@firstform/campus-hub-widgets-environment';
import '@firstform/campus-hub-widgets-info';
import '@firstform/campus-hub-widgets-fun';
import '@firstform/campus-hub-widgets-transit';
import '@firstform/campus-hub-widgets-utility';

// Re-export registry functions
export { getWidget, getAllWidgets, getWidgetComponent } from '@firstform/campus-hub-widget-sdk';

// Re-export widget-specific exports used by consumers
export { NOTHING_GLYPH_MODES } from '@firstform/campus-hub-widgets-fun';
