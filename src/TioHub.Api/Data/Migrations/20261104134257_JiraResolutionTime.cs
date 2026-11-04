using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraResolutionTime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "JiraResolvedAt",
                schema: "jira",
                table: "JiraCaseMapping",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "SlaContractStart",
                schema: "work",
                table: "Case",
                type: "date",
                nullable: true);

            // A90: closed cases held the time of the import as their resolution. The last imported status change is the nearest time known until the next read from Jira.
            // Clearing the calculation time makes the startup backfill measure them again.
            migrationBuilder.Sql("""
                EXEC(N'UPDATE c SET c.[ResolvedAt] = x.[At], c.[ClosedAt] = CASE WHEN c.[ClosedAt] IS NULL THEN NULL ELSE x.[At] END, c.[SlaCalculatedAt] = NULL
                FROM [work].[Case] c
                CROSS APPLY (SELECT MAX(a.[At]) AS [At] FROM [jira].[JiraCaseMapping] m JOIN [jira].[JiraActivity] a ON a.[JiraConnectionId] = m.[JiraConnectionId] AND a.[JiraIssueId] = m.[JiraIssueId] WHERE m.[CaseId] = c.[Id] AND a.[Type] = N''Status'') x
                WHERE c.[ResolvedAt] IS NOT NULL AND x.[At] IS NOT NULL AND x.[At] < c.[ResolvedAt];
                UPDATE c SET c.[SlaContractStart] = k.[StartDate], c.[SlaCalculatedAt] = NULL
                FROM [work].[Case] c JOIN [contracts].[Contract] k ON k.[Id] = c.[ContractId];');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JiraResolvedAt",
                schema: "jira",
                table: "JiraCaseMapping");

            migrationBuilder.DropColumn(
                name: "SlaContractStart",
                schema: "work",
                table: "Case");
        }
    }
}
