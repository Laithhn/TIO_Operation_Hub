# TIO Operations Hub — executive audit assessment

**Release recommendation: INSUFFICIENT EVIDENCE.** The inspected application supports useful daily operational review, but the audit cannot establish enterprise readiness. Seven confirmed presentation, reporting and audit-history defects need correction. Complete record lifecycles, role isolation, delivery/export behavior and recovery remain untested because approved test accounts/data and an isolated environment were unavailable. No Critical/P0 or High/P1 software defect was confirmed within the tested scope.

**Assessment:** 10 November 2026, Asia/Dubai. **Target:** https://nb01994.vitronic.de/. **Observed release:** 2.59.0. **Access:** existing TIO Manager session (`lmh`), ChatGPT in-app browser ID2; engine/build not recorded. Local source documents 2.60.0/A109 and informs hypotheses only. The production application continued operating during the audit, so counts captured at different times are not a frozen dataset. [Environment and limits](11-test-blockers-and-limitations.md).

## Overall application health and operational readiness

The hub has a broad connected model: clients, projects, contracts, environments, installations, servers, components, products, tickets, commitments, escalations, teams and handovers. Audience dashboards and a Reporting Center make substantial existing data accessible. The continuous dashboard → overdue queue → ticket → reload → browser Back journey succeeded. This demonstrates practical value for a manager reviewing current work. It does not prove record changes, incident resolution, deployment approvals or automated delivery. [Executed journeys](09-end-to-end-test-results.md).

The most consequential observed management risks concern accountability and evidence freshness. The sampled view contained 183 open tickets, 73 past due and 104 without a hub owner. Data quality reported 263 rule items, including 231 missing-owner items; these populations overlap and must not be added together. Management showed 12/12 projects without a recorded status and 7/9 environments never reported. Existing environment conditions are explicitly manual, rather than live service monitoring. These are operational data/governance observations, not proof of application failure. [Governance evidence and owners](06-business-process-gaps.md).

## Quantitative findings

The unit of inventory is a functional group, not a menu item, source route pattern or database entity. The coverage CSV is the authoritative scenario ledger. Its blocked rows represent workflow families, not every possible input permutation.

| Measure | Result |
|---|---:|
| Discovered functional groups | 29 |
| Groups with some live testing | 28, all Partial |
| Fully tested groups | 0 |
| Blocked group | 1 — Personal notes |
| Selected route entries tested at all four viewports | 91 |
| Route × viewport geometry checks | 364 |
| Total recorded scenarios/checks and blocked families | 465 |
| Passed within the explicit assertion | 429 |
| Failed | 7 |
| Blocked | 29 |
| Confirmed P0 / P1 / P2 / P3 | 0 / 0 / 4 / 3 |
| Catalog report previews actually executed | 14 |
| Prepared reusable Playwright definitions | 298, unexecuted against target |
| Local request-safety policy tests executed | 8 passed |

The 429 passes comprise **364 layout geometry checks, 14 read interactions, 20 selected read tabs, 14 catalog previews, 11 displayed-arithmetic checks and six anonymous HTTP samples**. They must not be interpreted as a 92% functional-completeness claim. Layout checks assert document width and absence of a captured error alert; screenshots have separate visual/capture limitations. Other read observations provide context without being counted again as passes. [Coverage CSV](03-test-coverage-matrix.csv), [machine summary](traces/audit-summary.json), [methodology](05-ui-ux-audit.md).

## What works in the tested scope

- The executive, personal, operational, SLA/contracts, management and deployed Project dashboards rendered. The overdue KPI led to the correct filtered 73-row ticket list; an existing ticket opened, reloaded and returned through browser Back with settled content.
- Exact/partial/no-match ticket searches, next-page navigation, both sort-state directions, global search navigation, country selection and the inspected ticket/environment tabs produced the recorded results. These are selected interactions, not all table controls or all records.
- All 14 catalog previews returned rows/totals. The unfiltered ticket builder showed 1,949 matches and the critical/high template showed 23, matching the sampled dashboard priority sum. No export file or scheduled delivery was generated.
- Displayed ticket partitions, backlog change and SLA fractions reconcile arithmetically. Response 9/45 is 20%, resolution 6/39 rounds to 15.4%, both-completed tickets 1/39 rounds to 2.6%, and combined measured obligations 15/84 rounds to 18%. These are distinct defined metrics. No independent database/calendar recomputation was performed.
- Two sampled protected APIs denied anonymous requests with empty 401 responses. The sampled HTTPS responses included protective headers. This narrow result does not certify RBAC or application security. [Security report](07-security-observations.md).

## What is broken and what to fix first

| Issue | Severity | Confirmed outcome | Suggested owner |
|---|---|---|---|
| [TIO-BUG-001](issues/TIO-BUG-001.md) | P2 | Client ticket summaries and global search expose internal status instead of the configured label used by the register/detail. | Ticket/API/frontend owners |
| [TIO-BUG-002](issues/TIO-BUG-002.md) | P2 | Existing audit history displays a negative generated-looking TIO user identifier. Actual FK corruption was not demonstrated. | Backend/audit owner |
| [TIO-BUG-004](issues/TIO-BUG-004.md) | P2 | Mobile Notifications title, badge and actions overlap. | Frontend/UI owner |
| [TIO-BUG-006](issues/TIO-BUG-006.md) | P2 | Tickets catalog Status choices omit active configured statuses. | Reporting/API owner |
| [TIO-BUG-003](issues/TIO-BUG-003.md) | P3 | Desktop ticket Details/selection headers reverse their body column order. | Shared table/UI owner |
| [TIO-BUG-005](issues/TIO-BUG-005.md) | P3 | A Completed export with masked details offers no reason or recovery guidance. The access check itself is intentional. | Reporting/product owner |
| [TIO-BUG-007](issues/TIO-BUG-007.md) | P3 | A ticket list type hint shows raw Incident while its detail shows configured Bug. | Ticket/frontend owner |

The P2 fixes should be prioritized together: operational status consistency, audit traceability, usable mobile alerts and configured-status reporting. P3 corrections should follow in the same maintenance cycle where feasible. No critical blocker was manufactured from a cosmetic defect or from missing requirements. [Full records](04-detailed-bug-report.md), [consolidated register](12-consolidated-issue-register.csv).

For management grouping,001/006 concern Business Logic,005/007 UX,002 Data,004 UI and003 Accessibility. The register also supplies secondary categories. Cross-view status/type consistency, unavailable-export guidance and mobile overlap all affect user productivity, but category totals must not be added to defect totals as additional issues. No automated accessibility engine was run. [UI/UX assessment](05-ui-ux-audit.md).

## Operational readiness dimensions

Scores require representative evidence for the whole dimension. The broad read-only sweep does not supply that denominator, so numeric scores would be speculative.

| Dimension | Score | Evidence-based rationale and missing assurance |
|---|---|---|
| Functional Reliability | Not Rated | Useful read journeys/previews passed; create/update/archive, validation, transition and concurrency behavior remain blocked. |
| UI/UX Quality | Not Rated | Four-size geometry sweep and selected visual/keyboard review completed; three UI/accessibility/UX classes of defects and capture limitations remain, with incomplete below-fold/dialog/assistive testing. |
| TIO Workflow Alignment | Not Rated | Connected operational registers are useful; full incident, handover, implementation acceptance and change/release governance were not demonstrated. Scope decisions are required. |
| Data Integrity | Not Rated | Displayed arithmetic reconciles; status presentation and audit identifier defects exist. Persistence, concurrent writes and source-system reconciliation were not tested. |
| Security Observations | Not Rated | Sampled anonymous denial/headers are positive. Only one existing role was available; session/permission/API allow-deny matrices were not executed. |
| Performance | Not Rated | Six single native HTTP timings and three UI-reported query durations are available; no controlled browser load profile, percentiles, memory or capacity/recovery evidence. |
| Reporting & Analytics | Not Rated | 14 read previews returned results; configured-status filtering fails, and file contents/schedules/recipient isolation remain unverified. |

## Leadership decisions and release conditions

1. Establish an isolated approved environment, test roles and disposable fixtures. Execute blocked lifecycles, allow/deny cases, validation, export/scheduling and failure/recovery scenarios before seeking an enterprise release recommendation.
2. Correct the seven confirmed defects with their acceptance criteria and isolated regressions. Preserve access-fingerprint export masking; do not rewrite historical audit data without an approved correction process.
3. Assign owners to high-priority unassigned work, aged tickets, missing data, stale environment evidence and the two observed Jira mapping conflicts. Review CT-1001 holiday-exclusion terms before relying on affected SLA/penalty results; no incorrect individual deadline was proved.
4. Decide the systems of record for deployment readiness, go-live/rollback approval, change/release control, shift capacity and live monitoring. Their absence from inspected hub workflows is a potential business gap, not an agreed software defect.

These conditions explain **INSUFFICIENT EVIDENCE**: the audit found usable read capability and concrete repair work, but cannot approve enterprise operations from one role and untouched production records. It also cannot justify a blanket NO-GO from the tested defects alone. [Roadmap](10-recommendations-roadmap.md), [performance limits](08-performance-report.md).

## Change and test control

Only audit reports, evidence and reusable test scaffolding were created under `tio-audit/`. Application source, production configuration, roles, records and integrations were not changed. No database commands, migrations, seed changes, external services, commits or pushes were performed. No new rights, configuration or seed data were needed for this audit. Relevant local checks validated evidence/CSV consistency, JavaScript syntax, eight request-policy tests and discovery of 298 prepared Playwright cases; target execution of that scaffold did not occur. Suggested next action: approve isolated test accounts/data and use the issue acceptance criteria plus blocked coverage ledger to complete assurance.
