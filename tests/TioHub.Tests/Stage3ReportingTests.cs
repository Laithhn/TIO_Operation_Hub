using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Reporting;

namespace TioHub.Tests;

[Collection("hub")]
public class Stage3ReportingTests(HubFactory hub) : Scenario(hub)
{
    private async Task Db(Func<HubDbContext, Task> action)
    {
        using var scope = Hub.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private static object Schedule(string name, string report, object? filters, params long[] recipients) => new
    {
        name, report, filters, format = "csv", frequency = "Daily", time = "07:30", timeZone = "UTC", recipientIds = recipients
    };

    private Task Due(long id, string? filters = null) => Db(async db =>
    {
        var row = await db.ReportSchedules.SingleAsync(s => s.Id == id);
        row.NextRunAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        if (filters is not null) row.FiltersJson = filters;
        await db.SaveChangesAsync();
    });

    private Task<int> Run() => ReportScheduler.RunDueAsync(Hub.Services.GetRequiredService<IServiceScopeFactory>(), DateTimeOffset.UtcNow, CancellationToken.None);

    [Fact]
    public async Task False_waiting_filter_matches_the_list_preview_export_and_saved_filters()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var waiting = await NewCase(client);
        await NewCase(client);
        await Db(db => db.Cases.Where(c => c.Id == waiting).ExecuteUpdateAsync(s => s.SetProperty(c => c.WaitingReason, WaitingReason.Customer)));
        var list = await m.Get($"/cases?clientId={client}&waiting=false");
        Assert.Equal(1, list.Total);
        var filters = new { clientId = client.ToString(), waiting = "false" };
        var preview = await m.Post("/reports/cases/preview", new { filters });
        Assert.Equal(list.Total, preview.Body!["total"]!.GetValue<int>());
        Assert.Contains("No", preview.Body["filters"]!.GetValue<string>());
        var export = await m.Post("/reports/cases/exports", new { filters, format = "csv" });
        Assert.Equal(HttpStatusCode.Created, export.Status);
        Assert.Equal(list.Total, export.Body!["rowCount"]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/export/cases?clientId={client}&waiting=false")).Status);
        await Db(async db =>
        {
            var job = await db.ExportJobs.SingleAsync(j => j.Id == export.Id);
            Assert.Equal("false", JsonSerializer.Deserialize<Dictionary<string, string>>(job.FiltersJson)!["waiting"]);
        });
    }

    [Theory]
    [InlineData("2026-10-02", "2026-10-01", "UTC", false)]
    [InlineData("2026-10-02T10:00:00Z", "2026-10-02T09:59:00Z", "UTC", false)]
    [InlineData("2026-10-02T10:00:00+04:00", "2026-10-02T07:00:00Z", "UTC", true)]
    [InlineData("2026-10-02", "2026-10-01T19:59:00Z", "Asia/Dubai", false)]
    [InlineData("2026-10-02", "2026-10-01T21:00:00Z", "Asia/Dubai", true)]
    [InlineData("2026-10-02T19:00:00Z", "2026-10-02", "Asia/Dubai", true)]
    [InlineData("2026-10-02T21:00:00Z", "2026-10-02", "Asia/Dubai", false)]
    [InlineData("2026-10-02", "2026-10-02", "UTC", true)]
    [InlineData("2026-10-02", "9999-12-31", "UTC", false)]
    public async Task Range_validation_uses_effective_report_bounds_in_the_selected_time_zone(string from, string to, string timeZone, bool valid)
    {
        var m = await Hub.As(HubFactory.Manager);
        var filters = new { clientId = (await NewClient()).ToString(), createdFrom = from, createdTo = to };
        var preview = await m.Post("/reports/cases/preview", new { filters, timeZone });
        var export = await m.Post("/reports/cases/exports", new { filters, timeZone, format = "csv" });
        Assert.Equal(valid ? HttpStatusCode.OK : HttpStatusCode.UnprocessableEntity, preview.Status);
        Assert.Equal(valid ? HttpStatusCode.Created : HttpStatusCode.UnprocessableEntity, export.Status);
        if (!valid) { Assert.NotNull(preview.Error("filters.createdTo")); Assert.NotNull(export.Error("filters.createdTo")); }
    }

    [Fact]
    public async Task Retry_refuses_an_obsolete_saved_filter_instead_of_generating_a_broader_export()
    {
        var m = await Hub.As(HubFactory.Manager);
        var export = await m.Post("/reports/cases/exports", new { format = "csv", filters = new { clientId = (await NewClient()).ToString() } });
        Assert.Equal(HttpStatusCode.Created, export.Status);
        await Db(db => db.ExportJobs.Where(j => j.Id == export.Id).ExecuteUpdateAsync(s => s
            .SetProperty(j => j.Status, ExportStatus.Expired).SetProperty(j => j.FiltersJson, "{\"removedFilter\":\"restrictive-value\"}")));
        var result = await m.Post($"/reports/exports/{export.Id}/retry");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.NotNull(result.Error("filters.removedFilter"));
        await Db(async db => Assert.False(await db.ExportJobs.AnyAsync(j => j.RetryOfId == export.Id)));
    }

    [Fact]
    public async Task Scheduler_records_obsolete_filters_as_failed_and_advances_the_schedule()
    {
        var m = await Hub.As(HubFactory.Manager);
        var name = U("Obsolete");
        var id = await m.Create("/reports/schedules", Schedule(name, "cases", null, m.UserId));
        await Due(id, "{\"removedFilter\":\"restrictive-value\"}");
        await Run();
        var run = Assert.Single((await m.Get($"/reports/schedules/{id}/runs")).Body!["items"]!.AsArray())!;
        Assert.Equal("Failed", run["status"]!.GetValue<string>());
        Assert.Contains("removedFilter", run["error"]!.GetValue<string>());
        Assert.False(run["canDownload"]!.GetValue<bool>());
        var schedule = (await m.Get($"/reports/schedules/{id}")).Body!["schedule"]!;
        Assert.True(schedule["nextRunAt"]!.GetValue<DateTimeOffset>() > DateTimeOffset.UtcNow);
        Assert.Contains((await m.Get("/notifications?pageSize=100")).Body!["items"]!.AsArray(), n => n!["title"]!.GetValue<string>() == $"Scheduled report failed: {name}");
        await m.Send(HttpMethod.Delete, $"/reports/schedules/{id}");
    }

    [Fact]
    public async Task Network_zone_filter_requires_technical_access_for_every_export_path_and_each_schedule_recipient()
    {
        var m = await Hub.As(HubFactory.Manager);
        var roleName = U("ExportOnly");
        var role = await m.Create("/admin/roles", new { name = roleName, rights = new[] { "Export" }, permissions = Array.Empty<string>() });
        var account = $@"DEV\{U("reporter")}";
        var recipientId = await m.Create("/admin/users", new { accountName = account, displayName = "Export without technical details", workingTimeZone = "UTC", roleId = role });
        var recipient = await Hub.As(account);
        var client = await NewClient();
        var env = await NewEnv(client, "Zone regression");
        var zone = U("Zone");
        await m.Create("/admin/lookups", new { listName = "NetworkZone", code = zone, label = "Restricted zone" });
        await m.Create("/assets", new { environmentId = env, name = "Included asset", type = "VM", networkZone = zone, ownerUserId = m.UserId });
        await m.Create("/assets", new { environmentId = env, name = "Excluded asset", type = "VM", ownerUserId = m.UserId });
        var filters = new { clientId = client.ToString(), zone };
        Assert.NotNull((await recipient.Post("/reports/assets/preview", new { filters })).Error("filters.zone"));
        Assert.NotNull((await recipient.Post("/reports/assets/exports", new { filters, format = "csv" })).Error("filters.zone"));
        Assert.NotNull((await recipient.Get($"/export/assets?clientId={client}&zone={zone}")).Error("filters.zone"));
        var id = await m.Create("/reports/schedules", Schedule(U("Zone report"), "assets", filters, recipientId, m.UserId));
        await Due(id);
        await Run();
        var runs = (await m.Get($"/reports/schedules/{id}/runs")).Body!["items"]!.AsArray();
        Assert.Equal(2, runs.Count);
        var failed = Assert.Single(runs, r => r!["status"]!.GetValue<string>() == "Failed")!;
        Assert.Contains("Technical detail", failed["error"]!.GetValue<string>());
        Assert.False(failed["canDownload"]!.GetValue<bool>());
        Assert.Equal(1, Assert.Single(runs, r => r!["status"]!.GetValue<string>() == "Completed")!["rowCount"]!.GetValue<int>());

        // A fresh recipient access calculation must also honor a later Export revocation without blocking other recipients.
        var roleRow = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => r!["id"]!.GetValue<long>() == role)!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/roles/{role}", new { name = roleName, rights = Array.Empty<string>(), permissions = Array.Empty<string>() }, roleRow["version"]!.GetValue<string>())).Status);
        await Due(id);
        await Run();
        await Db(async db =>
        {
            var jobs = await db.ExportJobs.Where(j => j.ScheduleId == id && j.UserId == recipientId).OrderBy(j => j.Id).ToListAsync();
            Assert.Equal(2, jobs.Count);
            Assert.Contains("Export permission", jobs[^1].Error);
            Assert.All(jobs, j => Assert.Null(j.StoredPath));
            var ownJobs = await db.ExportJobs.Where(j => j.ScheduleId == id && j.UserId == m.UserId).ToListAsync();
            Assert.Equal(2, ownJobs.Count);
            foreach (var job in ownJobs)
                Assert.True(await db.Notifications.AnyAsync(n => n.UserId == m.UserId && n.Key == $"report:{id}:{m.UserId}:{job.Id}"));
        });
        await m.Send(HttpMethod.Delete, $"/reports/schedules/{id}");
    }

    [Fact]
    public async Task Invalid_numeric_schedule_frequency_is_rejected()
    {
        var m = await Hub.As(HubFactory.Manager);
        var result = await m.Post("/reports/schedules", new { name = "Invalid frequency", report = "cases", format = "csv", frequency = 99, time = "07:30", timeZone = "UTC", recipientIds = new[] { m.UserId } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.NotNull(result.Error("frequency"));
    }

    [Theory]
    [InlineData("cases", "contractId", "not-a-number")]
    [InlineData("cases", "regionId", "-1")]
    [InlineData("cases", "unassigned", "perhaps")]
    [InlineData("cases", "asOf", "not-a-time")]
    [InlineData("cases", "sla", "unsupported")]
    [InlineData("commitments", "scope", "99")]
    [InlineData("commitments", "type", "99")]
    [InlineData("commitments", "due", "unsupported")]
    [InlineData("contracts", "type", "missing-configured-type")]
    public async Task Malformed_list_only_filters_fail_instead_of_broadening_a_report(string report, string key, string value)
    {
        var m = await Hub.As(HubFactory.Manager);
        var filters = new Dictionary<string, string> { [key] = value };
        var response = await m.Post($"/reports/{report}/preview", new { filters });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.Status);
        Assert.NotNull(response.Error($"filters.{key}"));
        Assert.NotNull((await m.Post($"/reports/{report}/exports", new { filters, format = "csv" })).Error($"filters.{key}"));
    }

    [Fact]
    public async Task Overlapping_scheduler_workers_generate_one_run_per_recipient_for_a_due_occurrence()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await m.Create("/reports/schedules", Schedule(U("Concurrent"), "cases", new { clientId = (await NewClient()).ToString() }, m.UserId));
        await Due(id);
        var counts = await Task.WhenAll(Run(), Run());
        Assert.Equal(1, counts.Sum());
        var run = Assert.Single((await m.Get($"/reports/schedules/{id}/runs")).Body!["items"]!.AsArray())!;
        Assert.Equal("Completed", run["status"]!.GetValue<string>());
        Assert.Equal(0, await Run());
        await m.Send(HttpMethod.Delete, $"/reports/schedules/{id}");
    }

    [Fact]
    public async Task Done_commitments_filter_excludes_open_work_in_lists_and_reports()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var ids = new List<long>();
        foreach (var status in new[] { CommitmentStatus.Open, CommitmentStatus.Completed, CommitmentStatus.Cancelled })
        {
            var id = await m.Create("/commitments", new { scope = "Client", clientId = client, description = U("Status report"), type = "Delivery", ownerUserId = m.UserId,
                dueLocal = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss"), timeZone = "UTC" });
            ids.Add(id);
            if (status != CommitmentStatus.Open) await Db(db => db.Commitments.Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, status)));
        }
        var list = await m.Get($"/commitments?clientId={client}&status=done");
        Assert.Equal(2, list.Total);
        Assert.DoesNotContain(list.Body!["items"]!.AsArray(), item => item!["id"]!.GetValue<long>() == ids[0]);
        var preview = await m.Post("/reports/commitments/preview", new { filters = new { clientId = client.ToString(), status = "done" } });
        Assert.Equal(2, preview.Body!["total"]!.GetValue<int>());
    }
}
