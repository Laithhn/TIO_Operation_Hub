---
decided: 2026-09-28
jira: PDWG-86
---

# The sort of a VtWebSocket database has a hook of its own

## Context and Problem Statement

§4.3 of the specification lets a layout list its `sorters`, and §4.5 defines the command `{"set": <db>, "sort": [...]}` that applies a sort. A sort is set, applied, and followed by a new request of datasets, since it discards the order the datasets in the store came in. The framework already had two hooks for a database: `useVtWebSocketDatabase` for its lifecycle and its datasets, and a hook of its own for its filters, which sets, resets and applies them. A sorter ID is no field ID: what a sorter sorts by is agreed between the source and the project that uses it.

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md` §4.3 and §4.5, state of 2026-09-28; that a sorter ID is no field ID confirmed by Leoni Weber, owner of the specification, on 2026-09-28.*

## Considered Options

- Integrate the sort into `useVtWebSocketDatabase`
- A hook of its own, `useVtWebSocketDatabaseSort`, beside the one for the filters
- Actions and selectors only, dispatched by the content

## Decision Outcome

Chosen: **a hook of its own.** Each concern of a database has its hook: its lifecycle and datasets, its filters, its sort. One hook for all of them would grow too large to take in at a glance, and not every database needs filters or a sort. The sort hook mirrors the filter hook — set, reset and apply, optionally at once after every change and optionally requesting datasets again — and adds `sortBy`, which takes the ID of a sorter and a value. The framework ties no sorter to a column, because a sorter ID is no field ID; the content does it.

`useVtWebSocketDatabase` would have known the number of datasets to request again, since it keeps the number the table last asked for, and it runs the start of the database. Both advantages are small: the sort hook takes the number as an option, as the filter hook does, and a sort that has to be in place at the start is set in the `dispatchInitialSettings` callback of `useVtWebSocketDatabase`, the one place that knows the moment between the layout and the start. Actions and selectors alone would leave every content to repeat the apply-and-request sequence.

## Consequences

- Good: a content takes the sort hook only for a database that is sorted, and the three hooks read alike.
- Bad: the number of datasets to request after a sort is given twice, to the database hook's `requestDatasets` and to the sort hook's options.
