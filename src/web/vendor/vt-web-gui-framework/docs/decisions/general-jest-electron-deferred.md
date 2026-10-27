---
decided: 2026-07-31
---

# Park the Jest and Electron toolchains

## Context and Problem Statement

Neither the Jest tests nor the Electron desktop build are currently in use. Both toolchains have known defects and badly outdated packages that resurface in every package review.

## Considered Options

- Repair them and keep them current
- Remove them from the repository
- Park them: leave them untouched and stop reporting the known defects

## Decision Outcome

Chosen: **park them**. Effort without benefit while none of it runs; removing would be premature, because both are meant to be reactivated. Deferred specifically:

- **`npm run test:jest` is broken** — `jest.config.js` is CommonJS (`require()`), `package.json` has `"type": "module"` → `ReferenceError: require is not defined in ES module scope`. Present since commit `e7a9686b` (webpack's ESM switch), which did not carry the Jest config along. The fix would be a rename to `jest.config.cjs`, plus replacing `__dirname` in `cacheDirectory` for a real ESM conversion.
- **`babel-jest@30.4.1` against `jest@29.7.0`** — installed twice (top-level 30.4.1, nested 29.7.0 under `jest-config`). Only becomes relevant once the config loads again.
- **`electron@13.1.6` / `electron-builder@22.11.7`** — pinned exactly, from 2021 (latest 43 and 26 respectively). No npm script calls them, but `electronMain.js` and `dev/electronBuilderConfig.js` sit in the repo.

## Consequences

- Good: package reviews and conflict reports stay free of noise and focus on what actually runs — these points are no longer reported as open findings.
- Bad: the repo carries dead weight and packages from 2021; whoever reactivates the tests or the desktop build pays the accumulated debt in one go. The first step in each case is the broken Jest config.

Fits [general-legacy-v3-code-untouched.md](general-legacy-v3-code-untouched.md): `tests` and `src/desktopApp` are unported v3 code.