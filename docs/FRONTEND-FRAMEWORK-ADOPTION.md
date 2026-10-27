# Adopting VtWebGuiFramework: summary and before/after

Owner decisions of 27 Oct 2026 (DECISIONS A68):

- framework tokens in full, which reverses the same-day rollback to navy `#0c1b37`;
- framework density as shipped;
- the framework's JSX/SCSS components vendored;
- the work committed on `codex/stage3-reporting-configuration`.

Supporting documents: [FRONTEND-ARCHITECTURE.md](FRONTEND-ARCHITECTURE.md) (architecture and handover), [FRONTEND-MIGRATION-CHECKLIST.md](FRONTEND-MIGRATION-CHECKLIST.md) and [FRONTEND-VALIDATION-REPORT.md](FRONTEND-VALIDATION-REPORT.md).

## What the framework is

VtWebGuiFramework is **both an app template and a component library**.

- **App template.** A webpack/Babel React 18 app in plain JavaScript. A frame (header, primary menu, first and second sidebars, main toolbar, footer, modal windows, notifications) is driven by a Redux store loaded from `config.xml`. It adds i18n with XML language files and RTL support, WebSocket middleware and an Electron desktop build.
- **Component library.** About 40 components (controls, layouts, indicators, popups, helpers) written as JSX with SCSS modules. Their tokens are read from a JS file through a Sass importer. VtWebGuiIcons supplies 366 single-path icons.

The components need the framework's store (i18n, RTL, the viewport and a few frame actions), its webpack module roots and loaders, and `enumify` and `prop-types`.

## How it was adopted

| Area | Adoption |
|---|---|
| Source | Both packages vendored unmodified (`src/web/vendor`, with versions and hashes in `VENDOR.md`). The zips were treated as untrusted: extracted entry by entry into empty folders, with their bundled `node_modules`, binaries and `.git` folders left out. |
| Build | `vt-framework.ts` reproduces the framework's webpack setup in Vite for the vendored files only: module roots, SCSS modules, the JS-token Sass importer, JSX in `.js`, CommonJS token files and SVG components. |
| Packages added | `prop-types` 15.8.1 and `enumify` 2.0.0 (runtime, required by the framework); `sass` 1.77.8 (build). The framework's Redux, react-redux, toolkit and hash-link dependencies are covered by small shims instead of packages. |
| Tokens | `tokens.scss` generates every hub custom property from the framework defines through the framework's own Sass functions. |
| Typography | The framework's Open Sans, Noto Sans Arabic and Source Code Pro fonts; 17 px root; framework type sets for titles, labels, hints and values. The `@fontsource/open-sans` package was removed. |
| Frame | Header, logo, primary links with marker, secondary links, first sidebar with title, entries and bulge marker, main toolbar slot and footer, all rendered with the frame's own CSS modules. The hub keeps its permission-driven navigation model. |
| Components | Vendored TabBar, StatusMarker, ValueField and Spinner are in use, with the VtWebGuiIcons set and the official VITRONIC logo. Buttons, inputs, selects, check boxes and tables stay native and are styled to the RaisedButton, FlatButton, Input, SelectBox and table specifications. The architecture document gives the reason for each. |
| Layout | Pages keep their structure (main toolbar, then sections, tables, forms and tabs). Section sidebars are kept, as the framework's first sidebar. |
| Charts | Series, status and ramp colours moved to the framework palette. The chart semantics (text labels, table views, drill-downs) are unchanged. |
| Behaviour | No page logic, API call, permission check, route or text was changed by the adoption. One fix was needed because the framework frame scrolls the main scope rather than the window: the dashboard's section tracker. |

## Before and after

| | Before (2.33.1) | After (2.34 candidate) |
|---|---|---|
| Visual basis | Hand-built from a VITS screenshot ("Wanted Plate Management") | VtWebGuiFramework 3.6.1, the organization's GUI framework |
| Primary colour | Navy `#0c1b37` (estimated from the screenshot) | `#001e46` (framework primary, VITRONIC CI) |
| Footer | Navy status bar | primaryMidnight `#00122b` framework footer |
| Canvas / surfaces | `#e8e9eb` / white | lightGray `#e8ebed` / offWhite `#fafbfc` |
| Root and body text | 16 px root, 13 px body | 17 px root, 0.85rem (14.45 px) body |
| Header / title strip / sidebar | 34 px / 46 px / 168 px | 46 px / 60 px main toolbar / 180 px first sidebar |
| Controls | 26–28 px, 2 px radius, boxed inputs | 28 px, no radius, uppercase raised and flat buttons, underline inputs with impulseGreen hover and focus lines |
| Active navigation | Light tab block; a navy dot on the sidebar edge | Framework marker block under the primary link; framework bulge marker with a dot in the first sidebar |
| Tabs | Hub buttons with an underline | Framework TabBar (marker line, scroll buttons) |
| Status | Dot badges in custom colours | Framework StatusMarker glyphs in calmingGreen, attentionHigh and signalError |
| KPIs | Custom number styles | Framework ValueField |
| Icons | 33 hand-drawn outline icons | VtWebGuiIcons, 366 filled icons |
| Logo | Neutral placeholder mark plus the "VITRONIC" text (A15) | The official logo shipped with the framework |
| Fonts | `@fontsource/open-sans` | Framework font files |
| Styles | `tokens.css` + one 881-line `app.css` | `tokens.scss` (generated from the framework), `kit.scss`, `frame.scss`, and `app.css` for page-level rules only |
| Functionality | 67 routes, about 100 dialogs, about 85 tables | Unchanged |

## Known deviations from the framework (deliberate)

- Page and section titles are `<h1>` and `<h2>` elements carrying the framework's title type sets. The framework renders them as `<span>`s.
- Native buttons, form controls and tables replace the framework's div-based widgets, as explained in the architecture document.
- The TabBar wrapper adds `aria-selected` and keyboard activation.
- First-sidebar sub-items are always shown, instead of the framework's expand-on-active behaviour, so that every page stays reachable in one click.
- No burger or mega menu: primary links scroll horizontally on narrow screens, and the first sidebar becomes a drawer below 900 px.
- English only and left-to-right, because the hub has no i18n requirement. The framework's i18n helpers are wired in, so other languages could be added.
