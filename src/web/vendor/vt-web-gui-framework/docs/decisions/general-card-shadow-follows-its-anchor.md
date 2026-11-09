---
decided: 2026-08-31
jira: PDWG-63
---

# A card's shadow follows its anchor

## Context and Problem Statement

The three shadow levels in `src/assets/styles/layout/_index.scss` — `level1` to `level3` at the time, named `anchored`, `floating` and `modal` since PDWG-123 — are a scale of **height, not of strength**: from the first to the third the offsets and blurs grow while the opacities fall. A higher level therefore reads as floating further above the surface, not as a darker shadow. The `Card` used two of them: `level2` by default, and `level1` through the boolean prop `smallShadow`.

Which of the two a card should take was never in doubt in practice. All three framework-internal users of `Card` that place it on a reference element set `anchorElemRef` and `smallShadow` **together** — `popups/menu/Menu.tsx`, `controls/dateTimePicker/calendar/Calendar.tsx`, `controls/input/proposalList/ProposalList.tsx`. The pairing was a convention every call site had to remember, and two cards had already missed it: the settings card and the columns selection card of the data table example both hang off a toolbar button and floated at `level2`. The columns selection card could not have set it at all — it lists the card props it forwards one by one, and `smallShadow` was not among them.

## Considered Options

- **Keep the prop, forward it** — `ColumnsSelectionCard` gains `smallShadow` and the call sites set it.
- **Keep the prop, fix the two call sites** — the columns selection card sets it internally, the example's settings card as a prop.
- **Derive it from the anchor** — a card with `anchorElemRef` takes `level1`; the prop goes.

## Decision Outcome

Chosen: **derive it from the anchor**. `Card` sets its `anchored` class from `!!anchorElemRef`, and `smallShadow` is removed from `CardProps`. A card placed on a reference element belongs to that element and hovers just above it, which is what the lower level, `anchored`, states; a card standing on its own keeps `floating`. The reason the prop existed — "to visually tie a card more closely to the reference element", as its own documentation put it — is the anchor itself, so the prop asked the consumer to restate what the component already knew.

Both other options leave the rule where it caused the two misses: in the call sites. Forwarding the prop additionally grows the surface of every component that wraps `Card`, and each such wrapper would have to forward it again.

## Consequences

- Good: every anchored card carries the matching shadow by construction, the two data table cards included, and a new one cannot forget it. One prop less on `Card` and on everything that wraps it.
- Good: the class is named `anchored` rather than `smallShadow`, so the stylesheet says which case it serves instead of what it draws — the level behind it can change without the name going stale.
- Bad: an anchored card that should float high is no longer expressible. No such case exists in this repo; should one arise, it needs a prop that says the *height*, not one that says the shadow.
- Bad: a contract change for consumers outside the repo — a `smallShadow` they set stops compiling. The commit carries `!` and a `BREAKING CHANGE:` footer, and removing it is the whole migration: an anchored card already gets what the prop asked for.
