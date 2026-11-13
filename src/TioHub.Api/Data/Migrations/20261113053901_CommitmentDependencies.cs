using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CommitmentDependencies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Direction",
                schema: "work",
                table: "Commitment",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Ours");

            migrationBuilder.AddColumn<long>(
                name: "ExternalOrganizationId",
                schema: "work",
                table: "Commitment",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "LateCauseCommitmentId",
                schema: "work",
                table: "Commitment",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                schema: "work",
                table: "Commitment",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            // A114 (owner default, 13 Nov 2026): existing commitments take their title from the first line of the description,
            // up to 200 characters; the full description is kept. EXEC: the idempotent script compiles each migration as one batch.
            migrationBuilder.Sql("""
                EXEC(N'UPDATE [work].[Commitment] SET [Title] = LEFT(LTRIM(RTRIM(REPLACE(CASE WHEN CHARINDEX(NCHAR(10), [Description]) > 0
                        THEN LEFT([Description], CHARINDEX(NCHAR(10), [Description]) - 1) ELSE [Description] END, NCHAR(13), N''''))), 200)
                    WHERE [Title] = N'''';
                UPDATE [work].[Commitment] SET [Title] = LEFT(LTRIM(RTRIM(REPLACE(REPLACE([Description], NCHAR(13), N'' ''), NCHAR(10), N'' ''))), 200)
                    WHERE [Title] = N'''';
                UPDATE [work].[Commitment] SET [Title] = [Ref] WHERE [Title] = N'''';');
                """);

            migrationBuilder.CreateTable(
                name: "CommitmentDependency",
                schema: "work",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommitmentId = table.Column<long>(type: "bigint", nullable: false),
                    DependsOnCommitmentId = table.Column<long>(type: "bigint", nullable: false),
                    LeadTimeDays = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommitmentDependency", x => x.Id);
                    table.CheckConstraint("CK_CommitmentDependency_NotSelf", "[CommitmentId] <> [DependsOnCommitmentId]");
                    table.ForeignKey(
                        name: "FK_CommitmentDependency_Commitment_CommitmentId",
                        column: x => x.CommitmentId,
                        principalSchema: "work",
                        principalTable: "Commitment",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CommitmentDependency_Commitment_DependsOnCommitmentId",
                        column: x => x.DependsOnCommitmentId,
                        principalSchema: "work",
                        principalTable: "Commitment",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommitmentEvent_CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent",
                column: "CauseCommitmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_Direction_ExternalOrganizationId",
                schema: "work",
                table: "Commitment",
                columns: new[] { "Direction", "ExternalOrganizationId" });

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_ExternalOrganizationId",
                schema: "work",
                table: "Commitment",
                column: "ExternalOrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_Commitment_LateCauseCommitmentId",
                schema: "work",
                table: "Commitment",
                column: "LateCauseCommitmentId");

            migrationBuilder.CreateIndex(
                name: "IX_CommitmentDependency_CommitmentId_DependsOnCommitmentId",
                schema: "work",
                table: "CommitmentDependency",
                columns: new[] { "CommitmentId", "DependsOnCommitmentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CommitmentDependency_DependsOnCommitmentId",
                schema: "work",
                table: "CommitmentDependency",
                column: "DependsOnCommitmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Commitment_Commitment_LateCauseCommitmentId",
                schema: "work",
                table: "Commitment",
                column: "LateCauseCommitmentId",
                principalSchema: "work",
                principalTable: "Commitment",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Commitment_Organization_ExternalOrganizationId",
                schema: "work",
                table: "Commitment",
                column: "ExternalOrganizationId",
                principalSchema: "clients",
                principalTable: "Organization",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CommitmentEvent_Commitment_CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent",
                column: "CauseCommitmentId",
                principalSchema: "work",
                principalTable: "Commitment",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Commitment_Commitment_LateCauseCommitmentId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropForeignKey(
                name: "FK_Commitment_Organization_ExternalOrganizationId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropForeignKey(
                name: "FK_CommitmentEvent_Commitment_CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent");

            migrationBuilder.DropTable(
                name: "CommitmentDependency",
                schema: "work");

            migrationBuilder.DropIndex(
                name: "IX_CommitmentEvent_CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent");

            migrationBuilder.DropIndex(
                name: "IX_Commitment_Direction_ExternalOrganizationId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropIndex(
                name: "IX_Commitment_ExternalOrganizationId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropIndex(
                name: "IX_Commitment_LateCauseCommitmentId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropColumn(
                name: "CauseCommitmentId",
                schema: "work",
                table: "CommitmentEvent");

            migrationBuilder.DropColumn(
                name: "Direction",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropColumn(
                name: "ExternalOrganizationId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropColumn(
                name: "LateCauseCommitmentId",
                schema: "work",
                table: "Commitment");

            migrationBuilder.DropColumn(
                name: "Title",
                schema: "work",
                table: "Commitment");
        }
    }
}
