---
decided: 2026-09-11
jira: PDWG-103
---

# A control reports only a value it made itself, never one it took over unchanged

## Context and Problem Statement

An input field holds its own copy of what the `<input>` element shows, and it takes that copy over from the props `value`, `type`, `min` and `max` whenever one of them changes. v3 called `onChange` at every take-over that moved the copy, the unchanged ones included. v4 inherited the call but never reached it: from the TypeScript port of 2026-02-04 until 2026-09-11 the take-over parsed the internal value instead of the prop, so no value from outside ever arrived and the question stayed theoretical (PDWG-103). Repairing the take-over makes it real for every app on the framework, and the two directions pull apart: reporting a value the content just handed in tells it about an input the user never made, while reporting nothing hides a value the field could not accept as given.

## Considered Options

- **Report every take-over** — v3's behaviour, and what the broken v4 code would have done.
- **Report no take-over at all** — a value from outside is display only.
- **Report only what the field made itself** — a value it had to parse, to clamp into the range, or to drop with a changed type.

## Decision Outcome

Chosen: **only what the field made itself**. `onChange` then means one thing in both directions — "this is the value now, and you do not know it yet" — and a value from outside stays what the content meant it to be, a display.

The date time picker already works this way and is what the rule is named after rather than the input alone: `useDateTime` takes a new `value` over without a word, and counts a converted time zone as a change of its own, which the picker does report.

Reporting every take-over is what the consuming projects showed to be wrong. In `vasSettings.jsx` of VtWebGuiPsCoLocal the six trigger distances arriving from the device would land in the content's `changedTriggers`, which enables the save button and stops later device values from showing; in its filter card an applied filter would be re-applied the moment the card is opened. Both are the same mistake: the content is told it has an edit on its hands when all that happened is that its own value reached the field.

Reporting nothing loses the other half. A field given `5` under `min={10}` shows `10`, and the content would keep believing it holds `5` — the value that gets saved would not be the value the user reads. So a value the field had to change is reported, and the comparison that decides it is `nextVal !== value` on the parsed result.

One emptiness against another is exempt from that comparison. `null` and the empty string both mean "no value", and which of the two a field holds follows from its type rather than from anything the content decided: a numeric field makes `null` out of the empty string, a text field the empty string out of `null`. Nothing is lost either way, and the empty string is what prop `value` defaults to — without the exemption every numeric field would report `null` the moment it mounts.

## Consequences

- Good: a content can drive a field from the backend without its own state being written back at it; taking a value over costs no render in the content.
- Good: what `onChange` carries is always news — an input, a parse, a clamp, or a value dropped with the type.
- Bad: a contract change against v3 for anyone porting a consumer that relied on the call after every take-over. The v4 line is unaffected, the call never having arrived there.
- Bad: a content that gave the emptiness the field does not use keeps it — the empty string at a numeric field, `null` at a text one — although the field itself holds the other; the difference surfaces at the first input or at `onBlur`.
