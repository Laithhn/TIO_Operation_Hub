---
decided: 2026-08-11
jira: PDWG-45
---

# The Jira subject carries the component path

## Context and Problem Statement

`specs/jira-ticket.md` (`vi-base`) prescribes the subject `<Scope>: <verb-first imperative>`, the scope being the component the ticket lives in — written for a project spanning many repos, where the prefix says which one. This repo is a single component, so every ticket reads `VtWebGuiFramework: …` and the prefix distinguishes nothing in the issue list. The framework, however, is a wide tree of components: the drafted subject for PDWG-51 (`VtWebGuiFramework: widen the card anchor …`) left unsaid that it touched `popups/card`.

## Considered Options

- Keep the kit form and let the description carry the location
- Name the component in the subject, i.e. `VtWebGuiFramework: Popups / Card: <imperative>`
- Use Jira's Component field instead, which the spec already asks to be set where maintained

## Decision Outcome

Chosen: **the component path in the subject**, `VtWebGuiFramework: <Group> / <Component>: <imperative>` — the developer's correction to the PDWG-51 draft on 2026-08-11, explicitly "generell … andere zukünftige Vorgänge entsprechend analog dazu". The issue list is read as a list of subjects; a field the eye has to look up separately does not compete with a prefix that is simply there.

Two boundaries, settled the same day:

- **`src/components` only.** Everywhere else — `src/app`, `src/store`, `proj/contents`, build and tooling — the plain `VtWebGuiFramework: <imperative>` stays. The path pays off where the tree is wide and the names repeat; elsewhere it would be ceremony.
- **Two levels, never more.** `layouts/dataTable/columnsSelectionCard` is `Layouts / DataTable`, not a third segment. A subject is scanned, not parsed; the outer component is what places the change, and the description names the part.

Placement follows `general-repo-own-git-rule.md`: a repo-own `.claude/rules/_local/jira.md` alongside the kit rule it overrides, visible while reading it, with the why here.

## Consequences

- Good: the issue list places every component change at a glance, and the subject mirrors the commit scope (`fix(popups/card): …`) that the same change carries.
- Bad: a second deviation from the kit specs, in a repo that already carries one for `git`. Both have to be carried along when the kit side moves, and `/sync` will not flag it.
- The two-level cap loses precision for deeply nested work — deliberately; the description absorbs it.
