using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UserPermissionOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserPermissionOverride",
                schema: "iam",
                columns: table => new
                {
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    PermissionKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Effect = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPermissionOverride", x => new { x.UserId, x.PermissionKey });
                    table.CheckConstraint("CK_UserPermissionOverride_Effect", "[Effect] IN ('Allow','Deny')");
                    table.ForeignKey(
                        name: "FK_UserPermissionOverride_PermissionDefinition_PermissionKey",
                        column: x => x.PermissionKey,
                        principalSchema: "iam",
                        principalTable: "PermissionDefinition",
                        principalColumn: "Key");
                    table.ForeignKey(
                        name: "FK_UserPermissionOverride_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionOverride_ExpiresAt",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionOverride_PermissionKey",
                schema: "iam",
                table: "UserPermissionOverride",
                column: "PermissionKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserPermissionOverride",
                schema: "iam");
        }
    }
}
