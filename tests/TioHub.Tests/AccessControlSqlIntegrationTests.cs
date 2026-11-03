using System.Net;
using System.Net.Http.Json;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// Real API/SQL regression tests. Each explicitly approved test migrates and drops its own
/// uniquely named database; discovery and the default test run must not start the factory.
/// Never point TIOHUB_TEST_SQL at a shared or production SQL Server.
/// </summary>
public sealed class AccessControlSqlIntegrationTests
{
    private const string ConflictPath = "/admin/roles/conflicts";
    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..(prefix.Length + 9)];

    private static async Task WithApprovedHub(Func<HubFactory, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var hub = new HubFactory();
        try { await test(hub); }
        finally { await hub.DisposeAsync(); }
    }

    private static Task<long> Role(Api admin, string permission) => admin.Create("/admin/roles", new
    {
        name = Unique("sql-role"), permissions = PermissionHierarchy.WithAncestors([.. CapabilityPermissions.Dependencies(permission), permission]), rights = Array.Empty<string>()
    });

    private static object UserInput(string account, long[] roles, object[] scopes) => new
    {
        accountName = account, displayName = "SQL access regression", workingTimeZone = "UTC", roleIds = roles, scopes
    };

    private static object ProjectScope(long projectId) => new { kind = "Project", clientId = (long?)null, projectId, teamId = (long?)null };

    private static async Task<HttpStatusCode> PutPolicy(Api admin, object body, string? version)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/api/v1" + ConflictPath);
        request.Content = JsonContent.Create(body);
        if (version is null) request.Headers.IfNoneMatch.ParseAdd("*");
        else request.Headers.IfMatch.ParseAdd($"\"{version}\"");
        using var response = await admin.Http.SendAsync(request);
        return response.StatusCode;
    }

    [ApprovedOverrideSqlFact]
    public Task Project_scope_replacement_revokes_cached_session_access() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var client = await admin.Create("/clients", new { code = Unique("C"), name = Unique("Client"), country = "Oman", ownerUserId = admin.UserId, status = "Active" });
        async Task<long> Project() => await admin.Create("/projects", new { clientId = client, code = Unique("P"), name = Unique("Project"), ownerUserId = admin.UserId, status = "Active" });
        var first = await Project();
        var second = await Project();
        var role = await Role(admin, "Projects:DetailsView");
        var account = $@"DEV\{Unique("scope")}";
        var id = await admin.Create("/admin/users", UserInput(account, [role], [ProjectScope(first)]));
        var reader = await hub.As(account);
        Assert.Equal(HttpStatusCode.OK, reader.SignInStatus);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get($"/projects/{first}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await reader.Get($"/projects/{second}")).Status);

        var version = await admin.Version($"/admin/users/{id}");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/admin/users/{id}", UserInput(account, [role], [ProjectScope(second)]), version)).Status);
        // Same signed-in HttpClient and therefore the same identity/cache key.
        Assert.Equal(HttpStatusCode.NotFound, (await reader.Get($"/projects/{first}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get($"/projects/{second}")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Role_conflicts_reject_existing_and_new_assignments_and_check_versions() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var first = await Role(admin, "Cases:View");
        var second = await Role(admin, "Projects:View");
        var account = $@"DEV\{Unique("conflict")}";
        var id = await admin.Create("/admin/users", UserInput(account, [first, second], []));
        var pair = new { pairs = new[] { new { firstRoleId = first, secondRoleId = second } } };
        var policy = await admin.Get(ConflictPath);
        Assert.Equal(HttpStatusCode.OK, policy.Status);
        var initialVersion = policy.Body!["version"]?.GetValue<string>();
        // Saving the policy cannot silently lock out a currently active account.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, await PutPolicy(admin, pair, initialVersion));
        var userVersion = await admin.Version($"/admin/users/{id}");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/admin/users/{id}", UserInput(account, [first], []), userVersion)).Status);
        Assert.Equal(HttpStatusCode.NoContent, await PutPolicy(admin, pair, initialVersion));
        var saved = await admin.Get(ConflictPath);
        var savedVersion = saved.Body!["version"]!.GetValue<string>();
        Assert.Single(saved.Body["pairs"]!.AsArray());
        userVersion = await admin.Version($"/admin/users/{id}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.Put($"/admin/users/{id}", UserInput(account, [first, second], []), userVersion)).Status);
        var stored = (await admin.Get($"/admin/users/{id}")).Body!;
        Assert.Equal(new[] { first }, stored["roleIds"]!.AsArray().Select(v => v!.GetValue<long>()));
        Assert.Equal(HttpStatusCode.NoContent, await PutPolicy(admin, new { pairs = Array.Empty<object>() }, savedVersion));
        Assert.Equal(HttpStatusCode.PreconditionFailed, await PutPolicy(admin, pair, savedVersion));
        Assert.Empty((await admin.Get(ConflictPath)).Body!["pairs"]!.AsArray());
        Assert.DoesNotContain((await admin.Get("/admin/settings")).Body!.AsArray(), s => s!["key"]!.GetValue<string>() == "Authorization.RoleConflicts");
    });

    [ApprovedOverrideSqlFact]
    public Task Newly_observed_directory_group_conflict_denies_the_existing_session() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var first = await Role(admin, "Cases:View");
        var roles = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray();
        var engineer = roles.Single(r => r!["key"]?.GetValue<string>() == BuiltInRoles.EngineerKey)!["id"]!.GetValue<long>();
        var account = $@"DEV\{Unique("directory")}";
        await admin.Create("/admin/users", UserInput(account, [first], []));
        var reader = await hub.As(account);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        var policy = await admin.Get(ConflictPath);
        var version = policy.Body!["version"]?.GetValue<string>();
        Assert.Equal(HttpStatusCode.NoContent, await PutPolicy(admin,
            new { pairs = new[] { new { firstRoleId = first, secondRoleId = engineer } } }, version));
        var group = Unique("TEST-GROUP");
        await admin.Create("/admin/group-mappings", new { groupName = group, role = "Engineer", allClients = false, allInternal = false, scopes = Array.Empty<object>() });

        // The group claim changes on the same client, as it can for a live directory identity.
        reader.Http.DefaultRequestHeaders.Add("X-Test-Groups", group);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        reader.Http.DefaultRequestHeaders.Remove("X-Test-Groups");
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
    });
}
