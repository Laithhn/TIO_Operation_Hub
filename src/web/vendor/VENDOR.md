# Vendored VITRONIC frontend framework

The hub frontend is built on the organization's own GUI framework, vendored here as source. Owner decision 27 Oct 2026: vendor the framework's JSX/SCSS components and adopt its tokens and density in full.

| Package | Version | Supplied as | SHA-256 of the zip |
|---|---|---|---|
| VtWebGuiFramework | 3.6.1 | `VtWebGuiFramework3.6.1.zip` (325 MB) | `3BBF9FAD839730E7DCE8CBD0D6D22DDB19E60AAFE8A9152227521CEADBC32993` |
| VtWebGuiIcons | 2.4.0 | `VtWebGuiIcons2.4.0.zip` (3 MB) | `86E4A3BBC0C16AC390476D211DC4B0B92DFCD0953B6E1D1027C56719D1F26AC5` |

Licence: both packages are marked `private`, `ISC`, author VITRONIC GmbH. They are internal organizational code. `vt-web-gui-framework/licenses/` holds the third-party notice shipped with the framework (ansi-parser).

## What is included

| Folder | Content |
|---|---|
| `vt-web-gui-framework/src/components` | All components: controls, helpers, hooks, indicators, layouts and popups |
| `vt-web-gui-framework/src/assets` | Design tokens (`defines/index.js`), enums, global stylesheet, fonts (Open Sans, Noto Sans Arabic, Source Code Pro), images (official VITRONIC logo) and app icons |
| `vt-web-gui-framework/src/utils`, `src/desktopApp` | Helpers that the components import |
| `vt-web-gui-framework/src/frame` | The framework frame: header, sidebars, footer and modwins. Only its stylesheets are used; the hub renders the same DOM in `src/vt/frame.tsx`, because the frame's JSX reads menus from the framework's Redux store and config.xml. |
| `vt-web-gui-framework/src/store/i18n/helpers.js`, `languagePresets.json` | The framework's i18n helpers (`translateText`, `translateDate`) |
| `vt-web-gui-framework/i18n/*.en.xml` | The English framework language tables: date/time and common |
| `vt-web-gui-icons/src` | `icons.json` (366 icons, 24×24), `index.js` and `hooks/useIconsAsync.js` |
| `UPSTREAM-*.json` / `UPSTREAM-README.md` | The upstream package manifests and readme, kept for reference only (renamed so that npm ignores them) |

## What is not included

- The rest of the framework store (Redux slices, config.xml loading, WebSockets and SNMP).
- `contents`, `index.js`, the webpack, Electron and build tooling, `binaries`, `dist` and `release`.
- The bundled `node_modules` (about 40,000 files) and both `.git` folders.
- The icon package's 366 source SVGs, which `icons.json` already contains.

The bundled `node_modules` were never extracted. Nothing from either package was installed or executed. The one exception is the framework's prebuilt demo, which was opened once for visual reference from 127.0.0.1 only.

## Modifications

**None.** The vendored files are byte-identical to the zips. Everything the webpack build provided is reproduced outside this folder:

| Framework expectation (webpack) | Hub replacement |
|---|---|
| Module roots `assets/`, `components/`, `utils/`, `desktopApp`, alias `VtWebGuiIcons` | `vt-framework.ts`: a `resolveId` hook limited to importers inside `vendor/` and `src/vt/shims` |
| `*.scss` imported as CSS modules (`css-loader`, `[name]__[local]__[hash:base64:5]`) | the same plugin adds a `.module.scss` query; `css.modules.generateScopedName` keeps the naming |
| `@indigotree/dart-sass-json-importer`: `@use "x.js"` turns JS tokens into Sass maps | a Sass importer that evaluates the CommonJS token files in Node (`vt-framework.ts`, `jsDefinesImporter`) |
| Babel: JSX in `.js` files and CommonJS token modules in the browser | an esbuild `jsx` transform for vendored `.js` files; `module.exports`/`require` in `defines.js` rewritten to ESM at build time |
| `svg-react-loader` | the plugin's `load` hook returns a React component for vendored `.svg` files |
| `DefinePlugin` `process.env.ELEM_ID_TEMP` / `ELEM_ID_ROOT` / `DESKTOP_APP` / `URL_I18N` | Vite `define`; `index.html` provides `#viTemporaries` |
| Redux store (`store`), `react-redux`, `@reduxjs/toolkit` (`nanoid`), `react-router-hash-link` | small shims in `src/web/src/vt/shims/` (English, LTR, no-op main scope) |

## Updating

1. Extract the new zips into empty folders and inspect them.
2. Replace the folders listed above.
3. Record the new versions and hashes here.
4. Run `npm run build`, the vitest suite and the Playwright suite.

Breaking changes usually show up in `assets/defines` (token names), in component prop names and in `frame/` class names (`src/vt/frame.tsx`).
