using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Data;

#nullable disable

namespace TioHub.Api.Data.Migrations;

/// <summary>Preserves the former implicit all-client/all-team access as explicit grants.</summary>
[DbContext(typeof(HubDbContext))]
[Migration("20261102120000_PreserveLegacyEffectiveScopes")]
public sealed class PreserveLegacyEffectiveScopes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- Retain the pre-upgrade values for a reviewed, manual recovery. Never overwrite an earlier snapshot.
            IF OBJECT_ID(N'[iam].[LegacyScopeUpgrade]', N'U') IS NULL
                CREATE TABLE [iam].[LegacyScopeUpgrade] (
                    [TargetType] nvarchar(16) NOT NULL,
                    [TargetId] bigint NOT NULL,
                    [AllClients] bit NOT NULL,
                    [AllInternal] bit NOT NULL,
                    CONSTRAINT [PK_LegacyScopeUpgrade] PRIMARY KEY ([TargetType], [TargetId]));
            """);

        var dataSql = """
            INSERT [iam].[LegacyScopeUpgrade] ([TargetType], [TargetId], [AllClients], [AllInternal])
            SELECT N'User', u.[Id], u.[AllClients], u.[AllInternal]
            FROM [iam].[User] u
            WHERE EXISTS (SELECT 1 FROM [iam].[UserRole] ur
                JOIN [iam].[AppRole] r ON r.[Id] = ur.[AppRoleId]
                WHERE ur.[UserId] = u.[Id] AND r.[IsActive] = 1)
              AND NOT EXISTS (SELECT 1 FROM [iam].[LegacyScopeUpgrade] b WHERE b.[TargetType] = N'User' AND b.[TargetId] = u.[Id]);

            INSERT [iam].[LegacyScopeUpgrade] ([TargetType], [TargetId], [AllClients], [AllInternal])
            SELECT N'GroupMapping', m.[Id], m.[AllClients], m.[AllInternal]
            FROM [iam].[GroupMapping] m
            WHERE m.[Role] IS NOT NULL AND EXISTS (SELECT 1 FROM [iam].[AppRole] r
                WHERE r.[IsActive] = 1 AND r.[Key] = m.[Role] AND m.[Role] IN (N'Manager', N'Engineer'))
              AND NOT EXISTS (SELECT 1 FROM [iam].[LegacyScopeUpgrade] b WHERE b.[TargetType] = N'GroupMapping' AND b.[TargetId] = m.[Id]);

            UPDATE u SET [AllClients] = 1, [AllInternal] = 1
            FROM [iam].[User] u
            WHERE EXISTS (SELECT 1 FROM [iam].[UserRole] ur JOIN [iam].[AppRole] r ON r.[Id] = ur.[AppRoleId]
                WHERE ur.[UserId] = u.[Id] AND r.[IsActive] = 1);
            UPDATE m SET [AllClients] = 1, [AllInternal] = 1
            FROM [iam].[GroupMapping] m
            WHERE m.[Role] IS NOT NULL AND EXISTS (SELECT 1 FROM [iam].[AppRole] r
                WHERE r.[IsActive] = 1 AND r.[Key] = m.[Role] AND m.[Role] IN (N'Manager', N'Engineer'));

            UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
            INSERT [audit].[AuditEntry] ([At], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [Reason], [Changes])
            SELECT SYSDATETIMEOFFSET(), N'deployment', N'PreserveLegacyScope', N'Access', b.[TargetType], b.[TargetId], b.[TargetType],
                N'Preserved prior broad effective data scope when switching to explicit scope grants.',
                CONCAT(N'{"previousAllClients":', CASE WHEN b.[AllClients] = 1 THEN N'true' ELSE N'false' END,
                    N',"previousAllInternal":', CASE WHEN b.[AllInternal] = 1 THEN N'true' ELSE N'false' END, N'}')
            FROM [iam].[LegacyScopeUpgrade] b;
            """;
        // Idempotent scripts wrap migrations in history checks. Defer name binding until
        // after the preceding CREATE TABLE has run, even when both checks share a batch.
        migrationBuilder.Sql($"EXEC(N'{dataSql.Replace("'", "''")}');");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Deliberately retain flags and backup: an automatic restore would overwrite later administrator edits.
        // Rolling back the application restores the former implicit broad-scope behavior.
    }
}
