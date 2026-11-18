using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ClientStatusFreeText : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A119: client status comments / feedback become free text without a length cap (widening only; no data changes).
            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                schema: "clients",
                table: "ClientStatusReport",
                type: "nvarchar(max)",
                maxLength: 400,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Summary",
                schema: "clients",
                table: "ClientStatusReport",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldMaxLength: 400);
        }
    }
}
