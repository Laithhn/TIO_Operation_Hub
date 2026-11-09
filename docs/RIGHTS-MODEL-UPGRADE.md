# Rights model: upgrade, verification and rollback

For the mapping and its reasoning, see [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md) section 5. The migration is `20261103155046_RightsModel`, included in `database/01-schema.sql`. Do not enable startup migrations in production.

## Before the upgrade

1. Restore a copy of the production or UAT backup to an isolated database. Never run the steps below on the live database first.
2. Run the read-only review on that copy and keep the output. It creates temporary tables only and makes the same calculation the migration makes:

```powershell
sqlcmd -S <isolated-server> -d <restored-copy> -E -b -i database\05-rights-model-upgrade-review.sql -o rights-review-before.txt
```

3. Read the output:

| Section | What it shows | What to do |
|---|---|---|
| 1. Summary | How many grants, allows and denies will be written | Sanity check |
| 2. Owner review | Administrators who lose a right they used through another role. Direct allows do not apply to administrators, so the migration cannot preserve this for them | **Decision D7.** Add the right to one of their roles before the upgrade if it is still needed |
| 3. Direct allows | People who keep access through a new individual allow | Consider fixing the role later, so these allows can go |
| 4. Denies | Denies to write, including those expanded from a container deny | Check that they read as intended |
| 5. Rule 2 grants | Role grants kept because every current holder could use them. **A future holder of that role gets them too** | Check that they suit the role |
| 6. Not carried | Stored grants that could not be used. They stop existing and will not return if a container is restored | Normally nothing |
| 7. Stored flags | Export, Technical detail and Audit values saved on users and mappings that never had any effect | If someone expected them to work, give them a role |
| 8. Unreadable snapshots | Accounts whose directory groups could not be read, so their mapped roles were not counted | They sign in again to refresh, or review them by hand |
| 9. Export files | Files whose access fingerprint no longer matches | Tell users that old exports must be regenerated |

4. On the same copy, apply `database\01-schema.sql`, start the application against it, and compare effective access for a sample of real accounts through **Administration → Access review**. Investigate every difference.

## The upgrade

1. Take the deployment backup.
2. The DBA applies the reviewed script. It is safe to re-run.

```powershell
sqlcmd -S <server> -d TioHub -E -b -i database\01-schema.sql
```

3. Deploy the 2.48.0 application files.
4. Sign in as a TIO Manager. Open **Administration → Rights** and check the catalog and a few roles. In **Change history**, filter on `RightsModelUpgrade` to see what was written per role and per person.
5. In Windows mode, sign in with real accounts holding directory groups. This has not been possible in development.

### What the migration does

- Creates `iam.RightDefinition`, `iam.RoleRight`, `iam.UserRightException` and `iam.GroupMappingRole`, and fills them.
- Drops the foreign keys of `iam.UserPermissionOverride`, so retired rows cannot block deleting a user, client, project or team.
- Gives the retired columns `iam.AppRole.Rights`, `iam.User.Grants` and `iam.GroupMapping.Grants` a default of 0, so new rows can be inserted.
- Writes `RightsModelUpgrade` entries to the audit trail and advances the authorization generation.

### What it leaves alone

Users, credentials, sessions, direct role assignments, data scopes, group scopes, the role conflict policy, audit history and every business record. `iam.AppRolePermission`, `iam.UserPermissionOverride`, `iam.PermissionDefinition` and the retired columns stay in the database. No code reads them. Removing them is a later migration that needs its own approval (decision D8).

## Rollback

| Situation | Procedure | Consequence |
|---|---|---|
| **Application problem after the upgrade** | Stop the application and restore the 2.47.0 files. Leave the database as it is. 2.47.0 ignores the new tables and reads the old ones | Access returns to its state **at upgrade time**. Role, right and exception changes made since then are not in the old tables and are lost to that version. Audit keeps the record of them |
| **Need to reverse the schema** | Restore the deployment backup to an isolated database, verify, then switch the connection string, as in [OPERATIONS.md](OPERATIONS.md) section 7 | Data entered since the backup is lost |
| **Development and test databases only** | `dotnet ef database update 20261103142553_JiraInternalMember` runs `Down`, which drops the four new tables and restores the old foreign keys | Everything changed under the rights model is lost. Do not use this in production |

If you go forward again after an application rollback, access changes made on 2.47.0 are not in the new tables. Reconcile them by hand through the audit trail, or restore from a backup taken before the rollback.

## What has been verified

See [RELEASE-VALIDATION-2.48.0.md](RELEASE-VALIDATION-2.48.0.md).
