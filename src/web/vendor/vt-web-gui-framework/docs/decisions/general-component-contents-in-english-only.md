---
decided: 2026-09-15
---

# Write the component contents in English only

## Context and Problem Statement

Each content under `proj/contents/components` demonstrates one framework component: what it is, and what each of its props does. Every v3 content was written in German, so a port carries that German prose over unless someone decides otherwise. The image viewer was the first content to reach `proj/contents/components`, which made the language a question that had to be answered before further ports followed it.

## Considered Options

- Keep the German prose the v3 contents carry
- Carry both languages, through a translation table per content
- Write the contents in English only

## Decision Outcome

Chosen: **English only** (decision of the developer on 2026-09-15). These contents are developer documentation, and their readers are the developers of the projects that consume the framework — the same audience as the rest of the repository's working substrate, which is English throughout (`vi-base/artifact-composition.md`). A translation table per content would double the prose to maintain and buy that audience nothing.

Scope: `proj/contents/components/**`. The example contents under `proj/contents/examples` still carry German and are not covered by this record.

## Consequences

- Good: one language per content, matching the language of the code and the docs around it. A consuming project's developer reads the same text whichever language they work in.
- Good: the demo application can show the component contents to a customer or a partner without a language barrier.
- Bad: a German-speaking reader loses the German wording v3 offered, and no path back to it is kept.
- Every further port out of `proj/OLDconts` now carries a translation step on top of the structural port. All 31 description contents there are German, down to the field labels `Komponente`, `Quellcode-Pfad` and `Include-Code`, which this record's translation renders as `Component`, `Source path` and `Import`.
