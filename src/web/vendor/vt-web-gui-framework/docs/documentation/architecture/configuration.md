# Configuration

`static/config/config.xml` describes an application's **initial** settings. The Redux store owns the live state from then on, and most settings can be changed at runtime through their slice's action creators — so the configuration file states what the app *started* with, never what is currently in effect.

## The two files

| File | Role |
|---|---|
| `static/config/config.xml` | the project's configuration; the file shipped here doubles as the framework demo's own |
| `templates/config.xsd` | its schema, bound from the XML itself — `xsi:noNamespaceSchemaLocation="../../templates/config.xsd"` |

The XSD is **authoring-time only**: nothing in the code reads it, so it validates in an editor — and in the JSDoc contract of the parsers, which all state "conforming to schema file config.xsd" — but never at runtime. Skipping the runtime validation is a deliberate choice, to keep it off the startup path: ADR `general-no-runtime-config-validation.md`.

## What a faulty configuration does

Nearly every node and attribute is optional, and the parsers are written to tolerate absence: an unreadable setting keeps the slice's `initialState` default. Failures fall into three tiers:

| Tier | Cause | Effect |
|---|---|---|
| **silent default** | a node or attribute is absent — or its name is misspelled, which is indistinguishable from absent | the slice keeps its default, nothing is reported |
| **logged, entry dropped** | a `<Language>` with an empty or syntactically invalid code | an `error`-level entry in the i18n slice's `logs`; that one language is skipped, the app starts |
| **throw, the app does not start** | `<I18n>` is missing entirely, or it yields no valid `<Language>` at all | `src/store/i18n/utils/createInitialState.ts` throws — "There must be at least one valid language defined" |

**At least one valid language under `<I18n>` is therefore the only hard requirement the configuration has.** Everything else degrades quietly, which makes a misspelled node or attribute the case to watch: it cannot be told apart from a setting nobody configured. That is what the schema in an editor is for.

## How the configuration enters the store

1. **`src/index.tsx`** fetches `config.xml` and parses it into an `Element`.
2. **`configureReduxStore(config)`** (`src/store/store.ts`) wraps the root reducer so that **every** action carries that element:

   ```ts
   reducer: (state, action) => rootReducer(state, { ...action, config }),
   ```

   The store can be configured only once; a second call throws.

3. **`enhancedReducerCreator`** (`src/store/enhancedReducerCreator.ts`) picks the element off the action, but **only while the slice's state is still `undefined`** — on that first pass it runs the slice's `createInitialState(draftState, config)` over `slice.getInitialState()` and hands the result to the slice reducer. Once state exists, `config` is ignored for good.
4. **Each participating slice supplies `utils/createInitialState.ts`**, which reads its own nodes out of the XML and mutates its draft state. Eleven exist today: the `app` slice and its modules `firstSidebar`, `footer`, `header` and `secondSidebar`, plus the store slices `i18n`, `menus/primaryMenu`, `menus/secondaryMenu`, `navigation`, `storage` and `webSockets`.

A slice therefore opts into the configuration with a `createInitialState`, whether it is an entry in `rootReducer` or injected into it — no central parser knows the whole file.

**An injected slice reads its nodes only once it is loaded.** `firstSidebar`, `footer`, `secondSidebar` and `webSockets` hang themselves into the store through `rootReducer.inject` when their module is first imported, and the next action initializes them from the configuration. Until then their nodes have no effect. `App` loads the footer and the sidebars when they are enabled, and the WebSocket connections open once a module that uses them is imported ([vt-web-socket.md](vt-web-socket.md)).

## Configuration is an initial value, not the live state

Because the XML only seeds slice state, whatever the slice exposes afterwards can move it. The footer and the two sidebars are the clearest example: `isEnabled` on `<Footer>`, `<FirstSidebar>` and `<SecondSidebar>` initializes `isFooterEnabled`, `isFirstSidebarEnabled` and `isSecondSidebarEnabled` in `src/app/app.slice.ts`, which also exposes `enableFooter` / `disableFooter` and the two sidebar equivalents — so a section configured as enabled can be switched off while the app runs, and the other way round.

**To learn what is currently in effect, read the slice, not `config.xml`.** The file answers a different question.

Contents are configured the same way, and their mount points are described separately: [contents.md](contents.md).
