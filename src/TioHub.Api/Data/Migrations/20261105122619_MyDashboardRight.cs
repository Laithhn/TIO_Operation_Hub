using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MyDashboardRight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A101. New rights go to nobody until granted, so this keeps My dashboard for every role that could open it in 2.54.0.
            // Startup would add the definition, but this runs first and the grant needs the row.
            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] WHERE [Key] = N'MyDashboard:View')
                    INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
                    VALUES (N'MyDashboard:View', N'View', N'View in My dashboard. Data, ownership and scope checks still apply.', N'Dashboard', N'MyDashboard', N'Access', N'Normal', 0, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
                SELECT r.[AppRoleId], N'MyDashboard:View' FROM [iam].[RoleRight] r
                WHERE r.[RightKey] = N'Cases:View'
                  AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'MyDashboard:View');
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Removes grants made since as well: without the right in the catalog they would mean nothing.
            migrationBuilder.Sql("""
                DELETE FROM [iam].[UserRightException] WHERE [RightKey] = N'MyDashboard:View';
                DELETE FROM [iam].[RoleRight] WHERE [RightKey] = N'MyDashboard:View';
                DELETE FROM [iam].[RightDefinition] WHERE [Key] = N'MyDashboard:View';
                UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
                """);
        }
    }
}
