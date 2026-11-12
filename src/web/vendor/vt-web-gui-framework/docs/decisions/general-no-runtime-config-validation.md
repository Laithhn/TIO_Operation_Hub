---
decided: 2026-08-10
---

# Don't validate `config.xml` against its schema at runtime

## Context and Problem Statement

`static/config/config.xml` is fetched and parsed at every application start, and `templates/config.xsd` describes what it may contain. Validating the file against that schema before feeding it into the store would catch a configuration error at the moment it does damage — but it would sit on the startup path of every single start. The file is also **not part of the build**: it is supplied from outside the compiled bundle and may be added or replaced after compilation, for a production build as much as any other.

## Considered Options

- Validate against the XSD at runtime, before the store is configured
- Validate at runtime in development builds only
- Don't validate at runtime; let the schema bind in the editor instead

## Decision Outcome

Chosen: **no runtime validation.** The XSD is referenced from the XML itself (`xsi:noNamespaceSchemaLocation="../../templates/config.xsd"`), so an editor validates while the file is being written — where the error is made, and where the check costs nothing at all.

The parsers make this affordable: every node and attribute is read as optional, and an unreadable setting keeps the slice's `initialState` default, so an invalid configuration degrades instead of breaking. The one genuine requirement — at least one valid language under `<I18n>` — is asserted in code, in `src/store/i18n/utils/createInitialState.ts`, which throws when it is missing. A schema validation would therefore buy earlier detection of mistakes that are already harmless, at a cost paid on every start.

Restricting validation to development builds would not have helped at all, because the configuration does not travel with the build: the file a development build could validate is not the file that later runs, and the one that runs may have been put in place long after compilation.

The decision covers the **startup path**. An explicit validation a developer invokes on demand is a different question and is not ruled out by it.

## Consequences

- Good: nothing is added to the startup path, and the schema still governs where the file is authored.
- Bad: a misspelled node or attribute name is indistinguishable from an absent one. It surfaces as a setting that silently stays at its default, and only an editor with the schema wired up points at it.

The three tiers of failure behaviour this leaves — silent default, logged and dropped, throw — are documented in [documentation/architecture/configuration.md](../documentation/architecture/configuration.md).
