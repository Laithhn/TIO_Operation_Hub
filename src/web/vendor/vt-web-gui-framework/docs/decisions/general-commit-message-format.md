---
decided: 2026-08-05
jira: PDWG-46
---

# Ticket prefix in the subject instead of a `Refs:` footer, body only when needed

## Context and Problem Statement

The `git` rule (`vi-base`) mandates Conventional Commits with the ticket as a `Refs:` footer and a `**Why**`/`**Changes**` body in **every** commit. The 115 existing commits on `4.0.0` look different: the ticket as a `[PDWG-xx]` prefix in the subject, a single line, no body. The two conventions cannot both hold.

## Considered Options

- Adopt the kit format unchanged
- Codify the existing single-liner with its Jira prefix unchanged
- Keep the Jira prefix, add the Conventional type, body only when needed

## Decision Outcome

Chosen: **Jira prefix plus Conventional type, conditional body** — `[<JiraID>] <type>(<scope>)[!]: <summary>`. English and the terse imperative subject stay as in the kit; the rule says length scales with complexity anyway.

Three considerations behind it:

- **Ticket in the subject, not the footer** — the existing history already reads that way, and the prefix is visible in `git log --oneline` where the footer is not.
- **Type added** — this is a framework other projects consume. The `!` in the subject is the only place a break shows up in a one-line log; without a type there is no such place.
- **Body only when needed** — the Jira issue carries the unit of work's description. A body is added when the diff does not show its own reasoning: splitting the webpack cache, for instance, looks like one line of configuration, and the reason is a serialization bug in a third-party plugin.

## Consequences

- Good: continuous with the existing history, scannable log, breaking changes visible. The deviation stays confined to the subject's grammar — the rest of the `git` rule (type set, body sections and their order, `BREAKING CHANGE:` footer) applies unchanged.
- Bad: the prefix duplicates what a `Refs:` footer would deliver machine-readably; tools expecting pure Conventional Commits (changelog generators, `commitlint`) need the prefix configured or stripped first. And "body only when needed" is a judgment call — get it wrong and the reasoning is lost, which nobody misses precisely when it is missing.

Codified in `.claude/rules/_local/git.md`, section `Committing` › `Format`.