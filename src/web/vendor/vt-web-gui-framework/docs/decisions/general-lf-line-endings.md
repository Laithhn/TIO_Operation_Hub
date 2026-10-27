---
decided: 2026-08-19
---

# Declare LF as the working tree's line ending

## Context and Problem Statement

Until 2026-08-10 nothing in the repository said what line ending its working tree carries: it rested on each developer's `core.autocrlf=true`, which converts on checkout and therefore only ever touches files that passed through Git. Files an editor or a tool writes directly stayed LF, and PhpStorm flagged every one of them on open — fifteen such files sat in the tree that day, six freshly written by the content porting. The repo answered with `* text=auto eol=crlf`, on the grounds that CRLF is PhpStorm's project default. The estate rule requires `eol=lf` and, since 2026-08-18, states what a deviation takes: a technical constraint, and an editor default is expressly not one. The rule's record adds that a repo `/sync` writes into cannot deviate at all — the skill emits LF, so every run would report all 18 synced packs as modified with an empty diff.

## Considered Options

- Leave it to `core.autocrlf` and convert stray files by hand as they surface
- An `.editorconfig` with `end_of_line`
- A `.gitattributes` with `* text=auto eol=crlf`, PhpStorm's default
- The same with `.claude/rules/**` carved out, so `/sync` stops colliding with it
- The same, arguing a technical constraint from the generators that write CRLF
- A `.gitattributes` with `* text=auto eol=lf`, the estate default

## Decision Outcome

Chosen: **`* text=auto eol=lf`**, with one carve-out beside it, `dev/*.pem -text`, which keeps the certificate byte-exact.

`.gitattributes` is the only home that works: it puts the declaration where every clone reads it and makes the checkout itself produce the ending, independent of a machine-local setting. `.editorconfig` would bind editors but not Git, so the two sources could still disagree, and it does not repair a file after the fact. Converting by hand does not scale, since LF is what a tool writes by default and the drift recurs.

Nothing here forces CRLF. The CRLF sources were all our own code, not a platform constraint: `applySettings.js` wrote `package.json`, `tsconfig.local.json`, `npmCommandsForMakefile.cmd` and `VtWebGuiFramework_Bare.mak` with `\r\n`, and `scssToTypeScript.js` generated the `_index.ts` files the same way. Each is a line in a generator we own, so each was changed to `\n` rather than being paid for with a repo-wide deviation.

The two files the build machine executes were the only candidates with a claim. `npmCommandsForMakefile.cmd` was measured instead of assumed: a batch file holding the same constructs — `@echo off`, `pushd`/`popd`, `set` with a trailing path separator, `call`, `findstr` with escaped quotes, and a `goto :label` the real file does not even use — ran identically as LF and as CRLF through `cmd.exe`, both exiting 0. `VtWebGuiFramework_Bare.mak` could not be tested locally, no make being installed in a developer checkout, and was briefly carved out for that reason; the developer confirmed on 2026-08-19 that its make reads LF, so the carve-out was dropped the same day. A run of `npm run applySettings` afterwards produced no diff in any generated file.

Two carve-outs of the CRLF round fell away with it: `*.snap text eol=lf`, which Jest needed while CRLF was the default and which now says nothing, and the `.claude/rules/**` exception that was only ever needed to keep `/sync` from colliding with CRLF.

## Consequences

- Good: `/sync` and the repo agree, so the synced packs stop being rewritten twice per run. A file written by a tool outside Git now matches what a checkout produces, instead of drifting the other way.
- Good: no exception to remember. Every text file in the tree, generated or hand-written, carries LF.
- Good: the declaration lives in the repository rather than being assumed per machine — the gain the CRLF round already brought, kept.
- Bad: none worth noting. Converting the existing checkout touched 1260 files and produced no diff — the blobs were already LF — but left an empty `M` in `git status` for each until the next `git add`.
