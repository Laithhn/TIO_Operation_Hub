---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# A clickable section is drawn and behaves like the filled button

## Context and Problem Statement

A `Section` given `onClick` takes the role `button`, a tab stop and a key handler, and it needs an appearance for its interaction. PDWG-109 chose a lift, a one-pixel rise with the contact shadow and an `impulseGreen` glow, over the controls' two-layer veil, because a control inside a veiled section would show its veil inside another. Once a section could follow the ground it sits on (ADR `general-ground-travels-as-an-inherited-custom-property.md`), its pane was judged beside the controls' again (2026-09-23).

## Considered Options

- The lift with the green glow
- Only the edge turning green, without a veil
- The contact shadow without edge, rim and glow
- The full pane of the filled button, with its veil and its press

## Decision Outcome

Chosen: **the section is drawn and behaves like the filled button**, except for its fill, which stays its own `backgroundColor`. A section lying on the page is the same kind of body as a control, so it takes the same design and the same interaction.

- **A clickable section takes the full pane** — `surface` edge, contact shadow, rim and glow — whether `boxShadow` is set or not. Among the control panes, the full strength marks a body that is clicked: the filled and the overlaid button carry it, while the other controls and a placed component with `boxShadow="contact"` carry `surfaceTinted`. Seen side by side on 2026-09-23, the full strength on a field or a plain surface said more than they offer.
- **It answers like the button.** Under the pointer and the focus its edge takes the interaction color and the veil lies over its face. A press adds the veil once more, pulls the contact shadow together to `contactPressed` and puts the rim out. The section no longer lifts or sinks, and the green glow is gone.
- **Edge and shadow follow the ground the section sits on; the veil follows the section's own ground**, because the veil lies on the section's fill. That is the ground of its color, over an image the one `darkTheme` states, and without either the ground it sits on.
- **A clickable section holds no controls**, and the JSDoc of `onClick` says so; nothing enforces it. An element with `role="button"` presents its children to a screen reader as presentational, so a control inside would be out of reach. Where the rule holds, the veil never meets a control's veil, which was the objection that had decided for the lift.
- **A clickable section requires a `backgroundColor` or a `backgroundImage`**, and the prop types reject `onClick` without either. Without a body of its own there is nothing to draw the pane on. The types still accept `invisible`, a color that is none.
- **The pressed status comes from the hook's `isPressed`, hover and focus from `:hover` and `:focus-visible`**, the split the button makes (ADR [general-interaction-statuses-from-css-pseudo-classes.md](general-interaction-statuses-from-css-pseudo-classes.md)). The browser's focus ring is off, the veil and the edge being the focus appearance.

## Consequences

- Good: a clickable section reads as clickable by the same means as every control: pane, interaction edge, veil and press.
- Bad: a section that holds controls cannot be clickable; such a layout needs a button of its own.
- Bad: `onClick` without a color or an image no longer compiles, which is breaking for a consumer that set it on a transparent section.
