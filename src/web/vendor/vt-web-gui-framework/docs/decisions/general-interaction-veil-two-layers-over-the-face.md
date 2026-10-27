---
decided: 2026-08-28
jira: PDWG-63
concept_commit: 5c054602
---

# `FOCUS` and `HOVER` are one two-layer veil over the control's face, and the edge follows the form

## Context and Problem Statement

`impulseGreen` is the framework's interaction colour and exists for nothing else (`documentation/design/colors.md`). How it reaches a control was open: the input controls drew a green line, the check box coloured its icon, the button scaled. A form was needed that holds on a translucent pane, on a saturated `highlight` colour and on a control without any surface, that changes no geometry — a scale drifts the icon against the label, and `will-change: transform` does not fix it — and that reads on a face as small as a check box's box as well as on a field.

## Considered Options

- **A green line** under or around the control — the v3 form; it did not survive on a glass button, and around a pane-less control it grew a line where none stands at rest (built 2026-08-28 at the bare button, the bare field and the check box: too loud).
- **A single green veil** over the whole face, `impulseGreen` at 25 %, then 15 % — built 2026-08-21 and judged right at the button; seen at the input group on 2026-08-28 it read as a repaint of the field rather than as a status.
- **A separate, louder focus ring** in the form WCAG 2.2 SC 2.4.13 describes — built 2026-08-28: too dominant for a status that occurs on every click, and `impulseGreen` reaches 1.36:1 against `offWhite` where that criterion asks 3:1.
- **A `background-color` per status** — replaces the highlight colours instead of layering over them; a `signalError` button lost its red (measured 2026-08-17).
- **The neutral rungs** `backgroundInput`, `backgroundFocus` and `backgroundClick` of the `controls` map — the older answer, neutral grey where the interaction colour is green.
- **Two layers** — a neutral one that darkens plus a green one over it.

## Decision Outcome

Chosen: **two layers, one veil**. A neutral layer darkens the face — `primary` at .05 on a light background, `offWhite` at .07 on a dark one, the values eBay (4 %) and Material (8 %) publish for a hover layer — and `impulseGreen` at .12/.15 lies over it and names the darkening as an interaction. Neither works alone: the neutral one by itself says only "this got darker", the green one by itself was pale on a check box's box and loud on a field. `FOCUS` and `HOVER` show the same thing, and `PRESSED` adds the veil a second time. The veil is an inset `box-shadow` spread wide enough to meet itself in the middle of any control, which lays it over whatever is behind it — the pane, a `highlight` colour — instead of replacing it, and it rides in the slot idiom of `general-css-custom-property-status-layers.md`.

**The edge follows the form, not the status:** a control that carries a surface has a line already and colours it `impulseGreen` (.7 on light, .8 on dark); a control without one grows none. **The face the veil covers is the control itself:** the icon of a check box, never its label — a label may be long or wrapped, and a check box often sits in a row that hovers itself — and the whole pane of an input control, which holds nothing but the value since the layout names it. The rows and cells of the popup worlds a control opens take the same veil, and a focus inside a control whose pane already shows it takes the veil a second time — the focused part of the date time picker — the sum a pressed button shows. Selected text is no interaction status and keeps a neutral highlight, `controls.color.textSelection`, the one rung of the old ladder left, under the name of what it is.

Which pseudo-class raises the veil: `general-interaction-statuses-from-css-pseudo-classes.md`.

## Consequences

- Good: one appearance serves every control and every background, the saturated `highlight` colours included, because the veil lies over a colour rather than in it.
- Bad: the veil is dimensioned for the largest face it covers, so it is at its palest on the smallest, the check box's box; a change to its strength has to be judged on both, which is why the test bed kept a check box beside every control under judgement.
- Bad: two layers need an empty slot of two layers, `slotEmptyVeil`, beside the one-layer `slotEmptyInset` — a slot resting on the wrong empty value jumps instead of easing.
