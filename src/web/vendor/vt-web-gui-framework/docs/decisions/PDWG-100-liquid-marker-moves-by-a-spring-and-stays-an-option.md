---
decided: 2026-09-09
jira: PDWG-100
---

# The liquid marker moves by a spring, and it stays an option beside the marker it came from

## Context and Problem Statement

The marker of the primary header's active menu node was to behave like a body of liquid while it travels — stretching under acceleration, gathering itself at a standstill. Two things stood in the way of simply building it.

**The framework times its animations, it does not simulate them.** Every movement in it runs for a stated number of milliseconds out of the `animationTime` map or the `controls` map's interaction pair, and a reviewer can read the duration off the code. A body that deforms from its own acceleration has no duration: it arrives when its springs have settled, and the same travel takes longer over a wider distance.

**And the marker it replaces is not a sketch.** It is the lens of the base design, decided three records deep — its glass, its geometry, its colourless fill (`PDWG-98-primary-header-marker-is-a-colourless-lens.md`). An effect that overwrites it takes those decisions with it.

## Considered Options

- **Keep the transition and fake the deformation** — scale and skew the box in step with the existing `transform` transition. It stays inside the timing grid, and it cannot do what the effect is for: without a simulation there is no lag between the two ends, and the lag is the whole liquid.
- **Simulate, and replace the old marker** — one form, less code, and the base design's marker exists only in the history.
- **Simulate, behind a prop that defaults to the old form.**

## Decision Outcome

Chosen: **a spring simulation, reached through the prop `dynamicEffect`, which defaults to the marker as it was.**

**The spring is the effect.** Two of them, one per edge, and the stiffer one leads: what makes the body stretch is that its trailing edge answers its target more slowly than its leading one. No duration can express that, so the movement steps out of the `animationTime` grid deliberately — the only place in the framework that does. What replaces the duration as the thing a reader can check is a set of named constants at the top of `Marker.tsx`, each one with its unit, and a rest condition that stops the loop rather than a clock that ends it.

**The old form stays, and it stays the default.** The prop is off unless a call site asks for it, so the base design's marker remains what the component *is* and the liquid one is what it can do — `MenuNodes` is the one caller that asks. That keeps the decisions of PDWG-98 addressable: they are still realized in the stylesheet, not only in git.

`prefers-reduced-motion` places the marker instead of animating it, as do its first appearance and a node that merely changed its width.

## Consequences

- Good: the effect is contained. One component, one prop, one call site; nothing else in the framework learns that a spring exists.
- Good: the glass survives the move to an SVG path. The lit rim and the inner glow are inset shadows a path does not know, so they are drawn as the same outline clipped to the shape — and they deform with it.
- Bad: a second timing model now lives in the framework, and the next animation of this kind will ask to follow. It should have to argue for it: the grid is what keeps movements feeling like one product.
- Bad: the movement costs a frame loop while it runs, where a transition costs none. It stops itself at rest, so a standing marker is free.
- Neutral: a trailing ball that detaches on long travels was designed and dropped for now — the usual gooey filter works on alpha and would cost the border, the rim and the glow, and modelling the break in the path is half a day of its own.
