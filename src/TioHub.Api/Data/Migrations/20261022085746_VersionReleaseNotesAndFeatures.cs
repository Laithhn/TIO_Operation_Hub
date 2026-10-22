using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VersionReleaseNotesAndFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReleaseNotes",
                schema: "catalogue",
                table: "ProductVersion",
                type: "nvarchar(max)",
                maxLength: 8000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProductFeature_IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature",
                column: "IntroducedInVersionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProductFeature_ProductVersion_IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature",
                column: "IntroducedInVersionId",
                principalSchema: "catalogue",
                principalTable: "ProductVersion",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProductFeature_ProductVersion_IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature");

            migrationBuilder.DropIndex(
                name: "IX_ProductFeature_IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature");

            migrationBuilder.DropColumn(
                name: "ReleaseNotes",
                schema: "catalogue",
                table: "ProductVersion");

            migrationBuilder.DropColumn(
                name: "IntroducedInVersionId",
                schema: "catalogue",
                table: "ProductFeature");
        }
    }
}
