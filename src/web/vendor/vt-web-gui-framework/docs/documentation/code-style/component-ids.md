# Component IDs

How a component of the framework handles the prop `id`, and why its callbacks report no tag of their caller. What a consuming project does with them is in [using-the-framework.md](../consuming/using-the-framework.md#identifying-a-component). Rationale: ADR [general-id-is-the-html-id-and-closures-tell-callers-apart.md](../../decisions/general-id-is-the-html-id-and-closures-tell-callers-apart.md).

## The prop `id`

- **Optional, without a default value** — `readonly id?: string`. The tab items alone keep it required, because the tab bar knows a tab by it.
- **Rendered in every build, only when set** — `{...(id && { id })}`, directly after `ref`.
- **On the focusable element of a control**, the element carrying the ARIA role (`<input>` for `Input`); on the dialog box of `Dialog`; on the outer element of every other component. A component that renders its outer element through `Scrolling` hands `id` to it.
- **Its JSDoc names the element**, the uniqueness, and the reserved prefix:

  ```ts
  /** Optionally, an ID for the HTML attribute "id" of the button, written in every build - for
   * example to find it in automated tests. It has to be unique in the whole document, and IDs
   * starting with "viwgf_" are reserved for the framework. */
  readonly id?: string;
  ```

## The callbacks

- **A callback reports what happened, never which component reported it** — the event, and a value where there is one: `onClick?.({ event })`, `onChange?.({ value, event })`. A call site that shares one handler tells its callers apart by a closure of its own.
- **A callback that reports an element inside the component keeps that ID** — the `id` of a tab, `menuItemId` of `Menu`. It is the payload, not a tag of the caller.

## The framework's own controls

- **Closures tell them apart** — no internal control gets an `id` for a shared handler: `onClick={handleClickToTop}` rather than `id="toTop"` and a switch on it.
- **An `id` from `useId()` where code reads an element from the DOM** — the focus ring of the `MultiSelectBox` menu and the Tab wrap of the calendar recognize the focused control by `event.target.id`, because the handles of the controls expose no element. The ID is `viwgf_`, the value of `useId()` and the control's name. The component whose key handling reads it builds it and hands it to the child that renders the control, as `DateSection` does for `Controls`.

```tsx
const idPrefix = `viwgf_${useId()}`;
const searchBoxId = `${idPrefix}searchBox`;

// …
const idx = ring.findIndex(({ id }) => (id === (event.target as HTMLElement).id));

// …
<Input
  ref={searchBoxRef}
  id={searchBoxId}
  …
/>
```

## The framework's own IDs

The app modules give their elements fixed IDs under the prefix `viwgf_`: `viwgf_<area>_<name>`, or `viwgf_<name>` for an element of its own like `viwgf_headerLogo` — the area in camelCase as its module is named (`primaryHeader`, `megaMenu`, `firstSidebar`, `secondaryHeader`), a menu node by its ID as configured. A disabled menu node carries the ID on the element that replaces its link.

`Content` and `MainSection` give the `Scrolling` of a content root `viwgf_mainScope_<caller ID>` in the main area and `viwgf_modwin_<caller ID>` in a modal window — the caller ID being the menu node ID or the URL path in the main area, the ID of the modal window in a modal window. The same ID is the key the `Scrolling` stores its scroll position under.

The IDs built from `useId()` are no fixed IDs: they follow the position in the component tree and change with it, so a test does not search by them.

The full list is in [using-the-framework.md](../consuming/using-the-framework.md#identifying-a-component).
