using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "jira");

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                schema: "work",
                table: "JiraReference",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Manual");

            migrationBuilder.CreateTable(
                name: "CaseComment",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorId = table.Column<long>(type: "bigint", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: false),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseComment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CaseComment_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseComment_User_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraConnection",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SiteUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    AuthMode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AccountEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    CloudId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    JiraInstanceId = table.Column<long>(type: "bigint", nullable: false),
                    SecretProvider = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SecretReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CredentialRotatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    AccountTimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    LastTestAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastTestOk = table.Column<bool>(type: "bit", nullable: true),
                    LastTestDurationMs = table.Column<int>(type: "int", nullable: true),
                    LastTestJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LastSuccessfulTestAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastDiscoveryAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastDiscoveryError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DetailFieldNames = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraConnection", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraConnection_JiraInstance_JiraInstanceId",
                        column: x => x.JiraInstanceId,
                        principalSchema: "work",
                        principalTable: "JiraInstance",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraConnection_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraConnection_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClientJiraSettings",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: true),
                    DefaultResponsibleTeamId = table.Column<long>(type: "bigint", nullable: true),
                    DefaultCaseType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    DefaultPriority = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    NextReviewHours = table.Column<int>(type: "int", nullable: false),
                    ImportDoneIssues = table.Column<bool>(type: "bit", nullable: false),
                    ImportFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    SyncOnStartup = table.Column<bool>(type: "bit", nullable: false),
                    FullReconciliation = table.Column<bool>(type: "bit", nullable: false),
                    FullReconciliationDays = table.Column<int>(type: "int", nullable: false),
                    SyncIntervalMinutes = table.Column<int>(type: "int", nullable: false),
                    LastPreviewAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientJiraSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientJiraSettings_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSettings_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSettings_Team_DefaultResponsibleTeamId",
                        column: x => x.DefaultResponsibleTeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSettings_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSettings_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ClientJiraSpace",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraProjectId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProjectKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProjectName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    ReleasedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReleaseReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientJiraSpace", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientJiraSpace_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSpace_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSpace_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSpace_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraActivity",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    ExternalEventId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    JiraIssueId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Field = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ActorName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    FromValue = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    ToValue = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    ImportedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraActivity", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraActivity_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraActivity_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraComment",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraCommentId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    JiraIssueId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    AuthorAccountId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    AuthorName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    BodyText = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    JiraCreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    JiraUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    VisibilityType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    VisibilityValue = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Withheld = table.Column<bool>(type: "bit", nullable: false),
                    DeletedInJiraAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ImportedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraComment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraComment_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraComment_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraCredential",
                schema: "jira",
                columns: table => new
                {
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    Ciphertext = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraCredential", x => x.JiraConnectionId);
                    table.ForeignKey(
                        name: "FK_JiraCredential_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraDiscoveredSpace",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraProjectId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProjectKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProjectName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    FirstSeenAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Missing = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraDiscoveredSpace", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraDiscoveredSpace_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraIntegrationIssue",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Fingerprint = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    JiraProjectId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    JiraIssueId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    IssueKey = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    CaseId = table.Column<long>(type: "bigint", nullable: true),
                    CandidateCaseId = table.Column<long>(type: "bigint", nullable: true),
                    Subject = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SuggestedAction = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Occurrences = table.Column<int>(type: "int", nullable: false),
                    Resolution = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ResolutionNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ResolvedById = table.Column<long>(type: "bigint", nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraIntegrationIssue", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraIntegrationIssue_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraIntegrationIssue_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraIntegrationIssue_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraSyncRun",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ClientJiraSpaceId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Trigger = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    EndedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    IssuesRetrieved = table.Column<int>(type: "int", nullable: false),
                    CasesCreated = table.Column<int>(type: "int", nullable: false),
                    CasesUpdated = table.Column<int>(type: "int", nullable: false),
                    CommentsImported = table.Column<int>(type: "int", nullable: false),
                    ActivitiesImported = table.Column<int>(type: "int", nullable: false),
                    FailedRecords = table.Column<int>(type: "int", nullable: false),
                    Error = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraSyncRun", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraSyncRun_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraUserMapping",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraAccountId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    JiraDisplayName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    TioUserId = table.Column<long>(type: "bigint", nullable: true),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraUserMapping", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraUserMapping_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraUserMapping_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraUserMapping_User_TioUserId",
                        column: x => x.TioUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraUserMapping_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraWorkflowStatusMapping",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraProjectId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    JiraStatusId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    JiraStatusName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    JiraStatusCategory = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    TargetStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraWorkflowStatusMapping", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraWorkflowStatusMapping_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraWorkflowStatusMapping_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraWorkflowStatusMapping_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraCaseMapping",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JiraConnectionId = table.Column<long>(type: "bigint", nullable: false),
                    JiraIssueId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    IssueKey = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    JiraProjectId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    ClientJiraSpaceId = table.Column<long>(type: "bigint", nullable: false),
                    CaseId = table.Column<long>(type: "bigint", nullable: true),
                    Source = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    DescriptionText = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    StatusId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    StatusName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    StatusCategory = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    PriorityName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    IssueTypeName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    AssigneeAccountId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    AssigneeName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    ReporterName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    JiraCreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    JiraUpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    JiraDueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Resolution = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Labels = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Components = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DetailsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LastSyncedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    AppliedAssigneeAccountId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    AppliedStatusId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    OwnerFromJira = table.Column<bool>(type: "bit", nullable: false),
                    ChildrenSyncedFor = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    MissingInJiraAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraCaseMapping", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraCaseMapping_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraCaseMapping_ClientJiraSpace_ClientJiraSpaceId",
                        column: x => x.ClientJiraSpaceId,
                        principalSchema: "jira",
                        principalTable: "ClientJiraSpace",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraCaseMapping_JiraConnection_JiraConnectionId",
                        column: x => x.JiraConnectionId,
                        principalSchema: "jira",
                        principalTable: "JiraConnection",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "JiraSpaceSyncState",
                schema: "jira",
                columns: table => new
                {
                    ClientJiraSpaceId = table.Column<long>(type: "bigint", nullable: false),
                    IssueCheckpoint = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastRunAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastSuccessAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastFullAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    LastError = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ConsecutiveFailures = table.Column<int>(type: "int", nullable: false),
                    ForceFullNext = table.Column<bool>(type: "bit", nullable: false),
                    ManualRequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LeaseOwner = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    LeaseUntil = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraSpaceSyncState", x => x.ClientJiraSpaceId);
                    table.ForeignKey(
                        name: "FK_JiraSpaceSyncState_ClientJiraSpace_ClientJiraSpaceId",
                        column: x => x.ClientJiraSpaceId,
                        principalSchema: "jira",
                        principalTable: "ClientJiraSpace",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CaseComment_AuthorId",
                schema: "work",
                table: "CaseComment",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseComment_CaseId_At",
                schema: "work",
                table: "CaseComment",
                columns: new[] { "CaseId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSettings_ClientId",
                schema: "jira",
                table: "ClientJiraSettings",
                column: "ClientId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSettings_CreatedById",
                schema: "jira",
                table: "ClientJiraSettings",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSettings_DefaultResponsibleTeamId",
                schema: "jira",
                table: "ClientJiraSettings",
                column: "DefaultResponsibleTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSettings_JiraConnectionId",
                schema: "jira",
                table: "ClientJiraSettings",
                column: "JiraConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSettings_UpdatedById",
                schema: "jira",
                table: "ClientJiraSettings",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpace_ClientId",
                schema: "jira",
                table: "ClientJiraSpace",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpace_CreatedById",
                schema: "jira",
                table: "ClientJiraSpace",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpace_JiraConnectionId_JiraProjectId",
                schema: "jira",
                table: "ClientJiraSpace",
                columns: new[] { "JiraConnectionId", "JiraProjectId" },
                unique: true,
                filter: "[ReleasedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpace_UpdatedById",
                schema: "jira",
                table: "ClientJiraSpace",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraActivity_CaseId_At",
                schema: "jira",
                table: "JiraActivity",
                columns: new[] { "CaseId", "At" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraActivity_JiraConnectionId_ExternalEventId",
                schema: "jira",
                table: "JiraActivity",
                columns: new[] { "JiraConnectionId", "ExternalEventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraActivity_JiraConnectionId_JiraIssueId",
                schema: "jira",
                table: "JiraActivity",
                columns: new[] { "JiraConnectionId", "JiraIssueId" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraCaseMapping_CaseId",
                schema: "jira",
                table: "JiraCaseMapping",
                column: "CaseId",
                unique: true,
                filter: "[CaseId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_JiraCaseMapping_ClientJiraSpaceId",
                schema: "jira",
                table: "JiraCaseMapping",
                column: "ClientJiraSpaceId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraCaseMapping_JiraConnectionId_IssueKey",
                schema: "jira",
                table: "JiraCaseMapping",
                columns: new[] { "JiraConnectionId", "IssueKey" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraCaseMapping_JiraConnectionId_JiraIssueId",
                schema: "jira",
                table: "JiraCaseMapping",
                columns: new[] { "JiraConnectionId", "JiraIssueId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraComment_CaseId_JiraCreatedAt",
                schema: "jira",
                table: "JiraComment",
                columns: new[] { "CaseId", "JiraCreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraComment_JiraConnectionId_JiraCommentId",
                schema: "jira",
                table: "JiraComment",
                columns: new[] { "JiraConnectionId", "JiraCommentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraComment_JiraConnectionId_JiraIssueId",
                schema: "jira",
                table: "JiraComment",
                columns: new[] { "JiraConnectionId", "JiraIssueId" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraConnection_CreatedById",
                schema: "jira",
                table: "JiraConnection",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraConnection_JiraInstanceId",
                schema: "jira",
                table: "JiraConnection",
                column: "JiraInstanceId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraConnection_Name",
                schema: "jira",
                table: "JiraConnection",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraConnection_SiteUrl",
                schema: "jira",
                table: "JiraConnection",
                column: "SiteUrl",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraConnection_UpdatedById",
                schema: "jira",
                table: "JiraConnection",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraDiscoveredSpace_JiraConnectionId_JiraProjectId",
                schema: "jira",
                table: "JiraDiscoveredSpace",
                columns: new[] { "JiraConnectionId", "JiraProjectId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraIntegrationIssue_CreatedById",
                schema: "jira",
                table: "JiraIntegrationIssue",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraIntegrationIssue_Fingerprint",
                schema: "jira",
                table: "JiraIntegrationIssue",
                column: "Fingerprint",
                unique: true,
                filter: "[Status] = N'Open'");

            migrationBuilder.CreateIndex(
                name: "IX_JiraIntegrationIssue_JiraConnectionId",
                schema: "jira",
                table: "JiraIntegrationIssue",
                column: "JiraConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraIntegrationIssue_Status_Type",
                schema: "jira",
                table: "JiraIntegrationIssue",
                columns: new[] { "Status", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraIntegrationIssue_UpdatedById",
                schema: "jira",
                table: "JiraIntegrationIssue",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraSyncRun_ClientId_StartedAt",
                schema: "jira",
                table: "JiraSyncRun",
                columns: new[] { "ClientId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraSyncRun_ClientJiraSpaceId_StartedAt",
                schema: "jira",
                table: "JiraSyncRun",
                columns: new[] { "ClientJiraSpaceId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_JiraSyncRun_JiraConnectionId",
                schema: "jira",
                table: "JiraSyncRun",
                column: "JiraConnectionId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraSyncRun_StartedAt",
                schema: "jira",
                table: "JiraSyncRun",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_JiraUserMapping_CreatedById",
                schema: "jira",
                table: "JiraUserMapping",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraUserMapping_JiraConnectionId_JiraAccountId",
                schema: "jira",
                table: "JiraUserMapping",
                columns: new[] { "JiraConnectionId", "JiraAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraUserMapping_TioUserId",
                schema: "jira",
                table: "JiraUserMapping",
                column: "TioUserId");

            migrationBuilder.CreateIndex(
                name: "IX_JiraUserMapping_UpdatedById",
                schema: "jira",
                table: "JiraUserMapping",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraWorkflowStatusMapping_CreatedById",
                schema: "jira",
                table: "JiraWorkflowStatusMapping",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraWorkflowStatusMapping_JiraConnectionId_JiraProjectId_JiraStatusId",
                schema: "jira",
                table: "JiraWorkflowStatusMapping",
                columns: new[] { "JiraConnectionId", "JiraProjectId", "JiraStatusId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraWorkflowStatusMapping_UpdatedById",
                schema: "jira",
                table: "JiraWorkflowStatusMapping",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CaseComment",
                schema: "work");

            migrationBuilder.DropTable(
                name: "ClientJiraSettings",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraActivity",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraCaseMapping",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraComment",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraCredential",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraDiscoveredSpace",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraIntegrationIssue",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraSpaceSyncState",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraSyncRun",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraUserMapping",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraWorkflowStatusMapping",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "ClientJiraSpace",
                schema: "jira");

            migrationBuilder.DropTable(
                name: "JiraConnection",
                schema: "jira");

            migrationBuilder.DropColumn(
                name: "Origin",
                schema: "work",
                table: "JiraReference");
        }
    }
}
