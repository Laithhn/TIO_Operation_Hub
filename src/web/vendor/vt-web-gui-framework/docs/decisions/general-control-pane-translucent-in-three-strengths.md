---
decided: 2026-08-28
jira: PDWG-63
concept_commit: 5c054602
---

# A control's surface is a translucent pane of the palette, in three strengths

## Context and Problem Statement

Controls sit on any of the 13 background colours of the palette, and a control is told only whether its background is light or dark, never which colour it is. The surfaces' `glassmorphism()` could not be reused as it stands: its `offWhite` fill leaves too little contrast on the near-white surfaces controls usually sit on, and its outer shadow is too strong for a control. The surface had to hold two appearances — one for all light backgrounds, one for all dark ones — carry the status layers on top, and stay affordable with many controls on a page.

## Considered Options

- **Derived from the background via `backdrop-filter`** — one rule for every colour; but over an opaque background it computes the same picture as a veil beside it, and at the ends of the range a weaker one, `brightness()` being unable to lift a channel that is 0. It costs a compositing layer per control, stacks unpredictably inside glass, and turns the control into a containing block that collides with menus anchored inside it. Rejected as the origin of the pane's colour; the overlaid form alone keeps a `blur(8px)`, being the one form that covers foreign content and rare enough to afford the layer.
- **An opaque grey per theme** — predictable contrast; but `paleGray`, `lightGray` and `gray` are backgrounds themselves, so no grey stays distinguishable from all of them.
- **The glass at reduced strength** — keeps the `offWhite` fill the requirement rules out.
- **A recessed reading for the bare form** — shadow inside the top edge, lit edge inside the bottom; built 2026-08-20 and judged wrong at the running button.
- **A translucent veil of the palette's own colours**, with an edge, a lit rim and a contact shadow.

## Decision Outcome

Chosen: **the translucent pane**, one construction in three strengths held in the `controls` map: `surface` — `structureSilver` at .12 over light backgrounds, `offWhite` at .18 over dark ones, an edge a notch denser, a contact shadow `0 1px 3px` — `surfaceTinted` at about half of every ingredient with a tighter shadow, and `surfaceLocked`, the tinted one halved once more, without rim and glow. The filled button carries the full pane, the tinted button and every input control at rest the tinted one, and a locked control thins by one step and gives up what makes a body look raised. The third strength exists because an input control already rests on the tinted pane: without a further step its lock read as no change at all. The button's bare form and the check box carry no pane; an input control gives its pane up with the prop `bare`, the surrounding layout then doing the bounding. The three strengths and the interaction edge live in the `controls` map, read by the button and the input group's mixin alike.

## Consequences

- Good: one appearance per theme serves all 13 backgrounds, and the status layers lie over the pane without replacing it.
- Good: the flatness of a neutral veil on `offWhite` is answered by the edge and the lit rim rather than by a stronger fill.
- Bad: three strengths are three sets of values to keep in one calculation; the map states the calculation in words so that a change to one strength is made to all.
- Bad: the pane-less forms are bounded by nothing at rest and show their extent only under the pointer — accepted, and the reason the bare button keeps its inner spacing.
