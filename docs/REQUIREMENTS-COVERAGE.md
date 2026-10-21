# Requirement coverage

Source: standalone BRD v1.0 (16 October 2026): 105 requirements, 79 MVP and 26 Next. MVP rows marked Implemented: 79 of 79 (three of them carry an open BRD decision or production evidence). Evidence names refer to test classes in `tests/TioHub.Tests` (AC-xx) and `tests/e2e/journeys.spec.ts`.

Status values: **Implemented** = built end to end, enforced on the server and tested. **Implemented; ... open/pending** = built, but a BRD open decision or production evidence remains. **Deferred (Next)** = outside MVP and not exposed in the UI.

| ID | Release | Status | How it is met | Evidence |
|---|---|---|---|---|
| ACC-01 | MVP | Implemented | Forms sign-in (default since 2.1.0: hub-held accounts, PBKDF2 hashes, lockout, temporary passwords, session stamps, one-time setup code) or Windows sign-in, or isolated dev sign-in; unknown, unmapped or deactivated accounts refused before any endpoint (`Security/SignIn.cs`, `Security/AuthEndpoints.cs`, `Security/Passwords.cs`). | AC14 Unmapped_accounts_are_refused; AC09; FormsSignInTests; PasswordTests |
| ACC-02 | MVP | Implemented — **simplified by A22** | Two roles, one TIO team: every user with a role sees every client and internal team. The scope query filters remain in place (they now admit everything for a role holder) so per-client scoping can be re-enabled without schema change. | AC12 Two_roles_both_see_everything… |
| ACC-03 | MVP | Implemented — **A22** | Owner/project-manager changes, triage, assignment of others, handovers, archive/restore and client structure (clients, regions, projects) only by the TIO Manager; Operation Engineers do day-to-day work and may take unassigned work themselves. | AC06; AC12 Operation_engineers_do_day_to_day… |
| ACC-04 | MVP | Implemented | Deactivation keeps identity and history; active records appear in the reassignment queue; nothing is reassigned automatically. | AC09 |
| ACC-05 | MVP | Implemented | Access changes and privileged actions audited (Access category) with before/after values and reasons. Nobody grants their own access: an administrator cannot change their own roles/scope/grants, and (since 2.0.1) cannot create, edit or rename a group mapping for a directory group they belong to. | AC12 Revoked_access; AC12_NoSelfGrantThroughGroups; AC13 |
| CLI-01 | MVP | Implemented — **changed by owner decision A21** | Immutable ID, unique reserved **alias** (stored as code), name, **country required from the world list** (no Unknown), status **Opportunity / Active** (Archived via archive), **project manager**, contacts. | AC02 Clients_need_a_listed_country…; e2e |
| CLI-02 | MVP | Implemented | Projects with code, owner, status, scope summary, supported products, service dates. | UI; AC12 (project scope) |
| CLI-03 | MVP | Implemented | Client 360: optional regions, projects, environments, installations, infrastructure totals, open/overdue work, commitments, documents. Change records labelled as Next release. | AC01; e2e |
| CLI-04 | Next | **Implemented early** (19 Oct 2026, owner request) | Contracts per client (optional project): reference, type, status, term, renewal terms, notice period, owner, support model/hours/zone, on-site staffing, coverage, obligations, covered products and environments, recorded SLA targets per priority. Unknown values stay empty and are shown as Unknown. No amounts, no SLA measurement or compliance calculation (BRD exclusions). Renewal visibility (AC-20 contract part): Expired-but-Active, renewal due (notice deadline or end within 90 days) and missing end date appear in the action list (`ContractRenewal`) and the Executive overview. | AC20; e2e contracts journey |
| CLI-05 | MVP | Implemented | Archive with reason; active records need a Manager exception; history retained; restore re-checks role and scope. | AC13 |
| REG-01 | MVP | Implemented | Zero or many regions; code unique per client; owner; history; no placeholder regions. | AC01 |
| REG-02 | MVP | Implemented — **tightened by A21** | Region must belong to the environment client; null region only for clients without regions (a client with regions has no direct environments). | AC01; AC01b_EnvironmentRules; e2e |
| REG-03 | MVP | Implemented | Name unique within client + region scope (computed RegionScope; null = one direct scope); Production per region allowed. | AC01 |
| REG-04 | MVP | Implemented | Environment 360 shows each installation, its components and supporting servers; no fixed topology. | AC03; UI |
| REG-05 | MVP | Implemented | Client 360 groups by regions only when present; optional region filter; no double counting. | AC01 |
| REG-06 | MVP | Implemented | Region reassignment needs a reason and is audited; cross-client and name conflicts rejected; archival blocked while active environments remain. | AC01 |
| ENV-01 | MVP | Implemented — **changed by A21** | Client, region (required when the client has regions), optional project, name, type, hosting **On-prem / Cloud / Unknown**, location, criticality, technical owner, **optional operation engineer and backup operation engineer** (no gap reason; missing backup on Critical/High still listed as a coverage gap). | AC01; AC01b_EnvironmentRules; e2e |
| ENV-02 | MVP | Implemented | Named installations per environment/product/module; several instances of a product; version, deployment date, notes, review history. | AC03 |
| ENV-03 | MVP | Implemented | Links to assets, components, endpoints, dependencies, document references; Next items are not prerequisites. | AC03, AC05 |
| ENV-04 | MVP | Implemented | Manual condition reports with reason, evidence, observation time and recorder; history kept; separate from inventory review. | AC10 |
| ENV-05 | MVP | Implemented | Unknown when no report; stale evidence keeps the value and shows Needs verification. | AC10 |
| ENV-06 | MVP | Implemented | Filterable version matrix; product-specific versions; traceable history. | AC03 |
| WRK-01 | MVP | Implemented | Case with title, type, impact, priority, team, owner or Unassigned, status, next action, next review. | AC06; e2e |
| WRK-02 | MVP | Implemented | Client-related vs Internal independent of type; same-client affected records; unknown-environment reason. | AC05, AC06 |
| WRK-03 | MVP | Implemented | Manual references (instance + normalized key + approved HTTPS URL); reuse reason; inaccessible cases counted, not named; no Jira calls. | AC07; StructuralTests |
| WRK-04 | MVP | Implemented | Status independent of Jira; active owner for In progress; outcome always; evidence or Manager exception. | AC06; e2e |
| WRK-05 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| WRK-06 | MVP | Implemented | Timeline of status, owner, priority, due and scope changes plus field-level audit. | AC06 |
| WRK-07 | MVP | Implemented | Reasons and history for due changes, cancellation, reopening; missing evidence needs a Manager exception with follow-up. | AC06 |
| WRK-08 | MVP | Implemented | Filters: client, environment, product, team, owner, status, priority, due, Jira key, freshness, waiting, country. | AC07, AC11 |
| TEAM-01 | MVP | Implemented | Teams with lead/manager; members with role, skills, product familiarity; working time zone on the person. | UI; AC09 |
| TEAM-02 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| TEAM-03 | MVP | Implemented | Team/engineer assignments, waiting, due dates, coverage gaps by configurable policy; reassignment queue. | AC09, AC11 |
| TEAM-04 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| TEAM-05 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| TEAM-06 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| COM-01 | MVP | Implemented | Client or internal commitments with owner, due timestamp, original IANA zone, status, same-scope case/project link. | AC08 |
| COM-02 | MVP | Implemented | Types: customer update, delivery, renewal action, maintenance, recorded contractual deadline, other. | AC08 |
| COM-03 | MVP | Implemented | Upcoming/overdue/completed; completion time + evidence; Open/Completed/Cancelled with separate derived timeliness. | AC08, AC11 |
| COM-04 | MVP | Implemented | Revision, cancellation and reopening need a reason; all events kept. | AC08 |
| COM-05 | MVP | Implemented | Displayed as Recorded deadline, never as a verified SLA result. | UI; CSV column definitions |
| CHG-01 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| CHG-02 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| CHG-03 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| CHG-04 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| CHG-05 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| CHG-06 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| KNW-01 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| KNW-02 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| DAS-01 | MVP | Implemented | Action list: unassigned, waiting, review overdue, overdue cases and commitments, approaching, stale, coverage gaps, data quality; owner/Unassigned, reason, next action, source. | AC11 |
| DAS-02 | MVP | Implemented | Client and Environment 360 show work, commitments, installations, reported condition, last verification; no health score. Dashboard charts: cases by status/priority/age, weekly opened vs closed, commitments by deadline, environments by reported condition, data quality by rule, product coverage. | UI; AC11_DashboardInsights |
| DAS-03 | MVP | Implemented | Open excludes Closed/Cancelled; overdue strictly before evaluation time; missing deadlines separate. | AC11 |
| DAS-04 | MVP | Implemented | Age since creation (current-cycle age after reopen); waiting time from recorded intervals; no SLA pause. | AC06; dashboard |
| DAS-05 | MVP | Implemented | Stale by max age or next-review date; viewing and unrelated edits never refresh. | AC10; FreshnessTests |
| DAS-06 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| DAS-07 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| DAS-08 | MVP | Implemented | Distinct installations and environments per product/version; unknown version and unconfirmed shown separately. | AC03 |
| DAS-09 | MVP | Implemented | CSV exports filtered by time range, client, team, owner, product; generation time, zone, filters, column definitions; Export grant; audited. | AC12; CsvTests |
| DAT-01 | MVP | Implemented | Immutable IDs; created/updated time and actor; row-version concurrency token. | AC13 |
| DAT-02 | MVP | Implemented | Required fields, transitions, dates and cross-client relationships validated server-side. | AC01, AC03, AC05, AC06 |
| DAT-03 | MVP | Implemented | Uniqueness by instance + key per case (filtered unique index). | AC07 |
| DAT-04 | MVP | Implemented | UTC storage; display in the user zone; original zone kept for commitments and case due times; DST gaps and overlaps handled. | TimeZoneTests; AC08 |
| DAT-05 | MVP | Implemented | Archive instead of delete; restore with role and scope; audited administrator correction of client codes. | AC13 |
| DAT-06 | MVP | Implemented | Data-quality view: missing owners, unknown environments/versions, stale verification, invalid references, placeholders, unresolved endpoints, missing policies. | AC04, AC10 |
| INF-01 | MVP | Implemented | Assets VM/Physical/Logical endpoint with environment, role, zone, phase, lifecycle, owner, verification; listeners never counted as VMs. | AC04 |
| INF-02 | MVP | Implemented | Components separate from hosts; many-to-many hosting within the environment. | AC03 |
| INF-03 | MVP | Implemented | CPU qty/unit, RAM qty/unit, OS, volumes with label, capacity, unit, purpose, shared storage; unknown is not zero. | AC04; InfrastructureTotalsTests |
| INF-04 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| INF-05 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| INF-06 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| INF-07 | MVP | Implemented | Cases link assets, components, dependencies; Documented dependency impact traversal. | AC05 |
| INF-08 | MVP | Implemented | Filters by client, region, environment, product, phase, zone, role, lifecycle; totals with separate units, unknowns, shared storage once. | AC04 |
| NET-01 | MVP | Implemented | Endpoints (asset/service/group/external/unresolved), context, zone, hostname, internal/external/NAT addresses; no invented addresses. | AC05 |
| NET-02 | MVP | Implemented | Dependencies: source/destination endpoint or group, protocol, ports, direction, purpose, owner, affected components. | AC05 |
| NET-03 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| NET-04 | MVP | Implemented | Groups kept as stated; pairs only after owner confirmation. | AC05 |
| NET-05 | MVP | Implemented | Address, subnet and port validation; duplicate warnings scoped to the network context. | AC05; GuardTests |
| IAM-01 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| IAM-02 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| IAM-03 | MVP | Implemented | No secret fields; credential detector on text and links; vault references only; values never echoed or logged. | AC14; StructuralTests |
| IAM-04 | MVP | Implemented — **A22** | Technical detail (addresses, hostnames, zones, ports, topology), export and change history are part of both roles (no per-person grants). The masking code path is kept but no role lacks the grant. | AC12 Two_roles_both_see_everything… |
| RDY-01 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| RDY-02 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| RDY-03 | MVP | Implemented | Gaps for missing owners/specifications, unresolved endpoints, invalid quantities, stale reviews, each with coordinator and next action. | AC04, AC10 |
| RDY-04 | MVP | Implemented | Provenance on assets, volumes, installations, endpoints, dependencies; placeholders flagged. | AC04 |
| RDY-05 | Next | Deferred (Next) | Not built; no navigation, controls or zero counts are shown. | - |
| UX-01 | MVP | Implemented | Persistent top and side navigation, global search (/ or Ctrl+K), client/project filters, breadcrumbs; deferred screens absent. | e2e journeys |
| UX-02 | MVP | Implemented | Owner, last review, state and freshness shown separately; distinct Unknown / No records entered / No matching records / Access restricted; filters kept in the URL. | e2e; UI |
| UX-03 | MVP | Implemented | Errors beside fields, entries kept, leave-page warning, explicit confirmation for archive/closure, sorting and paging, no drag-and-drop. | e2e journeys |
| OPS-01 | MVP | Implemented — **narrowed by A21 for clients and environments** | Owner + responsible party + internal coordinator for cases and commitments; clients and environments are always the TIO team (party/organization/coordinator not captured); only leads change ownership. | AC06, AC09 |
| OPS-02 | MVP | Implemented | Configurable review policies (max age and/or next-review date); views and unrelated edits never count. | AC10 |
| OPS-03 | MVP | Implemented | Meaningful review: reviewer, time, scope checked, note, evidence; missing policy = quality exception; condition-only review does not verify inventory. | AC10 |
| OPS-04 | MVP | Implemented | Pilot defaults seeded and configurable: cases 2 days, clients/contacts 90, inventory 30, commitments by next-review date. | Data/ReferenceData.cs |
| OPS-05 | MVP | Implemented | Handovers with acknowledgment or Manager exception (reason, follow-up owner and date); prior ownership kept per item. | AC09 |
| RSK-01 | Next | Deferred (Next); MVP interim implemented | Risk register deferred. MVP interim: case type Risk follow-up, without implying formal acceptance. | UI |
| NFR-01 | MVP | Implemented; identity provider decision open | Windows Integrated sign-in through IIS (assumed approved), HTTPS redirect and HSTS outside development, server-side authorization on every request, antiforgery. | AC12, AC14 |
| NFR-02 | MVP | Implemented | No credential fields; secret detector; vault references only. | AC14 |
| NFR-03 | MVP | Implemented | Audit in the same transaction: actor, time, record, before/after; append-only (02-app-login.sql denies UPDATE/DELETE). | AC13 |
| NFR-04 | MVP | Implemented | If-Match row versions; 412 keeps the draft; Reload latest. | AC13; e2e |
| NFR-05 | MVP | Implemented; pilot load to be agreed | In-process smoke: p95 reads 95 ms, saves 181 ms (8 concurrent users, development volume). | AC15_PerformanceSmoke |
| NFR-06 | MVP | Implemented | Desktop and tablet layouts, keyboard access, visible focus, labels, text plus colour for status. | e2e (keyboard, tablet) |
| NFR-07 | MVP | Implemented; production evidence pending | Backup/restore procedure and automated restore drill; RPO, RTO, retention and hosting are open decisions. | AC15_RestoreDrill; docs/OPERATIONS.md |
| NFR-08 | MVP | Implemented | Problem Details with trace id; no internals or input echoed; failures logged for support. | AC14 |
| NFR-09 | MVP | Implemented — **extended by A22** | **Products (applications)** section for every user: code, name, also-known-as, category, description, technology, owning team, product owner, modules (with descriptions), **microservices** (A23), features (per module or whole product), versions, and where the product is installed / in which projects and contracts. Maintained by Operation Engineers and the TIO Manager; retiring keeps history. Priority guidance, review policies, reference lists and settings stay under Administration (TIO Manager). | AC12; e2e "Products: catalogue…" |
| NFR-10 | MVP | Implemented | Exports scoped like the UI, separate Export grant, logged (report, filters, time, rows) and audited. | AC12 |

## Optional capabilities delivered

| Capability | Status | Notes |
|---|---|---|
| Geographic client map (Optional, Section 3) | Implemented | Dashboard choropleth of authorized clients by country, offline map data, click-to-filter, unknown countries listed separately. Not an MVP dependency. |
| Personal saved views, client follows, visual dependency diagram | Not built | Optional. |
