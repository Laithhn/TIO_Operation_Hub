---
decided: 2026-09-29
jira: CI-1141
concept_commit: a81f8427
---

# Direct npm dependencies carry exact versions

## Context and Problem Statement

Jira `CI-1141` asks whether the direct dependencies can do without floating versions, and at what cost. `package.json` named 53 of its 56 direct dependencies with a `^` range. The committed lockfile pins them while it matches `package.json`, but an install that meets a mismatch resolves the direct level anew.

## Considered Options

- Exact versions for every direct dependency, plus `save-exact=true` in `.npmrc`
- Keep the ranges and rely on the lockfile

## Decision Outcome

Chosen: **exact versions plus `save-exact=true`**. The intent stands in `package.json` itself, and `npm install <package>` writes the next dependency the same way. A range bought nothing, because an update already names each version by hand (`documentation/toolchain/npm-packages.md`). The transitive tree stays with the lockfile, which the build server installs exactly (ADR [general-build-server-installs-with-npm-ci-without-scripts.md](general-build-server-installs-with-npm-ci-without-scripts.md)).

## Consequences

- Good: a fresh resolution cannot move a direct dependency.
- Bad: none worth noting.
