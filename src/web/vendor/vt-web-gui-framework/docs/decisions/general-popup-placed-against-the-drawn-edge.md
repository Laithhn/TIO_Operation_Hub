---
decided: 2026-09-02
jira: PDWG-63
concept_commit: 5c054602
---

# A control's popup is placed against the drawn edge of its pane

## Context and Problem Statement

The menus of the select boxes cover their control, and an option's text has to land exactly on the control's value. v3 measured the pane, added its margins back and hung the menu out to the side by an option padding — right for a pane that was a bottom line, faking its padding with 3 px against a margin of −3 px and carrying no horizontal padding at all. With the pane of the base design both constructions are gone, and the corrections had turned into errors: 12 px sideways, 3 px up, and a full option padding beside the one control whose margin is not zero, `bare` with `flush="both"`.

## Considered Options

- **Correct for the margins**, as v3 did — `getBoundingClientRect()` returns the drawn edge, which a margin has already moved, so the correction counts the shift twice; fixing its sign reproduces the error mirrored.
- **Place the popup against the layout's column** — brings the edges into line and parts the two texts by the 12 px the pane pads.
- **The drawn edge, corrected for nothing.**

## Decision Outcome

Chosen: **the drawn edge**. The text is the criterion, not the edge: option and value carry the same padding chain behind an edge of the same width, so the drawn edge is where the chain adds up. Nothing is rounded on the way — a menu pinned by its right edge and given a width has its left edge as the difference of the two, and two roundings add up to an offset that looks systematic in a grid whose columns share one fraction.

## Consequences

- Good: the value and the selected option lie on the same baseline to the bit, measured with the menu shut and open.
- Bad: where a negative margin has pulled a pane past its column — `bare` with `flush` — the popup follows the pane and stands visibly wider than the column; the text alignment wins over the edge alignment.
