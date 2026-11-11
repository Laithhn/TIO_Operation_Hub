# 01 — Executive summary

**System:** TIO Operations Hub, build 2.29.0 (commit `26b7cf8`). **Environment:** isolated local development instance built from the repository (report 00). **Date:** 11 November 2026. **Type:** independent technical, functional, business and design audit. The reference system `nb01994.vitronic.de` was not tested because its development status could not be verified.

## Verdict

### CONDITIONAL GO — to continue toward release, not for production

The tested development build is technically sound and may proceed to further UAT **once the five "Immediate" actions in report 14 are done**. It must **not** be used for contractual SLA reporting or delivery-performance reporting before then. This verdict concerns the development build only; it is not a production certification (sign-in modes, hosting, load and security testing remain open — report 15).

## Why

**The engineering base is good.** Across 215 scripted API checks, 57 browser tests and 256 page loads there was no crash, no JavaScript exception, no authorization bypass and no wrong count. Validation, status transitions, concurrency control, audit history, file handling and export are implemented carefully. All 16 dashboard figures recomputed independently in SQL matched exactly.

**The measurements the product exists to provide can be altered.** Four P1 findings share one theme — the record of what happened is not protected:

| ID | Finding | Demonstrated effect |
|---|---|---|
| 001 | Changing a case priority erases a recorded SLA breach | Breached → Met |
| 002 | An engineer can unlink the contract from a breached case | Breach disappears from every figure |
| 004 | Closed cases remain editable | Priority and due date changed after closure |
| 005 | An owner can move a missed deadline and complete "on time" | Late → Completed on time |

With three ordinary actions on synthetic cases, response compliance for the test client went from one in four to **100 %**.

**The interface is coherent but dense, small and dated**, with defects at the most common laptop resolution, and the "VITRONIC GUI framework" is in fact custom CSS copied from a screenshot.

**The product is an operations register and light case tracker, not yet an ITSM or implementation-management tool.** Of 23 TIO capabilities assessed, 8 are absent (change, problem, knowledge, risk, dependencies, go-live readiness, hypercare, integrations).

## Findings by priority

| Priority | Count | Issues |
|---|---|---|
| P0 Critical | 0 | — |
| P1 High | 4 | 001, 002, 004, 005 |
| P2 Medium | 14 | 003, 008, 009, 010, 011, 014, 015, 016, 017, 018, 019, 021, 024, 026 |
| P3 Low | 13 | 006, 007, 012, 013, 020, 022, 023, 025, 027, 028, 029, 031, 032 |
| P4 Enhancement | 3 | 030, 033, 034 |
| **Total** | **34** | 33 confirmed at run time or by direct inspection, 1 probable (027); all with evidence |

## Scorecard

**Method.** Each dimension starts from the share of executed checks that behaved correctly, then is adjusted for the severity of confirmed findings in that dimension (guide: P1 −10, P2 −4, P3 −1.5) and capped where coverage was thin. Scores are expert judgement anchored to counted evidence; ±5 points is within the method's precision.

| Dimension | Score | Basis |
|---|---|---|
| Functional reliability | **82** | 0 crashes or exceptions; transitions, validation and concurrency correct; defects in post-closure edits, duplicates, date sanity |
| Business logic quality | **58** | Four P1 and five P2 logic/integrity findings in the core SLA and commitment rules |
| Workflow efficiency | **60** | Clear lifecycle and next-action discipline; manager bottleneck, five-step minimum, self-validation, all-manual entry |
| UI visual quality | **62** | Consistent and calm; small type, 14 font sizes, two visual languages, clipped header at 1366 px |
| User experience | **60** | Strong content and form feedback; weak filtering, action hierarchy, recovery and mobile use |
| VITRONIC GUI framework quality | **50** | No shared framework exists; screenshot-derived custom kit; reference geometry limits usability; adequate component consistency |
| Data integrity | **62** | Audit trail, concurrency and referential rules strong; finished records and measurements mutable; hard delete; missing uniqueness |
| Performance | **85** *(development volume only)* | Median page 0.7 s, APIs 20–200 ms, no errors; no volume evidence |
| Accessibility | **58** | Good semantics, skip link, labels, focus ring; 81 contrast failures, 38 % small targets, reflow and focus-management gaps |
| Security controls | **74** *(Forms/Windows sign-in not tested)* | Authorization, antiforgery, headers, input handling verified; ownership not enforced, weak delete safeguards, open production decisions |
| TIO operational alignment | **55** | Strong register and ownership model; 8 of 23 capabilities absent, no outbound notification or integration |
| Overall operational readiness | **62** | Ready for continued UAT after the Immediate fixes; not ready for production or performance reporting |

Deployment readiness: **Not rated** (insufficient evidence).

## Answers to the audit questions

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Functionally reliable? | **Yes, largely.** No failures of basic operation in any test | Reports 03, 13 |
| 2 | Business logic correct? | **Partly.** Entry rules and transitions are correct; rules that protect history and measurements are missing | Report 04; issues 001–009 |
| 3 | Workflows operationally effective? | **Adequate for a small team with an always-available manager**; otherwise they stall at triage and add manual effort | Report 04 §3; issue 014 |
| 4 | Dashboards and KPIs trustworthy? | **Counts yes; SLA and on-time rates not yet** | Report 08 |
| 5 | Interface professionally designed? | **Competent but dated and too small**; not at the level of a current enterprise product | Reports 05, 06 |
| 6 | Experience intuitive and efficient? | **For simple paths yes**; lists, action menus and the dashboard need redesign | Report 05; issues 019, 021, 025 |
| 7 | Does the VITRONIC GUI framework improve or limit quality? | **It limits it** — and it is not a framework here but an imitation of a screenshot | Report 06; issue 024 |
| 8 | Components to redesign? | Shell/navigation, data table, dialog, feedback states, form layout, type and size tokens, Command Center | Report 06 |
| 9 | Business rules to reconsider? | SLA immutability, reported time, commitment revision approval, triage authority, validation independence, ownership as control, delete versus archive | Report 04 §4 |
| 10 | Highest operational impact? | 001, 002, 005 (misleading performance figures), 004 (rewritable history), 014 (stalled cases), 016 (navigation on laptops) | Issue register |
| 11 | Fix immediately? | I1–I5 in report 14: freeze SLA results, freeze finished records, commitment timeliness, back-dated responses, cascade-delete safeguards | Report 14 |
| 12 | Architectural improvement? | Workflow domain layer with a transition table, append-only SLA records, portable tests with CI, job coordination, a real design system | Report 09 |
| 13 | What works well? | Validation and error messages, optimistic concurrency, audit trail, authorization, attachments and notes security, reports and exports with definitions, KPI arithmetic, URL-backed navigation, form resilience offline | Report 03 |
| 14 | What remains untested? | Deployed instance, production sign-in, IIS deployment, load, project e2e suite, many secondary functions | Report 15 |
| 15 | Suitable to progress toward release? | **Yes, conditionally** — after the Immediate actions, with the audit regression suite (17 failing defect tests) as exit criteria, and with the production-readiness work in S5 still to come | This report |

## Recommended next steps

1. Approve the Immediate list (report 14) and the product decisions it needs (override policy, KPI definition).
2. Put the audit regression suite and the existing tests into a CI pipeline.
3. Decide the UI direction (report 06, option B recommended).
4. Schedule the production-readiness work: sign-in decision, load test, penetration test, deployment rehearsal.

## Deliverables

| File | Content |
|---|---|
| `00`–`15` reports | This folder |
| `MASTER-ISSUE-REGISTER.csv`, `issues/` | 34 findings with all required fields |
| `TEST-COVERAGE-MATRIX.csv` | Feature-level coverage and results |
| `automated-tests/` | 57 reusable Playwright tests (40 pass, 17 fail by design until the defects are fixed) |
| `screenshots/` | 256 crawl captures (4 viewports) and 8 probe captures |
| `traces/` | API evidence log (215 steps), crawl measurements, Playwright results, existing-test results |
