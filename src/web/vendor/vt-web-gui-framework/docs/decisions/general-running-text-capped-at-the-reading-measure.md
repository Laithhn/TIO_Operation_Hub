---
decided: 2026-10-20
jira: PDWG-144
---

# Running text is capped at one reading measure

## Context and Problem Statement

Components that render running text they receive as a prop let it run as wide as their container, and some containers are as wide as the viewport. On a wide screen the two-sentence hint of a `Confirm` became one line of more than 130 characters. A consuming app could not narrow it: `Confirm` and `Alert` take no styling props. Typography puts a readable line at 45 to 75 characters, and WCAG 2.x SC 1.4.8 (AAA) at 80 at most.

## Considered Options

- Cap every component that shows running text from a prop, the containers `Dialog` and `Card` included
- Cap the components that compose their text themselves: `Confirm`, `Alert` and `ErrorScreen`
- The same, plus the hints and notices: `NoticeForControls`, the hints of `ValueField` and `TabularValueItem`
- Any of these, with the article moved from `articleMaxWidth` (700 px) to the same value

## Decision Outcome

Chosen: **`Confirm`, `Alert` and `ErrorScreen` cap one column of text at `typo.measure`, 65ch, measured at the body size, and `Section` offers the same cap to every content as `maxWidth="textColumn"`.**

- **`Dialog` and `Card` stay uncapped.** Their content is the consumer's: forms, tables, a picture. A cap there would narrow content the framework did not write. A consumer that puts running text into a dialog caps it the way `Confirm` and `Alert` do, with `<Section maxWidth="textColumn">`.
- **The hints and notices stay uncapped.** Their layout column bounds them, and it is rarely wide enough for the line to grow too long.
- **The article keeps its 700 px**, about 85 characters at the root size. Moving it would narrow every article content of every consumer, a separate decision.
- **`ch`, not pixels**, so that the measure follows the font size. A typographic value therefore belongs in the `typo` map; the `layout` map counts in pixels.
- **One column at the body size, not each text in its own font.** The question of a `Confirm` is set large, its hint small. Capped in its own font, each would reach a different width, the question far wider than the hint, and the two edges would not line up. In one column, the large question runs to about 50 characters per line and the hint to about 85.
- **A styling prop `maxWidth` that takes one keyword, `"textColumn"`, and no width of one's own.** A free width would invite any value, and the right one would have to be known as `65ch`. The keyword names the use, the type allows nothing else, and a further measure would be one more keyword. `Section` carries the prop, and `Confirm` and `Alert` use it themselves.
- **A `max-width` on the column, not a grid track.** A short question keeps the dialog as small as it was; only a long one stops at the measure. A `fit-content()` track promises the same, but Firefox sizes the dialog by the uncapped track: the text wrapped at the measure inside a dialog as wide as the viewport. Edge capped both, the track and the dialog (checked on 2026-10-20). A fixed track such as `minmax(0, 65ch)` would widen every short dialog to the measure.

## Consequences

- Good: a long question, text, hint or error message wraps at the measure instead of running across the screen.
- Good: one value to tune, and a consumer reaches it by name, without knowing the number.
- Bad: the small hint in the shared column runs to about 85 characters, beyond the 80 of SC 1.4.8. The aligned edges were preferred.
- Bad: two measures stand side by side, `typo.measure` and the article's `articleMaxWidth`.
- Bad: `Tooltip` is still v3 code and stays uncapped until its port, and the notifications size themselves from the viewport in TypeScript, untouched here.
