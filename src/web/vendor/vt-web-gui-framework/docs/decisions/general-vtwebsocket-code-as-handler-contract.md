---
decided: 2026-08-26
jira: PDWG-69
---

# Let the framework code be the contract for the VtWebSocket handlers the spec omits

## Context and Problem Statement

`VtWebSocketSpec.md` describes three things: the fixed source `API`, the fixed source `AUTH` and the `DBSourceHandler`. `src/store/vtWebSocket/vtWebSocketConnections` speaks to five handlers beyond them — RESTClientSourceHandler, ImageSourceHandler, ViIOSourceHandler, SNMPSourceHandler and Log4CxxHandler — and each has a message shape the specification never mentions. Two `set` options are in the same position, `long_polling` and the cache value `full`, and three of the framework's `update` forms carry neither `del`, `add` nor `edit`, which section 2.4.4 demands of every `update`.

The document is knowingly incomplete and is to grow step by step; extending it is not scheduled work. Anything the framework sends to these handlers therefore has no independent description at all.

*Source: VtWebSocketSpec.md, VtWebSocketSpec repository, state of 2026-08-25; its incompleteness confirmed as deliberate on 2026-08-26.*

## Considered Options

- Extend `VtWebSocketSpec.md` now, so that one document covers the whole interface
- Treat the five handlers as unsupported and take them out of the framework
- Let the framework code stand as the contract until the specification catches up

## Decision Outcome

Chosen: **the framework code is the contract wherever the specification is silent.** For the five handlers and the two `set` options, `vtWebSocketConnections.slice.ts` defines what a valid message is, and no ticket tracks the gap.

Extending the specification first would block work on a document nobody has scheduled to grow. Removing the handlers would take away capabilities that consumer projects use, to buy a consistency the specification cannot deliver yet either.

The decision covers the **gap, not a conflict**. Where the specification does describe something and the code deviates, the specification wins and the deviation is a defect on our side — that is what the sections 4.3 corrections of PDWG-70 and PDWG-72 are about.

## Consequences

- Good: nothing waits for a document that is not being written, and the handlers stay usable.
- Bad: for these five handlers nothing can be checked against an independent description, and a backend author has to read frontend code to learn the message shapes. Where the code's own knowledge has already faded, it is not recoverable from either side — the `cache` parameter documents its value `full` as "to do anything I have forgotten".
- **Open:** that the message shapes the framework sends are the ones these handlers accept — settled when the specification grows to cover them, or when a backend developer confirms them against a running server.

Which handlers are affected, and where their shapes are defined: [documentation/architecture/vt-web-socket.md](../documentation/architecture/vt-web-socket.md).
