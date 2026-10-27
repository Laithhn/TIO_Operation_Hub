---
decided: 2026-10-01
jira: PDWG-135
---

# A notification announces its arrival with a pulse

## Context and Problem Statement

A notification without a colour carries the glass of every surface over the page. On a light page that glass barely separates from the background: its edge is nearly white, and only its shadow sets it off, so such a notification did not catch the eye (Christopher, PDWG-129). It stays light (ADR [general-framework-is-light-dark-is-an-area.md](general-framework-is-light-dark-is-an-area.md)), and its colour says how much attention the message deserves, not whether the notification is noticed.

## Considered Options

- A darker neutral edge for the notification
- A stronger shadow
- A default icon where none is set
- A bump: a short growth and return once it has flown in
- A pulse: a ring that grows around it and fades out once it has flown in

## Decision Outcome

Chosen: **the pulse**, played by every notification once it has flown in completely. The developer chose it over the bump and the default icon after comparing all of them side by side, and settled on one beat after trying two in a row (2026-10-01).

A notification differs from the other surfaces over the page in one respect. A card, a menu or a dialog opens because the user asked for it, so the eye is already there; a notification appears unasked at the edge of the view, where motion is what the eye notices. The pulse says that something has arrived, not how much attention it deserves, so it is drawn in the neutral `structureSilver` and plays on every colour alike.

The edge and the shadow would have set the notification apart from the card and the menu, which carry the same glass and the same set of shadows (the developer, 2026-10-01). A stronger shadow was not even available: the level above `floating` is `modal`, which is softer and paler.

## Consequences

- Good: the glass and the shadows stay one description for every surface over the page.
- Good: the colours keep their meaning, and a message the user has to notice still takes `attention`.
- Bad: the pulse plays only on arrival. A notification that arrived while nobody looked is no easier to find afterwards.
- Bad: where the user asks for reduced motion, the pulse stays off, and the slide-in is all that announces a notification.
