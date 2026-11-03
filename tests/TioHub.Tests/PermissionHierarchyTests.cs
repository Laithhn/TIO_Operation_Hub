using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>No SQL connection or external server: exercises the production evaluator, endpoint filter and migration SQL generator.</summary>
public sealed class PermissionHierarchyTests
{
    private static UserContext User(IEnumerable<string> assignments, bool active = true)
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(10, "test", "Test", "UTC", active, ["Custom"], Right.None, assignments.ToArray(), Grant.None,
            true, [], [], [], [], true, []));
        return me;
    }

    [Fact]
    public void Manifest_has_valid_four_level_paths_and_immutable_legacy_keys()
    {
        var definitions = ResourcePermissions.Registry;
        Assert.Equal(definitions.Length, definitions.Select(d => d.Key).Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Contains(definitions, d => d.Key == "Cases:Maintain" && d.NodeType == "Action");
        foreach (var d in definitions)
        {
            Assert.Equal($"{d.ResourceType}:{d.Action}", d.Key);
            Assert.True(d.ResourceType.Length <= 40, d.Key);
            Assert.True(d.Action.Length <= 40, d.Key);
            var parents = PermissionHierarchy.Ancestors(d.Key).Select(k => PermissionHierarchy.Find(k)!).ToArray();
            Assert.All(parents, p => Assert.NotEqual("Action", p.NodeType));
            Assert.True(d.NodeType == "Module" ? parents.Length == 0 : parents.Last().NodeType == "Module");
            Assert.InRange(parents.Length, 0, 3);
            Assert.All(CapabilityPermissions.Dependencies(d.Key), key => Assert.NotNull(PermissionHierarchy.Find(key)));
        }
    }

    [Fact]
    public void Generated_frontend_requirements_match_the_authoritative_manifest()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../src/web/src/permissionRequirements.json"));
        using var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(path));
        var keys = json.RootElement.GetProperty("keys").EnumerateArray().Select(x => x.GetString()!).ToArray();
        var rows = json.RootElement.GetProperty("requires").EnumerateArray()
            .Select(row => row.EnumerateArray().Select(x => x.GetInt32()).ToArray()).ToArray();
        Assert.Equal(ResourcePermissions.All.Order(), keys.Order());
        Assert.Equal(keys.Length, rows.Length);
        for (var i = 0; i < keys.Length; i++)
        {
            var reachable = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            void Visit(int index)
            {
                foreach (var required in rows[index])
                {
                    Assert.InRange(required, 0, keys.Length - 1);
                    if (reachable.Add(keys[required])) Visit(required);
                }
            }
            Visit(i);
            Assert.True(CapabilityPermissions.Dependencies(keys[i]).All(reachable.Contains), keys[i]);
        }
    }

    [Theory]
    [InlineData("module.clients:Access")]
    [InlineData("area.ClientStructure:Access")]
    [InlineData("tab.ClientStructure.organizations:Access")]
    public void Missing_parent_blocks_every_descendant_even_when_its_grant_is_retained(string denied)
    {
        var grants = PermissionHierarchy.UpgradeLegacy(ResourcePermissions.All, BuiltInRoles.All);
        var me = User(grants.Where(k => k != denied));
        var descendants = ResourcePermissions.Registry.Where(d => PermissionHierarchy.Ancestors(d.Key).Contains(denied));
        Assert.NotEmpty(descendants);
        Assert.All(descendants, d => Assert.False(me.HasPermission(d.Key), d.Key));
        Assert.Contains("tab.ClientStructure.organizations:View", grants);
        Assert.True(User(grants).HasPermission("tab.ClientStructure.organizations:View"));
    }

    [Fact]
    public void Parent_access_never_grants_actions_and_new_or_unknown_keys_are_denied()
    {
        var me = User(["module.cases:Access", "area.Cases:Access"]);
        Assert.True(me.HasPermission("area.Cases:Access"));
        Assert.False(me.HasPermission("Cases:View"));
        Assert.False(me.HasPermission("Cases:Create"));
        Assert.False(User(["Unknown:View"]).HasPermission("Unknown:View"));
        Assert.False(User(ResourcePermissions.All, active: false).HasPermission("Cases:View"));
    }

    [Fact]
    public void View_is_independent_of_edit_delete_and_sections_are_optional()
    {
        var me = User(PermissionHierarchy.WithAncestors(["Cases:View"]));
        Assert.True(me.HasPermission("Cases:View"));
        Assert.False(me.HasPermission("Cases:Maintain"));
        Assert.False(me.HasPermission("Cases:Delete"));
        Assert.Equal("Submodule", PermissionHierarchy.Find(PermissionHierarchy.Find("Cases:View")!.ParentKey!)!.NodeType);
        Assert.Equal("Tab", PermissionHierarchy.Find(PermissionHierarchy.Find("Cases:AttachmentsView")!.ParentKey!)!.NodeType);
    }

    [Fact]
    public void Role_union_happens_before_parent_resolution_and_inactive_parents_block_grants()
    {
        string[] roleOne = ["module.cases:Access", "Cases:View"];
        string[] roleTwo = ["area.Cases:Access"];
        Assert.False(User(roleOne).HasPermission("Cases:View"));
        Assert.True(User(roleOne.Concat(roleTwo)).HasPermission("Cases:View"));
        var active = ResourcePermissions.All.Where(k => k != "module.cases:Access").ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("Cases:View", PermissionHierarchy.Resolve(roleOne.Concat(roleTwo), active));
    }

    [Fact]
    public void Explicit_upgrade_preserves_old_assignments_and_never_maps_unrelated_actions()
    {
        string[] old = ["ClientStructure:View", "Cases:View", "Cases:Maintain", "Reporting:View"];
        var upgraded = PermissionHierarchy.UpgradeLegacy(old, Right.Export);
        Assert.All(old, key => Assert.Contains(key, upgraded));
        Assert.Contains("module.cases:Access", upgraded);
        Assert.Contains("tab.ClientStructure.organizations:View", upgraded);
        Assert.DoesNotContain("Cases:Delete", upgraded);
        Assert.DoesNotContain("AdminUsers:Create", upgraded);
        Assert.Contains("ReportBuilder:Export", upgraded);
        var readOnly = PermissionHierarchy.UpgradeLegacy(["PersonalNotes:View", "Notifications:View", "Reporting:View"], Right.None);
        Assert.DoesNotContain("PersonalNotes:Delete", readOnly);
        Assert.DoesNotContain("Notifications:Maintain", readOnly);
        Assert.DoesNotContain("ReportBuilder:Export", readOnly);
        Assert.DoesNotContain("SavedReports:Create", readOnly);
        Assert.Empty(PermissionHierarchy.UpgradeLegacy([], Right.None));
        Assert.True(User(upgraded).HasPermission("Cases:Maintain"));
    }

    [Fact]
    public void Parent_enablement_checks_retained_children_in_same_and_coassigned_roles()
    {
        string[] before = ["Cases:Delete", "Cases:View", "area.Cases:Access"];
        var after = before.Append("module.cases:Access");
        Assert.Contains("Cases:Delete", PermissionHierarchy.GrantCandidates(before, after));
        Assert.Contains("Cases:Delete", PermissionHierarchy.GrantCandidates([], ["module.cases:Access"], otherAssignments: before));
        Assert.DoesNotContain("Cases:Delete", PermissionHierarchy.GrantCandidates(before, before));
    }

    [Fact]
    public void Assigning_a_prerequisite_role_can_enable_a_retained_permission()
    {
        string[] existing = ["area.Cases:Access", "Cases:View", "Cases:Delete"];
        string[] prerequisiteRole = ["module.cases:Access"];
        var newlyEffective = PermissionHierarchy.NewlyEffective(existing, existing.Concat(prerequisiteRole));
        Assert.Contains("Cases:Delete", newlyEffective);
        Assert.Contains("Cases:View", newlyEffective);
        Assert.DoesNotContain("Cases:Delete", PermissionHierarchy.NewlyEffective(existing, existing));
        var active = ResourcePermissions.All.Where(key => key != "Cases:Delete").ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("Cases:Delete", PermissionHierarchy.NewlyEffective(existing, existing.Concat(prerequisiteRole), active));
    }

    [Theory]
    [InlineData("clients/1/overview", "GET", "organizations", "tab.ClientStructure.organizations:View")]
    [InlineData("clients/1/regions", "POST", null, "tab.ClientStructure.structure:Create")]
    [InlineData("regions/1", "DELETE", null, "tab.ClientStructure.structure:Delete")]
    [InlineData("cases/1/jira/2/remove", "POST", null, "tab.Cases.jira:Delete")]
    [InlineData("admin/roles/1", "PUT", null, "AdminRoles:Maintain")]
    [InlineData("reporting/exports/1/download", "GET", null, "ReportHistory:Download")]
    [InlineData("notes/pages/1", "PUT", null, "PersonalNotes:Maintain")]
    public void Real_endpoint_inventory_selects_section_and_operation(string path, string method, string? tab, string expected)
    {
        Assert.Contains(expected, HierarchyEndpointPermissions.Required(path, method, tab));
        Assert.NotNull(PermissionHierarchy.Find(expected));
    }

    [Fact]
    public async Task Production_filter_rejects_direct_API_before_handler_runs()
    {
        var services = new ServiceCollection().AddLogging().AddSingleton(User(ResourcePermissions.All.Where(k => k != "module.clients:Access"))).BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Path = "/api/v1/clients/1/regions";
        http.Request.Method = "POST";
        var invoked = false;
        var filter = new CapabilityPermissionFilter();
        await Assert.ThrowsAsync<ForbiddenException>(async () => await filter.InvokeAsync(new DefaultEndpointFilterInvocationContext(http), context =>
        {
            invoked = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        }));
        Assert.False(invoked);
    }

    [Fact]
    public void Migration_and_model_are_in_sync_and_sql_can_be_generated_without_connecting()
    {
        using var db = new DesignTimeFactory().CreateDbContext([]);
        Assert.False(db.Database.HasPendingModelChanges());
        var script = db.GetService<IMigrator>().GenerateScript("20261102103000_ProjectPermissions", "20261102110000_HierarchicalPermissions");
        Assert.Contains("HierarchyPermissionUpgrade", script);
        Assert.Contains("FK_PermissionDefinition_PermissionDefinition_ParentKey", script);
        Assert.Contains("@prior", script);
        Assert.DoesNotContain("DELETE FROM [iam].[AppRolePermission]", script);
    }
}
