using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraSlaClockStart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SlaClockStartAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            // A78: existing synchronized cases count from Jira too. Clearing the calculation time makes the startup backfill re-evaluate them.
            migrationBuilder.Sql("""
                EXEC(N'UPDATE c SET c.[FirstResponseAt] = x.[FirstComment]
                FROM [work].[Case] c JOIN (SELECT [CaseId], MIN([JiraCreatedAt]) AS [FirstComment] FROM [jira].[JiraComment] WHERE [DeletedInJiraAt] IS NULL GROUP BY [CaseId]) x ON x.[CaseId] = c.[Id]
                WHERE c.[FirstResponseAt] IS NULL;
                UPDATE c SET c.[SlaClockStartAt] = m.[JiraCreatedAt], c.[SlaCalculatedAt] = NULL
                FROM [work].[Case] c JOIN [jira].[JiraCaseMapping] m ON m.[CaseId] = c.[Id]
                WHERE m.[JiraCreatedAt] IS NOT NULL;');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlaClockStartAt",
                schema: "work",
                table: "Case");
        }
    }
}
