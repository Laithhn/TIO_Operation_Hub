---
decided: 2026-08-07
jira: PDWG-46
---

# One repo-own `git.md` carries all git deviations

## Context and Problem Statement

This repo deviates from the company-wide `git` rule out of ViAiDevKit in several places: `4.0.0` stands for `develop`, the commit format carries the ticket ID in the subject, the release flow runs through git-flow with a version-named `release/` branch the rule does not know at all, and — until it was lifted later the same day (`general-assistant-may-commit.md`) — staging and committing were barred for the assistant. The deviations were scattered — partly in ADRs, partly in the repo-own `committing.md`, partly nowhere. Anyone reading the synced `vi-base/git.md` sees none of them.

## Considered Options

- Leave everything with the ADRs and keep `committing.md` as the only rule-level deviation
- A second repo-own file next to `committing.md` for branches, tags, and release
- A repo-own `.claude/rules/git.md` that absorbs `committing.md`

## Decision Outcome

Chosen: **a repo-own `.claude/rules/git.md`** that overrides and extends the kit rule, with a relative link to `vi-base/git.md`; `committing.md` is absorbed into it and removed. Recommended by Kevin Michalski (owner of ViAiDevKit) on 2026-08-07, with visibility as the argument: a same-named counterpart right next to the kit rule cannot be missed while reading, an ADR in the `docs` tree can. Two repo-own files overriding the same kit rule would only have repeated the same scattering one level down.

The why stays in the ADRs; the rule carries only the outcome plus a pointer (`decisions` rule). `/sync` does not touch the file — it manages only the `<plugin>/` subfolders under `.claude/rules/`.

Since 2026-08-18 the file sits at `.claude/rules/_local/git.md`, one folder below its former place: the kit's `claude-structure` rule gives a repo's own rules that home, and `/sync` leaves `_local/` untouched too. The same move applies to `jira.md` (`general-jira-subject-component-path.md`).

## Consequences

- Good: deviations sit in one place and right next to the rule they override; a new reader needs no ADR search to know the flow as lived.
- Good: a need to change the kit surfaces while writing and can be fed back as a proposal — Kevin explicitly offered this.
- Bad: the file mirrors the kit rule's structure and has to be carried along when that changes. A `/sync` updates only the kit side and can let the repo-own file go stale unnoticed.