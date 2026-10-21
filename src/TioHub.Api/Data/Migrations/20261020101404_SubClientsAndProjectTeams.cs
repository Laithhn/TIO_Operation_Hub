using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class SubClientsAndProjectTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "ParentClientId",
                schema: "clients",
                table: "Client",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ClientTeamMember",
                schema: "clients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientTeamMember", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientTeamMember_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ClientTeamMember_User_UserId",
                        column: x => x.UserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Client_ParentClientId",
                schema: "clients",
                table: "Client",
                column: "ParentClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientTeamMember_ClientId_UserId",
                schema: "clients",
                table: "ClientTeamMember",
                columns: new[] { "ClientId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientTeamMember_UserId",
                schema: "clients",
                table: "ClientTeamMember",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Client_Client_ParentClientId",
                schema: "clients",
                table: "Client",
                column: "ParentClientId",
                principalSchema: "clients",
                principalTable: "Client",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Client_Client_ParentClientId",
                schema: "clients",
                table: "Client");

            migrationBuilder.DropTable(
                name: "ClientTeamMember",
                schema: "clients");

            migrationBuilder.DropIndex(
                name: "IX_Client_ParentClientId",
                schema: "clients",
                table: "Client");

            migrationBuilder.DropColumn(
                name: "ParentClientId",
                schema: "clients",
                table: "Client");
        }
    }
}
