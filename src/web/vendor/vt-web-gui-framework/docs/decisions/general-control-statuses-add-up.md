---
decided: 2026-08-18
jira: PDWG-63
concept_commit: 5c054602
---

# The statuses of a control add up instead of ranking each other

## Context and Problem Statement

A control shows two kinds of status at once: a status the consumer sets — `IDLE`, `DISABLED`, `ERROR`, `BUSY`, `ACTIVE`, and until 2026-09-04 `EDITED` — and interaction statuses it determines itself — `FOCUS`, `HOVER`, `PRESSED`. Where several coincide, either one wins or all show. The input controls ranked theirs in four priorities, and the pointer erased the error line for as long as it rested on the field; the button had no model at all. Material Design 3 shows one layer at a time and lets the higher-ranking status win, eBay's statuses are additive, and the two systems genuinely disagree.

## Considered Options

- **Ranking**, Material's way — one layer at a time, the highest rank shows. It avoids the arithmetic of stacked layers: the combinations Material permits would stack to 88 % and bury the content.
- **Additive**, eBay's way — every coinciding status shows, and the strengths are dimensioned as sums.

## Decision Outcome

Chosen: **additive, on two axes**. `PRESSED` adds to `FOCUS`/`HOVER`, and the interaction axis adds to the status: a faulty field under the pointer keeps its edge and gains the veil, a pressed button shows its hover veil underneath. One suppression exists — a status that locks the control, `DISABLED`, `BUSY` or `ACTIVE`, shows no interaction status — and the control keeps determining them nonetheless, so `HOVER` returns the moment the lock lifts while the pointer still rests on it. Exactly one status holds at any time; where two would apply, a changed entry that is also invalid, the consumer's logic decides which one, the status being a single source of truth that lives outside the control.

## Consequences

- Good: a status is never hidden by the pointer, which is what the ranked model did to the error line; a newly ported control inherits one rule instead of inventing an order.
- Good: the strengths are dimensioned once, as sums, and the same values serve every control.
- Bad: the sums have to be kept in hand — every legal combination of status, veil and press has to be judged in both themes, a pass every control that takes the base design goes through.
