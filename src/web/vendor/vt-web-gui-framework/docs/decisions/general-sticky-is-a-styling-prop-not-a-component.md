---
decided: 2026-09-22
---

# Express sticky placement as a styling prop, not as a layout component

## Context and Problem Statement

The try-out section of a component content shows the component above the settings that change it, and the button's settings are long enough that the component leaves the screen while one sets them. What is wanted is a header that stays at the top of the scroll area while the rest scrolls past and leaves again at the end of the section it belongs to — which is what CSS `position: sticky` does, and it works inside the framework's scrolling, `Scrolling` scrolling a container whose overflow is hidden.

The framework had no way to ask for it. The styling props know `relativePosition` but nothing for sticky, and the collection deliberately carries no `top`, `left`, `right` or `bottom` — the overlaid button declares those four as its own props, because they concern that button alone. So something had to be added, and the question was what: a prop, or a layout component `StickySection` that would drop `scrollBarV`, `scrollBarH` and `tabBarItemId`, none of which a sticky box should carry.

## Considered Options

- A layout component `StickySection` of its own
- A prop on `Section` alone, declared in `SectionProps`
- A styling prop in `StylingPropCollection`, opted into per component

## Decision Outcome

Chosen: **a styling prop** `stickyPosition` with the values `top`, `bottom`, `left` and `right`, listed by `Section` (decision of the developer on 2026-09-22). It follows `relativePosition`, which is the same kind of concern — a positioning question expressed as a styling prop that each component opts into by naming it in its own `<name>StylingProps` list.

Two reasons decided it. **Sticky is a placement any layout box can take, not a kind of box**: the next candidate is a toolbar inside a scrolling area, which as a styling prop is one list entry and as a component an extra wrapper around it. And **the component would have been mostly duplication**: of `Section`'s 180 lines it would have dropped the three props above and repeated everything else — the 37 styling props through `useStylingProps`, the dark ground detection, the imperative handle, and the click behavior, without which a sticky section could not also be clickable.

The value names the edge and the inset is 0, which is what "sticks to the edge of the scroll area" means. All four edges cost the same single CSS declaration, so the prop can do what sticky can: `bottom` for a bar that stays at the foot, `left` and `right` for a frozen column in an area that scrolls sideways. The two along the writing direction are mirrored for a right-to-left language, as every other directional prop here is.

## Consequences

- Good: a second use adds one entry to one list. `Toolbar` or `Tabular` can take the prop without any new component and without an extra element in the DOM.
- Good: a sticky box keeps everything a `Section` can do — a background, a shadow, a click, the function-as-child measurement.
- Bad: nothing stops `stickyPosition` and `scrollBarV` on the same element, which would put a scroll area inside a scroll area. A component could have made that impossible; here the prop's documentation states it and nothing enforces it.
- The prop sets `position: sticky` on the **outer** element, the one that is the grid item of its parent — like the grid placement props and unlike `relativePosition`, which describes the box's own inside.
- The prop also sets the lowest `z-index`, which the first use showed it has to: a positioned box paints above plain content, but content further down the page that is positioned itself or opens a stacking context lands in the same layer and, coming later, on top of it. It is the only `z-index` the framework hands out beside the two in its native element styles.
- Should a sticky box later need behavior of its own — a shadow that appears only while it is stuck, say — the component can still be extracted. The framework is in its development stage and breaks freely (`vi-prerelease/compatibility`).
