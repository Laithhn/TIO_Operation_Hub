using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ClientDashboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientStatusReport",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    NextReviewOn = table.Column<DateOnly>(type: "date", nullable: true),
                    RecordedById = table.Column<long>(type: "bigint", nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientStatusReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientStatusReport_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientStatusReport_User_RecordedById",
                        column: x => x.RecordedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientStatusReport_ClientId_RecordedAt",
                schema: "clients",
                table: "ClientStatusReport",
                columns: new[] { "ClientId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientStatusReport_RecordedById",
                schema: "clients",
                table: "ClientStatusReport",
                column: "RecordedById");

            // A109 (owner request, 10 Nov 2026): the Project dashboard becomes the Client dashboard. The right is renamed, not added:
            // every role and person exception that held ProjectDashboard:View now holds ClientDashboard:View, and nobody else gains it.
            // The old definition stays until the next start, which marks rights no longer in the catalog inactive.
            // The review-age setting is renamed with its value, so an administrator's change is kept. ProjectStatusReport is left as it is.
            migrationBuilder.Sql("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
                SELECT N'ClientDashboard:View', N'View', N'View in Client dashboard. Data, ownership and scope checks still apply.', N'Dashboard', N'ClientDashboard', N'Access', N'Normal', 0, 1, @now, @now
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = N'ClientDashboard:View');
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'ClientDashboard:View' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'ProjectDashboard:View'
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'ClientDashboard:View');
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] = N'ProjectDashboard:View';
                UPDATE [iam].[UserRightException] SET [RightKey] = N'ClientDashboard:View' WHERE [RightKey] = N'ProjectDashboard:View';
                UPDATE [admin].[Setting] SET [Key] = N'Dashboard.ClientStatusMaxAgeDays',
                    [Description] = N'A recorded client status older than this many days is shown as needing review (1–90).'
                WHERE [Key] = N'Dashboard.ProjectStatusMaxAgeDays'
                  AND NOT EXISTS (SELECT 1 FROM [admin].[Setting] s WHERE s.[Key] = N'Dashboard.ClientStatusMaxAgeDays');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                UPDATE [iam].[RightDefinition] SET [IsActive] = 1, [UpdatedAt] = @now WHERE [Key] = N'ProjectDashboard:View';
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'ProjectDashboard:View' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'ClientDashboard:View'
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'ProjectDashboard:View');
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] = N'ClientDashboard:View';
                UPDATE [iam].[UserRightException] SET [RightKey] = N'ProjectDashboard:View' WHERE [RightKey] = N'ClientDashboard:View';
                DELETE FROM [iam].[RightDefinition] WHERE [Key] = N'ClientDashboard:View';
                UPDATE [admin].[Setting] SET [Key] = N'Dashboard.ProjectStatusMaxAgeDays'
                WHERE [Key] = N'Dashboard.ClientStatusMaxAgeDays'
                  AND NOT EXISTS (SELECT 1 FROM [admin].[Setting] s WHERE s.[Key] = N'Dashboard.ProjectStatusMaxAgeDays');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);

            migrationBuilder.DropTable(
                name: "ClientStatusReport",
                schema: "clients");
        }
    }
}
