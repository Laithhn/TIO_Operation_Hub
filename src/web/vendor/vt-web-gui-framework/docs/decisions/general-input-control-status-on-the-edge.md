---
decided: 2026-08-27
jira: PDWG-63
concept_commit: 5c054602
---

# An input control states its status through its edge, and its notice stands below the pane

## Context and Problem Statement

`ERROR` is a statement about a control, and the check box of the time put such a statement on everything it is made of. An input control holds a value the user is reading and typing, and colouring that text costs the legibility the field exists for; since the layout names the control, the pane is the control's only voice. A notice or error text belongs to the control but not inside it, where a two-line notice would grow the pane and a hint would sit where a value belongs.

## Considered Options

- **The value in the status colour** — what the old error line's neighbourhood suggested.
- **The whole pane tinted** — collides with the interaction veil on the same face.
- **The label coloured as well** — decided 2026-08-27 and fallen with the label itself the next day (`general-controls-are-labelled-by-their-layout.md`).
- **The notice inside the pane, or as a tooltip** — the one grows the control, the other hides an error message behind a hover.
- **The edge**, the pane's one ingredient that already draws a line.

## Decision Outcome

Chosen: **the edge**, in both forms — the bare form's edge is drawn and merely transparent at rest, and a status that showed on one form and vanished on the other would leave a faulty bare field stating nothing. `ERROR` takes `attentionHigh`; no signal colour, those describing the status of a thing the page shows rather than of the interface showing it. The value keeps its own colour. The notice stands below the pane, close enough to read as the control's, and starts where the value starts rather than at the pane's edge — it continues the value's text — the inset travelling to the helper as a custom property.

Until 2026-09-04 the edge carried a second status the same way, `EDITED` in `attention`. That status left every control (`general-changed-value-is-no-control-status.md`), and the edge has one colour to state since.

## Consequences

- Good: the entered text stays legible in every status, and the status survives the pointer, the edge speaking where no interaction colours it.
- Bad: an edge is a thin voice — a bare field's status is a one-pixel line, and nothing else on the control repeats it.
