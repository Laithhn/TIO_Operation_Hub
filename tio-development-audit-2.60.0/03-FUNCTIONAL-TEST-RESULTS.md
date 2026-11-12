# 03 — Functional test results (build 2.60.0)

Commit `fa71ace`, local development instance, 11–12 November 2026. Comparison column refers to the first audit (2.29.0).

## Summary

| Test set | Executed | As expected | Not as expected | Notes |
|---|---|---|---|---|
| Scripted API checks, first run (`traces/api-test-evidence.jsonl`) | 142 steps | 101 | 31 | 10 informational. Of the 31: **19 product findings**; 12 are scripts written for 2.29.0 meeting changed behaviour (data scope, close path) or my own input |
| Scripted API checks after the database rebuild (`…-rerun.jsonl`) | 72 steps | 56 | 16 | Same findings reproduced, plus new-function tests |
| Audit Playwright suite (`automated-tests/`) | 63 tests | 46 passed | 17 failed | All 17 are `@defect` tests asserting the corrected behaviour |
| UI crawl | 79 routes × 4 viewports = 316 page loads | 315 | 1 | Only the deliberate missing ticket; **0 JavaScript exceptions, 0 unexpected failed requests** |
| Project .NET tests (unmodified) | 755 | 711 passed | 6 failed, 38 skipped | 3 failures need Windows authentication (SSPI), 2 concern files on disk (as in 2.29.0), 1 is a Command Center assertion (expected 1, actual 0) that needs triage. Skipped tests are marked by the project for SQL integration conditions |
| Project front-end unit tests | 268 | 268 | 0 | New since 2.29.0 |
| Project browser journeys (`tests/e2e`) | 0 | — | — | Not run (Edge channel, own database) |

## Verified as working

Everything listed as working in the first audit still works: validation, lifecycle transitions, optimistic concurrency, uniqueness where implemented, attachments, notes privacy, report/export consistency, audit trail, navigation, form resilience.

New and verified:

- **Per-client data scope.** A scoped engineer saw 1 of 18 clients, 6 of 31 tickets, 3 of 19 contracts; **34 record routes of another client answered 404 (two of them 403)**, five write attempts answered 404, creating a ticket on another client or linking another client's contract or ticket was refused. Dashboards, search, report previews and exports were filtered. One gap: change history (035).
- **Granular rights.** Engineers are refused on administration and on create/archive/delete of client structure with a message naming the missing right; self-escalation through the user endpoint is refused.
- **Configurable statuses.** Change-status cannot cross stages (cannot close, cannot skip triage); closing still needs outcome and evidence.
- **Comments, client status reports, organisations, role cloning, user deletion with reason.**
- **Route guards.** A role without the right gets "Access denied" on create forms (020 fixed).
- **Error recovery.** Failed list load offers "Try again" with the trace id (023 fixed).
- **Layout.** No horizontal overflow at any tested width (016, 017 fixed).

## Not working as it should

| Area | Result on 2.60.0 | Issue | vs 2.29.0 |
|---|---|---|---|
| Recorded SLA breaches and the penalties derived from them | Removable by priority change, contract unlink, back-dated response, delete | 001, 002, 003, 011 | Unchanged; impact larger (penalties) |
| Edits after closure / completion | Accepted | 004, 008 | Unchanged |
| On-time result of commitments | Owner can move the deadline | 005 | Unchanged |
| Duplicate submissions (API) | Three identical parallel requests → three tickets | 006 | Unchanged |
| Date sanity | Past due dates; targets before receipt; future paid date; completion at any past time | 007, 012 | Unchanged / slightly wider |
| Uniqueness | Contract reference, client name, firewall rule, organisation name | 009 | Unchanged / wider |
| Ownership inside a scope | Any maintainer may cancel a colleague's work | 010 | Narrowed by scope |
| Cascade delete | No version, no server confirmation | 011 | Unchanged |
| Body enum errors | Generic 400 | 013 | Query enums fixed |
| Change history under data scope | Shows other clients' child records | 035 | New |
| Unknown address | "Access denied" | 036 | New |

## CRUD verification with synthetic records

Create, read, state changes and delete were exercised for client, project, contract (incl. penalty clause), ticket (API and browser), commitment, escalation, environment, server, volume, firewall rule, installation, attachment, note, organisation, role and user. Updates of client, project, contract and inventory records were again not exercised.
