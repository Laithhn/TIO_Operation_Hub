using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PersonalNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "notes");

            migrationBuilder.CreateTable(
                name: "Notebook",
                schema: "notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notebook", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notebook_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Notebook_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Notebook_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NoteSection",
                schema: "notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    NotebookId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteSection", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteSection_Notebook_NotebookId",
                        column: x => x.NotebookId,
                        principalSchema: "notes",
                        principalTable: "Notebook",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NoteSection_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NoteSection_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NoteSection_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NotePage",
                schema: "notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    SectionId = table.Column<long>(type: "bigint", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ContentHtml = table.Column<string>(type: "nvarchar(max)", maxLength: -1, nullable: false),
                    ContentText = table.Column<string>(type: "nvarchar(max)", maxLength: -1, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    IsPinned = table.Column<bool>(type: "bit", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: true),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    LinkLabel = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotePage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotePage_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NotePage_NoteSection_SectionId",
                        column: x => x.SectionId,
                        principalSchema: "notes",
                        principalTable: "NoteSection",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NotePage_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NotePage_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NotePage_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NotePage_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NoteFile",
                schema: "notes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: false),
                    PageId = table.Column<long>(type: "bigint", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    StoredPath = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Sha256 = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NoteFile", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NoteFile_NotePage_PageId",
                        column: x => x.PageId,
                        principalSchema: "notes",
                        principalTable: "NotePage",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notebook_CreatedById",
                schema: "notes",
                table: "Notebook",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Notebook_OwnerUserId_SortOrder",
                schema: "notes",
                table: "Notebook",
                columns: new[] { "OwnerUserId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Notebook_UpdatedById",
                schema: "notes",
                table: "Notebook",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NoteFile_OwnerUserId_PageId",
                schema: "notes",
                table: "NoteFile",
                columns: new[] { "OwnerUserId", "PageId" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteFile_PageId",
                schema: "notes",
                table: "NoteFile",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_ClientId",
                schema: "notes",
                table: "NotePage",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_CreatedById",
                schema: "notes",
                table: "NotePage",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_OwnerUserId_ClientId",
                schema: "notes",
                table: "NotePage",
                columns: new[] { "OwnerUserId", "ClientId" });

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_OwnerUserId_ProjectId",
                schema: "notes",
                table: "NotePage",
                columns: new[] { "OwnerUserId", "ProjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_OwnerUserId_SectionId_SortOrder",
                schema: "notes",
                table: "NotePage",
                columns: new[] { "OwnerUserId", "SectionId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_ProjectId",
                schema: "notes",
                table: "NotePage",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_SectionId",
                schema: "notes",
                table: "NotePage",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_NotePage_UpdatedById",
                schema: "notes",
                table: "NotePage",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NoteSection_CreatedById",
                schema: "notes",
                table: "NoteSection",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_NoteSection_NotebookId",
                schema: "notes",
                table: "NoteSection",
                column: "NotebookId");

            migrationBuilder.CreateIndex(
                name: "IX_NoteSection_OwnerUserId_NotebookId_SortOrder",
                schema: "notes",
                table: "NoteSection",
                columns: new[] { "OwnerUserId", "NotebookId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_NoteSection_UpdatedById",
                schema: "notes",
                table: "NoteSection",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NoteFile",
                schema: "notes");

            migrationBuilder.DropTable(
                name: "NotePage",
                schema: "notes");

            migrationBuilder.DropTable(
                name: "NoteSection",
                schema: "notes");

            migrationBuilder.DropTable(
                name: "Notebook",
                schema: "notes");
        }
    }
}
