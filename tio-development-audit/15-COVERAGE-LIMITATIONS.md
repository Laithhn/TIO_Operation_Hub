# 15 — Coverage and limitations

Full coverage was **not** achieved and is not claimed. This file states what the conclusions rest on.

## What was covered

| Area | Depth |
|---|---|
| Environment verification | Complete for the local instance used |
| Module inventory | Complete for routes in the router and paths in the API description |
| Cases, commitments, escalations, contractual SLA | Deep: positive, negative, role and integrity tests through the API; main case flows through the browser |
| Clients, projects, contracts, environments, servers, firewall rules, installations | Creation rules, uniqueness, archive/delete rules through the API; pages viewed |
| Dashboard KPIs and reports | Recalculated in SQL (16 figures), drill-down consistency (10), reaction to synthetic data, 13 report previews, CSV export |
| Roles and security behaviour | Manager, engineer, custom role without rights, unknown and deactivated accounts |
| UI | 64 routes at four viewports (screenshots, console, network, overflow), axe on 64 routes, targeted probes on the case list, case form and dialogs |
| Code | Security module, `Program.cs`, case endpoints (lines 1–618 read in full), targeted reading of SLA, commitments, escalations, cascade, shared services, front-end API client, tokens |
| Existing tests | 140 .NET tests executed on an adapted copy |

## What was not covered, and why

| Not covered | Reason | Effect on conclusions |
|---|---|---|
| The system at `https://nb01994.vitronic.de/` | Not verifiable as development; not reachable | Findings apply to build 2.29.0 from the repository. A deployed instance may differ in version, configuration and data |
| Forms and Windows sign-in in the browser; lockout; session expiry; first-administrator setup; password change | Development build uses the development sign-in | Security score rests on API behaviour and code review for these parts |
| IIS hosting, installer/upgrade/backup scripts, production configuration, TLS | No Windows/IIS host | Deployment readiness **not rated** |
| Load, volume, endurance, multi-instance behaviour | Not authorised; demo data only | Performance score is for single-user development conditions |
| Project e2e suite (`tests/e2e`) | Needs Microsoft Edge and LocalDB | Its 44 journeys are unverified by this audit |
| Three failing .NET tests on Linux | Likely path handling; no Windows host to compare | Reported as "needs verification", not as defects |
| Excel export content, scheduled reports, presets through the UI | Time | Covered only by project tests |
| Notes editor UI, map interactions, chart rendering accuracy | Viewed only | No finding should be read as "works" for these |
| Copy/clone of servers and environments, version changes, hosted microservices, handovers, reassignment queue, review policies, configuration lists, Jira instances, group mappings, settings edits, storage move | Rendered only (some covered by project tests) | Untested by this audit |
| Update operations for client, project, contract, environment and server through UI or API | Time | CRUD table in report 03 marks them "—" |
| Screen reader, real mobile devices, browsers other than Chromium | Tools/time | Accessibility and responsive results are tool-based |
| Remaining source files (about 60 % of back-end lines and most page components were not read line by line) | Time | Code findings are examples, not an exhaustive list |
| User research | Out of scope | UX conclusions are expert review, not observed user behaviour |
| The business requirements document (BRD v1.0) | Not in the repository | Requirements coverage could not be verified against the source document; `docs/REQUIREMENTS-COVERAGE.md` was not audited |

## Known weaknesses of the audit itself

- 17 of 215 scripted API steps failed because of the auditor's test input and were repeated; both attempts are in the evidence log.
- The audit worker restarted after testing and cleanup had finished; the local application and database container stopped with it. Evidence files were unaffected, but later re-verification of individual figures was not possible in the same instance.
- Screenshots were colour-reduced to limit repository size; they remain legible but are not pixel-exact.
- Counts of synthetic records are approximate because the automated suite ran several times.
- Scores in the executive summary are an expert judgement anchored to counted evidence, not a certified metric.

## Residual data

Three deactivated users (`DEV\tio_audit_test_ro`, `…_noedit`, `…_norole`) and two roles (`TIO_AUDIT_TEST_ReadOnly`, `TIO_AUDIT_TEST_NoEdit`) could not be removed through the application (TIO-DEV-AUDIT-034). They existed only in the disposable audit database.

## Completion criteria (Phase 19)

| # | Criterion | Status |
|---|---|---|
| 1 | Environment confirmed as development | Met (local instance); reference URL excluded |
| 2 | All accessible modules inventoried | Met |
| 3 | Every discovered feature has a testing status | Met (inventory and coverage matrix) |
| 4 | Functional and business-logic testing executed where permitted | Met for work records; partial elsewhere |
| 5 | CRUD and workflow scenarios used synthetic records | Met |
| 6 | UI/UX assessed independently | Met |
| 7 | GUI framework evaluated separately | Met, with the caveat that no framework exists in the code |
| 8 | Dashboards and KPIs validated where data permitted | Met for counts; partial for charts |
| 9 | Source findings include references | Met |
| 10 | Every confirmed defect has evidence | Met |
| 11 | Duplicates consolidated | Met (34 issues) |
| 12 | Test artefacts and reports generated | Met |
| 13 | Blocked scenarios and limitations documented | Met (this file) |
| 14 | No production system or data modified | Met — no VITRONIC or production system was contacted; only public package sources were used to install tools |
| 15 | Verdict reflects actual coverage | Met |
