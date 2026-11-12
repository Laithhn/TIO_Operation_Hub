# 07 — TIO operations assessment (build 2.60.0)

Scale: **Strong / Adequate / Partial / Absent**. Arrows show movement since 2.29.0.

## Technology implementation

| Capability | 2.29.0 | 2.60.0 | What changed |
|---|---|---|---|
| Implementation plans | Partial | Partial | — |
| Milestones | Partial | Partial ↑ | Contract milestones now feed a rule-based *Delivery* signal on the Client dashboard (late milestones → at risk / off track) |
| Dependencies | Absent | Absent | — |
| Risk management | Absent | Partial ↑ | Recorded client status (On track / At risk / Off track) with reason and next review, plus six rule-based signals; still no risk register |
| Resource allocation | Partial | Partial | Team workload on the Operational dashboard |
| Go-live readiness | Absent | Absent | — |
| Deployment tracking | Adequate | Adequate | Servers also record IP address, VLAN, notes |
| Handover | Partial | Partial | — |
| Hypercare | Absent | Absent | — |
| Closure | Partial | Partial | Contract renewal action added |

## Technology operations

| Capability | 2.29.0 | 2.60.0 | What changed |
|---|---|---|---|
| Daily operational activities | Adequate | **Strong** ↑ | My dashboard, Operational dashboard, quick views, bulk selection |
| Task tracking | Adequate | Adequate | Comments and activity stream on tickets |
| Incident management | Adequate | Adequate ↑ | Shorter path; Jira tickets can be mirrored (if enabled); still no major-incident mode or problem link |
| Escalation | Adequate | Adequate | — |
| Service ownership | Strong | Strong | Per-client data scope added |
| SLA monitoring | Partial | Partial | Dedicated dashboard, penalties, Jira-based start and first response for synchronised tickets — but results still rewritable (001–003) |
| Change management | Absent | Absent | — |
| Problem management | Absent | Absent | — |
| Operational risk | Partial | Partial ↑ | Client signals |
| Shift handover | Partial | Partial | — |
| Knowledge management | Absent | Absent | — |
| Notifications | Partial | Partial | Still in-app only |
| Integrations | Absent | **Partial** ↑ | Read-only Jira Cloud synchronisation with mappings, import review, conflict handling and a sync monitor. **Disabled and untested in this audit** |

Totals over 23 capabilities:

| | Strong | Adequate | Partial | Absent |
|---|---|---|---|---|
| 2.29.0 | 1 | 5 | 9 | 8 |
| 2.60.0 | 2 | 4 | 11 | 6 |

## Management effectiveness

| Can a TIO manager… | 2.29.0 | 2.60.0 |
|---|---|---|
| identify urgent problems? | Yes | Yes |
| understand operational health? | Partly | Partly ↑ (client status and signals; environment health still manual) |
| track accountability? | Yes | Yes |
| monitor overdue work? | Yes | Yes |
| review performance? | Not reliably | **Not reliably** — same integrity gaps; now with penalties and trend comparisons built on them |
| validate service delivery? | Partly | Partly |
| identify bottlenecks? | Partly | Partly ↑ (backlog trend, previous-period comparison) |
| generate useful reports? | Yes | Yes ↑ (report builder, saved definitions, queued exports) |
| decide on reliable data? | Volumes yes; performance not yet | **Unchanged** |

## Operational observations

1. **Double keeping is being addressed** by Jira synchronisation; its value depends on mapping quality (users, statuses, spaces, contracts) and could not be judged here.
2. **Triage authority** can now be delegated through rights (`Cases:Coordinate`) without making someone a manager; the default roles still concentrate it.
3. **Nothing leaves the hub**: no e-mail, Teams or SMS for assignment, SLA risk or renewals. This remains the largest practical gap for on-call work.
4. **Client status is manual** and empty for every seeded client; the signals help, but the dashboard needs a reporting routine to be useful.
5. **Penalties** make the hub commercially relevant; the data behind them is not yet protected.

## Recommendations in order of operational value

1. Protect SLA, penalty and delivery measurements (001–005, 015).
2. Outbound notifications.
3. Validate and switch on Jira synchronisation in a controlled pilot, with a mapped test space.
4. Grant Coordinate to team leads by default or auto-triage Critical tickets.
5. Change calendar; go-live checklist and hypercare per project; problem records; shared knowledge base.
6. Monitoring feed for environment condition.

## Alignment verdict

Stronger than 2.29.0 for daily operations, access control and management overview. Still not an ITSM tool (no change, problem or knowledge practice) and not an implementation-management tool. Its most valuable new function (Jira synchronisation) is untested in this audit.
