/*
  TIO Operations Hub: access-control upgrade review (read-only).

  Run before and after the 2.45.0 schema script, on the restored copy first, and keep the output with the change record.
  Nothing here changes data. Section 5 contains one commented-out statement that an approved rollback needs; it is not run by this script.

  sqlcmd -S <server> -d <database> -E -b -i database\04-access-control-upgrade-review.sql
*/
SET NOCOUNT ON;

PRINT N'== 1. Accounts given broad scope by the legacy compatibility migration (PreserveLegacyEffectiveScopes)';
IF OBJECT_ID(N'iam.LegacyScopeUpgrade') IS NOT NULL
    EXEC(N'SELECT * FROM iam.LegacyScopeUpgrade ORDER BY 1;');

PRINT N'== 2. Accounts and group mappings that currently hold broad scope; narrow what the business does not need';
SELECT u.Id, u.AccountName, u.IsActive, u.AllClients, u.AllInternal,
       (SELECT COUNT(*) FROM iam.UserRole r WHERE r.UserId = u.Id) AS DirectRoles
FROM iam.[User] u WHERE u.AllClients = 1 OR u.AllInternal = 1 ORDER BY u.AccountName;
-- A mapping's broad scope also reaches everyone who joins the group later.
SELECT m.Id, m.GroupName, m.[Role], m.AllClients, m.AllInternal
FROM iam.GroupMapping m WHERE m.AllClients = 1 OR m.AllInternal = 1 ORDER BY m.GroupName;

PRINT N'== 3. Individual exceptions, with scope where the column exists';
IF COL_LENGTH(N'iam.UserPermissionOverride', N'ClientId') IS NOT NULL
    EXEC(N'SELECT o.UserId, u.AccountName, o.PermissionKey, o.Effect, o.ExpiresAt, o.ClientId, o.ProjectId, o.TeamId
           FROM iam.UserPermissionOverride o JOIN iam.[User] u ON u.Id = o.UserId ORDER BY u.AccountName, o.PermissionKey;');
ELSE
    SELECT o.UserId, u.AccountName, o.PermissionKey, o.Effect, o.ExpiresAt
    FROM iam.UserPermissionOverride o JOIN iam.[User] u ON u.Id = o.UserId ORDER BY u.AccountName, o.PermissionKey;

PRINT N'== 4. Generated exports without an access fingerprint: downloads refuse these, so they must be regenerated';
IF COL_LENGTH(N'reporting.ExportJob', N'AccessFingerprint') IS NOT NULL
    EXEC(N'SELECT COUNT(*) AS ExportsToRegenerate FROM reporting.ExportJob WHERE AccessFingerprint IS NULL AND StoredPath IS NOT NULL;');

PRINT N'== 5. Scoped exceptions block a rollback to an earlier application';
-- Earlier applications ignore the scope columns and would apply every scoped row as a GLOBAL exception.
-- The migration's Down refuses while these exist. An approved rollback restores the backup, or reviews and removes these rows first:
--   DELETE FROM iam.UserPermissionOverride WHERE ClientId IS NOT NULL OR ProjectId IS NOT NULL OR TeamId IS NOT NULL;
IF COL_LENGTH(N'iam.UserPermissionOverride', N'ClientId') IS NOT NULL
    EXEC(N'SELECT COUNT(*) AS ScopedExceptionsBlockingRollback FROM iam.UserPermissionOverride WHERE ClientId IS NOT NULL OR ProjectId IS NOT NULL OR TeamId IS NOT NULL;');
