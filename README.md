# @firstform/campus-hub-engine

Rendering engine for Campus Hub displays: turns a display config (a grid
layout of widgets plus a theme) into a scaled, live display, and provides the
grid primitives the editor builds on.

Widgets themselves come from widget packages built with
[`@firstform/campus-hub-widget-sdk`](https://github.com/ahzs645/campus-hub-widget-sdk),
which the host installs. The engine never depends on a widget package.

## Usage

```tsx
import { DisplayRenderer } from '@firstform/campus-hub-engine';

<DisplayRenderer config={displayConfig} visibilitySignals={signals} />;
```

| Export | Purpose |
| --- | --- |
| `DisplayRenderer` | Full display: scales the design canvas (`designWidth`, default 1920, height from the config's aspect ratio) to its container, positions widgets, applies visibility conditions and the display-level "Coming Soon" holding screen. |
| `WidgetRenderer` | One widget cell. Each widget is isolated by `WidgetErrorBoundary`: a widget that throws, or whose lazily loaded chunk fails, shows a small "Widget unavailable" tile and is retried after `retryDelayMs` (default 60 s) or as soon as its props change. |
| `WidgetEditDialog`, `WidgetEditPanel`, `WidgetLivePreview` | Per-widget options editing with a live preview. |
| `GridStackWrapper`, `OverlapGridStackEngine` | GridStack integration used by the editor canvas. |
| `normalizeConfig`, `DEFAULT_CONFIG`, `DisplayConfig` | Config types and validation. |
| `DISPLAY_WIDGET_COMPONENTS`, `preloadDisplayWidgetComponent`, `invalidateDisplayWidgetComponent` | Lazy widget component resolution from the SDK registry. |

`@firstform/campus-hub-engine/src/widgets` (aliased as
`@firstform/campus-hub-engine/widgets` by the Next.js host) imports the
first-party widget packs for hosts that do not use the SDK's
`campusHubWidgets()` Vite discovery plugin. Hosts using the plugin should not
import it.

## Peer dependencies

The host provides `react`, `react-dom`, `gridstack`, `lucide-react` and the
widget SDK (a single shared instance, because it owns the widget registry).
`socket.io-client` is optional and only loaded when signaling is used.

## Development

Tests and typechecks run with a host's toolchain. From a host checkout such as
`campus-hub-cloud/packages/campus-hub-engine`:

```bash
npm run typecheck
npm test
```

`npm run` puts the host's `node_modules/.bin` on the path and modules resolve
up to the host's `node_modules`, so the host's vitest, React and its single
copy of the widget SDK are used. The package deliberately declares none of
them as dev dependencies: hosts link it with `file:` and install its dev
dependencies, and a second SDK copy would split the widget registry. The SDK
is not published to npm, so there is no standalone install or lockfile. Never
run `npm install` inside a host's `packages/` checkout.
