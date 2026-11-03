using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableCaseStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TargetStatusCode",
                schema: "jira",
                table: "JiraWorkflowStatusMapping",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusCode",
                schema: "work",
                table: "Case",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            // A77: a new database has no list yet, and the seeder fills it. Labels an administrator changed are kept.
            // Pending validation stays only while cases are in it; Cancelled stops being a status, and those cases show as Closed.
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel')
                BEGIN
                    DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                    UPDATE [admin].[LookupValue] SET [Category] = N'Initial', [SortOrder] = 10 WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'New';
                    UPDATE [admin].[LookupValue] SET [Code] = N'Opened', [Category] = N'Opened', [SortOrder] = 20, [Label] = CASE WHEN [Label] = N'Triaged' THEN N'Opened' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Triaged';
                    UPDATE [admin].[LookupValue] SET [Category] = N'Active', [SortOrder] = 30, [Label] = CASE WHEN [Label] = N'InProgress' THEN N'In-progress' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'InProgress';
                    UPDATE [admin].[LookupValue] SET [Category] = N'Closed', [SortOrder] = 50 WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Closed';
                    IF EXISTS (SELECT 1 FROM [work].[Case] WHERE [Status] = N'PendingValidation')
                        UPDATE [admin].[LookupValue] SET [Category] = N'Resolved', [SortOrder] = 35, [Label] = CASE WHEN [Label] = N'PendingValidation' THEN N'Pending validation' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'PendingValidation';
                    ELSE
                        DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'PendingValidation';
                    DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Cancelled';
                    INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [Category], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) VALUES
                        (N'CaseStatusLabel', N'WaitingForCustomer', N'Waiting for customer', N'WaitingForCustomer', 40, 0, @now, @now),
                        (N'CaseStatusLabel', N'Reopened', N'Re-opened', N'Reopened', 60, 0, @now, @now);
                END;
                -- In EXEC, like the next statement: the deployment script has no batch break here, and this column is added in the same batch.
                EXEC(N'UPDATE [work].[Case] SET [StatusCode] = CASE
                    WHEN [Status] = N''New'' THEN N''New''
                    WHEN [Status] = N''Triaged'' AND [ReopenCount] > 0 THEN N''Reopened''
                    WHEN [Status] = N''Triaged'' THEN N''Opened''
                    WHEN [Status] = N''InProgress'' THEN N''InProgress''
                    WHEN [Status] = N''PendingValidation'' THEN N''PendingValidation''
                    ELSE N''Closed'' END;
                UPDATE [work].[Case] SET [StatusCode] = N''WaitingForCustomer'' WHERE [WaitingReason] = N''Customer'' AND [Status] NOT IN (N''Closed'', N''Cancelled'');');
                -- In EXEC: the deployment script is re-run on upgraded databases, where this column no longer exists.
                EXEC(N'UPDATE [jira].[JiraWorkflowStatusMapping] SET [TargetStatusCode] = CASE [TargetStatus]
                    WHEN N''New'' THEN N''New''
                    WHEN N''Triaged'' THEN N''Opened''
                    WHEN N''InProgress'' THEN N''InProgress''
                    WHEN N''PendingValidation'' THEN (SELECT [Code] FROM [admin].[LookupValue] WHERE [ListName] = N''CaseStatusLabel'' AND [Code] = N''PendingValidation'') END;');
                """);

            migrationBuilder.DropColumn(
                name: "TargetStatus",
                schema: "jira",
                table: "JiraWorkflowStatusMapping");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TargetStatus",
                schema: "jira",
                table: "JiraWorkflowStatusMapping",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            // Statuses added since the upgrade have no earlier equivalent; their cases keep their stage.
            migrationBuilder.Sql("""
                UPDATE [jira].[JiraWorkflowStatusMapping] SET [TargetStatus] = CASE [TargetStatusCode]
                    WHEN N'New' THEN N'New' WHEN N'Opened' THEN N'Triaged' WHEN N'InProgress' THEN N'InProgress' WHEN N'PendingValidation' THEN N'PendingValidation' END;
                IF EXISTS (SELECT 1 FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel')
                BEGIN
                    DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                    DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel' AND [Code] NOT IN (N'New', N'Opened', N'InProgress', N'PendingValidation', N'Closed');
                    UPDATE [admin].[LookupValue] SET [Code] = N'Triaged' WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Opened';
                    UPDATE [admin].[LookupValue] SET [Category] = NULL WHERE [ListName] = N'CaseStatusLabel';
                    INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt])
                    SELECT N'CaseStatusLabel', v.[Code], v.[Code], v.[SortOrder], 0, @now, @now FROM (VALUES (N'New', 10), (N'Triaged', 20), (N'InProgress', 30), (N'PendingValidation', 40), (N'Closed', 50), (N'Cancelled', 60)) v([Code], [SortOrder])
                    WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N'CaseStatusLabel' AND l.[Code] = v.[Code]);
                END;
                """);

            migrationBuilder.DropColumn(
                name: "TargetStatusCode",
                schema: "jira",
                table: "JiraWorkflowStatusMapping");

            migrationBuilder.DropColumn(
                name: "StatusCode",
                schema: "work",
                table: "Case");
        }
    }
}
