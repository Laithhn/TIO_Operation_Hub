---
decided: 2026-09-04
jira: PDWG-88
---

# A changed value is no status of a control; the form around it states it

## Context and Problem Statement

Since 2026-08-27 every control but the button carried the status `EDITED`: the consumer set it once the user had changed the value, and the control coloured its edge (the input group) or its icon and label (the check box) in `attention`. The switch took it over for a day. At the running controls on 2026-09-04 the colour play was full: `attention` already says "switched on" at the switch and the `ACTIVE` button, thirteen backgrounds stand behind the controls, and the ladder in `colors.md` opens with "nothing needing attention gets no colour". A change the user made themselves is not something they need to be alerted to.

## Considered Options

- **Keep `EDITED` on every control** — as built.
- **Keep it for the input group alone**, on the grounds that only there something is edited — the boundary is fuzzy: a select box picks a value rather than editing one, and would keep the status all the same.
- **A colourless marker** — still a statement the framework draws per control and the consumer computes per control.
- **Drop the status and leave the statement to the form**, the way the columns selection card of the data table does it: a reset button per group and for all, `DISABLED` while everything stands at its default.

## Decision Outcome

Chosen: **the status leaves every control**, and with it the `typoEdited` class and the `editedColor` of the typo sets, which existed for nothing else. What needs attention is not the change but that it is unsaved, and that is a statement about the form, not about the field: a save or a reset that becomes possible, a prompt on leaving. Material, Fluent and the Apple HIG know no per-field "modified" status; where a settings page marks a changed setting, VS Code's for one, the mark comes with the action that undoes it. The status had cost nothing to drop: it was born as a requirement of the base design without a recorded need, v3 knew it at no control, and no content or consumer set it. The switch gave it up first, for a reason of its own — what it switches takes effect at once (`PDWG-87-switch-as-paned-control-for-touch-only-projects.md`).

The edge of an input control therefore states one status, `ERROR` (`general-input-control-status-on-the-edge.md`), and `attention` in the controls says "switched on" and nothing else.

## Consequences

- Good: one meaning per colour in the controls, and one status colour on the edge; a combination row of the acceptance pass falls away.
- Good: the status sets shrink — `IDLE` and `DISABLED` for the check box and the switch, `IDLE`, `DISABLED`, `ERROR` and `BUSY` for the input group.
- Bad: a consumer who wants to see *which* field of a long form changed gets no building block from the framework and builds the mark in the layout, next to the action that undoes it — the layout owns what stands around a control (`general-controls-are-labelled-by-their-layout.md`).
- Bad: a contract change on five enums; no consumer had set the value.
