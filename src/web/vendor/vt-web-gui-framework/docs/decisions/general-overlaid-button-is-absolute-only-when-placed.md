---
decided: 2026-09-09
jira: PDWG-83
---

# An overlaid button is positioned absolutely only where it was given a place

## Context and Problem Statement

The overlaid button is the one type that floats over content of its own, and until now the type alone made it `position: absolute` — the class carried the declaration, and the component wrote an inset for both axes, falling back to `left: 0; top: 0` where the caller passed no number. Absolute takes the button out of the flow, so a layout around it can no longer place it: its `alignSelf` and `justifySelf` reach nothing, and the inline inset beats them anyway. The scroll button ran into it when its arrow became overlaid on 2026-09-08. It aligns the arrow inside a shader that is a CSS grid, by an edge whose length it does not know — `pos="center"` along a side strip is not expressible in pixels — so both arrows clung to the corner of the shader's padding box.

## Considered Options

- **A wrapper in the button's dimension** — a `div` of 30 × 30 as the grid item the shader aligns, the button filling it from its corner. Shipped as `arrowButton.scss` on 2026-09-08 and works, but it costs an element and a stylesheet per caller with the same need.
- **Position props in the flow's units** — let `left`/`top` take a percentage or a keyword. The button stays absolute, and every caller has to convert an alignment into a number it cannot compute.
- **Absolute only where one of `left`, `right`, `top` and `bottom` carries a number** — otherwise the button stays in the flow and is placed like every other one.

## Decision Outcome

Chosen: **the position props decide**. `position: absolute` moves from `.overlaid` into `.overlaid.positioned`, which the component sets exactly where it writes the inset values. Without any of the four props the overlaid button is a normal item of the grid or line it sits in, keeps its floating pane, and takes its place from the layout — which is what the scroll button now does with `alignSelf` and `justifySelf`, its wrapper deleted. An axis whose two props are both empty keeps the old fallback to its start edge, so a button placed on one axis alone still sits where that prop puts it.

The type keeps its name: what "overlaid" states is the appearance — the floating pane, the backdrop blur, the round large form — and floating over content is what a caller does with it, by insets or by a layout that overlaps.

## Consequences

- Good: one element less per scroll button, and the same for every later caller that wants an overlaid button placed by its layout.
- Good: a passed position prop is never ignored — with one of the four, the button is absolute, as before.
- Bad: the type no longer implies the positioning, so a caller that expects a floating button and passes nothing gets one in the flow. The prop documentation states the condition on all five props.
