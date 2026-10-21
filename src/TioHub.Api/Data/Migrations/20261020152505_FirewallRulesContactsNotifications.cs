using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FirewallRulesContactsNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Asset_User_SourceReviewerId",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropForeignKey(
                name: "FK_Installation_User_SourceReviewerId",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropForeignKey(
                name: "FK_Volume_User_SourceReviewerId",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropTable(
                name: "CaseDependency",
                schema: "work");

            migrationBuilder.DropTable(
                name: "DependencyComponent",
                schema: "network");

            migrationBuilder.DropTable(
                name: "EndpointAddress",
                schema: "network");

            migrationBuilder.DropTable(
                name: "EndpointGroupMember",
                schema: "network");

            migrationBuilder.DropTable(
                name: "Dependency",
                schema: "network");

            migrationBuilder.DropTable(
                name: "Endpoint",
                schema: "network");

            migrationBuilder.DropTable(
                name: "NetworkContext",
                schema: "network");

            migrationBuilder.DropIndex(
                name: "IX_Volume_SourceReviewerId",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropIndex(
                name: "IX_Installation_SourceReviewerId",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropIndex(
                name: "IX_Asset_SourceReviewerId",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "SourceDocument",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "SourceNotation",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "SourceRange",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "SourceReviewerId",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "SourceSheet",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "TranscribedAt",
                schema: "inventory",
                table: "Volume");

            migrationBuilder.DropColumn(
                name: "SourceDocument",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "SourceNotation",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "SourceRange",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "SourceReviewerId",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "SourceSheet",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "TranscribedAt",
                schema: "catalogue",
                table: "Installation");

            migrationBuilder.DropColumn(
                name: "SourceDocument",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "SourceNotation",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "SourceRange",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "SourceReviewerId",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "TranscribedAt",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.EnsureSchema(
                name: "notify");

            migrationBuilder.RenameColumn(
                name: "SourceSheet",
                schema: "inventory",
                table: "Asset",
                newName: "TechnicalOwnerTitle");

            migrationBuilder.AddColumn<string>(
                name: "PersonEmail",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonMobile",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonName",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonPhone",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonTitle",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerEmail",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(254)",
                maxLength: 254,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerMobile",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerOrganization",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalOwnerPhone",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FirewallRule",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    SourceAssetId = table.Column<long>(type: "bigint", nullable: false),
                    DestinationAssetId = table.Column<long>(type: "bigint", nullable: false),
                    Ports = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Protocol = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FirewallRule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FirewallRule_Asset_DestinationAssetId",
                        column: x => x.DestinationAssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FirewallRule_Asset_SourceAssetId",
                        column: x => x.SourceAssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FirewallRule_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FirewallRule_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FirewallRule_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FirewallRule_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Notification",
                schema: "notify",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Link = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Key = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ReadAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notification", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notification_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResponsibilityBoundary_ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "ResponsibleUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_ClientId",
                schema: "network",
                table: "FirewallRule",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_CreatedById",
                schema: "network",
                table: "FirewallRule",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_DestinationAssetId",
                schema: "network",
                table: "FirewallRule",
                column: "DestinationAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_EnvironmentId",
                schema: "network",
                table: "FirewallRule",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_SourceAssetId",
                schema: "network",
                table: "FirewallRule",
                column: "SourceAssetId");

            migrationBuilder.CreateIndex(
                name: "IX_FirewallRule_UpdatedById",
                schema: "network",
                table: "FirewallRule",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_Key",
                schema: "notify",
                table: "Notification",
                columns: new[] { "UserId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notification_UserId_ReadAt",
                schema: "notify",
                table: "Notification",
                columns: new[] { "UserId", "ReadAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_ResponsibilityBoundary_User_ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary",
                column: "ResponsibleUserId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");

            // A35: findings, reviews and document links of removed record kinds (network endpoints, dependencies) and of removed rules
            // (unresolved endpoint, placeholder source notation) are cleared with them.
            migrationBuilder.Sql(@"EXEC(N'DELETE FROM [quality].[DataQualityItem] WHERE [Rule] IN (N''UnresolvedEndpoint'', N''PlaceholderNotation'') OR [RecordType] IN (N''Endpoint'', N''Dependency'');')");
            migrationBuilder.Sql(@"EXEC(N'DELETE FROM [quality].[Review] WHERE [RecordType] IN (N''Endpoint'', N''Dependency'');')");
            migrationBuilder.Sql(@"EXEC(N'DELETE FROM [quality].[DocumentReference] WHERE [RecordType] IN (N''Endpoint'', N''Dependency'');')");

            // A37: project team roles become a configuration list; the usual roles and every role already in use are seeded.
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT N''TeamRole'', v.[Label], v.[Label], v.[SortOrder], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''Operation engineer'', 10), (N''Backup operation engineer'', 20), (N''DevOps engineer'', 30), (N''Support engineer'', 40), (N''Developer'', 50), (N''Project coordinator'', 60)) AS v([Label], [SortOrder]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''TeamRole'' AND l.[Code] = v.[Label]);')");
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT DISTINCT N''TeamRole'', t.[Role], t.[Role], 900, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM [clients].[ClientTeamMember] t WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''TeamRole'' AND l.[Code] = t.[Role]);')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResponsibilityBoundary_User_ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropTable(
                name: "FirewallRule",
                schema: "network");

            migrationBuilder.DropTable(
                name: "Notification",
                schema: "notify");

            migrationBuilder.DropIndex(
                name: "IX_ResponsibilityBoundary_ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "PersonEmail",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "PersonMobile",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "PersonName",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "PersonPhone",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "PersonTitle",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "ResponsibleUserId",
                schema: "clients",
                table: "ResponsibilityBoundary");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerEmail",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerMobile",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerOrganization",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.DropColumn(
                name: "TechnicalOwnerPhone",
                schema: "inventory",
                table: "Asset");

            migrationBuilder.RenameColumn(
                name: "TechnicalOwnerTitle",
                schema: "inventory",
                table: "Asset",
                newName: "SourceSheet");

            migrationBuilder.AddColumn<string>(
                name: "SourceDocument",
                schema: "inventory",
                table: "Volume",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceNotation",
                schema: "inventory",
                table: "Volume",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceRange",
                schema: "inventory",
                table: "Volume",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SourceReviewerId",
                schema: "inventory",
                table: "Volume",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceSheet",
                schema: "inventory",
                table: "Volume",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TranscribedAt",
                schema: "inventory",
                table: "Volume",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceDocument",
                schema: "catalogue",
                table: "Installation",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceNotation",
                schema: "catalogue",
                table: "Installation",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceRange",
                schema: "catalogue",
                table: "Installation",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SourceReviewerId",
                schema: "catalogue",
                table: "Installation",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceSheet",
                schema: "catalogue",
                table: "Installation",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TranscribedAt",
                schema: "catalogue",
                table: "Installation",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceDocument",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceNotation",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceRange",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SourceReviewerId",
                schema: "inventory",
                table: "Asset",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "TranscribedAt",
                schema: "inventory",
                table: "Asset",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NetworkContext",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NetworkContext", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NetworkContext_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NetworkContext_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Endpoint",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssetId = table.Column<long>(type: "bigint", nullable: true),
                    ComponentId = table.Column<long>(type: "bigint", nullable: true),
                    NetworkContextId = table.Column<long>(type: "bigint", nullable: false),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    Hostname = table.Column<string>(type: "nvarchar(253)", maxLength: 253, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    Zone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Endpoint", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Endpoint_Asset_AssetId",
                        column: x => x.AssetId,
                        principalSchema: "inventory",
                        principalTable: "Asset",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_NetworkContext_NetworkContextId",
                        column: x => x.NetworkContextId,
                        principalSchema: "network",
                        principalTable: "NetworkContext",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Endpoint_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Dependency",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DestinationEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    SourceEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    CoordinatorUserId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    Direction = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: true),
                    PairExpansionConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PairExpansionConfirmedById = table.Column<long>(type: "bigint", nullable: true),
                    Ports = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Protocol = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ProtocolExplanation = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    SamePairReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SourceDocument = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SourceNotation = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    SourceRange = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    SourceReviewerId = table.Column<long>(type: "bigint", nullable: true),
                    SourceSheet = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    TranscribedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dependency", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dependency_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Endpoint_DestinationEndpointId",
                        column: x => x.DestinationEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Endpoint_SourceEndpointId",
                        column: x => x.SourceEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_SourceReviewerId",
                        column: x => x.SourceReviewerId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Dependency_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EndpointAddress",
                schema: "network",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Address = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    EndpointId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    NatTarget = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    NetworkContextId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EndpointAddress", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EndpointAddress_Endpoint_EndpointId",
                        column: x => x.EndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EndpointAddress_NetworkContext_NetworkContextId",
                        column: x => x.NetworkContextId,
                        principalSchema: "network",
                        principalTable: "NetworkContext",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "EndpointGroupMember",
                schema: "network",
                columns: table => new
                {
                    GroupEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    MemberEndpointId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EndpointGroupMember", x => new { x.GroupEndpointId, x.MemberEndpointId });
                    table.ForeignKey(
                        name: "FK_EndpointGroupMember_Endpoint_GroupEndpointId",
                        column: x => x.GroupEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EndpointGroupMember_Endpoint_MemberEndpointId",
                        column: x => x.MemberEndpointId,
                        principalSchema: "network",
                        principalTable: "Endpoint",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "CaseDependency",
                schema: "work",
                columns: table => new
                {
                    CaseId = table.Column<long>(type: "bigint", nullable: false),
                    DependencyId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaseDependency", x => new { x.CaseId, x.DependencyId });
                    table.ForeignKey(
                        name: "FK_CaseDependency_Case_CaseId",
                        column: x => x.CaseId,
                        principalSchema: "work",
                        principalTable: "Case",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CaseDependency_Dependency_DependencyId",
                        column: x => x.DependencyId,
                        principalSchema: "network",
                        principalTable: "Dependency",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "DependencyComponent",
                schema: "network",
                columns: table => new
                {
                    DependencyId = table.Column<long>(type: "bigint", nullable: false),
                    ComponentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DependencyComponent", x => new { x.DependencyId, x.ComponentId });
                    table.ForeignKey(
                        name: "FK_DependencyComponent_Component_ComponentId",
                        column: x => x.ComponentId,
                        principalSchema: "inventory",
                        principalTable: "Component",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DependencyComponent_Dependency_DependencyId",
                        column: x => x.DependencyId,
                        principalSchema: "network",
                        principalTable: "Dependency",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Volume_SourceReviewerId",
                schema: "inventory",
                table: "Volume",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Installation_SourceReviewerId",
                schema: "catalogue",
                table: "Installation",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Asset_SourceReviewerId",
                schema: "inventory",
                table: "Asset",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_CaseDependency_DependencyId",
                schema: "work",
                table: "CaseDependency",
                column: "DependencyId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_ArchivedById",
                schema: "network",
                table: "Dependency",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_ClientId",
                schema: "network",
                table: "Dependency",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_CoordinatorUserId",
                schema: "network",
                table: "Dependency",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_CreatedById",
                schema: "network",
                table: "Dependency",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_DestinationEndpointId",
                schema: "network",
                table: "Dependency",
                column: "DestinationEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_EnvironmentId",
                schema: "network",
                table: "Dependency",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_OwnerUserId",
                schema: "network",
                table: "Dependency",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_SourceEndpointId",
                schema: "network",
                table: "Dependency",
                column: "SourceEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_SourceReviewerId",
                schema: "network",
                table: "Dependency",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Dependency_UpdatedById",
                schema: "network",
                table: "Dependency",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_DependencyComponent_ComponentId",
                schema: "network",
                table: "DependencyComponent",
                column: "ComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ArchivedById",
                schema: "network",
                table: "Endpoint",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_AssetId",
                schema: "network",
                table: "Endpoint",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ClientId_NetworkContextId_Name",
                schema: "network",
                table: "Endpoint",
                columns: new[] { "ClientId", "NetworkContextId", "Name" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_ComponentId",
                schema: "network",
                table: "Endpoint",
                column: "ComponentId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_CreatedById",
                schema: "network",
                table: "Endpoint",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_EnvironmentId",
                schema: "network",
                table: "Endpoint",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_NetworkContextId",
                schema: "network",
                table: "Endpoint",
                column: "NetworkContextId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_SourceReviewerId",
                schema: "network",
                table: "Endpoint",
                column: "SourceReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Endpoint_UpdatedById",
                schema: "network",
                table: "Endpoint",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_EndpointAddress_EndpointId",
                schema: "network",
                table: "EndpointAddress",
                column: "EndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_EndpointAddress_NetworkContextId_Address",
                schema: "network",
                table: "EndpointAddress",
                columns: new[] { "NetworkContextId", "Address" });

            migrationBuilder.CreateIndex(
                name: "IX_EndpointGroupMember_MemberEndpointId",
                schema: "network",
                table: "EndpointGroupMember",
                column: "MemberEndpointId");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_ArchivedById",
                schema: "network",
                table: "NetworkContext",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_ClientId_Name",
                schema: "network",
                table: "NetworkContext",
                columns: new[] { "ClientId", "Name" },
                unique: true,
                filter: "[ArchivedAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_CreatedById",
                schema: "network",
                table: "NetworkContext",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NetworkContext_UpdatedById",
                schema: "network",
                table: "NetworkContext",
                column: "UpdatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Asset_User_SourceReviewerId",
                schema: "inventory",
                table: "Asset",
                column: "SourceReviewerId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Installation_User_SourceReviewerId",
                schema: "catalogue",
                table: "Installation",
                column: "SourceReviewerId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Volume_User_SourceReviewerId",
                schema: "inventory",
                table: "Volume",
                column: "SourceReviewerId",
                principalSchema: "iam",
                principalTable: "User",
                principalColumn: "Id");
        }
    }
}
