# 14 — Prioritised remediation roadmap (build 2.60.0)

Issue numbers refer to `MASTER-ISSUE-REGISTER.csv`. No P0 finding. Effort: **S** ≤ 2 days, **M** ≤ 1 week, **L** > 1 week.

## Status of the first audit's roadmap

| First-audit item | State on 2.60.0 |
|---|---|
| I1 Freeze SLA results | **Not done** |
| I2 Freeze finished records | **Not done** |
| I3 Commitment timeliness | **Not done** |
| I4 Back-dated first response | **Not done** (solved only for synchronised Jira tickets) |
| I5 Cascade-delete safeguards | **Not done** (rights and scope checks added) |
| N4 Header and responsive fixes | Done |
| N5 Accessibility | Partly (structure and sizes yes; contrast and focus no) |
| N6 Lists and action hierarchy | Done |
| N7 Delegated triage / short path | Partly (short path; delegation possible through rights) |
| N8 Portable tests and CI | Partly (portable; no CI) |
| T2 Field-level errors | Partly |
| T3 Route guards, T4 error states | Done |
| T10 Split the Command Center | Done |
| S1 Design system | Done differently: real framework vendored |
| S3 Notifications / Jira | Jira read sync built; no outbound notification |

**The five "Immediate" items — the conditions of the first verdict — are all still open**, while 31 releases added features on top of them.

## Immediate — before penalties, SLA rates or delivery KPIs are shown to anyone outside the team

| # | Action | Issues | Why now | Owner | Acceptance criteria | Effort |
|---|---|---|---|---|---|---|
| I1 | Make SLA obligations immutable once Met or Breached; later priority or contract changes need `Cases:Coordinate`, a reason and keep the earlier result visible; penalties are priced from the frozen result | 001, 002 | EUR 4,000 → 0 demonstrated | Development + Product | Defect tests 001, 002 and the penalty test pass | M |
| I2 | Refuse edits, due-date, contract and response changes on closed tickets; refuse edits on completed/cancelled commitments | 004, 008 | Rewritable history | Development | Defect tests 004 (two), 008 pass | S |
| I3 | Post-due commitment revisions need Coordinate; report on-time against original and agreed deadline | 005 | Management dashboard shows the inflated rate | Product + Development | Defect test 005 passes | M |
| I4 | Back-dated first response on manual tickets: keep claimed and entry time, evidence, confirmation when it flips a breach | 003 | Same as I1 | Development | Defect test 003 passes | S |
| I5 | Cascade delete: record version and server-validated confirmation; archive instead of delete for tickets with SLA or penalty history | 011 | Removes penalty basis | Development + Security | Defect test 011 passes | S |
| I6 | **Scope the change history and export log** | 035 | Confidentiality between clients under the new scope model | Development + Security | Defect test "change history…" passes | S |

## Next sprint

| # | Action | Issues | Owner | Acceptance criteria | Effort |
|---|---|---|---|---|---|
| N1 | Decide ownership rule inside a scope (enforce, or document and remove dead parameter) | 010 | Product + Security | Decision recorded; test 010 passes or is retired | S–M |
| N2 | "Reported at" for manual tickets as SLA start; sensible lower bound for commitment completion | 015, 007 | Product + Development | New SLA tests | M |
| N3 | Uniqueness (contract reference per client; warnings for client and organisation names, firewall rules); idempotent create | 009, 006 | Development | Tests 006, 009 pass | S |
| N4 | Accessibility: link colour override, dialog focus trap, focus to error summary, chart fixes; axe gate | 018 | UX + Development | 0 serious axe violations | S–M |
| N5 | CI pipeline running the project's 755 + 268 + browser tests and this audit suite; lint and format gates; triage the failing Command Center test | 026 | Development + QA | Green pipeline on a clean agent | M |
| N6 | Security review and controlled pilot of Jira synchronisation | 029 | Security + Operations | Signed review; pilot space mapped | M |

## Next 30 days

| # | Action | Issues | Effort |
|---|---|---|---|
| T1 | Date sanity rules with explicit "logged after the fact" override | 007, 012 | S |
| T2 | Body enum errors by field; unknown query parameters rejected | 013, 033 | S |
| T3 | "Page not found" for unknown addresses | 036 | S |
| T4 | Compact list density; no fixed status bar on small heights | 037 | M |
| T5 | Messages use status labels; one date format; cancel-dialog buttons; pager wording | 022, 021 | S–M |
| T6 | Reopen clears the previous outcome; align reopen rights across record types | 032 | S |
| T7 | Job coordination lock; job health in readiness | 027 | S–M |
| T8 | OpenAPI access, upload content check, internal map tiles | 029 | S |
| T9 | Grant Coordinate to team leads by default or auto-triage Critical tickets | 014 | S (decision) |

## Next 60–90 days

| # | Action | Issues | Effort |
|---|---|---|---|
| S1 | Workflow domain layer (stage transition table, labels at the edge); append-only SLA and penalty evaluations | 028, 001–004 | L |
| S2 | Move to the released framework 4.0.0 with matching icons; raise the three accessibility defects upstream | 024 | M |
| S3 | Outbound notifications (e-mail/Teams) | 030 | L |
| S4 | Change calendar, go-live checklist and hypercare, problem records, shared knowledge base | 030 | L |
| S5 | Production readiness: SSO/MFA, penetration test, load test, **rehearsed database upgrade from the oldest supported version**, migration baseline, monitoring | 029, 027, 028 | L |

## Quick wins (≤ 2 days each)

I2, I4, I5, I6, N3 (uniqueness), T1, T2, T3, T6, T8, link-colour override and focus trap from N4.

## Recommendation on sequencing

Pause feature work for one iteration and close I1–I6. They are small relative to what was built since the first audit, they are the precondition for trusting everything the new dashboards and penalties display, and the 17 failing defect tests give an objective exit criterion.
