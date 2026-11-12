---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# The framework is light, and dark is a property of an area rather than a mode

## Context and Problem Statement

Every control once carried a `darkTheme` prop and the base design holds two appearances, but nothing said how far the dark one reaches: the popups had no such prop and rendered light glass, and the shadow levels would vanish on a dark ground. The tab bar port ran into the gap on 2026-09-08, and PDWG-92 was cut on the assumption that the dark appearance ought to reach the popups. PDWG-123 later let every component learn its ground by itself, which put the question again for the surfaces over the page.

## Considered Options

- **A dark mode** — a second palette and a switch. Every value of the design gains a twin, every component a second appearance to verify, and the product has never asked for it.
- **Dark reaches wherever an element sits on a dark ground, popups included** — dark glass, a dark `Card`, a dark twin of every floating shadow. Consistent, and it makes a popup's appearance depend on what happens to lie behind it.
- **The framework is light; dark is a property of single areas** — the header, the footer, a section with a dark background color.

## Decision Outcome

Chosen: **the framework is light, and dark is local.** There is one appearance, and it is light. A dark area is a fact about one region's background, and nothing outside that region learns of it.

**What belongs to an area takes its ground; what floats over the page does not.** Belonging is the criterion, not floating. The scroll button floats inside the tab bar or the menu it scrolls, so it takes that container's ground. A popup lies over the page as a surface of its own and stays light whatever it covers — the mega menu included, which hangs *below* the dark header rather than *in* it. **A dark `Card` does not exist**, and no floating surface takes a dark color: `Card` and `Dialog` take no settable color at all (ADR [general-glass-is-the-cards-ground.md](general-glass-is-the-cards-ground.md)), and the notification's two alternatives are light grounds.

- **The notification is light.** Its default ground is the glass the card has, and `attention` and `attentionHigh`, both light grounds, stay as alternatives. The dark default `structureSilver` is gone, and `paleGray` with it.
- **The modwin has no ground of its own.** The content inside it brings its own, article or dashboard, as in the main scope; a glass modwin would show its glass only where the content leaves a gap. Its header keeps the dark `structureSilver` and passes it on like any other carrier.
- **The image viewer is the one dark surface over the page.** It sets a dark ground, because the eye views images better on a dark ground (the developer, 2026-09-23).

## Consequences

- Good: the per-component question is decided in one step, and a new component answers it from where it is placed rather than from taste.
- Good: one palette, one glass, and one set of floating shadows for the surfaces over the page, without a dark twin; a popup looks the same wherever it is opened.
- Bad: a content that fills a whole page with a dark section gets no dark popups over it, and cannot ask for them. Should a customer ever want that, this record is the thing to reopen.
- Bad: the image viewer is decided by its content rather than by where it sits, so placement alone no longer settles every surface over the page; a new surface that shows images argues its own case.
