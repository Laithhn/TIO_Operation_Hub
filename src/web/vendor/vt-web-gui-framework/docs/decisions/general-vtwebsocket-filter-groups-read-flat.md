---
decided: 2026-09-28
jira: PDWG-71
---

# The filter groups of a VtWebSocket layout are read flat

## Context and Problem Statement

A layout answer of a `DBSourceHandler` carries its filters either as a flat `filters` array or as `filtergroups`, whose entries hold a `label` and a `filters` array. §4.3 of the specification allows only one of the two. `receiveDatabaseLayout` read only the flat form, so a server answering with groups produced a database without a single filter, and without an error. The VtWebSocketEngine sends the flat form only, which the specification's deviations list records as conformant (finding A3), so no known server sends groups yet.

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md` §4.3 and finding A3 of `issues/_manual/spec-vs-engine-api-deviations.md`, state of 2026-09-28.*

## Considered Options

- Read the filters of every group into the flat list, and drop the grouping
- Read them flat, and keep the groups as lists of filter IDs without their labels
- Keep the groups with their labels, a label serving a GUI as the key of its own texts

## Decision Outcome

Chosen: **read flat, and drop the grouping.** A group has no ID, only its label, and the framework takes no labels from a server (ADR `general-vtwebsocket-no-backend-labels.md`). A GUI already supplies the text of every filter from the i18n slice by the filter's ID, and it arranges the filters the same way. The layout state and every selector stay as they were, so no consumer has to change.

Groups kept as lists of IDs could be told apart by their position only, and a server that reorders its groups breaks that without notice. A label kept as a key would be the one key the label decision leaves out, and a server localizes it: the specification's own example shows the label in the language the source is configured for. The key would then change with the server's language.

A layout that carries both forms anyway loses neither: both are read, and a warning is logged. A filter ID that occurs twice keeps its first entry, also with a warning. A flat list with a duplicate used to keep its last entry, without one.

## Consequences

- Good: a server that answers with groups yields all its filters, and nothing downstream of the layout changes.
- Bad: a GUI that wants the server's grouping cannot get it from the framework and has to group the filters itself.
- **Open:** whether a server ever sends groups. The engine does not, so the reading is checked against the specification's example only.
