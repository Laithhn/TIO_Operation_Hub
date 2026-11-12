---
decided: 2026-09-29
jira: PDWG-79
---

# The implemented VtWebSocketSpec version stands in settings.js

## Context and Problem Statement

The VtWebSocket interface follows VtWebSocketSpec, a specification in a repository of its own that states its version in its head. Nothing in the framework said which version a framework version implements, so a project could not tell whether its server and its framework follow the same one. The framework already records versions that npm and `package.json` do not manage: `settings.packages` lists them, marked "DO NOT MODIFY". Apart from Node.js they are the company's own packages, which lie on the build machine server and are pulled in by the build. A consuming project needs them as well, and some of them are optional. A project copies `settings.js` out of the framework version it builds on.

## Considered Options

- An entry `packages.vtWebSocketSpec` in `settings.js`
- An exported constant in the code, beside the implementation of the interface

## Decision Outcome

Chosen: **an entry `packages.vtWebSocketSpec` in `settings.js`**, directly after `vtWebGuiIcons`. The VtWebSocketSpec version is one more version outside npm that comes with a framework version, so a project finds it beside the others, and its copy of `settings.js` carries it without an import. A constant in the code would stand apart from those versions, and a project would have to know the import to find it.

The entry differs from its neighbours in one point: VtWebSocketSpec is no package, and the build pulls nothing in for it. The entry's comment states that difference — it is a specification and not a dependency, and nothing is installed, loaded or checked for it.

The entry has to be found by whoever changes the interface and by whoever builds on it, a coding assistant included. `CLAUDE.md` names it for work on the framework, and `consuming/using-the-framework.md` for a project built on it.

## Consequences

- Good: every version outside npm that a framework version comes with stands in one list, and a project's copy of `settings.js` shows them together.
- Bad: the value no longer stands beside the code that implements the specification. A change that makes that code follow a newer version has to raise an entry outside `src/`.
- Bad: the code cannot read the value. Nothing needs it today; a page that shows it would need Webpack to hand it over first, the way it hands over `VERSION_VIWGF`.
