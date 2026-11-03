using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations;

public partial class ProjectPermissions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Preserve each role's existing project-related authority while moving projects out of ClientStructure.
        // The insert is one-time (migration history) and idempotent for partially provisioned permission rows.
        migrationBuilder.Sql("""
            DECLARE @granted TABLE (RoleId bigint, Action nvarchar(40));
            INSERT [iam].[AppRolePermission] ([AppRoleId], [Resource], [Action])
            OUTPUT inserted.AppRoleId, inserted.Action INTO @granted
            SELECT source.[AppRoleId], N'Projects', source.[Action]
            FROM [iam].[AppRolePermission] source
            WHERE source.[Resource] = N'ClientStructure'
              AND source.[Action] IN (N'View', N'DetailsView', N'HistoryView', N'AttachmentsView',
                  N'AttachmentsUpload', N'AttachmentsDeleteOwn', N'AttachmentsDelete', N'Export',
                  N'Create', N'Maintain', N'Coordinate', N'ArchiveRestore', N'Delete')
              AND NOT EXISTS (
                  SELECT 1 FROM [iam].[AppRolePermission] existing
                  WHERE existing.[AppRoleId] = source.[AppRoleId]
                    AND existing.[Resource] = N'Projects' AND existing.[Action] = source.[Action]);

            INSERT [audit].[AuditEntry] ([At], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [Reason], [Changes])
            SELECT SYSDATETIMEOFFSET(), N'deployment', N'ProjectPermissionUpgrade', N'Access', N'AppRole', role.[Id], role.[Name],
                N'Project permissions were separated from ClientStructure while preserving existing project access.',
                N'{"Permissions":[' + (SELECT N'Projects:' + granted.[Action] AS [key]
                    FROM @granted granted WHERE granted.RoleId = role.[Id] FOR JSON PATH) + N']}'
            FROM [iam].[AppRole] role
            WHERE EXISTS (SELECT 1 FROM @granted granted WHERE granted.RoleId = role.[Id]);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Keep grants: roles may have been edited after upgrade and removing rows would revoke current access.
    }
}
