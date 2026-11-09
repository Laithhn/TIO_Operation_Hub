---
decided: 2026-09-18
jira: PDWG-118
---

# Every component carries all six editor-fold sections

## Context and Problem Statement

`States` and `Effects` were the two optional fold sections: a component holding no state and running no effect left them out. The code therefore showed two shapes, one with six sections and one with four, and 28 of 158 `.tsx` files used the shorter one. The same document justified the other four sections staying empty — an empty section says "there is nothing here", where a missing one leaves the reader checking whether it was forgotten. The exception undid that argument for exactly the two sections a reader looks for first.

## Considered Options

- Keep the two optional
- Make all six mandatory

## Decision Outcome

Chosen: **all six, empty where the component has nothing to put in one.** The outline of a folded component then answers at a glance whether it holds state and which, without the reader having to tell an absent section from an omitted one. One shape replaces two, which is one rule less to know when writing a component and one case less for the rule to carry.

`OPTIONAL_SECTIONS` drops out of `dev/eslintRules/editorFoldSections.js`; the rule reports a missing `States` or `Effects` like any other section.

**The two kinds of component carrying no sections at all are untouched**: one returning its JSX directly as an arrow expression, where `arrow-body-style` forbids the block body the sections would need, and one rendering an `<article>`.

**The word "Stateless" left the component comments in the same change.** 28 files opened with "Stateless React sub-component of …", which described the old shape and, since components are no longer called as functions (ADR [general-render-components-as-jsx.md](general-render-components-as-jsx.md)), no longer marks anything a reader has to know.

## Consequences

- Good: a folded component has one outline whatever it does, and the absence of state is stated rather than implied.
- Bad: 28 files carry twelve lines that hold nothing, and every component written from now on carries them too where it has no state and no effect.
