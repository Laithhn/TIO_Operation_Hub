# React

## State that follows a prop or another state is derived in the render, not corrected in an effect

A state that has to change because a prop or another state changed is set **in the render body**, behind a comparison, never in a `useEffect` that runs one render later: the effect costs a second render and shows the old value for the length of a frame — an open menu on a control that has just locked, a stale date on a picker whose value prop changed. React asks for the render-body form here: a state set during render discards the pass and renders again before anything reaches the screen.

```ts
if (menuRequest && !enableSelection) {
  setMenuRequest(null);
}
```

Two rules go with it:

- **Derive where nothing has to survive.** Whether a menu shows is the user's request under the control's status — `showMenu = enableSelection ? menuRequest : null` — and needs no state of its own. Only what has to outlive the condition is state: the request is cleared, or a control would reopen its menu by itself the moment it unlocks.
- **The `setState` stands behind a comparison, never behind a condition that stays true.** A state set during render re-renders the component whatever the value — React grants the bail-out for an identical value everywhere else, not there — so `if (format === 'h23') setValue(null)` loops until React gives up after 25 passes, while `if (value !== null) setValue(null)` runs once. The comparison is the guard. Where a prop is to be taken over, keep the previous prop in a state and compare against it, as `useDateTime` and `DateSection` do.

An effect remains the place for what is not derivation: a subscription to the DOM's `domChange` event, a measurement that only the committed DOM can give (`useDimensions`), a callback into the parent.

## A previous value that starts an animation is taken over in the next frame

The rule above has one exception, and both markers of the framework are it. A component that animates a change compares the new value against the previous one and animates while the two differ — the primary header's marker does it with `menuNodeId`, the first sidebar's with `centerPosY`:

```ts
const enableAnimation = showMarker && !!prevCenterPosY && (centerPosY !== prevCenterPosY);
```

**Neither place for the takeover works here.** In the render body it destroys what it is for: a `setState` during render discards that pass, so the one render carrying `enableAnimation` never commits, and the transition it was to start never begins. In an effect it is a cascading render, which is what the React Compiler's rule `set-state-in-effect` reports. The takeover goes into the next frame instead, which is after the commit that starts the animation and long before the next change:

```ts
if (centerPosY !== prevCenterPosY) {
  requestAnimationFrame(() => {
    setPrevCenterPosY(centerPosY);
  });
}
```

What separates this case from the rule above is **what the comparison is for**. Ordinarily it corrects a state that would otherwise be wrong on screen, and the sooner it happens the better. Here it arms a one-render flag, and correcting it early is exactly the failure.

## What makes the React Compiler skip a function

The build runs `babel-plugin-react-compiler` through `reactCompilerLoader` (`webpack.config.js`), so a component or hook it compiles gets its memoization automatically. It compiles per function, and a single construct it cannot handle drops the **entire** function — every `useMemo` and `useCallback` in it then stands alone, and nothing else in it is memoized at all. None of these constructs showed up in a lint run here; only a check with the compiler reveals them. They have cost this repo a compiled function:

- **A logical assignment** — `??=`, `&&=`, `||=`. The lint rules close the obvious rewrites: `logical-assignment-operators` rejects `x = x ?? y`, and `@typescript-eslint/prefer-nullish-coalescing` rejects `if (x === null) { x = y; }`. What is left is computing the value right away instead of correcting it afterwards — a `const` with `??` (`Time.tsx`), or a new object where an entry was patched (`DeepMenu.tsx`, `LongMenu.tsx`). A flag that only ever turns one way is an `if` setting it to that value (`ColumnsSelectionCard.tsx`, `Card.tsx`), a form no rule minds.
- **A computed key that is no identifier** — `{ [cond ? 'left' : 'right']: v }`. The key goes into a variable first (`DataTable.tsx`).
- **A conditional, a logical expression or an optional chain inside `try`.** The `try` moves into a function at module level, which the compiler leaves alone (`useDateTime.ts`).
- **A `for … of` that assigns to the variable it iterates** — the `for (of of of)` `Card.tsx` carried as a joke.
- **A dynamic `import()`.**
- **A disabled React lint rule.** An `eslint-disable` of a `react-hooks` rule anywhere in the function makes the compiler skip it (`useStylingProps.ts`, which caches by a comparison of its own).
- **A manual memoization the compiler would not produce.** Where the compiler's own analysis gives a `useCallback` different dependencies than the written ones, it cannot prove the two equivalent, reports `PreserveManualMemo` and skips the function. Mostly the cure is dropping the memoization (`useVtWebSocketDatabase`, the `subAnchorRef` of `DeepMenu.tsx`). Where it has to stay, list what the compiler infers: in `TabBar.tsx` that is two state setters, which never change and still decide whether the whole component compiles.

**Checking one file** is a Babel run with the plugin and its `logger.logEvent`, which reports `CompileSuccess` or the `CompileError` with its reason. **It has to be the Babel the loader resolves.** `react-compiler-webpack` carries its own `@babel/core` 7 under its `node_modules`, while the repo's own is 8, and the compiler misreads the syntax tree Babel 8 produces: a destructured parameter with a default value then fails with `(BuildHIR::lowerAssignment) Expected object property value to be an LVal, got: AssignmentPattern`, although the build compiles it without complaint. `react-compiler-webpack` 1.1.0 drops its own Babel 7 and runs into exactly this, which is why the repo stays on 1.0.1 (ADR `general-react-compiler-webpack-stays-on-1-0-1.md`). In the built bundle a compiled function reads its cache as `$[<n>]`. *Source: react-compiler-webpack 1.0.1 with its @babel/core 7.29.7, babel-plugin-react-compiler 1.0.0 — checked 2026-09-25.*

## Manual memoization stays where an identity is needed

The compiler memoizes what it compiles, so `useCallback` and `useMemo` are written only where an identity has to hold that the compiler cannot vouch for, and a comment at that place says what needs it:

- **An effect lists the value in its dependencies**, directly or through a function that depends on it. `react-hooks/exhaustive-deps` does not know the compiler and asks for a stable identity there.
- **A context value.** `react/jsx-no-constructed-context-values` asks for a memoized one. It catches `<Context.Provider value>` and not the `<Context value>` of React 19; `DataTable.tsx` memoizes its value all the same, the case being the same.
- **An identity that carries a meaning** — an effect that compares it to notice a change (`modEntries` of `DeepMenu.tsx`, `date` of `useDateTime.ts`), or a layout effect that derives anew on a new one (`deriveParamsForTable` of the `TablePreparer`, and with it the functions of `useTableLayout`, `useDimensions` and `useCache` it depends on). That includes the values a component hands to such an effect: the columns, the dataset layout and the dataset IDs a caller of the data table passes (`LongMenu.tsx`, the dataTable example content).
- **A function a public hook returns.** A project may list it in the dependencies of its own effects, which the framework does not see (`useVtWebSocketDatabaseFilters`, `useVtWebSocketDatabaseSort`, `useThrottledCallback`).

**The prop docs follow the same line.** A plain "should be memoized to avoid unnecessary rendering" went with the compiler. A prop's JSDoc names its identity only where a new one does something, and says what: the date time picker's `onChange` reports the current value once more, the `onScroll` of `Scrolling` the scroll position, and a new `columns`, `datasetLayout` or dataset ID list of the `TablePreparer` derives the whole table anew.

A value that a `useMemo` computed in a block becomes a named `derive…` function in "Helper Functions", with its call right below. Where a later local variable needs the value, function and call stay where the `useMemo` stood. Rationale: ADR [PDWG-110-manual-memoization-only-where-identity-is-needed.md](../../decisions/PDWG-110-manual-memoization-only-where-identity-is-needed.md).

## A component is rendered as JSX, never called as a function

`<Icon type={type} />` builds an element React reconciles. `Icon({ type })` runs the function then and there, and React never sees the component — only what it returned. The call saves one element object and one fiber node per instance, and it costs the bailout: React skips a subtree whose props did not change, and that comparison happens at the component's fiber. Without the fiber there is no place for it, so the call gives up the very memoization the compiler builds. Three further things follow from the missing fiber:

- **No `key` can be attached.** A component called inside a `map` carries none, and React loses the row identity across renders — which is how the pattern was found, on the column groups of `ColumnsSelectionCard`.
- **The component may hold no hook.** Its hooks would join the caller's hook list and crash as soon as that list changes length. Neither ESLint nor TypeScript reports it, so the restriction binds silently.
- **DevTools and the Profiler do not show it**, so its renders cannot be measured.

`Breadcrumbs` is the one place left that still calls `Entry` and `Divider`, each inside a `<Fragment key={…}>`; it goes when that component is next taken up. Rationale: ADR [general-render-components-as-jsx.md](../../decisions/general-render-components-as-jsx.md).

## An imperative handle's values are snapshots, its functions are live

`useImperativeHandle` builds its object when its dependencies change — once, with an empty array. A field copied into it, `clientWidth: ref.current?.clientWidth`, is the value at that moment and never updates; a function in it, `getBoundingClientRect: () => ref.current?.getBoundingClientRect()`, reads the element when called. The framework's handles carry both, and the snapshots stay for the consumer projects that read them. **Inside the repo, measure through the functions only**: the columns selection card sizes itself from three `getBoundingClientRect()` calls on the handles of its card and its sections, and a `useDimensions` on a handle would read stale numbers.

## Every listener on `domChange` reckons with a detached ref

`App.tsx` dispatches `domChange` from a `MutationObserver`, which fires as a microtask after the DOM changed. React detaches a ref in the commit that removes the element, and removes a listener with the effect's cleanup after it — so a `domChange` observed in between, a content switching while a menu is open, reaches the listener with `ref.current === null`. A listener that measures a ref returns without a result in that case; the unmount is under way.
