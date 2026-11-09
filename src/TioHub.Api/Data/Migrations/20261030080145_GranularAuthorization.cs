using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GranularAuthorization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuthorizationVersion",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuthorizationVersion", x => x.Id);
                    table.CheckConstraint("CK_AuthorizationVersion_Singleton", "[Id] = 1");
                });

            migrationBuilder.InsertData(
                schema: "iam",
                table: "AuthorizationVersion",
                columns: new[] { "Id", "Version" },
                values: new object[] { 1, 0L });

            // Compatibility runs exactly once through EF migration history. A later registry synchronization
            // must never recreate a permission that an administrator has revoked.
            migrationBuilder.Sql("""
                DECLARE @granted TABLE (RoleId bigint, Resource nvarchar(40), Action nvarchar(40));
                DECLARE @resources TABLE (Resource nvarchar(40) PRIMARY KEY);
                INSERT @resources VALUES (N'ClientStructure'),(N'Contracts'),(N'Environments'),(N'Servers'),
                    (N'Installations'),(N'Products'),(N'Cases'),(N'Commitments'),(N'Teams'),(N'OtherOperations');

                -- Before this release every existing role could read business records and the read-only tabs.
                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
                SELECT r.Id, res.Resource, a.Action FROM [iam].[AppRole] r CROSS JOIN @resources res
                CROSS JOIN (VALUES (N'View'),(N'DetailsView'),(N'HistoryView'),(N'AttachmentsView')) a(Action)
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
                    WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=a.Action);

                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
                SELECT r.Id, res.Resource, N'View' FROM [iam].[AppRole] r
                CROSS JOIN (VALUES (N'Dashboard'),(N'Reporting'),(N'PersonalNotes'),(N'Notifications')) res(Resource)
                WHERE NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
                    WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=N'View');

                -- The deployed shared file service used OtherOperations edit/delete for every record type.
                -- Preserve that authority once, then permit administrators to narrow each resource independently.
                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
                SELECT r.Id, res.Resource, a.Action FROM [iam].[AppRole] r CROSS JOIN @resources res
                CROSS JOIN (VALUES (N'AttachmentsUpload'),(N'AttachmentsDeleteOwn'),(N'AttachmentsDelete')) a(Action)
                WHERE EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p WHERE p.AppRoleId=r.Id
                    AND p.Resource=N'OtherOperations' AND ((a.Action IN (N'AttachmentsUpload',N'AttachmentsDeleteOwn') AND p.Action=N'Maintain')
                        OR (a.Action=N'AttachmentsDelete' AND p.Action=N'Delete')))
                AND NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
                    WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=a.Action);

                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
                SELECT r.Id, res.Resource, N'Export' FROM [iam].[AppRole] r CROSS JOIN @resources res
                WHERE (r.Rights & 16)=16 AND NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
                    WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=N'Export');

                INSERT [audit].[AuditEntry] ([At],[UserName],[Action],[Category],[EntityType],[EntityId],[EntityLabel],[Reason],[Changes])
                SELECT SYSDATETIMEOFFSET(),N'deployment',N'PermissionUpgrade',N'Access',N'AppRole',r.Id,r.Name,
                    N'GranularAuthorization compatibility grants preserve prior record visibility and authorized actions.',
                    N'{"Permissions":[null,'+(SELECT g.Resource+N':'+g.Action AS [key] FROM @granted g WHERE g.RoleId=r.Id FOR JSON PATH)+N']}'
                FROM [iam].[AppRole] r WHERE EXISTS (SELECT 1 FROM @granted g WHERE g.RoleId=r.Id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuthorizationVersion",
                schema: "iam");
        }
    }
}
