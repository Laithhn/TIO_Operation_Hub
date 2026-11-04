# Users, roles and rights: replacement design (A81)

**Status:** implemented in 2.48.0, committed and packaged, not deployed. Pending owner review of section 7 and a check on a copy of real data. See [RELEASE-VALIDATION-2.48.0.md](RELEASE-VALIDATION-2.48.0.md).
**Implements:** the owner's user management reference guide, which is not kept in this repository. Assignment rules are out of scope.
**Coverage:** [RIGHTS-COVERAGE-MATRIX.md](RIGHTS-COVERAGE-MATRIX.md). **Upgrade and rollback:** [RIGHTS-MODEL-UPGRADE.md](RIGHTS-MODEL-UPGRADE.md).

## 1. What was there before

Seven mechanisms could affect one authorization decision. Together they made it hard to say why someone could or could not do something.

| # | Component (2.47.0) | Stored in | What it did | Replaced by |
|---|---|---|---|---|
| 1 | `Right` flags: Edit, Manage, Archive, Delete, Export, TechnicalDetail, Audit, Administer | `iam.AppRole.Rights` | Four flags still gated Export, Technical detail, Audit and Administration. The other four were only translation input | Four catalog rights under `Platform` |
| 2 | `Grant` flags | `iam.User.Grants`, `iam.GroupMapping.Grants` | **Stored and shown in forms but ignored at sign-in.** Effective grants were derived from `Right` | Removed. See "Effective access" in section 5 |
| 3 | `Role` enum, `BusinessRole`, `IsLead`, `Can()`, `HasRight()` | `iam.GroupMapping.Role`, code | Compatibility helpers. Directory groups could map only to two built-in roles | `iam.GroupMappingRole` and `HasAccess`; the helpers are gone |
| 4 | Four-level hierarchy: module, submodule and tab `:Access` nodes above each action, 330 definitions | `iam.PermissionDefinition`, `iam.AppRolePermission` | An action worked only if all its container nodes were also granted, even though the containers meant nothing alone | Rights with explicit prerequisites. Containers are removed |
| 5 | Path-parsing filters: `CapabilityPermissionFilter`, `HierarchyEndpointPermissions`, `CapabilityPermissions.ReadResources` and `DetailResource` | Code | Derived the required right by splitting the URL string. New endpoints silently had no policy | `EndpointRights`: one table keyed by route template, default deny |
| 6 | Per-user exceptions, global and scoped | `iam.UserPermissionOverride` | Direct allow or deny | **Kept** as `iam.UserRightException` (guide 4.2.5). Keys converted |
| 7 | Role conflict policy, data scope, delegation limits, last-administrator checks, session handling | Settings, `iam.UserScope` and others | Safeguards | **Kept** (guide 3, 4.3). Rewritten only where they read 1 to 4 |

Dependencies that read those mechanisms: `Modules/*` handlers (about 250 checks), `HubAccess`, `ExportService`, `ExportWorker`, `ScheduledExportAccess`, `ExportAccessFingerprint`, `Notifications`, `Deletion`, `Cascade`, seeds, `HubDbContext` query filters, `build/PermissionManifest`, the frontend `permissions.ts`, `hooks.ts`, generated JSON, Admin and Access pages, 56 backend test files and 14 browser specs.

## 2. The new model

```
User ──many── Role ──many── Right (code-defined catalog)
  │             ▲
  │             └── Directory group mapping ──many── Role
  ├── Right exceptions (allow or deny, optional expiry and scope)
  └── Data scope (clients, projects, teams; separate from rights)
```

- **Catalog.** `Security/RightsCatalog.cs` is the only definition of rights. Each has a stable key, label, description, module, feature, kind (`Access` to see a feature, or `Action` to do something), risk, scope eligibility and direct prerequisites. Ordinary role editing cannot create, rename or remove keys.
- **Stable keys.** Action keys such as `Cases:View` and `tab.ClientStructure.contracts:View` keep their spelling, because the guide asks for stable TIO keys and audit history quotes them. Only container nodes disappear. One container has a real meaning and survives as a right: `ClientStructure:Access` (open the clients page).
- **Cross-cutting rights are ordinary rights.** `Platform:Administration`, `Platform:Export`, `Platform:TechnicalDetail` and `Platform:Audit`. They are prerequisites of the rights that depended on them, so one check covers both: `AdminUsers:View` requires `Platform:Administration`, `Cases:Export` requires `Platform:Export`, `Cases:HistoryView` requires `Platform:Audit`.
- **Protected role.** TIO Manager still always holds every right and cannot be deactivated, deleted or reduced.

## 3. Decision order

Unchanged from 2.45 (guide 4.2.5). `UserContext` and `AccessCalculator` hold the only implementation:

1. Account inactive or conflicting roles: no access.
2. Union of the rights of all active direct and directory-mapped roles, limited to active catalog keys.
3. Global exceptions: allows are added (except for accounts holding `Platform:Administration`), denies are removed. Denies win.
4. Prerequisites are resolved repeatedly until stable. A right with a missing prerequisite is not effective.
5. Record operations on scope-eligible rights apply scoped exceptions through `AuthorizationDecisions.Decide`.
6. Data scope, ownership and workflow checks apply separately. A right never widens data scope.

## 4. Enforcement

- **Endpoint table.** `Security/EndpointRights.cs` maps every `METHOD route-template` to a decision: `Public`, `Authenticated`, `Rights(...)`, or a named `Dynamic` policy where the requirement depends on the record or a query value. `EndpointRightsFilter` applies it to all of `/api/v1`. **A route not in the table is refused**, and `EndpointRightsCoverageTests` fails the build if any route is missing. Matching uses the route template, so URL casing and path tricks cannot skip a policy.
- **Handlers** keep record-level checks: scope, ownership, workflow, contextual exceptions. They use the same `UserContext`.
- **Browser.** `rights.ts` mirrors prerequisites for display only and fails closed. Each API call is enforced again on the server.
- **Sessions.** Unchanged. A committed access change advances `iam.AuthorizationVersion`, so the next request on every instance re-resolves access.

## 5. Old-to-new mapping

| Existing item | Handling | Effect on effective access |
|---|---|---|
| Users, identities, credentials, sessions | Unchanged | None |
| Direct role assignments (`iam.UserRole`) | Unchanged | None |
| Roles (id, name, key, active) | Unchanged. `Rights` flags become `Platform:*` grants | None |
| Action grants | Copied to `iam.RoleRight` when the role itself also held the action's containers | None. See composition below |
| Container grants | Not carried, except `ClientStructure:Access` | None |
| Assignments that were stored but ineffective because a container was missing | **Not carried**, and recorded in the upgrade audit | None. They could not be used. They will no longer return when a container is restored |
| Directory mappings | `Role` becomes a row in `iam.GroupMappingRole` for the same built-in role. Scope unchanged | None. Mappings may now name any active role |
| `User.Grants`, `GroupMapping.Grants` | Not carried. They had no runtime effect | None. **The value shown in the form was misleading and disappears** |
| Data scopes, group scopes | Unchanged | None |
| Global leaf exceptions | Copied. An allow is carried only if it was effective | None |
| Exception on a container | A deny becomes a deny on each action below it. An allow is dropped, and access it enabled is kept by the composition rule | None |
| Scoped exceptions | Copied | None |
| Role conflict policy | Unchanged, role ids are stable | None |
| Audit history | Untouched. Old entity names stay readable, and the access filter accepts old and new names | None |
| Export files | Fingerprints include the rights snapshot, so existing files must be regenerated | **Visible change**: old files are refused for download, as after 2.45 |

**Composition.** Before, role A could supply a container that made an action in role B effective. Rights in the new model have no containers, so the migration handles this explicitly:

1. If the role holds the action's containers, it keeps the action.
2. Otherwise, if the role has holders and **every** holder got the containers from another role, the role keeps the action.
3. Otherwise each holder for whom the action was effective receives a direct allow, written to the audit. The role does not keep the action.

Accounts holding `Platform:Administration` ignore direct allows by design, so rule 3 cannot apply to them. They are listed by the upgrade check for an owner decision.

**This cannot silently widen access.** A new right is effective only if the old key and all its containers were present for that person, and the prerequisites that remain are the same. Rule 2 has one forward effect: a *future* holder of that role gets the action without a separate container, because containers no longer exist.

## 6. Data, upgrade, rollback

New tables: `iam.RightDefinition`, `iam.RoleRight`, `iam.UserRightException`, `iam.GroupMappingRole`. Old tables and columns stay in the database with no code reading them, so an application rollback works and data is not deleted. Removing them is a later, separately approved migration. Details are in [RIGHTS-MODEL-UPGRADE.md](RIGHTS-MODEL-UPGRADE.md).

## 7. Decisions for the owner

Nothing below blocks delivery: each uses the guide's safe interim treatment, and nothing changes until you decide.

| # | Decision | Interim treatment in this release |
|---|---|---|
| D1 | Require at least one direct role? | Not required. Access can come from directory mappings or exceptions |
| D2 | Default role for new users? | None |
| D3 | Make display name immutable? | Stays editable. Account name stays immutable |
| D4 | Add comments or a true last-activity field? | Neither. The UI says **Last sign-in** |
| D5 | Change role names or default grants? | Retained: TIO Manager, Operation Engineer |
| D6 | Change password or lifecycle policy? | Retained: 12-character minimum, temporary passwords, lockout |
| D7 | **Administrators who relied on composition** (section 5, rule 3) | Listed by the upgrade check. They lose that action until a role is corrected. The owner should review the list before upgrading |
| D8 | **Drop the retired tables and columns**, and when | Retained until a later approved migration |
| D9 | Direct exceptions as a permanent feature? | Retained, as the guide requires. They are a second way to grant access besides roles |
| A75 | Approval workflow, four-eyes (still open from 2.45) | Not implemented |
