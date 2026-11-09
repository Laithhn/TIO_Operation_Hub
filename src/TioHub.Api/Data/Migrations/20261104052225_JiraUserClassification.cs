using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraUserClassification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Classification",
                schema: "iam",
                table: "User",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Standard");

            migrationBuilder.AddColumn<bool>(
                name: "LoginEnabled",
                schema: "iam",
                table: "User",
                type: "bit",
                nullable: false,
                defaultValue: true);

            // A83: a team member of A80 becomes a record with no sign-in access, and owns the issues Jira assigns them from the next run.
            migrationBuilder.Sql("""
                EXEC(N'INSERT INTO [iam].[User] ([AccountName], [DisplayName], [WorkingTimeZone], [IsActive], [AllClients], [AllInternal], [Classification], [LoginEnabled], [CreatedAt], [UpdatedAt])
                SELECT CONCAT(N''jira-team-'', m.[Id]), LEFT(COALESCE(m.[JiraDisplayName], m.[JiraAccountId]), 150), N''UTC'', 1, 0, 0, N''VitronicTeamMember'', 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
                FROM [jira].[JiraUserMapping] m WHERE m.[IsInternalMember] = 1;
                UPDATE m SET m.[TioUserId] = u.[Id]
                FROM [jira].[JiraUserMapping] m JOIN [iam].[User] u ON u.[AccountName] = CONCAT(N''jira-team-'', m.[Id])
                WHERE m.[IsInternalMember] = 1;
                UPDATE c SET c.[InternalAssignee] = NULL
                FROM [work].[Case] c JOIN [jira].[JiraCaseMapping] j ON j.[CaseId] = c.[Id]
                JOIN [jira].[JiraUserMapping] m ON m.[JiraConnectionId] = j.[JiraConnectionId] AND m.[JiraAccountId] = j.[AssigneeAccountId]
                WHERE m.[IsInternalMember] = 1;
                UPDATE j SET j.[AppliedAssigneeAccountId] = NULL
                FROM [jira].[JiraCaseMapping] j JOIN [jira].[JiraUserMapping] m ON m.[JiraConnectionId] = j.[JiraConnectionId] AND m.[JiraAccountId] = j.[AssigneeAccountId]
                WHERE m.[IsInternalMember] = 1;');
                """);

            migrationBuilder.DropColumn(
                name: "IsInternalMember",
                schema: "jira",
                table: "JiraUserMapping");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Classification",
                schema: "iam",
                table: "User");

            migrationBuilder.DropColumn(
                name: "LoginEnabled",
                schema: "iam",
                table: "User");

            migrationBuilder.AddColumn<bool>(
                name: "IsInternalMember",
                schema: "jira",
                table: "JiraUserMapping",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
