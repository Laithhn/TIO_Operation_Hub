using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Contracts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "contracts");

            migrationBuilder.CreateSequence<int>(
                name: "ContractNumbers",
                schema: "contracts",
                startValue: 1001L);

            migrationBuilder.CreateTable(
                name: "Contract",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ref = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValueSql: "CONCAT('CT-', NEXT VALUE FOR [contracts].[ContractNumbers])"),
                    ClientId = table.Column<long>(type: "bigint", nullable: false),
                    ProjectId = table.Column<long>(type: "bigint", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContractReference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    OwnerUserId = table.Column<long>(type: "bigint", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: true),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    RenewalTerms = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    NoticeDays = table.Column<int>(type: "int", nullable: true),
                    SupportModel = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    SupportHours = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SupportTimeZone = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    OnSiteEngineersRequired = table.Column<int>(type: "int", nullable: true),
                    Coverage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Obligations = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    LastReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ArchivedById = table.Column<long>(type: "bigint", nullable: true),
                    ArchiveReason = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedById = table.Column<long>(type: "bigint", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedById = table.Column<long>(type: "bigint", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contract", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contract_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contract_Project_ProjectId",
                        column: x => x.ProjectId,
                        principalSchema: "clients",
                        principalTable: "Project",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contract_User_ArchivedById",
                        column: x => x.ArchivedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contract_User_CreatedById",
                        column: x => x.CreatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contract_User_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Contract_User_UpdatedById",
                        column: x => x.UpdatedById,
                        principalSchema: "iam",
                        principalTable: "User",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ContractEnvironment",
                schema: "contracts",
                columns: table => new
                {
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    EnvironmentId = table.Column<long>(type: "bigint", nullable: false),
                    ClientId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractEnvironment", x => new { x.ContractId, x.EnvironmentId });
                    table.ForeignKey(
                        name: "FK_ContractEnvironment_Client_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "clients",
                        principalTable: "Client",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContractEnvironment_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContractEnvironment_Environment_EnvironmentId",
                        column: x => x.EnvironmentId,
                        principalSchema: "env",
                        principalTable: "Environment",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ContractProduct",
                schema: "contracts",
                columns: table => new
                {
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    ProductId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContractProduct", x => new { x.ContractId, x.ProductId });
                    table.ForeignKey(
                        name: "FK_ContractProduct_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ContractProduct_Product_ProductId",
                        column: x => x.ProductId,
                        principalSchema: "catalogue",
                        principalTable: "Product",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SlaTarget",
                schema: "contracts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractId = table.Column<long>(type: "bigint", nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResponseMinutes = table.Column<int>(type: "int", nullable: true),
                    ResolutionMinutes = table.Column<int>(type: "int", nullable: true),
                    Basis = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SlaTarget", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SlaTarget_Contract_ContractId",
                        column: x => x.ContractId,
                        principalSchema: "contracts",
                        principalTable: "Contract",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Contract_ArchivedById",
                schema: "contracts",
                table: "Contract",
                column: "ArchivedById");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_ClientId",
                schema: "contracts",
                table: "Contract",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_CreatedById",
                schema: "contracts",
                table: "Contract",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_OwnerUserId",
                schema: "contracts",
                table: "Contract",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_ProjectId",
                schema: "contracts",
                table: "Contract",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Contract_Ref",
                schema: "contracts",
                table: "Contract",
                column: "Ref",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contract_Status_EndDate",
                schema: "contracts",
                table: "Contract",
                columns: new[] { "Status", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Contract_UpdatedById",
                schema: "contracts",
                table: "Contract",
                column: "UpdatedById");

            migrationBuilder.CreateIndex(
                name: "IX_ContractEnvironment_ClientId",
                schema: "contracts",
                table: "ContractEnvironment",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractEnvironment_EnvironmentId",
                schema: "contracts",
                table: "ContractEnvironment",
                column: "EnvironmentId");

            migrationBuilder.CreateIndex(
                name: "IX_ContractProduct_ProductId",
                schema: "contracts",
                table: "ContractProduct",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_SlaTarget_ContractId_Priority",
                schema: "contracts",
                table: "SlaTarget",
                columns: new[] { "ContractId", "Priority" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContractEnvironment",
                schema: "contracts");

            migrationBuilder.DropTable(
                name: "ContractProduct",
                schema: "contracts");

            migrationBuilder.DropTable(
                name: "SlaTarget",
                schema: "contracts");

            migrationBuilder.DropTable(
                name: "Contract",
                schema: "contracts");

            migrationBuilder.DropSequence(
                name: "ContractNumbers",
                schema: "contracts");
        }
    }
}
