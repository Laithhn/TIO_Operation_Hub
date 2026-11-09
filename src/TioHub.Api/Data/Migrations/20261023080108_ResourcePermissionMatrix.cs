using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ResourcePermissionMatrix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppRolePermission",
                schema: "iam",
                columns: table => new
                {
                    AppRoleId = table.Column<long>(type: "bigint", nullable: false),
                    Resource = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppRolePermission", x => new { x.AppRoleId, x.Resource, x.Action });
                    table.ForeignKey(
                        name: "FK_AppRolePermission_AppRole_AppRoleId",
                        column: x => x.AppRoleId,
                        principalSchema: "iam",
                        principalTable: "AppRole",
                        principalColumn: "Id");
                });
            migrationBuilder.Sql("""
                INSERT INTO [iam].[AppRolePermission] ([AppRoleId], [Resource], [Action])
                SELECT r.[Id], p.[Resource], p.[Action]
                FROM [iam].[AppRole] AS r
                CROSS APPLY (VALUES
                    (N'ClientStructure', N'Maintain', 1),
                    (N'ClientStructure', N'Create', 2),
                    (N'ClientStructure', N'Coordinate', 2),
                    (N'ClientStructure', N'ArchiveRestore', 4),
                    (N'ClientStructure', N'Delete', 8),
                    (N'Contracts', N'Maintain', 1),
                    (N'Contracts', N'Create', 1),
                    (N'Contracts', N'Coordinate', 2),
                    (N'Contracts', N'ArchiveRestore', 4),
                    (N'Contracts', N'Delete', 8),
                    (N'Environments', N'Maintain', 1),
                    (N'Environments', N'Create', 1),
                    (N'Environments', N'Coordinate', 2),
                    (N'Environments', N'ArchiveRestore', 4),
                    (N'Environments', N'Delete', 8),
                    (N'Servers', N'Maintain', 1),
                    (N'Servers', N'Create', 1),
                    (N'Servers', N'Coordinate', 2),
                    (N'Servers', N'ArchiveRestore', 4),
                    (N'Servers', N'Delete', 8),
                    (N'Installations', N'Maintain', 1),
                    (N'Installations', N'Create', 1),
                    (N'Installations', N'Coordinate', 2),
                    (N'Installations', N'ArchiveRestore', 4),
                    (N'Installations', N'Delete', 8),
                    (N'Products', N'Maintain', 1),
                    (N'Products', N'Create', 1),
                    (N'Products', N'Coordinate', 2),
                    (N'Products', N'ArchiveRestore', 4),
                    (N'Products', N'Delete', 8),
                    (N'Cases', N'Maintain', 1),
                    (N'Cases', N'Create', 1),
                    (N'Cases', N'Coordinate', 2),
                    (N'Cases', N'ArchiveRestore', 4),
                    (N'Cases', N'Delete', 8),
                    (N'Commitments', N'Maintain', 1),
                    (N'Commitments', N'Create', 1),
                    (N'Commitments', N'Coordinate', 2),
                    (N'Commitments', N'ArchiveRestore', 4),
                    (N'Commitments', N'Delete', 8),
                    (N'Teams', N'Maintain', 1),
                    (N'Teams', N'Create', 2),
                    (N'Teams', N'Coordinate', 2),
                    (N'Teams', N'ArchiveRestore', 4),
                    (N'Teams', N'Delete', 8),
                    (N'OtherOperations', N'Maintain', 1),
                    (N'OtherOperations', N'Create', 1),
                    (N'OtherOperations', N'Coordinate', 2),
                    (N'OtherOperations', N'ArchiveRestore', 4),
                    (N'OtherOperations', N'Delete', 8)
                ) AS p([Resource], [Action], [LegacyRight])
                WHERE (r.[Rights] & p.[LegacyRight]) = p.[LegacyRight];
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppRolePermission",
                schema: "iam");
        }
    }
}

