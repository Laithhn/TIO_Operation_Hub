---
decided: 2026-08-21
jira: PDWG-63
concept_commit: 5c054602
---

# `BUSY` shows a wait, in the form that fits the control

## Context and Problem Statement

A control that was operated and is processing, or that awaits a server's answer, has to say so: locked alone reads like `DISABLED`, and a consumer sent to `DISABLED` gets a lock without a visible reason. The button, the four input controls and the login example all carried the status; how it shows was per control, and the input controls' `inactive` meant two things at once.

## Considered Options

- **A spinner in place of the button's icon** — the more explicit form, but a text button has no icon slot and an icon button would change width, which no status may do.
- **Dropping `BUSY` from the input group**, as the requirements first said — sends consumers to `DISABLED` for a field waiting for a response, a real case the login example sets.
- **A third status `inactive`** beside `DISABLED` and `BUSY` for a select box with nothing left to choose — one appearance under two names.
- **A form per control** — a travelling band where there is a plate, a spinner where there is an icon slot.

## Decision Outcome

Chosen: **a form per control**. The button shows a light band travelling across its plate once per 1400 ms, carried by a pseudo-element so that it lies over the background the status gives the button and touches no geometry; under `prefers-reduced-motion` the band stands still and stays visible, the motion being all that separates a waiting button from an active one, both in the attention colour. An input control shows a spinner in place of its trailing icon. Both lock the control as every lock does. The input controls' `inactive` meant `BUSY` and "nothing left to choose" at once; the second is a lock the control can see for itself, and it is a `DISABLED` the component sets by itself.

## Consequences

- Good: a waiting control is told apart from a locked one, and the consumer keeps a status that says why.
- Bad: two expressions for one status, and a further control would need its own — the criterion is that the form fits the control, not that it is shared.
