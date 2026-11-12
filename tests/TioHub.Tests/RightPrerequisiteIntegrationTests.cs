using System.Net;
using System.Text.Json.Nodes;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Requires approved isolated SQL fixtures; these tests deliberately submit raw grants without compatibility expansion.</summary>
[Collection("hub")]
public sealed class RightPrerequisiteIntegrationTests(HubFactory hub) : Scenario(hub)
{
    private async Task<long> CreateRole(Api admin, string[] keys) =>
        await admin.Create("/admin/roles", new { name = U("Prerequisite"), rights = keys });

    private async Task<Api> CreateUser(Api admin, params long[] roles)
    {
        var accountName = $@"DEV\{U("hierarchy-user")}";
        await admin.Create("/admin/users", new { accountName, displayName = "Hierarchy test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds = roles });
        return await Hub.As(accountName);
    }

    private static async Task<Res> Save(Api actor, long id, string[] keys)
    {
        var role = (await actor.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == id)!;
        return await actor.Put($"/admin/roles/{id}", new
        {
            name = role["name"]!.GetValue<string>(), rights = keys
        }, role["version"]!.GetValue<string>());
    }

    private static readonly string[] Delegate = [RightKeys.Administration, "AdminRoles:View", "AdminRoles:Maintain", "Cases:View"];

    [Fact]
    public async Task Removing_a_prerequisite_keeps_the_stored_right_but_blocks_it_on_the_next_request()
    {
        var admin = await Hub.As(HubFactory.Manager);
        string[] keys = ["Cases:View", "Cases:Maintain"];
        var id = await CreateRole(admin, keys);
        var reader = await CreateUser(admin, id);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Post("/cases", new { })).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, id, ["Cases:Maintain"])).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        var stored = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == id)!;
        Assert.Contains(stored["rights"]!.AsArray(), k => k!.GetValue<string>() == "Cases:Maintain");
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, id, keys)).Status);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
    }

    [Fact]
    public async Task A_second_role_can_supply_a_prerequisite_without_granting_anything_else()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var child = await CreateRole(admin, ["Cases:Maintain"]);
        var parent = await CreateRole(admin, ["Cases:View"]);
        var reader = await CreateUser(admin, child, parent);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        Assert.Contains("Cases:Maintain", (await reader.Get("/me")).Body!["rights"]!.AsArray().Select(k => k!.GetValue<string>()));
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/commitments")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, parent, [])).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        Assert.DoesNotContain("Cases:Maintain", (await reader.Get("/me")).Body?["rights"]?.AsArray().Select(k => k!.GetValue<string>()) ?? []);
    }

    [Fact]
    public async Task Removing_a_tab_right_blocks_direct_API_even_when_the_record_actions_are_assigned()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var keys = Fixture.Rights(["ClientStructure:View", "ClientStructure:Coordinate", "tab.ClientStructure.organizations:View", "tab.ClientStructure.organizations:Create"]);
        var role = await CreateRole(admin, keys);
        var actor = await CreateUser(admin, role);
        Assert.Equal(HttpStatusCode.OK, (await actor.Get($"/clients/{client}/overview?tab=organizations")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, role, keys.Where(k => k != "tab.ClientStructure.organizations:View").ToArray())).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await actor.Get($"/clients/{client}/overview?tab=organizations")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await actor.Post($"/clients/{client}/organization-relationships", new { })).Status);
    }

    [Fact]
    public async Task Administrator_cannot_activate_stored_delete_authority_by_granting_its_prerequisite()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var limited = await CreateUser(admin, await CreateRole(admin, Delegate));
        var target = await CreateRole(admin, ["Cases:Delete"]);
        var result = await Save(limited, target, ["Cases:Delete", "Cases:View"]);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Contains("Cases:Delete", result.Text);
    }

    [Fact]
    public async Task Expanding_an_assigned_role_requires_full_authority_but_non_increasing_edits_remain_available()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var limited = await CreateUser(admin, await CreateRole(admin, Delegate));
        var target = await CreateRole(admin, []);
        await CreateUser(admin, target);

        Assert.Equal(HttpStatusCode.NoContent, (await Save(limited, target, [])).Status);
        var rejected = await Save(limited, target, ["Cases:View"]);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
        Assert.Contains("recipients may hold other roles", rejected.Text);
        Assert.Equal(HttpStatusCode.NoContent, (await Save(admin, target, ["Cases:View"])).Status);
    }

    [Fact]
    public async Task Expanding_a_directory_mapped_role_requires_full_authority_even_when_no_member_is_recorded()
    {
        var admin = await Hub.As(HubFactory.Manager);
        var engineer = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray()
            .Single(role => role!["key"]?.GetValue<string>() == BuiltInRoles.EngineerKey)!;
        var engineerKeys = engineer["rights"]!.AsArray().Select(key => key!.GetValue<string>()).ToArray();
        var limited = await CreateUser(admin, await CreateRole(admin, Fixture.Rights(engineerKeys, Flag.Administer)));
        Assert.DoesNotContain("AdminUsers:View", engineerKeys);
        await admin.Create("/admin/group-mappings", new { groupName = $@"DEV\{U("unseen-group")}", role = "Engineer" });

        var result = await Save(limited, Id(engineer), engineerKeys.Append("AdminUsers:View").ToArray());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Contains("recipients may hold other roles", result.Text);
    }
}
