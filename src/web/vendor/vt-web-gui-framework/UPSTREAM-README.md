# VtWebGuiFramework

VITRONIC's React/TypeScript GUI framework for web and desktop apps, consumed by other VITRONIC projects. This is `4.0.0-rc.5`: the v3 → v4 rewrite is under way, so the tree carries ported and unported code side by side. The file extension tells them apart — `.ts`/`.tsx` is v4, `.js`/`.jsx` is v3 awaiting its port.

## Quick start

Node.js `24.21.0` is fixed for this version, and VtWebGuiIcons is expected at `4.0.*`; both are pinned in `settings.js` under `settings.packages`.

| Command | Purpose |
|---|---|
| `npm run devServer:web` | start the dev server |
| `npm run build:web-dist-dev` | development build |
| `npm run build:web-dist-prod` | production build |
| `npm run applySettings` | regenerate the generated files from `settings.js` — required after editing `tsconfig.base.json` |

With the dev server running, the framework demonstrates itself: the demo app's **For developers** section (`proj/contents/forDevelopers/`) walks through setting up a project on top of the framework, and **Overview** lists what each release brought.

## Documentation

- [docs/VtWebGuiFramework/](docs/VtWebGuiFramework/) — the documentation corpus: decision records in `decisions/`, the realized current state in `documentation/`, in-flight planning in `concepts/`. Consult `decisions/` before proposing a toolchain change — ESLint, TypeScript, and the Webpack cache each stay where they are for a recorded reason.
- [Release checklist](docs/VtWebGuiFramework/documentation/operations/release-checklist.md) — the procedure for producing a release. Branch types, tags, and the commit format: [`.claude/rules/_local/git.md`](.claude/rules/_local/git.md).
- [CLAUDE.md](CLAUDE.md) — the conventions Claude Code works by here, and a fast orientation for a human joining the code.

## Who to ask

| Category | Topic | Ask | Reach |
|---|---|---|---|
| Framework | Public API, breaking changes for consuming projects | Marco Stolz | Teams |
| Framework | Control design and colour semantics | Marco Stolz | Teams |
| Release | Jenkins and build machine runs, release tags | Marco Stolz | Teams |
| Release | Demo project and documentation on the Chow server | Marco Stolz | Teams |
| Claude Code | Plugins, rules, skills, accounts | ViAiDevKit, the `Who to ask` section of its README | — |
