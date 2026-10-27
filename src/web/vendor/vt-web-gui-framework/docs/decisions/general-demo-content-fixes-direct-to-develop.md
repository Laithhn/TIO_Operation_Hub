---
decided: 2026-09-04
jira: PDWG-91
---

# Small fixes to the demo contents commit directly to `develop`

## Context and Problem Statement

The demo project under `proj/contents` gathers small layout corrections — a gap, a button type, a wording — that turn up while working on something else, and `PDWG-91` is the running ticket that collects them. The `git` rule sends every unit of work through a `feature/` or `bugfix/` branch merged with `--no-ff`, which for a one-line correction costs a branch, a merge commit and a cleanup each: more history than the change itself.

## Considered Options

- A branch per fix, as the rule stands
- One long-lived `feature/PDWG-91-…` branch, merged into the integration line every few fixes
- Direct commits to the integration line, the way the kit rule already lets a concept commit land on `develop`

## Decision Outcome

Chosen: **direct commits to the integration line** for a commit that touches nothing but `proj/contents/**` under the running demo-polish ticket. Decided on 2026-09-04 for `4.0.0`, the v4 integration line of that time, the carve-out applies to `develop` since v4 took it over (`general-branching-v4-takes-over-develop-and-master.md`). The kit's `Direct to develop` carve-out sets the precedent: a change that carries no framework code, no build and no test earns no branch. A long-lived branch would have kept the fixes off the integration line for as long as it stayed open, the opposite of what a running ticket wants; a branch per fix would have doubled every fix's history.

The carve-out ends where the framework begins: a fix that reaches into `src/` or the build, a new content, or a port from v3 takes a branch and a ticket of its own. At the 4.0.0 release the ticket closes and a successor takes its place in the rule.

## Consequences

- Good: a fix is one commit, visible on the integration line at once, and the ticket ID in the subject is what groups the fixes.
- Bad: no merge commit marks where a unit of work ends; the ticket's closing has to be read from Jira.
- Bad: `_local/git.md` now carries two carve-outs beside the kit's model, and a reader has to hold both.
