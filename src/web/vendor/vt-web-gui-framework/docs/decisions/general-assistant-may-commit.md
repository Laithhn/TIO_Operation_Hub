---
decided: 2026-08-07
jira: PDWG-46
---

# The assistant may stage, commit, and push, gated by the permission layer

## Context and Problem Statement

Adopting the `vi-base` rules brought their `git` rule into the repo unchanged: it lets the assistant compose a commit message and commit on request, staging the paths itself. From 2026-08-05 this repo barred that outright, on the grounds of control and responsibility — every change had to be reviewed and *understood* by the developer before it entered history, the diff is where that understanding happens, and assembling the staging area is part of that review rather than a by-product of assisted work. The ban named its own price: the assistant can never carry a task through to landing, and long sessions pile independent changes into the working tree that have to be separated again at staging time — a working tree of 22 entries on 2026-08-07 bore it out. Independently of the rule, the harness's permission layer in `settings.json` had grown into a gate covering the same commands.

## Considered Options

- `git add` and `git commit` with the developer alone — not on a direct instruction, not after an approval, not as the closing step of a task
- Let the assistant commit, but only what the developer staged
- Lift the ban entirely, with no gate
- Lift the ban and let the permission layer in `settings.json` be the gate

## Decision Outcome

Chosen: **the assistant may stage, commit, and push; `settings.json` decides what needs a prompt**. Decided by the developer on 2026-08-07 after trying the branch workflow in practice, on the grounds of trust earned there. The kit's `git` rule therefore applies unchanged, and the repo-own rule points at the permission layer instead of overriding the section.

The gate is mechanical rather than a matter of discipline: `git commit` is allowed outright, `git add` and `git push` prompt every time, and `git add -A`, `git reset --hard`, and `git push --force` are denied — so a blanket stage and a rewritten remote history are impossible rather than merely discouraged.

## Consequences

- Good: a task can be carried through to landing, and independent changes no longer accumulate in the working tree waiting to be untangled.
- Bad: a prompt authorizes the command, not the change it carries — it shows `git add <paths>`, never the diff. The review that the earlier ban made structural now rests on the developer choosing to look. Denying `git add -A` limits the blast radius; it does not restore the review.
