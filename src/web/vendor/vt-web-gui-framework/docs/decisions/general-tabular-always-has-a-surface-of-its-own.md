---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# A tabular always has a surface of its own, and its items take props of their own

## Context and Problem Statement

`Tabular` separates its entries by a divider line at `tabularStyle: 'line'` and by a surface per entry at `'background'`. Since PDWG-63 its styling props followed whichever element was the surface, so at `'background'` a `boxShadow` landed on a transparent box with square corners, and one prop acted on a different box per style. The developer judged that inconsistent on 2026-09-23, when the shadows were rebuilt on the ground (ADR `general-two-shadow-kinds-by-how-a-surface-sits.md`).

## Considered Options

- Keep routing the styling props to whichever element is the surface
- Give the tabular a surface of its own at both styles, and the items a channel of their own

## Decision Outcome

Chosen: **the tabular always has a surface of its own**, as `Section` has. Its padding, background color, border radius and shadow always reach the tabular's element, whatever its style.

- **The items take own props of `Tabular`**: `itemPaddingTopBottom` and `itemPaddingLeftRight` at both styles, with the defaults v3 had — `xs` top and bottom, left and right `none` at `'line'` and `small` at `'background'`. `itemBackgroundColor` and `itemBorderRadius` are read at `'background'` alone, because at `'line'` an item has no surface for them to reach.
- **`itemBorderRadius` rounds only the outer corners of a sequence** of consecutive items: the top pair of its first item and the bottom pair of its last. A `TabularDescItem` ends a sequence, a `Toolbar` starts a new one.
- **`TabularDescItem` takes `itemPaddingLeftRight`** too, so its text lines up with the items'; its vertical spacing stays its own.
- **`rowGap` is the seam between two item surfaces**, so it applies at `'background'` alone, defaulting to `xs`.
- **`backgroundImage` and `backgroundOptions` are gone** (ADR `general-ground-travels-as-an-inherited-custom-property.md`).
- **The divider line follows the ground.** On a surface whose color the call site chooses, a line cannot state a color of its own, so it is translucent: `dividerLine` in `$layout` holds `structureSilver` at 18 % for a light ground and `offWhite` at 22 % for a dark one. The inherited ground picks one, so the tabular's `darkTheme` prop is gone.

## Consequences

- Good: a styling prop acts on the same box at both styles, and `boxShadow` draws its pane around the whole tabular.
- Good: the entries have their spacing default again, so a call site states only what differs.
- Bad: two prop sets now mean spacing — the styling props for the tabular, the `item*` props for its entries. The prefix keeps them apart.
- Bad: `itemBackgroundColor` and `itemBorderRadius` do nothing at `'line'`, and only their JSDoc says so.
- Bad: every background-style tabular had to move its color, radius and padding to the item props to keep its look — seven in the demo contents, and every such tabular in a consumer project.
