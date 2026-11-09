---
decided: 2026-09-28
jira: PDWG-120
---

# The log of every slice is capped by one helper

## Context and Problem Statement

Nine slices keep a `logs` array of `LogEntry`, three of them one array per WebSocket connection. Their reader is Analysis, a hidden modal window that inspects a running site built on the framework, in the production build as well. 47 places appended to them with `logs.push`, and none ever removed an entry. A long-running GUI whose server keeps sending something unexpected therefore grew its Redux state without limit. A single entry can be large as well: an unknown VtWebSocket message is logged with its whole content through `JSON.stringify`. A cap on the number of entries alone does not bound the memory.

## Considered Options

- A cap per slice, set where each slice appends
- A wrapper around the root reducer that trims every `logs` array after each action
- One helper that every append goes through, capping both the entries and the text length

## Decision Outcome

Chosen: **one helper**, `pushLogEntry` in `src/store/pushLogEntry.ts`. It cuts a text after 1000 characters and closes it with the original length, and it drops the oldest entries once a log holds more than 200. `no-restricted-syntax` rejects a `logs.push(` in `.ts`/`.tsx`, so an append that bypasses the helper fails the lint.

The two values bound one log to about 400 KB: 200 entries of about 2 KB each, since a JavaScript string takes two bytes per character. The last 200 entries suffice to trace a fault in Analysis, and 1000 characters still hold an error message with the beginning of the message it complains about. The oldest entries go first. The three WebSocket slices log at runtime only, and the slices fed from `config.xml` rarely log after startup, so their startup entries stay in practice.

Caps per slice would have set the same two numbers in nine places. A wrapper around the root reducer would walk the whole store after every action, and it would have to know where each slice keeps its logs.

## Consequences

- Good: the memory of every log is bounded, and the two values live in one place.
- Good: a new slice that appends with `logs.push` fails the lint.
- Bad: an entry older than the last 200 is gone, and so is the rest of a long text. A project that reads `selectLogs` sees no more than that.
- Bad: the lint rule matches a member named `logs` only. An array under another name, or one pushed to through a local variable, passes it.
