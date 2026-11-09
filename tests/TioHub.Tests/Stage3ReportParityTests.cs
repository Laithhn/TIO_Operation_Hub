using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Tests;

[Collection("hub")]
public class Stage3ReportParityTests(HubFactory hub) : Scenario(hub)
{
    private async Task<T> Db<T>(Func<HubDbContext, Task<T>> work)
    {
        using var scope = Hub.Services.CreateScope();
        return await work(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private static string Query(IReadOnlyDictionary<string, string> filters) => string.Join("&", filters.Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value)}"));

    private async Task<string> ConfiguredType(Api m)
    {
        var id = await m.Create("/admin/lookups", new { listName = "EnvironmentType", label = U("ParityLab"), category = "Test" });
        return (await m.Get("/admin/lookups")).Body!.AsArray().Single(x => x!["id"]!.GetValue<long>() == id)!["code"]!.GetValue<string>();
    }

    private static Task<long> Environment(Api m, long client, string name, string type, long? region = null, string criticality = "High") => m.Create("/environments", new
    {
        clientId = client, regionId = region, name, type, criticality, ownerUserId = m.UserId, backupGapReason = "Regression gap"
    });

    private async Task State(long id, Condition condition, DateTimeOffset? observed, DateTimeOffset? reviewed, DateTimeOffset? next = null)
    {
        var created = DateTimeOffset.UtcNow.AddDays(-30);
        await Db(db => db.Environments.Where(e => e.Id == id).ExecuteUpdateAsync(s => s.SetProperty(e => e.Condition, condition)
            .SetProperty(e => e.ConditionObservedAt, observed).SetProperty(e => e.InventoryReviewedAt, reviewed)
            .SetProperty(e => e.CreatedAt, created).SetProperty(e => e.NextReviewAt, next)));
    }

    private static object PolicyBody(Api m, string scope, int? age = 7, bool next = false, bool active = true) => new
    {
        recordType = "Environment", scope, maxAgeDays = age, usesNextReviewDate = next,
        effectiveFrom = DateTime.UtcNow.ToString("yyyy-MM-dd"), policyOwnerId = m.UserId, notes = "Report parity regression", isActive = active
    };

    private static async Task<JsonNode> Policy(Api m, long id) => (await m.Get("/review-policies")).Body!.AsArray().Single(x => x!["id"]!.GetValue<long>() == id)!;

    private static async Task SetPolicy(Api m, long id, string scope, int? age = 7, bool next = false, bool active = true)
    {
        var row = await Policy(m, id);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/review-policies/{id}", PolicyBody(m, scope, age, next, active), row["version"]!.GetValue<string>())).Status);
    }

    private static async Task<(long Id, Func<Task> Restore)> TemporaryPolicy(Api m, string scope, bool next = false)
    {
        var previous = (await m.Get("/review-policies")).Body!.AsArray().FirstOrDefault(x => x!["recordType"]!.GetValue<string>() == "Environment"
            && x["scope"]!.GetValue<string>() == scope && x["isActive"]!.GetValue<bool>())?.DeepClone();
        var id = previous is null ? await m.Create("/review-policies", PolicyBody(m, scope, next: next)) : previous["id"]!.GetValue<long>();
        if (previous is not null) await SetPolicy(m, id, scope, next: next);
        return (id, async () =>
        {
            var current = await Policy(m, id);
            object body = previous is null ? PolicyBody(m, scope, active: false) : previous;
            Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/review-policies/{id}", body, current["version"]!.GetValue<string>())).Status);
        });
    }

    private async Task<JsonNode> PreviewAndExport(Api m, string report, Dictionary<string, string> filters, int expected)
    {
        var preview = await m.Post($"/reports/{report}/preview", new { filters, pageSize = 100, timeZone = "UTC" });
        Assert.Equal(HttpStatusCode.OK, preview.Status);
        Assert.Equal(expected, preview.Body!["total"]!.GetValue<int>());
        Assert.Equal(expected, preview.Body["rows"]!.AsArray().Count);
        var export = await m.Post($"/reports/{report}/exports", new { filters, format = "csv", timeZone = "UTC" });
        Assert.Equal(HttpStatusCode.Created, export.Status);
        Assert.Equal("Completed", export.Body!["status"]!.GetValue<string>());
        Assert.Equal(expected, export.Body["rowCount"]!.GetValue<int>());
        // Policy edits below are distinct business states. Move this completed test job past the intentional 10-second duplicate-request cache.
        var jobId = export.Body["id"]!.GetValue<long>();
        await Db(db => db.ExportJobs.Where(j => j.Id == jobId).ExecuteUpdateAsync(s => s.SetProperty(j => j.RequestedAt, DateTimeOffset.UtcNow.AddSeconds(-20))));
        return preview.Body;
    }

    private async Task EnvironmentParity(Api m, Dictionary<string, string> filters, int expected)
    {
        var list = await m.Get("/environments?" + Query(filters) + "&pageSize=100");
        Assert.Equal(HttpStatusCode.OK, list.Status);
        Assert.Equal(expected, list.Total);
        var report = await PreviewAndExport(m, "environments", filters, expected);
        Assert.Equal(list.Body!["items"]!.AsArray().Select(x => x!["name"]!.GetValue<string>()).Order().ToArray(),
            report["rows"]!.AsArray().Select(x => x![2]!.GetValue<string>()).Order().ToArray());
    }

    [Fact]
    public async Task Environment_reports_match_configured_types_placement_condition_text_and_review_policies()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var type = await ConfiguredType(m);
        var needle = U("needle");
        var old = DateTimeOffset.UtcNow.AddDays(-20);
        var recent = DateTimeOffset.UtcNow.AddDays(-1);
        var stale = await Environment(m, client, needle + "-stale", type);
        var unknown = await Environment(m, client, U("other"), type);
        var current = await Environment(m, client, needle + "-current", type);
        var production = await Environment(m, client, needle + "-production", "Production");
        var nextReview = await Environment(m, client, needle + "-next", type);
        // Existing direct environments remain readable after a client gains regions; create new regional work normally.
        var region = await m.Create($"/clients/{client}/regions", new { code = U("R"), name = "Regional parity", ownerUserId = m.UserId });
        var regional = await Environment(m, client, needle + "-regional", type, region, "Normal");
        await State(stale, Condition.Degraded, old, old);
        await State(regional, Condition.Healthy, recent, recent);
        await State(unknown, Condition.Unknown, old, null); // Creation is the age baseline when inventory has never been reviewed.
        await State(current, Condition.Degraded, recent, recent);
        await State(production, Condition.Degraded, old, old);
        await State(nextReview, Condition.Degraded, recent, recent, old); // Explicit review dates take precedence over a current age.

        var inventory = await TemporaryPolicy(m, "Inventory", next: true);
        var condition = await TemporaryPolicy(m, "Condition");
        try
        {
            Dictionary<string, string> Filters(params (string Key, string Value)[] extra) => new(extra.ToDictionary(x => x.Key, x => x.Value)) { ["clientId"] = client.ToString(), ["type"] = type };
            await EnvironmentParity(m, Filters(), 5);
            await EnvironmentParity(m, Filters(("criticality", "High")), 4);
            await EnvironmentParity(m, Filters(("condition", "Degraded")), 3);
            await EnvironmentParity(m, Filters(("direct", "true")), 4);
            await EnvironmentParity(m, Filters(("direct", "false")), 5);
            await EnvironmentParity(m, Filters(("regionId", region.ToString())), 1);
            await EnvironmentParity(m, Filters(("q", needle)), 4);
            await EnvironmentParity(m, Filters(("freshness", "stale")), 3);
            await EnvironmentParity(m, Filters(("freshness", "needsVerification")), 1);
            await EnvironmentParity(m, Filters(("criticality", "High"), ("condition", "Degraded"), ("direct", "true"), ("freshness", "stale"), ("q", needle)), 2);
            var code = (await m.Get($"/clients/{client}")).Body!["code"]!.GetValue<string>();
            await EnvironmentParity(m, Filters(("q", code), ("country", "Oman")), 5);

            await SetPolicy(m, inventory.Id, "Inventory", next: false);
            await EnvironmentParity(m, Filters(("freshness", "stale")), 2);
            await SetPolicy(m, inventory.Id, "Inventory", age: null, next: true);
            await EnvironmentParity(m, Filters(("freshness", "stale")), 1);
            await SetPolicy(m, inventory.Id, "Inventory", active: false);
            await EnvironmentParity(m, Filters(("freshness", "stale")), 0);
            await SetPolicy(m, condition.Id, "Condition", active: false);
            await EnvironmentParity(m, Filters(("freshness", "needsVerification")), 0);
        }
        finally
        {
            await condition.Restore();
            await inventory.Restore();
        }
    }

    [Fact]
    public async Task Version_matrix_reports_match_country_and_configured_environment_type_filters()
    {
        var m = await Hub.As(HubFactory.Manager);
        var oman = await NewClient();
        var kenya = await m.Create("/clients", new { code = U("KEN"), name = "Kenya parity", country = "Kenya", ownerUserId = m.UserId, status = "Active" });
        var unknown = await NewClient();
        await Db(db => db.Clients.Where(c => c.Id == unknown).ExecuteUpdateAsync(s => s.SetProperty(c => c.CountryUnknown, true).SetProperty(c => c.Country, (string?)null)));
        var type = await ConfiguredType(m);
        var product = await m.Create("/products", new { code = U("PARITY"), name = "Parity product", isActive = true });
        var names = new[] { U("OM-LAB"), U("OM-PROD"), U("KE-LAB"), U("UNKNOWN-LAB") };
        var environments = new[] { await Environment(m, oman, names[0], type), await Environment(m, oman, names[1], "Production"),
            await Environment(m, kenya, names[2], type), await Environment(m, unknown, names[3], type) };
        foreach (var environment in environments)
            await m.Create("/installations", new { environmentId = environment, productId = product, instanceName = "Main" });

        foreach (var (country, environmentType, expected) in new[] { ("Oman", type, 1), ("Kenya", type, 1), ("Unknown", type, 1), ("Oman", "Production", 1), ("Kenya", "Production", 0) })
        {
            var filters = new Dictionary<string, string> { ["productId"] = product.ToString(), ["country"] = country, ["environmentType"] = environmentType };
            var list = await m.Get("/version-matrix?" + Query(filters));
            Assert.Equal(HttpStatusCode.OK, list.Status);
            var cells = list.Body!["cells"]!.AsArray();
            Assert.Equal(expected, cells.Count);
            var report = await PreviewAndExport(m, "versions", filters, expected);
            Assert.Equal(cells.Select(x => x!["environmentName"]!.GetValue<string>()).Order().ToArray(), report["rows"]!.AsArray().Select(x => x![2]!.GetValue<string>()).Order().ToArray());
        }
    }
}
