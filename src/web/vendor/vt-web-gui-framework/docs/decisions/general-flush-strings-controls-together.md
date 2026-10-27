---
decided: 2026-08-24
jira: PDWG-63
concept_commit: 5c054602
---

# `flush` says that a control ends without an edge of its own on one side

## Context and Problem Statement

Two buttons strung together, a field and its unit, a bare control at the edge of its container: each wants no edge, no rounding and no inner spacing on the side where it meets its neighbour. A paned control and a bare one need different mechanics for that — squared corners and a dropped border for the one, a negative margin against the inner spacing for the other.

## Considered Options

- **A `ButtonGroup` wrapper** — existed as a commented-out draft; it groups only what it wraps, so a control flush against a text or a container's edge stays out of its reach, and it reaches into its children with `cloneElement`.
- **One boolean per mechanism**, `squareCorner` and `noPadding` — each says nothing on the other form.
- **A single border left standing in the seam** — built and dropped on 2026-08-24, a drawn line being stronger than the pair needs; **a negative margin of one pixel** instead — the seam then takes the colour of whichever neighbour is hovered.
- **Dropping the inner spacing of the bare form altogether** — built 2026-08-27 on the input group and reversed the same day: the interaction veil fills the pane's rectangle whether the pane is drawn or not, and a value on that rectangle's edge looks glued to it.
- **One prop naming the statement**, each form answering it its own way.

## Decision Outcome

Chosen: **the prop `flush: 'start' | 'end' | 'both'`**, on the button since 2026-08-24 and on every input control since 2026-08-27. A paned control squares its corners on that side and drops its border along it, so strung-together controls meet in a seam of nothing but their contact shadows; a bare control pulls its inner spacing back out with a negative margin, so its lettering lines up with what stands above or below it; the overlaid button ignores the prop. The values are the logical sides, so a right-to-left document mirrors them by itself. The first use outside the test bed is the calendar's pair of month buttons.

## Consequences

- Good: the consumer says what the control is to be and the control decides how — the division `type` and `highlight` already follow.
- Bad: a bare control with `flush` pulls its padding back while the notice below it does not follow, so the two part by that padding — known and left standing.
