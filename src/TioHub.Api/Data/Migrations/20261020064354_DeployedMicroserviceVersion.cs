using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class DeployedMicroserviceVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ComponentHost_MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost",
                column: "MicroserviceVersionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ComponentHost_MicroserviceVersion_MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost",
                column: "MicroserviceVersionId",
                principalSchema: "catalogue",
                principalTable: "MicroserviceVersion",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ComponentHost_MicroserviceVersion_MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost");

            migrationBuilder.DropIndex(
                name: "IX_ComponentHost_MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost");

            migrationBuilder.DropColumn(
                name: "MicroserviceVersionId",
                schema: "inventory",
                table: "ComponentHost");
        }
    }
}
