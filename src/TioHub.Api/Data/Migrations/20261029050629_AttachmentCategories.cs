using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AttachmentCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                schema: "files",
                table: "Attachment",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            // A64: attachment categories are a configuration list, seeded with the usual ones (insert-only: values that exist are left alone).
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT N''AttachmentCategory'', v.[Code], v.[Label], v.[SortOrder], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''Commercial'', N''Commercial'', 10), (N''Contract'', N''Contract'', 20), (N''Scope'', N''Scope'', 30), (N''Technical'', N''Technical'', 40), (N''Testing'', N''Testing'', 50), (N''Compliance'', N''Compliance'', 60), (N''Hardware'', N''Hardware'', 70)) AS v([Code], [Label], [SortOrder]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''AttachmentCategory'' AND l.[Code] = v.[Code]);')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'AttachmentCategory';");

            migrationBuilder.DropColumn(
                name: "Category",
                schema: "files",
                table: "Attachment");
        }
    }
}
