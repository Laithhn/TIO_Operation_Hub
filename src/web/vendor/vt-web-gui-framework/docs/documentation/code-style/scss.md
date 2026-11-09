# SCSS

## A misspelled function name fails silently

Sass does not reject an unknown function. It passes the call through into the output as CSS text, and it does **not** resolve the variables inside it — the browser then drops the declaration as invalid, and nothing anywhere reports it.

`typoSet` in `src/assets/styles/typo/_index.scss` once carried `type(typeSet, $simpleName, color, dark)` for the branch a call with a fixed theme and a fixed `$disabled` took. The function is `typo` and the map key is `typoSet`, so both names were wrong. What the built stylesheet contained was the literal string:

```css
.headerCell__label__dzorW {
  font-size: 0.85rem;
  font-weight: 600;
  color: type(typeSet, $simpleName, color, dark);
  fill: type(typeSet, $simpleName, color, dark);
}
```

Four rules inherited their colour instead of setting it — `headerCell`'s `.label`, `tabularDescItem`, and `tabularValueItem`'s `.label`, `.hint` and `.subLabel` — through several releases, because the inherited colour was usually the right one anyway. Fixed on 2026-08-27.

**What this means for a change to a mixin:** the compiler's silence proves nothing. Read the built stylesheet — `dist/web/bundle.*.css` after `npm run build:web-dist-dev` — and look for the rule the mixin was supposed to produce.

## An `:export` value is a string

css-loader hands every value of an `:export` block over as a **string**, whatever the stylesheet computed — `20` arrives as `"20"`. The `*.d.scss.ts` declarations beside the stylesheets are written by hand, and such a value is declared as `string` there; a declaration saying `number` is a lie TypeScript cannot see through, and the arithmetic behind it fails silently: `72 + "20"` is `"7220"`, a subtraction happens to coerce, and a lookup by value (`getSpaceKeyFromValue`) finds nothing.

**Convert once, in the module that imports the value**, and let everything after it read a number:

```ts
import * as css from './menu.scss';

const gapBetweenHeaderAndOptions = Number(css.gapBetweenHeaderAndOptions);
```

Where several modules read the same block, one module converts for all of them. A value that is only ever interpolated into a string (`${css.iconSize}px`) needs no conversion.

Seven declaration files carried the lie until 2026-09-03, found at the multi select box's menu: with a header, its height had been a concatenation of digits since the port and left room for no option, and the calendar's sections stood without their paddings.

## A class name may not be a reserved word

The `.d.scss.ts` declarations export every class as a constant, so a class named `switch` — or any other reserved word — does not compile. The root class of the switch control is therefore `switchControl`. A class that appears in the stylesheet **only inside `:not(…)`** is exported all the same; the css-loader exports every class the stylesheet names, wherever it names it.

## A selector never crosses a CSS module

Every stylesheet is a CSS module and generates its own class names, so a descendant selector in one module cannot reach a class of another: `checkBox.scss` does not know the name `icon.scss` gave `.icon`. The way from a control to its sub-component is a **custom property**, which inherits — the check box sets `--statusVeil` on itself and the icon draws it. This is also why the status layers of the base design are slots (ADR `general-css-custom-property-status-layers.md`): a slot crosses the boundary, a selector does not.

## A setting lives in the stylesheet that uses it

**v4 has no `defines.scss`.** A measure, a duration, an alpha value is written in the stylesheet that draws with it, and it reaches JavaScript through an `:export` block in that same stylesheet — only where a module actually reads it. The declarations beside the stylesheet (`*.d.scss.ts`) name the exported values along with the classes.

**A value no stylesheet draws with is a TypeScript constant**, in the module that reads it — never a stylesheet that exists only to export it. The calendar lays out its sections with paddings and a row height and adds them up to its own height, all in TypeScript, so `dateTimePicker/calendar/calendar.dims.ts` states them for every sub-component that reads them. A spacing stays a key of the space map there (`'small'`), the form the styling props take.

**A value more than one stylesheet of a component needs travels as a custom property**, set on the element that encloses them. It cannot be a shared Sass variable: the section above holds the reason — every stylesheet is its own module and its own entry, and `@use` on a stylesheet carrying rules emits those rules a second time under class names nothing uses. Three points follow from the mechanism:

- **The property carries its unit**, so that a part computes with it the way it computed with the Sass variable: `top: calc(var(--imageViewerPadding) + var(--imageViewerHeaderHeight) + var(--imageViewerRowGap))`.
- **The name carries its component.** css-loader hashes class names, never custom property names, so `--padding` would be a name the whole application shares. It is `--imageViewerPadding`.
- **It only flows downwards.** A value the enclosing stylesheet needs from a part has no such path: the height of the preview strip's row stands in `imageViewer.scss`, which draws the grid, while the lift, the scale and the glow it has to hold stand in `previewImage.scss` — the sum is a comment, not arithmetic.

Rationale: ADR [general-settings-in-the-stylesheet-that-uses-them.md](../../decisions/general-settings-in-the-stylesheet-that-uses-them.md). The one `defines.scss` left is `src/oldFrame/burgerMenu/layer/`, unported v3.

## A dark-ground branch adds no specificity

A dark-ground branch is written through the mixin `onDarkGround` of the ground module, a style query, and **a query adds no specificity**: the branch wins over its light rule only by standing after it. Write it directly after the declarations it replaces, inside the same rule; a later rule of the same weight - a status - then overrides it as it overrides the light one. A status that looks right on a light ground is finished only when it has been checked on a dark one.

The mixin `onDarkGroundOrClass` is the exception, and on purpose: it carries one class more than its light rule, as the `&.darkTheme` branch it replaced did, so the button's rules keep the weights their order is built on. Against such a branch the two old answers hold, both in use with their reason at the rule: place the status's rule **after** the type rules, so equal specificity is decided by position (the button's lock), or cut the status out of the type's rule with `:not(…)` (the button's status colours). A rule that has to overwrite a resting pane therefore carries a `:not(.bare)` of its own and stands after it.

**The build keeps a branch where it was written.** Dart Sass lifts a query written inside a nested rule out of it and prefixes the parent selector, and cssnano keeps the query. cssnano does merge two adjacent query blocks into one, so a merge across a rule standing between them would move a dark branch behind a later light rule. The dark branches of `button.scss` and `inputControl/_index.scss` kept their order in the production build; compare its CSS again when a new branch lands between two rules for the same element. *Source: Dart Sass 1.102.0, cssnano 7.1.9 — checked 2026-09-24.*

**The query tests the element's nearest ancestor, never the element itself.** A component that styles its own face by its own colour - a toolbar's line on its own background - cannot query it, and sets the classes `groundDark` and `groundLight` for `onDarkGroundOrClass` instead.

## A grid takes its baseline from its first item

A grid container exports its baseline from the **first item in document order**, whatever its `align-self`; only where an item of the first row is baseline-aligned does the baseline come from that group instead. *"Only a baseline-aligned item exports a baseline"* is a rule of **flexbox**, not of grid — three `align-self: baseline` declarations written on that belief changed nothing and were removed on 2026-08-28. An input control needs no declaration for the label the layout aligns against it: its value is the first item and its line box is as tall as the pane, which puts the baseline in the middle. The button does need `align-self: baseline` on its label, for a different reason: an icon may stand before the label, and an SVG has no text baseline to give.

## A control that is to fill its column needs `min-width: 0` on every level

A grid item's automatic minimum size is its min-content size, and a grid container measured intrinsically sizes an `fr` track inside it to its content's **max-content**, even under a min-content constraint (CSS Grid §12.7.1). A pane holding an `<input>` therefore claims the input's HTML default of 20 characters — some 185px — and a column of such controls stretches to the widest of them. `min-width: 0` on the container, on the pane **and on the `<input>` itself** is what takes the floor away. The last of the three is not replaced by the input's `overflow: hidden`: to Firefox an `<input>` is a replaced element, its overflow makes it no scroll container, and its automatic minimum stays its intrinsic width — in a pane narrower than 20 characters the value's track then refuses to shrink and pushes a trailing icon out of the pane. Chrome zeroes the minimum on the overflow alone, which is why the defect showed only in Firefox.

## Three things Safari reads differently

The browser floor includes Safari 18, and nothing Safari added after 18.0 may carry a function of the framework (ADR `general-safari-floor-18.md`). Three properties the stylesheets use read differently there, and each has one way to write it:

- **`user-select` is read only prefixed, in every Safari.** Never write it; include `styles.noTextSelection`, which spells `-webkit-user-select` beside it and adds `-webkit-touch-callout: none` for the long press on iOS (`src/assets/styles/selection/_index.scss`).
- **The `text-decoration` shorthand with a style, a colour or a thickness is read only from Safari 26.2.** Before that Safari drops the whole declaration. Write the longhands — `text-decoration-line`, `-style`, `-color`, `-thickness` — and keep the shorthand for a bare `none` or `underline`.
- **No Safari applies a CSS `filter` to an element inside an SVG**, only to the `<svg>` itself. A shadow or a blur on a `<circle>` or a `<path>` is a `<filter>` element in the SVG's `<defs>`, referenced through the element's `filter` attribute, as in the two menu markers. Two settings keep it equal to the CSS filter it replaces: `color-interpolation-filters="sRGB"`, because an SVG filter works in linearRGB otherwise, and the length of `drop-shadow()` taken over as the `stdDeviation` of `<feDropShadow>` unchanged — `drop-shadow(0 1px 3px)` is `stdDeviation="3"`, not 1.5 as a box shadow's blur radius would suggest. The filter's region has to reach past the element, because the default of ten percent cuts a shadow off on a small one. Both forms measured pixel-equal in Edge.

*Source: mdn/browser-compat-data `css.properties.filter.svg_elements`, `css.properties.text-decoration`; caniuse `user-select-none` — checked 2026-10-23.*
