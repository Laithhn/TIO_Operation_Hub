using System.Net;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// Real API and SQL Server: generated filters, constraints, cascades, recovery, upgrade and rollback. Each explicitly approved test migrates
/// and drops its own uniquely named database. Never point TIOHUB_TEST_SQL at a shared or production server.
/// </summary>
public sealed class ScopedExceptionSqlIntegrationTests
{
    private const string ContractsMaintain = "Contracts:Maintain";
    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..(prefix.Length + 9)];
    private static string Exceptions(long id) => $"/admin/users/{id}/right-exceptions";

    private static async Task WithApprovedHub(Func<HubFactory, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var hub = new HubFactory();
        try { await test(hub); }
        finally { await hub.DisposeAsync(); }
    }

    private static string[] Prerequisites(string key) => Fixture.Rights([.. RightsCatalog.Dependencies(key), RightKeys.KeyOf("Contracts", "DetailsView")]);

    /// <summary>A person with every client visible, the prerequisites of the permission, and the permission itself only when asked.</summary>
    private static async Task<(Api Actor, long Id)> Person(HubFactory hub, Api admin, string key, bool roleHolds, object[]? scopes = null, bool allClients = true)
    {
        var keys = Prerequisites(key).Concat(roleHolds ? [key] : Array.Empty<string>()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        var role = await admin.Create("/admin/roles", new { name = Unique("scoped"), rights = keys });
        var account = $@"DEV\{Unique("scoped")}";
        var id = await admin.Create("/admin/users", new { accountName = account, displayName = "Scoped exception", workingTimeZone = "UTC", roleIds = new[] { role }, allClients, allInternal = true, scopes = scopes ?? [] });
        return (await hub.As(account), id);
    }

    private static async Task<Res> SetExceptions(Api admin, long id, params object[] overrides)
    {
        var current = await admin.Get(Exceptions(id));
        return await admin.Put(Exceptions(id), new { exceptions = overrides }, current.ETag);
    }

    /// <summary>Two contracts in different clients, read through the API so the test follows the seed.</summary>
    private static async Task<((long Id, long Client, long Project) First, (long Id, long Client, long Project) Second)> TwoContracts(Api admin)
    {
        var rows = (await admin.Get("/contracts?pageSize=200")).Body!["items"]!.AsArray()
            .Select(x => (Id: x!["id"]!.GetValue<long>(), Client: x["clientId"]!.GetValue<long>(), Project: x["projectId"]!.GetValue<long>())).ToArray();
        var first = rows[0];
        return (first, rows.First(r => r.Client != first.Client));
    }

    // Authorization runs before validation, so any answer other than 403/404 means the permission decision passed. Nothing is saved: the body is invalid.
    private static async Task<HttpStatusCode> TryEditContract(Api actor, long id)
    {
        var etag = (await actor.Get($"/contracts/{id}")).ETag ?? "AAAAAAAAAAA=";
        return (await actor.Put($"/contracts/{id}", new { projectId = (long?)null }, etag)).Status;
    }

    private static void AssertPassedAuthorization(HttpStatusCode status) => Assert.True(status is not (HttpStatusCode.Forbidden or HttpStatusCode.NotFound), $"Expected the permission decision to pass, got {(int)status}.");

    [ApprovedOverrideSqlFact]
    public Task Scoped_allow_applies_only_inside_its_client_and_revocation_is_immediate() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, second) = await TwoContracts(admin);
        var (actor, id) = await Person(hub, admin, ContractsMaintain, roleHolds: false);
        Assert.Equal(HttpStatusCode.Forbidden, await TryEditContract(actor, first.Id));

        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = first.Client })).Status);
        AssertPassedAuthorization(await TryEditContract(actor, first.Id));
        Assert.Equal(HttpStatusCode.Forbidden, await TryEditContract(actor, second.Id));
        Assert.True((await actor.Get($"/contracts/{first.Id}")).Body!["permissions"]!["canEdit"]!.GetValue<bool>());
        Assert.False((await actor.Get($"/contracts/{second.Id}")).Body!["permissions"]!["canEdit"]!.GetValue<bool>());
        // Never a global decision: the session snapshot does not list it as effective.
        Assert.DoesNotContain((await actor.Get("/me")).Body!["rights"]!.AsArray(), k => k!.GetValue<string>() == ContractsMaintain);

        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, await TryEditContract(actor, first.Id));
    });

    [ApprovedOverrideSqlFact]
    public Task Scoped_deny_overrides_a_role_allow_in_client_and_project_scope() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, second) = await TwoContracts(admin);
        var (actor, id) = await Person(hub, admin, ContractsMaintain, roleHolds: true);
        AssertPassedAuthorization(await TryEditContract(actor, first.Id));

        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Deny", clientId = first.Client })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, await TryEditContract(actor, first.Id));
        AssertPassedAuthorization(await TryEditContract(actor, second.Id));

        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Deny", projectId = second.Project })).Status);
        AssertPassedAuthorization(await TryEditContract(actor, first.Id));
        Assert.Equal(HttpStatusCode.Forbidden, await TryEditContract(actor, second.Id));
    });

    [ApprovedOverrideSqlFact]
    public Task A_scoped_allow_adds_no_data_visibility() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, second) = await TwoContracts(admin);
        object[] scopes = [new { kind = "Client", clientId = second.Client, projectId = (long?)null, teamId = (long?)null }];
        var (actor, id) = await Person(hub, admin, ContractsMaintain, roleHolds: false, scopes, allClients: false);
        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = first.Client })).Status);
        Assert.Equal(HttpStatusCode.NotFound, await TryEditContract(actor, first.Id));
    });

    [ApprovedOverrideSqlFact]
    public Task Administration_rejects_unsafe_scopes_and_stale_versions() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, _) = await TwoContracts(admin);
        var (_, id) = await Person(hub, admin, ContractsMaintain, roleHolds: false);
        // A permission whose paths are not all contextual cannot take a scope, in either direction.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await SetExceptions(admin, id, new { key = "Contracts:View", effect = "Deny", clientId = first.Client })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = first.Client, projectId = first.Project })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = 999_999_999L })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = first.Client }, new { key = ContractsMaintain, effect = "Deny", clientId = first.Client })).Status);
        var stale = (await admin.Get(Exceptions(id))).ETag;
        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Allow", clientId = first.Client }, new { key = ContractsMaintain, effect = "Deny", projectId = first.Project }, new { key = ContractsMaintain, effect = "Deny" })).Status);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await admin.Put(Exceptions(id), new { exceptions = Array.Empty<object>() }, stale)).Status);
        // Audit names the scope.
        var audit = (await admin.Get($"/admin/audit?category=Access&entityType=UserRightException&pageSize=20")).Text;
        Assert.Contains(first.Client.ToString(), audit);
    });

    [ApprovedOverrideSqlFact]
    public Task Database_constraints_hold_without_the_application() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, _) = await TwoContracts(admin);
        var (_, id) = await Person(hub, admin, ContractsMaintain, roleHolds: false);
        await using var sql = new SqlConnection(hub.ConnectionString);
        await sql.OpenAsync();
        async Task Insert(string scope)
        {
            await using var cmd = sql.CreateCommand();
            cmd.CommandText = $"INSERT iam.UserRightException (UserId, RightKey, Effect, ClientId, ProjectId, TeamId) VALUES ({id}, N'{ContractsMaintain}', N'Deny', {scope})";
            await cmd.ExecuteNonQueryAsync();
        }
        await Insert("NULL, NULL, NULL");
        await Assert.ThrowsAsync<SqlException>(() => Insert("NULL, NULL, NULL"));        // unique global
        await Insert($"{first.Client}, NULL, NULL");
        await Assert.ThrowsAsync<SqlException>(() => Insert($"{first.Client}, NULL, NULL"));  // unique per client
        await Assert.ThrowsAsync<SqlException>(() => Insert($"{first.Client}, {first.Project}, NULL")); // one scope only
        await Assert.ThrowsAsync<SqlException>(() => Insert("999999999, NULL, NULL"));   // reference must exist
    });

    [ApprovedOverrideSqlFact]
    public Task Cascade_works_for_a_delegated_actor_and_reveals_nothing_across_scope() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, second) = await TwoContracts(admin);
        // The preview route reads across modules, so the delegated actor holds every business View as well.
        var keys = Fixture.Rights([.. RightChecks.BusinessViewKeys, .. RightsCatalog.Dependencies("Contracts:Delete"), "Contracts:Delete"]);
        var role = await admin.Create("/admin/roles", new { name = Unique("cascade"), rights = keys });
        var account = $@"DEV\{Unique("cascade")}";
        await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Delegated cascade", workingTimeZone = "UTC", roleIds = new[] { role }, allClients = false, allInternal = false,
            scopes = new object[] { new { kind = "Client", clientId = second.Client, projectId = (long?)null, teamId = (long?)null } }
        });
        var actor = await hub.As(account);
        Assert.Equal(HttpStatusCode.NotFound, (await actor.Get($"/dependents/contracts/{first.Id}")).Status);
        var outOfScope = await actor.DeleteAll($"/dependents/contracts/{first.Id}");
        Assert.Equal(HttpStatusCode.NotFound, outOfScope.Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/contracts/{first.Id}")).Status);

        // In scope: the same actor previews and deletes without global scope.
        var preview = await actor.Get($"/dependents/contracts/{second.Id}");
        Assert.Equal(HttpStatusCode.OK, preview.Status);
        var deleted = await actor.DeleteAll($"/dependents/contracts/{second.Id}");
        Assert.True(deleted.Status == HttpStatusCode.OK, $"{(int)deleted.Status}: {deleted.Text}");
        Assert.Equal(HttpStatusCode.NotFound, (await admin.Get($"/contracts/{second.Id}")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task One_affected_row_outside_scope_stops_the_whole_cascade_and_changes_nothing() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        object Body(string code, long? parent) => new { code, name = "Cascade " + code, country = "Oman", status = "Active", ownerUserId = admin.UserId, parentClientId = parent };
        var parent = await admin.Create("/clients", Body(Unique("P").ToUpperInvariant(), null));
        var child = await admin.Create("/clients", Body(Unique("C").ToUpperInvariant(), parent));
        var manager = (await admin.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => r!["key"]?.GetValue<string>() == "Manager")!["id"]!.GetValue<long>();
        var account = $@"DEV\{Unique("partial")}";
        await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Partial scope", workingTimeZone = "UTC", roleIds = new[] { manager }, allClients = false, allInternal = true,
            scopes = new object[] { new { kind = "Client", clientId = parent, projectId = (long?)null, teamId = (long?)null } }
        });
        var actor = await hub.As(account);
        // The parent is visible, but deleting it would unlink a sub-client outside the actor's scope.
        Assert.Equal(HttpStatusCode.OK, (await actor.Get($"/clients/{parent}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await actor.Get($"/dependents/clients/{parent}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await actor.DeleteAll($"/dependents/clients/{parent}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/clients/{parent}")).Status);
        Assert.Equal(parent, (await admin.Get($"/clients/{child}")).Body!["parentClientId"]!.GetValue<long>());
    });

    [ApprovedOverrideSqlFact]
    public Task Project_only_visibility_never_authorizes_deletion() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, _) = await TwoContracts(admin);
        var keys = Fixture.Rights([.. Prerequisites("Contracts:Delete"), "Contracts:Delete", .. RightChecks.BusinessViewKeys]);
        var role = await admin.Create("/admin/roles", new { name = Unique("project-delete"), rights = keys });
        var account = $@"DEV\{Unique("project-delete")}";
        await admin.Create("/admin/users", new
        {
            accountName = account, displayName = "Project only", workingTimeZone = "UTC", roleIds = new[] { role }, allClients = false, allInternal = false,
            scopes = new object[] { new { kind = "Project", clientId = (long?)null, projectId = first.Project, teamId = (long?)null } }
        });
        var actor = await hub.As(account);
        Assert.Equal(HttpStatusCode.OK, (await actor.Get($"/contracts/{first.Id}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await actor.Send(HttpMethod.Delete, $"/contracts/{first.Id}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await actor.Get($"/dependents/contracts/{first.Id}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await admin.Get($"/contracts/{first.Id}")).Status);
    });

    [ApprovedOverrideSqlFact]
    public Task Deleting_a_client_removes_its_exceptions_instead_of_promoting_them() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var clientId = await admin.Create("/clients", new { code = Unique("E").ToUpperInvariant(), name = Unique("Exception client"), country = "Oman", status = "Active", ownerUserId = admin.UserId });
        var (_, id) = await Person(hub, admin, ContractsMaintain, roleHolds: true);
        Assert.Equal(HttpStatusCode.NoContent, (await SetExceptions(admin, id, new { key = ContractsMaintain, effect = "Deny", clientId })).Status);
        Assert.Contains("exception", (await admin.Get($"/dependents/clients/{clientId}")).Text, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await admin.DeleteAll($"/dependents/clients/{clientId}")).Status);
        Assert.Empty((await admin.Get(Exceptions(id))).Body!["exceptions"]!.AsArray());
    });

    [ApprovedOverrideSqlFact]
    public Task Last_administrator_checks_require_effective_permissions_in_directory_modes() => WithApprovedHub(async hub =>
    {
        await using var scope = hub.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
        var now = DateTimeOffset.UtcNow;
        Assert.True(await AdministratorRecovery.RemainsAsync(db, resolver, now, default));
        // Remove every administrator's standing, leaving only a holder of a custom role named like one but without the permission.
        var managerRole = await db.AppRoles.AsNoTracking().SingleAsync(r => r.Key == "Manager");
        await db.UserRoles.Where(r => r.AppRoleId == managerRole.Id).ExecuteDeleteAsync();
        await db.GroupMappings.Where(m => m.Roles.Any(r => r.AppRole!.Key == BuiltInRoles.ManagerKey)).ExecuteDeleteAsync();
        db.ChangeTracker.Clear();
        Assert.False(await AdministratorRecovery.RemainsAsync(db, resolver, now, default));
        // The target's proposed roles count once they carry effective administration.
        var candidate = await db.Users.AsNoTracking().FirstAsync(u => u.IsActive);
        Assert.True(await AdministratorRecovery.RemainsAsync(db, resolver, now, default, candidate.Id, true, [managerRole.Id]));
        // A direct deny of a required permission disqualifies them even with the protected role.
        await using (var sql = new SqlConnection(hub.ConnectionString))
        {
            await sql.OpenAsync();
            await using var cmd = sql.CreateCommand();
            cmd.CommandText = $"INSERT iam.UserRightException (UserId, RightKey, Effect) VALUES ({candidate.Id}, N'AdminUsers:Maintain', N'Deny')";
            await cmd.ExecuteNonQueryAsync();
        }
        Assert.False(await AdministratorRecovery.RemainsAsync(db, resolver, now, default, candidate.Id, true, [managerRole.Id]));
    });

    [ApprovedOverrideSqlFact]
    public Task An_unreadable_snapshot_allows_naming_but_not_delegation_and_a_never_seen_account_is_like_a_new_one() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (_, stale) = await Person(hub, admin, ContractsMaintain, roleHolds: true);
        var neverAccount = $@"DEV\{Unique("never")}";
        var never = await admin.Create("/admin/users", new { accountName = neverAccount, displayName = "Never signed in", workingTimeZone = "UTC", roles = new[] { "Engineer" }, allClients = true, allInternal = true });
        await using (var sql = new SqlConnection(hub.ConnectionString))
        {
            await sql.OpenAsync();
            await using var cmd = sql.CreateCommand();
            cmd.CommandText = $"UPDATE iam.[User] SET MappedGroups = N'legacy;format' WHERE Id = {stale}";
            await cmd.ExecuteNonQueryAsync();
        }
        await using var scope = hub.Services.CreateAsyncScope();
        var resolver = scope.ServiceProvider.GetRequiredService<UserResolver>();
        Assert.Equal("directory_groups_unavailable", (await resolver.ForUserAsync(stale, default))!.AccessRestriction);
        Assert.Null((await resolver.ForUserAsync(stale, default, directWhenGroupsUnknown: true))!.AccessRestriction);
        Assert.True((await resolver.ForUserAsync(never, default))!.HasAccess);
        // Changes that delegate access stay refused until the person signs in; the never-seen account can be changed.
        var refused = await admin.Get(Exceptions(stale));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.Put(Exceptions(stale), new { exceptions = Array.Empty<object>() }, refused.ETag)).Status);
        var allowed = await admin.Get(Exceptions(never));
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put(Exceptions(never), new { exceptions = Array.Empty<object>() }, allowed.ETag)).Status);
        Assert.Equal("unavailable", (await admin.Get($"/admin/users/{stale}/access")).Body!["directoryEvidence"]!["source"]!.GetValue<string>());
    });

    [ApprovedOverrideSqlFact]
    public Task Directory_snapshot_encoding_round_trips_through_sql_server() => WithApprovedHub(async hub =>
    {
        await hub.As(HubFactory.Manager);
        string[] groups = ["CORP\\Ops, North", "CORP\\Ops\"Quoted\"", "ÄÖ-Gruppe"];
        var encoded = UserResolver.EncodeStoredGroups(groups, "Windows");
        await using var scope = hub.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var user = await db.Users.FirstAsync(u => u.AccountName == HubFactory.Viewer);
        user.MappedGroups = encoded;
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var stored = await db.Users.AsNoTracking().Where(u => u.AccountName == HubFactory.Viewer).Select(u => u.MappedGroups).SingleAsync();
        Assert.Equal(encoded, stored);
        Assert.True(UserResolver.TryDecodeStoredGroups(stored, "Windows", out var decoded));
        Assert.Equal(groups.Order(), decoded.Order());
        Assert.False(UserResolver.TryDecodeStoredGroups(stored, "Development", out _));
    });

    [ApprovedOverrideSqlFact]
    public Task Migration_down_refuses_while_scoped_rows_exist_and_preserves_global_rows_through_a_round_trip() => WithApprovedHub(async hub =>
    {
        var admin = await hub.As(HubFactory.Manager);
        var (first, _) = await TwoContracts(admin);
        var (_, id) = await Person(hub, admin, ContractsMaintain, roleHolds: false);
        await using var scope = hub.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var migrator = db.GetService<IMigrator>();
        // Exceptions lived in the old table at this point in the history, so the guard of that older migration reads it.
        await migrator.MigrateAsync("20261103142553_JiraInternalMember");
        await db.Database.ExecuteSqlRawAsync($"INSERT iam.UserPermissionOverride (UserId, PermissionKey, Effect) VALUES ({id}, N'Cases:View', N'Deny')");
        await db.Database.ExecuteSqlRawAsync($"INSERT iam.UserPermissionOverride (UserId, PermissionKey, Effect, ClientId) VALUES ({id}, N'{ContractsMaintain}', N'Allow', {first.Client})");
        const string previous = "20261102140000_ExportAccessFingerprint";

        var refused = await Assert.ThrowsAsync<SqlException>(() => migrator.MigrateAsync(previous));
        Assert.Contains("Scoped permission exceptions exist", refused.Message);

        await db.Database.ExecuteSqlRawAsync($"DELETE iam.UserPermissionOverride WHERE UserId = {id} AND ClientId IS NOT NULL");
        await migrator.MigrateAsync(previous);
        await migrator.MigrateAsync();
        var row = await db.UserRightExceptions.AsNoTracking().SingleAsync(o => o.UserId == id);
        Assert.Equal(("Cases:View", "Deny", true), (row.RightKey, row.Effect, row.IsGlobal));
    });
}

/// <summary>The packaged deployment script itself, on empty and earlier databases, run the way a DBA runs it.</summary>
public sealed class DeploymentScriptSqlTests
{
    private static string Server => Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
    private static readonly string ScriptPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../database/01-schema.sql"));
    private static string Conn(string db) => $"Server={Server};Database={db};Trusted_Connection=True;TrustServerCertificate=True";

    private static async Task RunAsync(string db, string script)
    {
        await using var sql = new SqlConnection(Conn(db));
        await sql.OpenAsync();
        foreach (var batch in System.Text.RegularExpressions.Regex.Split(script, @"^\s*GO\s*$", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase).Where(b => b.Trim().Length > 0))
        {
            await using var cmd = sql.CreateCommand();
            cmd.CommandText = batch;
            cmd.CommandTimeout = 600;
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task WithDatabase(Func<string, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var name = "TioHub_Test_" + Guid.NewGuid().ToString("N")[..8];
        await RunAsync("master", $"CREATE DATABASE [{name}]");
        try { await test(name); }
        finally
        {
            SqlConnection.ClearAllPools();
            await RunAsync("master", $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];");
        }
    }

    private static async Task<int> CountAsync(string db, string query)
    {
        await using var sql = new SqlConnection(Conn(db));
        await sql.OpenAsync();
        await using var cmd = sql.CreateCommand();
        cmd.CommandText = query;
        return (int)(await cmd.ExecuteScalarAsync())!;
    }

    [ApprovedOverrideSqlFact]
    public Task Script_builds_an_empty_database_and_a_second_run_changes_nothing() => WithDatabase(async db =>
    {
        var script = await File.ReadAllTextAsync(ScriptPath);
        await RunAsync(db, script);
        var applied = await CountAsync(db, "SELECT COUNT(*) FROM admin.__EFMigrationsHistory");
        await RunAsync(db, script);
        Assert.Equal(applied, await CountAsync(db, "SELECT COUNT(*) FROM admin.__EFMigrationsHistory"));
        Assert.Equal(1, await CountAsync(db, "SELECT COUNT(*) FROM sys.check_constraints WHERE name = 'CK_UserRightException_SingleScope'"));
    });

    [ApprovedOverrideSqlFact]
    public Task Upgrade_from_the_previous_release_keeps_every_exception_as_global() => WithDatabase(async db =>
    {
        using var design = new DesignTimeFactory().CreateDbContext([]);
        const string previous = "20261102140000_ExportAccessFingerprint";
        await RunAsync(db, "SET QUOTED_IDENTIFIER ON;\nGO\n" + design.GetService<IMigrator>().GenerateScript(null, previous, MigrationsSqlGenerationOptions.Idempotent));
        await RunAsync(db, """
            SET IDENTITY_INSERT iam.[User] ON;
            INSERT iam.[User] (Id, AccountName, DisplayName, WorkingTimeZone, IsActive, AllClients, AllInternal, Grants, CreatedAt, UpdatedAt)
            VALUES (900, N'CORP\upgrade', N'Upgrade', N'UTC', 1, 0, 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
            SET IDENTITY_INSERT iam.[User] OFF;
            IF NOT EXISTS (SELECT 1 FROM iam.PermissionDefinition WHERE [Key] = N'Cases:View')
                INSERT iam.PermissionDefinition ([Key], DisplayName, Description, Module, ResourceType, Action, RiskLevel, NodeType, DisplayOrder, IsSystemManaged, IsActive, SupportsScope, CreatedAt, UpdatedAt)
                VALUES (N'Cases:View', N'View', N'', N'cases', N'Cases', N'View', N'Normal', N'Action', 0, 1, 1, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
            INSERT iam.UserPermissionOverride (UserId, PermissionKey, Effect, ExpiresAt) VALUES (900, N'Cases:View', N'Deny', NULL);
            """);
        await RunAsync(db, await File.ReadAllTextAsync(ScriptPath));
        Assert.Equal(1, await CountAsync(db, "SELECT COUNT(*) FROM iam.UserRightException WHERE UserId = 900 AND RightKey = N'Cases:View' AND Effect = N'Deny' AND ClientId IS NULL AND ProjectId IS NULL AND TeamId IS NULL AND Id > 0"));
    });
}
