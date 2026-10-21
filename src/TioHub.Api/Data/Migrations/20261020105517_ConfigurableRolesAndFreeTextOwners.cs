using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableRolesAndFreeTextOwners : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Data steps run through EXEC: the idempotent script compiles a migration as one batch, before the new columns exist.
            // A31: configurable roles. The two built-in roles are created first and existing role holders keep their role.
            migrationBuilder.CreateTable(
                name: "AppRole",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Rights = table.Column<int>(type: "int", maxLength: 40, nullable: false),
                    Key = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRole", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppRole_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_AppRole_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppRole_CreatedById",
                schema: "iam",
                table: "AppRole",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_AppRole_Key",
                schema: "iam",
                table: "AppRole",
                column: "Key",
                unique: true,
                filter: "[Key] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AppRole_Name",
                schema: "iam",
                table: "AppRole",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppRole_UpdatedById",
                schema: "iam",
                table: "AppRole",
                column: "UpdatedById");

            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [iam].[AppRole] ([Name], [Description], [Rights], [Key], [CreatedAt], [UpdatedAt]) VALUES (N''TIO Manager'', N''Runs the TIO team; administers the hub. Always holds every right.'', 255, N''Manager'', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()), (N''Operation Engineer'', N''Day-to-day operations work on every client.'', 113, N''Engineer'', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());')");

            migrationBuilder.AddColumn<long>(
                name: "AppRoleId",
                schema: "iam",
                table: "UserRole",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.Sql(@"EXEC(N'UPDATE ur SET ur.[AppRoleId] = r.[Id] FROM [iam].[UserRole] ur JOIN [iam].[AppRole] r ON r.[Key] = ur.[Role];')");

            migrationBuilder.Sql(@"EXEC(N'DELETE ur FROM [iam].[UserRole] ur WHERE ur.[AppRoleId] = 0 OR (ur.[Role] = N''Engineer'' AND EXISTS (SELECT 1 FROM [iam].[UserRole] m WHERE m.[UserId] = ur.[UserId] AND m.[Role] = N''Manager''));')");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserRole",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.DropColumn(
                name: "Role",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserRole",
                schema: "iam",
                table: "UserRole",
                columns: new[] { "UserId", "AppRoleId" });

            migrationBuilder.CreateIndex(
                name: "IX_UserRole_AppRoleId",
                schema: "iam",
                table: "UserRole",
                column: "AppRoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserRole_AppRole_AppRoleId",
                schema: "iam",
                table: "UserRole",
                column: "AppRoleId",
                principalSchema: "iam",
                principalTable: "AppRole",
                principalColumn: "Id");
            // Owner request (20 Oct 2026): the product owner is free text; existing owners keep their name.
            migrationBuilder.AddColumn<string>(
                name: "ProductOwner",
                schema: "catalogue",
                table: "Product",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.Sql(@"EXEC(N'UPDATE p SET p.[ProductOwner] = LEFT(u.[DisplayName], 150) FROM [catalogue].[Product] p JOIN [iam].[User] u ON u.[Id] = p.[ProductOwnerUserId];')");

            migrationBuilder.DropForeignKey(
                name: "FK_Product_User_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropIndex(
                name: "IX_Product_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "ProductOwnerUserId",
                schema: "catalogue",
                table: "Product");

            // Owner request (20 Oct 2026): a technical owner who is not a hub user, with contact details.
            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerContact",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerName",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserRole_AppRole_AppRoleId",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.DropTable(
                name: "AppRole",
                schema: "iam");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserRole",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.DropIndex(
                name: "IX_UserRole_AppRoleId",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.DropColumn(
                name: "AppRoleId",
                schema: "iam",
                table: "UserRole");

            migrationBuilder.DropColumn(
                name: "ProductOwner",
                schema: "catalogue",
                table: "Product");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerContact",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerName",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                schema: "iam",
                table: "UserRole",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserRole",
                schema: "iam",
                table: "UserRole",
                columns: new[] { "UserId", "Role" });

            migrationBuilder.CreateIndex(
                name: "IX_Product_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                column: "ProductOwnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Product_User_ProductOwnerUserId",
                schema: "catalogue",
                table: "Product",
                column: "ProductOwnerUserId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");
        }
    }
}
