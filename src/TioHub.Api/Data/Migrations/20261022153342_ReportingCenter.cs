using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ReportingCenter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "reporting");

            migrationBuilder.CreateTable(
                name: "ExportJob",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AuditId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Report = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ReportName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Format = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FiltersJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    FilterSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ColumnsJson = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RequestedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowCount = table.Column<int>(type: "int", nullable: true),
                    FileSize = table.Column<long>(type: "bigint", nullable: true),
                    FileName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StoredPath = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Error = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Source = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ScheduleId = table.Column<long>(type: "bigint", nullable: true),
                    RetryOfId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExportJob", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExportJob_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReportPreset",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Report = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    FiltersJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportPreset", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReportSchedule",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Report = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    FiltersJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    FilterSummary = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Format = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    DayOfWeek = table.Column<int>(type: "int", nullable: true),
                    DayOfMonth = table.Column<int>(type: "int", nullable: true),
                    TimeOfDay = table.Column<TimeOnly>(type: "time", nullable: false),
                    TimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    NextRunAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastRunAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastOutcome = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSchedule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportSchedule_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ReportScheduleRecipient",
                schema: "reporting",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ScheduleId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportScheduleRecipient", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportScheduleRecipient_ReportSchedule_ScheduleId",
                        column: x => x.ScheduleId,
                        principalSchema: "reporting",
                        principalTable: "ReportSchedule",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReportScheduleRecipient_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_AuditId",
                schema: "reporting",
                table: "ExportJob",
                column: "AuditId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_ScheduleId",
                schema: "reporting",
                table: "ExportJob",
                column: "ScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_Status_ExpiresAt",
                schema: "reporting",
                table: "ExportJob",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ExportJob_UserId_RequestedAt",
                schema: "reporting",
                table: "ExportJob",
                columns: new[] { "UserId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReportPreset_UserId_Report_Name",
                schema: "reporting",
                table: "ReportPreset",
                columns: new[] { "UserId", "Report", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportSchedule_IsActive_NextRunAt",
                schema: "reporting",
                table: "ReportSchedule",
                columns: new[] { "IsActive", "NextRunAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReportSchedule_OwnerUserId",
                schema: "reporting",
                table: "ReportSchedule",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportScheduleRecipient_ScheduleId_UserId",
                schema: "reporting",
                table: "ReportScheduleRecipient",
                columns: new[] { "ScheduleId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportScheduleRecipient_UserId",
                schema: "reporting",
                table: "ReportScheduleRecipient",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExportJob",
                schema: "reporting");

            migrationBuilder.DropTable(
                name: "ReportPreset",
                schema: "reporting");

            migrationBuilder.DropTable(
                name: "ReportScheduleRecipient",
                schema: "reporting");

            migrationBuilder.DropTable(
                name: "ReportSchedule",
                schema: "reporting");
        }
    }
}
