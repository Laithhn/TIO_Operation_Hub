using System.Net;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// Explicitly approved SQL/API regressions. Each test starts the test host, migrates a uniquely
/// named isolated database and drops that database afterward. TIOHUB_TEST_SQL must point only
/// to a separately approved development server, never a shared or production server.
/// </summary>
public sealed class AuthorizationBoundarySqlIntegrationTests
{
    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..(prefix.Length + 9)];

    private static async Task WithApprovedHub(Func<HubFactory, Task> test)
    {
        // Check again inside the test, so calling it directly cannot bypass the discovery guard.
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var hub = new HubFactory();
        try { await test(hub); }
        finally { await hub.DisposeAsync(); }
    }

    private static async Task<long> CreateRole(Api admin, params string[] keys) => await admin.Create("/admin/roles", new
    {
        name = Unique("boundary-role"), permissions = PermissionHierarchy.WithAncestors(keys), rights = Array.Empty<string>()
    });

    private static ClaimsPrincipal Principal(string account, params string[] groups) => new(new ClaimsIdentity(
        new[] { new Claim(ClaimTypes.Name, account) }.Concat(groups.Select(g => new Claim(DevAuthHandler.GroupClaim, g))), "test"));

    [ApprovedOverrideSqlFact]
    public Task Directory_claim_cache_and_stored_group_snapshot_preserve_group_boundaries() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var role = await CreateRole(admin, "Cases:View");
        var account = $@"DEV\{Unique("groups")}";
        var userId = await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Directory boundary", workingTimeZone = "UTC", roleIds = new[] { role }, scopes = Array.Empty<object>()
        });
        var first = Unique("first");
        var second = Unique("second");
        var combined = first + ";" + second;
        await admin.Create("/admin/group-mappings", new
        {
            groupName = combined, role = "Engineer", allClients = true, allInternal = false, scopes = Array.Empty<object>()
        });

        // The testing HTTP header uses semicolons as delimiters, so use real ClaimsPrincipal
        // objects to represent a Windows group whose actual name itself contains a semicolon.
        using (var scope = hub.Services.CreateScope())
        {
            var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
            var joined = await resolver.ResolveAsync(Principal(account, combined), CancellationToken.None);
            Assert.NotNull(joined);
            Assert.True(joined.AllClients);
        }
        using (var scope = hub.Services.CreateScope())
        {
            var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
            Assert.True((await resolver.ForUserAsync(userId, CancellationToken.None))!.AllClients);
            var separate = await resolver.ResolveAsync(Principal(account, first, second), CancellationToken.None);
            Assert.NotNull(separate);
            Assert.False(separate.AllClients); // The similarly spelled single group must not hit the same cache entry.
            Assert.False((await resolver.ForUserAsync(userId, CancellationToken.None))!.AllClients);
        }

        using (var scope = hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var user = await db.Users.SingleAsync(u => u.Id == userId);
            // An old delimiter-joined snapshot cannot prove whether this was one group or two.
            user.MappedGroups = combined;
            await db.SaveChangesAsync();
        }
        using (var scope = hub.Services.CreateScope())
        {
            var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
            var inspected = (await resolver.ForUserAsync(userId, CancellationToken.None))!;
            Assert.False(inspected.AllClients);
            Assert.Equal("directory_groups_unavailable", inspected.AccessRestriction);
        }
        using (var scope = hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var user = await db.Users.SingleAsync(u => u.Id == userId);
            user.MappedGroups = UserResolver.EncodeStoredGroups([combined], "Development");
            await db.SaveChangesAsync();
        }
        using (var scope = hub.Services.CreateScope())
        {
            var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
            Assert.True((await resolver.ForUserAsync(userId, CancellationToken.None))!.AllClients);
        }
    });

    [ApprovedOverrideSqlFact]
    public Task Project_scope_cannot_delete_the_parent_client_or_preview_its_global_cascade() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var clientId = await admin.Create("/clients", new { code = Unique("C"), name = Unique("Client"), country = "Oman", ownerUserId = admin.UserId, status = "Active" });
        var projectId = await admin.Create("/projects", new { clientId, code = Unique("P"), name = Unique("Project"), ownerUserId = admin.UserId, status = "Active" });
        var role = await CreateRole(admin, ["ClientStructure:Delete", "Projects:DetailsView", .. CapabilityPermissions.BusinessViewKeys]);
        var account = $@"DEV\{Unique("project")}";
        await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Project boundary", workingTimeZone = "UTC", roleIds = new[] { role },
            scopes = new[] { new { kind = "Project", clientId = (long?)null, projectId, teamId = (long?)null } }
        });
        var scoped = await hub.As(account);
        Assert.Equal(HttpStatusCode.OK, scoped.SignInStatus);
        Assert.Equal(HttpStatusCode.OK, (await scoped.Get($"/projects/{projectId}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Send(HttpMethod.Delete, $"/clients/{clientId}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Get($"/dependents/clients/{clientId}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Send(HttpMethod.Delete, $"/dependents/clients/{clientId}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/clients/{clientId}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/projects/{projectId}")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Moving_an_environment_to_another_project_revokes_the_cached_session_scope() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var clientId = await admin.Create("/clients", new { code = Unique("C"), name = Unique("Client"), country = "Oman", ownerUserId = admin.UserId, status = "Active" });
        async Task<long> Project() => await admin.Create("/projects", new { clientId, code = Unique("P"), name = Unique("Project"), ownerUserId = admin.UserId, status = "Active" });
        var visibleProject = await Project();
        var otherProject = await Project();
        object EnvironmentInput(long projectId) => new
        {
            clientId, projectId, name = "Production", type = "Production", criticality = "Normal", ownerUserId = admin.UserId, backupGapReason = "Not assigned"
        };
        var environmentId = await admin.Create("/environments", EnvironmentInput(visibleProject));
        var role = await CreateRole(admin, "Environments:View", "Environments:DetailsView");
        var account = $@"DEV\{Unique("environment")}";
        await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Environment boundary", workingTimeZone = "UTC", roleIds = new[] { role },
            scopes = new[] { new { kind = "Project", clientId = (long?)null, projectId = visibleProject, teamId = (long?)null } }
        });
        var scoped = await hub.As(account);
        Assert.Equal(HttpStatusCode.OK, scoped.SignInStatus);
        Assert.Equal(HttpStatusCode.OK, (await scoped.Get($"/environments/{environmentId}")).Status);
        var version = await admin.Version($"/environments/{environmentId}");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/environments/{environmentId}", EnvironmentInput(otherProject), version)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Get($"/environments/{environmentId}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/environments/{environmentId}")).Status);
    });
}
