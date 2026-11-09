---
decided: 2026-09-07
jira: PDWG-83
---

# The tab bar's marker is placed by its inset, not moved by a `transform`

## Context and Problem Statement

The marker slides from one tab to the next. v3 and the first v4 port moved it by `transform: translate()`, which spares the layout while it slides. A background marker, though, has an edge that has to meet the content it is meant to run into, and a tab's height is regularly a fraction of a pixel — title and subtitle at 0.85rem on the 17px base with a line height of 1.5, plus the padding, come to 67.35px. Chrome paints a transformed element at its exact fractional position with anti-aliased edges, where it snaps every other element to the device pixel, so a hairline of the bar's ground showed between the filled tab and the content. Seen at the playground on 2026-09-07 and confirmed by disabling the transform in the DevTools.

## Considered Options

- **Keep `transform` and let the background marker overshoot by one pixel** into the content, clipped by the list's `overflow: hidden` — rests on the clip rect being pixel-snapped, and hides the seam rather than removing it.
- **Round the tab's height to whole pixels** — does not help: the list's top edge lies wherever the layout above puts it, on a fraction as often as not.
- **Place the marker by its inset** — `inset-inline-start` along a horizontal bar, `top` along a vertical one — and transition that.

## Decision Outcome

Chosen: **the inset**. The marker is then snapped like every other element, and its edge meets the content's without a seam. The slide becomes a layout transition of one absolutely positioned element. The logical inset counts from the list's beginning in either text direction, so the negative offset the transform needed in a right-to-left document falls away with it. The select box's menu keeps its `transform` (ADR `general-select-box-menu-moves-by-transform.md`): there the glide is the point, and no edge of the menu has to meet a neighbour of the same colour.

## Consequences

- Good: no hairline between a filled tab and its content, at any zoom and device pixel ratio; one code path for both text directions.
- Bad: the slide runs on the main thread, a layout and a paint per frame instead of a compositor animation — the price is one element of a few dozen pixels.
