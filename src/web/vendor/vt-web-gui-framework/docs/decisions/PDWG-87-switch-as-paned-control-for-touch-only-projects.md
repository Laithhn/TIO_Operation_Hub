---
decided: 2026-09-03
jira: PDWG-87
---

# The switch is a paned control of its own for touch-only projects, and states that it is on in `attention`

## Context and Problem Statement

The switch — the control that says it turns something on rather than that it selects a value — was the third type of the check box: a cut-out SVG glyph of 30 by 18 units beside the tick box and the radio button, with a `large` size of 70 by 50 px so that a finger could hit it. Beside the paned controls of the base design it read as small and thin. The tinted button and the input controls rest on a pane of the shared height, and a switch is expected to look like them rather than like a check box's icon. Two decisions about the type stood already and had to be weighed again with the construction: that the switch serves touch-only projects and carries no hover appearance, and that its track never fills with colour.

## Considered Options

For the construction:

- Keep the switch a type of the check box and redraw the glyph larger
- A control of its own on a pane of the base design, the knob a disc that CSS moves

For the intent and the size:

- A general control with the full interaction appearance, in the two sizes every other control has
- Touch-only as before, in one size

For the colour of a switch that is on:

- The knob's position alone, as the glyph had it
- `calmingGreen`
- `attention`

For the knob:

- A solid disc in the lettering colour
- A ring while off and a disc while on, the radio button's relation between ring and dot
- A pane of its own, in the `surface` strength the filled button carries

## Decision Outcome

Chosen: **a control of its own**, `Switch` under `src/components/controls/switch`, with the check box's props less `type` and `large`, and `value` a plain boolean. Its pane is the tinted one of the button and the input group — 50 wide by `heightDefault` 30 high, the proportion of 1.67:1 the glyph had, where iOS (1.65) and Material 3 (1.63) sit — and the knob is a disc of 22, 3 px inside the edge, 0.79 of the inner height where the platforms keep to 0.70 and above. The check box keeps the tick box and the radio button: those two are cut-out glyphs by `general-control-icons-are-cut-out.md`, and a pane with a body moving on it is a different construction that no longer fits into one component. Its status set is `IDLE` and `DISABLED` alone: what a switch switches takes effect at once, so it has no changed value that a status could state (decided 2026-09-04, and the same day the `EDITED` status left every other control as well — `general-changed-value-is-no-control-status.md`).

**Touch-only stays, in one size.** The switch is meant for projects on touch-only devices, and for those alone; on a device with a pointer or a keyboard, the check box is the control. It therefore takes the interaction veil and the green edge for the focus — such a device may still have a keyboard attached, and WCAG 2.4.7 asks that a focusable element show its focus — and nothing for the pointer: a hover appearance on the target device is one nobody sees. The `large` size fell with the glyph. At the shared height the pane is what makes the switch large enough, and 70 by 50 px would be too large beside the other controls. The modality query `@media (hover: hover)` stays rejected as the wrong axis: it describes the device, where the restriction is a statement about the control.

**On is `attention`.** A setting that is switched on is level 2 of the attention ladder — notable but uncritical — and `colors.md` names that case in so many words; the `ACTIVE` button carries the same colour for the same statement. The glyph had refused any fill on the grounds that the colour for "on" would be `impulseGreen`, which is the interaction colour and exists for nothing else — a reasoning that overlooked the ladder. `calmingGreen` was the first candidate and was dropped: it has no place in the three vocabularies of the palette, and a fourth meaning for one control is not worth founding. A disabled switch that is on keeps the fill at the alpha of the disabled lettering, so that the value stays stated without the control promising to be usable. The glass the coloured track carries is a decision of its own, `general-control-colored-pane-carries-its-own-glass.md`.

**The knob is a pane of its own.** It was built first as a solid disc in the lettering colour, the colour the check box's icon takes, and judged too dominant at the running control on 2026-09-03: 22 of 28 pixels in the darkest colour of the palette, the one opaque element among controls made of veils. The ring — off a ring, on a disc — was built beside it and judged as not looking good. Chosen is the knob as a body of the base design's own glass, lying on the track and stating no colour, only a body. Its glass is the `offWhite` veil every pane carries over a dark ground, at .7, and it is the same veil in every status and theme: the knob was first given the `surface` strength, `structureSilver` over a light ground, and then darkened the grey track while off and lightened the blue one while on — two bodies for one knob, judged at the running control on 2026-09-04. A knob that lightens whatever lies under it is one body, and the light body every platform puts on a switch. The fill stops short of opaque so that the knob stays glass: 18 %, the surface's dark-ground value, was a slightly lighter blue on the blue track, and 40 % still read as blue on blue. Its edge and its contact shadow follow the ground like every pane's and are twice as dense as the surface's, because a body of 22 px has to separate from a track made of the same glass, where a button separates from a whole surface; at the surface's values throughout it read as a body but too faint. That is no break with the pane's construction — the pane ADR answers the flatness of a veil with edge and rim rather than with a stronger fill. The values stand in `switch.scss`.

The knob moves by its logical inline start rather than by a transform: the logical property mirrors in a right-to-left document by itself, and it costs no compositing layer.

## Consequences

- Good: the switch reads as one of the paned controls, in the strength and the height they share, and its value is stated by position and fill, where the glyph stated it by position and a filled knob.
- Good: the check box is two cut-out glyphs and nothing else again; the switch's classes, paths and widths leave its stylesheet and its icon.
- Good: the knob is made of the glass every pane carries over a dark ground, so the switch carries no opaque element and no colour beside the value's.
- Bad: the knob's edge and shadow are two values of their own beside the three strengths of the map, kept in `switch.scss` with their calculation stated; a change to the surface strength has to be carried there by hand.
- Good: the restriction to touch-only projects lives where a consumer reads it, in the JSDoc of the component, and the missing hover has a recorded reason instead of looking like an omission.
- Bad: a consumer that wrote `type="switch"` has to move to the new component — a contract change of the check box. No v4 content in this repo did.
- Bad: a project that does put a switch on a pointer device gets a control that answers the pointer with nothing but its value change; the fix is to use a check box, not to add the veil back.
- Bad: the pane of 50 by 30 px is under the touch targets both platforms ask for — Apple 44 by 44, Android 48 by 48 — and cannot grow, 30 being the height every control shares; a hit area extended beyond the pane stays a follow-up for a project with a real case.
