---
decided: 2026-09-02
jira: PDWG-63
concept_commit: 5c054602
---

# The select box's menu is positioned with `transform`, and the subpixel jump that costs stays

## Context and Problem Statement

The select box's menu glides when the selection changes, over `transition: transform`. A `transform` gives the menu a compositing layer of its own, whose origin the browser snaps to a whole device pixel: on a display whose `devicePixelRatio` is not 1, text inside the menu can round onto another device-pixel row than identically positioned text beside it, although the layout is bit-identical — measured at the running menu, `252.35000610351562` on both sides.

## Considered Options

- **Snap the layer's origin onto the device grid** — built as a utility `snapToDevicePixel()` on 2026-09-02 and deleted again: it changed nothing visible.
- **Drop `backdrop-filter`** on the menu — changed nothing either; the layer comes from the `transform` alone.
- **Position with `top` instead** — avoids the layer and costs the glide.
- **Keep `transform` and accept the jump.**

## Decision Outcome

Chosen: **keep `transform`**. The jump is invisible at a ratio of 1 and about one device pixel at 1.25; the glide is what the menu's animation is. The multi select box's menu and the Card-based popups are positioned with `top` and do not glide, so they carry no jump. Reopen when the glide is given up — `top` then costs nothing, as the multi select box's menu shows — or when a browser stops snapping a composited layer's origin to the device grid.

## Consequences

- Good: the selection change animates as designed.
- Bad: one device-pixel row of jitter on scaled displays when the menu opens and closes — accepted.
