---
decided: 2026-08-25
jira: PDWG-63
concept_commit: 5c054602
---

# An icon of a control is one cut-out shape in its status colour, and its corner radius is drawn into the path

## Context and Problem Statement

The check box's icons — an empty box, a tick, the mixed bar, a radio button's ring and dot — were two paths: a frame in the status colour and an inner shape in the colour the surface was assumed to have, `offWhite` in the light theme, `primary` in the dark one. On twelve of the thirteen palette backgrounds that inner shape read as a white sticker on the control, and it stopped the interaction veil, an inset shadow behind the icon, at the icon's edge.

## Considered Options

- **Keep the second shape and give it the background's own colour** — every control would have to be told which of the 13 colours it sits on, which the base design rules out.
- **`fill-rule: evenodd`** on the icon — needs no winding discipline, but needs the declaration in the stylesheet, in every SVG file and in the head of whoever copies a path out of one.
- **One path per icon, the inside wound against the outside** — a hole under `nonzero` and `evenodd` alike.

## Decision Outcome

Chosen: **cut out**. Every icon is one path in the colour of its status, and the inside of a box, a tick, the mixed bar and the gap around a radio button's dot are subpaths wound against the one enclosing them, so no icon depends on a `fill-rule` being set. The tick box's corners are rounded by 4 of its 18 units — the proportion the large button takes with 12 on 50 — and that radius is drawn into the path rather than read from the `controls` map: the glyph is drawn at 18 px and at 30 px, and a radius in units scales with it where a pixel constant would not. Judged over all 13 backgrounds at the running check box.

## Consequences

- Good: the background shows through everywhere, the veil reaches through the icon, and the control answers the pointer as one thing.
- Bad: reversing a contour by hand — every sweep flag of an arc, or every point of a Bézier contour — is error-prone; the geometry was checked numerically, by winding numbers at probe points, before it was built, and that check is worth repeating for every further path.
