---
decided: 2026-09-22
---

# Let a component content show its props instead of listing them

## Context and Problem Statement

A v3 content under `components/**` carried a `props/` folder, and often a `methods/` one beside it: a hand-written table of every prop with its description, maintained inside the content. 24 of the 29 v3 component contents carry such a table, 9 of them both. From v4 on a prop's description lives as JSDoc beside the prop in the component's `<name>.types.ts`, which `documentation/consuming/using-the-framework.md` names as the API reference — there is no second place that describes a prop. Porting the tables would create one. The first two ports, the image viewer on 2026-09-15 and the button on 2026-09-22, therefore left both folders out and recorded the question as open. With nine further component contents still disabled in `static/config/config.xml`, it had to be answered before they followed.

## Considered Options

- Port the `props/` and `methods/` tables as they stand
- Generate the tables into the content out of the `*.types.ts` JSDoc at build time
- Drop the tables and let the content demonstrate the props instead

## Decision Outcome

Chosen: **drop the tables** (decision of the developer on 2026-09-22). A component content is built from the three sections the image viewer and the button now carry:

- **`Description`** — what the component is and how it is operated.
- **`Examples`** — a showroom: several configurations and uses side by side, none of which the reader can change. It is left out where such a comparison says nothing; the image viewer content has no `Examples`.
- **`TryOut`** — every prop of the component settable from one place, followed by the section "Example code", which prints the JSX those settings produce.

A prop is answered by setting it and watching what changes, and its wording stays in the one place it is declared. Generating the tables was rejected for its price: a generator reading TypeScript JSDoc at build time, for an output the reader already has in the types file.

Scope: `proj/contents/components/**`. The example contents under `proj/contents/examples` demonstrate an application, not a component, and are not covered.

## Consequences

- Good: a prop's description exists once, beside the prop. A renamed prop or a changed type cannot leave a stale copy behind in a content.
- Good: the reader sets a prop and sees the result, which a table cannot show.
- Bad: the demo application is no longer a complete API reference. A reader who wants every prop at a glance opens `<name>.types.ts` instead, and what the `TryOut` cannot demonstrate has to be said in the `Description`.
- Every further port out of `proj/OLDconts/components` leaves its `props/` and `methods/` folders behind, and the report of that port says so.
- `.claude/commands/port-component-content.md` prescribes the three sections and points here for the why.
