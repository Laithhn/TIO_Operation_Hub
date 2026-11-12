# 16 — Remediation applied after the audit (A111)

Applied on branch `claude/tio-operations-hub-audit-i1m7h0` on top of `main` at `fa71ace` (2.60.0), 12 November 2026. The audit reports `00`–`15` and the issue register describe 2.60.0 **before** this change and were left as they are. The decision record is `docs/DECISIONS.md` A111.

## What was fixed (the "Immediate" list of report 14)

| Roadmap item | Issues | Rule now enforced | Result of the audit test |
|---|---|---|---|
| I1 Freeze SLA results | 001, 002 | An obligation that already has its result keeps its target on a priority change; contract change and cancellation of a ticket with a result need `Cases:Coordinate`, with the earlier result written to the timeline | Tests 001, 002 pass |
| I2 Freeze finished records | 004, 008 | Closed/cancelled tickets refuse edit and due-date changes; completed/cancelled commitments refuse edit | Tests 004 (two), 008 pass |
| I3 Commitment timeliness | 005 | A deadline that has passed is moved only with `Commitments:Coordinate` | Test 005 passes ("Completed late") |
| I4 Back-dated first response | 003 | After the response deadline, a response time before it needs `Cases:Coordinate` and a note; entry time kept on the timeline | Test 003 passes |
| I5 Delete safeguards | 011 | `DELETE /dependents/…` needs `?expected=<previewed total>` (428 / 412); tickets with an SLA result are never deleted, directly or through contract, project or client (409) | Test 011 passes |
| I6 Change-history scope | 035 | Child rows are stamped with their parent's client or team; unscoped older entries are shown to scoped readers only for global catalogue/configuration types or their own actions; export log limited to own exports | Test 035 passes |
| — Penalties | 001–003, 011 | Follows from the above | Penalty test passes: **EUR 4,000 stays EUR 4,000** after the four actions that reduced it to 0 |

## Verification

| Suite | Before (2.60.0) | After |
|---|---|---|
| Audit Playwright suite (63 tests) | 46 pass / 17 fail | **56 pass / 7 fail** |
| Project .NET tests | 755: 711 pass / 6 fail / 38 skipped | 760: **717 pass / 5 fail / 38 skipped** (5 new tests; the 5 failures are the Windows-authentication and file-path ones that fail on unmodified `main` in this container) |
| Project front-end unit tests | 268 pass | 268 pass |
| Project browser journeys (`tests/e2e`) | not run | **not run** (Edge channel, Windows authentication) |

## Still open (not part of this change)

| Issue | Audit test still failing |
|---|---|
| 006 Duplicate submissions | yes |
| 007 Past due dates, future paid date, unbounded completion time | yes |
| 009 Uniqueness (contract reference, names, firewall rules) | yes |
| 010 Ownership inside a scope | yes (owner decision needed) |
| 012 Escalation targets before receipt | yes |
| 013 Body enum errors | yes |
| 036 "Access denied" for unknown addresses | yes |
| 015, 018, 021, 022, 024–033, 037 | no automated test; see report 14 |

## Things the owner should confirm

1. **Mis-set priority.** A ticket logged with too high a priority and breached before correction stays breached. The correction path is a coordinated contract change or cancellation, both leaving the earlier result on the timeline.
2. **No deletion of measured tickets.** There is no retention rule; a ticket with an SLA result can only leave the system after coordination cancels it.
3. **Older change-history entries** written before this change keep no client on child rows; scoped readers no longer see them. A one-off script could re-stamp them.
4. **Jira-driven changes** go through the same save hook: a priority change arriving from Jira also keeps reached results. Not tested (Jira disabled).
5. **Release.** The version was not bumped and no release notes or package were produced.
