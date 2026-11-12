using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>
/// Regressions for the 10 Nov 2026 audit findings TIO-BUG-001, 005 and 006 (002 is in <see cref="JiraIntegrationTests"/> and
/// <see cref="AuditCaptureTests"/>; 003, 004 and 007 are front-end tests). Every record is created by the test in its own
/// isolated database; nothing here touches shared or production data.
/// </summary>
[Collection("hub")]
public class AuditRemediationTests(HubFactory hub) : Scenario(hub)
{
    private async Task<T> Db<T>(Func<HubDbContext, Task<T>> f)
    {
        using var scope = Hub.Services.CreateScope();
        return await f(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private async Task<long> InProgressAsync(Api m, long client, long? env = null)
    {
        var id = await NewCase(client, env, owner: m.UserId);
        await m.Ok($"/cases/{id}/triage", new { responsibleTeamId = await Team(), impactSummary = "Impact", priority = "Normal", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{id}"));
        await m.Ok($"/cases/{id}/start", new { }, await m.Version($"/cases/{id}"));
        return id;
    }

    /// <summary>A custom Active status with a unique label: renaming it cannot disturb other tests that share this database.</summary>
    private async Task<(long Id, string Code, string Label)> CustomActiveStatusAsync(Api m)
    {
        var label = U("Waiting for vendor");
        var id = await m.Create("/admin/lookups", new { listName = CaseStatuses.List, label, category = nameof(CaseStatusBehavior.Active), isRetired = false });
        var code = (await m.Get("/admin/lookups")).Body!.AsArray().First(l => l!["id"]!.GetValue<long>() == id)!["code"]!.GetValue<string>();
        return (id, code, label);
    }

    private async Task RenameAsync(Api m, long lookupId, string newLabel)
    {
        var l = (await m.Get("/admin/lookups")).Body!.AsArray().First(x => x!["id"]!.GetValue<long>() == lookupId)!;
        Assert.True((await m.Put($"/admin/lookups/{lookupId}", new { listName = CaseStatuses.List, code = l["code"]!.GetValue<string>(), label = newLabel, description = (string?)null,
            sortOrder = l["sortOrder"]!.GetValue<int>(), category = l["category"]!.GetValue<string>(), isRetired = false }, l["version"]!.GetValue<string>())).Status is HttpStatusCode.NoContent or HttpStatusCode.OK);
    }

    /// <summary>Three tickets in the same internal stage (InProgress) with three different configured statuses.</summary>
    private async Task<(long Client, long Env, long Plain, long Waiting, long Custom, (long Id, string Code, string Label) Status)> SameStageFixtureAsync(Api m)
    {
        var client = await NewClient();
        var env = await NewEnv(client, "Production");
        var plain = await InProgressAsync(m, client, env);
        var waiting = await InProgressAsync(m, client, env);
        await m.Ok($"/cases/{waiting}/waiting", new { reason = "Customer", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{waiting}"));
        var status = await CustomActiveStatusAsync(m);
        var custom = await InProgressAsync(m, client, env);
        await m.Ok($"/cases/{custom}/status", new { code = status.Code }, await m.Version($"/cases/{custom}"));
        foreach (var id in new[] { plain, waiting, custom }) Assert.Equal("InProgress", (await m.Get($"/cases/{id}")).Body!["status"]!.GetValue<string>());
        return (client, env, plain, waiting, custom, status);
    }

    private static string Ref(JsonNode? c) => c!["ref"]!.GetValue<string>();

    // ------------------------------------------------------------------ TIO-BUG-001 ------------------------------------------------------------------

    [Fact]
    public async Task Bug001_client_and_environment_summaries_and_global_search_show_the_configured_status_not_the_stage()
    {
        var m = await Hub.As(HubFactory.Manager);
        var f = await SameStageFixtureAsync(m);
        var expected = new Dictionary<long, string> { [f.Plain] = "InProgress", [f.Waiting] = "WaitingForCustomer", [f.Custom] = f.Status.Code };

        // Ticket detail and register: the reference values.
        foreach (var (id, code) in expected) Assert.Equal(code, (await m.Get($"/cases/{id}")).Body!["statusCode"]!.GetValue<string>());
        var register = (await m.Get($"/cases?clientId={f.Client}&status=all")).Body!["items"]!.AsArray();
        foreach (var (id, code) in expected) Assert.Equal(code, register.Single(x => Id(x) == id)!["statusCode"]!.GetValue<string>());

        // Client and environment summaries carry the same configured code; the stage stays available under its own name.
        foreach (var path in new[] { $"/clients/{f.Client}/overview?tab=cases", $"/environments/{f.Env}/overview" })
        {
            var body = (await m.Get(path)).Body!;
            var cases = body["cases"]!.AsArray();
            foreach (var (id, code) in expected)
            {
                var row = cases.SingleOrDefault(x => Id(x) == id);
                Assert.True(row is not null, $"{path}: ticket {id} missing in {cases.ToJsonString()[..Math.Min(600, cases.ToJsonString().Length)]}");
                Assert.Equal(code, row["statusCode"]!.GetValue<string>());
                Assert.Equal("InProgress", row["status"]!.GetValue<string>());
            }
        }

        // Global search: the configured label, never the raw stage token.
        async Task<string> SubtitleAsync(long id)
        {
            var r = Ref((await m.Get($"/cases/{id}")).Body);
            var hit = (await m.Get($"/search?q={Uri.EscapeDataString(r)}")).Body!.AsArray().Single(h => h!["link"]!.GetValue<string>() == $"/cases/{id}")!;
            return hit["subtitle"]!.GetValue<string>();
        }
        Assert.EndsWith("· Waiting for customer", await SubtitleAsync(f.Waiting));
        Assert.EndsWith("· In-progress", await SubtitleAsync(f.Plain));
        Assert.EndsWith($"· {f.Status.Label}", await SubtitleAsync(f.Custom));
        Assert.DoesNotContain("InProgress", await SubtitleAsync(f.Waiting));

        // A renamed status label reaches the search subtitle with no code change; the stored code is unchanged.
        var renamed = U("Vendor fix pending");
        await RenameAsync(m, f.Status.Id, renamed);
        Assert.EndsWith($"· {renamed}", await SubtitleAsync(f.Custom));
        Assert.Equal(f.Status.Code, (await m.Get($"/cases/{f.Custom}")).Body!["statusCode"]!.GetValue<string>());
    }

    // ------------------------------------------------------------------ TIO-BUG-006 ------------------------------------------------------------------

    private static List<string> PreviewRefs(Res r)
    {
        Assert.Equal(HttpStatusCode.OK, r.Status);
        var cols = r.Body!["columns"]!.AsArray().Select(c => c!["header"]!.GetValue<string>()).ToList();
        var i = cols.IndexOf("Reference");
        return r.Body!["rows"]!.AsArray().Select(row => row!.AsArray()[i]!.GetValue<string>()).ToList();
    }

    [Fact]
    public async Task Bug006_catalog_offers_the_configured_statuses_with_distinct_aggregates()
    {
        var m = await Hub.As(HubFactory.Manager);
        var custom = await CustomActiveStatusAsync(m);
        var catalog = (await m.Get("/reports/catalog")).Body!.AsArray().Single(r => r!["key"]!.GetValue<string>() == "cases")!;
        var options = catalog["filters"]!.AsArray().Single(x => x!["key"]!.GetValue<string>() == "status")!["options"]!.AsArray().Select(o => o!.GetValue<string>()).ToList();

        // The same configured list as the ticket register's choices (active values, as code:<StatusCode>), after the three aggregates.
        var active = (await m.Get("/admin/lookups")).Body!.AsArray().Where(l => l!["listName"]!.GetValue<string>() == CaseStatuses.List && !l["isRetired"]!.GetValue<bool>())
            .Select(l => "code:" + l!["code"]!.GetValue<string>()).ToHashSet();
        Assert.Equal(["open", "all", "done"], options.Take(3));
        Assert.Equal(active, options.Skip(3).ToHashSet());
        foreach (var code in new[] { "WaitingForCustomer", "Reopened", custom.Code }) Assert.Contains("code:" + code, options);
        // Bare stage names are no longer offered (two "Open"-looking choices were the defect).
        foreach (var stage in Enum.GetNames<CaseStatus>()) Assert.DoesNotContain(stage, options);
    }

    [Fact]
    public async Task Bug006_a_configured_status_filters_the_same_tickets_as_the_register_in_preview_export_and_presets()
    {
        var m = await Hub.As(HubFactory.Manager);
        var f = await SameStageFixtureAsync(m);
        var refs = new Dictionary<long, string>();
        foreach (var id in new[] { f.Plain, f.Waiting, f.Custom }) refs[id] = Ref((await m.Get($"/cases/{id}")).Body);

        foreach (var (code, expectedId) in new[] { ("WaitingForCustomer", f.Waiting), ("InProgress", f.Plain), (f.Status.Code, f.Custom) })
        {
            var filters = new { clientId = f.Client.ToString(), status = $"code:{code}" };
            var register = (await m.Get($"/cases?clientId={f.Client}&status=code:{Uri.EscapeDataString(code)}")).Body!["items"]!.AsArray().Select(Ref).ToList();
            var preview = await m.Post("/reports/cases/preview", new { filters });
            Assert.Equal([refs[expectedId]], PreviewRefs(preview));
            Assert.Equal(register, PreviewRefs(preview));          // same row identities as the register at equal scope
            Assert.DoesNotContain("InProgress", preview.Body!["filters"]!.GetValue<string>().Replace($"code:{code}", ""));
        }
        // The waiting ticket keeps the InProgress stage but is not in the configured In-progress bucket.
        Assert.DoesNotContain(refs[f.Waiting], PreviewRefs(await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = "code:InProgress" } })));

        // The filter summary uses the configured label; a renamed label follows.
        var waiting = await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = "code:WaitingForCustomer" } });
        Assert.Contains("Status = Waiting for customer", waiting.Body!["filters"]!.GetValue<string>());
        var renamed = U("Vendor fix pending");
        await RenameAsync(m, f.Status.Id, renamed);
        var custom = await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = $"code:{f.Status.Code}" } });
        Assert.Contains($"Status = {renamed}", custom.Body!["filters"]!.GetValue<string>());

        // Export uses the same validated filter (same rows as the preview).
        var export = await m.Post("/reports/cases/exports", new { filters = new { clientId = f.Client.ToString(), status = "code:WaitingForCustomer" }, format = "csv", columns = new[] { "reference" }, timeZone = "UTC" });
        Assert.Equal(HttpStatusCode.Created, export.Status);
        Assert.Equal(1, export.Body!["rowCount"]!.GetValue<int>());

        // A preset keeps the configured code exactly.
        var preset = await m.Create("/reports/presets", new { report = "cases", name = U("Waiting"), filters = new { clientId = f.Client.ToString(), status = "code:WaitingForCustomer" } });
        var saved = (await m.Get("/reports/presets?report=cases")).Body!.AsArray().Single(p => Id(p) == preset)!;
        Assert.Equal("code:WaitingForCustomer", saved["filters"]!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Bug006_invalid_statuses_are_refused_everywhere_and_older_stage_values_keep_their_meaning()
    {
        var m = await Hub.As(HubFactory.Manager);
        var f = await SameStageFixtureAsync(m);
        foreach (var bad in new[] { "code:NoSuchStatus", "code:", "Waiting for customer", "42", "InProgres" })
        {
            var filters = new { clientId = f.Client.ToString(), status = bad };
            Assert.NotNull((await m.Post("/reports/cases/preview", new { filters })).Error("filters.status"));
            Assert.NotNull((await m.Post("/reports/cases/exports", new { filters, format = "csv", timeZone = "UTC" })).Error("filters.status"));
            Assert.NotNull((await m.Post("/reports/presets", new { report = "cases", name = U("Bad"), filters })).Error("filters.status"));
            Assert.NotNull((await m.Post("/reports/schedules", new { name = U("Bad"), report = "cases", filters, format = "csv", frequency = "Daily", time = "07:00", timeZone = "UTC", recipientIds = new[] { m.UserId } })).Error("filters.status"));
        }

        // A preset or schedule saved before the change can hold a stage name: it still means the stage, and says so.
        var legacy = await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = "InProgress" } });
        Assert.Equal(3, PreviewRefs(legacy).Count);
        Assert.Contains("Stage InProgress (older saved filter", legacy.Body!["filters"]!.GetValue<string>());
        var schedule = await m.Post("/reports/schedules", new { name = U("Legacy stage"), report = "cases", filters = new { clientId = f.Client.ToString(), status = "inprogress" }, format = "csv", frequency = "Daily", time = "07:00", timeZone = "UTC", recipientIds = new[] { m.UserId } });
        Assert.Equal(HttpStatusCode.Created, schedule.Status);
        var stored = (await m.Get($"/reports/schedules/{Id(schedule.Body)}")).Body!["filters"]!["status"]!.GetValue<string>();
        Assert.Equal("InProgress", stored);

        // Aggregates still work.
        Assert.Equal(3, PreviewRefs(await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = "open" } })).Count);
    }

    [Fact]
    public async Task Bug006_a_retired_status_is_not_offered_but_a_saved_filter_naming_it_still_works()
    {
        var m = await Hub.As(HubFactory.Manager);
        var f = await SameStageFixtureAsync(m);
        var l = (await m.Get("/admin/lookups")).Body!.AsArray().First(x => x!["id"]!.GetValue<long>() == f.Status.Id)!;
        Assert.True((await m.Put($"/admin/lookups/{f.Status.Id}", new { listName = CaseStatuses.List, code = f.Status.Code, label = f.Status.Label, description = (string?)null,
            sortOrder = l["sortOrder"]!.GetValue<int>(), category = l["category"]!.GetValue<string>(), isRetired = true }, l["version"]!.GetValue<string>())).Status is HttpStatusCode.NoContent or HttpStatusCode.OK);
        var options = (await m.Get("/reports/catalog")).Body!.AsArray().Single(r => r!["key"]!.GetValue<string>() == "cases")!["filters"]!.AsArray()
            .Single(x => x!["key"]!.GetValue<string>() == "status")!["options"]!.AsArray().Select(o => o!.GetValue<string>());
        Assert.DoesNotContain($"code:{f.Status.Code}", options);
        var preview = await m.Post("/reports/cases/preview", new { filters = new { clientId = f.Client.ToString(), status = $"code:{f.Status.Code}" } });
        Assert.Single(PreviewRefs(preview));
        Assert.Contains("(retired status)", preview.Body!["filters"]!.GetValue<string>());
    }

    [Fact]
    public async Task Bug006_the_catalog_and_preview_keep_their_rights_checks()
    {
        var viewer = await Hub.As(HubFactory.Viewer);
        Assert.Contains((await viewer.Get("/reports/catalog")).Status, new[] { HttpStatusCode.Forbidden, HttpStatusCode.OK });
        var preview = await viewer.Post("/reports/cases/preview", new { filters = new { status = "code:WaitingForCustomer" } });
        if ((await viewer.Get("/reports/catalog")).Status == HttpStatusCode.Forbidden) Assert.Equal(HttpStatusCode.Forbidden, preview.Status);
    }

    // ------------------------------------------------------------------ TIO-BUG-005 ------------------------------------------------------------------

    [Fact]
    public async Task Bug005_masked_exports_say_why_and_hide_columns_while_an_accessible_export_stays_usable()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await NewCase(client);
        // Different columns per file: identical requests within seconds are deduplicated to one job.
        async Task<long> ExportAsync(params string[] columns) => Id((await m.Post("/reports/cases/exports", new { filters = new { clientId = client.ToString(), status = "all" }, format = "csv", columns, timeZone = "UTC" })).Body);
        var unchanged = await ExportAsync("reference", "title");
        var changed = await ExportAsync("reference", "priority");
        var legacy = await ExportAsync("reference", "owner");
        Assert.Equal(3, new[] { unchanged, changed, legacy }.Distinct().Count());
        await Db(db => db.ExportJobs.Where(j => j.Id == changed).ExecuteUpdateAsync(s => s.SetProperty(j => j.AccessFingerprint, "fingerprint-of-earlier-access")));
        await Db(db => db.ExportJobs.Where(j => j.Id == legacy).ExecuteUpdateAsync(s => s.SetProperty(j => j.AccessFingerprint, (string?)null)));

        // Unchanged access: details, columns and download as before.
        var ok = (await m.Get($"/reports/exports/{unchanged}")).Body!;
        Assert.Equal("Available", ok["export"]!["detailsAvailability"]!.GetValue<string>());
        Assert.True(ok["columnsAvailable"]!.GetValue<bool>());
        Assert.Equal(["reference", "title"], ok["columns"]!.AsArray().Select(c => c!.GetValue<string>()));
        Assert.True(ok["export"]!["canDownload"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/reports/exports/{unchanged}/download")).Status);

        // Changed access and legacy files: masked as before, with a safe reason and columns marked unavailable.
        foreach (var (id, reason) in new[] { (changed, "AccessChanged"), (legacy, "LegacyExport") })
        {
            var d = (await m.Get($"/reports/exports/{id}")).Body!;
            Assert.Equal(reason, d["export"]!["detailsAvailability"]!.GetValue<string>());
            Assert.False(d["columnsAvailable"]!.GetValue<bool>());
            Assert.Null(d["columns"]);
            Assert.Null(d["filters"]);
            Assert.Null(d["export"]!["fileName"]);
            Assert.Null(d["export"]!["rowCount"]);
            Assert.Equal("Details unavailable", d["export"]!["filterSummary"]!.GetValue<string>());
            Assert.Equal("Completed", d["export"]!["status"]!.GetValue<string>());        // the historical result is kept
            Assert.NotNull(d["export"]!["expiresAt"]);                                     // and so is the retention date
            Assert.False(d["export"]!["canDownload"]!.GetValue<bool>());
            Assert.DoesNotContain("Client =", d.ToJsonString());                         // the hidden filter summary does not leak
            Assert.Equal(HttpStatusCode.Forbidden, (await m.Get($"/reports/exports/{id}/download")).Status); // the fingerprint check still refuses
        }
        // The history list carries the same category.
        var history = (await m.Get("/reports/exports?pageSize=100")).Body!["items"]!.AsArray();
        Assert.Equal("AccessChanged", history.Single(x => Id(x) == changed)!["detailsAvailability"]!.GetValue<string>());

        // Another person who may see everyone's history (Change history right) sees only "OtherOwner" and no details.
        var admin = await Hub.As(HubFactory.Admin);
        var other = await admin.Get($"/reports/exports/{unchanged}");
        if (other.Status == HttpStatusCode.OK)
        {
            Assert.Equal("OtherOwner", other.Body!["export"]!["detailsAvailability"]!.GetValue<string>());
            Assert.Null(other.Body!["columns"]);
            Assert.False(other.Body!["columnsAvailable"]!.GetValue<bool>());
            Assert.False(other.Body!["export"]!["canDownload"]!.GetValue<bool>());
            Assert.NotEqual(HttpStatusCode.OK, (await admin.Get($"/reports/exports/{unchanged}/download")).Status);
        }
        else Assert.Equal(HttpStatusCode.NotFound, other.Status);
    }
}

/// <summary>TIO-BUG-002: audit values that a browser cannot read exactly are written as text; ordinary values are unchanged.</summary>
public sealed class AuditCaptureTests
{
    [Fact]
    public void Large_64_bit_values_are_written_as_exact_text_and_ordinary_ids_stay_numbers()
    {
        Assert.Equal(42L, HubDbContext.Plain(42L));
        Assert.Equal(HubDbContext.MaxExactJsonInteger, HubDbContext.Plain(HubDbContext.MaxExactJsonInteger));
        Assert.Equal(-HubDbContext.MaxExactJsonInteger, HubDbContext.Plain(-HubDbContext.MaxExactJsonInteger));
        Assert.Equal("9007199254740992", HubDbContext.Plain(HubDbContext.MaxExactJsonInteger + 1));
        Assert.Equal("-9223372036854774808", HubDbContext.Plain(-9223372036854774808L));
        Assert.Equal("9223372036854775807", HubDbContext.Plain(long.MaxValue));
        Assert.Equal(7, HubDbContext.Plain(7));                       // int and other types are not touched
        Assert.Null(HubDbContext.Plain(null));
    }
}
