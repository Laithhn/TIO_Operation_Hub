# JSX authoring conventions

How JSX is written in the v4 code (`.ts`/`.tsx`). ESLint enforces the mechanical half of it; the semantic half no rule can see is what this document adds. Legacy `.js`/`.jsx` is out of scope — ADR [general-legacy-v3-code-untouched.md](../../decisions/general-legacy-v3-code-untouched.md).

## Conditional rendering

**Whether a component renders at all is written with `&&`** — never as a ternary against `null`:

```tsx
{showSettings && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
  <Card …>…</Card>
)}
```

`react/jsx-no-leaked-render` runs with `validStrategies: ['coerce', 'ternary']` (`eslint.config.js:235`) and therefore rejects exactly this form, so every such line carries the disable comment above — verbatim, including the ToDo and the issue URL. The comment is a placeholder for an upstream bug and goes away with it, not before: [eslint-plugin-react#3908](https://github.com/jsx-eslint/eslint-plugin-react/issues/3908) (open since 2025-03-21) makes the `coerce` strategy fire on values that are already boolean, because the plugin reads no TypeScript types. Why the repo pays that price: ADR [general-jsx-conditional-rendering-with-and.md](../../decisions/general-jsx-conditional-rendering-with-and.md).

**Three shapes of condition carry no comment.** The `coerce` strategy asks for the syntax of the left side, not for its type, and it accepts three node types — `COERCE_VALID_LEFT_SIDE_EXPRESSIONS` in [the rule's source](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/lib/rules/jsx-no-leaked-render.js). The rule then stays silent, and a disable comment there is an unused directive, which ESLint reports as a warning of its own:

- **a negation** — `{!isOpen && …}`, and `{!!value && …}` with it;
- **a comparison** — `{(status !== ButtonStatus.IDLE) && …}`, `{(count > 0) && …}`, and every other `===`, `!==`, `<`, `>`, `instanceof` or `in`;
- **a function call** — `{Boolean(value) && …}`, and **every other call as well**, whatever it returns. `{items.find(…) && …}` passes the rule while leaking exactly what the rule exists to catch, so write such a condition as `!!items.find(…)`; the rule will not tell you.

**In a condition of several operands, every one of them has to be one of the three.** The strategy takes a `&&` chain as coerced only when it finds no operand that could be a non-boolean. `{(!a && !b) && …}` and `{(a !== b && !c) && …}` therefore need no comment, while `{(a && !b) && …}` and `{(!a && b) && …}` both still carry one — one coerced operand in the chain is not enough.

**A bare identifier always reports, whatever its type.** A prop, a state, and a derived `const isPositioned = (type === 'overlaid')` all need the comment, because the plugin reads no TypeScript types and sees nothing but a name. Its one exception is a variable whose declaration initializes it with a boolean *literal* — `const isOpen = true` — which the rule looks up and lets pass.

**A ternary stays where the condition picks between two renderings** — that is not *whether*, it is *which*, and the rule is satisfied by it anyway, so no disable comment is needed.

## Prop order

Three groups, in this order:

1. **Reserved props** — `key`, `ref` (plus `children` and `dangerouslySetInnerHTML` on the rare occasion they are written as props). Machine-enforced by `react/jsx-sort-props` with `reservedFirst: true` (`eslint.config.js:239`).
2. **Styling props**, in the declaration order of `StylingPropCollection` (`src/components/hooks/useStylingProps/useStylingProps.types.ts:4`). That type is the single source of the order — it is never copied into a list elsewhere.
3. **The component's own props**, in the declaration order of its prop type (`<component>.types.ts`).

Nothing is sorted alphabetically anywhere (`noSortAlphabetically: true`) — the order carries meaning, not spelling.

- **`id` is an own prop, not a reserved one.** It follows the styling props and leads group 3, because the prop types declare it first (right after `ref`).
- **Callbacks come last**, enforced by `callbacksLast: true`. That never competes with group 3: every prop type under `src/components` declares its callbacks at the end, so following the type already produces it.
- **A name shared with a styling prop does not make a prop one.** Each component picks the styling props it accepts into its own `<component>StylingProps` list, and only what is in that list belongs in group 2. `DataTable` is the case in point: its `columnGap` is absent from `dataTableStylingProps` and declared as an own prop (`src/components/layouts/dataTable/dataTable.types.ts`) — it spaces the table's columns, not a CSS grid — so it sits in group 3, in the type's order.
- **A conditional spread is placed by its first prop.** `{...(showRange && { dateTimeObj2, onChange2 })}` sets two props that the type declares apart from each other, and one spread cannot stand in two places — so it goes where the first of them belongs and stays intact, rather than being split into one spread per prop. `Calendar.tsx` is the case in point: the spread precedes `onChange`, because `dateTimeObj2` does.
- **The prop types themselves read in a different order** — they declare `ref`, `id`, the own props, and intersect the styling props at the very end (`ToolbarProps`, `src/components/layouts/toolbar/toolbar.types.ts:41`). Only group 3 takes its order from the type; groups 1 and 2 do not.

## Line breaking

The **number of props** decides, not the length of the line:

- **Three props or fewer** → the element stays on one line — **unless a value is prose**, a sentence written for the reader rather than an identifier, an expression or a type. Then it breaks like any longer element: `ErrorScreen`, whose `title`, `subTitle` and `message` are full sentences, would otherwise run to 215 characters on one line.
- **Four or more** → one prop per line, the closing bracket aligned with the opening line. Machine-enforced once the element is multiline, by `react/jsx-first-prop-new-line`, `react/jsx-max-props-per-line` and `react/jsx-closing-bracket-location` (`eslint.config.js:218`, `:221`, `:226`); the threshold itself no rule can see.
- **An arrow function with a body breaks the element whatever the count.** A call that returns nothing cannot stand as the shorthand body (`@typescript-eslint/no-confusing-void-expression`), and `@stylistic/brace-style` puts the statement inside the braces on a line of its own. The element is multiline then, and the three rules above give each prop its own line: `onClick={() => {`, `step(1);`, `}}`.

A count, not a width, because it keeps the decision independent of how long a single value happens to be — `<MainSection noPaddingStart noPaddingEnd noPaddingTop noPaddingBottom>` and a `<Toolbar>` carrying one `translateText(…)` call both break, and neither reading needs a character count. A long *expression* or type cast is therefore no reason to break: `<DataCell {...cellData as ReturnType<typeof cellIterator> & { content: string | number | null }} key={cellId} {...commonCellData} />` stays on its line at 144 characters. Prose is the exception because it is the one kind of value a reader parses word by word.

What the element encloses plays no part: a long text child, a URL or a German sentence stays on its line — `<Text type="hint">…</Text>` has one prop and stays a one-liner however much prose follows it. The exception above is about a prop *value*, not about children.

The repo's 100-character convention therefore governs only comments in code files. It has no rule behind it either: the resolved ESLint config carries no `max-len`, and there is neither an `.editorconfig` nor Prettier. Markdown prose is never hard-wrapped at all. The one comment that cannot obey it is `// eslint-disable-line`, which cannot be broken across lines.

## Accessibility lint and spread attributes

**`jsx-a11y/control-has-associated-label` takes an element with a spread attribute as labelled.** It cannot see what the spread sets, and it assumes a label among it. A clean lint run therefore says nothing about such an element: the `<span role="button">` of `Button` carries `{...interactionProps}`, and a `Button` with an icon and no text has no accessible name all the same. Only an element written with plain attributes is checked in full. *Source: eslint-plugin-jsx-a11y 6.10.2 — `lib/util/mayHaveAccessibleLabel.js`, checked 2026-10-02.*

## Example

```tsx
<Toolbar
  alignItems="center"
  padding="xs"
  backgroundColor="offWhite"
  title="Fahrzeugdaten"
>
  <ToolbarContrItem columnGap="normal" justifySelf="end">
    <Button ref={settingsButtonRef} icon="PARAMETERH" onClick={handleShowCard} />
    {showSettings && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
      <Card
        padding="normal"
        rowGap="large"
        width={350}
        anchorElemRef={settingsButtonRef}
        onClickBeside={handleCloseAllCards}
        onPressEscape={handleCloseAllCards}
      >
        <Text type="hint">Die Einstellungen wirken sofort und werden lokal gespeichert.</Text>
      </Card>
    )}
  </ToolbarContrItem>
</Toolbar>
```

`ToolbarContrItem`, `Button` and `Text` carry two, three and one prop and stay on one line; `Toolbar` and `Card` carry four and six and break. Everywhere `ref` comes first, the styling props (`alignItems`, `padding`, `backgroundColor`, `rowGap`, `columnGap`, `justifySelf`) precede the own ones (`title`, `icon`, `width`, `anchorElemRef`, `type`), and the callbacks close the list.
