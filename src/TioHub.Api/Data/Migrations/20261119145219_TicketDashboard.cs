using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TicketDashboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A123 (owner request, 19 Nov 2026): the Tickets dashboard in the Tickets menu and its View right. No table changes.
            // New rights go to nobody until granted (as in A101/A108/A115). Proposed default, reviewed upgrade step:
            //  - TicketDashboard:View to every role that already holds Cases:View (it shows only tickets they can already list).
            // Startup would add the definition, but this runs first and the grant needs the row. Person exceptions and existing grants are never touched.
            migrationBuilder.Sql("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
                SELECT N'TicketDashboard:View', N'View', N'View in Tickets dashboard. Data, ownership and scope checks still apply.', N'Tickets', N'TicketDashboard', N'Access', N'Normal', 0, 1, @now, @now
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = N'TicketDashboard:View');
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'TicketDashboard:View' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'Cases:View'
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'TicketDashboard:View');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Removes grants made since as well: without the right in the catalog they would mean nothing.
            migrationBuilder.Sql("""
                DELETE FROM [iam].[UserRightException] WHERE [RightKey] = N'TicketDashboard:View';
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] = N'TicketDashboard:View';
                DELETE FROM [iam].[RightDefinition] WHERE [Key] = N'TicketDashboard:View';
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }
    }
}
