---
decided: 2026-09-24
jira: PDWG-123
concept_commit: df45dd35
---

# Glass is the ground of a card and a dialog, and no color replaces it

## Context and Problem Statement

`Card` once filled itself with opaque `offWhite` and could not take the glass of `glassmorphism()`, because the mixin wrote the whole `box-shadow` while a card states its shadow per situation. PDWG-63 gave the card the glass by default and let a named background replace it whole. PDWG-92 then settled that a floating surface is light whatever it opens over (ADR [general-framework-is-light-dark-is-an-area.md](general-framework-is-light-dark-is-an-area.md)), and the named background stayed the one way to make a card or a dialog dark.

## Considered Options

- A prop that switches the glass on
- A named background layered over the glass
- Glass by default, a named background replacing it whole — chosen in PDWG-63
- Glass always, with no settable background; a different color comes from a `Section` inside

## Decision Outcome

Chosen: **glass always.** `Card` and `Dialog` carry the opaque glass and set `--ground: light`; neither takes `backgroundColor`, `backgroundImage` or `backgroundOptions`. A different color on them comes from a `Section` placed inside, which sets its own ground for what it holds. The dialog had no ground of its own before and takes the same glass, so `Alert` and `Confirm` dropped the `offWhite` they set on it.

The named background was the only way to make a card or a dialog dark, and the framework wants neither: a dark dialog does not exist, and `MainSection` has no settable color either. The switching prop had been rejected before for asking the consumer to state the default.

**The mixin keeps the glass and gives up the shadow.** The shadow says how high a surface floats, which is the component's statement, so it arrives through the custom property `--glassShadow`. The mixin only assembles it with the glass's own inner glow, which shares the `box-shadow` property. That is the slot idiom of ADR [`general-css-custom-property-status-layers.md`](general-css-custom-property-status-layers.md), and it lets `.card` set the height once and `.anchored` change it without either of them restating the glow. Every value the mixin held sits in the `glass` entry of `$layout`, where the edge is 10 points denser than the fill and the glow is a value per strength. The signature is the strength alone, `glassmorphism($strength: translucent | opaque)`, and an unknown name stops the build with an `@error`.

## Consequences

- Good: one description of the glass, read by the card, the dialog, the notification, the mega menu and the select-box menus.
- Good: no call site can make a card or a dialog dark, so their content is always lettered for a light ground.
- Bad: removing the three props from `Card` and `Dialog` is breaking for a consumer that set one.
- Bad: a card that needs a color gets it from a `Section` inside, which the glass's edge still frames — close to the plate in a glass frame that PDWG-63 rejected for the layered option.
- Bad: `backdrop-filter` samples whatever lies behind it, translucent layers included, so a control with its own pane inside a glass card stacks two translucencies. At 85 % the effect is small, and it is why every surface over the page takes the opaque strength rather than the translucent 25 %.
