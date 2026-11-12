---
decided: 2026-09-29
jira: CI-1141
concept_commit: a81f8427
---

# The build server installs with `npm ci --omit=optional --ignore-scripts`

## Context and Problem Statement

The build server runs each project's `npmCommandsForMakefile.cmd`, which the project's own copy of `applySettings.js` rewrites on every run. The batch file called `npm install --omit=optional`, which resolves anew, unseen, wherever the lockfile no longer matches `package.json`. It would also have run three install scripts of v4's tree unreviewed, and the build needs none of them.

## Considered Options

- `npm ci --omit=optional --ignore-scripts`
- `npm ci --omit=optional`
- Keep `npm install --omit=optional`

## Decision Outcome

Chosen: **`npm ci --omit=optional --ignore-scripts`**. `npm ci` installs the lockfile exactly and fails on a mismatch, so a stale lockfile surfaces as a failed build. `--ignore-scripts` runs none of the three scripts:

- `core-js` prints a donation banner.
- `electron` exits at once, because the batch file sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1`.
- `unrs-resolver` serves only ESLint, which the build does not load. Its script looks for the native binding, which `--omit=optional` leaves out, and fetches it past the lockfile with a nested `npm install`. `npm ci` alone would keep that path open.

The first build on a build server confirmed it on 2026-09-30: the CibsJenkins installed 1273 packages this way, and the production build passed.

*Sources: npm 11.19.0, `docs/content/commands/npm-ci.md`; napi-postinstall 0.3.4, `lib/index.js`.*

## Consequences

- Good: the build server installs exactly the committed tree and runs no install script.
- Bad: every project needs a lockfile that matches its own `package.json`. A consumer with `localDeps` writes and commits its own, because the framework's lacks the local tarballs.
- **Open:** a consumer's own lockfile with `localDeps` passes `npm ci` on the build server — settled by the first build of such a consumer.
