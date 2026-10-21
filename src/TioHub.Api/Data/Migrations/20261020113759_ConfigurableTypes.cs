using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TioHub.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                schema: "admin",
                table: "LookupValue",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeCategory",
                schema: "env",
                table: "Environment",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TypeCategory",
                schema: "contracts",
                table: "Contract",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TypeCategory",
                schema: "work",
                table: "Case",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TypeCategory",
                schema: "inventory",
                table: "Asset",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            // A34: the four fixed type lists become configurable. Existing values are seeded with their category, and every record's
            // category starts equal to its type. Data steps run through EXEC (the idempotent script compiles one batch per migration).
            migrationBuilder.Sql(@"EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [Category], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT v.[ListName], v.[Code], v.[Label], v.[SortOrder], v.[Category], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''EnvironmentType'', N''Production'', N''Production'', 10, N''Production''), (N''EnvironmentType'', N''Staging'', N''Staging'', 20, N''Staging''), (N''EnvironmentType'', N''UAT'', N''UAT'', 30, N''UAT''), (N''EnvironmentType'', N''Test'', N''Test'', 40, N''Test''), (N''EnvironmentType'', N''DR'', N''Disaster recovery'', 50, N''DR''), (N''EnvironmentType'', N''Other'', N''Other'', 60, N''Other''), (N''AssetType'', N''VM'', N''Virtual machine (VM)'', 10, N''VM''), (N''AssetType'', N''Physical'', N''Physical server'', 20, N''Physical''), (N''AssetType'', N''LogicalEndpoint'', N''Logical endpoint'', 30, N''LogicalEndpoint''), (N''ContractType'', N''SlaSupport'', N''SLA & support'', 10, N''SlaSupport''), (N''ContractType'', N''Implementation'', N''Implementation'', 20, N''Implementation''), (N''ContractType'', N''Maintenance'', N''Maintenance'', 30, N''Maintenance''), (N''ContractType'', N''Subscription'', N''Subscription'', 40, N''Subscription''), (N''ContractType'', N''Other'', N''Other'', 50, N''Other''), (N''CaseType'', N''Incident'', N''Incident'', 10, N''Incident''), (N''CaseType'', N''Request'', N''Request'', 20, N''Request''), (N''CaseType'', N''ProblemFollowUp'', N''Problem follow-up'', 30, N''ProblemFollowUp''), (N''CaseType'', N''MaintenanceCoordination'', N''Maintenance coordination'', 40, N''MaintenanceCoordination''), (N''CaseType'', N''Improvement'', N''Improvement'', 50, N''Improvement''), (N''CaseType'', N''RiskFollowUp'', N''Risk follow-up'', 60, N''RiskFollowUp'')) AS v([ListName], [Code], [Label], [SortOrder], [Category]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = v.[ListName] AND l.[Code] = v.[Code]);')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [env].[Environment] SET [TypeCategory] = [Type];')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [inventory].[Asset] SET [TypeCategory] = [Type];')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [contracts].[Contract] SET [TypeCategory] = [Type];')");
            migrationBuilder.Sql(@"EXEC(N'UPDATE [work].[Case] SET [TypeCategory] = [Type];')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                schema: "admin",
                table: "LookupValue");

            migrationBuilder.DropColumn(
                name: "TypeCategory",
                schema: "env",
                table: "Environment");

            migrationBuilder.DropColumn(
                name: "TypeCategory",
                schema: "contracts",
                table: "Contract");

            migrationBuilder.DropColumn(
                name: "TypeCategory",
                schema: "work",
                table: "Case");

            migrationBuilder.DropColumn(
                name: "TypeCategory",
                schema: "inventory",
                table: "Asset");
        }
    }
}
