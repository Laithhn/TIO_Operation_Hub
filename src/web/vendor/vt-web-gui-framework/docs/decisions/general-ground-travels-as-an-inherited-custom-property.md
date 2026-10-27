---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# The ground travels as an inherited custom property, read through a container style query

## Context and Problem Statement

A component could not tell what it sat on: the call site told it through `darkTheme`, an optional prop on every control, indicator and helper, on `Tabular`, `Toolbar` and the scroll button. A control placed on a dark section without the prop lettered itself dark on dark, and nothing reported the mistake. Whether a component sits on a light or a dark ground is a property of its context, and the DOM already carries context down to every descendant.

## Considered Options

- **`darkTheme` at every call site** — the status quo; a forgotten prop fails silently at each child.
- **Value properties** — the carrier sets every value a child reads (lettering colors, the pane pair, the contact shadow) as inherited custom properties, one mixin per ground. Works in every supported browser, but the property set becomes a contract, and each of the 68 dark branches written in the components would turn into a global property.
- **A flag with a space toggle** — one property set to `initial` or to an empty value, so that `var(--flag) <value>` resolves in one case only. Works everywhere, but every switching declaration needs a pair, and it reads poorly.
- **A container style query** — the carrier sets `--ground: dark` or `light`, and a child writes its dark branch inside `@container style(--ground: dark)`.
- **CSS `if()`** — the most direct form, but known only from Chrome 137, above every floor under discussion; the version comes from memory, not from a compatibility table.
- **A descendant selector** (`[data-ground=dark] .child`) — works everywhere, but a light section inside a dark one still matches the dark rule, so the nearest carrier does not win. Fixing that needs `@scope`, assumed above the Firefox floor and not checked against a compatibility table.
- **A React context** — readable from TypeScript, but it passes through portals, so every popup would have to reset it, and every reader re-renders on a change.

## Decision Outcome

Chosen: **a container style query on one inherited custom property, `--ground`**, with the values `light` and `dark`. Each dark branch stays in its component, and the former `&.darkTheme { … }` blocks turned into the query almost one to one. The nearest carrier wins by inheritance, and a portaled popup inherits from the portal element, not from the component that opened it.

- **`html` sets `light`**, which the app root and the portal element both inherit. Every carrier sets its ground explicitly, a light one too, so a light carrier inside a dark one wins.
- **The palette states each color's ground once**, in the exported map `$ground`. SCSS paints a fixed color through `background(<key>)`, which sets the ground with it. TypeScript reads the same map through `getGround()` and `isDarkColor()`; the former `isDarkTheme()` tested a color rather than a theme, and was renamed.
- **`useStylingProps` sets `--ground` wherever it paints a `backgroundColor`**, so no placed carrier can set a color and forget its ground. A component that paints a color key outside the hook sets the ground on the element it paints.
- **The ground is decided in CSS.** TypeScript takes part only where a component resolves a color key of its own at runtime, and it then sets the ground on itself. A colored lettering therefore takes a class generated with its dark-ground form (`getTypoColorClass()`) instead of an inline color, and the typo sets lost their `$darkTheme` parameter.
- **One module spells the property and its query**, `src/assets/styles/ground`. The property is public, and the query syntax is easy to misspell.
- **An element cannot query its own ground**, because a style query tests the nearest ancestor. An element that styles its face by its own ground sets the classes `groundDark` and `groundLight` for `onDarkGroundOrClass`. That branch carries one class more than its light rule, as `.darkTheme` did, so the button's cascade kept its weights.
- **`darkTheme` survives where the ground cannot be computed**: on `Section` and `ValueField`, the two components left with the styling prop `backgroundImage`. An image has a brightness no color key states, so the prop overrides the derived ground whenever it is set, and the JSDoc of `backgroundImage` tells the consumer to set it. Measuring the brightness of an image was rejected: it costs runtime for a rare case.
- **`Tabular`, `TabBar` and `TabBarContrItem` lost their background image** instead of gaining the prop. None of them needs one, and each would have been another place where the ground cannot be computed.
- **The overlaid `Button` keeps `darkTheme` too**, as an override of the ground in either direction, and it switches the button's whole face: pane, lettering, veil and shadow. The button lies over foreign content, such as the image viewer's image, whose brightness its inherited ground does not state. It is small beside a menu or a card, so fitting it to what lies below is worth a prop there and nowhere else. Every other component lost the prop, and the BBCode tag `color` lost its `darkTheme` parameter with it.
- **`--ground` is part of the public contract**, so a consumer's own component can read it the way a framework component does.

## Consequences

- Good: a component on a dark section needs no prop. A forgotten carrier fails in one place, the carrier, instead of at every child.
- Good: no JavaScript runs on a change of ground, and no component re-renders for it.
- Bad: the browser floor rises to Chrome and Edge 111 and Firefox 151; Safari 18 carries the feature already. Firefox ESR 140 lacks it, so an installation bound to that ESR letters every dark area for a light ground. A consumer keeps its own copy of the browser list in `settings.js`, so its start check lets older browsers through until it raises that copy. v4 has no installations yet, and both projects built on it accepted the floor.
- Bad: the Electron distribution stays below the floor. Its Electron 13.1.6 carries Chromium 91, so a desktop build letters every dark area for a light ground. Raising Electron was rejected: `src/desktopApp` is unported v3 code, and the npm freeze in force since 2026-08-04 forbids the update. No follow-up is planned.
- Bad: a query adds no specificity where the class did. A dark branch wins only by standing after its light rule, and every branch had to be checked for a later light rule.
- Bad: the removed `darkTheme` is breaking for a consumer that sets it on any other component. The v4 line is a prerelease, so the prop went without an alias.
