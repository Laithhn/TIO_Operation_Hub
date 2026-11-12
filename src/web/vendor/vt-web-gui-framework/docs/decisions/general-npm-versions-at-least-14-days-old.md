---
decided: 2026-09-28
jira: PDWG-82
---

# npm installs only versions older than 14 days

## Context and Problem Statement

The Shai-Hulud worm spread through freshly published npm versions: a stolen maintainer token published malicious versions, and their install scripts stole the next tokens. Such versions are usually found and pulled within days of their publication. The company-wide update stop of 2026-08-04 has been lifted, so updates need a protection that holds without a stop.

## Considered Options

- Keep the update stop in force
- Check every new version by hand before installing it
- `--before=<date>` on every install call
- `min-release-age = 14` in the repo's `.npmrc`

## Decision Outcome

Chosen: **`min-release-age = 14` in `.npmrc`**. npm then resolves only versions published more than 14 days ago, and fails where a range has none. The setting lives in a file instead of on a command line, so nobody has to remember it: it binds every install in this repo that resolves a version anew. `applySettings.js` copies `.npmrc` into a consumer project that has none, and shows it in the compare tool to one that has. `--before` does the same with a fixed date, which every call would have to compute anew. Artifactory passes the publish dates through (`npm view react time`, checked 2026-09-28).

The setting is one layer of several. An install script runs only once reviewed (ADR [general-npm-install-scripts-by-allow-list.md](general-npm-install-scripts-by-allow-list.md)), and the build server resolves nothing: it installs exactly the committed lockfile (ADR [general-build-server-installs-with-npm-ci-without-scripts.md](general-build-server-installs-with-npm-ci-without-scripts.md)).

## Consequences

- Good: wherever `.npmrc` carries the setting, the protection holds without anyone thinking of it — on every developer machine, in a new consumer from its first run, in an existing one once its developer takes the file over.
- Bad: a fix published less than 14 days ago installs only by overriding the setting for that call (`--min-release-age=0`).
- Bad: only an npm that knows the setting applies it. npm 11.12.1 knows it, npm 10.9.9 does not; the pinned Node.js 24.21.0 brings npm 11.19.0.
