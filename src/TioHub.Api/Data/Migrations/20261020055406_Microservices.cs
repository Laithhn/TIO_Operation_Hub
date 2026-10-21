using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Microservices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "MicroserviceId",
                schema: "inventory",
                table: "Component",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductMicroservice",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Role = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductMicroservice", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductMicroservice_ProductModule_ModuleId",
                        column: x => x.ModuleId,
                        principalSchema: "catalogue",
                        principalTable: "ProductModule",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductMicroservice_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductMicroservice_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductMicroservice_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Component_InstallationId_MicroserviceId",
                schema: "inventory",
                table: "Component",
                columns: new[] { "InstallationId", "MicroserviceId" },
                unique: true,
                filter: "[MicroserviceId] IS NOT NULL AND [ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Component_MicroserviceId",
                schema: "inventory",
                table: "Component",
                column: "MicroserviceId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMicroservice_CreatedById",
                schema: "catalogue",
                table: "ProductMicroservice",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMicroservice_ModuleId",
                schema: "catalogue",
                table: "ProductMicroservice",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductMicroservice_ProductId_Name",
                schema: "catalogue",
                table: "ProductMicroservice",
                columns: new[] { "ProductId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductMicroservice_UpdatedById",
                schema: "catalogue",
                table: "ProductMicroservice",
                column: "UpdatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Component_ProductMicroservice_MicroserviceId",
                schema: "inventory",
                table: "Component",
                column: "MicroserviceId",
                principalSchema: "catalogue",
                principalTable: "ProductMicroservice",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Component_ProductMicroservice_MicroserviceId",
                schema: "inventory",
                table: "Component");

            migrationBuilder.DropTable(
                name: "ProductMicroservice",
                schema: "catalogue");

            migrationBuilder.DropIndex(
                name: "IX_Component_InstallationId_MicroserviceId",
                schema: "inventory",
                table: "Component");

            migrationBuilder.DropIndex(
                name: "IX_Component_MicroserviceId",
                schema: "inventory",
                table: "Component");

            migrationBuilder.DropColumn(
                name: "MicroserviceId",
                schema: "inventory",
                table: "Component");
        }
    }
}
