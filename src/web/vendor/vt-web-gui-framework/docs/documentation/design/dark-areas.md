# Dark areas

The framework has **one appearance, and it is light**. There is no dark mode, no theme switch and no second palette. What exists are dark areas: single regions of an otherwise light page whose background is one of the dark palette colours — the **header** (`primary`), the **footer** (`primaryMidnight`), the modwin's header, and any **section or other carrier a content gives a dark background colour**.

## How a component learns its ground

**The ground travels as the inherited CSS custom property `--ground`, with the values `light` and `dark`.** `html` sets `light`, which the app root and the portal element of the popups both inherit. A carrier — an element with a background of its own and components inside it — sets the ground its background makes, and every component inside reads it without a prop. The nearest carrier wins: a light section inside a dark one sets `light` for everything inside it.

**Which colour makes which ground is stated once**, in the exported map `$ground` of `src/assets/styles/color/_index.scss`. SCSS reads it through the mixin `background(<key>)`, which paints the colour and sets its ground; TypeScript reads it through `getGround()` and `isDarkColor()` of `assets/styles`. `invisible` has no ground and sets none.

**A component reads its ground in CSS, through a style query**: `@container style(--ground: dark)` applies to an element whose nearest ancestor carries `dark`. An element never reads its own ground, only the one of the element around it.

### The carriers

- **The app areas** — header, the secondary header's window control panel, footer, both sidebars, the main scope (article, dashboard, iframe), the error screen, the modwin's header. The modwin itself has none: the content inside it brings its own.
- **Placed components with a background colour** — `Section`, `Tabular` and its entries, `Toolbar`, `TabBar` and its container tab, the datasets and cells of `DataTable`, `ValueField`. `useStylingProps` sets `--ground` wherever it paints a `backgroundColor`.
- **Colours painted by another element** — the tab on a filled tab-bar marker, the selected calendar day on its marker, the scroll button on its painted shader. Each sets the ground of the colour it stands on.
- **The surfaces over the page** — see below.

### The readers

Every control, indicator and helper; the typo sets (`typoSet()`, `allTypoSets()`); the coloured lettering of `Text`, `Icon`, `ValueField`, `DataCell` and the BBCode tag `color`; the native elements of a content (`nativeElements()`), links included. None of them takes a prop for the ground.

## Where the call site states the ground

`darkTheme` survives on three components, each for a reason of its own:

- **`Section` and `ValueField`** — both can carry a background image, whose brightness cannot be derived from it. `darkTheme` states the ground in place of the one the colour would set; without it, a component with an image alone passes on the ground it sits on.
- **The `overlaid` `Button`** — a convenience for a small component that lies over foreign content, such as the image viewer's navigation buttons over the image. `darkTheme` states the ground in either direction; without it, the button follows the ground like every other type.

## What floats stays light

**A surface that lies over the page is light whatever it covers.** `Card`, `Dialog`, the mega menu, the menus of the select boxes and everything built on the `Card` — the popup `Menu`, the calendar, the proposal list, the columns selection card — carry the opaque glass of `glassmorphism()` and set `--ground: light`. A notification carries that glass by default; its two alternatives are `attention` and `attentionHigh`. **A dark `Card` does not exist**, and none of these surfaces takes a background colour: a different colour comes from a section placed inside.

**The image viewer is the one dark surface over the page**: it sets `--ground: dark`, images reading better on a dark ground.

## Writing a component that follows the ground

The ground module `src/assets/styles/ground/_index.scss` is the one place that spells the property and its query; no other stylesheet writes them out.

- **`onDarkGround`** — the dark branch of a rule, for an element that follows the ground it sits on.
- **`onDarkGroundOrClass`** — the dark branch for an element whose own ground may be known, its own colour or the call site's word. The component sets the classes `groundDark` and `groundLight`, which win; without either, the ground below decides.
- **`ground(light | dark)`**, **`background(<key>)`** and **`groundOf(<key>)`** — for a carrier.
- **`contactPane()`** — the pane of a placed component, drawn for the ground it sits on (`controls.md`).
- **`typoColorClasses()`** with `getTypoColorClass()` — a lettering colour by key, in the form for its ground.

**A query adds no specificity**, where a class did. A dark branch therefore stands directly after the light declarations it replaces, and a later rule of the same weight overrides it as it overrides the light one. `onDarkGroundOrClass` carries one class more than its light rule on purpose.

**A consumer's own stylesheet may read `--ground` as well** (`consuming/using-the-framework.md`).

**The mechanism needs Chrome and Edge 111, Firefox 151 or Safari 18.** A browser below that floor ignores every style query and letters every dark area for a light ground. The Electron distribution is such a case: its Electron 13 carries Chromium 91.

One placed component does not follow the ground yet: the breadcrumb entries of the `Toolbar`, which take their lettering from `menuEntry` for a light ground.

The reasoning: ADR `general-framework-is-light-dark-is-an-area.md` for what is light and what may be dark, ADR `general-ground-travels-as-an-inherited-custom-property.md` for how a component learns its ground.
