---
decided: 2026-07-31
---

# TypeScript stays on 6.0.3

## Context and Problem Statement

TypeScript 7.0.2 is available — the Go port, which ships native binaries as platform-specific `optionalDependencies`. TS 7.0 ships **no compiler API** however: `exports["."]` points at `./lib/version.cjs`, and AST, fs, and sync are reachable only through `./unstable/*` subpaths. The new API arrives with 7.1. This project consumes TypeScript exclusively through the API.

## Considered Options

- Move to 7.0.2
- The dual-version alias from the Microsoft announcement (`"typescript": "npm:@typescript/typescript6@^6"` plus `"@typescript/native": "npm:typescript@^7"`)
- Stay on 6.0.3 until the 7.1 API is out and supported by the consumers

## Decision Outcome

Chosen: **stay on 6.0.3**. There is **no `tsc` script** in `package.json` — TypeScript runs only through `fork-ts-checker-webpack-plugin` in the webpack build, through `typescript-eslint` in the lint, and in the IDE. The sole advantage of TS 7.0 is CLI speed, which nobody here uses; the removed API, by contrast, is used by all three consumers. That leaves the dual-version alias pointless as well.

Two concrete blockers: `typescript-eslint@8.65.0` has the peer `typescript: ">=4.8.4 <6.1.0"` and fails to install. `fork-ts-checker-webpack-plugin@9.1.0` needs the removed API.

## Consequences

- Good: the toolchain stays operational with no code to change. The tsconfigs are already TS-7-shaped (no `baseUrl`, explicit `types: ["node"]`, `module: "preserve"` with `moduleResolution: "bundler"`), and `tsc -p tsconfig.local.json --noEmit --strict` exited 0 across 919 files on 2026-07-31 — TS 7 makes `strict: true` the default, so that costs nothing here.
- Bad: `fork-ts-checker-webpack-plugin` declares its peer as `typescript: ">3.6.0"`, and 7.x satisfies that range semver-wise. **npm therefore issues no warning on upgrade** — the build breaks only at runtime in `webpack.config.js`. The version boundary has to be guarded by hand.

Check before a new attempt: (1) `npm view typescript-eslint peerDependencies` for a TS 7 range, (2) whether fork-ts-checker has been ported to the 7.1 API. Independent of [general-eslint-stay-on-v9.md](general-eslint-stay-on-v9.md): the two jumps share no blocker, so each follows as soon as its own blockers are gone. Every attempt checks the other jump as well; where both are possible, they go in one step and the lint stack is tested once.