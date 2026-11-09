---
decided: 2026-10-02
jira: PDWG-122
---

# Probe-build a release only when the build has changed

## Context and Problem Statement

The release checklist built the release branch on the CibsJenkins with `doNotPublish` before the git-flow finish, and `master` after it. After the finish, `master` carries the same tree as the release branch, so both runs build the same code, which step 9 has already built locally.

## Considered Options

- Probe-build every release
- Probe-build only when the build itself has changed since the previous release
- Never probe-build

## Decision Outcome

Chosen: **only when the build has changed**. The probe build reveals nothing the `master` build would not; its one value is timing. A failure before the finish costs a fix on the release branch. A failure after it leaves the release tag on a commit that does not build, and only a hotfix with a new version number repairs that.

A build on the CibsJenkins can fail where step 9 succeeded only through what differs from a developer machine: the Node.js and VtWebGuiIcons retrieved by Ivy, the install by `npm ci --omit=optional --ignore-scripts` (ADR `general-build-server-installs-with-npm-ci-without-scripts.md`), the generated batch file. The repo sets all of these in `applySettings.js`, its generated files, `build/`, `settings.js`, `package.json`, `package-lock.json` and `.npmrc`. A release that changes none of them beyond its own version number repeats a build the previous release's `master` build already ran green. Never probe-building would give up the timing for the very releases that change the build.

## Consequences

- Good: a release that changes only code saves one CibsJenkins run and its wait.
- Bad: a change outside the repo reaches the release unprobed — the CibsJenkins job, the CIBS build script, the agent's Windows. A probe build on every release would hit it before the finish; now only the `master` build does.
