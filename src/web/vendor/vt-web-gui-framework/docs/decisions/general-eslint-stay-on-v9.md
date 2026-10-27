---
decided: 2026-07-01
---

# ESLint stays on v9

## Context and Problem Statement

ESLint 10 is available (10.6.0), the project is on 9.39.4. Two plugins in the lint stack have no release with ESLint 10 support yet, one of them with a hard runtime error rather than a mere peer warning.

## Considered Options

- Move to ESLint 10 and repair `eslint-plugin-react` via `patch-package`
- Move to ESLint 10 and replace both plugins with forks (`@eslint-react`, `eslint-plugin-jsx-a11y-x`)
- Stay on ESLint 9 until both plugins list v10 as a peer

## Decision Outcome

Chosen: **stay on ESLint 9**. `eslint-plugin-react@7.37.5` calls `contextOrFilename.getFilename()` in `version.js` — removed in ESLint 10, so React version detection crashes (issue jsx-eslint/eslint-plugin-react#3977, fix PR #3979 open). `eslint-plugin-jsx-a11y@6.10.2` hangs on issue #1075.

The patch route was rejected because the fix PR primarily addresses type checking and its runtime effect stays uncertain. The forks were rejected because `@eslint-react` is a complete rule overhaul and `eslint-plugin-jsx-a11y-x` is only at v0.2.0 — unlike `eslint-plugin-import-x` at the time of that migration, which was already at 4.x.

## Consequences

- Good: no crash risk in the lint run and no rule overhaul for a pure version bump. The rest of the stack is already v10-capable (`typescript-eslint`, `eslint-plugin-import-x`, `@stylistic/eslint-plugin`, `eslint-plugin-react-hooks`, `eslint-plugin-simple-import-sort`, `@eslint/js`), so the switch is a plain version bump later.
- Bad: the project trails by a major and needs a reminder — check `npm view eslint-plugin-react peerDependencies` before every new attempt.

Independent of [general-typescript-stay-on-6.md](general-typescript-stay-on-6.md): the two jumps share no blocker, so each follows as soon as its own blockers are gone. Every attempt checks the other jump as well; where both are possible, they go in one step and the lint stack is tested once.