---
decided: 2026-10-21
jira: PDWG-143
---

# Pass ESLint's import resolvers as objects the config imports

## Context and Problem Statement

A project lints with its copy of the framework's `eslint.config.js`, and the rules of `eslint-plugin-import-x` follow its imports into the framework checkout, which may carry a `node_modules` of its own. Under `import-x/resolver` the plugin loads every resolver by name, relative to the file whose import it resolves (`createRequire(sourceFile)` in `lib/utils/legacy-resolver-settings.js`, version 4.17.1). An import followed into a framework file therefore loads `eslint-import-resolver-typescript` from the framework checkout, and the project's lint depends on an install it does not control. A project's `npx eslint proj` aborted that way with "Cannot find native binding": the checkout lacked the native binding of `unrs-resolver`, which the project's own `node_modules` had.

## Considered Options

- `import-x/resolver-next` with resolver objects the config imports
- `import-x/resolver` as an array of `{ name, resolver, options }` entries, which also accepts imported resolvers
- Keep the names and require a complete install in every framework checkout a project points to

## Decision Outcome

Chosen: **`import-x/resolver-next`** with `createTypeScriptImportResolver` from `eslint-import-resolver-typescript` and `createNodeResolver` from `eslint-plugin-import-x`, in the order the names had. Node resolves an import of the config relative to the config itself, which in a project is the project's copy, so both resolvers come from the project's `node_modules` whatever lies in the checkout.

The array form of `import-x/resolver` would load the TypeScript resolver from the project as well, but the plugin's README points to it only for the legacy `.eslintrc` system. For flat config it gives `resolver-next`, with this very pair. A complete install in every checkout was rejected because the project cannot enforce it, and a gap shows only when a lint run aborts.

Reproduced on 2026-10-21 with ESLint 9.39.5: a stub resolver that throws on load, placed in a checkout's `node_modules`, aborts `import-x/namespace` under the name form. Under `resolver-next` the stub stays unloaded, and the rule still follows an `export *` into the checkout and reports a missing export.

## Consequences

- Good: a project's lint loads nothing from the framework checkout, and the checkout needs no install for it.
- Bad: the legacy form retried a package name from the linted file when the followed file could not resolve it; `resolver-next` resolves from the followed file alone. A framework checkout without `node_modules` therefore leaves a package import of a framework file unresolved. No rule result depends on it today, because no framework source re-exports from a package.
