---
decided: 2026-10-02
jira: PDWG-142
---

# `id` is the HTML ID, closures tell callers apart

## Context and Problem Statement

The prop `id` of a component did two jobs: it identified the component in the DOM, which automated tests need, and it told the callers of a shared callback handler apart. Only the first needs an ID unique in the whole document; the framework itself tagged its own controls with values like `toTop` or `0`, which repeat on a page. PDWG-140 split the two jobs and gave the second to `data-*` props, reported to the callbacks as `dataset`. PDWG-142 took that half back.

## Considered Options

- `id` for the callers, a separate `htmlId` for the DOM in development builds only
- `id` as the HTML ID and the callers' tag at once
- `id` as the HTML ID, `data-*` props reported to the callbacks as `dataset`
- `id` as the HTML ID, closures at the call site to tell callers apart

## Decision Outcome

Chosen: **`id` as the HTML ID, closures for the callers.** A call site that shares a handler passes what tells its callers apart through an arrow function of its own, which calls the shared logic with that value.

- `htmlId` reached no production build, so a test against one found nothing. It also split one component tree into two conventions: a `Card` handed its `htmlId` to a `Scrolling` that knew only `id`, so a card with scroll bars rendered no ID at all.
- `id` for both makes every tag an HTML ID, unique in the whole document, although a tag only has to differ among the components sharing one handler. Tags like `toTop` or the column indices `0`, `1`, … would repeat on any page that shows a component twice.
- `data-*` cost more than it brought. Twenty components carried the props, ran a hook that filtered them and built a JSON key on every render, and spread them onto their element; `Dialog` and `Scrolling` took them only to pass them on. A tag came back as a string, so a number needed `Number()`, and a misspelt attribute name went unnoticed. Its one advantage was the port of a v3 call site, where `id="x"` became `data-id="x"` mechanically: a one-time saving against a cost in every component.
- A closure is type-safe and carries any value. The React Compiler compiles a project's contents as well as the framework, and it memoizes the closure by the values it captures. The closure therefore changes its identity only when the shared handler would change its own. No framework component carries `memo()`, so the identity of a callback counts only where an effect lists it, and there the closure behaves as the handler does.

The choice has three limits:

- **A callback that reports an element inside the component keeps that ID** — the tab's `id`, `menuItemId`, the image ID of `ImageViewer`. It is the payload, not a tag: the call site hands the tab's `id` back as the bar's `selectedId` and as a panel's `tabBarItemId`, which writes it to `aria-labelledby`.
- **Where the framework reads an element from the DOM, it reads the `id`.** The keyboard navigation of the `MultiSelectBox` menu and of the calendar recognizes the focused control by the event target, since the handles of the controls expose no element. These controls carry IDs built from `useId()` under the prefix `viwgf_`, unique without a name to coordinate.
- **The prefix `viwgf_` is the framework's**, so that a project's IDs stay clear of the framework's own. Header, menus and language selection carry fixed IDs under it, the area in camelCase like its module and the menu node ID as configured, and so does the scrolling root of a content: `viwgf_mainScope_…` in the main area, `viwgf_modwin_…` in a modal window.

## Consequences

- Good: a test finds every component that takes `id` by the ID its call site gave it, in every build, and the header, menus, language selection and content roots by their fixed IDs.
- Good: a component takes no prop and runs no hook to tell its callers apart. Its callbacks report the event, a value where there is one, and the ID of an element inside it.
- Bad: a contract change for every consumer that read a component's own `id` in a callback, and a second one for those that moved to `dataset` with 4.0.0-rc.2. The call site restructures to a closure, and so does every v3 call site with a shared handler when it is ported.
- Bad: the handlers of the vtWebSocket filter and sort hooks no longer go to a control unwrapped — the shortcut PDWG-102 gave them. The call site adds the filter or sorter ID itself; where an ID comes from is the consumer's business.
- Bad: nothing checks uniqueness. A duplicate ID is the call site's error.
