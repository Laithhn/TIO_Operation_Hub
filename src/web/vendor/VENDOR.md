# Vendored VITRONIC frontend framework

The hub frontend is built on the organization's own GUI framework, vendored here as source. Owner decisions on 27 Oct 2026:

- vendor the framework and adopt its tokens and density in full;
- upgrade to **4.0.0-rc.5** the same day;
- use the framework DataTable for every data table.

| Package | Version | Supplied as | SHA-256 of the zip |
|---|---|---|---|
| VtWebGuiFramework | **4.0.0-rc.5** (master@509b7944092, a release candidate) | `vtwebguiframework-master@509b7944092.zip` (8.7 MB) | `823F3B496CF06076447C5CE654039A2476760FE47CD3D0CBC6F941E1A38725AA` |
| VtWebGuiIcons | 2.4.0 | `VtWebGuiIcons2.4.0.zip` (3 MB) | `86E4A3BBC0C16AC390476D211DC4B0B92DFCD0953B6E1D1027C56719D1F26AC5` |

The framework's `settings.js` asks for VtWebGuiIcons **4.0.\***, which was not supplied. Every icon name the v4 components use exists in 2.4.0, and the icon API (`getIconPath`, `iconExists`, `viewbox`) is unchanged. Replace the icons package when 4.0 is available.

Re-vendor the final 4.0.0 when it is released.

Licence: both packages are marked `private`, `ISC`, author VITRONIC GmbH. They are internal organizational code. `vt-web-gui-framework/licenses/` holds the third-party notices shipped with the framework.

Earlier versions: 3.6.1 was vendored on 27 Oct 2026 (git history `a45ab27`) and replaced by 4.0.0-rc.5 in `9705e46`.

## What is included

| Folder | Content |
|---|---|
| `vt-web-gui-framework/src/` | The framework's `src`: `components`, `assets` (Sass tokens, fonts, logo), `app` (frame modules: header, first sidebar, footer and others), `store` (Redux slices), `utils`, `interfaces`, `desktopApp`, and `index.scss` (global sheet) |
| `vt-web-gui-framework/i18n/*.en.xml` | The English language tables (common, date/time). They are merged into `src/web/public/vt-i18n/en.xml`. |
| `vt-web-gui-framework/docs/` | The framework's `documentation/` and `decisions/` (ADRs), for reference. The consumer guide is `docs/documentation/consuming/using-the-framework.md`. |
| `vt-web-gui-icons/src` | `icons.json` (366 icons), `index.js`, `hooks/useIconsAsync.js` |
| `UPSTREAM-*` | The upstream manifests and readme, kept for reference only |

## What is not included

- `src/contents` (the demo contents) and `src/oldFrame` (the v3 legacy frame).
- The entry files `src/index.tsx` and `index.ejs`; the hub has its own entry.
- `proj/` (the demo project), `static/` (apart from the English language tables), webpack, Electron, ESLint, Jest and build tooling, `templates/`, `tests/`, `dev/`.
- The repository's `CLAUDE.md` and `.claude/` rules. They govern development of the framework itself, not projects built on it.

Nothing from the packages was installed or executed.

## Modifications

**None.** The vendored files are byte-identical to the zip. What the framework's webpack setup provides is reproduced outside this folder.

| Framework expectation (webpack) | Hub replacement |
|---|---|
| `src` on webpack's module path (`app/`, `assets/`, `components/`, `store/`, `utils/`, `interfaces/`, `desktopApp`); alias `VtWebGuiIcons` | `vt-framework.ts`: a `resolveId` hook limited to vendored importers; the hub uses `@vt/…` |
| SCSS imported as CSS modules with named exports (`import * as css`) | The plugin adds a `.module.scss` query; `css.modules.generateScopedName` keeps the `[name]__[local]__[hash]` naming; `src/index.scss` stays global |
| Sass `@use "assets/styles"` | Vite Sass `loadPaths` = the framework's `src` |
| `DefinePlugin` `process.env['X']` | The plugin's transform replaces `ELEM_ID_TEMP` (`#viTemporaries` in `index.html`), `URL_I18N` (`/vt-i18n`) and others |
| `@svgr/webpack` | The plugin's `load` hook returns a React component for vendored `.svg` files |
| Entry `src/index.tsx`: `config.xml`, store, i18n | `src/web/src/vt/store.ts` configures the framework store from a minimal configuration element (English, local storage); `main.tsx` waits for it and provides it through react-redux |
| React 19, react-router 8, @reduxjs/toolkit, react-redux | Hub dependencies (exact versions, at least 14 days old, as the framework requires) |
| TypeScript 6 type-checking of the framework | Not done. The hub's TypeScript 5.9 does not type-check the vendored tree; `src/vt/framework.d.ts` declares the names the hub imports. |

## Updating

1. Extract the new zip into an empty folder and inspect it.
2. Replace the folders listed above.
3. Record the version and hash here.
4. Run `npm run build` and the Playwright suite.

Breaking changes usually show in:

- `assets/styles` keys (the hub's SCSS uses them through `@use "assets/styles" as vt`);
- the frame module class names (`src/vt/frame.tsx`, `src/styles/frame.scss`);
- the DataTable API (`src/ui/kit.tsx`).
