using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class MicroserviceVersionsAndDevelopers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MicroserviceVersion",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MicroserviceId = table.Column<long>(type: "bigint", nullable: false),
                    Version = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SortKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ReleasedOn = table.Column<DateOnly>(type: "date", nullable: true),
                    ReleaseNotes = table.Column<string>(type: "nvarchar(max)", maxLength: 8000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MicroserviceVersion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MicroserviceVersion_ProductMicroservice_MicroserviceId",
                        column: x => x.MicroserviceId,
                        principalSchema: "catalogue",
                        principalTable: "ProductMicroservice",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MicroserviceVersion_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MicroserviceVersion_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProductDeveloper",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductDeveloper", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductDeveloper_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MicroserviceVersion_CreatedById",
                schema: "catalogue",
                table: "MicroserviceVersion",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_MicroserviceVersion_MicroserviceId_Version",
                schema: "catalogue",
                table: "MicroserviceVersion",
                columns: new[] { "MicroserviceId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MicroserviceVersion_UpdatedById",
                schema: "catalogue",
                table: "MicroserviceVersion",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductDeveloper_ProductId",
                schema: "catalogue",
                table: "ProductDeveloper",
                column: "ProductId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MicroserviceVersion",
                schema: "catalogue");

            migrationBuilder.DropTable(
                name: "ProductDeveloper",
                schema: "catalogue");
        }
    }
}
