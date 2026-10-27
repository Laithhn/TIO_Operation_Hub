---
decided: 2026-08-21
jira: PDWG-63
concept_commit: 5c054602
---

# A button's `type` names its surface and `highlight` its colour, and two statuses exist for the filled form alone

## Context and Problem Statement

The button offered `type: 'raised' | 'flat' | 'overlayed'` and a `highlight` with a colour set plus `weak`. With the pane in three strengths the resting forms became four, `flat` named an absence that no longer existed, and `weak` named the appearance the tinted form now carries. `BUSY` and `ACTIVE` were drawn on every form.

## Considered Options

- **`type: 'default' | 'overlayed'` plus `highlight: 'none'`** for the flat case — decided 2026-08-20 and reversed the same day: it presses a rank into the colour prop, so a secondary destructive button, weak and red at once, cannot be said.
- **`highlight: 'weak'` on the filled button** — built 2026-08-20 and dropped: it turned the pane into an outline, which reads as flush with the surface rather than as a lighter body.
- **Keep `weak`** as a synonym of the tinted form — two names for one appearance.
- **A discriminated union** rejecting `BUSY` on a non-filled form at compile time — buys nothing for the JavaScript consumers a framework serves, and splits the prop type that carries the documentation.
- **`type` with four values of one kind**, the restrictions in documentation and normalization.

## Decision Outcome

Chosen: **`type: 'filled' | 'tinted' | 'bare' | 'overlaid'`**, the kind of surface a button carries and nothing else; `highlight` keeps naming the colour it speaks, `weak` removed, `solid` kept for the two forms that have a plate to fill. `BUSY` and `ACTIVE` exist for the filled form alone: the component normalizes them to `IDLE` before anything reads the status, so on the other forms appearance, interaction and `aria-pressed` stay idle rather than locking without a visible reason. `overlayed` became `overlaid` in the same breath, every call site moving anyway.

## Consequences

- Good: what a button is and what colour it speaks are two independent props again.
- Bad: a contract change on the control every consumer uses — thirteen call sites of `type` in the repo, and every consumer project's.
- Bad: a consumer setting `BUSY` on a bare button gets a silently idle button; the prop's documentation is where that is stated, and nothing else warns.
