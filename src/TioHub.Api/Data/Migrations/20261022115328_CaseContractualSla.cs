using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CaseContractualSla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SlaPauseWhileWaitingOnCustomer",
                schema: "contracts",
                table: "Contract",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "ContractId",
                schema: "work",
                table: "Case",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FirstResponseAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ResolutionDueAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ResolutionElapsedMinutes",
                schema: "work",
                table: "Case",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionSlaStatus",
                schema: "work",
                table: "Case",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "NotApplicable");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ResolvedAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ResponseDueAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ResponseElapsedMinutes",
                schema: "work",
                table: "Case",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponseSlaStatus",
                schema: "work",
                table: "Case",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "NotApplicable");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SlaAppliedAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SlaBasis",
                schema: "work",
                table: "Case",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Unknown");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SlaCalculatedAt",
                schema: "work",
                table: "Case",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SlaContractRef",
                schema: "work",
                table: "Case",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SlaNote",
                schema: "work",
                table: "Case",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SlaPauseOnCustomerWaiting",
                schema: "work",
                table: "Case",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SlaPausedMinutes",
                schema: "work",
                table: "Case",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SlaPriority",
                schema: "work",
                table: "Case",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlaResolutionMinutes",
                schema: "work",
                table: "Case",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlaResponseMinutes",
                schema: "work",
                table: "Case",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SlaSupport24x7",
                schema: "work",
                table: "Case",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SlaSupportDays",
                schema: "work",
                table: "Case",
                type: "int",
                maxLength: 40,
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "SlaSupportFrom",
                schema: "work",
                table: "Case",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "SlaSupportTo",
                schema: "work",
                table: "Case",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SlaTimeZone",
                schema: "work",
                table: "Case",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Case_ContractId_CreatedAt",
                schema: "work",
                table: "Case",
                columns: new[] { "ContractId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Case_ResolutionSlaStatus_ResolutionDueAt",
                schema: "work",
                table: "Case",
                columns: new[] { "ResolutionSlaStatus", "ResolutionDueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Case_ResponseSlaStatus_ResponseDueAt",
                schema: "work",
                table: "Case",
                columns: new[] { "ResponseSlaStatus", "ResponseDueAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Case_Contract_ContractId",
                schema: "work",
                table: "Case",
                column: "ContractId",
                principalSchema: "contracts",
                principalTable: "Contract",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Case_Contract_ContractId",
                schema: "work",
                table: "Case");

            migrationBuilder.DropIndex(
                name: "IX_Case_ContractId_CreatedAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropIndex(
                name: "IX_Case_ResolutionSlaStatus_ResolutionDueAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropIndex(
                name: "IX_Case_ResponseSlaStatus_ResponseDueAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaPauseWhileWaitingOnCustomer",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "ContractId",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "FirstResponseAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResolutionDueAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResolutionElapsedMinutes",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResolutionSlaStatus",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResponseDueAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResponseElapsedMinutes",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "ResponseSlaStatus",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaAppliedAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaBasis",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaCalculatedAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaContractRef",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaNote",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaPauseOnCustomerWaiting",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaPausedMinutes",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaPriority",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaResolutionMinutes",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaResponseMinutes",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaSupport24x7",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaSupportDays",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaSupportFrom",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaSupportTo",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "SlaTimeZone",
                schema: "work",
                table: "Case");
        }
    }
}
