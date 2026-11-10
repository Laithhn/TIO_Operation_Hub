using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ServerGpuContractText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A109: the project statuses of 2.59.0 are removed with their table (owner approval, 10 Nov 2026). Client statuses replace them.
            // A110: optional GPU specification on servers; contract obligations and support notes without a length limit.
            migrationBuilder.DropTable(
                name: "ProjectStatusReport",
                schema: "clients");

            migrationBuilder.AlterColumn<string>(
                name: "SupportHours",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(max)",
                maxLength: 400,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Obligations",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(max)",
                maxLength: 400,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GpuCount",
                schema: "inventory",
                table: "Asset",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GpuMemoryQuantity",
                schema: "inventory",
                table: "Asset",
                type: "decimal(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GpuMemoryUnit",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GpuModel",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GpuCount",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "GpuMemoryQuantity",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "GpuMemoryUnit",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "GpuModel",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.AlterColumn<string>(
                name: "SupportHours",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldMaxLength: 400,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Obligations",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldMaxLength: 400,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "ProjectStatusReport",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordedById = table.Column<long>(type: "bigint", nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    NextReviewOn = table.Column<DateOnly>(type: "date", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: false),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectStatusReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectStatusReport_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProjectStatusReport_User_RecordedById",
                        column: x => x.RecordedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectStatusReport_ProjectId_RecordedAt",
                schema: "clients",
                table: "ProjectStatusReport",
                columns: new[] { "ProjectId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectStatusReport_RecordedById",
                schema: "clients",
                table: "ProjectStatusReport",
                column: "RecordedById");
        }
    }
}
