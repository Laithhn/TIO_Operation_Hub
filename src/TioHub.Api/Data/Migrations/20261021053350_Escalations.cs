using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Escalations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "EscalationNumbers",
                schema: "work",
                startValue: 1001L);

            migrationBuilder.CreateTable(
                name: "Escalation",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValueSql: "CONCAT('ESC-', NEXT VALUE FOR [work].[EscalationNumbers])"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    ContractId = table.Column<long>(type: "bigint", nullable: true),
                    CaseId = table.Column<long>(type: "bigint", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    Direction = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ChannelReference = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Priority = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    CounterpartName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CounterpartTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CounterpartOrganization = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CounterpartPhone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CounterpartMobile = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    CounterpartEmail = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    ReceivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    ResponseDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResolutionDueAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    AcknowledgedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ResolutionSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Escalation", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Escalation_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Escalation_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EscalationEvent",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EscalationId = table.Column<long>(type: "bigint", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Channel = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Outgoing = table.Column<bool>(type: "bit", nullable: true),
                    Level = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    At = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EscalationEvent", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EscalationEvent_Escalation_EscalationId",
                        column: x => x.EscalationId,
                        principalSchema: "work",
                        principalTable: "Escalation",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EscalationEvent_User_ById",
                        column: x => x.ById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_CaseId",
                schema: "work",
                table: "Escalation",
                column: "CaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_ClientId",
                schema: "work",
                table: "Escalation",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_ContractId",
                schema: "work",
                table: "Escalation",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_CreatedById",
                schema: "work",
                table: "Escalation",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_OwnerUserId",
                schema: "work",
                table: "Escalation",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_ProjectId",
                schema: "work",
                table: "Escalation",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_Ref",
                schema: "work",
                table: "Escalation",
                column: "Ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_Status_ResolutionDueAt",
                schema: "work",
                table: "Escalation",
                columns: new[] { "Status", "ResolutionDueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Escalation_UpdatedById",
                schema: "work",
                table: "Escalation",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_EscalationEvent_ById",
                schema: "work",
                table: "EscalationEvent",
                column: "ById");

            migrationBuilder.CreateIndex(
                name: "IX_EscalationEvent_EscalationId",
                schema: "work",
                table: "EscalationEvent",
                column: "EscalationId");

            // A41: escalation channels are a configuration list, seeded with the usual four.
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT N''EscalationChannel'', v.[Code], v.[Label], v.[SortOrder], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''Email'', N''E-mail'', 10), (N''FormalLetter'', N''Formal letter'', 20), (N''Verbal'', N''Verbal (call or meeting)'', 30), (N''Jira'', N''Jira'', 40)) AS v([Code], [Label], [SortOrder]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''EscalationChannel'' AND l.[Code] = v.[Code]);')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EscalationEvent",
                schema: "work");

            migrationBuilder.DropTable(
                name: "Escalation",
                schema: "work");

            migrationBuilder.DropSequence(
                name: "EscalationNumbers",
                schema: "work");
        }
    }
}
