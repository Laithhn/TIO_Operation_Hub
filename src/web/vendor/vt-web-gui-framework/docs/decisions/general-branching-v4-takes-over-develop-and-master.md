---
decided: 2026-09-28
jira: PDWG-82
---

# v4 takes over `develop` and `master`, 3.x moves to `v3.x`

## Context and Problem Statement

v4 grew on an integration line of its own, `4.0.0`, branched off `develop` on 2025-01-10. `develop` carried the 3.x line onward and fed the releases on `master`, up to 3.11.0 on 2026-08-28. By then `develop` held 124 commits that `4.0.0` lacked, and `4.0.0` held 360 that `develop` lacked. The build machine builds `master`, and v4 has to build there as `4.0.0-rc.0`, so v4 needs `develop` and `master`.

## Considered Options

- Merge `4.0.0` into `develop` and resolve the conflicts, which brings 3.x changes into v4
- Reset `develop` and `master` to `4.0.0`, which needs a force push
- A hard cut: merge the 3.x history into `4.0.0` with strategy `ours`, then move `4.0.0` on like any branch
- Keep the two integration lines and release v4 from `4.0.0`

## Decision Outcome

Chosen: **the hard cut**. Nothing of the 3.x line lands in v4: `develop` and `master` carry exactly the tree of `4.0.0`.

- **Before the cut**, `v3.x` is branched off `master` at 3.11.0 (`c99b4951`). It carries the 3.x line from then on, and a 3.x fix is made on `v3.x` only.
- **The cut**: `git merge -s ours origin/master` on `4.0.0` records the whole 3.x history as merged and keeps the v4 tree unchanged. That one merge covers `develop` as well. The one commit `develop` has beyond `master`, the merge `a0dfcba2`, changes no file against their merge base `5ed6013e`. `4.0.0` then merges into `develop` with `--no-ff`, and the git-flow finish of `release/4.0.0-rc.0` merges into `master`, both without a conflict.
- **After the cut**, `4.0.0` is deleted, and the build machine builds `v3.x` instead.

A real merge would have brought 3.x changes into v4, which is not wanted. A reset needs a force push, which the permission layer denies, and it would have rewritten the history every clone and the build machine hold. Two integration lines cannot reach the build machine, which builds `master`.

## Consequences

- Good: one integration line again — the kit's `git` rule applies without reading `4.0.0` for `develop`.
- Good: no history is rewritten, so every clone of `develop` and `master` stays valid.
- Bad: a 3.x fix that v4 needs as well has to be ported by hand, because no merge carries anything from `v3.x` over.
- Bad: an unfiltered `git log` of `develop` and `master` lists the 3.x commits among v4's ancestors, although none of their content is in v4.
