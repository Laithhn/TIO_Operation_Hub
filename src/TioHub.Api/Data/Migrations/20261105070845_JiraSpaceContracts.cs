using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class JiraSpaceContracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SlaNoCoveringContract",
                schema: "work",
                table: "Case",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ClientJiraSpaceContract",
                schema: "jira",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientJiraSpaceId = table.Column<long>(type: "bigint", nullable: false),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientJiraSpaceContract", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientJiraSpaceContract_ClientJiraSpace_ClientJiraSpaceId",
                        column: x => x.ClientJiraSpaceId,
                        principalSchema: "jira",
                        principalTable: "ClientJiraSpace",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSpaceContract_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientJiraSpaceContract_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpaceContract_ClientJiraSpaceId_ContractId",
                schema: "jira",
                table: "ClientJiraSpaceContract",
                columns: new[] { "ClientJiraSpaceId", "ContractId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpaceContract_ContractId",
                schema: "jira",
                table: "ClientJiraSpaceContract",
                column: "ContractId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpaceContract_CreatedById",
                schema: "jira",
                table: "ClientJiraSpaceContract",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ClientJiraSpaceContract_UpdatedById",
                schema: "jira",
                table: "ClientJiraSpaceContract",
                column: "UpdatedById");

            // A93: the one contract each space had becomes its first link. Tickets take their contract from their dates at the next start.
            migrationBuilder.Sql("""
                EXEC(N'INSERT INTO [jira].[ClientJiraSpaceContract] ([ClientJiraSpaceId], [ContractId], [CreatedAt], [UpdatedAt])
                SELECT s.[Id], s.[ContractId], SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM [jira].[ClientJiraSpace] s
                WHERE s.[ContractId] IS NOT NULL AND s.[ReleasedAt] IS NULL');
                """);

            migrationBuilder.DropColumn(
                name: "ContractId",
                schema: "jira",
                table: "ClientJiraSpace");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientJiraSpaceContract",
                schema: "jira");

            migrationBuilder.DropColumn(
                name: "SlaNoCoveringContract",
                schema: "work",
                table: "Case");

            migrationBuilder.AddColumn<long>(
                name: "ContractId",
                schema: "jira",
                table: "ClientJiraSpace",
                type: "bigint",
                nullable: true);
        }
    }
}
