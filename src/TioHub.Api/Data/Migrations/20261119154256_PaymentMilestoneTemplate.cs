using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PaymentMilestoneTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AmountReceived",
                schema: "contracts",
                table: "ContractPayment",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalState",
                schema: "contracts",
                table: "ContractPayment",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientApproval",
                schema: "contracts",
                table: "ContractPayment",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "InvoiceDate",
                schema: "contracts",
                table: "ContractPayment",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                schema: "contracts",
                table: "ContractPayment",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkState",
                schema: "contracts",
                table: "ContractPayment",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkStatus",
                schema: "contracts",
                table: "ContractPayment",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmountReceived",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "ApprovalState",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "ClientApproval",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "InvoiceDate",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "WorkState",
                schema: "contracts",
                table: "ContractPayment");

            migrationBuilder.DropColumn(
                name: "WorkStatus",
                schema: "contracts",
                table: "ContractPayment");
        }
    }
}
