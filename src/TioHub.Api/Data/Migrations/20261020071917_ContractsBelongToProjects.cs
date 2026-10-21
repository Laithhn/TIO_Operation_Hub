using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ContractsBelongToProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A27: every contract belongs to a project. One statement batch (the idempotent script runs it inside EXEC):
            // 1) a contract without a project gets its own project (code = contract ref, name = title, dates and owner copied,
            //    archived with it when the contract is archived); 2) contract products move to the contract's project.
            migrationBuilder.Sql(@"EXEC(N'
DECLARE @map TABLE (ContractId bigint PRIMARY KEY, Code nvarchar(50) NOT NULL);
INSERT INTO @map (ContractId, Code)
SELECT c.Id, CASE WHEN EXISTS (SELECT 1 FROM [clients].[Project] p WHERE p.[Code] = c.[Ref]) THEN CONCAT(c.[Ref], N''-'', c.[Id]) ELSE c.[Ref] END
FROM [contracts].[Contract] c WHERE c.[ProjectId] IS NULL;
INSERT INTO [clients].[Project] ([ClientId], [Code], [Name], [OwnerUserId], [Status], [ScopeSummary], [ServiceStart], [ServiceEnd], [LastReviewedAt],
    [ArchivedAt], [ArchivedById], [ArchiveReason], [CreatedAt], [UpdatedAt])
SELECT c.[ClientId], m.[Code], LEFT(c.[Title], 150), c.[OwnerUserId],
    CASE WHEN c.[ArchivedAt] IS NOT NULL THEN N''Archived'' WHEN c.[Status] = N''Draft'' THEN N''Planned'' WHEN c.[Status] = N''Active'' THEN N''Active'' ELSE N''Completed'' END,
    N''Created automatically for contract '' + c.[Ref] + N'' when contracts moved under projects (release 2.8.0).'',
    c.[StartDate], c.[EndDate], c.[LastReviewedAt], c.[ArchivedAt], c.[ArchivedById], c.[ArchiveReason], SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
FROM [contracts].[Contract] c JOIN @map m ON m.[ContractId] = c.[Id];
UPDATE c SET c.[ProjectId] = p.[Id]
FROM [contracts].[Contract] c JOIN @map m ON m.[ContractId] = c.[Id] JOIN [clients].[Project] p ON p.[Code] = m.[Code];
INSERT INTO [clients].[ProjectProduct] ([ProjectId], [ProductId])
SELECT DISTINCT c.[ProjectId], cp.[ProductId]
FROM [contracts].[ContractProduct] cp JOIN [contracts].[Contract] c ON c.[Id] = cp.[ContractId]
WHERE NOT EXISTS (SELECT 1 FROM [clients].[ProjectProduct] pp WHERE pp.[ProjectId] = c.[ProjectId] AND pp.[ProductId] = cp.[ProductId]);')");

            migrationBuilder.DropTable(
                name: "ContractProduct",
                schema: "contracts");

            migrationBuilder.AlterColumn<long>(
                name: "ProjectId",
                schema: "contracts",
                table: "Contract",
                type: "bigint",
                nullable: false,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<long>(
                name: "ProjectId",
                schema: "contracts",
                table: "Contract",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

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

            migrationBuilder.CreateIndex(
                name: "IX_ContractProduct_ProductId",
                schema: "contracts",
                table: "ContractProduct",
                column: "ProductId");
        }
    }
}
