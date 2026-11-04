# Hierarchical Rights Management — 2.44.0

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

Prepared 2 November 2026. This extends the current authorization implementation and preserves its authentication, role, scope, workflow and ownership checks.

## Discovery and design

The working tree already contained the 2.43 permission registry, granular resource actions, an audited role editor, multiple-role resolution and database-backed cache invalidation. `iam.AppRolePermission` stores `(AppRoleId, Resource, Action)` grants. `iam.PermissionDefinition` supplies stable keys and metadata. Users receive role assignments directly and through existing directory group mappings. User scopes and cross-cutting grants exist; per-user permission allow/deny overrides do not. No parallel user override system was added.

The principal gap was that registry parents were virtual grouping labels. They could not be assigned, did not have referential integrity and were not checked when a child action was authorized. Client, environment and case tabs also relied mostly on their source resource's broad permission. Combined API responses needed section filtering as well as hidden tabs.

The manifest is now `Security/PermissionHierarchy.cs`, extending the existing `ResourcePermissions` catalog. It has 330 definitions: 10 modules, 33 submodules, 52 functional tabs/sections and 235 actions. The complete inventory, parent and prerequisite mapping is in [AUTHORIZATION-HIERARCHY-MATRIX.md](AUTHORIZATION-HIERARCHY-MATRIX.md).

| Level | Examples | Meaning |
|---|---|---|
| Module | `module.clients:Access`, `module.admin:Access` | Access to a navigation module; grants no children |
| Submodule | `area.ClientStructure:Access`, `area.AdminRoles:Access` | Access to a functional area; grants no tabs or actions |
| Tab/section | `tab.ClientStructure.organizations:Access`, `tab.Cases.jira:Access` | Access to an existing tab or record section |
| Action | `tab.ClientStructure.organizations:View`, existing `Cases:Maintain` | One operation; all ancestors and source prerequisites must also be effective |

Existing `Resource:Action` keys retain their spelling. For example `Cases:View`, `Cases:Create` and `Cases:Maintain` remain actions directly under the Cases submodule. Attachments and history remain real record sections with independently controlled operations. A detail-page access action remains directly under a submodule where that page already has functional tabs. Plain list/workspace areas do not acquire artificial tabs. UI filters, country-explorer display modes and attachment preview/details modes share their underlying data permission rather than creating misleading security boundaries.

## Effective permission rules

1. Union the stored grants of all active direct and group-mapped roles. Inactive users contribute no permissions; inactive roles contribute no grants.
2. Retain only known, active registry keys.
3. Remove any key whose parent, ancestor or capability prerequisite is missing. Repeat until stable so cross-resource dependencies also fail closed.
4. Apply the existing separate administration, Export/Audit/Technical detail, ownership, workflow and record-scope checks at their existing boundaries.

A missing parent is not a user-level deny that overrides another role. Another active role may explicitly supply that parent; this is the existing union policy. There are no user-specific permission overrides to define precedence for. No parent, new permission, spelling variant or unknown key grants descendants by prefix. Unknown keys are denied.

Examples:

- A role with only `module.cases:Access` cannot read cases.
- A user with the Cases module, submodule and `Cases:View` can list cases while Create, Edit and Delete remain denied.
- Revoking `tab.ClientStructure.organizations:Access` makes its stored View/Create/Edit/Delete actions ineffective. Their assignments remain stored and can become effective when that parent is explicitly restored.
- Case history and attachment operations still require their existing source prerequisites and the separate Audit grant where applicable.

`PermissionHierarchy.Resolve` is used by `AccessCalculator` and `UserContext`. The existing endpoint filter adds section checks before handlers execute. Existing resource guards thereby acquire ancestor checks across their current endpoints, including shared deletion/cascade paths. Combined client/environment/case responses omit denied section data. Updating a case with a hidden affected-record section does not overwrite its stored affected links from an empty frontend form.

Supported authorization changes continue to advance `iam.AuthorizationVersion` transactionally. Each request reads that shared generation before using a cached user snapshot. The next request after commit sees revocation on every application instance; an already executing request is not cancelled. The frontend retains its existing periodic/focus refresh and refreshes after a successful save.

## Administration and escalation protection

The existing Administration right is still mandatory for administrative mutations. Module/submodule/action permissions add a second boundary; they do not replace that right. Rights changes retain row-version conflict detection, the shared administration transaction lock, protected manager-role behavior, self-authorization restrictions and last-administrator checks.

Grant validation now also checks retained child assignments that a newly enabled parent could activate, including direct coassigned roles of affected users. Reactivating an account checks its direct and last-mapped active roles against the acting administrator's authority. Shared deletion/cascade operations check the relevant region/contact/organization section as well as the original resource permission.

Directory groups continue to map to the existing built-in role identities. Group membership can change outside the hub; current group mappings, parent grants and permission prerequisites are resolved at sign-in. Production directory integration still requires operator UAT.

## Rights editor

Administration → Rights uses the existing editor and styles, with independent checkboxes and explicit Module/Submodule/Tab/Action badges. Modules, submodules and tabs expand/collapse; submodules and tabs start collapsed for a manageable initial view. Searching expands matching ancestor paths. Parent context stays visible when a filter matches only an action.

The parent's checkbox changes only its own assignment. **Grant shown** and **Revoke shown** explicitly preview and stage only the matching rows. Partial-selection indicators describe the complete branch; the adjacent count describes the filtered bulk selection. This distinction prevents a filtered bulk action from silently changing hidden grants.

Changes are highlighted and summarized before **Review and save**. The review lists additions/removals; failed saves retain the draft, conflicts offer reload, and successful saves refresh permissions. **Discard changes** restores the saved selection. Read-only rights administrators cannot stage mutations. User access inspection continues to show source roles and restricted permissions.

Existing route, tab, record-action, reporting, note, notification, configuration and administration controls use reusable permission checks. Server enforcement remains authoritative even when a browser has an older snapshot. An explicit URL containing a denied client/case/environment tab is blocked before that page loads.

## Database and compatibility migration

New migration: `20261102110000_HierarchicalPermissions`, following the already-present `20261102103000_ProjectPermissions` migration. The schema script includes both and all earlier application migrations.

Schema changes extend `iam.PermissionDefinition` with `NodeType` and `DisplayOrder`, constrain node types, add a unique alternate key for the parent FK, and add a self-referencing `ParentKey → Key` FK and parent/order index. Existing entity audit columns and row versions are retained. Role assignment tables and user-role references are not replaced.

The migration contains a **frozen** manifest and explicit old-authority-to-new-grant mapping, independent of future code changes:

- Existing read/detail/file grants receive their required ancestors.
- Existing client tab source grants map to the corresponding client-tab View/Access grants. Environment/case detail authority maps to their existing functional tab access. Source permissions remain required at evaluation.
- Existing region/contact/organization/Jira/condition authority maps to the corresponding scoped operations, whose original resource actions remain prerequisites.
- Existing dashboard/reporting/team visibility maps only to the corresponding View operations. Handovers Create/Maintain map from the existing Teams Create/Maintain or Coordinate authority. New report mutations, downloads and exports map from the old Export right; source-resource Export grants and scope checks still apply.
- Existing Administration and Audit rights map to their previously available administrative areas. The legacy Edit right maps to the former ownership-constrained personal-note and notification operations. A role holding only View does not gain those actions.
- Old role action grants, role IDs, users and user-role assignments remain intact. Additions are recorded per role as `HierarchyPermissionUpgrade` access-audit entries. Inactive roles retain their mapped assignments but contribute no effective access.

This mapping runs once, through migration history. Registry synchronization and sign-in never backfill assignments. New roles start with no grants. New keys added to the manifest later are denied until explicitly assigned, except for the existing documented protected TIO Manager role, which always holds every registered permission.

Before deployment, review the actual affected roles using [database/03-permission-hierarchy-review.sql](../database/03-permission-hierarchy-review.sql). It is read-only and lists proposed additions and their source authority. Live shared/production records were not queried or changed during implementation.

Ambiguities requiring administrator review: the legacy `OtherOperations` resource still spans contacts, boundaries, firewall rules and escalations; existing shared resource/file keys can cover several record kinds. New tab gates narrow relevant entry points while retaining those legacy source prerequisites. They are intentionally not guessed into unrelated replacement keys. Several aggregate pages still require all their source permissions. This release does not add individual field permissions, separate grants for every workflow transition or explicit deny overrides.

The `/admin/roles` JSON contract retains existing fields and keys and adds node type/display order metadata. Clients writing explicit permission arrays must send desired parent assignments as well; omission means revocation. There is no automatic parent granting on that API. The documented legacy broad-`Rights` translation remains available and uses the explicit compatibility mapping. The report catalog is shared, non-record metadata used by history, schedules and overview; its read access still follows Reporting View while report data and operations have separate gates.

No migration has been executed in a shared or production database. Apply the reviewed idempotent schema through the DBA process before deploying the application; keep production startup migrations disabled. Take a backup and review the preview script first.

For application rollback, restore the preceding application package while retaining the additive schema and grant rows. Existing legacy grants were not rewritten or removed. The migration's Down path removes the new schema constraints/columns while retaining assignment/registry rows so subsequent role edits are not silently destroyed. Reverting administrator decisions or removing grant additions requires a reviewed reconciliation against the upgrade audit or backup, not an automatic destructive rollback.

## Validation

- Full SQL-backed .NET suite: 309 passed, including production resolver/filter, missing L1/L2/L3, independent actions, multi-role union, inactive/unknown keys, migration mappings, grant activation ceilings, endpoint inventory, SQL generation and model/snapshot consistency.
- Frontend TypeScript check and production build passed.
- Frontend Vitest suite: 71 passed.
- Playwright against the actual built SPA with intercepted HTTP: 5 passed, including four levels, partial selection, retained children, filtered/cancelled bulk staging, review/save, direct URL denial, failed-save draft retention and read-only administration.
- The owner approved isolated test databases and services. The packaged deployment SQL applied successfully twice to a uniquely named temporary database, its read-only grant preview ran, and 31 migration-history entries with 330 hierarchy definitions were verified. The full real API/SQL Playwright suite passed 149 tests. All temporary databases used for this release validation were deleted afterward.
- Existing NuGet vulnerability-feed connectivity, xUnit and EF1002 dynamic-SQL analyzer warnings remain. The cascade queries construct identifiers from EF model metadata, and warrant a separate security review. The production entry JavaScript is 898.45 kB, below the existing 900 kB browser budget with little headroom.

The production package contains these implementation details, the complete permission inventory, migration/preview SQL and release validation status. See [RELEASE-NOTES-2.44.0.md](RELEASE-NOTES-2.44.0.md).

## Files changed for this task

This list describes this task's work. Numerous authorization files already had uncommitted changes before the task; that work was preserved. No commit or push was performed.

- Model/backend: `Modules/Access/AccessEntities.cs`, `Data/HubDbContext.cs`, `Security/ResourcePermissions.cs`, `Security/PermissionHierarchy.cs`, `Security/PermissionRegistry.cs`, `Security/CapabilityPermissions.cs`, `Security/HierarchyEndpointPermissions.cs`, `Security/UserContext.cs`, `Security/SignIn.cs`, `Security/AuthorizationAdministrationFilter.cs`.
- Endpoint integration: `Modules/Admin/RoleEndpoints.cs`, `Modules/Admin/AdminEndpoints.cs`, `Modules/Clients/ClientEndpoints.cs`, `Modules/Clients/OrganizationEndpoints.cs`, `Modules/Reporting/OverviewEndpoints.cs`, `Modules/Reporting/ExportService.cs`, `Modules/Reporting/ExportWorker.cs`, `Modules/Work/CaseEndpoints.cs`, `Modules/Teams/TeamEndpoints.cs`, `Modules/Shared/Deletion.cs`, `Modules/Shared/Cascade.cs`.
- Migration: the new migration/designer, `Data/Migrations/HubDbContextModelSnapshot.cs`, `database/01-schema.sql`, `database/03-permission-hierarchy-review.sql`.
- Frontend: `permissions.ts`, `hooks.ts`, `App.tsx`, generated `permissionManifest.json` and `permissionRequirements.json`, `exportPermissions.ts`, `pages/Admin.tsx`, `pages/adminRightsModel.ts`, `pages/admin-rights.css`, `pages/Clients.tsx`, `pages/Environments.tsx`, `pages/Cases.tsx`, `pages/OrganizationStructure.tsx`, `pages/Notes.tsx`, `pages/Notifications.tsx`, `pages/Teams.tsx`, `pages/Quality.tsx`, `pages/Configuration.tsx`, `pages/Reports.tsx`, `pages/reporting/MyReports.tsx`, `pages/reporting/CasesBuilder.tsx`.
- Tests: `PermissionHierarchyTests.cs`, `HierarchicalAuthorizationIntegrationTests.cs` (four SQL-backed tests added; pending approval to execute), updated existing .NET permission fixtures (`A63Tests`, `ClientLogoTests`, `Stage1IntegrityTests`, `Stage3ReportingTests`, `GranularAuthorizationTests`, `AcceptanceTests`, `UnitTests`), `hierarchicalPermissions.test.ts`, `testPermissionFixtures.ts`, updated existing frontend permission/export/logo fixtures, `hierarchy-ui.spec.ts`, `playwright.hierarchy.config.ts`, updated `granular-rights.spec.ts` and `resource-permissions.spec.ts`.
- Build/docs: `build/PermissionManifest/{Program.cs,PermissionManifest.csproj}`, `build/Build-Release.ps1`, `Directory.Build.props`, frontend package/lock versions, this report, the generated hierarchy matrix, release notes, README/operations links and release validation evidence.

Regenerate frontend permission metadata with `dotnet run --project build/PermissionManifest`. This tool does not start a host or connect to a database. Never regenerate a historical migration's frozen mapping from a future manifest.
