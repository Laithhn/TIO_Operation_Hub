# Frontend architecture and developer handover

Release 2.34 (candidate) rebuilds the frontend on the organization's frontend framework, **VtWebGuiFramework 3.6.1** with **VtWebGuiIcons 2.4.0**. The owner decided this on 27 Oct 2026 (DECISIONS **A68**): framework tokens in full, framework density as shipped, and the framework's JSX/SCSS components vendored.

The stack (React 18, TypeScript, Vite 7, TanStack Query and React Router 7) is unchanged. So are the API contracts, the data layer, permissions and the backend.

## Layers

```
src/web
├─ vendor/                       VtWebGuiFramework + VtWebGuiIcons sources, unmodified (VENDOR.md)
├─ vt-framework.ts               Vite integration of the vendored sources (plugin + config fragment)
├─ vite.config.ts                merges vtConfig(), registers vtFramework()
└─ src/
   ├─ vt/                        the framework seam
   │  ├─ index.ts                typed facade: Button, TabBar, Section, MainToolbar, ValueField, StatusMarker, Spinner, Icon set, logo …
   │  ├─ framework.d.ts          module declarations for "@vt/*" (the framework is plain JS)
   │  ├─ frame.tsx               frame building blocks rendered with the frame's own CSS modules
   │  └─ shims/                  store, react-redux, @reduxjs/toolkit (nanoid), react-router-hash-link stand-ins
   ├─ styles/
   │  ├─ tokens.scss             CSS custom properties generated from the framework defines (single source of values)
   │  ├─ kit.scss                shared component styles after the framework controls (buttons, inputs, sections, tables …)
   │  ├─ frame.scss              frame grid areas, drawer, header controls, footer line
   │  └─ app.css                 page-level styles (dashboard, charts, module pages) on the tokens
   ├─ ui/
   │  ├─ Shell.tsx               the application frame: navigation model (SECTIONS) + framework frame markup
   │  ├─ kit.tsx                 hub kit (PageHead → main toolbar, Panel, DataTable, Tabs → TabBar, Badge → StatusMarker …)
   │  ├─ charts.tsx              charts and KPI tiles (Kpi → ValueField), framework palette
   │  └─ Icon.tsx                semantic icon names → VtWebGuiIcons; the official VITRONIC logo
   ├─ pages/*                    feature pages (unchanged behaviour; they consume the kit)
   └─ api.ts, hooks.ts, permissions.ts, format.ts   data layer (unchanged)
```

Global styles load in `main.tsx` in this order:

1. The framework base sheet: fonts, reset and `html { font-size: 17px }`, imported through `./vt`.
2. `tokens.scss`.
3. `kit.scss`.
4. `app.css`.
5. `frame.scss`.

## How the vendored framework is built

`vt-framework.ts` reproduces the framework's webpack setup for the vendored files only. Importers outside `vendor/` and `src/vt/shims` are never affected.

- **Specifiers.** `@vt/...` maps to `vendor/vt-web-gui-framework/src/...`, and `@vt/icons/...` to `vendor/vt-web-gui-icons/...`. Framework module roots (`assets/`, `components/`, `utils/`, `desktopApp`, `VtWebGuiIcons`) resolve only for vendored importers. The bare `store`, `react-redux`, `@reduxjs/toolkit` and `react-router-hash-link` resolve to `src/vt/shims`.
- **SCSS** imported by vendored files, or by the hub through `@vt/...`, is a CSS module named `<file>__<local>__<hash5>`, as in the framework's development build. The framework's global sheet (`assets/styles/index.scss`) stays global.
- **`@use "x.js"`** in framework SCSS is served by a Sass importer that evaluates the CommonJS token file (`assets/defines/index.js`, `components/**/defines.js`) in Node and emits Sass maps. This is the behaviour of `@indigotree/dart-sass-json-importer`.
- **JavaScript.** Vendored `.js` files are compiled with esbuild's `jsx` loader. CommonJS token files are rewritten to ESM at build time. `.svg` imports become React components (svg-react-loader).
- **Defines.** `process.env.ELEM_ID_TEMP` is `viTemporaries`; `index.html` provides that element, where popups are portalled. `DESKTOP_APP` is `false`.

The store shim provides English (the framework's own `dateTime.en.xml` and `common.en.xml` tables, its `translateText`/`translateDate`), left-to-right layout and the viewport width. Main-scope and menu actions are no-ops.

## The frame

`ui/Shell.tsx` keeps the hub's navigation model (`SECTIONS`, with permission predicates per section and item) and renders the framework frame with the frame's CSS modules (`src/vt/frame.tsx`):

| Frame part | Framework source | Hub detail |
|---|---|---|
| App grid | `frame/app/app.scss` | Grid areas in `frame.scss` (`.with-sidebar` / `.bare`), as computed by the framework App |
| Header | `frame/header`, `logo` | Official logo; the drawer button below 900 px |
| Primary links | `primaryHeader/primaryLinks`, `primaryLink`, `marker` | Sections the user may see; `aria-current="page"`; a light marker block measured under the active link |
| Secondary header | `secondaryHeader`, `secondaryLink` | Dev-user switch (development only), "+ New", search (/ or Ctrl+K), notifications, account, sign-out |
| First sidebar | `sidebars/firstSidebar`, `title`, `primarySubmenu`, `entry`, `marker` | Section items and sub-items with framework icons; the bulge-and-dot marker at the active item; collapse button; off-canvas drawer below 900 px |
| Main toolbar | `components/layouts/mainToolbar` (slot `#viMainToolbar`) | `PageHead` portals title, sub-title, breadcrumbs and actions into the slot; the title stays an `<h1>` |
| Main scope | `frame/mainScope` | Dashboard background; it scrolls (the framework app is a fixed full-window grid) |
| Footer | `frame/footer` | © VITRONIC, product and version, user, environment badge, display time zone, server status |

`Shell` renders page content only after its first layout (`framed`), because the main toolbar portal needs its slot in the DOM.

## Kit to framework mapping

| Hub kit | Framework | Notes |
|---|---|---|
| `PageHead` | MainToolbar slot and title set | Semantic `<h1>`; breadcrumbs in the toolbar |
| `Panel` | Section with toolbar title set | `<section>` + `<h2>` (the framework titles are spans; headings are kept for screen readers and tests) |
| `Tabs` | **TabBar / TabBarTitleItem (vendored)** | The wrapper adds `aria-selected` and Enter/Space activation, which the framework item lacks |
| `Badge`, `StatusBadge`, `ConditionBadge`, `FreshnessBadge` | **StatusMarker (vendored)** + text | OK / warning / error glyphs; informational and neutral states use a dot |
| `Kpi` (charts) | **ValueField (vendored)** | Title, XL/XXL value and signal colour; the tile keeps link semantics and the meter |
| `StateMessage` loading | **Spinner (vendored)** | |
| `Icon` | **VtWebGuiIcons** (366 icons) | Semantic names mapped in `ui/Icon.tsx`; framework names work directly |
| Buttons (`.btn`, `.btn-primary`, `.linkbtn`) | RaisedButton / FlatButton look | Native `<button>`: form submit, `disabled`, focus |
| Inputs (`.input`, selects, text areas) | Input / SelectBox underline control and notices | Native elements: labels, `selectOption`, autocomplete, password managers |
| `DataTable`, `Pager` | nativeElements table + DataTable header cells | Native `<table>`: sort, filter popovers, `aria-sort`, CSV export |
| `Dialog`, `ActionDialog`, `ConfirmDelete` | popups/dialog and card look | Focus handling and `role="dialog"` kept |
| Toasts | frame/notifications look | |

Why native elements remain where they do: the framework's DataTable is a virtualized `div` grid, SelectBox and CheckBox are `div` widgets, buttons are `div role="button"` without form submission or a `disabled` state, and inputs have no label association. The owner chose vendoring. Where a vendored component would remove a form or accessibility capability the hub relies on, the hub uses the native element styled to the framework specification, and this is recorded per row above.

## Design tokens

Every value comes from `vendor/vt-web-gui-framework/src/assets/defines/index.js` through `tokens.scss`, and is never copied by hand:

- **Colour:** primary `#001e46`, primaryMidnight `#00122b` (footer), attention `#00b3ff` (dark text variant `#007db3`), attentionHigh `#e6932b`, calmingGreen `#5dae95`, signalError `#b00020`, impulseGreen `#2ff3e0` (hover and focus lines), and the greys offWhite / paleGray / lightGray / gray / darkGray / structureSilver.
- **Type:** Open Sans with a 17 px root. Sizes are xs 0.75rem, small 0.85rem (body and table text), normal 1rem, semilarge 1.15rem (section titles), large 1.4rem (page titles), xl 1.9rem (KPI values) and xxl 3.1rem.
- **Geometry:** header 46 px, logo 120 px, first sidebar 180 px, main toolbar 60 px, controls 28 px, no border radius, framework shadows level 1–5, space scale 5/7/12/20/32/50/80/120.

The chart palette also uses the framework colours: series attention and attentionHigh; status calmingGreen, attentionHigh and signalError; and a ramp from attention to primary.

## Responsive and accessibility patterns

These are the shared behaviours that pages get from the shell and the kit (GUI-01 … GUI-13 of 27 Oct, UX-001 … UX-005 of 29 Oct 2026; see [UX-AUDIT-REMEDIATION-2026-10-27.md](UX-AUDIT-REMEDIATION-2026-10-27.md)). A new page gets them by using `PageHead`, `DataTable`, `Tabs`, `QueryState`/`ErrorBox` and `Restricted`.

| Width | Navigation (`ui/Shell.tsx`, `styles/frame.scss`) | Tables (`DataTable`, `styles/kit.scss`) |
|---|---|---|
| > 900 px | Header links; links that do not fit move into *More*; the active section always keeps its header place | All columns. A table wider than its panel shows edge shadows, its scroll area is focusable (left and right arrow keys) and named "… scroll sideways for more columns", the first named column (the record identifier) stays at the left edge (capped at 14rem below 1200 px) and the action column at the right edge. Styles that follow the overflow state must not change the table's width, or the overflow check never settles |
| 601–900 px | Menu button with the current section's name opens the drawer (`role=dialog`, focus kept inside, Escape returns focus) | As above |
| ≤ 600 px | Menu button shows the icon only (its accessible name keeps the section); the section is shown above the page title (`SectionLabel`, included in `PageHead`; pages with their own toolbar place it themselves). Pages without a main toolbar keep the short label in the header | Primary columns (identifier, status, actions; set with `Column.priority`) stay in the row; every other column is in the row's details (button with `aria-expanded`). Nothing is dropped: filters, sorting, the column chooser and CSV export work on all columns |

- **Targets (WCAG 2.2 SC 2.5.8):** at least 24 × 24 px or the spacing exception; 40 px and more on touch screens (`pointer: coarse`). Record links in table cells get vertical padding (hit area, not layout). Hidden helper inputs (the logo file input) are not Tab stops; the visible button is the target. `ux-remediation.spec.ts` measures this on representative routes.
- **Loading:** pages are lazy chunks (GUI-13). The notifications pop-up and the sign-in screens are lazy too (UX-003). `LoadBoundary` (in `App.tsx` around the page outlet, and around the bell pop-up) turns a chunk that cannot be downloaded into a message with *Reload*, keeping the shell usable. The entry chunk budget is 900 kB minified, Vite's kB (1000 bytes), checked in `gui-fixes.spec.ts`.
- **Guidance (UX-005):** an access denial uses `Restricted` (what is needed, then where it is granted: `ACCESS_HELP`); it names no person and shows no record. `ErrorBox` gives server and connection failures *Try again* (it refetches the failed queries) and, when the server sent one, the trace ID to quote.

## Developer handover

- **Running.**
  - `.claude/launch.json` has `tio-hub-claude`: the API on 5194 with its own development database `TioHub_PortfolioDev_Claude` (pseudonymized Portfolio demo profile, Development environment).
  - It also has `tio-web-claude`: Vite on 5174, proxying to it.
  - The original `tio-hub` entry expects `TioHub_PortfolioDev` to be attached in LocalDB. At the time of writing only its `.mdf` file existed, so this session did not use it.
- **Build:** `npm run build` in `src/web` writes to `src/TioHub.Api/wwwroot`.
- **Tests.**
  - `npx tsc -b --noEmit` and `npx vitest run` in `src/web`.
  - Playwright: in `tests/e2e`, with `TIOHUB_E2E_PORT=5196`, after a web build. Stop any preview API first, because it locks the API build.
- **Adding a page:**
  - Use `PageHead` (main toolbar), `Panel`, `DataTable`, kit fields and `Tabs`.
  - Use `Icon` names from `ui/Icon.tsx` or any VtWebGuiIcons name.
  - Style new rules with the custom properties from `tokens.scss`, or in SCSS with `@use "assets/styles/defines"` and `defines.color(...)`, `defines.spacePx(...)`, `defines.typo(...)`.
- **Using another framework component:** export it from `src/vt/index.ts`. If it reads something from the framework store, extend `src/vt/shims/store.js`.
- **Section navigation:** edit `SECTIONS` in `ui/Shell.tsx`. Permission predicates are evaluated per item, and the server still enforces every rule.
- **Do not:**
  - edit files under `vendor/` (update them from a new zip, see `VENDOR.md`);
  - import vendor paths directly from pages;
  - reintroduce hard-coded colours or pixel font sizes.
