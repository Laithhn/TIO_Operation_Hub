# npm packages

## Where the versions live

The framework's `package.json` is edited directly. `applySettings.js` writes only the project data from `settings.js` into it (name, version, product name, description, scripts) plus the fixed versions of `settings.packages.devDepsWithFixVersion`, which are `electron` and `electron-builder`. For a consumer project it copies `package.json`, `package-lock.json` and `.npmrc` from the framework where the project has none. Where it has one, a run with the `compare` option shows the framework's file beside it in the compare tool.

Every dependency carries its exact version, never a range. `.npmrc` sets `save-exact = true`, so `npm install <package>@<version>` writes it the same way. The why: ADR `general-npm-exact-direct-versions.md`.

The build server, for v4 the CibsJenkins, installs with `npm ci --omit=optional --ignore-scripts`, written into `npmCommandsForMakefile.cmd` by `applySettings.js`. `npm ci` installs exactly `package-lock.json` and fails where it does not match `package.json`, so both are committed together. The why: ADR `general-build-server-installs-with-npm-ci-without-scripts.md`.

Every `integrity` in `package-lock.json` is a SHA-1 hash, because Artifactory's `npm_org` delivers a version's `dist` with `shasum` alone. The hash still detects a substituted tarball: replacing a locked one unnoticed takes a second tarball with the same hash, and no practical second-preimage attack on SHA-1 is published. *Checked 2026-09-29 with `npm view react@19.0.0 dist --json`.*

Every install goes through Artifactory (`npm_org`), configured in `.npmrc`.

## Minimum release age

`.npmrc` sets `min-release-age = 14`: npm resolves only versions published more than 14 days ago, and fails where a range has none. A single call can override it with `--min-release-age=0`. The why: ADR `general-npm-versions-at-least-14-days-old.md`.

- **It filters what npm resolves anew** — an update, a new dependency, a lockfile that no longer matches. A lockfile entry that satisfies its range passes through untouched. *Source: npm 11.19.0, `@npmcli/arborist/lib/arborist/build-ideal-tree.js`, read, not measured.*
- **`min-release-age-exclude` exempts packages by name.** Where the window blocks a fix, `npm audit fix` keeps the vulnerable version, warns, and exits non-zero. *Source: npm 11.19.0, `@npmcli/config/lib/definitions/definitions.js`.*
- **Only an npm that knows the setting applies it** — npm 11.12.1 does, npm 10.9.9 does not.

## Install scripts

`.npmrc` sets `strict-allow-scripts = true`: an install fails on any package whose install script the `allowScripts` field in `package.json` does not cover. An approval (`npm approve-scripts <package>`) is pinned to the installed version, so every new version needs one of its own. A deny (`npm deny-scripts <package>`) is written by name, holds for every version, and skips the script. The build server runs no install script at all. The why: ADR `general-npm-install-scripts-by-allow-list.md`.

- **Only npm 11.19.0 or later applies the list** — npm 11.12.1 ignores `allowScripts` and runs every script.
- **An entry matches the lockfile, not the tarball** — npm takes name and version from the lockfile's `resolved` URL, never from the tarball's own `package.json`, so a tarball cannot claim an approved identity. *Source: npm 11.19.0, `@npmcli/arborist/lib/script-allowed.js`.*
- **The check covers the whole tree**, not only what an install adds: with one approval missing, a plain `npm install` on an unchanged tree fails. *Checked 2026-09-29.*

| Package | Entry | Why |
|---|---|---|
| `electron` | approved | fetches the binary of the desktop target |
| `unrs-resolver` | approved | fetches the native binding of the ESLint resolver where it is missing |
| `chromedriver`, `geckodriver` | approved | fetch the drivers of the parked tests |
| `core-js` | denied | prints a donation banner, nothing else |
| `@parcel/watcher` | denied | builds from source only when `npm_config_build_from_source` asks for it |

`fsevents` installs only on macOS and has no entry. A first install there fails and names it; approve or deny it on that machine.

## Pinned packages

| Package | Pinned to | Why |
|---|---|---|
| `eslint` | 9.x | ADR `general-eslint-stay-on-v9.md` |
| `typescript` | 6.x | ADR `general-typescript-stay-on-6.md` |
| `react-compiler-webpack` | exactly 1.0.1 | ADR `general-react-compiler-webpack-stays-on-1-0-1.md` |
| `@types/node` | the major of `settings.packages.nodeJs` | it describes the pinned runtime; ADR `general-nodejs-pinned-to-the-active-lts-line.md` |
| `electron`, `electron-builder` | `settings.packages.devDepsWithFixVersion` | written by `applySettings.js` |

The test packages in `optionalDependencies` stay as they are while the tests are parked (ADR `general-jest-electron-deferred.md`).

## Updating

1. Find the newest version of each direct dependency that is older than 14 days. `npm view <package> time --json` lists every version with its publish date.
2. Install without running scripts: `npm install --ignore-scripts <package>@<version> …`.
3. List the install scripts nobody has reviewed yet: `npm approve-scripts --allow-scripts-pending`. It names every package of the new tree that `allowScripts` does not cover — a new package, or a new version of an approved one.
4. Examine each of them, then run `npm approve-scripts <package>` or `npm deny-scripts <package>`. `npm rebuild <package>` runs an approved script the install skipped.
5. Verify: `npx tsc -p tsconfig.local.json --noEmit`, `npx eslint .` against the baselines in `CLAUDE.md`, `npm run build:web-dist-prod`, and the running app.
6. Commit `package.json` and `package-lock.json` together.
