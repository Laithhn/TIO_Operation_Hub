---
decided: 2026-09-11
jira: PDWG-101
---

# The hosting sub-path is resolved at build time, out of one derived value

## Context and Problem Statement

A project hosted below the DocumentRoot has to address everything it loads below that sub-path: the chunks, the assets, the startpage's icons, the configuration, the language files, and the routes React Router matches. The 3.x line solved it half in the framework and half in each project — one line in the framework consumed a `BASE_PATH` define that only the project's own copies of `webpack.config.js` and `settings.js` produced, in two files the framework re-delivers with every update. Framework 4 takes the whole derivation, which raises the question of where the sub-path is applied.

## Considered Options

- **At runtime, in `getUrlOfStaticSource`** — the one utility that already turns a path into a URL could prepend the sub-path for everybody.
- **At build time, in the Webpack configuration** — the sub-path reaches the application only through the values the build writes into it.
- **Both** — the build sets `output.publicPath`, the utility prefixes the rest.

## Decision Outcome

Chosen: **at build time**. Webpack has to know the sub-path anyway — `output.publicPath` is what a chunk request and an asset URL are built on, and no runtime utility can reach those. Applying it a second time at runtime would give one fact two sources, and the two would drift the moment a value takes a path the utility does not see. `getUrlOfStaticSource` therefore keeps doing what it did: it turns a path that starts with a slash into an absolute URL, and the path it is handed already carries the sub-path.

One derived value carries it, `subPath` — the sub-path **without** a trailing slash, and the **empty string** at the DocumentRoot. Every place that consumes it writes it in front of a path that already starts with a slash, so the DocumentRoot case produces character for character what the build produced before the setting existed; that is what makes the regression argument for every existing project a matter of reading the code rather than of diffing two builds. The two shapes the rest of the system wants are one expression away: Webpack's `publicPath` always ends with a slash, and the router's `basename` is `subPath || '/'`, spelled out rather than left to react-router's internal `basenameProp.replace(/^\/*/, "/")`, which would repair an empty string but is not part of its contract.

The setting exists for `targets.web` alone. The DevServer serves from its own root, and an Electron distribution addresses everything relative to its startpage — neither has a DocumentRoot to sit below, so a key there would only invite a value that does nothing.

## Consequences

- Good: a project sets one value instead of patching two framework-owned files, and a framework update no longer silently drops the patch.
- Good: the sub-path is a build constant, so nothing has to be resolved, cached or passed around at runtime.
- Bad: changing the sub-path needs a rebuild — the same distribution cannot be dropped under two different paths.
- Bad: the framework cannot enforce the web server's half of the deal. The SPA fallback that rewrites unknown paths below the sub-path to the startpage lives in the server configuration, and a missing one shows up only as a 404 on reload (`documentation/consuming/using-the-framework.md`).
