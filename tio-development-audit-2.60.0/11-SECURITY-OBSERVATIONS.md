# 11 — Security observations (build 2.60.0)

Scope and limits as in the first audit: normal UI and API use with development identities, headers, input handling, targeted code review. No exploitation, credential attack or scanner. Forms/Windows sign-in and the Jira integration could not be exercised.

## Verified controls

| Control | Result on 2.60.0 | Evidence |
|---|---|---|
| Hub user required; unknown/deactivated → 403 | Pass | sec run |
| Antiforgery on non-GET | Pass | sec run; automated |
| **Granular rights** | Engineers refused on every administration endpoint tried and on create/archive/delete of client structure; messages name the missing right ("This needs Create for Client structure") | SEC-ADM, SEC-01..07 |
| **Self-escalation** | Engineer cannot edit users (403); role creation refused | ROLE-04, SEC-03 |
| **Per-client data scope — reads** | 34 foreign record routes → 404 (two 403); lists, dashboards, search, report previews, exports filtered; report filter naming a foreign client → 422 | b3 run; automated |
| **Per-client data scope — writes** | 5 writes on foreign records → 404; create on foreign client, foreign contract link, foreign ticket link → 422 | b3 run; automated |
| Route guards in the browser | "Access denied" for pages without the right | automated |
| Notes privacy; attachment rules; export download owner-only | Pass | misc run; automated |
| Error disclosure | Problem Details with trace id only | 214 responses |
| Response headers, CSP | Unchanged from 2.29.0 | — |
| Input handling | Script text rendered as text (titles, comments); notes sanitised; comment length limited | CASE-09, CMT-02/03 |
| Global data-quality scan | Refused for a scoped user ("requires all client and internal scopes") | DQ-01 |

## Observations

| # | Observation | Risk | Issue | vs 2.29.0 |
|---|---|---|---|---|
| S1 | **Change history bypasses the data scope for child records.** A client-scoped engineer saw about 165 audit entries without a client id written by the seed or the manager, including SLA targets of another client's contract, project–product links and a handover summary between other people. The export log lists other users' filter text, including a foreign client alias | Medium — confidentiality between clients | 035 | **New** |
| S2 | **Measurement and penalty tampering** through normal functions | High for reporting and commercial integrity | 001–005 | Unchanged; larger impact |
| S3 | **Cascade delete** without version or server-side confirmation; hard delete of tickets with SLA and penalty history | Medium | 011 | Unchanged (now rights- and scope-aware) |
| S4 | **Ownership is not a control inside a scope** | Low–medium | 010 | Narrowed by scope |
| S5 | **OpenAPI document** (431 kB, 374 operations) served to an authenticated account without hub access | Low | 029 | Unchanged |
| S6 | **Uploads checked by extension only** | Low–medium | 029 | Unchanged |
| S7 | **Public map tiles**; **Forms sign-in without MFA/SSO** | To decide before production | 029 | Unchanged |
| S8 | **New outbound integration.** Jira Cloud credentials (API token or secret variable), site URL and synchronisation are now part of the product and are on by default in a deployed hub (A88). Not exercised: credential storage, URL validation against internal addresses, token scope, logging of responses, behaviour on compromise of the Jira side (a Jira status can now close a hub ticket, A77) | Unknown — needs a dedicated review | 029 | New |
| S9 | **Commercial data** now includes penalty amounts in addition to fees and payments; visibility follows contract rights and scope | Confirm with the data owner | — | Wider |
| S10 | **No four-eyes rule** for evidence exceptions, handover exceptions and penalty confirmation — explicit owner decision (A75) | Accepted risk; revisit with penalties | — | Documented |
| S11 | Role description "Day-to-day operations work on every client" no longer matches scoped behaviour; seeded account `DEV\viewer` is an editing engineer | Cosmetic, but misleading in access reviews | — | — |

## Not tested

Forms and Windows sign-in, lockout, session expiry, password reset availability, scoped right exceptions, role conflicts, access simulation, directory group mappings, Jira connection and synchronisation, TLS and IIS hardening, SQL least-privilege login, dependency scan, penetration test.

## Recommendations

1. Fix S1 before any client-scoped role is used in earnest: stamp the owning client on child audit entries and filter the export log.
2. Close S2–S3 with the business-rule fixes (report 14).
3. Commission a focused security review of the Jira integration (credentials, egress allow-list, SSRF, least-privilege token) before enabling it outside a pilot.
4. Before production: SSO/MFA decision, penetration test, dependency scan, verification of the least-privilege database login.
