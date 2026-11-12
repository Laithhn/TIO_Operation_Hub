# 15 — Coverage and limitations (build 2.60.0)

Full coverage was not achieved and is not claimed. Because 2.60.0 is roughly three times the size of 2.29.0 and the audit time was similar, **relative coverage is lower than in the first audit**; depth was kept on the areas where the first audit found material risk and on the main new control (data scope).

## Covered

| Area | Depth |
|---|---|
| Environment verification | Complete for the local instance |
| Inventory | Routes and API operations complete; new modules described from decisions and screens |
| Tickets, commitments, escalations, SLA | All first-audit rule tests repeated; configurable statuses, comments added |
| Penalties | One scenario (fixed amount per breached response): preview before and after manipulation |
| Data scope | Lists, 34 record routes, writes, dashboards, search, reports, exports, change history, export log |
| Rights | Administration endpoints, client-structure actions, self-escalation, route guards, role without rights |
| Clients, contracts, inventory | Creation and validation rules, archive/delete rules |
| KPIs | 14 figures recomputed in SQL; drill-down consistency; reaction test; scoped dashboard |
| UI | 79 routes × 4 viewports; axe on 79 routes; probes on ticket list, form, ticket page, dialogs, error states |
| Project tests | 755 .NET tests and 268 front-end tests executed unmodified |
| Code | Targeted: access service, cascade endpoint, test factory, module registration, framework facade and vendor notes, decisions A63–A110 (headlines; nine read in full) |

## Not covered

| Not covered | Reason | Effect |
|---|---|---|
| System at `nb01994.vitronic.de` | Not verifiable as development; unreachable | Findings apply to `main` at `fa71ace` built locally |
| **Jira synchronisation** (connections, discovery, mappings, import review, conflicts, first-response recalculation, status-driven closing, contract assignment by date) | Disabled by configuration; no Jira test site | The largest new function is **untested**; no conclusion about it should be drawn from this audit |
| Penalty monthly assessments, caps, confirmation, corrections | Time | Only the ticket-level preview was exercised |
| Scoped right exceptions, role conflicts, access simulation, access review staging, group mappings | Time | Rights model tested through roles and scopes only |
| Report builder, saved definitions, schedules, queued exports, templates (browser and API) | Time | Legacy report preview/export path tested |
| Organisation structure relationships, client logos, contract renewal, payment status action | Time | Organisation create only |
| Audience dashboards' arithmetic | Time | Payload and screens viewed; only Command Center figures recomputed |
| Bulk actions, column chooser, row disclosure in the browser | Time | Seen in screenshots |
| Database upgrade from 2.29-era schema (104 migrations, data-changing ones) | No old database | Upgrade risk unassessed |
| Forms/Windows sign-in, IIS, installer, production configuration | No suitable host | Deployment readiness not rated |
| Load, volume, multi-instance | Not authorised | Performance figures are single-user and were taken under concurrent test load |
| Project browser journeys (`tests/e2e`) | Edge channel, own database | Their results in `docs/TEST-RESULTS.md` are unverified here |
| Notes editor, map interactions, chart accuracy, Excel content | Viewed only | — |
| Screen reader, real devices, other browsers | Tools | Accessibility is tool-based |
| Most source files | Size | Code findings are examples |

## Weaknesses of this audit

- The audit worker restarted three times. The throwaway database was lost twice during 2.60.0 testing; fixtures were rebuilt and affected batteries repeated. Evidence from before and after is kept separately. The final regression result is a merge of three partial runs made within minutes of each other on one database.
- Some first-run API steps "failed" only because scripts written for 2.29.0 met changed behaviour (data scope, shorter close path); they are in the log and are not counted as findings.
- Page timings were taken while the project's test suite was running.
- Intermediate values in the penalty demonstration were not read between the four manipulating actions; only the start (EUR 4,000) and end (EUR 0) values were captured.
- Whether a *confirmed* penalty assessment survives later manipulation was not tested.
- Scores are expert judgement anchored to counted evidence.

## Residual data

All synthetic records lived in the disposable container database, which is discarded. The automated suite removed its own client and users in its last test.

## Completion criteria (Phase 19)

| # | Criterion | Status |
|---|---|---|
| 1 | Environment confirmed as development | Met (local instance; Jira off; reference URL excluded) |
| 2 | Modules inventoried | Met |
| 3 | Every discovered feature has a testing status | Met (inventory and coverage matrix), with many "Viewed" or "Not tested" |
| 4 | Functional and business-logic testing executed | Met for work records and data scope; partial elsewhere |
| 5 | Synthetic records used | Met |
| 6 | UI/UX assessed independently | Met |
| 7 | GUI framework evaluated separately | Met — this time against the real framework |
| 8 | Dashboards/KPIs validated where data permitted | Met for Command Center counts; partial for the new dashboards |
| 9 | Source findings referenced | Met |
| 10 | Confirmed defects have evidence | Met |
| 11 | Duplicates consolidated | Met (37 issues, penalties folded into 001–003 and 011) |
| 12 | Artefacts and reports generated | Met |
| 13 | Limitations documented | Met |
| 14 | No production system or data modified | Met — no VITRONIC, Jira or production system was contacted |
| 15 | Verdict reflects coverage | Met |
