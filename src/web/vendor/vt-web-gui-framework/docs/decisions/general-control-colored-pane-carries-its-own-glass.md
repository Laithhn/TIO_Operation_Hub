---
decided: 2026-09-04
jira: PDWG-87
---

# A coloured pane carries glass of its own while it can be used, and stays flat while it is locked

## Context and Problem Statement

The three strengths of the pane (`general-control-pane-translucent-in-three-strengths.md`) are dimensioned for a translucent veil that lets the background through: their rim and glow are `offWhite` at low alpha, their edge a notch denser than the veil. A pane whose fill is a colour of the palette — the switch that is on, the filled button with a highlight — is opaque and saturated, and on it those ingredients all but vanish: the switch's track read as flat paint at the running control on 2026-09-04, once its knob had become the light body every platform puts on a coloured track. At the same time the `ACTIVE` button, which carries the same colour, is meant to look flat: it is locked, and the flatness is what says so.

## Considered Options

- **Leave the coloured pane as it is** — the value is stated by colour and knob position; judged too flat at the running switch.
- **Give a coloured pane the `surface` strength's light ingredients** — the rim reads, but the glow at .1 stays invisible on a saturated colour, and the edge stays the theme's grey, no contour on an opaque fill.
- **A set of glass ingredients for a coloured fill**, in the `controls` map beside the three strengths — edge, rim and glow tuned for an opaque colour, no fill and no contact shadow of its own, one set for both themes.
- **For the locked coloured pane:** keep that glass, so that `ACTIVE` and `BUSY` read as the same body as the switch that is on; or let the lock thin it as it thins every pane.

## Decision Outcome

Chosen: **`surfaceColored` in the `controls` map**, drawn by a coloured pane that can be used — the switch that is on, and the filled or overlaid button with a highlight while nothing locks it. Its edge darkens the colour with `primary` at .2 rather than lightening it, because a light line all around would be a second rim where the edge's job is a contour; its rim and glow are the surface's own ingredients, denser, because the same `offWhite` carries less on a saturated colour than on the grey of a veil. It has no fill, the colour being the fill, and no contact shadow, which is the body's shadow onto the background and follows the theme as before. One set serves both themes: whatever the background, the colour is what the glass lies on. The solid highlight, a plate in `primary`, is the one colour the edge cannot darken and stays with the surface's ingredients.

**The lock thins a coloured pane like every other.** `ACTIVE` and `BUSY` keep their colour and take none of the new glass: they lie in the surface, and the difference to the switch that is on is wanted — one can be used, the other cannot. The rule that draws the glass on the button is guarded with `:not(.locked)` for that reason, and the switch's `disabled` rule stands after its `on` rule and wins by position.

## Consequences

- Good: the switch that is on and the highlighted button read as the same glass body the neutral panes are, on every background, and the values are stated once for both.
- Good: the flat `ACTIVE` button now stands against a glassy usable one, which makes the lock's statement sharper rather than weaker.
- Bad: a fourth set of values beside the three strengths, outside their one calculation; the map states the reason for each ingredient so that a change to the surface is carried there by hand.
- Bad: the button's rule for the coloured glass is position-bound in `button.scss` — it has to stand before the hover rule and the press rules, which win against it only by standing later.
