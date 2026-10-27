---
decided: 2026-08-21
jira: PDWG-63
concept_commit: 5c054602
---

# `FOCUS` and `HOVER` come from CSS pseudo-classes, not from the flags `useInteractions` reports

## Context and Problem Statement

`useInteractions` reports `isFocused` and `isHovered`, set from React's focus and pointer events; the check box built a `focus` prop out of them for its icon, and the button styled `:hover, :focus` directly. The base design wants a focus that shows only where it needs showing — reached by the tab key, not by a click — which is the browser's own `:focus-visible` heuristic, and no JavaScript boolean reproduces it: `onFocus` cannot tell a click from a tab.

## Considered Options

- **Keep the flags** and ask `element.matches(':focus-visible')` — a second source for what CSS already knows, re-evaluated on every render.
- **Mark the sub-component with a `:global` class** so a descendant selector can reach it across the CSS module — gives up the module's collision safety for one selector.
- **CSS pseudo-classes** on the control, and a custom property where the element that draws the status is not the one that carries it.
- **Drop the two flags** from the hook, their last reader in the repo gone.

## Decision Outcome

Chosen: **pseudo-classes, carried across by custom properties**. `:hover` and `:focus-visible` — `:focus-within` on the input group, whose caret has to show whatever put the focus there — set the status on the control, and a sub-component in a CSS module of its own draws it from an inherited custom property, the slot idiom of `general-css-custom-property-status-layers.md`: a descendant selector cannot reach a class whose generated name it does not know (seen 2026-08-25 at the check box's icon). The hook **keeps reporting** `isFocused` and `isHovered`, React state and all — they are public API of the framework and the only route to these statuses from JavaScript, a `useEffect` in a consumer having no pseudo-class to ask — and what they cost is one re-render of the very component being hovered or focused.

## Consequences

- Good: the focus shows exactly where the browser's heuristic says it should, and the two controls that did it differently now do it alike.
- Good: no contract of the hook changes; the covered controls only stop reading two of its results.
- Bad: two mechanisms coexist for one fact — CSS for the appearance, the flags for a consumer's logic — and the appearance must never read the flags, or the two fall apart.
