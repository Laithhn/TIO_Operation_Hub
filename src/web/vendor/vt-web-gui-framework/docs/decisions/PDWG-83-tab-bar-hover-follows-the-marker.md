---
decided: 2026-09-08
jira: PDWG-83
---

# The tab bar's interaction appearance follows its marker, and an entry with no face is underlined instead of veiled

## Context and Problem Statement

The two-layer veil of `general-interaction-veil-two-layers-over-the-face.md` was dimensioned for a control with a face: a pane, a check box's box, a calendar day's circle. The ported tab bar took it for its tabs, and at the running control on 2026-09-08 it read as too much on a tab that carries no marker — the veil is an inset shadow spread wide enough to meet itself, so it fills the whole tab and invents a ground the tab never has at rest.

The same question stood open across the framework, unanswered rather than decided: the sidebar's menu, the popup `Menu`, the breadcrumbs and the mega menu's nodes change `opacity` from .8 to 1, the `menuEntry` mixin's form since v3; the primary header's menu nodes show nothing at all; the options of the select boxes' menus and of the input's proposal list show nothing either, though `documentation/design/controls.md` claimed they took the veil. Four appearances for one status, and the veil is the only one of them that names itself an interaction, `impulseGreen` existing for nothing else (`colors.md`).

The veil's own record had already ruled text out as a face: it covers the check box's icon, **never its label**, because a label may be long or wrapped. A menu entry and a tab of a packed bar *are* only their lettering.

## Considered Options

- **The veil everywhere, weakened** — lower the green layer until a text row survives it. It stays a face the entry does not have, and a value found on a 180 px sidebar row is a different value from the one a 60 px tab needs.
- **The veil on a pill around the text alone** — bounds the invented ground to the lettering. In a list of entries of unequal length the pill's width jumps from row to row; judged too restless on 2026-09-08.
- **`impulseGreen` as the lettering's colour** — the plain link form. Ruled out by the measurement the veil's record already carries: 1.36:1 against `offWhite`, unreadable as text on every pale ground of the palette.
- **The `opacity` change alone** — the standing `menuEntry` form. It carries no interaction colour, so nothing in it says the change is an interaction; `.active` rests at `opacity: 1` as well, which leaves selection and hover saying the same thing; and on a container it takes icons and dividers with it.
- **A green underline alone** — carries the colour and invents no ground, but rests on the same 1.36:1 against a pale ground.
- **A ghost marker** — the hover shows the component's own selection form, weakened. Speaks the component's language but carries no interaction colour, and it has nothing to show on the tab that is selected already.
- **Two appearances, chosen by whether the thing has a face.**

## Decision Outcome

Chosen: **two appearances, and the component's own selection form chooses between them.** Where a component marks its selection as a face, the hover covers that face with the veil. Where it marks the selection on the lettering, the entry has no bounded area, and the hover is an **underline appearance**: the lettering reaches full opacity from `interactionTextOpacity` (.8) and `interactionUnderline`, `impulseGreen` at full strength, underlines it. It is the veil's two layers translated to text and neither half works alone — the opacity carries the visibility the neutral layer carries, the line names the interaction the green layer names, and the pale grounds are why the line does not go out alone.

This is the same shape as the veil's own rule, one level further out: there **the edge** follows the form, here **the whole appearance** does.

**At the tab bar the prop `backgroundMarker` is that choice**, and the bar hands it down to every tab as an injected prop beside the selection, the tab stop and the ground:

- **The lens (default)** — the tabs share the bar's width, so each tab is a bounded area and takes the veil, in the lens's own rounding.
- **The background marker** — the tabs pack at the bar's start and an unselected tab is no wider than its lettering, so it takes the underline. The line sits under the title alone; under the subtitle as well it would read as two targets. The **container tab takes the opacity half alone**: an underline needs a line of text, and that tab holds whatever the call site put in it.

Under the underline appearance the **selected** and the **disabled** tab rest at full opacity, as the `menuEntry` mixin holds both: a marked entry is not a weakened one, and a disabled one is weakened by its typo set already.

**The green layer's alpha stays at .12/.15 for now.** Lowering it to .08 was decided in the same session and belongs to every control, not to this port.

## Consequences

- Good: no appearance invents a ground its element does not have, and both appearances carry `impulseGreen`, so both say "interaction" in the framework's one word for it.
- Good: where a selection is underlined already — the popup `Menu`'s active option — the hover costs no second element: the existing line turns from `primary` to `impulseGreen`, and selection and interaction stay two statements in one place.
- Bad: one status now has two appearances, so every new component has to answer which one it shows. The question is decidable from the component's own selection form, which is why that is the criterion rather than "control or list".
- Bad: the port left the framework mid-migration — the menus kept the `menuEntry` opacity change with no line beside it, and the primary header and the popup worlds' options showed nothing at all. Closing it took two further tickets, and the first of them overturned what this record expected of it. **PDWG-92** answered a question that stood behind all of it: the framework is light, and dark is a property of an area (`general-framework-is-light-dark-is-an-area.md`), so the theme pair for the `glass` map, the dark twin of the elevation shadows and the `menuEntry` pair this record awaited are not needed at all. **PDWG-93** then carried the appearance into the remaining lists, each one taking the form its own selection form asks for — the underline to the sidebar's menu, the mega menu and the popup `Menu`, the veil to the primary header's nodes and to the options of the select box and the proposal list — and lowered the green layer to .08/.10.
- Bad: `interactionTextOpacity` is stated in the `controls` map while the `menuEntry` mixin still holds its own literal .8. The two agree by value and not yet by reference.
