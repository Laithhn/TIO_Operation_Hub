---
decided: 2026-09-11
jira: PDWG-106
---

# The first sidebar's marker is a glass drop, and it carries a colour set of its own

## Context and Problem Statement

The marker that dents the right edge of the first sidebar at the active menu node carried a **flat circle in `primary`**, unchanged since v3. Beside the primary header's marker — a lens of the base design since PDWG-98 — it read as the older of the two: one solid disc of colour next to a body of glass.

Making it glass raises two questions the header's marker did not have to answer.

**What its body is tinted with.** The header's lens is deliberately colourless, `surface.fill.light` and nothing more (ADR [PDWG-98-primary-header-marker-is-a-colourless-lens.md](PDWG-98-primary-header-marker-is-a-colourless-lens.md)). Reading that decision across to the sidebar gives `surface.fill.dark`, structureSilver at 12 %. That marker is **ten pixels across on an offWhite ground**, where the header's pane is thirty high on a dark one — the same recipe, a fraction of the area, and none of the contrast.

**Whether it behaves like a body of liquid while it travels.** The header's lens stretches under acceleration, thins in the middle and gathers itself again (ADR [PDWG-100-liquid-marker-moves-by-a-spring-and-stays-an-option.md](PDWG-100-liquid-marker-moves-by-a-spring-and-stays-an-option.md)). The sidebar's marker moves too: the dent smoothes itself while the body travels out to the flat edge and back.

## Considered Options

**The tint:**

- **`surface.fill.dark`, the base design unchanged** — structureSilver at 12 %, the value every control's resting pane carries on a light ground.
- **`primary` at 35 %** — the colour the flat dot had, taken down to the strength of a translucent body.
- **`primary` at 60 %, with the border at 75 %** — a colour set the marker owns, stated in its own stylesheet.

**The travel:**

- **A drop that deforms** — five keyframes morphing one path, the header's proportions: the mass at the leading end, a smaller ball dragged behind it, a neck between them.
- **A sphere that only moves** — one circle, translated, which is the movement the flat dot already had.

## Decision Outcome

Chosen: **`primary` at 60 % with a border at 75 %, on a body that keeps its round shape.**

**The colour set is the marker's own, and it is the one deviation from the base design in this component.** Both weaker options were built and seen on the running GUI on 2026-09-11: the base design's 12 % disappears on a body this small, and 35 % read as a *locked* control rather than as a marker — the strength of `surfaceLocked` is what a viewer has learnt to read as "cannot be used". The light around the body — the lit rim, the inner glow and the contact shadow — stays the base design's untouched, so the drop is the framework's glass with a body of its own rather than a second kind of glass.

The tint stays `primary` where the header's is colourless, because the two markers do not carry the same load. The header states where one stands **beside** this marker, which is what lets it stay quiet; in the sidebar this drop is the only thing naming the active entry, with nothing but a semibold label beside it.

**The deformation was built, seen and taken out again.** The travel is roughly ten pixels and lasts one content fade — too short and too quick for any of the shape to register. What was left was code nobody could see: a path builder, five keyframes and four animated elements instead of one circle and one translation.

Two smaller values go with it: the radius rises from 4 to 5, which is the room the rim and the glow need to read as glass at all, and the resting position moves one pixel further out of the sidebar, where the larger body sits better in the dent.

## Consequences

- Good: the two menu markers of the framework are made of one glass, and the sidebar's is legible at a glance on its light ground.
- Good: the drop is one circle and one translation — the construction the flat dot had, with a different skin.
- Bad: `marker.scss` holds two colour values that no map answers for, so a change to the palette's weighting does not reach them. They are named and reasoned at the top of that file.
- Bad: the two markers now differ in their tinting rule, and neither ADR can be read without the other.
- Bad: the liquid behaviour is available in the header and deliberately absent here, so "the marker behaves like glass in motion" is no longer true of the framework as a whole.
