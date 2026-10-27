---
decided: 2026-09-03
jira: PDWG-81
concept_commit: 95fd93be
---

# Make iPad and iPhone usable by tap, and leave full touch parity for later

## Context and Problem Statement

Macs, iPads and iPhones all have to work for the consumer behind Safari support. The framework's touch path was uneven: a modal window could not be resized by touch, a pan left a control pressed, and the overrun after a touch scroll never ran, in any engine. The layout keeps its desktop grid at every width, so the 375 to 430 px of an iPhone leave the main area nothing beside the sidebars.

## Considered Options

- **Desktop Safari only** — no touch work. Ruled out by the consumer's iPads and iPhones; the start check could not have enforced it either, because an iPad sends the desktop user agent.
- **Usable by tap** — fix what blocks a function: resize handles for touch, the handling of a cancelled pointer, the scroll overrun, the touch actions of the page, the digit pad of a numeric field. An iPhone fits through the consumer's configuration.
- **Full touch parity** — in addition a range drag in the calendar, hover appearances for a real hover only, and a layout mode that collapses the sidebars by width.

## Decision Outcome

Chosen: **usable by tap.** It makes every function reachable by tap for about two person-days of work; full touch parity would add three to five more, and its width-driven layout mode is a design decision of its own, beyond what browser support asks for. What stays shaped for the desktop is stated in the section "Touch devices" of the consumer document.

The date and time field stays tap-only (decided 2026-10-23): the calendar and the lists beside it set every date and time, so no path for the virtual keyboard was built.

Full touch parity is left to a unit of its own, once an iPad audience asks for more than tap use.

## Consequences

- Good: every function is reachable by tap on an iPad and an iPhone, on the iPhone through the documented configuration.
- Good: the fixes do not depend on the engine, so Android devices and the touch panels of touch-only projects get them as well.
- Bad: on a phone the framework works only through a configuration the consumer has to know — the hamburger menu and both sidebars off in `config.xml` — and it stays a desktop layout narrowed to fit.
- Bad: a hovered appearance stays after a tap, a calendar range moves by taps only, and a date is picked rather than typed.
- **Open:** that every function is reachable by tap on a touch device — settled by the touch checkpoint in Chrome's touch emulation, which needs no WebKit (a modal window resizes, a fling scrolls, a cancelled drag arms nothing, no control stays pressed after a pan), and by a walk on an iPad.
