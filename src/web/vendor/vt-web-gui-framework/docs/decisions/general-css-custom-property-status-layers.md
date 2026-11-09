---
decided: 2026-08-21
jira: PDWG-63
concept_commit: 5c054602
---

# Carry the status layers of a control in CSS custom properties

## Context and Problem Statement

The base design of the controls expresses every status as a translucent layer over the control, and the layers **add up**: a pressed button shows its hover layer underneath, and both lie over whatever background a status gives it. All of these layers share one CSS property, `box-shadow`, together with the ingredients of the resting surface — contact shadow, lit rim, inner glow. A rule that sets `box-shadow` replaces the whole list, so each status would have to restate the ingredients it does not mean to touch. That is what the discarded first attempt did, and it silently overwrote the resting surface. Before this decision `src/` contained no CSS custom property at all.

## Considered Options

- **SCSS variables per combination** — each status rule lists the pane of its type again; four types × two themes × three status combinations.
- **A pseudo-element per layer** — `::before` and `::after` carry the layers independently of `box-shadow`.
- **One custom property per layer** — a single `box-shadow` assembles five slots, and each rule sets only its own.

## Decision Outcome

Chosen: **one custom property per layer**. `.button` declares `--paneShadow`, `--paneRim`, `--paneGlow`, `--statusVeil` and `--statusPress` and assembles them in one `box-shadow`; a type fills the pane slots, a status fills its own. An unused slot holds a shadow of zero size in a transparent colour rather than being left out, which keeps the list length constant — two shadow lists interpolate only while both hold the same number of layers and every layer agrees on `inset`, so a list that grows or shrinks jumps instead of easing out. That matters because the base design's timing rests on exactly that ease-out.

The input group's pane declares its slots the same way — the three pane slots and `--statusVeil`, plus `--paneFill`, `--paneBorderColor` and `--paneEaseMs` for the fill, the edge and the duration a status switches — and every slot filled from a two-layer value rests on an empty value of two layers, `slotEmptyVeil`, beside the one-layer `slotEmptyInset`: the layer count has to agree on both sides of a transition, and the interaction veil has two layers since 2026-08-28.

The pseudo-element route was not rejected but assigned a job of its own: the light band travelling across a waiting button, which no shadow can draw.

## Consequences

- Good: the statuses add up without any rule restating what it does not own, which is what the additive status model requires; the transition of the whole appearance stays interpolatable; and moving the values into `src/assets/styles` is one declaration per slot.
- Good: a new status costs one slot and one rule instead of a variant per type and theme.
- Bad: the slots are the first custom properties in this code base, so the pattern carries no precedent a reader could recognise — inlining a value back into the `box-shadow` would end the additivity without any error. The base rule therefore declares all five slots in one place, with the reason beside them.
