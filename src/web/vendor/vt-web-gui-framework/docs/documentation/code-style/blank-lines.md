# Blank lines

Where blank lines go in the v4 code (`.ts`/`.tsx`, and the contents written in JavaScript on purpose under `proj/contents/examples/login/**`). The half around an editor-fold block is enforced and fixed by the repo's own rule `pluginVtWebGui/editor-fold-format` (`dev/eslintRules/`); the half around a function is convention only. No published rule produces either: `@stylistic/lines-around-comment` is `off` and `@stylistic/no-multiple-empty-lines` only caps a run at two (`eslint.config.js:90`, `:96`). Two rules bound the convention from the outside, and each of them carves out a case below — `@stylistic/padded-blocks: 'never'` (`:102`) forbids a blank line right after an opening `{` and right before a closing `}`, `no-multiple-empty-lines` with `maxEOF: 0` forbids one at the end of a file. Legacy `.js`/`.jsx` is out of scope — ADR [general-legacy-v3-code-untouched.md](../../decisions/general-legacy-v3-code-untouched.md).

## Around a function

**At least one blank line before a function, always two after it.** Two functions in a row therefore have two between them, and the doc comment counts as part of the function it describes: the blank lines go above the comment, never between the comment and the `const`.

```ts
export const getTrimmedAttribute = (elem: Element, attr: string, defaultValue = '') => (
  (elem.getAttribute(attr) ?? defaultValue).trim()
);


/**
 * Function to convert and return the value of a given attribute of a given element into a trimmed
 * string in lower cases.
 */
export const getAttributeInLowerCase = (elem: Element, attr: string, defaultValue = ''): string => (
  getTrimmedAttribute(elem, attr, defaultValue).toLowerCase()
);
```

It holds for every form a function takes — a declaration, an arrow function in a `const`, and a hook call that carries one, which is what the handlers of a component are: the `useImperativeHandle` and the `useInteractions({ … })` of `CheckBox.tsx` are separated by two blank lines like any other pair.

The two bounds above are the exceptions. A function that opens a block gets no blank line before it, and the last function in a file is followed by the newline ending its last line and nothing else.

## Around an editor-fold section header

A React component divides its body into sections, each enclosed in IntelliJ fold markers — which sections, and which components carry them: [component-sections.md](component-sections.md). Between two sections the markers meet and form one comment block: the closing `//   </editor-fold>` of the section above, the opening `// ---<editor-fold desc="…">` of the one below, its title line and its rule.

**Two blank lines before that comment block, one after it.** Every line of the block but its title ends at **column 100** — the opening marker, the two rules and the closing marker alike, whatever the indentation: what the indentation takes, the dashes or the spaces before the marker give back.

```tsx
  const checkBoxElemRef = useRef<HTMLSpanElement>(null);


  //                                                                                  </editor-fold>
  // -----------------------------------------------------------<editor-fold desc="Local Variables">
  // Local Variables
  // -----------------------------------------------------------------------------------------------

  const { outerElemStyle } = useStylingProps(restProps, checkBoxStylingProps);
```

Three places carry fewer:

- **The first header**, which sits directly under the component's opening `{` — `padded-blocks` forbids the blank line there.
- **The last `</editor-fold>`**, which stands directly above the `};` closing the component or hook, with no blank line after it and none before it.
- **An empty section**, where the header's one line after and the next block's two lines before fall into the same gap. Two win, so an untouched `Helper Functions` section is two blank lines wide — and so is an empty last one, which is the one case where the closing marker above does carry blank lines before it (`useCellMeasurer.ts`).

The code follows this throughout; the handful of places that deviate are oversights rather than a second convention.
