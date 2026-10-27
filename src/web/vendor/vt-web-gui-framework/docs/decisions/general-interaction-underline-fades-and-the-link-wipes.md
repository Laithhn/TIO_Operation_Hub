---
decided: 2026-09-09
jira: PDWG-93
---

# The interaction underline fades, and the classic text link is the one line that wipes

## Context and Problem Statement

The interaction underline arrives instantly and leaves over the ease-out, drawn as a `text-decoration` whose colour transitions from transparent to `impulseGreen`. The classic text link does something else entirely: `_nativeElements.scss` gives every `a` a green line at rest and **retracts** it under the pointer, `transform: scaleX(0)` from the right over `animationTime.slowMs`, growing it back from the left on leaving. Two motions for one colour, and the question was whether the underline should take the link's.

A `text-decoration` cannot wipe — only its colour is animatable. A wiping line has to be drawn: a pseudo element with a border, which is what the `a` rule uses.

## Considered Options

- **The line wipes everywhere** — every interaction underline becomes a drawn line. A drawn line follows the **box**, where a text decoration follows the **text**, so every caption would have to hug its own text: the mega menu's and the popup `Menu`'s captions are grid items stretched to their column, and the tab bar's title stands in a column as wide as the longer of title and subtitle. Each of them would need its box bound to its text, and the tab bar's two-line tabs would have their alignment touched.
- **The line wipes where the box already hugs the text** — two mechanisms, chosen per component by a property the reader cannot see.
- **The line fades everywhere, and the link keeps its wipe.**

## Decision Outcome

Chosen: **the fade everywhere, the link excepted.** The underline stays a `text-decoration` and stays exactly as long as the word it marks, which is what a line under lettering has to be; the cost is that it can only fade.

The link keeps its wipe, and not merely because it works there. **The two lines say different things.** The link's line is permanent: it marks the text as a link, which is the third use `impulseGreen` is granted (`colors.md`), and it moves *away* under the pointer. The interaction line states "you are on this" and moves *in*. A link is also the one case where the box hugs the text by itself — an `a` is `inline-block` — so the wipe costs it nothing.

## Consequences

- Good: one line under a word is as long as the word, in every list, at every caption length.
- Good: the link keeps the appearance users know it by, and the permanent green line keeps marking it as a link.
- Bad: two motions live in the framework for one colour. This record is what tells the next reader that the difference is meant.
- Bad: should a wiping interaction line ever be wanted, it costs the box-hugging work in every consumer, which is what this record turned down.
