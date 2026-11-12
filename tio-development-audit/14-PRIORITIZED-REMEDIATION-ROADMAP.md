# 14 — Prioritised remediation roadmap

Issue numbers refer to `MASTER-ISSUE-REGISTER.csv` (prefix TIO-DEV-AUDIT-). No P0 finding was confirmed. Effort is an auditor's estimate for a small team familiar with the code: **S** ≤ 2 days, **M** ≤ 1 week, **L** > 1 week.

## Immediate — before any further UAT or release decision (P1 and the P2 items that share their cause)

| # | Action | Issues | Business impact today | Expected benefit | Owner | Dependencies | Acceptance criteria | Effort |
|---|---|---|---|---|---|---|---|---|
| I1 | Make SLA obligations immutable once Met or Breached; priority or contract changes after that need the TIO Manager, a reason and leave the earlier result visible | 001, 002 | Breaches can be removed by normal edits | SLA figures usable as evidence | Development + Product | Decision on override policy | Tests 001 and 002 pass; SLA report lists overrides | M |
| I2 | Freeze finished records: refuse edit, due-date, contract, Jira and response changes on Closed/Cancelled cases and edits on Completed/Cancelled commitments | 004, 008 | History can be rewritten | Stable closed-work history | Development | — | Tests 004 (two) and 008 pass | S |
| I3 | Commitment timeliness: post-due revisions need manager approval; report on-time against original and agreed deadline | 005 | On-time KPI can be set by the owner | Honest delivery KPI | Product + Development | KPI definition signed off by the TIO Manager | Test 005 passes; report shows both rates | M |
| I4 | Back-dated first response: keep claimed and entry time, require evidence, manager confirmation when it changes a breach | 003 | Response compliance unverifiable | Credible response metric | Development | I1 | Test 003 passes | S |
| I5 | Cascade delete: require record version and a server-validated confirmation; archive instead of delete for work records with history | 011 | Whole client tree removable in one request | Protection against data loss | Development + Security | — | Test 011 passes; delete of a case with SLA result refused | S |

## Next sprint — P2 functional, business and high-impact usability

| # | Action | Issues | Benefit | Owner | Dependencies | Acceptance criteria | Effort |
|---|---|---|---|---|---|---|---|
| N1 | Decide and implement the ownership rule (enforce owner/backup/lead for cancel, close, deadline, contract — or document it as advisory and remove dead parameters) | 010 | Clear accountability | Product + Security | Owner decision | Test 010 passes or decision recorded | S–M |
| N2 | Add "reported at" as SLA clock start; allow completion/response times back to it | 015 | Unbiased durations, truthful late logging | Product + Development | I1 | New SLA tests | M |
| N3 | Uniqueness for contract reference per client, duplicate warning for client name and firewall rule; idempotent create | 009, 006 | No ambiguous or duplicate records | Development | — | Tests 006 and 009 pass | S |
| N4 | Header and responsive fixes: navigation at 1366 px, overflow pages, mobile filters | 016, 017 | Usable on standard laptops and tablets | UX + Development | — | Navigation and overflow tests pass at four viewports | M |
| N5 | Accessibility fixes in tokens, Dialog and error summary; axe in the pipeline | 018 | WCAG 2.2 AA on tested rules | UX + Development | N4 | 0 serious axe violations on all routes | M |
| N6 | Lists: one server search, one export, filter chips; Delete moved to overflow menu; case actions ordered by workflow; dialog button wording | 019, 021 | Fewer errors, faster triage | UX | — | Usability check with three users; no row-level Delete | M |
| N7 | Delegated triage and short path for Low/Normal requests; record validator | 014 | No single-person bottleneck | Product + Operations | Owner decision | Engineer can start a Critical case of their team | M |
| N8 | Portable tests and CI: connection string from configuration, Chromium e2e, pipeline with SQL Server container, ESLint/Prettier, include the audit suite | 026 | Regressions caught before release | Development + QA | — | Green pipeline on a clean Linux agent | M |

## Next 30 days — P2/P3 defects, workflow and design-system refinements

| # | Action | Issues | Owner | Acceptance criteria | Effort |
|---|---|---|---|---|---|
| T1 | Date sanity rules (due dates, escalation targets, paid date) with explicit "logged after the fact" override | 007, 012 | Development | Tests 007 and 012 pass | S |
| T2 | Field-level errors for invalid enums and unknown query parameters; all errors in one response | 013, 033 | Development | Test 013 passes | S |
| T3 | Route guards by right; correct refusal text | 020 | Development | Route-guard test passes | S |
| T4 | Error state with Retry, record not-found panel, success toasts | 023 | UX + Development | Present on all lists and record pages | S |
| T5 | Type scale, single date format, label text instead of enum names, SLA chip labels | 022 | UX | Font sizes limited to token set | M |
| T6 | Reopen behaviour: clear outcome of earlier cycle; align reopen rights | 032 | Development + Product | Reopened case has empty outcome | S |
| T7 | Data-quality rules for contracts without targets/support calendar; show measured share on SLA tiles | 031 | Product | Rule visible in data quality | S |
| T8 | Security hardening: OpenAPI access, upload content check, internal map tiles | 029 | Security + Development | Unmapped user gets 403 on OpenAPI | S |
| T9 | Job coordination lock; job health in readiness endpoint | 027 | Development + Operations | Two instances → one run | S–M |
| T10 | Split the Command Center: one-screen summary plus topic pages; show n beside rates | 025 | UX + Product | Landing page ≤ 2 screens at 1080p | M |

## Next 60–90 days — strategic

| # | Action | Issues | Benefit | Owner | Dependencies | Acceptance criteria | Effort |
|---|---|---|---|---|---|---|---|
| S1 | Design system (option B in report 06): tokens, accessible primitives, Shell/DataTable/Dialog/Form redesign, component catalogue and visual baselines | 024, 022, 021 | Modern, consistent, maintainable UI | UX + Development | N4–N6 | All pages on the new kit; visual regression in CI | L |
| S2 | Domain layer for workflows with transition table and unit tests; append-only SLA evaluation records | 028, 001–004 | Rules defined once; fewer regressions | Development | I1, I2 | Workflow unit tests independent of HTTP | L |
| S3 | Outbound notifications (e-mail/Teams) and read-only Jira synchronisation | 030 | People are reached; no double keeping | Product + Development | Security approval of integrations | Assignment and SLA-risk notices delivered externally | L |
| S4 | Implementation tracking: milestones with status, go-live checklist, hypercare; change calendar; problem records; shared knowledge base | 030 | Coverage of the "I" in TIO and core ITSM practices | Product | Roadmap decision | Per feature | L |
| S5 | Production readiness: SSO/MFA decision, penetration test, load test with production-like volume, migration baseline, backup/restore drill on target infrastructure, monitoring and alerting | 029, 027 | Evidence for a production GO | Security + Operations | S2 | Signed test reports | L |
| S6 | Clean up the access model (remove or restore scopes); bundle splitting; front-end unit tests | 028 | Lower maintenance cost | Development | — | Initial script < 300 KB | M |

## Quick wins (≤ 2 days each, low risk)

I2, I5, N3 (uniqueness part), T1, T2, T3, T4, T6, T8, contrast token and focus trap from N5, dialog wording from N6.

## Structural work (needs design before coding)

I1/I3 (measurement model), N2 (reported time), N7 (workflow authority), S1 (design system), S2 (domain layer), S3–S4 (scope and integrations).

## Suggested order

1. I2 and I5 (small, remove the worst integrity gaps) → I1, I4, I3 with Product decisions.
2. N8 in parallel, so that every later fix is protected by the pipeline and the audit suite.
3. N1–N7, then the 30-day list.
4. Re-run the audit suite: the 17 `@defect` tests are the exit criteria for their findings.
