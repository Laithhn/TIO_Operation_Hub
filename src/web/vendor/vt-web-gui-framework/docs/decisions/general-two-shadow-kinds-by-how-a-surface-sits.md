---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# Two kinds of shadow: a placed surface casts the contact shadow, a floating one a floating shadow

## Context and Problem Statement

The three `boxShadow` levels were built from `structureSilver`, which vanishes on a dark ground or lightens it, as under the image in the image viewer. The styling prop `boxShadow` offered these levels to placed components as well. Once a component knows its ground (ADR `general-ground-travels-as-an-inherited-custom-property.md`), a shadow can take a form for it, but only a shadow that falls on the element the component inherits that ground from.

## Considered Options

- One scale of four levels for placed and floating surfaces alike
- Floating shadows that follow the ground, each with a dark twin
- Two kinds: a contact shadow that follows the ground, and floating shadows drawn for a light ground
- For the names: the neutral `contact` · `low` · `mid` · `high`, or names that say where the surface sits

## Decision Outcome

Chosen: **two kinds of shadow.** The **contact shadow** is the minimal shadow of a body lying directly on a surface — a control's pane, a placed component's pane, the image in the image viewer. It depends on the ground and has a light-ground and a dark-ground form. The **floating shadows** describe a surface with air between it and the page. What lies below such a surface can be anything, and its shadow falls on elements it inherits nothing from, so no ground describes it. The floating shadows are therefore drawn for a light ground, the framework's own (ADR `general-framework-is-light-dark-is-an-area.md`).

- **The floating shadows are named after where the surface sits**: `anchored` hangs from its reference (the select-box menus, the mega menu, the anchored card), `floating` stands free (the card, the notification, the minimized modwin), `modal` lies above everything (the modwin, the dialog). `contact` is the name the values already carried in the `controls` map, and the card already had a class `anchored`.
- **A placed component casts only the contact shadow, and only where the content asks for it.** `boxShadow` stays on `Section`, `Tabular`, `DataTable`, `ValueField` and `Image`, with the single value `"contact"`, which draws the tinted pane: edge, contact shadow, rim and glow. `Image` and the image viewer's image take no rim and glow, both being inset shadows that would lie over the picture. A section often serves as an invisible grid container, so the shadow stays optional there; a floating surface always casts its own.
- **The pane is drawn by a class, not inline.** An inline `box-shadow` cannot follow the ground, so the hook writes none, and each placed component includes `contactPane()` in its own CSS module.
- **The overlaid `Button` is the one mixed form.** It floats over content and rests with `anchored`, but unlike every other floating shadow its shadow has a light-ground and a dark-ground form, chosen by the ground. The content below it is often dark, the image in the image viewer above all, and there a shadow drawn for a light ground is invisible. The call site can state that ground through `darkTheme` (ADR `general-ground-travels-as-an-inherited-custom-property.md`). The image viewer's navigation buttons stay overlaid, because the image runs underneath them when it is zoomed or moved; filled ones were rejected.

## Consequences

- Good: no shadow of a placed component sits invisibly on a dark ground or lightens it, the image viewer's image included.
- Good: a name says where a surface sits instead of a number, so a new surface picks its shadow from its position.
- Bad: a floating surface opened over a dark area casts a shadow drawn for a light ground. There `structureSilver`, lighter than `primary` and `primaryMidnight`, lightens the ground at the surface's edge, as under a select-box menu opened in a dark section.
- Bad: the dark-ground form of the contact shadow is a compromise. On `primary`, the darkest ground of the palette, it reads faintly; denser values, tried on 2026-09-24, were too heavy on every other dark ground.
- Bad: a component that lists `boxShadow` draws nothing unless its own CSS module includes `contactPane()` and it sets the class on the element carrying its background, which for a scrolling section or tabular is the `Scrolling` wrapper.
- Bad: the renamed keys and the narrowed `boxShadow` are breaking for a consumer that set a level; the v4 prerelease line takes them without an alias. The legacy stepper still names `level1`, which is harmless only because no bundled module imports its stylesheet.
