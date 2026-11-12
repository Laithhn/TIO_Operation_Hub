---
decided: 2026-09-28
jira: PDWG-71
---

# A VtWebSocket filter of type "date" is read as a numeric filter

## Context and Problem Statement

§4.3 of the specification lists four filter types: `int`, `text`, `select` and `mselect`. `receiveDatabaseLayout` rejected every other type with a warning. The VtWebSocketEngine delivers `date` as well, as in `{"id":"ZeitVon","ops":[">="],"src":"Zeitpunkt","type":"date"}`. To the engine, a filter's type is pure GUI information about which control to show, and it does not evaluate it. Every date filter of the engine was therefore missing, although `useVtWebSocketDatabaseFilters` already offered `setDateTimeValue` to set one. The specification's deviations list records the gap as finding C18, still open.

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md` §4.3, `references/VtWebSocketEngine_API.md` (DBSourceHandler, filter keys) and finding C18 of `issues/_manual/spec-vs-engine-api-deviations.md`, state of 2026-09-28.*

## Considered Options

- Keep rejecting `date` until the specification lists it
- Read `date` as `int`, the type turning into `int`
- Read `date` as a numeric filter that keeps its type `date`
- A filter type of its own, with a `Date` object as its value

## Decision Outcome

Chosen: **a numeric filter that keeps its type.** A `date` filter is read, set and sent exactly like an `int` filter: a number, optionally with the operators of `ops`, set through `setNumericFilter`. Its type stays `date`, because that is what a GUI needs to offer a date picker instead of a number field.

Waiting for the specification leaves every date filter of the only known server unusable in the meantime. Turning the type into `int` drops the one hint the server sends. A `Date` object as the value does not pass the serializability check of the store, and the server receives a number either way.

## Consequences

- Good: the date filters of the engine work, through the setters a GUI already uses.
- Good: the unit is settled. The value of a `date` filter is a Unix timestamp in milliseconds, which is what `setDateTimeValue` sends.
- Bad: the framework accepts a type the specification text does not list yet. Should C18 settle on something else there, this reading has to follow.

*Source of the unit: Leoni Weber, owner of the specification, by phone to the developer on 2026-09-28.*
