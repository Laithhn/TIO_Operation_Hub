---
decided: 2026-09-09
jira: PDWG-93
---

# The element carrying the marker shows no interaction veil under the pointer

## Context and Problem Statement

Where a component marks its selection with a face, that face is a translucent layer: the tab bar's lens is the marker's colour thinned to a tint over the bar's ground, the primary header's marker is glass. The interaction veil is a translucent layer as well. Both lay on the same element the moment the pointer selects it, and the marker reaches it in motion: at the click the lens travels from the previous tab onto the tab under the pointer and slides over its veil. Two translucent layers on one element for the length of that journey, judged overloaded at the running controls on 2026-09-09.

The hover is a CSS status. `:hover` knows nothing of a click that has happened, and `:active` holds only while the button is down, so nothing in the stylesheet can react to the click itself.

## Considered Options

- **A status per element, set at the click** — the element remembers that it was clicked, drops its veil, and arms it again once pointer and focus have left. Three components gain a status and a class, and the double layer returns the next time the pointer arrives on the element that is now selected.
- **Suppressed while the marker travels** — the parent knows when the selection changes and how long the marker takes, and suppresses the veil for that span through a timer or `transitionend`. It preserves everything as it was and costs the most machinery.
- **The element carrying the marker never shows the veil under the pointer.**

## Decision Outcome

Chosen: **the marker carrier shows no veil under the pointer.** It needs no status and no timer — one `:not()` in the tab bar, whose `selected` class exists already, and an `active` class in the primary header's node, which computes the value from the store already. And it states a rule instead of an exception: **the marker is the statement, and where it lies the interaction adds nothing.** That also removes the double layer where the first option leaves it — hovering an element that was selected long ago.

**The focus is excepted.** A focused element shows the veil even where it carries the marker, because the veil is the only thing that marks it: the browser's outline is suppressed at all three, and the tab bar's tab stop sits on the selected tab, so tabbing into a bar would otherwise show nothing at all. The exception costs nothing here, a pointer click leaving no `:focus-visible` behind — the overlap this record is about cannot arise on the focus path.

This reverses one sentence of `PDWG-83-tab-bar-hover-follows-the-marker.md`, which held the selected tab to be no exception because it can be clicked again. It can, and the cursor still says so; what it no longer does is answer the pointer with a second layer.

## Consequences

- Good: no status, no timer, no second appearance to keep in step — and the two layers never meet, in motion or at rest.
- Good: the same rule reaches the primary header, whose glass marker had the same overlap.
- Bad: hovering the selected element gives no visual answer. The cursor and the marker carry that weight now.
- Bad: the underline form is untouched by this and needs no exception — its marker is an opaque filled tab and its interaction is a line, not a layer — so the tab bar answers a hover differently in its two forms.
