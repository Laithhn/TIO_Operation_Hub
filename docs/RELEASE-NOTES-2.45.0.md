# TIO Operations Hub 2.45.0

Prepared 3 November 2026. Validation state: see [RELEASE-VALIDATION-2.45.0.md](RELEASE-VALIDATION-2.45.0.md). This document does not by itself mean the release is approved for deployment.

## Individual permission exceptions limited to a scope

An individual allow or deny can now apply to one client, one project or one internal team instead of everywhere in the person's data scope.

- **Three permissions can be limited in this release:** `Contracts:Maintain`, `Commitments:Maintain` and `Environments:Maintain`. Everything else keeps global exceptions and the API refuses a scope for it. These were chosen because every path that uses them now evaluates the record, and no list, report, export, notification or attachment path reads them.
- A limited allow applies only when the whole record lies inside the scope and never adds data visibility. A limited deny applies when any part of the record touches the scope, including links the actor cannot see. If the project association cannot be established, a project allow does not apply and a project deny denies.
- Moving a contract or environment between projects, or relinking a commitment, needs authority over both the old and the new location.
- The Access Control exception editor shows an "Applies to" field for these permissions. Inspection and Check access show each limited exception, whether it applies to the selection, and the outcome of the same decision the operation uses.

The evaluation order is mandatory restrictions, then matching denies, then covering direct allows, then role allows, then default deny, with prerequisites resolved at the same record and time.

## Cascade delete and preview for delegated administrators

Cascade preview and delete no longer need global client and internal scope. Every client and team reached by the rows to be deleted or unlinked must lie inside the person's full data scope. One row outside it stops the whole operation with the same answer as a missing record, so nothing about the hidden row can be inferred. Preview and delete use the same check, and delete holds serializable locks from the check to the commit.

## Security corrections

- **Single-record deletes now need full client scope**, the same as editing and archiving. Before, project-only summary visibility satisfied the check on regions, projects, contacts, responsibility boundaries, environments, servers, installations, components, volumes, commitments and escalations. A project-scoped person holding a Delete permission could therefore remove client-wide records they could not edit. This reduces what project-scoped people can do.
- **Last-administrator checks in Windows and Development modes** now prove effective user-administration permissions after denies, prerequisites, inactive roles and role conflicts. Holding a role named like an administrator role no longer counts. If this blocks a change you expect to work, give another account effective `AdminUsers:View` and `AdminUsers:Maintain` first.
- **People who have never signed in can be named again.** In directory modes, an account that had not signed in, or held a snapshot in an older format, resolved as having no access. It could not be chosen as an owner, backup owner, handover recipient or report recipient, and the message wrongly said it had no access to the client. On an upgraded database this would have affected every person until their next sign-in. Naming and read-only inspection now use direct assignments. Delegation and authorization decisions still refuse an unreadable snapshot. An account that has never signed in is treated like one being created.
- **Failed scheduled reports are visible to their recipient again.** The recipient's failure notice was hidden and schedule history masks the reason, so a failed run gave no signal at all. The notice now shows for that person's own failed run while they can still read that report type. Schedule history stays masked.
- **The exception editor's "saved" confirmation now stays on screen.** It used to vanish immediately when the saved version reloaded.
- **Forms setup** now writes its audit entry inside the transaction and consumes the one-time code only after the commit, so a failure cannot leave a consumed code with no audit record.

## Directory evidence

Access inspection states what its directory groups rest on: last observed at sign-in (with the time), unavailable, or current from the directory. An optional live lookup exists for Windows mode (`Auth:LiveDirectoryLookup`, `Auth:DirectoryUpnSuffix`). **It is off by default and has not been run against a real domain**, because that needs a domain and the service account's rights. A failed lookup falls back to the snapshot and never adds access.

## Separation of duties

No workflow approval was added. The reasoning and the owner decision it leaves open are in [DECISIONS.md](DECISIONS.md) (A75).

## Upgrade

1. Run `database/04-access-control-upgrade-review.sql` and keep the output.
2. Take the deployment backup, then apply `database/01-schema.sql`. Migration `ScopedPermissionExceptions` adds an identity key and three nullable scope columns to `iam.UserPermissionOverride`, with a single-scope check, foreign keys and per-scope unique indexes. Existing exceptions stay global, with the same effect and expiry.
3. Deploy the application files.

**Rollback needs care:** see the 2.45.0 note in [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) section 8. An earlier application would apply limited exceptions globally.

Upgrading from before 2.42 also brings the earlier migrations; review [AUTHORIZATION-DATA-SCOPE-UPGRADE.md](AUTHORIZATION-DATA-SCOPE-UPGRADE.md), especially the broad scope the compatibility migration preserves, including for future members of existing group mappings. Exports generated before fingerprints existed must be regenerated. Section 4 of the review script counts them.

## API changes

- `PUT /admin/users/{id}/permission-overrides` accepts `clientId`, `projectId` or `teamId` on an exception. Other unknown fields are still rejected.
- `GET` on the same path adds `scopablePermissions` and, per exception, the three scope fields and `scopeLabel`.
- `GET /admin/users/{id}/access` adds `scopedExceptions` and `directoryEvidence`.
- `GET /admin/users/{id}/access-simulation` adds `scopedExceptions`.
- `GET /me` adds `scopedAllowPermissions`.
