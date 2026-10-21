using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class TwoRolesAndProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Owner decision, 19 Oct 2026: two roles only (Operation Engineer, TIO Manager; the Manager also administers).
            // Administrator and Team Lead become TIO Manager; Read-only is removed (no edit rights are granted silently —
            // such accounts cannot sign in until the TIO Manager gives them a role).
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [iam].[UserRole] ([UserId], [Role])
                SELECT DISTINCT r.[UserId], N''Manager'' FROM [iam].[UserRole] r
                WHERE r.[Role] IN (N''Administrator'', N''TeamLead'')
                  AND NOT EXISTS (SELECT 1 FROM [iam].[UserRole] x WHERE x.[UserId] = r.[UserId] AND x.[Role] = N''Manager'');')");
            migrationBuilder.Sql(@"EXEC(N'DELETE FROM [iam].[UserRole] WHERE [Role] NOT IN (N''Engineer'', N''Manager'');')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [iam].[GroupMapping] SET [Role] = N''Manager'' WHERE [Role] IN (N''Administrator'', N''TeamLead'');')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [iam].[GroupMapping] SET [Role] = NULL WHERE [Role] = N''ReadOnly'';')");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                schema: "catalogue",
                table: "ProductModule",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "catalogue",
                table: "Product",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                schema: "catalogue",
                table: "Product",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "OwningTeamId",
                schema: "catalogue",
                table: "Product",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Technology",
                schema: "catalogue",
                table: "Product",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProductFeature",
                schema: "catalogue",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    ModuleId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductFeature", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductFeature_ProductModule_ModuleId",
                        column: x => x.ModuleId,
                        principalSchema: "catalogue",
                        principalTable: "ProductModule",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductFeature_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductFeature_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ProductFeature_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Product_OwningTeamId",
                schema: "catalogue",
                table: "Product",
                column: "OwningTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Product_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                column: "ProductOwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductFeature_CreatedById",
                schema: "catalogue",
                table: "ProductFeature",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ProductFeature_ModuleId",
                schema: "catalogue",
                table: "ProductFeature",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductFeature_ProductId_Name",
                schema: "catalogue",
                table: "ProductFeature",
                columns: new[] { "ProductId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductFeature_UpdatedById",
                schema: "catalogue",
                table: "ProductFeature",
                column: "UpdatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Product_Team_OwningTeamId",
                schema: "catalogue",
                table: "Product",
                column: "OwningTeamId",
                principalSchema: "teams",
                principalTable: "Team",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Product_User_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                column: "ProductOwnerUserId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Product_Team_OwningTeamId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropForeignKey(
                name: "FK_Product_User_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropTable(
                name: "ProductFeature",
                schema: "catalogue");

            migrationBuilder.DropIndex(
                name: "IX_Product_OwningTeamId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropIndex(
                name: "IX_Product_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "Description",
                schema: "catalogue",
                table: "ProductModule");

            migrationBuilder.DropColumn(
                name: "Category",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "OwningTeamId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "Technology",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "catalogue",
                table: "Product",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);
        }
    }
}
