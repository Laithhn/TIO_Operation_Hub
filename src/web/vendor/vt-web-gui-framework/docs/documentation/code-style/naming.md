# Naming

## `state` is the store's word and React's; every other condition is a `status`

`state` names two things and nothing else: the Redux store's state — a slice's `state` argument, `useSelector((state) => …)`, a reducer's `state` and the `*State` types behind them — and React's own state, `useState` and what `react.md` says about deriving it. Every other condition is a **`status`**, in identifiers, comments and docs alike: the `status` prop of a control and its enum (`SwitchStatus.DISABLED`), the interaction statuses `FOCUS`, `HOVER` and `PRESSED` a control determines itself, the status a WebSocket server is in (`selectServerStatus`), the visibility status of a fade (`useFadeInOut`). A reader who meets `state` may take it for the store's without looking further; the second word is what keeps that reading safe.

The base design's stylesheets follow it in their slots — `--statusVeil`, `--statusPress`, `--statusEaseMs` — and the design doc speaks of a control's two axes of status, the `status` prop and the interaction statuses (`documentation/design/controls.md`).

Two phrases keep the word because they are not a condition of anything in the repo: "the realized current state" of the `docs-structure` rule and "state of <date>" in a source citation.

## A prop instructs in the active present, a status reports in the passive

A prop is what the call site asks of a component — what it should do, or how it should be — so a prop that is a verb stands in the **active present**: `disable`, `resetTable`, `selectByWheel`, `deleteButton`. A **status reports what is set**, whether it is the store's state or a field of the data a consumer hands over, so it stands in the **passive present** with `is` marking it: `isDisabled`. The grammar tells a reader which side of the boundary the value is on before they look at its type.

The framework is uniform on it. All 27 `disable*` props read as instructions, and `isDisabled` occurs in data alone — the `options` entries of `SelectBox` and `MultiSelectBox` and the `menu` types behind them. `option.types.ts` maps the one onto the other in a single line, which is the rule in miniature: the consumer states in its data that an option **is disabled**, and the option component is told to **disable** itself.

```ts
readonly disable: NonNullable<SelectBoxProps<ValueType>['options']>[number]['isDisabled'];
```

The rule reaches verbs. A prop that is a noun or an adjective carries no tense to choose and stays as it reads — `darkTheme`, `backgroundMarker`, `holdable`, `large`, `bare`. What it rules out is the passive participle of a verb as a prop name, which is why v3's `disabled` became `disable` on every port.

Two places do not follow it yet: the dataTable's data fields `disabled` (`dataTable.types.ts`, `columnGroupSection.types.ts`) are statuses missing the `is`, and the tab bar's injected prop `selected` is a passive participle. The why, and what the injected props leave open: ADR `general-prop-names-instruct-in-the-active-present.md`.
