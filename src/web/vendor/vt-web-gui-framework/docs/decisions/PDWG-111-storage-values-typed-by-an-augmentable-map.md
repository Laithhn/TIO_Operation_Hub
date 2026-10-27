---
decided: 2026-09-25
jira: PDWG-111
---

# Storage values are typed by a map the consuming project augments

## Context and Problem Statement

`storageSlice.selectValue` returned `unknown`: the storage keys are declared in the consuming project's `config.xml`, so only the project knows the types of their values. Every call site closed the gap with an assertion of its own, and nothing kept the assertions in agreement — in VtWebGuiPsCoLocal one key read at 18 places was asserted as `number` at nine and as `number | undefined` at three.

## Considered Options

- **A type parameter on `selectValue`**, defaulting to `unknown`, which the call site states or the variable it is assigned to infers.
- **An augmentable map `StorageValues`**, one entry per key, from which `selectValue` takes its types — with the type parameter as the fallback for an undeclared key.
- **The same map typing `setValue` as well.**
- **The map made strict**: once it holds entries, `selectValue` and `setValue` accept declared keys only.

## Decision Outcome

Chosen: **the map, typing both `selectValue` and `setValue`, with the type parameter as the fallback.** Only a map states a key's type in one place: a type parameter makes each assertion nicer but leaves one per call site, free to contradict the others. Typing `setValue` from the same map is what makes the map more than an organized assertion — the compiler then checks every write against the reads. The framework already extends its store types this way (`LazyLoadedSlices`).

The strict variant was rejected: a project that starts declaring its keys would have every undeclared one break at once, where the fallback lets it declare key by key.

## Consequences

- Good: a key's type is stated once; call sites carry none, and a write of the wrong type is a compile error.
- Good: the declaration is optional per key, so a project without one compiles as before.
- Bad: the map is a second source beside `config.xml`, and nothing checks that the two agree.
- Bad: a misspelt key falls back like an undeclared one instead of failing — the price of the fallback.
- Bad: a project has to know module augmentation to use it; `consuming/using-the-framework.md` shows the declaration.
