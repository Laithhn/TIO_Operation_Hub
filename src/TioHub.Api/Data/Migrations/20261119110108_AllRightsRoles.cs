using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <summary>
    /// A120: no role is built in any more. "Holds every right" becomes a mark any role can carry. The upgrade runs once:
    /// 1. The former protected TIO Manager role stores every active right, so its holders keep exactly what they had; from now on it is an
    ///    ordinary role that does not receive rights added later.
    /// 2. An active role named "ITD Manager" (the owner's custom role) gets the mark.
    /// 3. If no active role has the mark after step 2 (no ITD Manager, or it is inactive), TIO Manager keeps it, so one always exists.
    /// 4. The built-in Key is dropped: TIO Manager and Operation Engineer become ordinary roles, and nothing re-creates them.
    /// Administrator changes are not overwritten: names, descriptions, active flags and other stored rights stay as they are.
    /// </summary>
    public partial class AllRightsRoles : Migration
    {
        // The idempotent script compiles a whole migration as one batch; EXEC defers column names that are added or dropped in it.
        private static void Exec(MigrationBuilder b, string sql) => b.Sql($"EXEC(N'{sql.Replace("'", "''")}');");

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HoldsAllRights",
                schema: "iam",
                table: "AppRole",
                type: "bit",
                nullable: false,
                defaultValue: false);

            Exec(migrationBuilder, "INSERT INTO [iam].[RoleRight] ([AppRoleId], [RightKey]) SELECT r.[Id], d.[Key] FROM [iam].[AppRole] r CROSS JOIN [iam].[RightDefinition] d "
                + "WHERE r.[Key] = N'Manager' AND d.[IsActive] = 1 AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[Id] AND x.[RightKey] = d.[Key]);");
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [HoldsAllRights] = 1 WHERE [IsActive] = 1 AND [Key] IS NULL AND LTRIM(RTRIM([Name])) = N'ITD Manager';");
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [HoldsAllRights] = 1, [IsActive] = 1 WHERE [Key] = N'Manager' AND NOT EXISTS (SELECT 1 FROM [iam].[AppRole] f WHERE f.[HoldsAllRights] = 1);");
            // Signed-in sessions and scheduled exports re-check access after this change.
            Exec(migrationBuilder, "UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;");

            migrationBuilder.DropIndex(
                name: "IX_AppRole_Key",
                schema: "iam",
                table: "AppRole");

            migrationBuilder.DropColumn(
                name: "Key",
                schema: "iam",
                table: "AppRole");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Key",
                schema: "iam",
                table: "AppRole",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            // Best effort: the built-in keys come back by the default names. Renamed roles stay ordinary.
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [Key] = N'Manager' WHERE [Name] = N'TIO Manager';");
            Exec(migrationBuilder, "UPDATE [iam].[AppRole] SET [Key] = N'Engineer' WHERE [Name] = N'Operation Engineer';");

            migrationBuilder.CreateIndex(
                name: "IX_AppRole_Key",
                schema: "iam",
                table: "AppRole",
                column: "Key",
                unique: true,
                filter: "[Key] IS NOT NULL");

            migrationBuilder.DropColumn(
                name: "HoldsAllRights",
                schema: "iam",
                table: "AppRole");
        }
    }
}
