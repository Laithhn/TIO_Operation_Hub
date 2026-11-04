# Authorization discovery and implementation baseline

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

For the implemented 2.43 editor, 134-key inventory, dependencies and revocation guarantees, see [AUTHORIZATION-2.43.md](AUTHORIZATION-2.43.md) and [AUTHORIZATION-CAPABILITY-MATRIX.md](AUTHORIZATION-CAPABILITY-MATRIX.md). This discovery baseline retains the earlier architecture/gap findings for comparison.

**Reviewed:** 30 October 2026  
**Purpose:** Baseline for extending authorization without replacing the modular monolith or weakening existing access controls.

## Existing application

| Area | Finding |
|---|---|
| Front end | React 18, TypeScript, Vite, TanStack Query and React Router. Pages are lazy-loaded from `src/web/src/App.tsx`; shared shell and navigation are in `ui/Shell.tsx`. The organization’s vendored VtWebGuiFramework is used for the design system. |
| API | ASP.NET Core 10 minimal APIs grouped under `/api/v1`, registered per module in `Modules/ModuleRegistration.cs`. Business logic and endpoints live in a modular monolith; there is no controller layer. |
| Sign-in | Windows Integrated authentication is the real-environment default; Forms and Development modes are supported under documented constraints. The authenticated principal resolves to `iam.User`; session validation rejects inactive/stale Forms sessions. |
| Persistence | SQL Server and EF Core 10. `HubDbContext` owns mappings, query filters, concurrency, and transactional audit. Migrations are additive; production startup migration is disabled and DBA-applied scripts are the documented process. |
| Roles and rights | `iam.AppRole`, `iam.UserRole`, `iam.RolePermission` and legacy broad `Right` flags. A63 stores resource/action assignments in normalized rows. Permission metadata now persists in `iam.PermissionDefinition` and synchronizes from an explicit code manifest. The locked Manager role receives every active permission. Built-in templates currently include Manager and Engineer. |
| Scope | `iam.UserScope` and AD `GroupMapping` scopes model client, project and internal-team access. User resolution and query filters enforce scope on many business reads; the current A22 policy gives every business role broad visibility, with scopes retained in the model. |
| Front-end authorization | `/me` returns effective rights, resource permissions, scope counts and grant flags. `permissions.ts`, hooks, `ui/Authorization.tsx`, and conditional navigation provide UI hints; the API remains authoritative. Users can now hold multiple roles in the administration form. The roles/rights pages are under `pages/Admin.tsx`. |
| Audit and cache | `HubDbContext` writes change audit in the same save transaction; SQL deployment denies ordinary update/delete on `audit`. `UserResolver` uses `IMemoryCache` and invalidates on role/user administration changes. This is per-process caching, not a distributed invalidation mechanism. |

## Existing authorization semantics

1. Authentication is required by the fallback ASP.NET Core authorization policy.
2. `UserContext` exposes `HasPermission(resource, action)`, `RequirePermission`, legacy right checks, business-role checks and independent scope/grant checks.
3. The A63 matrix covers ten resource groups and five actions (Create, Maintain, Coordinate, ArchiveRestore, Delete). Cross-cutting rights remain Export, Technical detail, Audit and Administration.
4. Read visibility is deliberately broad for business-role users by A22; action rights and data scopes are separate. The application-administrator-only account has no business-data access.
5. Resource permission changes invalidate the in-process effective-user cache. The role editor uses optimistic row-version checks.
6. Most protected actions call guards in endpoint/service code rather than declarative endpoint policies. This allows resource and record context checks but requires a systematic coverage audit.

## Reusable architecture

- Keep the modular monolith, `UserContext`, `UserResolver`, `HubDbContext` query filters, resource permission mapping, existing audit transaction, and the TIO design system.
- Use explicit stable permission keys and backend checks. `iam.PermissionDefinition` is synchronized from an explicit code manifest; do not derive identities from UI labels or route strings.
- Keep tenant/organization and business scope checks independent from action grants. A permission must never bypass scope filters.
- Use server-side authorization in module operations, not only hidden UI controls. Endpoint-level policies can provide a consistent outer check while operation/service checks retain record scope and workflow validation.
- Preserve DBA-managed migrations. Any access bootstrap or legacy-right conversion needs a reviewed, additive migration and a rollback plan before production application.

## Gaps against the requested target

| Capability | Current state | Work required |
|---|---|---|
| Database-driven permission metadata | `iam.PermissionDefinition` stores metadata; startup synchronizes it from `ResourcePermissions.Registry`. Sync upserts active metadata, marks removed keys inactive, and does not delete assignments. The roles endpoint reads the persisted metadata. | Expand explicit manifest to page/tab/component-level keys, add registry-specific admin browsing and controlled workflow for user-managed permissions. |
| Hierarchy, sensitivity and dependencies | Resource/action list only; no parent hierarchy, sensitivity, lifecycle metadata, dependencies or per-permission scope metadata. | Define metadata schema and an explicit catalog that accurately matches supported product operations. |
| Multiple user roles | Admin API and user form accept multiple role IDs; effective permissions/rights union across active assigned roles. Legacy `roleId` remains accepted. User role changes, user deactivation, group-mapping changes, and role deactivation guard the last active administrator. | Expand tests for group changes, scopes, and mapped/direct role combinations. |
| Role lifecycle/management | Create/edit/delete, clone, active state, and user counts exist; built-ins are protected by `Key`; role writes use existing concurrency/audit. Comparison and unused-role reporting are not implemented. | Add comparison and unused-role reporting. |
| User-level grants/denies | No user permission override model. | Add only if business owners approve conflict semantics; default deny and mandatory boundaries remain. |
| ABAC/scopes | User scopes and query filters exist, but current business policy A22 is broad visibility and A63 explicitly avoids per-record ACLs. | Do not silently change A22. Model supported scope grants and evaluate them in query/service paths only after migration and behavior decisions. |
| Component, route and tab guards | A reusable `Can`/hook exists and admin routes are wrapped. Most business routes, tabs, fields and components are not yet individually guarded; API remains authoritative. | Extend route metadata and component checks as coverage matrix rows are completed. UI remains advisory. |
| Server enforcement coverage | 53 explicit permission/right/grant guard references were found in module code. This count does not prove every operation is guarded; authorization patterns vary and need endpoint-by-endpoint review. | Complete the coverage matrix and test each sensitive action, including exports, attachments, background jobs and indirect service calls. |
| Inspector and simulation | User access inspection reports active roles, effective permissions and legacy rights; non-executing simulation is not implemented. | Add simulation protected by a dedicated permission and test that it never impersonates or executes business operations. |
| Audit detail | Role changes participate in existing transactional audit. A dedicated authorization audit history query/UI and before/after review flow are not implemented. | Verify audit fields for grants/scopes, actor and correlation; add protected history UI/API. |
| Cache revocation | Role/user changes invalidate local memory cache and active-role checks are resolved on access refresh. This is per-process caching, not distributed invalidation. | For multi-instance deployments, introduce shared versioning/invalidation or bounded short-lived resolution with documented maximum revocation delay. |
| Complete coverage | Current authorization catalog is resource/action-centric and does not enumerate every page, tab, component or field. | Maintain the coverage matrix as product features evolve; explicitly mark UI-only presentation controls and backend enforcement. |

## Migration and rollout risks

- A mistaken permission backfill can expand access. The A63 decision already defines a compatibility mapping for broad legacy rights; any further migration must preserve effective grants exactly or reduce them intentionally with owner approval.
- Adding custom-role `IsActive` or new role states requires defining treatment of users assigned only inactive roles and protecting the last active security administrator.
- Multiple-role support can broaden permissions through union semantics. Define deterministic union and scope behavior, and prohibit self-grant or grants beyond the actor’s authority.
- Adding organization/tenant boundaries to existing queries can hide records unexpectedly. The current A63 decision explicitly retains broad visibility and says no per-record ACLs; new isolation semantics require a business decision and migration review.
- Production schema changes must be additive, idempotent in the generated DBA script, backed up and applied by the DBA. Never execute migrations against shared/production data from development work.
- The current `IMemoryCache` invalidation is process-local. A multi-instance deployment can retain stale effective access unless all instances observe the change or cache entries expire within a documented bound.

## Coverage inventory

See [AUTHORIZATION-COVERAGE-MATRIX.md](AUTHORIZATION-COVERAGE-MATRIX.md). That inventory is a discovery baseline, not a claim that every listed operation has already passed enforcement tests.

## Implementation order

1. Keep supported role/scope semantics aligned with A22 and A63; do not broaden access as part of schema work.
2. Review and apply the additive permission metadata/role activation migration only through the DBA procedure in `docs/OPERATIONS.md`.
3. Extend access inspection and add non-executing simulation, comparison, unused-role reporting, and authorization audit history.
4. Walk every matrix row through endpoint, service, query-scope and UI enforcement; add security tests for each high-risk class.
5. Add shared permission versioning/invalidation before relying on multi-instance authorization caching.

