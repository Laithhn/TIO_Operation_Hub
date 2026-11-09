using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraClientRepresentative : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ClientContactId",
                schema: "jira",
                table: "JiraUserMapping",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClientRepresentative",
                schema: "work",
                table: "Case",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClientContactId",
                schema: "jira",
                table: "JiraUserMapping");

            migrationBuilder.DropColumn(
                name: "ClientRepresentative",
                schema: "work",
                table: "Case");
        }
    }
}
