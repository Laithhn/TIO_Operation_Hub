using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>The catalog itself: no database or server is used.</summary>
public sealed class RightsCatalogTests
{
    [Fact]
    public void Every_prerequisite_is_a_catalog_right_and_the_graph_has_no_cycle()
    {
        foreach (var right in RightsCatalog.All)
        {
            Assert.All(right.Requires, key => Assert.NotNull(RightsCatalog.Find(key)));
            Assert.DoesNotContain(right.Key, RightsCatalog.Dependencies(right.Key));
        }
        Assert.Equal(RightsCatalog.All.Length, RightsCatalog.AllKeys.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public void The_retired_container_levels_are_gone()
    {
        Assert.DoesNotContain(RightsCatalog.AllKeys, key => key.StartsWith("module.", StringComparison.Ordinal) || key.StartsWith("area.", StringComparison.Ordinal));
        Assert.DoesNotContain(RightsCatalog.AllKeys, key => key.StartsWith("tab.", StringComparison.Ordinal) && key.EndsWith(":Access", StringComparison.Ordinal));
        Assert.Null(RightsCatalog.Find("module.cases:Access"));
    }

    [Fact]
    public void Access_and_action_rights_are_told_apart()
    {
        Assert.Equal("Access", RightsCatalog.Find("AdminUsers:View")!.Kind);
        Assert.Equal("Action", RightsCatalog.Find("AdminUsers:Create")!.Kind);
        Assert.Equal("Action", RightsCatalog.Find("AdminUsers:Maintain")!.Kind);
        Assert.Equal("Action", RightsCatalog.Find("AdminUsers:Delete")!.Kind);
        Assert.Equal("Access", RightsCatalog.Find("AdminRoles:View")!.Kind);
        Assert.Equal("Action", RightsCatalog.Find("AdminRoles:Maintain")!.Kind);
    }

    [Theory]
    [InlineData("AdminUsers:View", "Platform:Administration")]
    [InlineData("AdminRoles:Maintain", "Platform:Administration")]
    [InlineData("Cases:Export", "Platform:Export")]
    [InlineData("Cases:HistoryView", "Platform:Audit")]
    [InlineData("AdminAudit:View", "Platform:Audit")]
    [InlineData("ClientStructure:View", "ClientStructure:Access")]
    [InlineData("tab.ClientStructure.contracts:View", "Contracts:View")]
    [InlineData("tab.ClientStructure.contacts:Create", "OtherOperations:Create")]
    [InlineData("Dashboard:View", "Cases:View")]
    public void A_right_needs_what_it_is_built_on(string key, string required)
    {
        Assert.Contains(required, RightsCatalog.Dependencies(key));
        Assert.DoesNotContain(key, RightsCatalog.Resolve(RightsCatalog.AllKeys.Where(k => k != required)));
    }

    [Fact]
    public void Resolving_removes_rights_with_a_missing_prerequisite_and_unknown_keys()
    {
        Assert.Empty(RightsCatalog.Resolve(["Cases:Maintain"]));
        Assert.Empty(RightsCatalog.Resolve(["module.cases:Access", "Cases:Anything", "Nothing"]));
        Assert.Equal(["Cases:Maintain", "Cases:View"], RightsCatalog.Resolve(["Cases:Maintain", "Cases:View"]));
        // Removal cascades: without View, details and attachments fail together.
        Assert.Empty(RightsCatalog.Resolve(["Cases:DetailsView", "Cases:AttachmentsView", "Cases:AttachmentsUpload"]));
    }

    [Fact]
    public void An_inactive_right_grants_nothing()
    {
        var active = RightsCatalog.AllKeys.Where(k => k != "Cases:View").ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Empty(RightsCatalog.Resolve(["Cases:View", "Cases:Maintain"], active));
    }

    [Fact]
    public void Default_operation_engineer_grants_match_what_a_fresh_2_47_role_held()
    {
        // The 2.47 list, frozen. A new role must not silently gain or lose anything because the model changed.
        string[] withheld = ["ClientStructure:Create", "ClientStructure:Coordinate", "ClientStructure:ArchiveRestore", "ClientStructure:Delete", "ClientStructure:AttachmentsDelete", "Projects:Coordinate", "Projects:ArchiveRestore", "Projects:Delete", "Projects:AttachmentsDelete", "Contracts:Coordinate", "Contracts:ArchiveRestore", "Contracts:Delete", "Contracts:AttachmentsDelete", "Environments:Coordinate", "Environments:ArchiveRestore", "Environments:Delete", "Environments:AttachmentsDelete", "Servers:Coordinate", "Servers:ArchiveRestore", "Servers:Delete", "Servers:AttachmentsDelete", "Installations:Coordinate", "Installations:ArchiveRestore", "Installations:Delete", "Installations:AttachmentsDelete", "Products:Coordinate", "Products:ArchiveRestore", "Products:Delete", "Products:AttachmentsDelete", "Cases:Coordinate", "Cases:ArchiveRestore", "Cases:Delete", "Cases:AttachmentsDelete", "Commitments:Coordinate", "Commitments:ArchiveRestore", "Commitments:Delete", "Commitments:AttachmentsDelete", "Teams:Create", "Teams:Maintain", "Teams:Coordinate", "Teams:ArchiveRestore", "Teams:Delete", "Teams:AttachmentsDelete", "OtherOperations:Coordinate", "OtherOperations:ArchiveRestore", "OtherOperations:Delete", "OtherOperations:AttachmentsDelete", "tab.ClientStructure.structure:Create", "tab.ClientStructure.structure:ArchiveRestore", "tab.ClientStructure.structure:Delete", "tab.ClientStructure.organizations:Create", "tab.ClientStructure.organizations:Delete", "tab.ClientStructure.contacts:ArchiveRestore", "tab.ClientStructure.contacts:Delete", "Handovers:Create", "Handovers:Maintain", "AdminUsers:View", "AdminUsers:Create", "AdminUsers:Maintain", "AdminUsers:Delete", "AdminRoles:View", "AdminRoles:Create", "AdminRoles:Maintain", "AdminRoles:Delete", "AdminGroups:View", "AdminGroups:Create", "AdminGroups:Maintain", "AdminConfig:View", "AdminConfig:Create", "AdminConfig:Maintain", "AdminConfig:Delete", "AdminSettings:View", "AdminSettings:Maintain", "AdminIntegrations:View", "AdminIntegrations:Create", "AdminIntegrations:Maintain", "Platform:Administration"];
        Assert.Equal(RightsCatalog.AllKeys.Except(withheld).Order(StringComparer.Ordinal), RightsCatalog.EngineerDefault.Order(StringComparer.Ordinal));
    }
}

/// <summary>Every API operation has one recorded decision that matches the real routes.</summary>
[Collection("hub")]
public sealed class EndpointRightsCoverageTests(HubFactory hub)
{
    private static string Repo([System.Runtime.CompilerServices.CallerFilePath] string file = "") => Path.GetFullPath(Path.Combine(Path.GetDirectoryName(file)!, "..", ".."));

    private async Task<(string Key, string Method, RouteEndpoint Endpoint)[]> Routes()
    {
        await hub.As(HubFactory.Manager);
        return hub.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .Where(e => e.RoutePattern.RawText?.StartsWith("/api/v1", StringComparison.OrdinalIgnoreCase) == true)
            .SelectMany(e => (e.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? []).Select(m => (EndpointRights.KeyOf(m, e.RoutePattern.RawText!), m, e)))
            .ToArray();
    }

    [Fact]
    public async Task Every_api_operation_has_a_decision_and_every_decision_has_an_operation()
    {
        var routes = await Routes();
        Assert.NotEmpty(routes);
        var keys = routes.Select(r => r.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Empty(keys.Where(k => !EndpointRights.Table.ContainsKey(k)));
        Assert.Empty(EndpointRights.Table.Keys.Where(k => !keys.Contains(k)));
    }

    [Fact]
    public async Task Public_decisions_are_exactly_the_anonymous_routes()
    {
        var routes = await Routes();
        var anonymous = routes.Where(r => r.Endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null).Select(r => r.Key).Order().ToArray();
        var declared = EndpointRights.Table.Where(p => p.Value.Decision == EndpointRights.PublicDecision).Select(p => p.Key).Order().ToArray();
        Assert.Equal(declared, anonymous);
    }

    [Fact]
    public void Every_decision_names_real_rights_and_explains_itself()
    {
        foreach (var (key, policy) in EndpointRights.Table)
        {
            Assert.All(policy.Rights.Concat(policy.HandlerRights), right => Assert.True(RightsCatalog.Find(right) is not null, $"{key} names unknown right {right}"));
            if (policy.Decision is EndpointRights.PublicDecision or EndpointRights.AuthenticatedDecision)
            {
                Assert.False(string.IsNullOrWhiteSpace(policy.Remark), $"{key} needs a reason for requiring no right");
                Assert.Empty(policy.Rights);
            }
            if (policy.Decision == EndpointRights.RightsDecision) Assert.NotEmpty(policy.Rights);
            if (policy.Decision == EndpointRights.DynamicDecision) Assert.NotEqual(DynamicPolicy.None, policy.Dynamic);
            if (policy.Decision == EndpointRights.HandlerDecision) Assert.True(policy.HandlerRights.Length > 0 || !string.IsNullOrWhiteSpace(policy.Remark), $"{key} names no right and gives no reason");
        }
    }

    [Fact]
    public void Lookups_do_not_depend_on_casing_or_trailing_slashes()
    {
        Assert.Equal(EndpointRights.For("GET", "/api/v1/admin/users"), EndpointRights.For("get", "/API/V1/ADMIN/USERS/"));
        Assert.Null(EndpointRights.For("GET", "/admin/not-a-route"));
    }

    [Fact]
    public void Rights_matrix_is_current()
    {
        var matrix = File.ReadAllText(Path.Combine(Repo(), "docs", "RIGHTS-COVERAGE-MATRIX.md"));
        Assert.Empty(EndpointRights.Table.Keys.Where(k => !matrix.Contains($"`{k}`", StringComparison.Ordinal)));
        Assert.Empty(RightsCatalog.AllKeys.Where(k => !matrix.Contains($"`{k}`", StringComparison.Ordinal)));
        Assert.Contains($"**{RightsCatalog.All.Length} rights. {EndpointRights.Table.Count} API operations:**", matrix);
    }

    [Fact]
    public void Browser_requirements_match_the_catalog()
    {
        var json = System.Text.Json.JsonDocument.Parse(File.ReadAllText(Path.Combine(Repo(), "src", "web", "src", "rightsRequirements.json")));
        var keys = json.RootElement.GetProperty("keys").EnumerateArray().Select(k => k.GetString()!).ToArray();
        Assert.Equal(RightsCatalog.AllKeys, keys);
        var requires = json.RootElement.GetProperty("requires").EnumerateArray().Select(r => r.EnumerateArray().Select(i => keys[i.GetInt32()]).ToArray()).ToArray();
        for (var i = 0; i < keys.Length; i++) Assert.Equal(RightsCatalog.All[i].Requires, requires[i]);
    }

    /// <summary>
    /// A person with one harmless right calls every operation directly, bypassing the interface. Nothing outside their right may succeed.
    /// Ids that do not exist are used on purpose: a handler that looks up the record first answers 404, which also reveals nothing.
    /// </summary>
    [Fact]
    public async Task No_operation_succeeds_for_someone_without_its_right()
    {
        var manager = await hub.As(HubFactory.Manager);
        var role = await manager.Create("/admin/roles", new { name = $"Sweep {Guid.NewGuid():N}"[..20], rights = new[] { "Notifications:View" } });
        var account = $@"DEV\sweep{Guid.NewGuid():N}"[..20];
        await manager.Create("/admin/users", new { accountName = account, displayName = "Sweep", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds = new[] { role } });
        var limited = await hub.As(account);

        var open = EndpointRights.Table.Where(p => p.Value.Decision is EndpointRights.PublicDecision or EndpointRights.AuthenticatedDecision).Select(p => p.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var own = EndpointRights.Table.Where(p => p.Value.Rights.Length > 0 && p.Value.Rights.All(r => r == "Notifications:View") && p.Value.HandlerRights.Length == 0).Select(p => p.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var succeeded = new List<string>();
        var checkedCount = 0;
        foreach (var key in EndpointRights.Table.Keys.Where(k => !open.Contains(k) && !own.Contains(k)).Order(StringComparer.Ordinal))
        {
            var parts = key.Split(' ', 2);
            var path = Regex.Replace(parts[1], @"\{[^}]+\}", "999999");
            var response = await limited.Send(new HttpMethod(parts[0]), path, parts[0] is "GET" or "DELETE" ? null : new { });
            checkedCount++;
            if ((int)response.Status is >= 200 and < 300) succeeded.Add($"{key} answered {(int)response.Status}");
        }
        Assert.True(checkedCount > 300, $"Only {checkedCount} operations were checked.");
        Assert.Empty(succeeded);
    }

    [Theory]
    // Each row: an operation in a capability category, and the right that opens it. The right alone, with its prerequisites, must be enough to pass the rights check.
    [InlineData("GET", "/admin/users", "AdminUsers:View")]
    [InlineData("GET", "/admin/roles", "AdminRoles:View")]
    [InlineData("GET", "/admin/group-mappings", "AdminGroups:View")]
    [InlineData("GET", "/admin/settings", "AdminSettings:View")]
    [InlineData("GET", "/admin/lookups", "AdminConfig:View")]
    [InlineData("GET", "/admin/jira-connections", "AdminIntegrations:View")]
    [InlineData("GET", "/cases", "Cases:View")]
    [InlineData("GET", "/commitments", "Commitments:View")]
    [InlineData("GET", "/contracts", "Contracts:View")]
    [InlineData("GET", "/environments", "Environments:View")]
    [InlineData("GET", "/assets", "Servers:View")]
    [InlineData("GET", "/products", "Products:View")]
    [InlineData("GET", "/teams", "Teams:View")]
    [InlineData("GET", "/escalations", "OtherOperations:View")]
    [InlineData("GET", "/projects", "Projects:View")]
    [InlineData("GET", "/clients", "tab.ClientStructure.organizations:View")]
    [InlineData("GET", "/notes/tree", "PersonalNotes:View")]
    [InlineData("GET", "/notifications", "Notifications:View")]
    public async Task A_right_opens_its_category_and_nothing_next_to_it(string method, string path, string right)
    {
        var manager = await hub.As(HubFactory.Manager);
        var rights = RightsCatalog.Dependencies(right).Append(right).ToArray();
        var with = await Person(manager, rights);
        Assert.Equal(HttpStatusCode.OK, (await with.Send(new HttpMethod(method), path)).Status);
        var without = await Person(manager, ["Notifications:View"]);
        if (right != "Notifications:View") Assert.Equal(HttpStatusCode.Forbidden, (await without.Send(new HttpMethod(method), path)).Status);
    }

    private async Task<Api> Person(Api manager, string[] rights)
    {
        var id = Guid.NewGuid().ToString("N");
        var role = await manager.Create("/admin/roles", new { name = "R" + id[..12], rights });
        var account = $@"DEV\p{id[..12]}";
        await manager.Create("/admin/users", new { accountName = account, displayName = "Person", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds = new[] { role } });
        return await hub.As(account);
    }
}

/// <summary>Users, roles, directory mappings and exceptions through the real API.</summary>
[Collection("hub")]
public sealed class RightsLifecycleTests(HubFactory hub)
{
    private static string U(string prefix) => prefix + Guid.NewGuid().ToString("N")[..10];

    private async Task<long> Role(Api admin, params string[] rights) => await admin.Create("/admin/roles", new { name = U("Role "), rights });

    private static object Body(string account, long[] roleIds, bool all = true) => new { accountName = account, displayName = "Person", workingTimeZone = "UTC", allClients = all, allInternal = all, roleIds };

    [Fact]
    public async Task Rights_from_several_roles_combine_and_an_inactive_role_gives_none()
    {
        var m = await hub.As(HubFactory.Manager);
        var view = await Role(m, "Cases:View");
        var create = await Role(m, "Cases:Create");
        var account = $@"DEV\{U("multi")}";
        var id = await m.Create("/admin/users", Body(account, [view, create]));
        var person = await hub.As(account);
        Assert.Contains("Cases:Create", (await person.Get("/me")).Body!["rights"]!.AsArray().Select(x => x!.GetValue<string>()));

        var listed = (await m.Get($"/admin/users/{id}")).Body!;
        Assert.Equal(2, listed["roles"]!.AsArray().Count);
        Assert.Empty(listed["directoryRoles"]!.AsArray());

        var roles = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray();
        var viewRole = roles.First(r => r!["id"]!.GetValue<long>() == view)!;
        await m.Put($"/admin/roles/{view}", new { name = viewRole["name"]!.GetValue<string>(), rights = new[] { "Cases:View" }, isActive = false }, viewRole["version"]!.GetValue<string>());
        var after = (await person.Get("/me")).Body!["rights"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray();
        // The remaining role holds Create without its View prerequisite, so nothing is effective.
        Assert.Empty(after);
    }

    [Fact]
    public async Task A_right_with_no_prerequisite_held_is_not_effective_until_another_role_supplies_it()
    {
        var m = await hub.As(HubFactory.Manager);
        var create = await Role(m, "Cases:Create");
        var account = $@"DEV\{U("prereq")}";
        var id = await m.Create("/admin/users", Body(account, [create]));
        var person = await hub.As(account);
        Assert.Equal(HttpStatusCode.Forbidden, (await person.Get("/cases")).Status);
        var view = await Role(m, "Cases:View");
        var version = await m.Version($"/admin/users/{id}");
        await m.Put($"/admin/users/{id}", Body(account, [create, view]), version);
        Assert.Equal(HttpStatusCode.OK, (await person.Get("/cases")).Status);
    }

    [Fact]
    public async Task A_role_can_be_created_cloned_compared_and_deleted_but_not_while_held()
    {
        var m = await hub.As(HubFactory.Manager);
        var role = await Role(m, "Cases:View");
        var clone = await m.Create($"/admin/roles/{role}/clone", new { name = U("Clone ") });
        var body = (await m.Get("/admin/roles")).Body!;
        var cloned = body["roles"]!.AsArray().First(r => r!["id"]!.GetValue<long>() == clone)!;
        Assert.Equal(["Cases:View"], cloned["rights"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.NotEmpty(body["catalog"]!.AsArray());

        var account = $@"DEV\{U("holder")}";
        await m.Create("/admin/users", Body(account, [role]));
        var holders = (await m.Get($"/admin/roles/{role}/holders")).Body!.AsArray();
        Assert.Contains(holders, h => h!["accountName"]!.GetValue<string>() == account);

        var row = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["id"]!.GetValue<long>() == role)!;
        var refused = await m.Send(HttpMethod.Delete, $"/admin/roles/{role}", null, row["version"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.Status);
        var unused = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["id"]!.GetValue<long>() == clone)!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/admin/roles/{clone}", null, unused["version"]!.GetValue<string>())).Status);
    }

    [Fact]
    public async Task Role_editing_cannot_invent_a_right()
    {
        var m = await hub.As(HubFactory.Manager);
        var bad = await m.Post("/admin/roles", new { name = U("Bad "), rights = new[] { "Cases:Fly" } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.Status);
        Assert.NotNull(bad.Error("rights"));
        var container = await m.Post("/admin/roles", new { name = U("Old "), rights = new[] { "module.cases:Access" } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, container.Status);
    }

    [Fact]
    public async Task A_directory_group_passes_on_several_roles_and_they_are_shown_as_inherited()
    {
        var m = await hub.As(HubFactory.Manager);
        var view = await Role(m, "Cases:View");
        var maintain = await Role(m, "Cases:Maintain");
        var group = $@"DEV\{U("Group")}";
        await m.Create("/admin/group-mappings", new { groupName = group, roleIds = new[] { view, maintain }, allClients = true, allInternal = true });
        var account = $@"DEV\{U("member")}";
        var member = await hub.As(account, group);
        Assert.Equal(HttpStatusCode.OK, member.SignInStatus);
        var rights = member.Me["rights"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray();
        Assert.Contains("Cases:Maintain", rights);

        var row = (await m.Get("/admin/users")).Body!.AsArray().First(u => u!["accountName"]!.GetValue<string>() == account)!;
        Assert.Empty(row["roles"]!.AsArray());
        Assert.Equal(2, row["directoryRoles"]!.AsArray().Count);
        Assert.All(row["directoryRoles"]!.AsArray(), r => Assert.Equal(group, r!["group"]!.GetValue<string>()));
    }

    [Fact]
    public async Task A_mapped_role_cannot_be_deleted_and_an_unknown_one_cannot_be_mapped()
    {
        var m = await hub.As(HubFactory.Manager);
        var role = await Role(m, "Cases:View");
        await m.Create("/admin/group-mappings", new { groupName = $@"DEV\{U("G")}", roleIds = new[] { role }, allClients = false, allInternal = false });
        var row = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["id"]!.GetValue<long>() == role)!;
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Send(HttpMethod.Delete, $"/admin/roles/{role}", null, row["version"]!.GetValue<string>())).Status);
        var bad = await m.Post("/admin/group-mappings", new { groupName = $@"DEV\{U("G")}", roleIds = new[] { 999999L }, allClients = false, allInternal = false });
        Assert.NotNull(bad.Error("roleIds"));
    }

    [Fact]
    public async Task A_role_grant_does_not_widen_data_scope()
    {
        var m = await hub.As(HubFactory.Manager);
        var role = await Role(m, "Cases:View", "Contracts:View");
        var account = $@"DEV\{U("noscope")}";
        await m.Create("/admin/users", Body(account, [role], all: false));
        var person = await hub.As(account);
        Assert.Equal(0, (await person.Get("/cases")).Total);
        Assert.Equal(0, (await person.Get("/contracts")).Total);
        Assert.True((await m.Get("/cases")).Total > 0);
    }

    [Fact]
    public async Task Changing_one_persons_access_leaves_another_alone()
    {
        var m = await hub.As(HubFactory.Manager);
        var role = await Role(m, "Cases:View");
        var a = $@"DEV\{U("a")}"; var b = $@"DEV\{U("b")}";
        var idA = await m.Create("/admin/users", Body(a, [role]));
        await m.Create("/admin/users", Body(b, [role]));
        var versionA = await m.Version($"/admin/users/{idA}");
        await m.Put($"/admin/users/{idA}", Body(a, []), versionA);
        var personB = await hub.As(b);
        Assert.Equal(HttpStatusCode.OK, (await personB.Get("/cases")).Status);
    }

    [Fact]
    public async Task Exceptions_cannot_touch_platform_or_administration_rights_and_denies_win()
    {
        var m = await hub.As(HubFactory.Manager);
        var role = await Role(m, "Cases:View", "Cases:Maintain");
        var account = $@"DEV\{U("exc")}";
        var id = await m.Create("/admin/users", Body(account, [role]));
        var person = await hub.As(account);
        var version = (await m.Get($"/admin/users/{id}/right-exceptions")).Body!["version"]!.GetValue<string>();
        foreach (var key in new[] { "Platform:Export", "Platform:Administration", "AdminUsers:View" })
        {
            var refused = await m.Put($"/admin/users/{id}/right-exceptions", new { exceptions = new[] { new { key, effect = "Allow" } } }, version);
            Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.Status);
        }
        var denied = await m.Put($"/admin/users/{id}/right-exceptions", new { exceptions = new[] { new { key = "Cases:View", effect = "Deny" } } }, version);
        Assert.Equal(HttpStatusCode.NoContent, denied.Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await person.Get("/cases")).Status);
    }

    [Fact]
    public async Task An_administrator_cannot_grant_beyond_their_own_rights()
    {
        var m = await hub.As(HubFactory.Manager);
        var delegateRole = await Role(m, "Platform:Administration", "AdminRoles:View", "AdminRoles:Create", "AdminRoles:Maintain", "AdminUsers:View", "AdminUsers:Create", "AdminUsers:Maintain", "Cases:View");
        var account = $@"DEV\{U("delegate")}";
        await m.Create("/admin/users", Body(account, [delegateRole]));
        var delegated = await hub.As(account);
        var refused = await delegated.Post("/admin/roles", new { name = U("Wider "), rights = new[] { "Cases:Delete" } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.Status);
        Assert.NotNull(refused.Error("rights"));
        var within = await delegated.Post("/admin/roles", new { name = U("Within "), rights = new[] { "Cases:View" } });
        Assert.Equal(HttpStatusCode.Created, within.Status);
        var manager = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["key"]?.GetValue<string>() == BuiltInRoles.ManagerKey)!["id"]!.GetValue<long>();
        var assign = await delegated.Post("/admin/users", Body($@"DEV\{U("x")}", [manager]));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, assign.Status);
    }

    [Fact]
    public async Task The_protected_role_keeps_every_right_and_cannot_be_reduced()
    {
        var m = await hub.As(HubFactory.Manager);
        var row = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["key"]?.GetValue<string>() == BuiltInRoles.ManagerKey)!;
        Assert.Equal(RightsCatalog.AllKeys.Length, row["rights"]!.AsArray().Count);
        var id = row["id"]!.GetValue<long>();
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/admin/roles/{id}", new { name = row["name"]!.GetValue<string>(), rights = new[] { "Cases:View" } }, row["version"]!.GetValue<string>())).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/admin/roles/{id}", new { name = row["name"]!.GetValue<string>(), isActive = false }, row["version"]!.GetValue<string>())).Status);
    }

    [Fact]
    public async Task Synchronizing_the_catalog_retires_a_stored_key_without_touching_grants()
    {
        await hub.As(HubFactory.Manager);
        await using var scope = hub.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var stale = new RightDefinition { Key = "Old:Retired" + Guid.NewGuid().ToString("N")[..6], Label = "Old", Description = "Old", Module = "Cases", Feature = "Old", Kind = "Action", RiskLevel = "Normal" };
        db.RightDefinitions.Add(stale);
        await db.SaveChangesAsync();
        await RightsCatalog.SynchronizeAsync(db);
        await db.Entry(stale).ReloadAsync();
        Assert.False(stale.IsActive);
        db.RightDefinitions.Remove(stale);
        await db.SaveChangesAsync();
    }
}
