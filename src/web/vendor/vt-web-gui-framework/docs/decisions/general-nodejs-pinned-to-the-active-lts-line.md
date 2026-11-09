---
decided: 2026-09-28
jira: PDWG-82
---

# Node.js is pinned to the Active LTS line

## Context and Problem Statement

`settings.js` fixes one Node.js version for the framework and every consumer project (`settings.packages.nodeJs`). `applySettings.js` refuses an installed version with a lower minor, and the build machine and Jenkins receive exactly that version as the package `ExtToolsNode_<version>`. v4 has to build on both servers for the first time in the week of 2026-09-28 (`4.0.0-rc.0`), and the pinned 24.15.0 was six releases behind.

## Considered Options

- Node 24.21.0 — Active LTS "Krypton" until 2026-10-20, maintenance from then on, end of life 2028-04-30
- Node 26.10.0 — "Current" until its LTS start on 2026-10-28, end of life 2029-04-30
- Stay on 24.15.0

## Decision Outcome

Chosen: **the Active LTS line, today Node 24.21.0**, its newest release (published 2026-09-07). A framework release builds on an LTS line, and Node 26 is none before 2026-10-28 — too late for the build of this week. The same rule picks Node 26 once it has entered LTS; 26 then wins by one more year of support. *Source: `nodejs/Release` `schedule.json` and `nodejs.org/dist/index.json`, checked 2026-09-28.*

## Consequences

- Good: the build runs on a supported line with support until April 2028.
- Bad: the move to Node 26 follows within weeks, and every change of the pinned version costs a new build machine package and a local Node install on every developer and consumer machine.
