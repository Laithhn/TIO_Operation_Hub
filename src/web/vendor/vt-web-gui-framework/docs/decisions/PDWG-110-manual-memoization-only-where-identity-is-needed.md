---
decided: 2026-09-25
jira: PDWG-110
---

# Manual memoization only where an identity is needed

## Context and Problem Statement

The build sends every source through the React Compiler, which memoizes the components and hooks it compiles. The ported code still memoized by hand as well — 99 `useCallback` in 40 files, 22 `useMemo` in 21, 73 comment lines announcing it — so the same thing was written twice, and the few places where an identity really matters hid among the many where it did not.

## Considered Options

- **Keep the manual memoization everywhere.**
- **Remove all of it** and rely on the compiler alone.
- **Remove it where it only memoizes**, and keep it where an identity has to hold that the compiler cannot vouch for.

## Decision Outcome

Chosen: **remove it where it only memoizes.** It stays in four cases, each with a comment naming what needs it:

- **An effect lists the value in its dependencies**, directly or through a function that depends on it. `react-hooks/exhaustive-deps` knows nothing of the compiler, and without the memoization the lint baseline would grow by a warning at every such place.
- **A context value**, for the same reason: `react/jsx-no-constructed-context-values` asks for it.
- **An identity that carries a meaning.** `DeepMenu` closes an open submenu when the identity of its entries changes, the date time picker reports a change when the identity of its date does, and the `TablePreparer` derives the whole table anew when the identity of `deriveParamsForTable` does — or of the columns, the dataset layout and the dataset IDs a caller of the data table hands it. The compiler would keep all of them stable as well — but only as long as it compiles the file, and a bail-out would turn each into a behavior change nobody notices. The memoization states the intent where the effect relies on it.
- **A function a public hook returns** (`useVtWebSocketDatabaseFilters`, `useThrottledCallback`). A project may list it in the dependencies of its own effects, code the framework does not see, so its stable identity is part of the hook's contract.

Removing everything was rejected for the last two cases: it would make correct behavior depend on the compiler never bailing out. Keeping everything was rejected because it is what the ticket set out to end.

The prop docs follow the same line: the hint "should be memoized to avoid unnecessary rendering" goes, and a prop names its identity only where a new one does something — the picker reports again, the table is derived anew.

Where the compiler skipped a file, the file was made compilable first, so that removing the manual memoization never removes the only one. That is why a check with the compiler precedes every removal, run with the Babel the loader resolves.

## Consequences

- Good: a manual memoization now marks a place where the identity matters, and its comment says why.
- Good: eight files the compiler had skipped now compile, among them `TabBar`, `Card` and `DataTable`.
- Bad: two lint rules that do not know the compiler still decide about memoization — about 40 places keep a `useCallback` or `useMemo` for `exhaustive-deps` alone.
- Bad: the kept memoization of an identity that carries a meaning is a guard, not a guarantee. React may drop a `useMemo` cache as well; the effects themselves would be sturdier watching the inputs instead of an identity, which would take them out of the memoization question altogether.
