---
decided: 2026-09-16
---

# Settings live in the stylesheet that uses them, not in a `defines.scss`

## Context and Problem Statement

v3 gave a component a `defines.scss`: a partial carrying nothing but variables, read by the component's stylesheets and exported through `:export` to the JavaScript that needed the same numbers. The image viewer held the last one in ported v4 code, 18 values for six stylesheets and three TypeScript modules.

Such a file is a second place to look for a value that belongs to one element. The height of a thumbnail stood in `defines.scss`, the rule drawing the thumbnail in `previewImage.scss`, and what a value was for could be told from its name alone. The file also outlives its reason: most of its values had exactly one user.

What kept the pattern alive is a constraint of the build. Every stylesheet is a CSS module and its own entry, so two stylesheets of one component cannot share a Sass variable without a third file: `@use` on a stylesheet that carries rules emits those rules a second time, under class names nothing uses.

## Considered Options

- Keep a `defines.scss` per component
- Move every value into the stylesheet that uses it and write a shared one twice
- Lift the shared values into the global style API (`assets/styles`)
- Move every value into the stylesheet that uses it and hand a shared one down as a CSS custom property

## Decision Outcome

Chosen: **a setting is written in the stylesheet that uses it**, exported through `:export` only where JavaScript reads it, and **a value more than one stylesheet of a component needs is handed down as a custom property** set on the element enclosing them.

The custom property is not a new mechanism here: it is the one that already carries the status layers into a sub-component, because a selector cannot cross a CSS module either (ADR [general-css-custom-property-status-layers.md](general-css-custom-property-status-layers.md)). A value and the rule that uses it now stand in the same file, and what a component hands to its parts is visible in one block at its root rule.

Writing a shared value twice was rejected: two numbers that have to stay equal are the defect the `defines.scss` was built against. The global style API was rejected for the opposite reason: the padding of the image viewer is not a measure of the framework, and a map everything reads should not carry the internals of one component.

## Consequences

- Good: a setting stands beside the rule it serves, and most of them have exactly one user.
- Good: what a component hands down is declared in one place, at its root rule, instead of being implicit in who imports the partial.
- Bad: Sass arithmetic over a shared value becomes `calc()`, so the custom property has to carry its unit. `math.div($imageChangeTransitionTimeMs, 2)` became `calc(var(--imageViewerChangeTime) / 2)`.
- Bad: a value flowing **upwards** has no path. The height of the preview strip's row is needed by the grid that encloses the strip, so it lives in `imageViewer.scss` while the four values it is summed from live in `previewImage.scss` — the sum is a comment there, not arithmetic.
- Bad: css-loader hashes class names but not custom property names, so a name is global. Every such property therefore carries its component as a prefix (`--imageViewerPadding`), by hand.
- `src/oldFrame/burgerMenu/layer/defines.scss` stays as it is: unported v3 (ADR [general-legacy-v3-code-untouched.md](general-legacy-v3-code-untouched.md)).

The rule as it applies: [documentation/code-style/scss.md](../documentation/code-style/scss.md).
