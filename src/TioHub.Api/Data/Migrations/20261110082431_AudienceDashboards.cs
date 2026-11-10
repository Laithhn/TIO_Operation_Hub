using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AudienceDashboards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProjectStatusReport",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    NextReviewOn = table.Column<DateOnly>(type: "date", nullable: true),
                    RecordedById = table.Column<long>(type: "bigint", nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectStatusReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectStatusReport_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectStatusReport_User_RecordedById",
                        column: x => x.RecordedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectStatusReport_ProjectId_RecordedAt",
                schema: "clients",
                table: "ProjectStatusReport",
                columns: new[] { "ProjectId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectStatusReport_RecordedById",
                schema: "clients",
                table: "ProjectStatusReport",
                column: "RecordedById");

            // A108 (rights, as for MyDashboard in A101). New rights go to nobody until granted, so every role that can open the dashboard area
            // (Dashboard:View) keeps what it could open before: the four new dashboards are shown to the same people as the Executive overview.
            // Startup would add the definitions, but this runs first and the grants need the rows. Existing grants are never touched.
            migrationBuilder.Sql("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
                SELECT v.[Key], N'View', v.[Description], N'Dashboard', v.[Feature], N'Access', N'Normal', 0, 1, @now, @now
                FROM (VALUES
                    (N'OperationalDashboard:View', N'OperationalDashboard', N'View in Operational dashboard. Data, ownership and scope checks still apply.'),
                    (N'SlaContractsDashboard:View', N'SlaContractsDashboard', N'View in SLA & Contracts dashboard. Data, ownership and scope checks still apply.'),
                    (N'ManagementDashboard:View', N'ManagementDashboard', N'View in Management dashboard. Data, ownership and scope checks still apply.'),
                    (N'ProjectDashboard:View', N'ProjectDashboard', N'View in Project dashboard. Data, ownership and scope checks still apply.')
                ) v ([Key],[Feature],[Description])
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = v.[Key]);
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], k.[Key] FROM [iam].[RoleRight] r
                CROSS JOIN (VALUES (N'OperationalDashboard:View'), (N'SlaContractsDashboard:View'), (N'ManagementDashboard:View'), (N'ProjectDashboard:View')) k ([Key])
                WHERE r.[RightKey] = N'Dashboard:View'
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = k.[Key]);
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Removes grants made since as well: without the rights in the catalog they would mean nothing.
            migrationBuilder.Sql("""
                DELETE FROM [iam].[UserRightException] WHERE [RightKey] IN (N'OperationalDashboard:View', N'SlaContractsDashboard:View', N'ManagementDashboard:View', N'ProjectDashboard:View');
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] IN (N'OperationalDashboard:View', N'SlaContractsDashboard:View', N'ManagementDashboard:View', N'ProjectDashboard:View');
                DELETE FROM [iam].[RightDefinition] WHERE [Key] IN (N'OperationalDashboard:View', N'SlaContractsDashboard:View', N'ManagementDashboard:View', N'ProjectDashboard:View');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);

            migrationBuilder.DropTable(
                name: "ProjectStatusReport",
                schema: "clients");
        }
    }
}
