# Authorization administration guide

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

For the latest access-control implementation, deployment cautions and outstanding work, use [ACCESS-CONTROL-IMPLEMENTATION.md](ACCESS-CONTROL-IMPLEMENTATION.md). For the 2.43 editor and capability inventory, use [AUTHORIZATION-2.43.md](AUTHORIZATION-2.43.md) and [AUTHORIZATION-CAPABILITY-MATRIX.md](AUTHORIZATION-CAPABILITY-MATRIX.md). The sections below record the initial 2.42 foundation and its limits at that release; they are historical where they differ from the latest implementation review.

## Current controls

The Administration → Rights screen manages resource/action grants. A role grant authorizes an action category such as `Cases:Maintain`; record visibility and client/project/team scope are evaluated separately by the API. The parent grouping in the permission catalog is for display only and does not grant child permissions.

The catalog metadata is stored in `iam.PermissionDefinition` and synchronized from the explicit `ResourcePermissions.Registry` manifest at application startup after schema readiness succeeds. Keys are immutable identifiers. Synchronization updates system-managed labels and descriptions, adds new rows, marks keys removed from the manifest inactive, and does not remove `iam.AppRolePermission` assignments. Inactive keys are excluded from effective permission snapshots; retained assignments can be reviewed and removed.

When a user holds more than one role, resource permissions and legacy rights are combined as a union. Scope checks remain independent and mandatory. Direct exceptions can allow or deny individual permissions for non-administrators, including temporarily; an explicit deny takes precedence and can disable dependent permissions. Accounts holding the Administration right ignore direct allows, even if the exception was created before they received that right, while direct denies continue to apply until removed or expired. This ensures that an administrator cannot delegate authority derived from a temporary direct allow. Administration permissions are managed through roles, and the current exception editor does not change an administrator's exceptions. Individual exceptions use the user's existing data scopes; they do not add scope.

The shared `Can` component and permission hooks are UI presentation helpers only. Every API request remains subject to server-side checks. The role administration API requires Administration and blocks a non-manager administrator from granting resource permissions or cross-cutting rights that the administrator does not hold. A TIO Manager may grant all registered actions.

## Upgrade procedure

1. Review the code diff, generated migration `20261030062806_PermissionRegistry`, and the regenerated `database/01-schema.sql`.
2. Take a full SQL Server backup and confirm a tested restore point.
3. Have the DBA apply the idempotent schema script using the normal operations process. The script creates the permission metadata table and adds `iam.AppRole.IsActive` with a `true` default for existing roles; it does not change role assignments.
4. Deploy the matching application. Startup checks schema readiness before synchronizing registry metadata. It does not apply production migrations unless explicitly misconfigured.
5. Sign in as a TIO Manager, open Administration → Rights, and confirm the catalog and existing role assignments. Confirm users can still access their expected functions.

The development process did not execute this migration against any database.

## Rollback

The migration's `Down` operation drops `iam.PermissionDefinition` and the additive `iam.AppRole.IsActive` column; it does not delete roles or role-permission assignments. Production rollback should follow `docs/OPERATIONS.md`: stop the application and restore prior application files. The old application ignores the added schema. Do not run `Down` against production as an ad hoc rollback. If metadata must be removed, restore the pre-deployment backup in an isolated database and follow the approved DBA recovery procedure.

## Limitations recorded for the initial release

- The editable catalog still maps existing A63 resource/action categories; it does not yet expose independent read permissions for every page, tab, component, or field.
- The Roles and Rights pages do not yet provide role cloning, activation, comparison, permission-impact preview, access inspection, or simulation.
- Access caching uses the existing process-local generation invalidation. Multiple application instances need shared invalidation or a bounded distributed permission-version strategy before relying on immediate revocation across nodes.
- Last-administrator checks cover direct active role assignments and mapped manager groups during user updates, deactivation, and group-mapping changes. Keep at least one active directly assigned or mapped Manager/Administration account available during rollout.
- The permission coverage matrix is an inventory; the remaining action-by-action API review and negative security tests are required before claiming complete coverage.

