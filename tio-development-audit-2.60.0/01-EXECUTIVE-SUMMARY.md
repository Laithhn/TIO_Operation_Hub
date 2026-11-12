# 01 — Executive summary (build 2.60.0)

**System:** TIO Operations Hub, branch `main`, build 2.60.0 (commit `fa71ace`). **Environment:** isolated local development instance (report 00); Jira synchronisation switched off. **Dates:** 11–12 November 2026. **Type:** repeat of the independent audit first run on build 2.29.0 (`tio-development-audit/`). The reference system `nb01994.vitronic.de` was not tested.

## Verdict

### CONDITIONAL GO — to continue toward release, not for production; conditions unchanged and now more urgent

2.60.0 is a visibly better product than 2.29.0 in access control, user interface and breadth. **None of the five conditions attached to the first verdict has been met**, and the same weaknesses now also change a monetary figure (contract penalties). The build may continue through UAT; SLA rates, penalties and delivery KPIs must not be used as evidence, internally or with customers, until the "Immediate" list in report 14 is closed. This is not a production certification.

## What improved since 2.29.0

| Area | Result |
|---|---|
| Access control | Granular rights and a **per-client data scope that held on every route tested** (34 foreign records → 404, writes refused, dashboards/search/reports filtered), except one gap in change history |
| User interface | Real VITRONIC framework; navigation fits all widths; no overflow on 79 routes at four viewports; one list search; safer action menus; error recovery; readable text |
| Workflow | Shorter ticket path; triage can be delegated through rights; comments and activity stream |
| Management view | Five audience dashboards with sample sizes and previous-period comparison; all 14 recomputed figures match SQL |
| Engineering | Project tests 140 → 755 back end (711 pass, 6 fail, 38 skipped here) and 0 → 268 front end (all pass); tests portable to Linux |
| First-audit findings | **6 of 34 fixed**, 8 partly or mostly fixed |

## What did not improve

| ID | Finding | Demonstrated on 2.60.0 |
|---|---|---|
| 001 | Priority change erases a recorded SLA breach | Breached → Met |
| 002 | Engineer unlinks the contract from a breached ticket | Breach gone; response compliance 25 % → 100 % |
| 004 | Closed tickets remain editable | Title, priority, due date changed after closure |
| 005 | Owner re-dates a missed commitment | "Completed on time"; Management dashboard shows 100 % |
| 001–003, 011 | **Penalties follow the rewritable data** | Indicative penalty **EUR 4,000 → EUR 0** after four ordinary actions |

All 14 API-level defect tests written for 2.29.0 still fail on 2.60.0.

## New findings

| ID | Priority | Finding |
|---|---|---|
| 035 | P2 | Change history shows other clients' SLA targets, project–product links and handovers to a client-scoped user |
| 036 | P3 | An address that does not exist answers "Access denied", even to a TIO Manager |
| 037 | P3 | Only about four ticket rows fit on a 1366×768 screen after adopting the framework's density |

## Findings by priority (open on 2.60.0)

| Priority | Count | Issues |
|---|---|---|
| P0 | 0 | — |
| P1 | 4 | 001, 002, 004, 005 |
| P2 | 9 | 003, 008, 009, 010, 011, 015, 018, 024, 035 |
| P3 | 14 | 006, 007, 012, 013, 014, 021, 022, 026, 027, 028, 029, 032, 036, 037 |
| P4 | 4 | 025, 030, 031, 033 |
| Fixed since 2.29.0 | 6 | 016, 017, 019, 020, 023, 034 |
| **Total tracked** | **37** | 31 open or partly open, 6 fixed |

## Scorecard

Method as in the first audit: share of executed checks that behaved correctly, adjusted for the severity of confirmed findings per dimension, capped where coverage was thin. ±5 points is within the method's precision.

| Dimension | 2.29.0 | 2.60.0 | Basis for 2.60.0 |
|---|---|---|---|
| Functional reliability | 82 | **84** | No crashes or exceptions on 316 page loads; new functions behaved correctly; same defects in post-closure edits and duplicates |
| Business logic quality | 58 | **56** | All integrity findings open; penalties add financial weight; time bounds slightly looser; clock start improved for synchronised tickets |
| Workflow efficiency | 60 | **68** | Shorter path, delegable triage, comments; validation still not independent; no outbound notification |
| UI visual quality | 62 | **74** | Coherent framework look, readable type; uppercase controls, mixed formats, contrast token |
| User experience | 60 | **76** | Lists, actions, navigation, error recovery improved; low density on laptops; misleading not-found page |
| VITRONIC GUI framework quality | 50 | **62** | Real framework now; good tokens and consistency; widgets not accessible as shipped, release candidate, contrast token, heavy integration |
| Data integrity | 62 | **62** | Scope and rights-aware cascade added; finished records and measurements still mutable; hard delete; missing uniqueness |
| Performance | 85 | **Not rated** | Measured under concurrent test load; no clean or volume evidence |
| Accessibility | 58 | **66** | Reflow, sizes, naming improved; contrast failures tripled; dialog focus |
| Security controls | 74 | **76** | Scope and granular rights verified; change-history leak; delete safeguards; Jira integration and production sign-in untested |
| TIO operational alignment | 55 | **62** | Daily operations and management view stronger; Jira sync built but untested; ITSM and implementation practices still absent |
| Overall operational readiness | 62 | **65** | Better product, same blocking conditions |

Deployment readiness and Jira integration: **Not rated**.

## Answers to the audit questions (2.60.0)

| # | Question | Answer |
|---|---|---|
| 1 | Functionally reliable? | **Yes, largely** — no failure of basic operation in any test |
| 2 | Business logic correct? | **Partly** — entry rules, transitions and access rules are correct; history and measurements are not protected |
| 3 | Workflows effective? | **Better than before**; still dependent on a coordinator for triage unless rights are delegated; validation not independent |
| 4 | Dashboards and KPIs trustworthy? | **Counts yes; SLA rates, penalties and on-time rates no** |
| 5 | Professionally designed? | **Yes, at a solid corporate standard**; conservative rather than modern |
| 6 | Intuitive and efficient? | **Mostly**; lists show too few rows on laptops; a few wording issues |
| 7 | Does the VITRONIC GUI framework improve or limit quality? | **It improves look and consistency; it limits accessibility and adds delivery risk** (report 06) |
| 8 | Components to redesign? | Link colour token, dialog (focus trap, button wording), list density; upstream: framework DataTable and SelectBox |
| 9 | Business rules to reconsider? | SLA and penalty immutability, reported time for manual tickets, approval of post-due revisions, delete versus archive, ownership as a control, Jira closing tickets without human evidence |
| 10 | Highest operational impact? | 001, 002, 005 (misleading performance and penalty figures), 004 (rewritable history), 035 (cross-client disclosure) |
| 11 | Fix immediately? | I1–I6 in report 14 |
| 12 | Architectural improvement? | Workflow domain layer and append-only measurement records; CI gate; job coordination; released framework version; upgrade-path rehearsal |
| 13 | What works well? | Data scope and rights, validation and error model, concurrency, audit trail, reports and exports, KPI arithmetic, responsive layout, error recovery, test breadth |
| 14 | What remains untested? | Jira synchronisation, penalty assessments, scoped exceptions, report builder, upgrade from older databases, production sign-in, deployment, load (report 15) |
| 15 | Suitable to progress toward release? | **Yes, conditionally** — after I1–I6, with the 17 failing defect tests as exit criteria, and with Jira, upgrade, security and load validation still to come |

## Recommended next steps

1. **Stop adding features for one iteration and close I1–I6.** The first audit's conditions were overtaken by 31 releases; the gap between what the hub displays and what it can vouch for has widened.
2. Put the project's tests and this audit suite into a CI pipeline as a release gate.
3. Plan a controlled pilot and security review for Jira synchronisation.
4. Raise the three accessibility defects with the framework owners and move to the released 4.0.0.

## Deliverables in this folder

`00`–`15` reports; `MASTER-ISSUE-REGISTER.csv` and `issues/` (37 findings with their state against 2.29.0); `TEST-COVERAGE-MATRIX.csv`; `automated-tests/` (63 Playwright tests: 46 pass, 17 fail by design); `screenshots/` (316 crawl + 5 probe captures); `traces/` (API evidence from both runs, crawl measurements, regression summary, project test results).

Note on the register: for the 34 findings carried over from the first audit, the columns from *Business Impact* to *Regression Test* are the original 2.29.0 text and their evidence paths point to `tio-development-audit/`. What was observed on 2.60.0, and its evidence, is in the columns *State in 2.60.0* and *Observation on 2.60.0*.
