---
decided: 2026-09-28
jira: PDWG-86
---

# An empty sort returns a VtWebSocket database to the order of the server

## Context and Problem Statement

§4.5 of the specification sets a sort, and no part of it resets one. A GUI whose user clears the sort of a table has to tell the server to return to its own order. For filters, the VtWebSocketEngine accepts resets of its own, `{"filter": "reset"}` and `"reset": true` per filter, which the specification's deviations list records as open finding C2. No known server sorts yet: the engine always delivers descending by the key field (finding A1), and PsServer is unchecked.

*Source: VtWebSocketSpec repository, `documentation/VtWebSocketSpec.md` §4.5, `references/VtWebSocketEngine_API.md` (filter set) and findings A1 and C2 of `issues/_manual/spec-vs-engine-api-deviations.md`, state of 2026-09-28.*

## Considered Options

- An empty list: `{"set": <db>, "sort": []}`
- A reset value, `{"set": <db>, "sort": "reset"}`, like the engine's filter reset
- No way back: a sort once set stays until another one replaces it

## Decision Outcome

Chosen: **an empty list.** It needs no word of its own. A sort is a list whose order sets the priority, and a list without entries sets none, which leaves the order to the server. The framework's state reads the same way: an empty sort is what a database starts with, so resetting and applying sends the status the database had before its first sort.

A reset value would be a second form of the same command, and one the list of §4.5 does not describe. Without a way back, a user could undo a sort only by reloading the page.

## Consequences

- Good: resetting a sort is the same command as setting one, so a server that implements §4.5 has only to read an empty list as no sort.
- Bad: the specification does not state this meaning yet, so a server that implements §4.5 to the letter may read an empty list differently. The meaning has to reach the specification.
