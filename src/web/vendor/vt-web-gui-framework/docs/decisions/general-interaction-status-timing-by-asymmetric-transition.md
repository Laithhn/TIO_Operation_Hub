---
decided: 2026-08-18
jira: PDWG-63
concept_commit: 5c054602
---

# An interaction status lasts exactly as long as its input, and its perceptible minimum is the ease-out

## Context and Problem Statement

A press lasts 50 to 100 ms, and a CSS transition into the pressed appearance never reaches its peak in that time — an interrupted transition reverses from wherever it got to. `useInteractions` therefore held `isClickAnimRunning` for a minimum of `animationTime.slowMs` in JavaScript: a timer, two refs to coordinate it, and a `stop`/`cancel` split. A status arriving during that floor either cut the press off, which flickers, or waited for it, which makes the control show something other than its status says.

## Considered Options

- **Keep the JavaScript floor and cut the press off** when a status arrives — the cut is the flicker, and with a `transform` the most visible kind.
- **Keep the floor and let the status wait** for it — the control then shows something the status does not say, one timer per control, and an asynchronous status compounds it.
- **An asymmetric transition** — the status's own rule transitions in instantly, the base rule eases out over one duration.

## Decision Outcome

Chosen: **the asymmetric transition**. The `controls` map holds the pair `interactionEaseInMs: 0` and `interactionEaseOutMs: 150`; the status's rule sets the ease-in, the resting rule the ease-out, so a press held for one rendered frame reaches the full appearance and fades afterwards, and a status arriving mid-press overlays the fading press instead of cutting it. `useInteractions` reports `isPressed` for exactly as long as pointer or key is down; the timer, both refs and the split are gone. 150 ms was judged brisk at the running button and kept; the neighbouring steps of `animationTime` are 50 and 250 ms.

## Consequences

- Good: one knob in one place instead of a floor in a hook plus a return in each component's stylesheet, and the status takes effect the moment the consumer sets it.
- Bad: a press shorter than one rendered frame shows nothing at all — accepted, a press runs three to six frames at 60 Hz.
- Bad: the asymmetry lives in the placement of two rules, which reads as a duplication to a later editor; the map declares the two durations as a pair with the reason beside them, because consolidating them into one restores the ramp the instant transition removed.
