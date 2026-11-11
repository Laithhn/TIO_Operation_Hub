# 13 — End-to-end test results

Scenarios were adapted to the modules that exist. Evidence: `traces/api-test-evidence.jsonl`, `traces/playwright-regression-results.json`, `screenshots/`.

| # | Scenario | Path executed | Result |
|---|---|---|---|
| 1 | Daily operations | Open Command Center → read KPIs → follow each KPI drill-down → open overdue case → inspect owner/status → back | **Pass.** All 10 KPI tiles equal their list totals; back navigation keeps filters. Friction: long page, three filter mechanisms on the list (025, 019) |
| 2 | Implementation tracking | Create client → project (dates, owner) → contract with delivery-schedule fields → environment → servers → installation | **Partly possible.** The structure can be recorded. **Milestone progress, dependencies, go-live readiness and hypercare do not exist as functions** (030); "progress" is a percentage per contract schedule row and was not exercised through the UI |
| 3 | Incident lifecycle | Engineer creates client case linked to SLA contract → manager triages and assigns → start with customer response → waiting on customer → clear → request validation → close with evidence → check timeline and audit | **Pass** (automated: "incident lifecycle" test). Response and resolution = Met; seven timeline events; audit entry present. Weaknesses: manager needed for triage; same person validates and closes (014) |
| 4 | Management reporting | Create known records → preview Cases report with client filter → compare with list → export CSV and Excel → download → second user tries download | **Pass.** 6 = 6 = 6 rows; owner-only download; formula cells neutralised |
| 5 | Cross-module consistency | Create case → global search → case list by client → client page "Cases" tab → dashboard counters before/after → cancel → counters return | **Pass.** Open, Overdue and Unassigned each moved by exactly 1 and returned |
| 6 | Invalid workflow | 39 invalid case steps, 20 commitment steps, 20 escalation steps (wrong order, missing data, stale version, wrong role) | **Pass for transitions** (all refused, data unchanged). **Fail for post-closure edits and SLA integrity** (001–005, 008) |

## Automated suite (57 tests, 4.0 minutes, Chromium 1366×768)

| Spec | Tests | Passed | Failed (all `@defect`) |
|---|---|---|---|
| 01-auth-roles | 7 | 7 | 0 |
| 02-navigation | 6 | 5 | 1 (016) |
| 03-cases-ui-crud | 7 | 6 | 1 (020) |
| 04-business-rules | 9 | 9 | 0 |
| 05-known-defects | 14 | 0 | 14 (001–013) |
| 06-tables-dashboard-reports | 6 | 6 | 0 |
| 07-responsive-journeys | 8 | 7 | 1 (017) |
| **Total** | **57** | **40** | **17** |

The suite creates its own client `TIO_AUDIT_TEST_REG`, removes it in its last test, refuses to run against a non-local host unless explicitly allowed, and never contacts the public map tile server. Run: `cd tio-development-audit/automated-tests && npm ci && npx playwright test --trace off` (the application must be running in Development mode; set `TIOHUB_BASE_URL` if not on port 5094).

Three SLA defect tests wait about one minute each for a one-minute target to expire; that is the reason for the run time.
