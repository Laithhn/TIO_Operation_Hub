# 07 — TIO operations assessment

Question: is the hub fit to run Technology Implementation & Operations for the client portfolio it models? Scale: **Strong / Adequate / Partial / Absent**. "Absent" means no function was found in the UI, the API description (194 paths) or the code.

## Technology implementation

| Capability | Rating | What exists | Gap |
|---|---|---|---|
| Implementation plans | Partial | Projects with status, service dates, products, owner; contract delivery-schedule rows (phase, %, date) | No plan, tasks or baseline |
| Milestones | Partial | Delivery-schedule rows on contracts; commitments of type *Delivery* | No milestone status, no link from milestone to commitment, no slippage view |
| Dependencies | Absent | Firewall rules describe network flows only | No task/milestone or cross-project dependencies |
| Risk management | Absent | Case type *Risk follow-up* (explicitly "does not imply formal risk acceptance") | No risk register, rating or mitigation tracking |
| Resource allocation | Partial | Teams, members, skills, product familiarity; workload report (open/overdue per owner) | No capacity, absence or allocation planning (documented as "Next scope") |
| Go-live readiness | Absent | — | No checklist, sign-off or cut-over record |
| Deployment tracking | Adequate | Product/microservice versions per installation and per server, version history, version matrix, "unknown version" data-quality rule | Recorded manually; no link to a release or change record |
| Handover (project → operations) | Partial | Ownership handover between people with acknowledgement | No project-to-operations acceptance |
| Hypercare | Absent | — | No hypercare period or exit criteria |
| Closure | Partial | Project status *Completed*, archive rules | No closure checklist or lessons learned |

## Technology operations

| Capability | Rating | What exists | Gap |
|---|---|---|---|
| Daily operational activities | Adequate | Action list, attention queue, next action + next review on every open record, stale-review rules | Queue is long (77 items in the seed); no personal "my day" beyond the *My work* filter |
| Task tracking | Adequate | Cases and commitments with owners, deadlines, history | No sub-tasks or checklists |
| Incident management | Adequate | Case type *Incident*, priority, affected environments/servers, documented impact, waiting reasons, Jira references, timeline | No major-incident mode, no communication plan, no link to a problem record; manager-only triage (014) |
| Escalation | Adequate | Client escalations with level 1–3, channel, targets, communications log | Hierarchical escalation only; no automatic functional escalation on SLA risk |
| Service ownership | Strong | Owner, backup, coordinator, responsible party, responsibility boundaries per client, coverage-gap detection, reassignment queue for deactivated owners | Ownership is not an access control (010) |
| SLA monitoring | Partial | Contract targets per priority, support calendar, pause rule, measured response/resolution, dashboard band, report | Integrity problems (001–003, 015), no holiday calendar, no proactive alert outside the app |
| Change management | Absent | Waiting reason *Planned change*; case type *Maintenance coordination* | No change record, approval, calendar or collision check |
| Problem management | Absent | Case type *Problem follow-up* | No root cause, known error or incident-to-problem link |
| Operational risk | Partial | Coverage gaps, contract renewals, data-quality rules | No register |
| Shift handover | Partial | Person-to-person handover of owned records | No shift log |
| Knowledge management | Absent | Private notes only (deliberately not shared) | No shared runbooks or known-issue articles |
| Notifications | Partial | In-app bell and notification centre | Nothing leaves the application (no e-mail, Teams, SMS) — an on-call engineer is not reached |
| Integrations | Absent by design | Manual Jira keys | No Jira, monitoring, CMDB, directory sync or mail |

## Management effectiveness

| Can a TIO manager… | Verdict | Basis |
|---|---|---|
| identify urgent problems? | **Yes** | Attention queue with server-side severity; overdue, unassigned, escalations past target, unavailable environments |
| understand operational health? | **Partly** | Case/commitment/contract health yes; environment health is manual and mostly "Unknown" in the seed |
| track accountability? | **Yes, for visibility** | Owners everywhere, change history with before/after, coverage gaps |
| monitor overdue work? | **Yes** | Verified counts and drill-downs |
| review performance? | **Not reliably** | SLA and on-time figures can be altered (001–005) |
| validate service delivery? | **Partly** | Closure evidence is free text entered by the resolver |
| identify bottlenecks? | **Partly** | Aging buckets and workload exist; no flow metrics (time in status), no trend against previous period |
| generate useful reports? | **Yes** | 13 reports, presets, schedules, CSV/Excel, definitions per column |
| decide on reliable data? | **For volumes yes; for performance not yet** | See 08-DASHBOARD-KPI-VALIDATION.md |

## Operational inefficiencies observed

1. **Double keeping.** Jira remains the ticket system; the hub adds a second record that must be created, linked and progressed by hand. Without at least read-only synchronisation, discipline will decay under load.
2. **Manager as dispatcher.** Triage, assignment, priority and reopen all need the Manage right.
3. **Manual health.** Environment condition older than seven days turns into "Needs verification", creating recurring manual work for 19+ environments.
4. **In-app-only alerts.** Payment, renewal, overdue and SLA-risk notices require someone to open the hub.
5. **Mandatory review dates everywhere.** Every open case needs a next-review time; useful, but it produces "review passed" noise unless reminders reach people.

## Recommendations in order of operational value

1. Protect SLA and delivery measurements (001–005, 015) — prerequisite for any performance use.
2. Outbound notifications (e-mail or Teams) for assignment, SLA risk, overdue and renewals.
3. Read-only Jira synchronisation of status and key dates for linked tickets.
4. Delegated triage and a short path for simple requests.
5. Change calendar (planned changes per environment) linked to cases and condition reports.
6. Implementation module: milestones with status, go-live checklist, hypercare window and exit sign-off per project.
7. Problem records and a shared knowledge base linked from cases.
8. Monitoring feed for environment condition.

## Alignment verdict

The hub is a **good operational register and overview** (clients, environments, versions, contracts, ownership, open work) and a **reasonable light-weight case and commitment tracker**. It is **not yet an ITSM tool** and **not an implementation-management tool**: of 23 capabilities assessed, 1 is strong, 5 adequate, 9 partial and 8 absent (integrations are absent by design).
