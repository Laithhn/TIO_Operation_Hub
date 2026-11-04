# Authorization administration and rollout — 2.43.0

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

Client structure and projects are separate permission resources. `ClientStructure` controls clients, sub-clients, regions and organization relationships; `Projects` controls project pages, records, attachments and history. The upgrade migration copies each existing role's project-related `ClientStructure` grants into `Projects` once, then the two resources can be changed independently.

## Configure and verify a role

1. Open Administration → Roles. Create a custom role or clone an existing one. A new role has no permissions; cloning copies explicit assignments for review.
2. Open Rights and permissions and select the role. Expand a module and resource. A disclosure arrow only opens the group.
3. Select individual leaves. Search accepts a display name or a stable key such as `Cases:View`. Filters and role comparison help locate the grants to change.
4. Review prerequisite warnings. Selecting an action does not automatically select its prerequisites. Group changes require an explicit confirmation and affect only the shown leaves.
5. Choose Review and save. Read the before/after impact and sensitive-action warnings, then confirm Save permissions. The entire role assignment set saves atomically. A stale row version is rejected; reload the latest role and review the retained draft.
6. Open Users and access, assign one or more active roles to a test user, then inspect Effective access. Role grants combine as a union; inactive roles contribute nothing. An action becomes effective only when all prerequisites are granted across the combined roles.
7. Sign in as the test user. Confirm the page and direct API behavior, then revoke a grant and repeat the request. Avoid testing with the locked TIO Manager role: it deliberately retains all permissions.

## Registered capability semantics

| Action | Prerequisites | Enforcement |
|---|---|---|
| View | Explicit grant; dashboard additionally needs all source module View grants | Navigation, routes, API reads and query/service access |
| DetailsView | Same resource View | Detail routes and numeric record API endpoints |
| Create / Maintain / Coordinate / ArchiveRestore / Delete | Same resource View | Existing owning-module operation guards, scopes, workflow and concurrency checks |
| HistoryView | Same resource View + DetailsView; existing Audit right also required | History queries and embedded case/commitment/escalation events |
| AttachmentsView | Same resource View + DetailsView | File list, preview and download; owning record scope is checked |
| AttachmentsUpload | Same resource View + DetailsView + AttachmentsView | Upload and description update; record editing is independent |
| AttachmentsDeleteOwn | Same resource View + DetailsView + AttachmentsView | File deletion only when the actor is its uploader |
| AttachmentsDelete | Same resource View + DetailsView + AttachmentsView | Delete any file within the authorized owning-record scope |
| Export | Source resource View, Reporting View, existing global Export right; multi-source reports require each source Export | List buttons, report generation, workers, retry and stored downloads |

The tree is a presentation hierarchy, not grant inheritance. Role comparison compares assignments; the inspector shows effective grants after dependencies. Sensitive grants remain explicit. Permission keys do not change when labels change.

## Client tabs

The client page is a shell for independently permissioned sections. Opening the shell requires client scope plus View permission for at least one available tab. The shell returns basic client identity; client structure, ownership, parent/child details, and team information are included only with their corresponding permissions.

| Tab | Required view permissions |
|---|---|
| Regions & environments | `ClientStructure:View` and `Environments:View` |
| Organizations, projects | `ClientStructure:View` |
| Contracts & SLAs | `Contracts:View` |
| Cases | `Cases:View` |
| Commitments | `Commitments:View` |
| Escalations, contacts & responsibilities | `OtherOperations:View` |
| Infrastructure | `Servers:View` |
| Attachments | `ClientStructure:AttachmentsView` and its prerequisites |
| My notes | `PersonalNotes:View` |
| History | `ClientStructure:HistoryView` and the Audit right |

The API enforces the selected overview tab’s grant and the client’s scope. Nested values such as application, asset, and case summaries are separately permission-gated. Project scope can expose the client shell and project-linked records; personal contacts remain limited to full client scope.

## Registry, audit and revocation

`ResourcePermissions.Catalog` and `Registry` explicitly describe supported capabilities. `iam.PermissionDefinition` holds synchronized metadata. Startup synchronization serializes on the database generation row, updates metadata idempotently and deprecates removed keys without deleting assignments. It never performs a compatibility regrant.

`UserContext` and `AccessCalculator` enforce default denial, active users/roles, union across roles and deterministic prerequisite filtering. Existing scopes remain mandatory. Background report generation resolves the requester again and checks source permissions; saved files cannot be downloaded after access is revoked.

`HubDbContext.SaveChangesAsync` advances the singleton authorization version in the same transaction as access changes and audit entries. `UserResolver` reads it before every cache hit, so a committed role/user/group change invalidates every instance's prior snapshot on the next request. Failure to read authoritative state fails closed. UI snapshots refresh within 15 seconds while active and on focus. In-flight operations keep their authorization snapshot.

Role/user/group administration holds the generation lock across validation and save to serialize last-administrator checks. Self-authorization changes and grants beyond the actor's effective authority are refused. Relevant capability denials log an AccessDenied audit event with actor, correlation, method and route template; no request bodies or tokens are recorded. Authorization history is available through the existing Access category audit screen.

## Upgrade and rollback

The new `20261030080145_GranularAuthorization` migration creates `iam.AuthorizationVersion` and inserts compatibility assignments once for roles that existed before the upgrade. Every old role retains its prior broad record visibility. File upload/own-delete grants derive from the old shared OtherOperations Maintain policy; any-file deletion derives from OtherOperations Delete; per-resource exports derive from the existing Export right. The upgrade writes an audit event per affected role.

Review the SQL, back up the database and application data, then have the DBA apply `database/01-schema.sql` before replacing application files. Keep production startup migrations disabled. No deployment script is run by this development task.

For an application rollback, stop the application and restore the prior application files and configuration according to OPERATIONS.md. Keep the additive schema and assignments; older code ignores the new capability names. The migration Down drops the authorization generation table but deliberately preserves assignments and audit. Do not run Down while the 2.43 application is running. Any database rollback or reapplication of compatibility migrations requires DBA review because an Up applied again can recreate compatibility grants.

## Commands

```powershell
dotnet test tests/TioHub.Tests --no-restore
Push-Location src/web
npm test
npm run build
Pop-Location
Push-Location tests/e2e
$env:TIOHUB_E2E_PORT='5198'
npx playwright test granular-rights.spec.ts resource-permissions.spec.ts
Pop-Location
.\build\Build-Release.ps1
# DBA after backup and review, on the target server:
sqlcmd -S <server> -d TioHub -E -b -i database\01-schema.sql
```

## Verification and limits

Verification on 30 October 2026: the full .NET Release suite passed **284/284**, with no skips; all **62/62** Vitest tests passed; TypeScript and Vite production builds passed. The final focused browser run passed **8/8**: two new lifecycle/group-confirmation journeys and six existing resource-action journeys. The Release tests include a real migration from the 2.42 schema in an isolated generated database, role union, default denial, dependency removal, separate-instance cache invalidation, inactive users, file ownership and independent file/export rights. Existing compiler/analyzer warnings remain.

The screenshot [Rights editor with Cases permissions](evidence/authorization-2.43/rights-editor-cases.png) shows the actual application under Playwright. The package pipeline is run with `-SkipTests` only after the full Release suite above passes, avoiding a redundant second full suite. No production/shared database migration or IIS deployment was performed. Windows authentication and production UAT were not exercised.

See AUTHORIZATION-CAPABILITY-MATRIX.md for the registered key inventory and AUTHORIZATION-FILES-CHANGED.md for the exact source file inventory. The original discovery matrix remains a historical gap inventory; a registered permission does not imply that every conceivable field or workflow transition is independently configurable.

Known limits: no explicit user deny model, no new tenant model, and no independent permission for every individual field or workflow transition. Client tabs have independent view grants, but several legacy composite screens still expose multiple related values subject to their own permissions. Existing record scopes and protected system-role behavior remain part of the application policy. Manually editing authorization tables outside the application bypasses generation updates; supported administration APIs should be used.
