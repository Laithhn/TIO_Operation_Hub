---
decided: 2026-08-13
---

# Render conditionally with `&&` and disable `jsx-no-leaked-render` per line

## Context and Problem Statement

React renders a falsy left-hand side of `&&` when it is not a boolean — `{items.length && <List />}` puts a bare `0` on the screen. `react/jsx-no-leaked-render` guards against that, and the repo runs it with `validStrategies: ['coerce', 'ternary']` (`eslint.config.js:235`), which permits `!!cond && <X />` and `cond ? <X /> : null` but rejects the plain `&&`.

The v4 code writes the plain `&&` anyway and silences the rule line by line — 66 places in `.ts`/`.tsx` as of 2026-08-13. Reviewing the freshly ported dataTable content raised the question of which form is actually the convention: the ported code had arrived with the v3 source's ternaries, so the two forms stood side by side in one file.

## Considered Options

- Follow the rule's `ternary` strategy: `cond ? <X /> : null`
- Follow the rule's `coerce` strategy: `!!cond && <X />`
- Write the plain `&&` and disable the rule per line
- Turn `react/jsx-no-leaked-render` off

## Decision Outcome

Chosen: **the plain `&&` with a per-line disable comment**, carrying a ToDo and the URL of the upstream issue:

```tsx
{showSettings && ( // eslint-disable-line react/jsx-no-leaked-render -- ToDo: remove if this is fixed: https://github.com/jsx-eslint/eslint-plugin-react/issues/3908
```

`&&` says "render this if" in one token. The ternary adds a `: null` branch that carries no meaning, and in JSX it is expensive: `@stylistic/multiline-ternary` (`always-multiline`) and `react/jsx-wrap-multilines` push the element an indentation level deeper and spend two structural lines per branch on `? (` and `: null}`. Converting the two ternaries in the ported dataTable content to `&&` accordingly saved two lines and one level of nesting each.

The `coerce` form is noise in typed code. `!!cond` coerces something the type system already guarantees to be boolean — and that the rule cannot tell the difference is a known plugin defect, not a subtlety: [eslint-plugin-react#3908](https://github.com/jsx-eslint/eslint-plugin-react/issues/3908), open since 2025-03-21, reports exactly this, because the plugin reads no TypeScript type information. Tying the disable comments to that issue makes the decision reversible by a single grep once it is fixed.

Turning the rule off was rejected: it would drop the guard for the case that actually bites — a `number` or `string` left-hand side. Keeping the rule on and stepping over it per line keeps that guard, and makes every exception a deliberate, visible act rather than a blanket permission.

## Consequences

- Good: one form of conditional rendering across `src/` and `proj/contents`, and the genuinely dangerous coercions still get flagged.
- Good: all 66 exceptions carry the same comment and the same URL, so they are found and removed in one sweep when the upstream bug is closed.
- Bad: every new conditional render needs the comment appended by hand — forgetting it is a lint error, so it surfaces immediately, but it is manual.
- Bad: the disable comment cannot be broken across lines, so its line exceeds the repo's 100-character convention.

The resulting convention, together with prop order and line breaking: [documentation/code-style/jsx.md](../documentation/code-style/jsx.md).
