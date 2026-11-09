using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Reporting;
using TioHub.Api.Modules.Attachments;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Shared;
using System.Text.Json;
using System.Text.Json.Nodes;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Scope and deployment checks without a database connection.</summary>
public sealed class DataScopeTests
{
    private static UserContext Limited(bool active = true)
    {
        var context = new UserContext();
        context.Set(new ResolvedUser(42, "scope-test", "Scope test", "UTC", active, ["Operator"],
            Fixture.Rights(["Cases:View"]), false, [10], [20], [30], [40], false, [50]));
        return context;
    }

    [Fact]
    public void Explicit_scope_is_a_mandatory_boundary_for_active_users()
    {
        var context = Limited();
        Assert.True(context.HasClient(10));
        Assert.False(context.HasClient(30));
        Assert.True(context.SeesClient(30));
        Assert.True(context.SeesEnvironment(30, 40));
        Assert.False(context.SeesEnvironment(30, 41));
        Assert.True(context.SeesInternal(50));
        Assert.False(context.SeesInternal(51));
        Assert.False(context.SeesScope(11, 50));
        Assert.False(context.AllClients);
        Assert.False(context.AllInternal);
    }

    [Fact]
    public void Inactive_users_lose_scope_even_when_their_snapshot_contains_grants()
    {
        var context = Limited(active: false);
        Assert.False(context.HasClient(10));
        Assert.False(context.SeesInternal(50));
    }

    [Fact]
    public void Project_and_environment_changes_invalidate_derived_scope_snapshots()
    {
        Assert.True(HubDbContext.AffectsAuthorizationSnapshot(typeof(Project)));
        Assert.True(HubDbContext.AffectsAuthorizationSnapshot(typeof(ClientEnvironment)));
        Assert.True(HubDbContext.AffectsAuthorizationSnapshot(typeof(UserScope)));
        Assert.False(HubDbContext.AffectsAuthorizationSnapshot(typeof(Client)));
    }

    [Fact]
    public void Handover_query_requires_visibility_of_every_included_record()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, Limited(), TimeProvider.System);
        var sql = db.Handovers.ToQueryString();
        Assert.Contains("HandoverItem", sql);
        Assert.Contains("NOT EXISTS", sql);
        Assert.Contains("ClientId", sql);
    }

    [Fact]
    public void Case_query_requires_all_linked_records_to_be_inside_project_scope()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, Limited(), TimeProvider.System);
        var sql = db.Cases.ToQueryString();
        Assert.Contains("WHERE", sql);
        Assert.Contains("NOT EXISTS", sql);
        Assert.Contains("CaseEnvironment", sql);
        Assert.Contains("CaseAsset", sql);
        Assert.Contains("CaseComponent", sql);
        Assert.Contains("Contract", sql);
    }

    [Fact]
    public void Region_queries_require_full_client_scope_not_project_summary_scope()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, Limited(), TimeProvider.System);
        var sql = db.Regions.ToQueryString();
        Assert.Contains("ClientId", sql);
        Assert.DoesNotContain("ProjectClientIds", sql);
    }

    [Fact]
    public void Visible_lookup_usage_keeps_data_scope_but_global_delete_check_can_inspect_all_records()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, Limited(), TimeProvider.System);
        var scoped = LookupUsage.Records(db.Cases, scoped: true).ToQueryString();
        var all = LookupUsage.Records(db.Cases, scoped: false).ToQueryString();
        Assert.Contains("WHERE", scoped);
        Assert.DoesNotContain("WHERE", all);
    }

    [Fact]
    public void Upgrade_script_preserves_previous_scopes_and_retains_recovery_snapshot()
    {
        using var db = new DesignTimeFactory().CreateDbContext([]);
        var script = db.GetService<IMigrator>().GenerateScript("20261102110000_HierarchicalPermissions", "20261102120000_PreserveLegacyEffectiveScopes", MigrationsSqlGenerationOptions.Idempotent);
        Assert.Contains("LegacyScopeUpgrade", script);
        Assert.Contains("[iam].[UserRole]", script);
        Assert.Contains("[iam].[GroupMapping]", script);
        Assert.Contains("m.[Role] IN (N''Manager'', N''Engineer'')", script);
        Assert.DoesNotContain("m.[Role] = 1", script);
        Assert.Contains("PreserveLegacyScope", script);
        Assert.Contains("EXEC(N'", script);
        Assert.Contains("INSERT [iam].[LegacyScopeUpgrade]", script);
        Assert.True(script.IndexOf("CREATE TABLE [iam].[LegacyScopeUpgrade]", StringComparison.Ordinal) < script.IndexOf("EXEC(N'", StringComparison.Ordinal));
        Assert.DoesNotContain("DROP TABLE", script);
    }

    [Fact]
    public void Export_fingerprint_requires_the_same_current_access_and_rejects_legacy_files()
    {
        var original = Limited();
        var snapshot = ExportAccessFingerprint.For(original);
        Assert.True(ExportAccessFingerprint.IsCurrent(snapshot, Limited()));
        Assert.False(ExportAccessFingerprint.IsCurrent(null, original));
        var changed = Limited();
        changed.ClientIds.Clear();
        Assert.False(ExportAccessFingerprint.IsCurrent(snapshot, changed));
        Assert.False(ExportAccessFingerprint.IsCurrent(snapshot, Limited(active: false)));
    }

    [Fact]
    public void Export_fingerprint_does_not_depend_on_scope_list_order()
    {
        var first = Limited();
        first.ClientIds.Add(11);
        var second = Limited();
        second.ClientIds.Insert(0, 11);
        Assert.Equal(ExportAccessFingerprint.For(first), ExportAccessFingerprint.For(second));
    }

    [Fact]
    public void Project_scope_client_summary_omits_client_wide_ownership_and_organization_details()
    {
        var person = new User { Id = 7, DisplayName = "Client owner", IsActive = true };
        var client = new Client { Id = 30, Code = "C", Name = "Client", ParentOrganization = "Private organization",
            Partner = "Private partner", Owner = person, ResponsibleOrganization = "Private team", ResponsibleTeamId = 9,
            Team = [new ClientTeamMember { User = person, UserId = 7, Role = "Owner" }] };
        var freshness = new Freshness(FreshnessState.Current, null, null, "test");
        var summary = JsonSerializer.SerializeToNode(ClientEndpoints.ClientDto(client, freshness, [], false,
            new[] { "private child" }, canViewTeam: true, canViewStructure: true))!;
        foreach (var key in new[] { "parentOrganization", "partner", "owner", "team", "responsibleOrganization", "responsibleTeamId", "freshness" })
            Assert.Null(summary[key]);
        Assert.Empty(summary["subClients"]!.AsArray());
        Assert.Equal("ProjectSummary", summary["accessLevel"]!.GetValue<string>());

        var full = JsonSerializer.SerializeToNode(ClientEndpoints.ClientDto(client, freshness, [], true,
            Array.Empty<object>(), canViewTeam: true, canViewStructure: true))!;
        Assert.Equal("Private organization", full["parentOrganization"]!.GetValue<string>());
        Assert.NotNull(full["owner"]);
        Assert.Single(full["team"]!.AsArray());
    }

    [Fact]
    public void Client_and_region_files_require_full_client_scope()
    {
        var me = Limited();
        Assert.False(AttachmentEndpoints.CanReadTarget(me, new(RecordTypes.Client, 30, 30, null, "client")));
        Assert.False(AttachmentEndpoints.CanReadTarget(me, new(RecordTypes.Region, 31, 30, null, "region")));
        Assert.True(AttachmentEndpoints.CanReadTarget(me, new(RecordTypes.Project, 20, 30, null, "project")));
        Assert.True(AttachmentEndpoints.CanReadTarget(me, new(RecordTypes.Client, 10, 10, null, "client")));
    }
}
