---
decided: 2026-10-01
jira: PDWG-129
---

# The notification stack clips instead of scrolling

## Context and Problem Statement

Enough notifications at once grew the middle row of the app grid past the bottom edge and pushed the footer out of the viewport. Holding the row at the height that header and footer leave (`minmax(0, 1fr)`) settles the footer, but leaves open what a stack taller than that row does: it ran over the header and past the top edge.

## Considered Options

- Let the stack run over the header
- Make the notifications column a scroll container
- Clip the stack below the header

## Decision Outcome

Chosen: **clip the stack below the header**. A notification is meant for a special situation, so it is rare or absent in the normal case, and a message about a content belongs in that content. Where so many exceptions arise at once that only notifications can show them, that situation needs a handling of its own; a scrollable list of mass notifications is no good user experience (the developer, 2026-10-01).

A scroll container would also have cost more than a stylesheet. The column sits outside the viewport, and a notification is shifted into view from there, so the column would have had to move into the viewport and the slide-in animation would have had to be rebuilt around its edge.

## Consequences

- Good: the footer stays in place, the header stays uncovered, and no notification is lost. The oldest leave at the top and come back down as the newer ones below expire or are closed.
- Bad: nothing shows that further notifications wait above the edge. One that does not delete itself (`isPreventAutoDelete`) appears only once the user has closed the ones below it.
