using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PermissionRegistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "iam",
                table: "AppRole",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "PermissionDefinition",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Module = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ParentKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    RiskLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsSystemManaged = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SupportsScope = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PermissionDefinition", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PermissionDefinition_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PermissionDefinition_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_PermissionDefinition_CreatedById",
                schema: "iam",
                table: "PermissionDefinition",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_PermissionDefinition_Key",
                schema: "iam",
                table: "PermissionDefinition",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PermissionDefinition_Module_ResourceType_Action",
                schema: "iam",
                table: "PermissionDefinition",
                columns: new[] { "Module", "ResourceType", "Action" });

            migrationBuilder.CreateIndex(
                name: "IX_PermissionDefinition_ParentKey",
                schema: "iam",
                table: "PermissionDefinition",
                column: "ParentKey");

            migrationBuilder.CreateIndex(
                name: "IX_PermissionDefinition_UpdatedById",
                schema: "iam",
                table: "PermissionDefinition",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PermissionDefinition",
                schema: "iam");

            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "iam",
                table: "AppRole");
        }
    }
}
