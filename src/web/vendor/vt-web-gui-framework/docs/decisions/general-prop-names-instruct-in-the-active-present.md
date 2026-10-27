---
decided: 2026-09-08
---

# A prop instructs in the active present, a status reports in the passive

## Context and Problem Statement

The tab bar port renamed v3's `disabled` to `disable`, and the port left the question open whether that rename was right. Three names were in use for one meaning, and each had something behind it: HTML's attribute and React's DOM prop are `disabled`, v3's tab bar carried that name, and the v4 framework had already settled on `disable` in 27 props without ever writing down why. A consumer reading `disable` next to `isDisabled` in the same select box had no rule that told them which word belongs where.

## Considered Options

- **`disabled`** — HTML's attribute, React's DOM prop, and v3's name. Familiar, and the one a consumer coming from the DOM would guess.
- **`isDisabled`** — the passive present with the `is` prefix that marks a boolean.
- **`disable`** — the active present.

## Decision Outcome

Chosen: **`disable`, and the reason generalizes to a rule.**

A prop is what the call site asks of the component: what it should do, or how it should be. That is an **instruction**, so it takes the **active present** — `disable`, `resetTable`, `selectByWheel`, `deleteButton`. A **status reports what is set** — the Redux store's state, a field of a data record the consumer hands over — so it takes the **passive present**, and `is` marks it: `isDisabled`. The name then says which side of the boundary the value is on before the reader looks at its type.

The framework already ran this way without stating it, which is why the rule is a description and not a change: 27 props under `src/` read `disable`, `disableIncrement`, `disableToggleButton` and the like, while `isDisabled` occurs in **data alone** — the `options` entries of `SelectBox` and `MultiSelectBox`, and the `menu` types behind them. One line maps the one onto the other and is the rule in miniature, `option.types.ts:7`:

```ts
readonly disable: NonNullable<SelectBoxProps<ValueType>['options']>[number]['isDisabled'];
```

The consumer states in its data that an option **is disabled**; the option component is told to **disable** itself.

**The rule reaches verbs.** A prop that is a noun or an adjective carries no tense to choose — `darkTheme`, `backgroundMarker`, `holdable`, `large`, `bare` — and stays as it reads. What the rule forbids is the passive participle of a verb as a prop name.

It sits beside the rule `documentation/code-style/naming.md` already carries and answers a different question: that one fixes the **word** for a condition (`state` for the store and React, `status` everywhere else), this one fixes the **grammatical form** of a name by what the name is for.

## Consequences

- Good: a reader tells a prop from a status by its grammar, with no lookup.
- Good: it pairs with the `state`/`status` split, so the two naming rules answer two different questions and never overlap.
- Bad: it departs from HTML and React, where the prop is `disabled`. A consumer porting DOM markup has to learn one word, and the framework's own `.types.ts` is where they learn it.
- Bad: two data fields in the dataTable read `disabled` without the `is` that marks a status — `dataTable.types.ts:62` (a cell record's field) and `columnGroupSection.types.ts:16` (a `columns` entry's field). Both are data and neither is a prop, so the active form would be wrong for them; they are simply missing the prefix.
- Bad: the tab bar's injected prop `selected` is a passive participle. It reports what the bar worked out rather than instructing the tab, which is what the injected props are — the bar's own findings handed down. Whether an injected prop counts as an instruction or as a status is not settled by this record.
