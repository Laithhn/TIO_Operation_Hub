# TIO Operations Hub 2.48.0

Prepared 3 November 2026. Validation state: see [RELEASE-VALIDATION-2.48.0.md](RELEASE-VALIDATION-2.48.0.md). This document does not by itself mean the release is approved for deployment.

## Users, roles and rights are re-engineered (A81)

A person holds roles, roles hold rights, and rights come from one catalog defined in code. The design and its reasoning are in [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md).

**Nobody's access should change.** The upgrade works out each person's access under the old rules and keeps it. The exceptions are listed under "What people will notice".

### For administrators

- **Users** lists all of a person's roles, and marks the ones inherited from a directory group. It previously showed only the first role.
- **Roles** shows who holds a role and compares roles side by side.
- **Rights** lists rights by module and feature, and marks each as Access (open a feature) or Action (do something in it). The module, submodule and tab grants you had to tick above each action are gone. Where a right needs another, the page warns you and offers to add it. A grid shows each module with one row per feature and one column per action; a list shows the same rights with their descriptions.
- **Access review** replaces Access control. It shows what a person can do and why, and holds Check access, individual exceptions and incompatible roles. Role and assignment editing moved to Roles and Users, so each has one home.
- **Directory group mappings** can now name any active roles, several if needed, and can be edited. They could previously name one of two built-in roles.

See [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md).

### What stays the same

Identities, passwords and the 12-character policy, lockout, sessions, role names and grants, multiple roles, data scope, individual and limited exceptions, delegation limits, self-change restrictions, last-administrator protection, deactivation and retained-history deletion rules, and audit history.

### What people will notice

- **Old exports must be regenerated.** Their access fingerprints include the rights list, so existing files are refused for download.
- **Export, Technical detail and Audit boxes on users and group mappings are gone.** Those stored values never had any effect. Access came from roles, so nobody loses anything, but someone who relied on them being true never had that access.
- **A stored grant that could never work is dropped.** Under the old rules an action without its module, submodule or tab grant did nothing, and came back if the parent was restored. Such grants are not carried over.
- **Rare: an administrator who used a right only by combining two roles loses it.** Direct allows don't apply to administrators, so the upgrade cannot preserve this. The review script lists them, so correct a role first (decision D7).

### Security

- **Every API operation now has a recorded decision.** A route with no entry is refused, where before it would have had no policy. A test fails if any route is missing.
- **Policies match the route, not the URL text,** so casing and path tricks can't select a different policy.
- **Holding a right now includes what it depends on,** in one check. For example, `Cases:Export` is only effective with `Platform:Export`.

## Upgrade

**Read [RIGHTS-MODEL-UPGRADE.md](RIGHTS-MODEL-UPGRADE.md) first.**

1. On a restored copy of the target database, run `database/05-rights-model-upgrade-review.sql` and keep the output.
2. Review section 2 of that output and make any decisions it needs.
3. Take the deployment backup and apply `database/01-schema.sql`. Migration `RightsModel` adds four tables. Old tables and columns stay, unread.
4. Deploy the application files.

**Rollback:** restore the 2.47.0 files and leave the database. Access returns to its state at upgrade time; changes made since are not in the tables 2.47.0 reads.

## API changes

These are breaking for anyone calling the administration API directly.

| Before | Now |
|---|---|
| `GET /me`: `permissions`, `rights` (old flags), `businessRole`, `isAdministrator`, `grants`, `scopedAllowPermissions` | `rights` (effective keys), `scopedAllowRights` |
| `GET /admin/roles`: `rights`, `permissions`; each role `rights`, `permissions` | `catalog`; each role `rights` |
| `POST`/`PUT /admin/roles`: `rights`, `permissions` | `rights` (catalog keys) |
| `/admin/users`: `roles`, `roleId`, `roleIds`, `export`, `technicalDetail`, `audit` | `roleIds` only. Responses add `roles` and `directoryRoles` |
| `/admin/group-mappings`: `role`, `export`, `technicalDetail`, `audit` | `roleIds`. Responses add `roles` |
| `/admin/users/{id}/permission-overrides`: `overrides`, `scopablePermissions` | `/admin/users/{id}/right-exceptions`: `exceptions`, `scopableRights` |
| `/admin/users/{id}/access`: `effectivePermissions`, `restrictedPermissions`, `grants` | `effectiveRights`, `restrictedRights` |
| `/admin/users/{id}/access-simulation?permission=` | `?right=` |
| | New: `GET /admin/roles/{id}/holders` |

The `permissions` object on a record, such as `GET /cases/{id}`, is unchanged. Those are flags the server works out for that record.
