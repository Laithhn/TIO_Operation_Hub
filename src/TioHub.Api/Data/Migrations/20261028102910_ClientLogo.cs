using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ClientLogo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LogoContentType",
                schema: "clients",
                table: "Client",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoPath",
                schema: "clients",
                table: "Client",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoVersion",
                schema: "clients",
                table: "Client",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogoContentType",
                schema: "clients",
                table: "Client");

            migrationBuilder.DropColumn(
                name: "LogoPath",
                schema: "clients",
                table: "Client");

            migrationBuilder.DropColumn(
                name: "LogoVersion",
                schema: "clients",
                table: "Client");
        }
    }
}
