# 13 — End-to-end test results (build 2.60.0)

| # | Scenario | Path executed | Result |
|---|---|---|---|
| 1 | Daily operations | Command Center KPIs → each drill-down → ticket → back; engineer lands on My dashboard | **Pass.** 10 of 10 tiles equal their lists; engineer start page correct |
| 2 | Implementation tracking | Client → project → contract (SLA targets, penalty clause) → environment → servers → installation; client status report | **Partly possible.** Structure and a recorded client status exist; the Client dashboard derives a "Delivery" signal from contract milestones. Plans, dependencies, go-live readiness and hypercare still do not exist (030) |
| 3 | Incident lifecycle | Engineer creates ticket linked to SLA contract → manager triages and assigns → start with customer response → waiting → clear → close with evidence → timeline and audit | **Pass.** Response and resolution Met; path is one step shorter than in 2.29.0 (no validation step by default). Manager still needed for triage |
| 4 | Management reporting | Known records → Tickets report preview → compare with list → CSV export → download → other user | **Pass.** Counts equal; owner-only download; formulas neutralised |
| 5 | Cross-module consistency | Ticket → search → client's active work → filtered ticket list → dashboard counters before/after → cancel | **Pass** |
| 6 | Invalid workflow | Wrong order, missing data, stale version, wrong role, cross-stage status change | **Pass for transitions; fail for post-closure edits and SLA/penalty integrity** (001–005, 008) |
| 7 | Data scope (new) | Scoped engineer against lists, 34 record routes, writes, dashboards, search, reports, change history | **Pass except change history** (035) |

## Automated suite — 63 tests, Chromium 1366×768

Run in three parts after a worker restart interrupted the single run; results merged in `traces/playwright-regression-summary.json`.

| Spec | Tests | Passed | Failed (all `@defect`) |
|---|---|---|---|
| 01-auth-roles | 7 | 7 | 0 |
| 02-navigation | 7 | 6 | 1 (036) |
| 03-cases-ui-crud | 7 | 7 | 0 |
| 04-business-rules | 9 | 9 | 0 |
| 05-known-defects (carried over from 2.29.0) | 14 | 0 | 14 (001–013) |
| 06-tables-dashboard-reports | 6 | 6 | 0 |
| 07-responsive-journeys | 8 | 8 | 0 |
| 08-scope-and-penalties (new) | 5 | 3 | 2 (035; penalties under 001/002/003/011) |
| **Total** | **63** | **46** | **17** |

### Comparison with the first audit

| | 2.29.0 | 2.60.0 |
|---|---|---|
| Tests | 57 | 63 |
| Passed | 40 | 46 |
| Failed (defect tests) | 17 | 17 |
| Defect tests from 2.29.0 that now pass | — | 3 (navigation at 1366 px, phone overflow, route guard) — converted to regression tests |
| Defect tests from 2.29.0 still failing | — | 14 of 14 API-level tests |
| New defect tests | — | 3 (change-history scope, unknown address, penalties) |

The suite was adapted to 2.60.0: labels ("Tickets"), the "More" menus, the shorter close path, and its own two engineers scoped to the synthetic client. It refuses non-local hosts unless explicitly allowed, never contacts the map tile server, and removes its client and users in its last test. Run: `cd tio-development-audit-2.60.0/automated-tests && npm ci && npx playwright test --trace off`.
