using System.Net;
using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// These tests start the real API, migrate a uniquely named SQL database and DROP it on disposal.
/// They are skipped unless the person running them explicitly sets the approval variable below.
/// Set TIOHUB_TEST_SQL to a separately approved development SQL Server, never a shared/production server.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class ApprovedOverrideSqlFactAttribute : FactAttribute
{
    public const string ApprovalVariable = "TIOHUB_APPROVE_OVERRIDE_SQL_TESTS";
    public ApprovedOverrideSqlFactAttribute()
    {
        if (Environment.GetEnvironmentVariable(ApprovalVariable) != "migrate-and-drop-isolated-database")
            Skip = "Requires explicit approval: this test migrates and drops a unique isolated SQL database.";
    }
}

public sealed class PermissionOverrideIntegrationTests
{
    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..Math.Min(prefix.Length + 9, 60)];
    private static string Path(long id) => $"/admin/users/{id}/right-exceptions";
    private static object Exception(string key, string effect, DateTimeOffset? expiresAt = null) => new { key, effect, expiresAt };
    private static object Replacement(params object[] overrides) => new { exceptions = overrides };

    // No collection fixture is constructed by discovery; the database is created only inside an approved test.
    private static async Task WithApprovedHub(Func<HubFactory, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var hub = new HubFactory();
        try { await test(hub); }
        finally { await hub.DisposeAsync(); }
    }

    private static async Task<(Api Actor, long Id)> CreateUser(HubFactory hub, Api admin, IEnumerable<string> keys,
        string[]? rights = null, long? clientScope = null)
    {
        var role = await admin.Create("/admin/roles", new { name = Unique("override-role"), rights = keys.ToArray() });
        var account = $@"DEV\{Unique("override-user")}";
        object[] scopes = clientScope is null ? [] : [new { kind = "Client", clientId = clientScope, projectId = (long?)null, teamId = (long?)null }];
        var id = await admin.Create("/admin/users", new { accountName = account, displayName = "Override integration", workingTimeZone = "UTC", roleIds = new[] { role }, scopes });
        return (await hub.As(account), id);
    }

    private static async Task<Res> Replace(Api admin, long id, object body, string? version = null)
    {
        version ??= (await admin.Get(Path(id))).ETag;
        return await admin.Put(Path(id), body, version);
    }

    [ApprovedOverrideSqlFact]
    public Task Self_escalation_and_administrative_exception_are_rejected() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var self = await admin.Get(Path(admin.UserId));
        Assert.Equal(HttpStatusCode.OK, self.Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Replace(admin, admin.UserId,
            Replacement(Exception("Cases:Delete", "Allow")), self.ETag)).Status);

        var (target, id) = await CreateUser(hub, admin, Fixture.Rights(["Cases:View"]));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Replace(admin, id,
            Replacement(Exception("AdminUsers:Maintain", "Allow")))).Status);

        var delegatedKeys = Fixture.Rights([], Flag.Administer);
        var (delegated, _) = await CreateUser(hub, admin, delegatedKeys, ["Administer"]);
        var version = (await delegated.Get(Path(id))).ETag;
        Assert.NotNull(version);
        Assert.Equal(HttpStatusCode.Forbidden, (await Replace(delegated, id,
            Replacement(Exception("Cases:Delete", "Allow")), version)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await target.Put(Path(id), Replacement(Exception("Cases:Delete", "Allow")), version)).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Deny_and_removal_take_effect_for_an_existing_session_and_are_audited() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (reader, id) = await CreateUser(hub, admin, Fixture.Rights(["Cases:View"]));
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Replace(admin, id, Replacement(Exception("Cases:View", "Deny")))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        var inspection = (await admin.Get($"/admin/users/{id}/access")).Body!;
        Assert.Contains(inspection["restrictedRights"]!.AsArray(), p => p!["key"]!.GetValue<string>() == "Cases:View"
            && p["restrictionReason"]!.GetValue<string>() == "Explicitly denied");
        Assert.Equal(HttpStatusCode.NoContent, (await Replace(admin, id, Replacement())).Status);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
        var audit = (await admin.Get($"/admin/audit?category=Access&entityType=UserRightException&entityId={id}&pageSize=100")).Body!["items"]!.AsArray();
        Assert.Contains(audit, a => a!["action"]!.GetValue<string>() == "AccessGranted" && a.ToJsonString().Contains("Cases:View"));
        Assert.Contains(audit, a => a!["action"]!.GetValue<string>() == "AccessRevoked" && a.ToJsonString().Contains("Cases:View"));
    });

    [ApprovedOverrideSqlFact]
    public Task Temporary_deny_expires_in_an_existing_cached_session_without_an_administrative_write() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (reader, id) = await CreateUser(hub, admin, Fixture.Rights(["Cases:View"]));
        var expiry = DateTimeOffset.UtcNow.AddSeconds(10);
        Assert.Equal(HttpStatusCode.NoContent, (await Replace(admin, id, Replacement(Exception("Cases:View", "Deny", expiry)))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/cases")).Status);
        var delay = expiry - DateTimeOffset.UtcNow + TimeSpan.FromSeconds(1);
        if (delay > TimeSpan.Zero) await Task.Delay(delay);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get("/cases")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Temporary_allow_expires_and_cannot_override_data_scope() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        async Task<long> NewClient() => await admin.Create("/clients", new { code = Unique("C"), name = Unique("Client"), country = "Oman", ownerUserId = admin.UserId, status = "Active" });
        var permitted = await NewClient();
        var excluded = await NewClient();
        var assigned = Fixture.Rights(["ClientStructure:View", "ClientStructure:DetailsView", "tab.ClientStructure.organizations:View"])
            .Where(k => k != "ClientStructure:View");
        var (reader, id) = await CreateUser(hub, admin, assigned, clientScope: permitted);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get($"/clients/{permitted}")).Status);
        var expiry = DateTimeOffset.UtcNow.AddSeconds(10);
        Assert.Equal(HttpStatusCode.NoContent, (await Replace(admin, id, Replacement(Exception("ClientStructure:View", "Allow", expiry)))).Status);
        Assert.Equal(HttpStatusCode.OK, (await reader.Get($"/clients/{permitted}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await reader.Get($"/clients/{excluded}")).Status);
        var delay = expiry - DateTimeOffset.UtcNow + TimeSpan.FromSeconds(1);
        if (delay > TimeSpan.Zero) await Task.Delay(delay);
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get($"/clients/{permitted}")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Stale_or_missing_version_cannot_overwrite_a_successful_change() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (_, id) = await CreateUser(hub, admin, Fixture.Rights(["Cases:View"]));
        var version = (await admin.Get(Path(id))).ETag;
        Assert.NotNull(version);
        Assert.Equal(HttpStatusCode.PreconditionRequired, (await admin.Put(Path(id), Replacement(Exception("Cases:View", "Deny")))).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await Replace(admin, id, Replacement(Exception("Cases:View", "Deny")), version)).Status);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await Replace(admin, id, Replacement(), version)).Status);
        var rows = (await admin.Get(Path(id))).Body!["exceptions"]!.AsArray();
        Assert.Contains(rows, row => row!["key"]!.GetValue<string>() == "Cases:View" && row["effect"]!.GetValue<string>() == "Deny");
    });
}
