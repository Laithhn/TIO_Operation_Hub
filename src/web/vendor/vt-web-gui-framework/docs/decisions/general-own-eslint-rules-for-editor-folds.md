---
decided: 2026-09-15
jira: PDWG-115
---

# Enforce the editor-fold conventions with the repo's own ESLint rules

## Context and Problem Statement

Two conventions govern the fold-marked sections of a React component: the blank lines around a marker block with the column its lines end at, and the set of sections a component carries. Neither was written down before 2026-09-15, and no published ESLint rule covers either — `@stylistic/lines-around-comment` only demands *a* blank line, never a count, and nothing at all knows about the sections.

The code had held the conventions almost by hand alone: a sweep over 1034 fold blocks found eleven deviations, among them a closing marker that had slipped behind a `useState` call in `TablePreparer.tsx` and left the component's last section unclosed. Fixing them by hand raised the question of how the next eleven are to be caught, since the deviations arise while typing and a sweep only runs when somebody remembers it.

## Considered Options

- Leave it at the convention in `documentation/code-style/`
- Keep the check as a script in `docs/VtWebGuiFramework/tmp/`, run on demand
- Version that script and wire it into an npm script
- A Claude Code slash command wrapping the script
- The repo's own ESLint rules in `eslint.config.js`

## Decision Outcome

Chosen: **two own rules in a local plugin**, `dev/eslintRules/`, registered as `pluginVtWebGui` for `.ts`/`.tsx`:

- `editor-fold-format` — the blank lines around a block and the 100-character line, both auto-fixable.
- `editor-fold-sections` — the sections of a component and their order, reported without a fix.

A deviation shows up in the IDE while the code is written, which is where it is cheapest to correct, and `--fix` settles the mechanical half without anyone counting blank lines. Nothing new has to be remembered or installed: the check rides along in the lint run that happens before a commit anyway.

The script in `tmp/` was the starting point and is not a place to keep anything — the folder is git-ignored, so the check would not survive a clone. Versioning it and giving it an npm script would fix that but keeps a second tool with a second habit: it reports after the fact, in a run somebody has to start. A slash command would add a third layer around that same script and bind the check to working with Claude.

**A component rendering an `<article>` is exempt from the section rule.** Such a component is an article written as JSX, and dividing four lines of prose into six sections serves nobody. The rule detects it by the `<article>` element itself, which needs no marker in the code and no list to maintain.

**The blank lines around a function stay convention only.** "Function" takes too many forms in this code — a declaration, an arrow function in a `const`, a hook call carrying a callback — for a rule to draw the line without misfiring, and a rule that flags correct code costs more than the convention it guards.

## Consequences

- Good: a deviation surfaces at the keystroke, and `--fix` repairs the format half.
- Good: the section rule found three components missing sections and five contents carrying none, which no sweep had looked for before. All of them were retrofitted, except the two article components the exemption now covers.
- Bad: two rules to maintain against ESLint's rule API, with no test infrastructure behind them — `npm run test:jest` is parked (ADR [general-jest-electron-deferred.md](general-jest-electron-deferred.md)). They were verified against the whole code base and a file written with deliberate defects.
- Bad: the rules bind `.ts`/`.tsx` only. The contents written in JavaScript on purpose (`proj/contents/examples/login/**`) are not covered, because switching the rules on for `.jsx` would light up the unported v3 code.
- Bad: the plugin travels with the framework. `applySettings.js` copies `eslint.config.js` into a consuming project, and that config imports `./dev/eslintRules/index.js`, so the three rule files are copied beside it (`applySettings.js:280`). A file added to the plugin has to be entered in that list, or the project's lint run fails to load its config.

The conventions themselves: [documentation/code-style/component-sections.md](../documentation/code-style/component-sections.md) and [documentation/code-style/blank-lines.md](../documentation/code-style/blank-lines.md).
