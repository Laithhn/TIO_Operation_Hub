using System.Net;
using System.Data.Common;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Tests;

public class SchemaReadinessTests
{
    [Fact]
    public void Missing_history_and_intermediate_holes_are_not_ready_but_newer_additive_migrations_are_allowed()
    {
        Assert.Equal(["001", "002", "003"], DatabaseReadiness.Missing(["001", "002", "003"], []));
        Assert.Equal(["002"], DatabaseReadiness.Missing(["001", "002", "003"], ["001", "003"]));
        Assert.Empty(DatabaseReadiness.Missing(["001", "002"], ["001", "002", "003"]));
        Assert.Throws<InvalidOperationException>(() => new DatabaseReadinessResult(false, []).RequireReady());
        Assert.Throws<InvalidOperationException>(() => new DatabaseReadinessResult(true, ["002"]).RequireReady());
        new DatabaseReadinessResult(true, []).RequireReady();
    }

    [Fact]
    public async Task Startup_rejects_old_schema_before_initialization_and_probe_does_not_apply_migrations()
    {
        var server = Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
        var name = "TioHub_TestReadiness_" + Guid.NewGuid().ToString("N");
        var cs = new SqlConnectionStringBuilder { DataSource = server, InitialCatalog = name, IntegratedSecurity = true, TrustServerCertificate = true }.ConnectionString;
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(cs,
            sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin")).Options;
        await using var db = new HubDbContext(options, new UserContext(), TimeProvider.System);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync("20261023082258_PenaltyAssessmentSnapshots");
            var applied = (await db.Database.GetAppliedMigrationsAsync()).ToArray();
            var lookupsBefore = await db.LookupValues.CountAsync();
            var result = await DatabaseReadiness.CheckAsync(db, CancellationToken.None);
            Assert.True(result.Reachable);
            Assert.Equal(["20261023100730_OptionalOrganizationGraph", "20261028080005_ReportBuilder", "20261028102910_ClientLogo"], result.MissingMigrations);
            using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            {
                b.UseEnvironment("Testing");
                b.UseSetting("Auth:Mode", "Development");
                b.UseSetting("ConnectionStrings:TioHub", cs);
                b.UseSetting("Database:ApplyMigrationsOnStartup", "false");
                b.UseSetting("Database:SeedReferenceData", "true");
                b.UseSetting("Database:SeedDevelopmentData", "false");
                b.UseSetting("Attachments:Path", Path.Combine(Path.GetTempPath(), name));
            });
            var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());
            Assert.Contains("Database schema is not ready", error.ToString());
            Assert.Contains("database/01-schema.sql", error.ToString());
            Assert.Equal(applied, await db.Database.GetAppliedMigrationsAsync());
            Assert.Equal(lookupsBefore, await db.LookupValues.CountAsync()); // Startup did not seed into the old schema.

            // Missing migration history is also a mismatch, and the read-only check must not recreate it.
            await db.Database.ExecuteSqlRawAsync("DROP TABLE [admin].[__EFMigrationsHistory]");
            result = await DatabaseReadiness.CheckAsync(db, CancellationToken.None);
            Assert.Equal(db.Database.GetMigrations().Count(), result.MissingMigrations.Length);
            Assert.Equal(0, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM sys.tables WHERE name = '__EFMigrationsHistory'").SingleAsync());
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await db.Database.EnsureDeletedAsync(); // Only this uniquely named test database.
        }
    }

    [Fact]
    public async Task Unavailable_database_is_not_created_and_connection_details_are_not_reported()
    {
        var server = Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
        var cs = new SqlConnectionStringBuilder { DataSource = server, InitialCatalog = "TioHub_TestMissing_" + Guid.NewGuid().ToString("N"),
            IntegratedSecurity = true, TrustServerCertificate = true, ConnectTimeout = 1, ConnectRetryCount = 0 }.ConnectionString;
        await using var db = new HubDbContext(new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(cs).Options, new UserContext(), TimeProvider.System);
        var result = await DatabaseReadiness.CheckAsync(db, CancellationToken.None);
        Assert.False(result.Ready);
        Assert.False(result.Reachable);
        var error = Assert.Throws<InvalidOperationException>(result.RequireReady);
        Assert.DoesNotContain(server, error.Message);
        Assert.DoesNotContain(new SqlConnectionStringBuilder(cs).InitialCatalog, error.Message);
    }
}

[Collection("hub")]
public class Stage1IntegrityTests(HubFactory hub) : Scenario(hub)
{
    private async Task<Api> Limited(params string[] permissions)
    {
        var m = await Hub.As(HubFactory.Manager);
        var roleId = await m.Create("/admin/roles", new { name = U("Stage1"), rights = Array.Empty<string>(), permissions });
        var account = $@"DEV\{U("stage1")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "Stage 1 test", workingTimeZone = "UTC", roleId });
        return await Hub.As(account);
    }

    private async Task<long> Project(Api m, long client) =>
        await m.Create("/projects", new { clientId = client, code = U("P"), name = "Integrity project", ownerUserId = m.UserId, status = "Active" });

    [Fact]
    public async Task Delete_permission_for_products_cannot_delete_or_preview_other_resources()
    {
        var m = await Hub.As(HubFactory.Manager);
        var limited = await Limited("Products:Delete");
        var client = await NewClient();
        var env = await NewEnv(client, "Production");
        var project = await Project(m, client);
        var contract = await m.Create("/contracts", new { clientId = client, projectId = project, title = "Support", type = "SlaSupport", status = "Ended", ownerUserId = m.UserId });
        var work = await NewCase(client);
        var team = await m.Create("/teams", new { code = U("T"), name = "Integrity team", isActive = true });
        foreach (var path in new[] { $"/clients/{client}", $"/environments/{env}", $"/contracts/{contract}", $"/cases/{work}", $"/teams/{team}" })
            Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, path)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/dependents/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, $"/dependents/clients/{client}")).Status);
        var product = await m.Create("/products", new { code = U("PR"), name = "Unused product", isActive = true });
        Assert.Equal(HttpStatusCode.NoContent, (await limited.Send(HttpMethod.Delete, $"/products/{product}", ifMatch: await limited.Version($"/products/{product}"))).Status);
    }

    [Fact]
    public async Task Cascade_requires_permissions_for_actual_descendants_and_kept_records_it_unlinks()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var env = await NewEnv(client, "Cascade child");
        var structureDelete = await Limited("ClientStructure:Delete");
        Assert.Equal(HttpStatusCode.Forbidden, (await structureDelete.Get($"/dependents/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await structureDelete.Send(HttpMethod.Delete, $"/dependents/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/environments/{env}")).Status);
        var both = await Limited("ClientStructure:Delete", "Environments:Delete");
        Assert.Equal(HttpStatusCode.OK, (await both.Send(HttpMethod.Delete, $"/dependents/clients/{client}")).Status);

        var other = await NewClient();
        var project = await Project(m, other);
        var keptEnv = await m.Create("/environments", new { clientId = other, projectId = project, name = "Keep this environment", type = "Production", criticality = "Normal", ownerUserId = m.UserId });
        Assert.Equal(HttpStatusCode.Forbidden, (await structureDelete.Send(HttpMethod.Delete, $"/dependents/projects/{project}")).Status);
        var unlinker = await Limited("ClientStructure:Delete", "Environments:Maintain");
        Assert.Equal(HttpStatusCode.OK, (await unlinker.Send(HttpMethod.Delete, $"/dependents/projects/{project}")).Status);
        Assert.Null((await m.Get($"/environments/{keptEnv}")).Body!["projectId"]);
    }

    [Fact]
    public async Task Restore_permissions_are_resource_specific_and_contract_restore_is_reachable()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var env = await NewEnv(client, "Restore environment");
        var project = await Project(m, client);
        var contract = await m.Create("/contracts", new { clientId = client, projectId = project, title = "Ended support", type = "SlaSupport", status = "Ended", ownerUserId = m.UserId });
        await m.Ok($"/environments/{env}/archive", new { reason = "Test" }, await m.Version($"/environments/{env}"));
        await m.Ok($"/contracts/{contract}/archive", new { reason = "Test" }, await m.Version($"/contracts/{contract}"));
        var standalone = await NewClient();
        await m.Ok($"/clients/{standalone}/archive", new { reason = "Test" }, await m.Version($"/clients/{standalone}"));
        var envRestore = await Limited("Environments:ArchiveRestore");
        Assert.Equal(HttpStatusCode.Forbidden, (await envRestore.Post($"/admin/archived/Client/{standalone}/restore", new { reason = "Test" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await envRestore.Post($"/admin/archived/Contract/{contract}/restore", new { reason = "Test" })).Status);
        await envRestore.Ok($"/admin/archived/Environment/{env}/restore", new { reason = "Test" });
        var contractRestore = await Limited("Contracts:ArchiveRestore");
        await contractRestore.Ok($"/admin/archived/Contract/{contract}/restore", new { reason = "Test" });
        Assert.Equal(project, (await m.Get($"/contracts/{contract}")).Body!["project"]!["id"]!.GetValue<long>());
    }

    [Fact]
    public async Task Create_and_maintain_are_distinct_for_base_products_and_servers()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var env = await NewEnv(client, "Create permissions");
        var creator = await Limited("Products:Create", "Servers:Create");
        var maintainer = await Limited("Products:Maintain", "Servers:Maintain");
        var body = new { code = U("PRODUCT"), name = "Create-only product", isActive = true };
        var product = await creator.Create("/products", body);
        Assert.Equal(HttpStatusCode.Forbidden, (await creator.Put($"/products/{product}", body, await creator.Version($"/products/{product}"))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await maintainer.Post("/products", body with { code = U("DENIED") })).Status);
        var assetBody = new { environmentId = env, name = U("Server"), type = "VM", lifecycle = "Planned", ownerUserId = creator.UserId };
        var asset = await creator.Create("/assets", assetBody);
        Assert.Equal(HttpStatusCode.Forbidden, (await creator.Put($"/assets/{asset}", assetBody, await creator.Version($"/assets/{asset}"))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await maintainer.Post("/assets", assetBody with { name = U("Denied") })).Status);
    }

    [Fact]
    public async Task Case_coordinators_and_unrelated_maintainers_receive_matching_capabilities()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var work = await NewCase(client);
        var coordinator = await Limited("Cases:Coordinate");
        var unrelated = await Limited("Products:Maintain", "ClientStructure:Coordinate");
        var flags = (await coordinator.Get($"/cases/{work}")).Body!["permissions"]!;
        Assert.True(flags["canTriage"]!.GetValue<bool>());
        Assert.True(flags["canAssign"]!.GetValue<bool>());
        Assert.False(flags["canEdit"]!.GetValue<bool>());
        flags = (await unrelated.Get($"/cases/{work}")).Body!["permissions"]!;
        Assert.False(flags["canTriage"]!.GetValue<bool>());
        Assert.False(flags["canAssign"]!.GetValue<bool>());
        Assert.False(flags["canEdit"]!.GetValue<bool>());
        var triage = new { responsibleTeamId = await Team(), impactSummary = "Investigating", priority = "High", nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1), ownerUserId = coordinator.UserId };
        Assert.Equal(HttpStatusCode.Forbidden, (await unrelated.Post($"/cases/{work}/triage", triage, await unrelated.Version($"/cases/{work}"))).Status);
        await coordinator.Ok($"/cases/{work}/triage", triage, await coordinator.Version($"/cases/{work}"));
        Assert.Equal(HttpStatusCode.Forbidden, (await unrelated.Post("/data-quality/scan")).Status);
        Assert.False((await unrelated.Get($"/environments/{await NewEnv(client, "Flags")}")).Body!["canEdit"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Owner_changes_and_team_management_use_their_own_coordination_permission()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var env = await NewEnv(client, "Owner permissions");
        var wrongCoordinator = await Limited("Environments:Maintain", "OtherOperations:Coordinate", "ClientStructure:Coordinate");
        var envCoordinator = await Limited("Environments:Maintain", "Environments:Coordinate");
        var body = new { clientId = client, name = "Owner permissions", type = "Production", criticality = "Normal", ownerUserId = envCoordinator.UserId };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await wrongCoordinator.Put($"/environments/{env}", body, await wrongCoordinator.Version($"/environments/{env}"))).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await envCoordinator.Put($"/environments/{env}", body, await envCoordinator.Version($"/environments/{env}"))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await wrongCoordinator.Post("/teams", new { code = U("DENIED"), name = "Denied team", isActive = true })).Status);
        var teamCreator = await Limited("Teams:Create");
        var team = await teamCreator.Create("/teams", new { code = U("TEAM"), name = "Created team", isActive = true });
        Assert.Equal(HttpStatusCode.Forbidden, (await teamCreator.Post($"/teams/{team}/members", new { userId = m.UserId, isActive = true })).Status);
        var teamCoordinator = await Limited("Teams:Coordinate");
        await teamCoordinator.Create($"/teams/{team}/members", new { userId = m.UserId, isActive = true });
    }

    [Fact]
    public async Task Attachment_delete_allows_other_delete_only_and_denies_unrelated_delete()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Client"), "recordType");
        form.Add(new StringContent(client.ToString()), "recordId");
        form.Add(new ByteArrayContent("Stage 1 attachment regression"u8.ToArray()), "files", "stage1.txt");
        var uploaded = await m.Http.PostAsync("/api/v1/attachments", form);
        Assert.Equal(HttpStatusCode.OK, uploaded.StatusCode);
        var id = JsonNode.Parse(await uploaded.Content.ReadAsStringAsync())!.AsArray()[0]!["id"]!.GetValue<long>();
        var wrongDelete = await Limited("Products:Delete", "OtherOperations:Maintain");
        Assert.Equal(HttpStatusCode.Forbidden, (await wrongDelete.Send(HttpMethod.Delete, $"/attachments/{id}")).Status);
        var otherDelete = await Limited("OtherOperations:Delete");
        Assert.Equal(HttpStatusCode.NoContent, (await otherDelete.Send(HttpMethod.Delete, $"/attachments/{id}")).Status);
    }

    [Fact]
    public async Task Direct_installation_deletion_cannot_bypass_component_permissions()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var env = await NewEnv(client, "Component deletion");
        var product = await m.Create("/products", new { code = U("DEL"), name = "Component product", isActive = true });
        var inst = await m.Create("/installations", new { environmentId = env, productId = product, instanceName = "Keep components" });
        var asset = await m.Create("/assets", new { environmentId = env, name = U("Host"), type = "VM", ownerUserId = m.UserId });
        var component = await m.Create("/components", new { installationId = inst, name = "Web", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { asset } });
        var limited = await Limited("Installations:Delete");
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, $"/installations/{inst}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, $"/dependents/installations/{inst}")).Status);
        Assert.Single((await m.Get($"/components/{component}")).Body!["hosts"]!.AsArray());
        var both = await Limited("Installations:Delete", "Servers:Delete");
        Assert.Equal(HttpStatusCode.NoContent, (await both.Send(HttpMethod.Delete, $"/installations/{inst}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/components/{component}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/assets/{asset}")).Status);
    }

    [Fact]
    public async Task Cascading_client_deletion_requires_teams_delete_for_handovers_and_teams_coordinators_can_see_them()
    {
        var m = await Hub.As(HubFactory.Manager);
        var engineer = await Hub.As(HubFactory.Engineer);
        var client = await NewClient();
        var handover = await m.Create("/handovers", new
        {
            outgoingOwnerId = m.UserId, receivingOwnerId = engineer.UserId, effectiveAt = DateTimeOffset.UtcNow,
            summary = "Client transfer", items = new[] { new { recordType = "Client", recordId = client } }
        });
        var coordinator = await Limited("Teams:Coordinate");
        var flags = (await coordinator.Get($"/handovers/{handover}")).Body!["permissions"]!;
        Assert.True(flags["canCancel"]!.GetValue<bool>());
        var limited = await Limited("ClientStructure:Delete");
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, $"/dependents/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/handovers/{handover}")).Status);
        var both = await Limited("ClientStructure:Delete", "Teams:Delete");
        Assert.Equal(HttpStatusCode.OK, (await both.Send(HttpMethod.Delete, $"/dependents/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/handovers/{handover}")).Status);
    }

    [Fact]
    public async Task Concurrent_link_creation_cannot_escape_cascade_permission_check()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var project = await Project(m, client);
        var env = await NewEnv(client, "Concurrent kept environment");
        var limited = await Limited("ClientStructure:Delete");
        var barrier = new CascadeUnlinkBarrier();
        using var factory = Hub.WithWebHostBuilder(b =>
        {
            b.UseSetting("Database:ApplyMigrationsOnStartup", "false");
            b.ConfigureServices(s => s.ConfigureDbContext<HubDbContext>(options => options.AddInterceptors(barrier)));
        });
        using var http = factory.CreateClient();
        http.DefaultRequestHeaders.Add("X-Test-User", limited.Http.DefaultRequestHeaders.GetValues("X-Test-User").Single());
        var me = await http.GetAsync("/api/v1/me");
        var cookie = me.Headers.GetValues("Set-Cookie").First(x => x.StartsWith("XSRF-TOKEN="));
        http.DefaultRequestHeaders.Add("X-XSRF-TOKEN", Uri.UnescapeDataString(cookie.Split(';')[0]["XSRF-TOKEN=".Length..]));
        var deleting = http.DeleteAsync($"/api/v1/dependents/projects/{project}");
        try
        {
            await barrier.Reached.Task.WaitAsync(TimeSpan.FromSeconds(20));
            await using var connection = new SqlConnection(Hub.ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = "SET LOCK_TIMEOUT 500; UPDATE [env].[Environment] SET [ProjectId] = @project WHERE [Id] = @environment";
            command.Parameters.AddWithValue("@project", project);
            command.Parameters.AddWithValue("@environment", env);
            var error = await Assert.ThrowsAsync<SqlException>(() => command.ExecuteNonQueryAsync());
            Assert.Equal(1222, error.Number); // The inspected ProjectId range stays locked until deletion finishes.
        }
        finally { barrier.Resume.TrySetResult(); }
        Assert.Equal(HttpStatusCode.OK, (await deleting).StatusCode);
        Assert.Null((await m.Get($"/environments/{env}")).Body!["projectId"]);
    }

    private sealed class CascadeUnlinkBarrier : DbCommandInterceptor
    {
        public TaskCompletionSource Reached { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Resume { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.StartsWith("UPDATE [env].[Environment] SET [ProjectId] = NULL", StringComparison.Ordinal))
            {
                Reached.TrySetResult();
                await Resume.Task.WaitAsync(cancellationToken);
            }
            return result;
        }
    }

    [Fact]
    public async Task Clone_checks_each_created_resource_and_rolls_back_unauthorized_multi_copy()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var source = await NewEnv(client, "Source");
        var target = await NewEnv(client, "Target");
        var target2 = await NewEnv(client, "Target2");
        var asset = await m.Create("/assets", new { environmentId = source, name = U("Source-server"), type = "VM", ownerUserId = m.UserId });
        var product = await m.Create("/products", new { code = U("CL"), name = "Copy product", isActive = true });
        var inst = await m.Create("/installations", new { environmentId = source, productId = product, instanceName = "Source installation" });
        var maintainer = await Limited("Installations:Maintain");
        var serverCreator = await Limited("Servers:Create");
        var instCreator = await Limited("Installations:Create");
        var servers = new { targetEnvironmentId = target, assetIds = new[] { asset }, includeDeployment = false };
        Assert.Equal(HttpStatusCode.Forbidden, (await maintainer.Post($"/environments/{source}/clone", servers)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await instCreator.Post($"/environments/{source}/clone", servers)).Status);
        await serverCreator.Ok($"/environments/{source}/clone", servers);
        await instCreator.Ok($"/environments/{source}/clone", new { targetEnvironmentId = target, installationIds = new[] { inst }, includeDeployment = false });
        Assert.Equal(HttpStatusCode.Forbidden, (await instCreator.Post($"/environments/{source}/clone-environment", new { name = "Denied environment" })).Status);
        var envCreator = await Limited("Environments:Create");
        Assert.Equal(HttpStatusCode.Forbidden, (await envCreator.Post($"/environments/{source}/clone-environment", new { name = "Rolled back environment" })).Status);
        Assert.Equal(0, (await m.Get($"/environments?clientId={client}&q=Rolled back environment")).Total);
        await envCreator.Ok($"/environments/{source}/clone-environment", new { name = "Empty environment", assetIds = Array.Empty<long>(), installationIds = Array.Empty<long>() });
        Assert.Equal(HttpStatusCode.Forbidden, (await serverCreator.Post($"/environments/{source}/clone-to-many", new
        {
            targets = new[] { new { environmentId = target2 } }, assetIds = new[] { asset }, installationIds = new[] { inst }, includeDeployment = false
        })).Status);
        Assert.Equal(0, (await m.Get($"/assets?environmentId={target2}")).Total);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Deleting_a_project_removes_only_its_edges_and_preserves_organizations_and_other_contexts(bool cascade)
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var project = await Project(m, client);
        var otherProject = await Project(m, client);
        var root = (await m.Get($"/clients/{client}/organizational-structure")).Body!["rootOrganizationId"]!.GetValue<long>();
        var a = await m.Create("/organizations", new { name = U("A") });
        var b = await m.Create("/organizations", new { name = U("B") });
        var path = $"/clients/{client}/organization-relationships";
        await m.Create(path, new { parentOrganizationId = root, childOrganizationId = a });
        await m.Create(path, new { parentOrganizationId = a, childOrganizationId = b });
        await m.Create(path + $"?projectId={project}", new { parentOrganizationId = root, childOrganizationId = a });
        await m.Create(path + $"?projectId={project}", new { parentOrganizationId = b, childOrganizationId = a });
        await m.Create(path + $"?projectId={otherProject}", new { parentOrganizationId = root, childOrganizationId = b });
        if (cascade)
        {
            var preview = (await m.Get($"/dependents/projects/{project}")).Body!;
            Assert.Contains(preview["delete"]!.AsArray(), x => x!["type"]!.GetValue<string>() == "OrganizationRelationship");
            Assert.DoesNotContain(preview["unlink"]!.AsArray(), x => x!["type"]!.GetValue<string>() == "OrganizationRelationship");
        }
        var deleted = await m.Send(HttpMethod.Delete, cascade ? $"/dependents/projects/{project}" : $"/projects/{project}");
        Assert.True(deleted.Status is HttpStatusCode.OK or HttpStatusCode.NoContent, deleted.Text);
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        Assert.Equal(0, await db.OrganizationRelationships.IgnoreQueryFilters().CountAsync(x => x.ProjectId == project));
        Assert.Equal(2, await db.OrganizationRelationships.IgnoreQueryFilters().CountAsync(x => x.ClientId == client && x.ProjectId == null));
        Assert.Equal(1, await db.OrganizationRelationships.IgnoreQueryFilters().CountAsync(x => x.ProjectId == otherProject));
        Assert.Equal(2, await db.Organizations.IgnoreQueryFilters().CountAsync(x => x.Id == a || x.Id == b));
    }

    [Fact]
    public async Task Fixed_workflow_values_cannot_be_deleted_and_current_schema_reports_ready()
    {
        var m = await Hub.As(HubFactory.Manager);
        var values = (await m.Get("/admin/lookups")).Body!.AsArray().Where(x => x!["listName"]!.GetValue<string>() is "ConditionLabel" or "CaseStatusLabel");
        foreach (var value in values)
            Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{Id(value)}")).Status);
        var response = await m.Http.GetAsync("/api/health/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ready", JsonNode.Parse(await response.Content.ReadAsStringAsync())!["status"]!.GetValue<string>());
    }
}
