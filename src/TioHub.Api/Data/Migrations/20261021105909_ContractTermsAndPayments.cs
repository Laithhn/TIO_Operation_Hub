using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ContractTermsAndPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(3)",
                maxLength: 3,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Support24x7",
                schema: "contracts",
                table: "Contract",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SupportDays",
                schema: "contracts",
                table: "Contract",
                type: "int",
                maxLength: 40,
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "SupportFrom",
                schema: "contracts",
                table: "Contract",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "SupportTo",
                schema: "contracts",
                table: "Contract",
                type: "time",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ContractFee",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractFee", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractFee_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ContractMilestone",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Phase = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CompletionPercent = table.Column<int>(type: "int", nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractMilestone", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractMilestone_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ContractPayment",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Condition = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    DueDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PaidOn = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractPayment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContractPayment_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContractFee_ContractId",
                schema: "contracts",
                table: "ContractFee",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractMilestone_ContractId",
                schema: "contracts",
                table: "ContractMilestone",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractPayment_ContractId",
                schema: "contracts",
                table: "ContractPayment",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractPayment_Status_DueDate",
                schema: "contracts",
                table: "ContractPayment",
                columns: new[] { "Status", "DueDate" });

            // A49: contracts whose support-hours text said 24x7 get the new flag; the text stays as notes.
            migrationBuilder.Sql(@"EXEC(N'UPDATE [contracts].[Contract] SET [Support24x7] = 1 WHERE [SupportHours] LIKE N''%24%7%'' OR [SupportHours] LIKE N''%round the clock%'';')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractFee",
                schema: "contracts");

            migrationBuilder.DropTable(
                name: "ContractMilestone",
                schema: "contracts");

            migrationBuilder.DropTable(
                name: "ContractPayment",
                schema: "contracts");

            migrationBuilder.DropColumn(
                name: "Currency",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "Support24x7",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "SupportDays",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "SupportFrom",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "SupportTo",
                schema: "contracts",
                table: "Contract");
        }
    }
}
