# Component sections

A React component divides its body into named sections, each one enclosed in IntelliJ fold markers, so that a component of any length is read section by section and folds down to its outline. The blank lines around the markers and the column their lines end at: [blank-lines.md](blank-lines.md).

## The sections and their order

| Section | Holds |
|---|---|
| `States` | `useState`, `useRef`, `useReducer` and the other hooks holding the component's own values |
| `Local Variables` | values derived in the render body, including the styling props and everything computed from props and state |
| `Helper Functions` | the component's own functions that are not handlers |
| `Event Handlers` | the handlers and `useImperativeHandle` |
| `Effects` | `useEffect` and `useLayoutEffect` |
| `Render` | the `return` with the JSX |

The order is fixed, and **every component carries all six sections**, empty where it has nothing to put in one. An empty section tells the next reader that there is nothing; a missing one leaves them checking whether it was forgotten. That is also what the outline answers at a glance — whether the component holds state, and which. There is one shape, not two: ADR [general-all-fold-sections-mandatory.md](../../decisions/general-all-fold-sections-mandatory.md).

`App.tsx` is the one component splitting its effects into `Effect 1`, `Effect 2` and `Effect 3`. A numbered run counts as the `Effects` section.

A hook closes with `Return` instead of `Render` (`useCellMeasurer.ts`, `useDateTime.ts`). Hooks are otherwise free of the scheme.

## Which components carry them

**Every component written with a block body**, whatever its size — `InnerDynamicHook`, whose body is two statements, as much as `TablePreparer` with its thousand lines.

Two kinds of component carry none:

- **One that returns its JSX directly.** `Separator`, `Marker` and `Options` are written as `const Separator = (props) => (<span … />)`, and a block body there would hold nothing but the `return`, which `arrow-body-style` rejects. The sections and that rule cannot both be satisfied, so the expression form wins.
- **One that renders an `<article>`.** Those components are an article written as JSX — `De.tsx` and `En.tsx` of the start content are a heading and a definition list — and there is nothing in them to divide into states, handlers and effects.

## Machine-enforced

`pluginVtWebGui/editor-fold-sections` (`dev/eslintRules/editorFoldSections.js`) reports a missing section and one out of order. It takes a function as a component when it is declared at the top level of a `.ts`/`.tsx` file under a PascalCase name, carries a block body, and renders JSX or returns `null` — and it passes over one whose body holds an `<article>`. Rationale for the rule rather than a script: ADR [general-own-eslint-rules-for-editor-folds.md](../../decisions/general-own-eslint-rules-for-editor-folds.md).

## Example

```tsx
const CheckBox = ({ … }: CheckBoxProps) => {
  // --------------------------------------------------------------------<editor-fold desc="States">
  // States
  // -----------------------------------------------------------------------------------------------

  const checkBoxElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, checkBoxStylingProps);

  …

  //                                                                                  </editor-fold>
  // --------------------------------------------------------------------<editor-fold desc="Render">
  // Render
  // -----------------------------------------------------------------------------------------------

  return (
    <span …>…</span>
  );
  //                                                                                  </editor-fold>
};
```
