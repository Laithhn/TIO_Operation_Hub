# 2.44.0 upgrade: Invalid column name 'NodeType'

The original 2.44.0 idempotent schema script adds `iam.PermissionDefinition.NodeType` and `DisplayOrder`, then references them in a data-update block in the same SQL Server batch. SQL Server can bind those references before the columns exist. Checking migration history with `IF NOT EXISTS` does not prevent this compilation error.

The fix wraps the complete hierarchy data-update block in `EXEC(N'...')`, with escaped string literals. The block is compiled after the column additions execute. Its manifest, compatibility mappings, audit entries, authorization version update, migration-history guards and transaction remain unchanged. The migration source includes the same fix so future script generation retains it.

Microsoft documents this workaround in [Managing Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/managing#arbitrary-changes-via-raw-sql).

## Retry the failed upgrade

1. Keep the pre-upgrade database backup. The reported failure occurs before the upgrade script stops IIS or replaces application files. Earlier migrations in the schema script may already have committed; the database state has not been inspected by this fix.
2. Replace only `database/01-schema.sql` in the extracted 2.44.0 package with the corrected file supplied in the SQL hotfix. Keep the original script for comparison. When repaired locally, the original is retained as `01-schema.before-NodeType-fix.sql` beside the replacement.
3. Review the corrected script and rerun the original `Upgrade-TioHub.ps1` command in elevated PowerShell, with the same parameters and without `-SkipDatabase`. It takes another database backup and skips migrations already recorded as applied. The hierarchy migration remains transactional.
4. Confirm the upgrade reports `/api/health/ready -> ready`, then verify sign-in and role permissions.

This error alone does not establish that a database restore is needed. Do not add columns or migration-history rows manually, and do not bypass the schema step with `-SkipDatabase`.

## Validation and limits

Two service-free regression tests check the generated idempotent migration and the repository deployment SQL. Both failed against the original SQL. They require one deferred batch containing the new-column updates, table variables, audit write and authorization version update.

These checks do not execute SQL. No migration, database connection, IIS operation or deployed application change is performed while preparing the hotfix. SQL-backed upgrade and repeat-run validation still require an approved isolated database. The original release ZIP is unchanged; use the SQL hotfix or the repaired extracted package.

The combined `DeploymentSqlTests` and `PermissionHierarchyTests` run produced 20 passes and one failure: `Generated_frontend_requirements_match_the_authoritative_manifest` throws `KeyNotFoundException` while reading the frontend manifest. That test does not exercise the changed migration or SQL. Its files were left unchanged by this fix. Existing analyzer warnings remain, and the NuGet vulnerability feed was unreachable. No TypeScript or browser behavior changed; frontend and Playwright tests were not run.

Source files changed for this fix: `database/01-schema.sql`, `src/TioHub.Api/Data/Migrations/20261102110000_HierarchicalPermissions.cs`, `tests/TioHub.Tests/DeploymentSqlTests.cs`, and this troubleshooting note. The supplied hotfix uses the original shipped SQL plus only the deferred hierarchy block, preserving differences between that release and the current working tree.
