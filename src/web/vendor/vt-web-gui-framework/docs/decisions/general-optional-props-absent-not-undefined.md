---
decided: 2026-08-12
---

# Express an unset prop by absence, never by an explicit `| undefined`

## Context and Problem Statement

`tsconfig.base.json` sets `exactOptionalPropertyTypes: true`, so an optional prop declared `x?: T` rejects an explicitly assigned `undefined`. Porting the dataTable content surfaced what that costs a consumer: v3's `DataTableSortOrder.UNSORTED` has no v4 counterpart, and the v3 idiom for it — a ternary yielding `undefined`, or an unassigned `let` collected into an object literal — no longer compiles against `sortOrder?: 'asc' | 'desc'`. The question was whether the framework should widen the prop to admit `undefined` as the explicit "unsorted" value.

## Considered Options

- Widen the one prop: `sortOrder?: 'asc' | 'desc' | undefined`
- Widen every optional prop in the framework the same way
- Keep `?: T` and let absence mean "not set"

## Decision Outcome

Chosen: **keep `?: T`** — absence is the framework's only way to say "not set".

The framework is already uniform on this: no prop under `src/` is declared `readonly x?: … | undefined` (the handful of `| undefined` occurrences sit inside callback argument objects, e.g. `tableId: string | undefined`, where the field is mandatory and its value genuinely nullable). Widening `sortOrder` alone would make it the one exception.

For `sortOrder` the widening also buys nothing semantically: `HeaderCell` renders no sort arrows whether the field is absent or explicitly `undefined`, so the distinction `exactOptionalPropertyTypes` exists to draw has no meaning here. What remains is a syntactic convenience — and that argument is not specific to `sortOrder`: it applies equally to `valueSize`, `backgroundColor`, `justifySelf`, and every other optional field. Granting it everywhere would neutralize `exactOptionalPropertyTypes` for props, which is the real price of the option and far beyond the problem that raised it.

The ergonomics are recoverable without a type change: build a pre-filled object and assign only the fields actually set, instead of collecting declared-but-maybe-unassigned variables. That pattern is the one `/port-content` prescribes for cell iterators.

## Consequences

- Good: one idiom for "not set" across every component's props; `exactOptionalPropertyTypes` keeps the meaning it was enabled for.
- Good: a v3 enum member that only encoded "nothing selected" (`UNSORTED`) maps to a single mechanical rule during a port — drop the field.
- Bad: a consumer cannot write `sortOrder: isSorted ? 'desc' : undefined` in an object literal; a conditionally set field needs the assign-after-create pattern or a conditional spread.
