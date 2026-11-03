# Authorization coverage matrix

The implemented 2.43 capability inventory is in [AUTHORIZATION-CAPABILITY-MATRIX.md](AUTHORIZATION-CAPABILITY-MATRIX.md). The matrix below records the discovery baseline and gaps at that stage; it is not the current permission list.

**Status:** Inventory for authorization remediation, reviewed 30 October 2026. “Existing guard” means the application has a corresponding resource/right/grant or scope concept; it is not a claim that every route has been verified by an adversarial integration test. Backend coverage must be audited at endpoint and operation level before production acceptance.

| Module | Page / feature | Component or action | Existing permission / guard | Frontend guard | Backend enforcement status |
|---|---|---|---|---|---|
| Dashboard | Overview, command center, insights | View scoped operational metrics | Business role + client/team scope | Navigation visibility; page relies on API | Scope-aware endpoints exist; action key is not separately modeled |
| Clients | Client list/details, regions, projects, organization graph | View records | Business role + scope | Route not centrally guarded | Query filters and per-record checks exist; verify every graph path |
| Clients | Client forms and structure | Create / maintain / coordinate / archive / delete | `ClientStructure:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Existing forms use permission checks in portions of UI | Explicit guards exist across modules; full route/action audit required |
| Products | Product list/details, modules, versions, microservices | View | Business role + scope | Route not centrally guarded | Scoped/business access; no distinct `products.view` key |
| Products | Product administration | Create / maintain / archive / delete | `Products:{Create,Maintain,ArchiveRestore,Delete}` | Permission-aware controls in module | Backend guards present; verify nested module/version endpoints |
| Contracts | Contract list/details, SLA and penalty terms | View / read | Business role + scope | Route not centrally guarded | Scope-aware reads; no separate page/tab permission |
| Contracts | Contract and payment maintenance | Create / maintain / coordinate / archive / delete | `Contracts:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware forms/actions | Backend checks exist; review payment and penalty paths |
| Environments | Environment list/details, condition reports | View | Business role + client/project scope | Route not centrally guarded | Query filters and scope checks exist |
| Environments | Create / maintain / report condition / archive / delete | Resource actions | `Environments:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware controls | Backend guards exist; verify condition-report write paths |
| Inventory | Servers/assets, volumes, components, shared storage | View technical data | Business role + scope; `TechnicalDetail` grant for sensitive detail | Existing conditional rendering | API applies scope and technical-detail checks in relevant operations; nested endpoints need review |
| Inventory | Server/inventory maintenance | Create / maintain / archive / delete | `Servers:{Create,Maintain,ArchiveRestore,Delete}` | Permission-aware controls | Backend guards exist; verify clone/cascade paths |
| Catalogue | Installations and deployment history | View / create / maintain / coordinate / archive / delete | `Installations:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware controls | Backend guards exist; review deployment workflow transitions |
| Cases | Case list/details, internal case data, attachments | View | Business role + scope; no separate internal-notes permission in catalog | Route not centrally guarded | Scoped endpoints; field-level segregation not represented by A63 catalog |
| Cases | Create/edit/triage/assign/status/contract-link/archive/delete | Case operations | `Cases:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware actions in page | Backend checks exist; operation-by-operation tests required |
| Commitments | List/details and workflow | Create / maintain / coordinate / archive / delete | `Commitments:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware actions | Backend checks exist; verify completion/reopen endpoints |
| Escalations | List/details, create/edit/workflow | Other-operation permissions and owning-record scope | `OtherOperations:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Some controls use permissions | Verify all transitions, reassignment and attachment access paths |
| Teams | Teams, membership, coverage | Create / maintain / coordinate / archive / delete | `Teams:{Create,Maintain,Coordinate,ArchiveRestore,Delete}` | Permission-aware actions | Backend checks exist; internal team scopes also enforced |
| Handovers | Handover list/details, reassignment | View / coordinate / update | `Teams:Coordinate` plus scope | UI checks in relevant flows | Backend checks exist; verify reassignment queue and linked records |
| Notes | Personal notes workspace | View / edit own notes | No dedicated permission key; ownership is the boundary | Route not centrally guarded | Ownership checks in module; verify file access and indirect record references |
| Firewall | Firewall rules and network detail | View / maintain technical details | `TechnicalDetail` grant + `OtherOperations:Maintain` | UI permission checks | Backend requires grants/permissions; verify every lookup/export path |
| Reporting Center | Overview, report library, saved reports | View / run | Business role/scope; some report-specific ownership/sharing rules | Navigation uses export/business hints | Server queries re-check requester scope; review all report catalogs |
| Reporting Center | CSV/Excel/PDF, schedules, builder and history | Export / schedule / download / cancel | `Export` grant and report ownership/scope rules | Export controls use grant hints | Endpoint and worker re-resolve access for execution; verify all download/job transitions |
| Attachments | Upload, preview, download, delete | File operations against owning record | Owning resource action + scope; uploader rule where applicable | Permission-aware controls | Backend checks owning record and access; review bulk delete and preview response headers |
| Notifications | Notification center and state changes | View / mark read | Authenticated user; per-user notification ownership | Route not centrally guarded | User-bound queries and update checks; no separate permission metadata |
| Data quality | Quality list and review | View / review / configure policies | Business scope; Administration or review-specific checks | Route not centrally guarded | Endpoint checks exist; catalog does not separately express review action |
| Administration | Users and access | Create / edit / deactivate / reactivate / delete users, scopes, grants | `Administer` | Admin-only navigation | `RequireAdministrator` guards present; multi-role and last-admin safeguards incomplete |
| Administration | Roles and rights | Create / edit / delete / assign permissions | `Administer`; Manager role locked | Admin-only navigation | Role endpoints enforce admin, concurrency, built-in protection and a non-manager grant ceiling based on the actor’s own permissions |
| Administration | Group mappings | Configure organization-group role/scope/grants | `Administer` | Admin-only navigation | Admin guards exist; verify escalation and last-admin effects |
| Administration | Settings, reference lists, Jira, policies | Configure system behavior | `Administer` | Admin-only navigation | Admin guards exist; endpoint audit required |
| Administration | Change history / audit | View audit | `Audit` or administrator according to history type | UI visibility hints | Audit is append-only in DB permissions; verify read authorization per endpoint |
| API platform | Authentication/session | Sign in, sign out, password/session management | Authentication/session policy | Public sign-in routes | ASP.NET fallback policy and endpoint-specific auth flow; 401/403 handling configured |
| Background work | SLA scan, notification scan, quality scan, report scheduler/export worker | Execute service operation | System identity and re-resolved user access for user-owned exports | Not applicable | System tasks run internally; user-triggered queued work revalidates access where implemented |

## Explicit gaps to close

- The matrix is resource/action based and cannot currently assign independent view access to a page, tab, section, field, or widget.
- There is no database metadata registry for keys, hierarchy, descriptions, risk level, deprecation, dependencies, or supported scopes.
- Many routes have no client-side route guard. Navigation filtering does not prevent direct URL rendering; API authorization remains essential.
- Current front-end role assignment exposes one role even though the database join is many-to-many.
- Permission administrator privilege ceilings, role activation, cloning, comparison, user-access inspection and simulation are not established as complete features.
- “View” currently follows the business role and scope model; it is not a configurable permission for each module.
- Security-critical actions need explicit negative integration tests including direct API calls, out-of-scope records, bulk operations, exports, and queued work after revocation.

