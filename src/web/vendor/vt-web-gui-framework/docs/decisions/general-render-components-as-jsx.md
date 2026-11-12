---
decided: 2026-09-18
jira: PDWG-117
---

# Render a component as JSX instead of calling it as a function

## Context and Problem Statement

Twenty-six call sites in sixteen files invoked a PascalCase component as a plain function — `Icon({ type, large, … })` instead of `<Icon type={type} large={large} … />`. The assumption behind the pattern was that a component holding no state is cheaper called than rendered, and the pattern therefore bound every component it was applied to: calling one that runs a hook enters that hook into the caller's hook list.

The question surfaced when React reported a missing `key` for the column groups of `ColumnsSelectionCard`, which a function call cannot carry.

## Considered Options

- Keep the pattern and wrap each call in a `<Fragment key={…}>` where it sits in a list, the way `Breadcrumbs` already does
- Render every component as JSX

## Decision Outcome

Chosen: **render every component as JSX**. What the call saves is one element object and one fiber node per instance. What it costs is the bailout — React skips a subtree whose props did not change, and that comparison happens at the component's fiber. Without the fiber there is no place where it could happen, so the pattern gives up the optimization it was adopted for. The React Compiler runs over the whole `.ts`/`.tsx` set (`reactCompilerLoader`, target 19) and builds exactly that form of memoization.

The fragment wrapper answers the `key` alone and leaves the rest standing: the hook restriction that nothing enforces, the components missing from DevTools and Profiler, and the caller that re-runs every child on every render.

`Breadcrumbs` keeps its two call sites for now — PDWG-96 reviews that component as a whole.

## Consequences

- Good: three lists were missing a `key`, two of them undetected until now — `Proposal` in `ProposalList` and `Option` in `OptionsList`, beside the reported one in `ColumnsSelectionCard`. React could not keep a row's identity across renders in any of them.
- Good: a component may hold state from now on without its call sites having to change, and a hook added to one no longer breaks its caller.
- Good: the components appear in DevTools and the Profiler, which is what makes a render measurable in the first place.
- Bad: none worth noting. The saved fiber nodes are a fraction of those the controls below them allocate anyway.
