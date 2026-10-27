---
decided: 2026-08-28
jira: PDWG-63
concept_commit: 5c054602
---

# A control that holds a value is labelled by the layout around it, not by itself

## Context and Problem Statement

A control that holds a value says nothing about itself: an empty input field is a blank space until something tells the user what belongs in it. Who supplies that naming was answered twice. Until 2026-08-27 it came from outside — a consumer wrote a text beside the field, or a layout supplied it, `TabularValueItem` carrying a `label` prop for exactly that. On 2026-08-27 the input group took `label` and `labelType` props of its own, on the grounds that a control carrying its own pane bounds itself and should be able to stand alone. The following day showed what that costs in the arrangement these controls actually appear in.

## Considered Options

- The layout around the control supplies the label
- Every control that holds or toggles a value carries `label` and `labelType` of its own
- Every control carries them

For the check box's own alignment in a column (2026-08-31):

- `justifyContent` as a styling prop of the check box
- A prop of its own after the pattern of the date time picker's `justifyValues`
- An unconditional `justify-content: space-between` on the check box
- A distribution bound to `labelFirst` through a class of the control's own

## Decision Outcome

Chosen: **the layout supplies the label**, and a control that holds a value carries no label prop. The one exception is the control whose visible text **is** its content rather than a name for it — a check box or a switch states its own value in words, and both keep `label`, `labelType`, `labelFirst` and `wrapLabel`.

An input mask is almost never one field. It is a column of them, and what a reader needs from that column is one edge: every field the same width, that width set by the longest label. A control that carries its own label cannot produce it — its label's width is its own, so each row measures itself and the panes land on as many different edges as there are rows. Only an element above all the rows can measure them together, which is what a two-track grid does: the labels in the first track, the controls in the second, and the first track as wide as the widest label. `proj/contents/examples/login/loginMask/LoginMask.jsx` builds exactly that out of a `Section` with `gridTemplateColumns="auto 1fr"`.

The self-carried label was not wrong about what it bought — a control that stands on an empty surface needing nothing around it. It was wrong about how often that case occurs against the case of several controls under each other, which is what a form is.

The check box is not the same case, and the line is the visible text. On a button, a link, a menu item or a tab, the text says what pressing will do — a second word naming it would name nothing. On a check box the text says what the value *means*, so it belongs to the control the way a button's caption does: it is inside the click target, it lights up with the control, and no layout can supply it without taking the click along. The rename its props went through on 2026-08-27 stands on its own reason: `label` is the framework's word for this role — `TabularValueItem` has carried it all along — where `text` said only that it is text.

Carrying its own label, the check box has to produce by itself the alignment the layout produces for the input group: with `labelFirst` set, it pushes its label and its icon to its two edges, so a stretched column of check boxes named on the left carries its icons on one edge and reads as a list. The distribution is bound to that prop through a class of the control's own rather than offered as a prop — with the icon first, the same distribution would drive the label away from the box it names, so a free value would mostly offer layouts no call site wants — and it shows only where the surrounding grid stretches the control; `justifySelf="start"` at the call site takes it back. `justifyContent` as a styling prop would not have worked as written: the hook derives it into the inner style, every control reads the outer one, and the check box is a single element — it would have been the first control to put an inner style on its outer element and the first to let a call site set its internal layout at all. The unconditional `space-between` it started with parted label and box on every check box that carries its icon first.

## Consequences

- Good: the panes of a column stand on one edge and take one width, without any call site computing one.
- Good: a control knows nothing but its value. What `ERROR` colours is therefore its own edge and never a word belonging to something else.
- Good: a column of check boxes named on the left lines its icons up on one edge, as a column of input controls does its panes.
- Bad: a single control on an empty surface is unlabelled — the arrangement around it is now required, not optional.
- Bad: the vertical alignment of label and value falls to the call site. The controls export a baseline for it, as the button does, but which alignment the row takes is the layout's choice and can be got wrong.
- Bad: a select box without a `label` prop has no accessible name of its own; an `aria-label` has to come from the call site. This held before 2026-08-27 as well, so no consumer loses one it had.
