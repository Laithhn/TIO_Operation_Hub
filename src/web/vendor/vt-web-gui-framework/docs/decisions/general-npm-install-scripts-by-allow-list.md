---
decided: 2026-09-29
jira: CI-1141
concept_commit: a81f8427
---

# Install scripts run only from a reviewed allow list

## Context and Problem Statement

An install script is how a malicious npm version runs its code (ADR [general-npm-versions-at-least-14-days-old.md](general-npm-versions-at-least-14-days-old.md)). Seven packages of the tree bring one. Developer machines install the optional packages as well, so every one of these scripts can run there; the build server runs none (ADR [general-build-server-installs-with-npm-ci-without-scripts.md](general-build-server-installs-with-npm-ci-without-scripts.md)).

## Considered Options

- `allowScripts` in `package.json`, enforced with `strict-allow-scripts=true`
- `allowScripts` in npm's default, advisory mode
- `ignore-scripts=true` on every machine
- `allowScripts` enforced with `strict-allow-scripts=true`, every current script approved at once (`npm approve-scripts --all`)

## Decision Outcome

Chosen: **`allowScripts`, enforced with `strict-allow-scripts=true`**. An unreviewed script then fails the install instead of running, and the review becomes part of every update. The advisory mode merely lists an unreviewed script and still runs it. `ignore-scripts` everywhere would leave `electron`'s binary and the test drivers to be fetched by hand wherever they are used: in a consumer that enables the desktop target, and in the framework once its parked tests and desktop build return (ADR [general-jest-electron-deferred.md](general-jest-electron-deferred.md)).

The list approves four scripts, each pinned to the reviewed version. Each fetches something once its feature is in use: `electron` the binary of the desktop target, `chromedriver` and `geckodriver` the drivers of the parked tests, `unrs-resolver` the ESLint binding where the optional one is missing. It denies by name the two that fetch nothing: `core-js` prints a banner, `@parcel/watcher` builds only on request. `fsevents`, the seventh, installs only on macOS and has no entry, so a first install there fails and names it. A pin reopens the review at the next version, a deny holds for every version. `--all` would approve the two that fetch nothing as well, and bring each back for review at its next version.

## Consequences

- Good: no install script nobody reviewed runs on a developer machine.
- Bad: every update re-approves each changed package that brings a script.
- Bad: a consumer's own dependency with a script needs an entry in the consumer's `allowScripts`, or the consumer's install fails.
- Bad: only an npm that knows these settings applies them; npm 11.19.0 does, while npm 11.12.1 ignores them and runs every script. The pinned Node.js 24.21.0 brings npm 11.19.0.
