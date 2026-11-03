using System.Net;
using System.Text.Json.Nodes;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Requires approved isolated SQL fixtures; these tests deliberately submit raw grants without compatibility expansion.</summary>
[Collection("hub")]
public sealed class HierarchicalAuthorizationIntegrationTests(HubFactory hub) : Scenario(hub)
{
    private async Task<long> CreateRole(Api admin, string[] keys, string[]? rights = null) =>
        await admin.Create("/admin/roles", new { name = U("Hierarchy"), rights = rights ?? [], permissions = keys });

    private async Task<Api> CreateUser(Api admin, params long[] roles)
    {
        var accountName = $@"DEV\{U("hierarchy-user")}";
        await admin.Create("/admin/users", new { accountName, displayName = "Hierarchy test", workingTimeZone = "UTC", roleIds = roles });
        return await Hub.As(accountName);
    }

    private static async Task<Res> Save(Api actor, long id, string[] keys)
    {
        var role = (await actor.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == id)!;
        return await actor.Put($"/admin/roles/{id}", new
        {
            name = role["name"]!.GetValue<string>(), rights = role["rights"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray(), permissions = keys
        }, role["version"]!.GetValue<string>());
    }

    [Fact]
    public async Task Parent_revocation_retains_children_but_blocks_API_on_next_request()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var keys = PermissionHierarchy.WithAncestors(["Cases:View"]);
        var id = await CreateRole(admin, keys);
        var reader = await CreateUser(admin, id);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Post("/cases", new { })).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, id, keys.Where(k => k != "module.cases:Access").ToArray())).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        var stored = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == id)!;
        Assert.Contains(stored["permissions"]!.AsArray(), k => k!.GetValue<string>() == "Cases:View");
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, id, keys)).Status);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
    }

    [Fact]
    public async Task Separate_roles_supply_explicit_parents_without_granting_sibling_actions()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var child = await CreateRole(admin, ["Cases:View"]);
        var parent = await CreateRole(admin, ["module.cases:Access", "area.Cases:Access"]);
        var reader = await CreateUser(admin, child, parent);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/commitments")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, parent, ["module.cases:Access"])).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
    }

    [Fact]
    public async Task Denied_tab_blocks_direct_API_even_when_old_resource_actions_are_assigned()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var keys = PermissionHierarchy.WithAncestors(["ClientStructure:View", "ClientStructure:Coordinate", "tab.ClientStructure.organizations:View", "tab.ClientStructure.organizations:Create"]);
        var role = await CreateRole(admin, keys);
        var actor = await CreateUser(admin, role);
        Assert.Equal(HttpStatusCode.OK, (await actor.Get($"/clients/{client}/overview?tab=organizations")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, role, keys.Where(k => k != "tab.ClientStructure.organizations:Access").ToArray())).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await actor.Get($"/clients/{client}/overview?tab=organizations")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await actor.Post($"/clients/{client}/organization-relationships", new { })).Status);
    }

    [Fact]
    public async Task Administrator_cannot_activate_retained_delete_authority_by_granting_a_parent()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var limitedKeys = PermissionHierarchy.WithAncestors(["AdminRoles:View", "AdminRoles:Maintain", "area.Cases:Access"]);
        var limitedRole = await CreateRole(admin, limitedKeys, ["Administer"]);
        var limited = await CreateUser(admin, limitedRole);
        string[] retained = ["Cases:View", "Cases:Delete", "area.Cases:Access"];
        var target = await CreateRole(admin, retained);
        var result = await Save(limited, target, retained.Append("module.cases:Access").ToArray());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Contains("Cases:Delete", result.Text);
    }

    [Fact]
    public async Task Expanding_an_assigned_role_requires_full_authority_but_non_increasing_edits_remain_available()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var limitedKeys = PermissionHierarchy.UpgradeLegacy(["module.cases:Access"], TioHub.Api.Common.Right.Administer);
        var limited = await CreateUser(admin, await CreateRole(admin, limitedKeys, ["Administer"]));
        var target = await CreateRole(admin, []);
        await CreateUser(admin, target);

        Assert.Equal(HttpStatusCode.NoContent, (await Save(limited, target, [])).Status);
        var rejected = await Save(limited, target, ["module.cases:Access"]);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
        Assert.Contains("recipients may hold other roles", rejected.Text);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, target, ["module.cases:Access"])).Status);
    }

    [Fact]
    public async Task Expanding_a_directory_mapped_role_requires_full_authority_even_when_no_member_is_recorded()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var engineer = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray()
            .Single(role => role!["key"]?.GetValue<string>() == BuiltInRoles.EngineerKey)!;
        var engineerKeys = engineer["permissions"]!.AsArray().Select(key => key!.GetValue<string>()).ToArray();
        var rights = engineer["rights"]!.AsArray().Select(right => right!.GetValue<string>()).Append("Administer").Distinct().ToArray();
        var delegatedKeys = PermissionHierarchy.UpgradeLegacy(engineerKeys, TioHub.Api.Common.Right.Administer);
        var limited = await CreateUser(admin, await CreateRole(admin, delegatedKeys, rights));
        Assert.DoesNotContain("AdminUsers:View", engineerKeys);
        await admin.Create("/admin/group-mappings", new { groupName = $@"DEV\{U("unseen-group")}", role = "Engineer" });

        var result = await Save(limited, Id(engineer), engineerKeys.Append("AdminUsers:View").ToArray());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Contains("recipients may hold other roles", result.Text);
    }
}
