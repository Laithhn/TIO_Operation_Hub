using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AssetNetworkDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Vlan",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IpAddress",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "Notes",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "Vlan",
                schema: "inventory",
                table: "Asset");
        }
    }
}
