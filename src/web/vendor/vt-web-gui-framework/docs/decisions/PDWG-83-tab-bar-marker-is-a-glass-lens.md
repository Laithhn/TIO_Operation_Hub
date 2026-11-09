---
decided: 2026-09-07
jira: PDWG-83
---

# The tab bar marks the selected tab with a glass lens, not with a line

## Context and Problem Statement

v3 marked the selected tab with a two-pixel line along the bar's edge, and the port brought that line along. Every other control of v4 states itself as a body of the base design's glass — the button's pane, the switch's track and knob — so the one control that marked its value with a hairline stood outside the design it belongs to. The line also carried nothing of the tab's own area: it said *which* tab is selected without giving that tab a face.

## Considered Options

- **Keep the line** — two pixels in `attention` along the content-facing edge.
- **Fill the selected tab in both forms**, dropping the prop `backgroundMarker` and its second appearance.
- **A glass lens behind the tab's lettering**, tinted in the marker's colour.

## Decision Outcome

Chosen: **the lens**, for the default form; the filled tab stays as the second form the prop `backgroundMarker` selects. The lens is the switch knob's construction with a colour in place of the neutral veil: the fill is the marker's colour thinned to a tint, and the glass around it is the **surface's own** — edge, lit rim, inner glow and contact shadow, unchanged. `surfaceColored` is not what it takes: that set exists because an opaque fill cancels the veil's ingredients, and a tint does not. The lens covers its tab and carries `borderRadiusDefault`, so a tab of one line — the height of every control of the framework — is marked by a pane of exactly that geometry, a pill.

Two things this decision does **not** do:

- The bar carries **no tint of the marker's colour**. Colouring it with the marker's colour at .4 and taking that colour from the styling prop `backgroundColor` was built on 2026-09-07 and dropped the same day: it left too little contrast to the selected tab. `markerColor` stays the source of the marker's colour, and `backgroundColor` colours the bar as on any component.
- It says nothing about **hover and focus**. Those took the base design's interaction veil on 2026-09-07, which is that design applied to one more control rather than a decision of its own: `general-interaction-veil-two-layers-over-the-face.md` carries the why.

The values and the arithmetic behind each of them live beside them in the tab bar's own files — the lens's alpha in `marker/Marker.tsx`, the bar's padding in `tabBar.scss`, the title tab's padding in `tabBarTitleItem/tabBarTitleItem.scss`; the realized appearance is in `documentation/design/controls.md`. How the marker is placed rather than moved: ADR `PDWG-83-tab-bar-marker-placed-by-inset.md`.

## Consequences

- Good: the tab bar states its value in the vocabulary every other control uses, and the selected tab gains a face instead of an edge.
- Good: the tint lets the bar's ground through, so the selected tab keeps the lettering of the ground it stands on and needs no second appearance for a dark marker.
- Bad: the lens's contact shadow is cut off where it meets the bar's own edges — along the bar at the first and the last tab, across it nowhere, the bar keeping `space xs` of air there. The bar clips its overflow because it scrolls, and that cannot be given up.
- **Open:** the lens has been judged at one edge, `pos="left"` and `pos="top"`, on a light ground. Whether it holds on the 13 backgrounds and in both themes is what a pass over the playground settles.
