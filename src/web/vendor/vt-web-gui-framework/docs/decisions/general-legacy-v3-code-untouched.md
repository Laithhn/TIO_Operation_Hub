---
decided: 2026-07-01
---

# Leave unported v3 code untouched

## Context and Problem Statement

Alongside the code ported to v4, the repository still holds sizeable amounts of legacy code from VtWebGuiFramework v3. It is being ported step by step. While that runs, it produces a permanent stream of lint and typecheck findings that are not errors in any current sense.

## Considered Options

- Port everything at once
- Align the legacy code cosmetically (`eslint --fix`) without porting it
- Leave it untouched until the file in question is ported

## Decision Outcome

Chosen: **leave it untouched**. The code is fine as it stands and needs no attention for now (confirmed by the developer on 2026-07-01). No `eslint --fix`: diff noise in legacy code with no benefit while no porting happens (decision of 2026-07-31 on the 105 `simple-import-sort` violations).

Affected directories: `proj/addStore`, `proj/addTestJs`, `proj/OLDconts`, `src/contents`, `src/desktopApp`, `src/oldFrame`, `tests`.

**The directory list alone is not enough** — legacy code also sits in otherwise active directories, e.g. `src/components/controls/*/index.jsx` next to ported `.tsx` in the same tree. The reliable marker is the **file extension**: ported v4 code is `.ts`/`.tsx`, unported v3 code is `.js`/`.jsx`. Established on 2026-07-31 across all 105 `simple-import-sort` violations: 96 in `.jsx`, 9 in `.js`, **none in `.ts`/`.tsx`**. Distribution: `proj/OLDconts` 52, `src/components` 22, `src/contents` 13, `src/oldFrame` 8, `proj/addStore` 4, `dev/test` 2, `tests/storeTests` 2, `static/downloads` 1, `tests/contentTests` 1.

## Consequences

- Good: no diff noise in code that will be replaced anyway; porting stays in the developer's hands and in manageable steps.
- Bad: lint and typecheck carry a permanent floor that can mask real regressions. Fixed baselines therefore apply instead of "zero findings": **243** `import-x/no-unresolved` at `npx eslint .` (see [general-drop-webpack-import-resolver.md](general-drop-webpack-import-resolver.md)) and **105** `simple-import-sort` violations. Always compare with the same command scope — the 238 noted earlier held for `src` and `proj` only.

Findings from these paths are expected legacy behavior, not a regression, and are not reported as urgent. The `no-unresolved` errors concern genuinely missing modules — e.g. `assets/enums`, `VtWebGuiIcons/src/hooks/*`, and `../marker`. Don't clean them up unasked. Related: [general-jest-electron-deferred.md](general-jest-electron-deferred.md) (`tests`, `src/desktopApp`).