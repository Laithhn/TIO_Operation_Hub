using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Security;

namespace TioHub.Tests;

public class OrganizationGraphUnitTests
{
    [Fact]
    public void Cycle_detection_is_iterative_and_has_no_fixed_depth()
    {
        var graph = Enumerable.Range(1, 20000).Select(i => new OrganizationEndpoints.GraphEdge(i, i + 1)).ToArray();
        Assert.True(OrganizationEndpoints.WouldCycle(graph, 20001, 1));
        Assert.True(OrganizationEndpoints.WouldCycle(graph, 9, 9));
        Assert.False(OrganizationEndpoints.WouldCycle(graph, 20001, 20002));
        Assert.False(OrganizationEndpoints.WouldCycle(graph, 1, 20001)); // A shared descendant is not a cycle.
    }
}

public class OrganizationMigrationTests
{
    [Fact]
    public async Task Existing_active_and_archived_clients_upgrade_without_rewriting_data_or_creating_edges()
    {
        var server = Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
        var database = "TioHub_TestHierarchyUpgrade_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(
            $"Server={server};Database={database};Trusted_Connection=True;TrustServerCertificate=True",
            sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin")).Options;
        await using var db = new HubDbContext(options, new UserContext(), TimeProvider.System);
        try
        {
            var migrator = db.GetService<IMigrator>();
            await migrator.MigrateAsync("20261023082258_PenaltyAssessmentSnapshots");
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO clients.Client (Code, Name, Country, CountryUnknown, Status, ResponsibleParty, CreatedAt, UpdatedAt, ArchivedAt)
                VALUES ('PREEXISTING', 'Existing client', 'Germany', 0, 'Active', 'TIO', SYSUTCDATETIME(), SYSUTCDATETIME(), NULL),
                       ('ARCHIVED', 'Archived client', 'Germany', 0, 'Archived', 'TIO', SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME());
                """);
            var before = await db.Clients.IgnoreQueryFilters().AsNoTracking().Select(x => new { x.Id, x.Code, x.Name, x.Status, x.RowVersion }).ToListAsync();
            await migrator.MigrateAsync();
            var after = await db.Clients.IgnoreQueryFilters().AsNoTracking().Select(x => new { x.Id, x.Code, x.Name, x.Status, x.RowVersion }).ToListAsync();
            Assert.Equal(before.Select(x => (x.Id, x.Code, x.Name, x.Status, Convert.ToBase64String(x.RowVersion))),
                after.Select(x => (x.Id, x.Code, x.Name, x.Status, Convert.ToBase64String(x.RowVersion))));
            Assert.Equal(2, await db.Organizations.IgnoreQueryFilters().CountAsync());
            Assert.Empty(await db.OrganizationRelationships.ToListAsync());
            Assert.Equal(1, await db.Organizations.CountAsync()); // Archived client identity stays hidden.
            Assert.False(db.Database.HasPendingModelChanges());
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await db.Database.EnsureDeletedAsync(); // This uniquely named test database only.
        }
    }
}

[Collection("hub")]
public class OrganizationHierarchyTests(HubFactory hub) : Scenario(hub)
{
    private static string Structure(long client, long? project = null) =>
        $"/clients/{client}/organizational-structure" + (project == null ? "" : $"?projectId={project}");
    private static string Edges(long client, long? project = null) =>
        $"/clients/{client}/organization-relationships" + (project == null ? "" : $"?projectId={project}");
    private async Task<long> Root(Api m, long client) =>
        (await m.Get(Structure(client))).Body!["rootOrganizationId"]!.GetValue<long>();
    private static async Task<long> Organization(Api m, string name) => await m.Create("/organizations", new { name });
    private static object Edge(long parent, long child, string? type = null) =>
        new { parentOrganizationId = parent, childOrganizationId = child, relationshipType = type };
    private async Task<long> Project(Api m, long client) =>
        await m.Create("/projects", new { clientId = client, code = U("P"), name = "Hierarchy project", ownerUserId = m.UserId, status = "Active" });

    [Fact]
    public async Task Standalone_client_creation_and_basic_edit_preserve_identity_and_optional_graph()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var graph = (await m.Get(Structure(client))).Body!;
        Assert.Empty(graph["relationships"]!.AsArray());
        Assert.Single(graph["organizations"]!.AsArray());
        var root = graph["rootOrganizationId"]!.GetValue<long>();
        var org = await Organization(m, U("Independent"));
        await m.Create(Edges(client), Edge(root, org));
        var c = await m.Get($"/clients/{client}");
        var code = c.Body!["code"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/clients/{client}", new
        {
            code, name = "Renamed client", country = c.Body["country"]!.GetValue<string>(),
            status = "Active", ownerUserId = m.UserId
        }, c.ETag)).Status);
        var after = (await m.Get(Structure(client))).Body!;
        Assert.Single(after["relationships"]!.AsArray());
        Assert.Equal(root, after["rootOrganizationId"]!.GetValue<long>());
        Assert.Equal("Renamed client", after["organizations"]!.AsArray().Single(x => x!["id"]!.GetValue<long>() == root)!["name"]!.GetValue<string>());
        Assert.Single((await m.Get($"/organizations?q={code}")).Body!["items"]!.AsArray(), x => x!["clientId"]?.GetValue<long>() == client);
    }

    [Fact]
    public async Task Initial_relationships_are_atomic_and_canceled_or_incomplete_input_cannot_leave_orphans()
    {
        var m = await Hub.As(HubFactory.Manager);
        var code = U("Draft");
        var name = U("OrgDraft");
        var result = await m.Post("/clients", new
        {
            code, name = code, country = "Germany", status = "Active", ownerUserId = m.UserId,
            organizationRelationships = new object[] { new { newOrganization = new { name } }, new { description = "Incomplete" } }
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Equal(0, (await m.Get($"/clients?q={code}")).Total);
        Assert.Equal(0, (await m.Get($"/organizations?q={name}")).Total);
        var existing = await Organization(m, U("Reused"));
        var client = await m.Create("/clients", new
        {
            code, name = code, country = "Germany", status = "Active", ownerUserId = m.UserId,
            organizationRelationships = new object[] { new { childOrganizationId = existing }, new { newOrganization = new { name } } }
        });
        Assert.Equal(2, (await m.Get(Structure(client))).Body!["relationships"]!.AsArray().Count);
        Assert.Equal(1, (await m.Get($"/organizations?q={name}")).Total);
    }

    [Fact]
    public async Task Branching_shared_organizations_have_context_specific_roles_and_directions()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var other = await NewClient();
        var p1 = await Project(m, client);
        var p2 = await Project(m, client);
        var a = await Organization(m, U("EV"));
        var b = await Organization(m, U("VILLC"));
        var root = await Root(m, client);
        await m.Create(Edges(client, p1), Edge(root, a, "Contractor"));
        await m.Create(Edges(client, p1), Edge(a, b, "Subcontractor"));
        await m.Create(Edges(client, p1), Edge(root, b, "Supplier")); // two parents, one identity.
        await m.Create(Edges(client, p2), Edge(b, a, "Vendor"));
        await m.Create(Edges(other), Edge(b, a, "Partner"));
        var first = (await m.Get(Structure(client, p1))).Body!;
        Assert.Equal(3, first["organizations"]!.AsArray().Count);
        Assert.Equal(3, first["relationships"]!.AsArray().Count);
        Assert.Empty((await m.Get(Structure(client))).Body!["relationships"]!.AsArray());
        Assert.Equal("Vendor", (await m.Get(Structure(client, p2))).Body!["relationships"]![0]!["relationshipType"]!.GetValue<string>());
        Assert.Equal(2, (await m.Get($"/organizations/{b}/parents?clientId={client}&projectId={p1}")).Total);
        Assert.Equal(1, (await m.Get($"/organizations/{a}/children?clientId={client}&projectId={p1}")).Total);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post(Edges(other, p1), Edge(a, b))).Status);
    }

    [Fact]
    public async Task Self_cycle_duplicate_missing_participant_and_concurrent_reverse_edges_are_rejected()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var a = await Organization(m, U("A"));
        var b = await Organization(m, U("B"));
        var c = await Organization(m, U("C"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post(Edges(client), Edge(a, a))).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post(Edges(client), Edge(a, long.MaxValue))).Status);
        await m.Create(Edges(client), Edge(a, b));
        await m.Create(Edges(client), Edge(b, c));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post(Edges(client), Edge(c, a))).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post(Edges(client), Edge(a, b, "Other"))).Status);
        var x = await Organization(m, U("X"));
        var y = await Organization(m, U("Y"));
        var results = await Task.WhenAll(m.Post(Edges(client), Edge(x, y)), m.Post(Edges(client), Edge(y, x)));
        Assert.Single(results, r => r.Status == HttpStatusCode.Created);
        Assert.Single(results, r => r.Status == HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Moves_use_versions_unlink_preserves_organizations_and_permissions_are_enforced()
    {
        var m = await Hub.As(HubFactory.Manager);
        var engineer = await Hub.As(HubFactory.Engineer);
        var client = await NewClient();
        var a = await Organization(m, U("A"));
        var b = await Organization(m, U("B"));
        var c = await Organization(m, U("C"));
        var edge = await m.Create(Edges(client), Edge(a, b));
        var row = (await m.Get(Structure(client))).Body!["relationships"]![0]!;
        var version = row["version"]!.GetValue<string>();
        var path = $"/clients/{client}/organization-relationships/{edge}";
        Assert.Equal(HttpStatusCode.Forbidden, (await engineer.Post(Edges(client), Edge(a, c))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await engineer.Put(path, Edge(c, b), version)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await engineer.Send(HttpMethod.Delete, path, ifMatch: version)).Status);
        Assert.False((await engineer.Get(Structure(client))).Body!["canEdit"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put(path, Edge(c, b, "Supplier"), version)).Status);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await m.Send(HttpMethod.Delete, path, ifMatch: version)).Status);
        var current = (await m.Get(Structure(client))).Body!["relationships"]![0]!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, path, ifMatch: current["version"]!.GetValue<string>())).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/organizations/{b}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/organizations/{c}")).Status);
        Assert.Empty((await m.Get(Structure(client))).Body!["relationships"]!.AsArray());
    }

    [Fact]
    public async Task Deep_graph_retrieval_is_bounded_and_direct_children_remain_paginated()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var root = await Root(m, client);
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var nodes = Enumerable.Range(0, 1100).Select(i => new Organization { Name = $"Deep {client} {i}" }).ToList();
            db.Organizations.AddRange(nodes);
            await db.SaveChangesAsync();
            db.OrganizationRelationships.AddRange(nodes.Select((o, i) => new OrganizationRelationship
            {
                ClientId = client, ParentOrganizationId = i == 0 ? root : nodes[i - 1].Id, ChildOrganizationId = o.Id
            }));
            await db.SaveChangesAsync();
        }
        var graph = (await m.Get(Structure(client))).Body!;
        Assert.True(graph["truncated"]!.GetValue<bool>());
        Assert.Equal(1000, graph["organizations"]!.AsArray().Count);
        var limited = (await m.Get($"/organizations/{root}/hierarchy?clientId={client}&maxDepth=5")).Body!;
        Assert.Equal(6, limited["organizations"]!.AsArray().Count);
        Assert.Equal(5, limited["relationships"]!.AsArray().Count);
        Assert.True(limited["truncated"]!.GetValue<bool>());
        var page = await m.Get($"/organizations/{root}/children?clientId={client}&pageSize=1");
        Assert.Equal(1, page.Total);
        Assert.Single(page.Body!["items"]!.AsArray());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Get(Structure(client) + "?maxDepth=-1")).Status);
    }

    [Fact]
    public async Task Client_deletion_preserves_canonical_identity_and_links_from_other_contexts()
    {
        var m = await Hub.As(HubFactory.Manager);
        var source = await NewClient();
        var destination = await NewClient();
        var sourceOrg = await Root(m, source);
        var destinationOrg = await Root(m, destination);
        await m.Create(Edges(destination), Edge(destinationOrg, sourceOrg, "Contractor"));
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/clients/{source}")).Status);
        var preserved = await m.Get($"/organizations/{sourceOrg}");
        Assert.Equal(HttpStatusCode.OK, preserved.Status);
        Assert.Null(preserved.Body!["clientId"]);
        Assert.False(string.IsNullOrWhiteSpace(preserved.Body["name"]!.GetValue<string>()));
        Assert.Single((await m.Get(Structure(destination))).Body!["relationships"]!.AsArray());
    }

    [Fact]
    public async Task Relationship_types_are_configurable_retirable_and_protected_when_in_use()
    {
        var m = await Hub.As(HubFactory.Manager);
        var label = U("Integrator");
        var lookupId = await m.Create("/admin/lookups", new { listName = "OrganizationRelationshipType", code = label, label, sortOrder = 100, isRetired = false });
        var row = (await m.Get("/admin/lookups")).Body!.AsArray().Single(x => x!["id"]!.GetValue<long>() == lookupId)!;
        var code = row["code"]!.GetValue<string>();
        var client = await NewClient();
        var root = await Root(m, client);
        var a = await Organization(m, U("Configured"));
        var b = await Organization(m, U("Other"));
        var id = await m.Create(Edges(client), Edge(root, a, code));
        Assert.Equal(1, (await m.Get("/admin/lookups/OrganizationRelationshipType/usage")).Body![code]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{lookupId}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/lookups/{lookupId}", new
        {
            listName = "OrganizationRelationshipType", code, label, sortOrder = 100, isRetired = true
        }, row["version"]!.GetValue<string>())).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post(Edges(client), Edge(root, b, code))).Status);
        var edge = (await m.Get(Structure(client))).Body!["relationships"]![0]!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/clients/{client}/organization-relationships/{id}",
            Edge(root, a, code), edge["version"]!.GetValue<string>())).Status);
    }

    [Fact]
    public async Task Archived_client_participants_remain_visible_for_unlink_but_cannot_be_newly_linked()
    {
        var m = await Hub.As(HubFactory.Manager);
        var owner = await NewClient();
        var participatingClient = await NewClient();
        var root = await Root(m, owner);
        var participant = await Root(m, participatingClient);
        var edge = await m.Create(Edges(owner), Edge(root, participant));
        await m.Ok($"/clients/{participatingClient}/archive", new { reason = "Archived for relationship regression" }, await m.Version($"/clients/{participatingClient}"));
        var graph = (await m.Get(Structure(owner))).Body!;
        Assert.Single(graph["relationships"]!.AsArray());
        Assert.True(graph["organizations"]!.AsArray().Single(x => x!["id"]!.GetValue<long>() == participant)!["isArchived"]!.GetValue<bool>());
        var version = graph["relationships"]![0]!["version"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete,
            $"/clients/{owner}/organization-relationships/{edge}", ifMatch: version)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post(Edges(owner), Edge(root, participant))).Status);
    }

    [Fact]
    public async Task Scope_filters_hide_unrelated_client_identities_and_project_graphs()
    {
        var m = await Hub.As(HubFactory.Manager);
        var visible = await NewClient();
        var hidden = await NewClient();
        var hiddenOrg = await Root(m, hidden);
        var standalone = await Organization(m, U("Scoped"));
        await m.Create(Edges(hidden), Edge(hiddenOrg, standalone));
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        db.CurrentUser.Set(new ResolvedUser(m.UserId, "scoped", "Scoped", "UTC", true, ["Custom"], Right.None,
            [ResourcePermissions.KeyOf(ResourcePermissions.Structure, ResourcePermissions.Coordinate)], Grant.None,
            false, [visible], [], [], [], false, []));
        Assert.False(await db.Organizations.AnyAsync(x => x.Id == hiddenOrg));
        Assert.False(await db.OrganizationRelationships.AnyAsync(x => x.ClientId == hidden));
        Assert.True(await db.Organizations.AnyAsync(x => x.ClientId == visible));
    }
}
