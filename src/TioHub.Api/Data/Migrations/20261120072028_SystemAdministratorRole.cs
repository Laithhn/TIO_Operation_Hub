using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <summary>
    /// A127: one built-in, immutable role, "System Administrator", becomes the hub's single all-access role, and the reserved owner
    /// account (TioAdmin) is placed under it. The upgrade runs once:
    /// 1. Ensure the built-in System Administrator role exists (create if absent), always marked built-in, all-rights and active.
    /// 2. Every OTHER role that held all rights stores its current active rights explicitly (so its holders keep exactly what they had),
    ///    then stops holding all rights — from now on System Administrator is the only all-access role and the only one that receives future rights.
    /// 3. TioAdmin is assigned the System Administrator role and removed from any other role, so the owner sits under it alone.
    /// Administrator changes are not overwritten: names, descriptions, active flags and stored rights of other roles stay as they are.
    /// </summary>
    public partial class SystemAdministratorRole : Migration
    {
        // The idempotent script compiles a whole migration as one batch; EXEC defers the column name added in it (IsBuiltIn).
        private static void Exec(MigrationBuilder b, string sql) => b.Sql($"EXEC(N'{sql.Replace("'", "''")}');");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsBuiltIn",
                schema: "iam",
                table: "AppRole",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // 1. Ensure the single built-in role exists and is marked built-in, all-rights and active.
            Exec(migrationBuilder, "IF NOT EXISTS (SELECT 1 FROM [iam].[AppRole] WHERE [Name] = N'System Administrator') "
                + "INSERT INTO [iam].[AppRole] ([Name], [Description], [IsActive], [HoldsAllRights], [IsBuiltIn], [CreatedAt], [UpdatedAt]) "
                + "VALUES (N'System Administrator', N'The hub''s built-in super-administrator: holds every right and cannot be changed.', 1, 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());");
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [IsBuiltIn] = 1, [HoldsAllRights] = 1, [IsActive] = 1 WHERE [Name] = N'System Administrator';");

            // 2. Materialize every other all-rights role's current rights, then clear its mark (holders keep today's access, lose automatic future rights).
            Exec(migrationBuilder, "INSERT INTO [iam].[RoleRight] ([AppRoleId], [RightKey]) SELECT r.[Id], d.[Key] FROM [iam].[AppRole] r CROSS JOIN [iam].[RightDefinition] d "
                + "WHERE r.[HoldsAllRights] = 1 AND r.[IsBuiltIn] = 0 AND d.[IsActive] = 1 AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[Id] AND x.[RightKey] = d.[Key]);");
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [HoldsAllRights] = 0 WHERE [IsBuiltIn] = 0 AND [HoldsAllRights] = 1;");

            // 3. Put the reserved owner account under System Administrator alone.
            Exec(migrationBuilder, "INSERT INTO [iam].[UserRole] ([UserId], [AppRoleId]) SELECT u.[Id], r.[Id] FROM [iam].[User] u CROSS JOIN [iam].[AppRole] r "
                + "WHERE u.[AccountName] = N'TioAdmin' AND r.[Name] = N'System Administrator' AND NOT EXISTS (SELECT 1 FROM [iam].[UserRole] x WHERE x.[UserId] = u.[Id] AND x.[AppRoleId] = r.[Id]);");
            Exec(migrationBuilder, "DELETE ur FROM [iam].[UserRole] ur JOIN [iam].[User] u ON u.[Id] = ur.[UserId] JOIN [iam].[AppRole] r ON r.[Id] = ur.[AppRoleId] "
                + "WHERE u.[AccountName] = N'TioAdmin' AND r.[Name] <> N'System Administrator';");

            // Signed-in sessions and scheduled exports re-check access after this change.
            Exec(migrationBuilder, "UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Best effort: the column is removed. The one-time demotion of former all-rights roles and the owner's reassignment
            // are data changes that are not reversed here; going back to the earlier model needs the database backup.
            migrationBuilder.DropColumn(
                name: "IsBuiltIn",
                schema: "iam",
                table: "AppRole");
        }
    }
}
