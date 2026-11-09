using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ScopedPermissionExceptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserPermissionOverride",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.AddColumn<long>(
                name: "Id",
                schema: "iam",
                table: "UserPermissionOverride",
                type: "bigint",
                nullable: false,
                defaultValue: 0L)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<long>(
                name: "ClientId",
                schema: "iam",
                table: "UserPermissionOverride",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ProjectId",
                schema: "iam",
                table: "UserPermissionOverride",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TeamId",
                schema: "iam",
                table: "UserPermissionOverride",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserPermissionOverride",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionOverride_ClientId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionOverride_ProjectId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionOverride_TeamId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "UX_UserPermissionOverride_Client",
                schema: "iam",
                table: "UserPermissionOverride",
                columns: new[] { "UserId", "PermissionKey", "ClientId" },
                unique: true,
                filter: "[ClientId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserPermissionOverride_Global",
                schema: "iam",
                table: "UserPermissionOverride",
                columns: new[] { "UserId", "PermissionKey" },
                unique: true,
                filter: "[ClientId] IS NULL AND [ProjectId] IS NULL AND [TeamId] IS NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserPermissionOverride_Project",
                schema: "iam",
                table: "UserPermissionOverride",
                columns: new[] { "UserId", "PermissionKey", "ProjectId" },
                unique: true,
                filter: "[ProjectId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserPermissionOverride_Team",
                schema: "iam",
                table: "UserPermissionOverride",
                columns: new[] { "UserId", "PermissionKey", "TeamId" },
                unique: true,
                filter: "[TeamId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UserPermissionOverride_SingleScope",
                schema: "iam",
                table: "UserPermissionOverride",
                sql: "(CASE WHEN [ClientId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProjectId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [TeamId] IS NULL THEN 0 ELSE 1 END) <= 1");

            migrationBuilder.AddForeignKey(
                name: "FK_UserPermissionOverride_Client_ClientId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "ClientId",
                principalSchema: "clients",
                principalTable: "Client",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserPermissionOverride_Project_ProjectId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "ProjectId",
                principalSchema: "clients",
                principalTable: "Project",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserPermissionOverride_Team_TeamId",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "TeamId",
                principalSchema: "teams",
                principalTable: "Team",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Dropping the scope columns would turn every scoped exception into a global one. An operator reviews and removes them first
            // (database/04-access-control-upgrade-review.sql); an earlier application must not run while any exist.
            migrationBuilder.Sql(@"IF EXISTS (SELECT 1 FROM [iam].[UserPermissionOverride] WHERE [ClientId] IS NOT NULL OR [ProjectId] IS NOT NULL OR [TeamId] IS NOT NULL)
                THROW 51000, 'Scoped permission exceptions exist. Review and remove them before reverting this migration.', 1;");

            migrationBuilder.DropForeignKey(
                name: "FK_UserPermissionOverride_Client_ClientId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropForeignKey(
                name: "FK_UserPermissionOverride_Project_ProjectId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropForeignKey(
                name: "FK_UserPermissionOverride_Team_TeamId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserPermissionOverride",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "IX_UserPermissionOverride_ClientId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "IX_UserPermissionOverride_ProjectId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "IX_UserPermissionOverride_TeamId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "UX_UserPermissionOverride_Client",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "UX_UserPermissionOverride_Global",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "UX_UserPermissionOverride_Project",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropIndex(
                name: "UX_UserPermissionOverride_Team",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UserPermissionOverride_SingleScope",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropColumn(
                name: "Id",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropColumn(
                name: "ClientId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.DropColumn(
                name: "TeamId",
                schema: "iam",
                table: "UserPermissionOverride");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserPermissionOverride",
                schema: "iam",
                table: "UserPermissionOverride",
                columns: new[] { "UserId", "PermissionKey" });
        }
    }
}
