---
decided: 2026-07-31
---

# Remove the webpack resolver from ESLint's import resolution

## Context and Problem Statement

`eslint.config.js` resolved imports through three resolvers: `typescript`, `node`, and `webpack`. The webpack resolver received its config via `config: webpackConfig`, i.e. a real `import webpackConfig from './webpack.config.js'` — so **every lint run evaluated the entire webpack config**, including two unconditional `execSync` calls (`node -v`, `npm -v`) and the framework and icons version checks, which call `exit(1)` on failure.

## Considered Options

- Keep all three resolvers
- Remove the webpack resolver and add `TestUtils/*` to the tsconfig `paths`
- Remove the webpack resolver with no replacement

## Decision Outcome

Chosen: **remove it with no replacement** — `eslint-import-resolver-webpack` uninstalled (22 packages fewer), resolver block and the `webpack.config.js` import deleted from `eslint.config.js`.

Measured, the resolver did exactly one thing: it resolved `TestUtils/helpers` (webpack alias `TestUtils` → `dev/test/utils`). The TypeScript resolver does not know that alias, because it only sees the tsconfig `paths` (`VtWebGuiIcons/*`, `Proj/*`, `*` → `src/*`). Exactly three files are affected, all under `tests/` — unported v3 code that is ignored anyway (see [general-legacy-v3-code-untouched.md](general-legacy-v3-code-untouched.md)). A wrong path in `localSettings.cjs`, by contrast, would have aborted the ESLint process outright.

The tsconfig `paths` variant was rejected: touching two generated or CI configs (`applySettings.js`, `tsconfig.buildmachine.json`) for a counter that rests on ignored code.

The reason noted earlier — "the webpack resolver keeps `eslint-plugin-import@2.x` as a peer in the tree" — was already obsolete by then: the plugin was replaced by `eslint-plugin-import-x` on 2026-06-30.

## Consequences

- Good: lint runs no longer spawn subprocesses and can no longer be aborted by a faulty local configuration; 22 packages fewer in the tree.
- Bad: three additional `import-x/no-unresolved` errors in `tests/` (`tests/contentTests/examples/login.test.js`, `tests/storeTests/menus/primaryMenu/index.test.js`, `tests/storeTests/menus/secondaryMenu/index.test.js`). The baseline for regression checks has been **243** at `npx eslint .` since (240 before) — if the number rises after a change, the change caused it, not the legacy code.