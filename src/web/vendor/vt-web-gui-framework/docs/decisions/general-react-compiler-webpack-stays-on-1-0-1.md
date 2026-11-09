---
decided: 2026-09-28
jira: PDWG-82
---

# react-compiler-webpack stays on 1.0.1

## Context and Problem Statement

`react-compiler-webpack` 1.1.0 no longer brings its own `@babel/core` 7: it runs `babel-plugin-react-compiler` 1.0.0 on the repo's Babel 8. Every module of the build passes through its loader, and since PDWG-110 the React Compiler is the only memoization in most components.

## Considered Options

- Update to 1.1.0
- Stay on 1.0.1

## Decision Outcome

Chosen: **stay on 1.0.1, pinned without a range** — `"1.0.1"`, because `^1.0.1` resolves to 1.1.0. Measured on 2026-09-28 over the 586 `.ts`/`.tsx`/`.jsx` files under `src/` and `proj/` outside the legacy folders, each run through the compiler the way the loader runs it:

| Version | Babel of the compiler | Compiled | Compile errors | Parse errors |
|---|---|---|---|---|
| 1.0.1 | 7.29.7, its own | 168 | 15 | 0 |
| 1.1.0 | 8.0.5, the repo's | 107 | 333 | 5 |

318 of the compile errors under 1.1.0 read `(BuildHIR::lowerAssignment) Expected object property value to be an LVal, got: AssignmentPattern`. The compiler asks `isLVal()` of every destructured default, and Babel 8 no longer counts `AssignmentPattern` as an `LVal` (Babel 7.29.8 does), so it skips the whole function. `babel-plugin-react-compiler` 1.0.0, the newest stable release, depends on `@babel/types` `^7.26.0`: it is written for Babel 7, and 1.1.0 pairs it with Babel 8. The five parse errors are generic arrow functions such as `<E = Element>(` in `useDrag.ts`: with the loader's parser plugins `jsx` and `typescript`, Babel 8 reads them as JSX. The loader hands that error to webpack as a module build error, so the build breaks. The 15 errors under 1.0.1 are the known constructs of `documentation/code-style/react.md`.

## Consequences

- Good: the build compiles what PDWG-110 verified, with the Babel the compiler was checked against.
- Bad: npm offers 1.1.0 as an ordinary minor update, so the pin has to be guarded by hand.

Check before a new attempt: whether a `babel-plugin-react-compiler` release depends on `@babel/types` 8 (`npm view babel-plugin-react-compiler dependencies`). Then rerun the comparison with the new version: it has to parse every file and compile no fewer functions than 1.0.1.
