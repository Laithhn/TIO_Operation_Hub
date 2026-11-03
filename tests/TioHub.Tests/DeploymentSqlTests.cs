using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Data;

namespace TioHub.Tests;

/// <summary>Deployment SQL checks that never connect to SQL Server or apply migrations.</summary>
public sealed class DeploymentSqlTests
{
    [Fact]
    public void Generated_hierarchy_upgrade_defers_compilation_of_new_column_references()
    {
        using var db = new DesignTimeFactory().CreateDbContext([]);
        var script = db.GetService<IMigrator>().GenerateScript(
            "20261102103000_ProjectPermissions", "20261102110000_HierarchicalPermissions",
            MigrationsSqlGenerationOptions.Idempotent);

        AssertDeferredHierarchyUpdate(script);
    }

    [Fact]
    public void Packaged_schema_defers_compilation_of_new_column_references()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../database/01-schema.sql"));
        AssertDeferredHierarchyUpdate(File.ReadAllText(path));
    }

    private static void AssertDeferredHierarchyUpdate(string script)
    {
        // A migration-history IF does not stop SQL Server binding columns in its batch.
        // The entire data block (including its table variables) must be one deferred batch.
        var match = Regex.Match(script,
            @"EXEC\(N'(?<body>(?:[^']|'')*)'\);?",
            RegexOptions.Singleline, TimeSpan.FromSeconds(5));
        while (match.Success && !match.Groups["body"].Value.Contains("-- Frozen manifest"))
            match = match.NextMatch();
        Assert.True(match.Success, "Hierarchy data SQL must use EXEC(N'...') after adding NodeType and DisplayOrder.");

        var body = match.Groups["body"].Value.Replace("''", "'");
        Assert.Contains("NodeType = N'Action'", body);
        Assert.Contains("DisplayOrder=d.DisplayOrder", body);
        Assert.Contains("DECLARE @definitions TABLE", body);
        Assert.Contains("DECLARE @prior TABLE", body);
        Assert.Contains("DECLARE @granted TABLE", body);
        Assert.Contains("HierarchyPermissionUpgrade", body);
        Assert.Contains("UPDATE [iam].[AuthorizationVersion]", body);
        Assert.True(script.IndexOf("ADD [NodeType]", StringComparison.Ordinal) < match.Index);
        Assert.True(script.IndexOf("ADD [DisplayOrder]", StringComparison.Ordinal) < match.Index);
    }
}
