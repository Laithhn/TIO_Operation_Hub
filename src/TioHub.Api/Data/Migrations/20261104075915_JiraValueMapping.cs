using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraValueMapping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "JiraValueMapping",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    JiraValue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TargetCode = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JiraValueMapping", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JiraValueMapping_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_JiraValueMapping_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_JiraValueMapping_ClientId_Kind_JiraValue",
                schema: "jira",
                table: "JiraValueMapping",
                columns: new[] { "ClientId", "Kind", "JiraValue" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JiraValueMapping_CreatedById",
                schema: "jira",
                table: "JiraValueMapping",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_JiraValueMapping_UpdatedById",
                schema: "jira",
                table: "JiraValueMapping",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JiraValueMapping",
                schema: "jira");
        }
    }
}
