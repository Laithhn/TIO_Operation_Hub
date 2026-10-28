using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReportBuilder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OptionsJson",
                schema: "reporting",
                table: "ReportSchedule",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SavedReportId",
                schema: "reporting",
                table: "ReportSchedule",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Attempts",
                schema: "reporting",
                table: "ExportJob",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "CancelRequested",
                schema: "reporting",
                table: "ExportJob",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CutoffAt",
                schema: "reporting",
                table: "ExportJob",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefinitionJson",
                schema: "reporting",
                table: "ExportJob",
                type: "nvarchar(max)",
                maxLength: 32000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                schema: "reporting",
                table: "ExportJob",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "NotBefore",
                schema: "reporting",
                table: "ExportJob",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionsJson",
                schema: "reporting",
                table: "ExportJob",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SavedReportId",
                schema: "reporting",
                table: "ExportJob",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SavedReport",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    ReportType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Visibility = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    TeamId = table.Column<long>(type: "bigint", nullable: true),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false),
                    DefinitionJson = table.Column<string>(type: "nvarchar(max)", maxLength: 32000, nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastRunAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedReport", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedReport_Team_TeamId",
                        column: x => x.TeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SavedReport_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SavedReportFavorite",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SavedReportId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedReportFavorite", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedReportFavorite_SavedReport_SavedReportId",
                        column: x => x.SavedReportId,
                        principalSchema: "reporting",
                        principalTable: "SavedReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SavedReportFavorite_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SavedReportShare",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SavedReportId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SavedReportShare", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SavedReportShare_SavedReport_SavedReportId",
                        column: x => x.SavedReportId,
                        principalSchema: "reporting",
                        principalTable: "SavedReport",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_SavedReportShare_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportSchedule_SavedReportId",
                schema: "reporting",
                table: "ReportSchedule",
                column: "SavedReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_SavedReportId",
                schema: "reporting",
                table: "ExportJob",
                column: "SavedReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_Status_NotBefore",
                schema: "reporting",
                table: "ExportJob",
                columns: new[] { "Status", "NotBefore" });

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_UserId_IdempotencyKey",
                schema: "reporting",
                table: "ExportJob",
                columns: new[] { "UserId", "IdempotencyKey" },
                unique: true,
                filter: "[IdempotencyKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Case_CreatedAt",
                schema: "work",
                table: "Case",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SavedReport_OwnerUserId_Name",
                schema: "reporting",
                table: "SavedReport",
                columns: new[] { "OwnerUserId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedReport_TeamId",
                schema: "reporting",
                table: "SavedReport",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedReport_Visibility_TeamId",
                schema: "reporting",
                table: "SavedReport",
                columns: new[] { "Visibility", "TeamId" });

            migrationBuilder.CreateIndex(
                name: "IX_SavedReportFavorite_SavedReportId",
                schema: "reporting",
                table: "SavedReportFavorite",
                column: "SavedReportId");

            migrationBuilder.CreateIndex(
                name: "IX_SavedReportFavorite_UserId_SavedReportId",
                schema: "reporting",
                table: "SavedReportFavorite",
                columns: new[] { "UserId", "SavedReportId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedReportShare_SavedReportId_UserId",
                schema: "reporting",
                table: "SavedReportShare",
                columns: new[] { "SavedReportId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SavedReportShare_UserId",
                schema: "reporting",
                table: "SavedReportShare",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExportJob_SavedReport_SavedReportId",
                schema: "reporting",
                table: "ExportJob",
                column: "SavedReportId",
                principalSchema: "reporting",
                principalTable: "SavedReport",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ReportSchedule_SavedReport_SavedReportId",
                schema: "reporting",
                table: "ReportSchedule",
                column: "SavedReportId",
                principalSchema: "reporting",
                principalTable: "SavedReport",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExportJob_SavedReport_SavedReportId",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropForeignKey(
                name: "FK_ReportSchedule_SavedReport_SavedReportId",
                schema: "reporting",
                table: "ReportSchedule");

            migrationBuilder.DropTable(
                name: "SavedReportFavorite",
                schema: "reporting");

            migrationBuilder.DropTable(
                name: "SavedReportShare",
                schema: "reporting");

            migrationBuilder.DropTable(
                name: "SavedReport",
                schema: "reporting");

            migrationBuilder.DropIndex(
                name: "IX_ReportSchedule_SavedReportId",
                schema: "reporting",
                table: "ReportSchedule");

            migrationBuilder.DropIndex(
                name: "IX_ExportJob_SavedReportId",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropIndex(
                name: "IX_ExportJob_Status_NotBefore",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropIndex(
                name: "IX_ExportJob_UserId_IdempotencyKey",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropIndex(
                name: "IX_Case_CreatedAt",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "OptionsJson",
                schema: "reporting",
                table: "ReportSchedule");

            migrationBuilder.DropColumn(
                name: "SavedReportId",
                schema: "reporting",
                table: "ReportSchedule");

            migrationBuilder.DropColumn(
                name: "Attempts",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "CancelRequested",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "CutoffAt",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "DefinitionJson",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "NotBefore",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "OptionsJson",
                schema: "reporting",
                table: "ExportJob");

            migrationBuilder.DropColumn(
                name: "SavedReportId",
                schema: "reporting",
                table: "ExportJob");
        }
    }
}
