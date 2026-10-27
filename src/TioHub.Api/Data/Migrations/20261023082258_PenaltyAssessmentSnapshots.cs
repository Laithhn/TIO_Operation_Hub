using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PenaltyAssessmentSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PenaltyTermsSnapshotJson",
                schema: "work",
                table: "Case",
                type: "nvarchar(max)",
                maxLength: 8000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PenaltyAssessment",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    ClauseId = table.Column<long>(type: "bigint", nullable: false),
                    TermsKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TermsSnapshotJson = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    BillingMonth = table.Column<DateOnly>(type: "date", nullable: false),
                    UncappedAmount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    BreachCount = table.Column<int>(type: "int", nullable: false),
                    BreachIdentitiesJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    CalculatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ReviewedById = table.Column<long>(type: "bigint", nullable: true),
                    ReviewReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PenaltyAssessment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PenaltyAssessment_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PenaltyAssessment_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PenaltyAssessment_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PenaltyAssessment_ContractId_ClauseId_BillingMonth_TermsKey",
                schema: "contracts",
                table: "PenaltyAssessment",
                columns: new[] { "ContractId", "ClauseId", "BillingMonth", "TermsKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PenaltyAssessment_CreatedById",
                schema: "contracts",
                table: "PenaltyAssessment",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_PenaltyAssessment_UpdatedById",
                schema: "contracts",
                table: "PenaltyAssessment",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PenaltyAssessment",
                schema: "contracts");

            migrationBuilder.DropColumn(
                name: "PenaltyTermsSnapshotJson",
                schema: "work",
                table: "Case");
        }
    }
}
