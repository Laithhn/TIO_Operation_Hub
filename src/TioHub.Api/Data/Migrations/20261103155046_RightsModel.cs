using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RightsModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Nothing is dropped. The retired tables and columns stay for application rollback and review; no code reads them.
            // They must stop blocking deletes and inserts: their foreign keys to live records go, and the retired NOT NULL columns get a default.
            migrationBuilder.Sql("""
                DECLARE @drop nvarchar(max) = N'';
                SELECT @drop += N'ALTER TABLE [iam].[UserPermissionOverride] DROP CONSTRAINT ' + QUOTENAME(name) + N';'
                FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'[iam].[UserPermissionOverride]');
                EXEC sp_executesql @drop;
                IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_AppRole_Rights_Retired')
                    ALTER TABLE [iam].[AppRole] ADD CONSTRAINT [DF_AppRole_Rights_Retired] DEFAULT 0 FOR [Rights];
                IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_User_Grants_Retired')
                    ALTER TABLE [iam].[User] ADD CONSTRAINT [DF_User_Grants_Retired] DEFAULT 0 FOR [Grants];
                IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_GroupMapping_Grants_Retired')
                    ALTER TABLE [iam].[GroupMapping] ADD CONSTRAINT [DF_GroupMapping_Grants_Retired] DEFAULT 0 FOR [Grants];
                """);

            migrationBuilder.CreateTable(
                name: "GroupMappingRole",
                schema: "iam",
                columns: table => new
                {
                    GroupMappingId = table.Column<long>(type: "bigint", nullable: false),
                    AppRoleId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMappingRole", x => new { x.GroupMappingId, x.AppRoleId });
                    table.ForeignKey(
                        name: "FK_GroupMappingRole_AppRole_AppRoleId",
                        column: x => x.AppRoleId,
                        principalSchema: "iam",
                        principalTable: "AppRole",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_GroupMappingRole_GroupMapping_GroupMappingId",
                        column: x => x.GroupMappingId,
                        principalSchema: "iam",
                        principalTable: "GroupMapping",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RightDefinition",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Module = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Feature = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RiskLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RightDefinition", x => x.Id);
                    table.UniqueConstraint("AK_RightDefinition_Key", x => x.Key);
                    table.CheckConstraint("CK_RightDefinition_Kind", "[Kind] IN ('Access','Action')");
                    table.ForeignKey(
                        name: "FK_RightDefinition_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RightDefinition_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RoleRight",
                schema: "iam",
                columns: table => new
                {
                    AppRoleId = table.Column<long>(type: "bigint", nullable: false),
                    RightKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoleRight", x => new { x.AppRoleId, x.RightKey });
                    table.ForeignKey(
                        name: "FK_RoleRight_AppRole_AppRoleId",
                        column: x => x.AppRoleId,
                        principalSchema: "iam",
                        principalTable: "AppRole",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RoleRight_RightDefinition_RightKey",
                        column: x => x.RightKey,
                        principalSchema: "iam",
                        principalTable: "RightDefinition",
                        principalColumn: "Key");
                });

            migrationBuilder.CreateTable(
                name: "UserRightException",
                schema: "iam",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    RightKey = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Effect = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    TeamId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRightException", x => x.Id);
                    table.CheckConstraint("CK_UserRightException_Effect", "[Effect] IN ('Allow','Deny')");
                    table.CheckConstraint("CK_UserRightException_SingleScope", "(CASE WHEN [ClientId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProjectId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [TeamId] IS NULL THEN 0 ELSE 1 END) <= 1");
                    table.ForeignKey(
                        name: "FK_UserRightException_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserRightException_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserRightException_RightDefinition_RightKey",
                        column: x => x.RightKey,
                        principalSchema: "iam",
                        principalTable: "RightDefinition",
                        principalColumn: "Key");
                    table.ForeignKey(
                        name: "FK_UserRightException_Team_TeamId",
                        column: x => x.TeamId,
                        principalSchema: "teams",
                        principalTable: "Team",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_UserRightException_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_GroupMappingRole_AppRoleId",
                schema: "iam",
                table: "GroupMappingRole",
                column: "AppRoleId");

            migrationBuilder.CreateIndex(
                name: "IX_RightDefinition_CreatedById",
                schema: "iam",
                table: "RightDefinition",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_RightDefinition_Key",
                schema: "iam",
                table: "RightDefinition",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RightDefinition_Module_Feature",
                schema: "iam",
                table: "RightDefinition",
                columns: new[] { "Module", "Feature" });

            migrationBuilder.CreateIndex(
                name: "IX_RightDefinition_UpdatedById",
                schema: "iam",
                table: "RightDefinition",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_RoleRight_RightKey",
                schema: "iam",
                table: "RoleRight",
                column: "RightKey");

            migrationBuilder.CreateIndex(
                name: "IX_UserRightException_ClientId",
                schema: "iam",
                table: "UserRightException",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRightException_ExpiresAt",
                schema: "iam",
                table: "UserRightException",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserRightException_ProjectId",
                schema: "iam",
                table: "UserRightException",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRightException_RightKey",
                schema: "iam",
                table: "UserRightException",
                column: "RightKey");

            migrationBuilder.CreateIndex(
                name: "IX_UserRightException_TeamId",
                schema: "iam",
                table: "UserRightException",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "UX_UserRightException_Client",
                schema: "iam",
                table: "UserRightException",
                columns: new[] { "UserId", "RightKey", "ClientId" },
                unique: true,
                filter: "[ClientId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserRightException_Global",
                schema: "iam",
                table: "UserRightException",
                columns: new[] { "UserId", "RightKey" },
                unique: true,
                filter: "[ClientId] IS NULL AND [ProjectId] IS NULL AND [TeamId] IS NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserRightException_Project",
                schema: "iam",
                table: "UserRightException",
                columns: new[] { "UserId", "RightKey", "ProjectId" },
                unique: true,
                filter: "[ProjectId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_UserRightException_Team",
                schema: "iam",
                table: "UserRightException",
                columns: new[] { "UserId", "RightKey", "TeamId" },
                unique: true,
                filter: "[TeamId] IS NOT NULL");

            // One batch in the idempotent script, so the tables above must be reached through EXEC.
            migrationBuilder.Sql("EXEC(N'" + RightsModelSql.Convert.Replace("'", "''") + "');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restores the 2.47 schema. Changes made under the rights model are lost here: the retired tables hold the state at upgrade time.
            migrationBuilder.DropTable(name: "GroupMappingRole", schema: "iam");
            migrationBuilder.DropTable(name: "RoleRight", schema: "iam");
            migrationBuilder.DropTable(name: "UserRightException", schema: "iam");
            migrationBuilder.DropTable(name: "RightDefinition", schema: "iam");
            migrationBuilder.Sql("""
                ALTER TABLE [iam].[AppRole] DROP CONSTRAINT [DF_AppRole_Rights_Retired];
                ALTER TABLE [iam].[User] DROP CONSTRAINT [DF_User_Grants_Retired];
                ALTER TABLE [iam].[GroupMapping] DROP CONSTRAINT [DF_GroupMapping_Grants_Retired];
                DELETE o FROM [iam].[UserPermissionOverride] o WHERE NOT EXISTS (SELECT 1 FROM [iam].[User] u WHERE u.Id = o.UserId);
                ALTER TABLE [iam].[UserPermissionOverride] WITH NOCHECK ADD CONSTRAINT [FK_UserPermissionOverride_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id]);
                ALTER TABLE [iam].[UserPermissionOverride] WITH NOCHECK ADD CONSTRAINT [FK_UserPermissionOverride_PermissionDefinition_PermissionKey] FOREIGN KEY ([PermissionKey]) REFERENCES [iam].[PermissionDefinition] ([Key]);
                ALTER TABLE [iam].[UserPermissionOverride] WITH NOCHECK ADD CONSTRAINT [FK_UserPermissionOverride_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]);
                ALTER TABLE [iam].[UserPermissionOverride] WITH NOCHECK ADD CONSTRAINT [FK_UserPermissionOverride_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]);
                ALTER TABLE [iam].[UserPermissionOverride] WITH NOCHECK ADD CONSTRAINT [FK_UserPermissionOverride_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]);
                """);
        }
    }
}
