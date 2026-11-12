---
decided: 2026-08-07
jira: PDWG-46
---

# Branch types and release flow of this repo

## Context and Problem Statement

Writing the repo-own `git.md` (`general-repo-own-git-rule.md`) required pinning down the git flow as it is lived, and the history is ambiguous: 38 `release/`, 32 `bugfix/`, 15 `hotfix/`, and 15 `feature/` merges under three naming schemes running side by side. Above all, `bugfix/` historically means the **opposite** of the kit definition here — all 32 were version-named (`bugfix/2.6.10`, `bugfix/3.3.2`) and went into `master`, so they were patch releases off the released state rather than fixes to the development state. It was also open whether the release checklist (`documentation/operations/release-checklist.md`) still applies to the v4 line, which then grew on its own integration line `4.0.0`.

## Considered Options

- **`bugfix/`** — adopt the kit meaning · block the type in this repo · codify the old, version-named meaning
- **v4 releases** — the checklist with `release/<version>` off `4.0.0` · keep tagging prereleases directly on `4.0.0` · leave it open
- **Tooling** — git-flow throughout · manual merges throughout · mixed
- **Naming** — `<JiraID>-<slug>` for every type · version numbers for both release-producing types (`release/`, `hotfix/`) · version numbers for `release/` alone

## Decision Outcome

- **`bugfix/` carries the kit meaning** — a fix to the development state, from and into the integration line (`develop` since v4 took it over, `general-branching-v4-takes-over-develop-and-master.md`), named `<JiraID>-<slug>`. The old usage has been dead since 2023, `hotfix/` took over that role; it stays in the rule only as a reading aid for the history. Blocking the type would have left a hole in the kit model without removing the risk of confusion in the log.
- **The release checklist applies to v4 as well** — `release/<version>` forks off the integration line, prereleases included.
- **Mixed tooling** — `release/` and `hotfix/` run through the git-flow tool (SourceTree), `feature/` and `bugfix/` are merged by hand with `--no-ff`. That reflects what the history shows: the finish sets merge and tag in one go, while work branches need no tool.
- **`release/` and `hotfix/` carry the version number** instead of `<JiraID>-<slug>`, because a git-flow finish turns the branch name into the pushed tag and step 3 of the checklist prescribes it. The history holds both variants (`hotfix/3.10.7` next to `hotfix/PDWG-37`), and they are not equivalent: `VtWebGuiFramework_3_10_7` does not exist, so `3.10.7` is the sole marker of that release, while `hotfix/PDWG-37` left its release with no version tag at all. The ticket key lives in the commit subjects; the version has only the tag.

## Consequences

- Good: every branch type has exactly one meaning, and the deviation from the kit naming scheme is confined to the two release-producing types, where the tag they leave behind is the reason.
- Bad: `feature/`/`bugfix/` and `release/`/`hotfix/` follow different naming schemes, so the unit-of-work name does not reach every branch — a hotfix carries its ticket in the commit subjects instead.
- Bad: `git log` contradicts the rule for everything before 2023 — anyone seeing `bugfix/2.6.10` has to know that the type changed meaning. The rule warns about it; the history itself cannot be healed.
- Bad: a prerelease now costs a release branch instead of a commit on the integration line, as `4.0.0-beta.3` still had — more ceremony for an interim state.