---
decided: 2026-08-26
jira: PDWG-69
---

# Don't take the labels of a VtWebSocket layout from the server

## Context and Problem Statement

The layout answer of a `DBSourceHandler` describes each column and each filter with more than structure. A field carries `label`, `shortlabel`, `visible` and `proc` beside its `id`, `type`, `isKey` and `editable`; a filter carries `label`, `src` and `tooltip` beside the keys the framework reads. The server localizes the labels itself — section 4.7 of the specification shows a layout answer and notes that the names are German because `lang` was set to `DE`. `receiveDatabaseLayout` kept none of these keys, and a consumer building a table had to supply every heading of its own.

*Source: VtWebSocketSpec.md, VtWebSocketSpec repository, state of 2026-08-25.*

## Considered Options

- Take everything the layout answer offers and let a GUI use the server's labels
- Take the labels and treat them as a fallback behind the consumer's own texts
- Take only the structural keys and leave the labels out

## Decision Outcome

Chosen: **the labels stay out.** `label` and `shortlabel` of a field and `label` of a filter are not read, because the text a user sees comes from the framework's i18n slice — a translation delivered by a database backend is a second, parallel source for the same thing, and one this framework cannot reach when the language changes.

`visible` is taken and is carried as `isVisible`, next to the `editable` flag that a separate decision made binding. The framework acts on neither by itself; both describe the data, so a GUI decides what to make of them.

`src` and `tooltip` of a filter and `proc` of a field stay out for a different and weaker reason: nothing needs them yet. `src` names the source field a filter works on, which matters only once filters and columns are tied to each other. `tooltip` is help text a consumer can write itself. `proc` names a value conversion that the specification calls "zwischen den Entwicklern abzusprechen" — an agreement between the backend and frontend developers of one project, which the framework cannot act on without knowing it, so carrying the name through would serve a consumer that does not exist yet. All three are a line of code away once a case turns up.

## Consequences

- Good: one source for every visible text, and a language switch in the GUI needs no second path through the backend.
- Bad: a project whose column headings already live in its database has to repeat them in its i18n tables, and the two can drift apart.
- **Open:** that a consumer can carry every heading in its i18n tables, which no content has had to do yet — settled by the first content that renders a database table.

Which keys the layout keeps: [documentation/architecture/vt-web-socket.md](../documentation/architecture/vt-web-socket.md).
