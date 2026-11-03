using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Data;

#nullable disable

namespace TioHub.Api.Data.Migrations;

[DbContext(typeof(HubDbContext))]
[Migration("20261102140000_ExportAccessFingerprint")]
public sealed class ExportAccessFingerprint : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.AddColumn<string>(
        name: "AccessFingerprint", schema: "reporting", table: "ExportJob", type: "nvarchar(64)", maxLength: 64, nullable: true);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropColumn(
        name: "AccessFingerprint", schema: "reporting", table: "ExportJob");
}
