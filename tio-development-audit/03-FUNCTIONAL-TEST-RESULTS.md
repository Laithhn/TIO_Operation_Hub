# 03 — Functional test results

Build 2.29.0 (commit `26b7cf8`), local development instance, 11 November 2026.

## Summary

| Test set | Executed | As expected | Not as expected | Notes |
|---|---|---|---|---|
| Scripted API checks (`traces/api-test-evidence.jsonl`) | 215 steps | 160 | 34 | 21 further steps were informational. Of the 34, **17 are product findings**; 17 were caused by my own test input (wrong lookup code, sub-second timestamps, a record not yet in the required state) and were repeated correctly — both runs are kept in the log |
| Audit Playwright suite (`automated-tests/`) | 57 tests | 40 passed | 17 failed | All 17 failures are tests tagged `@defect` that assert the corrected behaviour for confirmed findings |
| UI crawl | 64 routes × 4 viewports = 256 page loads | 254 without error | 2 | `/microservices/1` (no such seed record) and the deliberate missing case; **0 JavaScript exceptions, 0 unexpected failed requests** |
| Existing project tests (.NET) | 140 | 137 | 3 | The 3 failures concern file paths on Linux (attachments, storage move, export file); not reproduced as product defects — needs verification on Windows |
| Existing project e2e (`tests/e2e`) | 0 | — | — | Blocked: needs Microsoft Edge and LocalDB |

## What works (verified)

- **Validation** — mandatory fields, lengths, time zones (IANA only, DST gaps refused), secret-looking text refused in free text, numeric ranges for CPU/RAM/volumes/ports, date order for projects and contracts, payment percentage total and paid-date rule.
- **Case lifecycle** — every invalid transition tried was refused with a clear message (start/close from New, close from In progress, second start, progress on closed, second cancel).
- **Optimistic concurrency** — missing version → 428, stale version → 412 with a helpful text; two simultaneous saves → exactly one succeeds.
- **Uniqueness** where implemented — client alias, environment name per scope, server name per environment, installation instance, user account.
- **Authorization** — administration endpoints, client/region/project creation, triage, reopen, archive, delete and technical detail (firewall rules, network zone) are refused server-side for roles without the right; navigation hides what the role cannot use.
- **Attachments** — executable, HTML, SVG and double-extension files refused; path elements stripped from names; download always as attachment with `nosniff`; delete limited to uploader or Delete right.
- **Notes** — private to their owner (even the manager gets 404); scripts, event handlers and `javascript:` links removed.
- **Reports and exports** — preview total = list total = export row count; formulas neutralised in CSV (`'=HYPERLINK…`); download only by the requesting user.
- **Audit trail** — every tested change appears with user, time and before/after values.
- **Navigation** — deep links, refresh, back/forward and URL-backed filters; "Page not found" route.
- **Forms in the browser** — errors beside fields with a summary, values kept after server or network failure, double click sends one request, leaving a dirty form asks for confirmation.
- **Condition reports** — a late-entered older observation does not overwrite a newer one.

## What does not work as it should

| Area | Result | Issue |
|---|---|---|
| Edits after closure (cases), after completion (commitments) | Accepted | 004, 008 |
| Recorded SLA breaches | Can be removed by priority change, contract unlink or back-dated response | 001, 002, 003 |
| On-time result of commitments | Can be changed by the owner moving the deadline | 005 |
| Duplicate submissions (API) | Three identical parallel requests → three cases | 006 |
| Date sanity | Past due dates, targets before receipt, future paid date accepted | 007, 012 |
| Uniqueness | Contract reference, client name, firewall rule | 009 |
| Ownership | Any Edit holder may cancel/close others' work | 010 |
| Cascade delete | No version or server-side confirmation | 011 |
| Error reporting | Unknown enum → generic 400; unknown query parameters ignored | 013, 033 |
| Top navigation at 1366 px, phone/tablet overflow | Clipped / overflowing | 016, 017 |
| Route guard for roles without Edit | Form opens, submit fails | 020 |
| Error and not-found states | No recovery action | 023 |

## CRUD verification with synthetic records

| Record | Create | Read | Update | Delete / archive | Persistence | Audit history |
|---|---|---|---|---|---|---|
| Client | Yes | Yes | — | Cascade delete | Yes | Yes |
| Project | Yes | Yes | — | Archive refused while contract Active (correct); removed with client | Yes | Yes |
| Contract | Yes | Yes | — | Removed with client | Yes | Yes |
| Case | Yes (API and UI) | Yes | Yes | Cancel, delete | Yes (after refresh and in lists, search, report) | Yes (timeline + field history) |
| Commitment | Yes | Yes | Yes | Cancel, delete | Yes | Yes |
| Escalation | Yes | Yes | Status, level, communication | Removed with client | Yes | Yes |
| Environment | Yes | Yes | Condition report | Archive; plain delete refused while servers exist (correct) | Yes | Yes |
| Server, volume, firewall rule, installation | Yes | Yes | — | Removed with client | Yes | Yes |
| Attachment | Yes | Download | — | Delete | Yes | — |
| Note | Yes | Yes | — | Recycle bin + permanent | Yes | Excluded by design |
| Role, user | Yes | Yes | Rights | User deactivate only | Yes | Yes |

Update of client, project, contract and inventory records was not exercised (creation and deletion were).
