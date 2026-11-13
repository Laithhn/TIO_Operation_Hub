using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PaymentsDashboard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A115 (owner request, 13 Nov 2026): the Payments dashboard, its View right and its Excel export right. No table changes.
            // New rights go to nobody until granted (as in A101/A108). Proposed defaults, reviewed upgrade step:
            //  - PaymentsDashboard:View to every role that already holds Dashboard:View and Contracts:View (the people who see payment terms
            //    on the SLA & Contracts and Client dashboards today);
            //  - PaymentsDashboard:Export to those roles when they can also export contracts (Contracts:Export).
            // Startup would add the definitions, but this runs first and the grants need the rows. Person exceptions and existing grants are never touched.
            migrationBuilder.Sql("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
                SELECT v.[Key], v.[Label], v.[Description], N'Dashboard', N'PaymentsDashboard', v.[Kind], N'Normal', 0, 1, @now, @now
                FROM (VALUES
                    (N'PaymentsDashboard:View', N'View', N'Access', N'View in Payments dashboard. Data, ownership and scope checks still apply.'),
                    (N'PaymentsDashboard:Export', N'Export', N'Action', N'Export in Payments dashboard. Data, ownership and scope checks still apply.')
                ) v ([Key],[Label],[Kind],[Description])
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = v.[Key]);
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'PaymentsDashboard:View' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'Dashboard:View'
                  AND EXISTS (SELECT 1 FROM [iam].[RoleRight] c WHERE c.[AppRoleId] = r.[AppRoleId] AND c.[RightKey] = N'Contracts:View')
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'PaymentsDashboard:View');
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'PaymentsDashboard:Export' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'PaymentsDashboard:View'
                  AND EXISTS (SELECT 1 FROM [iam].[RoleRight] c WHERE c.[AppRoleId] = r.[AppRoleId] AND c.[RightKey] = N'Contracts:Export')
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'PaymentsDashboard:Export');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Removes grants made since as well: without the rights in the catalog they would mean nothing.
            migrationBuilder.Sql("""
                DELETE FROM [iam].[UserRightException] WHERE [RightKey] IN (N'PaymentsDashboard:View', N'PaymentsDashboard:Export');
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] IN (N'PaymentsDashboard:View', N'PaymentsDashboard:Export');
                DELETE FROM [iam].[RightDefinition] WHERE [Key] IN (N'PaymentsDashboard:View', N'PaymentsDashboard:Export');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }
    }
}
