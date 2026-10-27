# Colour semantics

What the colours of `$color` (`src/assets/styles/color/_index.scss:10`) mean, and which of them a component may reach for. The palette itself is brand-level and fixed; this document is about the meaning attached to it, which no code can express and which decides the choice in almost every component.

Three vocabularies carry that meaning, and they never substitute for each other: the **attention ladder** (how much the user has to attend to something), the **signal colours** (the status of a thing the page shows) and the **interaction colour** (this element reacts to you).

## The attention ladder

**The guiding idea is how much of the user's attention a thing deserves.** Three levels, and the palette carries the two that need a colour:

1. **Everything is as it should be** — the normal case, and it needs no attention at all. It gets no colour of its own: normal lettering, the normal surface.
2. **Something is notable, but uncritical** — a setting is switched on, a mode is active, something is worth a look. It should catch the eye lightly: **`attention`** (`#00b3ff`, blue).
3. **Something is not as it should be** — an entry is invalid, a value is out of range, an action failed. It needs raised attention: **`attentionHigh`** (`#e6932b`, orange).

The ladder is about the *user's* attention, never about the severity of an event in the abstract. Whether a thing is worth a colour is answered by the question "does the user have to do something about it?" — a status nobody has to react to stays uncoloured, however remarkable it might be technically.

## The signal colours are a different vocabulary

**`signalOk`, `signalWarning` and `signalError` depict the status of a thing the page shows** — a device's traffic light, a station's health, the result of a run. They describe the subject, not the user interface: a red `signalError` says the *device* is in a fault status, not that the user made a mistake.

The two vocabularies therefore never substitute for each other:

- A control that flags a wrong or missing entry uses **`attentionHigh`**, not `signalError` — the entry needs the user's attention, and the control itself is in no fault status. This is what the input controls do on their edge (`src/assets/styles/inputControl/_index.scss`, the rule for `.error`).
- A control that *depicts* a status uses the signal colours — which is why the button's `highlight` prop offers both vocabularies (`src/components/controls/button/button.types.ts:100`): a button may well be the thing showing a device's traffic light.

**A status is expressed once — by the surface or by the control on it, never by both.** A tile whose background says "error" and a button on that tile whose colour says the same thing is not twice as clear, it is a contradiction: the reader cannot tell which of the two the status belongs to. Whoever builds a view therefore decides which of the two carries it. This is why no control tries to stay distinguishable from a background of the very colour it uses itself — the case is a consumer error rather than something a control could detect, and `highlight: 'solid'` is the one value exempt from it, because it names no status.

**Two of the signal colours repeat a value of the palette** — `signalWarning` is `attentionHigh`'s `#e6932b`, `signalOk` is `calmingGreen`'s `#5dae95` (`src/assets/styles/color/_index.scss:17`–`18`). The same colour under two names: the name says which vocabulary is meant, and only `signalError` (`#b00020`) has a value all of its own.

## `impulseGreen` is the interaction colour

**`impulseGreen` (`#2ff3e0`) belongs to interaction and to nothing else.** It says "this reacts to you" — it marks hover and focus, and it marks a classic text link as a link. It is neither an attention level nor a signal: no status of a thing, no severity, is ever drawn in it.

The repo applies it that way throughout: the interaction veil and the edge of every control of the base design (`src/assets/styles/layout/_index.scss`, `interactionVeil` and `interactionBorder` in the `controls` map), the minimize button of the second sidebar (`src/app/modules/secondSidebar/minimizeButton/minimizeButton.scss:49`, `:53`) — and both of a link's jobs at once, the underline that marks an `a` as a link, drawn as a `::before` that retracts on hover (`src/assets/styles/_nativeElements.scss:426`), plus the focus outline (`:443`), and the glow under a thumbnail that lifts (`src/components/popups/imageViewer/preview/previewImage/previewImage.scss:65`).

**On a control, the colour is the upper layer of a two-layer veil over the control's face, and the edge of a control that has one.** Hover and focus darken the face with a neutral layer and lay `impulseGreen` over it; a press adds the same veil a second time, so what a pressed button shows is the sum of the two. A control that carries a pane colours its edge `impulseGreen` as well; a control without one — the bare button, the check box — has the veil as the only thing giving it a shape under the pointer, and grows no line. The veil lies over whatever the control's background is, an opaque `highlight` colour included, so a red button under the pointer is a red button with a green cast rather than a green button. The whole construction: `documentation/design/controls.md`.

**Off a control, the colour is a glow under a thumbnail that lifts.** A thumbnail of the image viewer's preview strip rises under the pointer and with the keyboard focus, and the glow beneath it is `impulseGreen` over a neutral shadow. It does there what the veil's green layer does on a control: it names the movement as an interaction. A clickable `Section` does not lift: it is drawn like the filled button and takes a control's veil and edge (ADR `general-clickable-section-is-drawn-like-a-filled-button.md`).

**Selected text is no interaction and takes no green**: the highlight behind the characters a user has selected in a field is the neutral `controls.color.textSelection`, the one value left of the neutral ladder the controls climbed before the veil.

## Where the ladder is already realized

- **The error status of the input controls** — the edge of a field with an invalid entry is drawn in `attentionHigh` (`src/assets/styles/inputControl/_index.scss`, the rule for `.error`); the value keeps its own colour. A changed entry gets no colour: it is no status of the control (ADR `general-changed-value-is-no-control-status.md`).
- **The active and the waiting button** — a button whose status is "switched on" (`ACTIVE`) or "working on it" (`BUSY`) shares the branch of `highlight: 'attention'` in `src/components/controls/button/button.scss`: both are notable and uncritical, exactly level 2 of the ladder. What separates the two is not a colour but motion — a light band travels across the waiting one.
- **The switch that is on** — its pane fills with `attention` (`src/components/controls/switch/switch.scss`, `$fillOn`): a setting is switched on, level 2 of the ladder, and the same colour the `ACTIVE` button carries for the same statement. `calmingGreen`, the first candidate, has no place in the three vocabularies and was dropped for that reason.
