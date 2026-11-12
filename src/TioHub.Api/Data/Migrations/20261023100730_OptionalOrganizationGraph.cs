using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class OptionalOrganizationGraph : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Organization",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OrganizationType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organization", x => x.Id);
                    table.CheckConstraint("CK_Organization_Identity", "[ClientId] IS NOT NULL OR (LEN(LTRIM(RTRIM([Name]))) > 0 AND [Name] IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_Organization_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Organization_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Organization_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "OrganizationRelationship",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectScope = table.Column<long>(type: "bigint", nullable: false, computedColumnSql: "ISNULL([ProjectId], CONVERT(bigint, 0))", stored: true),
                    ParentOrganizationId = table.Column<long>(type: "bigint", nullable: false),
                    ChildOrganizationId = table.Column<long>(type: "bigint", nullable: false),
                    RelationshipType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationRelationship", x => x.Id);
                    table.CheckConstraint("CK_OrganizationRelationship_Dates", "[StartDate] IS NULL OR [EndDate] IS NULL OR [EndDate] >= [StartDate]");
                    table.CheckConstraint("CK_OrganizationRelationship_NotSelf", "[ParentOrganizationId] <> [ChildOrganizationId]");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_Organization_ChildOrganizationId",
                        column: x => x.ChildOrganizationId,
                        principalSchema: "clients",
                        principalTable: "Organization",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_Organization_ParentOrganizationId",
                        column: x => x.ParentOrganizationId,
                        principalSchema: "clients",
                        principalTable: "Organization",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_OrganizationRelationship_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Organization_ClientId",
                schema: "clients",
                table: "Organization",
                column: "ClientId",
                unique: true,
                filter: "[ClientId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Organization_Code",
                schema: "clients",
                table: "Organization",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Organization_CreatedById",
                schema: "clients",
                table: "Organization",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Organization_UpdatedById",
                schema: "clients",
                table: "Organization",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_ChildOrganizationId",
                schema: "clients",
                table: "OrganizationRelationship",
                column: "ChildOrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_ClientId_ProjectId_ChildOrganizationId",
                schema: "clients",
                table: "OrganizationRelationship",
                columns: new[] { "ClientId", "ProjectId", "ChildOrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_ClientId_ProjectScope_ParentOrganizationId_ChildOrganizationId",
                schema: "clients",
                table: "OrganizationRelationship",
                columns: new[] { "ClientId", "ProjectScope", "ParentOrganizationId", "ChildOrganizationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_CreatedById",
                schema: "clients",
                table: "OrganizationRelationship",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_ParentOrganizationId",
                schema: "clients",
                table: "OrganizationRelationship",
                column: "ParentOrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_ProjectId",
                schema: "clients",
                table: "OrganizationRelationship",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationRelationship_UpdatedById",
                schema: "clients",
                table: "OrganizationRelationship",
                column: "UpdatedById");

            // Add one identity per existing client, including archived clients; no placeholder edges.
            migrationBuilder.Sql("""
                INSERT INTO [clients].[Organization] ([ClientId], [CreatedAt], [UpdatedAt])
                SELECT [Id], [CreatedAt], [UpdatedAt] FROM [clients].[Client];
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationRelationship",
                schema: "clients");

            migrationBuilder.DropTable(
                name: "Organization",
                schema: "clients");
        }
    }
}
