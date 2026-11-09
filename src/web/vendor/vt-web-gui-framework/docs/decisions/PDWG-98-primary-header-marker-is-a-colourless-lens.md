---
decided: 2026-09-09
jira: PDWG-98
---

# The primary header's marker is a lens of the base design, and its fill carries no colour

## Context and Problem Statement

**The framework has two glasses**, and the marker was made of the wrong one. The `glass` map holds the material of a surface that floats over the page — the cards, the mega menu, the popup menus — assembled by `glassmorphism()`, with a backdrop blur in it. The `controls` map holds the base design's own: the pane every control rests on, and the lens the tab bar's selected tab carries. Both are glass; what separates them is what they are made for.

The marker of the active menu node was built from the first: `glassmorphism()`, a halo shadow of its own, and the blur. The node it marks floats over nothing — it lies in the header and marks an entry of a bar, the way the lens marks a tab. The two markers agreed in their geometry, 30 high at radius 15, and in nothing else.

Moving the marker to the other glass settles the material but opens a second question the tab bar answers with a prop: **what colour the lens is tinted with.** The header has no such prop, so the value had to be decided rather than passed.

## Considered Options

- **Keep the floating surface's glass** — the blur has nothing to do behind a marker lying on one single colour, and two markers of one kind would stay built from two vocabularies.
- **The lens tinted with a marker colour** — `attention` at .3, the alpha of the tab bar's lens, which makes the header speak exactly the bar's language.
- **The lens with a colourless fill** — `surface.fill.light`, the resting pane of a control on a dark ground.

## Decision Outcome

Chosen: **the lens of the base design, filled colourless.** The marker takes the surface's edge, lit rim, inner glow and contact shadow from the `controls` map in the set for a dark ground, and the backdrop blur goes with the glass it leaves behind.

The fill carries no colour because **the attention belongs to the content.** Seen side by side on 2026-09-09, the tinted lens pulled the eye to the header, which states where one stands rather than what matters; the colourless one marks the active node just as clearly and stays quiet. The tab bar's lens is tinted for the opposite reason: it sits inside the content and marks the thing the user is working in.

## Consequences

- Good: one lens construction for the framework, and the header's marker is measurable against the `controls` map like every other pane.
- Good: the header keeps its weight in the page's attention order — the ladder of `colors.md` stays free for the content.
- Bad: a consumer who wants a coloured header marker has no prop for it; the value is stated in `marker.scss`. Nobody has asked for one.
- Bad: without the blur the marker no longer separates itself from a header that carries an image or a gradient behind it. The header is one flat colour today.
