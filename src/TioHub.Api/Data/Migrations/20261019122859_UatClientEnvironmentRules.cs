using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UatClientEnvironmentRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Owner decisions, UAT 19 Oct 2026. Client status: Onboarding → Opportunity, Suspended → Active.
            migrationBuilder.Sql(@"EXEC(N'UPDATE [clients].[Client] SET [Status] = N''Opportunity'' WHERE [Status] = N''Onboarding'';')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [clients].[Client] SET [Status] = N''Active'' WHERE [Status] = N''Suspended'';')");
            // Hosting becomes Cloud / OnPrem / Unknown; the old free reference list is removed.
            migrationBuilder.Sql(@"EXEC(N'UPDATE [env].[Environment] SET [Hosting] = CASE WHEN [Hosting] IS NULL THEN N''Unknown'' WHEN [Hosting] = N''Cloud'' THEN N''Cloud'' ELSE N''OnPrem'' END;')");
            migrationBuilder.Sql(@"EXEC(N'DELETE FROM [admin].[LookupValue] WHERE [ListName] = N''Hosting'';')");

            migrationBuilder.AlterColumn<string>(
                name: "Hosting",
                schema: "env",
                table: "Environment",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Unknown",
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Hosting",
                schema: "env",
                table: "Environment",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(40)",
                oldMaxLength: 40);
        }
    }
}
