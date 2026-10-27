using System.IO.Compression;
using System.Net;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Reporting;

namespace TioHub.Tests;

/// <summary>A62: the Reporting Center — catalog, preview, exports (CSV and Excel), history, downloads, presets, schedules and data isolation.</summary>
[Collection("hub")]
public class AC62_ReportingCenter(HubFactory hub) : Scenario(hub)
{
    private async Task<T> Db<T>(Func<HubDbContext, Task<T>> work)
    {
        using var scope = Hub.Services.CreateScope();
        return await work(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    /// <summary>Another engineer. Every role sees every client (owner decision, 19 Oct 2026), so separation here is by ownership of exports.</summary>
    private async Task<(Api Api, long Id)> NewEngineer()
    {
        var admin = await Hub.As(HubFactory.Admin);
        var acct = $@"DEV\{U("eng").ToLowerInvariant()}";
        var id = await admin.Create("/admin/users", new { accountName = acct, displayName = "Fictional Report Engineer", workingTimeZone = "Asia/Dubai", roles = new[] { "Engineer" }, allClients = true, scopes = Array.Empty<object>() });
        return (await Hub.As(acct), id);
    }

    private static async Task<(HttpStatusCode Status, byte[] Bytes, string? Type)> Download(Api a, long id)
    {
        var r = await a.Http.GetAsync($"/api/v1/reports/exports/{id}/download");
        return (r.StatusCode, await r.Content.ReadAsByteArrayAsync(), r.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Catalog_preview_and_filters_are_validated_and_scoped()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/reports/catalog")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Post("/reports/cases/preview", new { })).Status);

        // The catalog: the eight existing exports plus the operational reports, each with filters, columns and formats.
        var catalog = (await m.Get("/reports/catalog")).Body!.AsArray();
        var keys = catalog.Select(r => r!["key"]!.GetValue<string>()).ToList();
        foreach (var k in new[] { "cases", "commitments", "actions", "environments", "versions", "assets", "data-quality", "contracts", "sla-compliance", "commitment-performance", "case-aging", "team-workload", "client-health" })
            Assert.Contains(k, keys);
        var cases = catalog.First(r => r!["key"]!.GetValue<string>() == "cases")!;
        Assert.Equal("Operations", cases["category"]!.GetValue<string>());
        Assert.False(cases["formats"]!.AsArray().First(f => f!["key"]!.GetValue<string>() == "pdf")!["available"]!.GetValue<bool>());
        Assert.Contains(cases["filters"]!.AsArray(), f => f!["key"]!.GetValue<string>() == "createdFrom" && f["rangeEnd"]!.GetValue<string>() == "createdTo");
        Assert.Equal(catalog.Count, (await m.Get("/reports/summary")).Body!["availableReports"]!.GetValue<int>());

        var c = await NewClient();
        var other = await NewClient();
        await NewCase(c); await NewCase(c); await NewCase(other);

        // Server-side paging: total and one page of rows, with column definitions and the evaluation time zone.
        var p = (await m.Post("/reports/cases/preview", new { filters = new { clientId = c.ToString(), status = "all" }, pageSize = 1, timeZone = "Asia/Dubai" })).Body!;
        Assert.Equal(2, p["total"]!.GetValue<int>());
        Assert.Single(p["rows"]!.AsArray());
        Assert.Equal("Asia/Dubai", p["timeZone"]!.GetValue<string>());
        Assert.Equal("reference", p["columns"]!.AsArray()[0]!["key"]!.GetValue<string>());
        Assert.Contains("Client = ", p["filters"]!.GetValue<string>());

        // Filter validation: unknown keys, dates, ranges, options.
        Assert.NotNull((await m.Post("/reports/cases/preview", new { filters = new { bogus = "1" } })).Error("filters.bogus"));
        Assert.NotNull((await m.Post("/reports/cases/preview", new { filters = new { createdFrom = "31/12/2026" } })).Error("filters.createdFrom"));
        Assert.NotNull((await m.Post("/reports/cases/preview", new { filters = new { createdFrom = "2026-10-02", createdTo = "2026-10-01" } })).Error("filters.createdTo"));
        Assert.NotNull((await m.Post("/reports/cases/preview", new { filters = new { priority = "Urgent" } })).Error("filters.priority"));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post("/reports/nothing/preview", new { })).Status);

        // The client filter narrows to that client's rows only (scope filters apply underneath, as on the screens).
        var mine = (await m.Post("/reports/cases/preview", new { filters = new { clientId = other.ToString(), status = "all" }, pageSize = 100 })).Body!;
        var otherCode = (await m.Get($"/clients/{other}")).Body!["code"]!.GetValue<string>();
        Assert.Equal(1, mine["total"]!.GetValue<int>());
        Assert.All(mine["rows"]!.AsArray(), r => Assert.Equal(otherCode, r![4]!.GetValue<string>()));

        // Operational reports compute their KPIs on the server.
        var aging = (await m.Post("/reports/case-aging/preview", new { filters = new { clientId = c.ToString() } })).Body!;
        Assert.Equal(2, aging["total"]!.GetValue<int>());
        Assert.Equal("2", aging["summary"]!.AsArray().First(x => x!["label"]!.GetValue<string>() == "Open cases")!["value"]!.GetValue<string>());
        Assert.Contains(aging["breakdowns"]!.AsArray(), b => b!["title"]!.GetValue<string>() == "Age buckets");
        var health = (await m.Post("/reports/client-health/preview", new { filters = new { clientId = c.ToString() } })).Body!;
        Assert.Equal(1, health["total"]!.GetValue<int>());
        Assert.Equal(2, health["rows"]!.AsArray()[0]![2]!.GetValue<int>());
        var sla = (await m.Post("/reports/sla-compliance/preview", new { filters = new { clientId = c.ToString() } })).Body!;
        Assert.Equal(0, sla["total"]!.GetValue<int>());
        Assert.Equal("Not available", sla["summary"]!.AsArray().First(x => x!["label"]!.GetValue<string>() == "Response compliance")!["value"]!.GetValue<string>());
        foreach (var k in new[] { "commitment-performance", "team-workload", "actions", "environments", "versions", "assets", "data-quality", "contracts", "commitments" })
            Assert.Equal(HttpStatusCode.OK, (await m.Post($"/reports/{k}/preview", new { filters = new { clientId = c.ToString() } })).Status);
    }

    [Fact]
    public async Task Case_export_and_preview_use_the_list_evaluation_time()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        await NewCase(c);
        var now = DateTimeOffset.UtcNow;
        await Db(db => db.Cases.Where(x => x.ClientId == c).ExecuteUpdateAsync(s => s.SetProperty(x => x.DueAt, now.AddDays(-1))));
        var asOf = now.AddDays(-2).ToString("O");
        var filters = new { clientId = c.ToString(), due = "overdue", asOf };
        var list = await m.Get($"/cases?clientId={c}&due=overdue&asOf={Uri.EscapeDataString(asOf)}");
        Assert.Equal(0, list.Total);
        var preview = (await m.Post("/reports/cases/preview", new { filters })).Body!;
        Assert.Equal(0, preview["total"]!.GetValue<int>());
        var historical = (await m.Post("/reports/cases/exports", new { filters, format = "csv" })).Body!;
        Assert.Equal(0, historical["rowCount"]!.GetValue<int>());
        Assert.True(historical["requestedAt"]!.GetValue<DateTimeOffset>() >= now);
        var current = (await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString(), due = "overdue" }, format = "csv" })).Body!;
        Assert.Equal(1, current["rowCount"]!.GetValue<int>());
    }

    [Fact]
    public async Task Exports_are_generated_kept_downloaded_only_by_their_owner_retried_and_expired()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e2 = await Hub.As(HubFactory.Engineer2);
        var c = await NewClient();
        await NewCase(c); await NewCase(c);
        var (scoped, _) = await NewEngineer();

        // CSV with chosen columns in the chosen order.
        var csv = await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString(), status = "all" }, format = "csv", columns = new[] { "title", "reference" }, timeZone = "Asia/Dubai" });
        Assert.Equal(HttpStatusCode.Created, csv.Status);
        var job = csv.Body!;
        Assert.Equal("Completed", job["status"]!.GetValue<string>());
        Assert.Equal(2, job["rowCount"]!.GetValue<int>());
        Assert.True(job["canDownload"]!.GetValue<bool>());
        Assert.Matches(@"^tio-hub-cases-\d{8}-\d{4}\.csv$", job["fileName"]!.GetValue<string>());
        var id = Id(job);
        // A second identical request straight away is the same export (double click).
        Assert.Equal(id, Id((await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString(), status = "all" }, format = "csv", columns = new[] { "title", "reference" }, timeZone = "Asia/Dubai" })).Body));
        var utcJob = (await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString(), status = "all" }, format = "csv", columns = new[] { "title", "reference" }, timeZone = "UTC" })).Body!;
        Assert.NotEqual(id, Id(utcJob));
        Assert.Contains("Time zone,UTC", Encoding.UTF8.GetString((await Download(m, Id(utcJob))).Bytes));
        var (status, bytes, type) = await Download(m, id);
        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal("text/csv", type);
        var text = Encoding.UTF8.GetString(bytes);
        Assert.Contains("TIO Operations Hub export,Cases report", text);
        Assert.Contains("Time zone,Asia/Dubai", text);
        var lines = text.Split("\r\n", StringSplitOptions.None).Select(l => l.TrimEnd('\n')).ToList();
        var header = lines.FindIndex(l => l == "Title,Reference");
        Assert.True(header > 0, text);
        Assert.Equal(2, lines.Skip(header + 1).Count(l => l.Length > 0));

        // Only the owner downloads; someone else gets "not found" (no existence leak), also with the Audit permission.
        Assert.Equal(HttpStatusCode.NotFound, (await Download(scoped, id)).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await Download(e2, id)).Status);

        // Excel: a real workbook with the rows, a summary sheet for operational reports and an "About this export" sheet.
        var xlsx = (await m.Post("/reports/case-aging/exports", new { filters = new { clientId = c.ToString() }, format = "xlsx" })).Body!;
        Assert.Equal("Completed", xlsx["status"]!.GetValue<string>());
        var (xs, xb, xt) = await Download(m, Id(xlsx));
        Assert.Equal(HttpStatusCode.OK, xs);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xt);
        using (var zip = new ZipArchive(new MemoryStream(xb)))
        {
            string Read(string n) { using var r = new StreamReader(zip.GetEntry(n)!.Open()); return r.ReadToEnd(); }
            var wb = Read("xl/workbook.xml");
            Assert.Contains("Summary", wb);
            Assert.Contains("About this export", wb);
            var sheet = Read("xl/worksheets/sheet1.xml");
            Assert.Contains("<t xml:space=\"preserve\">Reference</t>", sheet);
            Assert.Equal(3, System.Text.RegularExpressions.Regex.Matches(sheet, "<row ").Count);
            Assert.Contains("Age buckets", Read("xl/worksheets/sheet2.xml"));
        }
        Assert.NotNull((await m.Post("/reports/cases/exports", new { format = "pdf" })).Error("format"));
        Assert.NotNull((await m.Post("/reports/cases/exports", new { format = "csv", columns = new[] { "nope" } })).Error("columns"));

        // A list-page export (the CSV buttons on the lists) still works and is in the history.
        var legacy = await m.Http.GetAsync($"/api/v1/export/cases?clientId={c}&status=all");
        Assert.Equal(HttpStatusCode.OK, legacy.StatusCode);
        Assert.Contains("Column: Reference", await legacy.Content.ReadAsStringAsync());

        // History: own exports, newest first, paged; another user does not see them; the Audit permission shows them without download.
        var hist = (await m.Get("/reports/exports?pageSize=5")).Body!;
        Assert.True(hist["totalCount"]!.GetValue<int>() >= 3);
        Assert.Equal("List export", hist["items"]!.AsArray()[0]!["source"]!.GetValue<string>());
        Assert.DoesNotContain((await scoped.Get("/reports/exports?pageSize=100")).Body!["items"]!.AsArray(), x => Id(x) == id);
        var audit = (await e2.Get("/reports/exports?scope=all&pageSize=200")).Body!["items"]!.AsArray().First(x => Id(x) == id)!;
        Assert.False(audit["canDownload"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.OK, (await m.Get("/reports/exports?report=cases&status=Completed&sort=-rows")).Status);
        Assert.Contains((await m.Get("/admin/audit?action=Export&pageSize=20")).Body!["items"]!.AsArray(), a => a!["changes"]?.ToJsonString().Contains(job["auditId"]!.GetValue<string>()) == true);

        // Row limit: a too-large export fails with a clear message and can be retried once the limit allows it.
        var opts = Hub.Services.GetRequiredService<IOptions<ReportingOptions>>().Value;
        var max = opts.MaxRows;
        opts.MaxRows = 1;
        Res big;
        try { big = await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString(), status = "all" }, format = "xlsx" }); }
        finally { opts.MaxRows = max; }
        Assert.Equal("Failed", big.Body!["status"]!.GetValue<string>());
        Assert.Contains("at most 1", big.Body["error"]!.GetValue<string>());
        Assert.True(big.Body["canRetry"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Post($"/reports/exports/{Id(big.Body)}/retry")).Status);
        var retried = (await m.Post($"/reports/exports/{Id(big.Body)}/retry")).Body!;
        Assert.Equal("Completed", retried["status"]!.GetValue<string>());
        Assert.Equal(Id(big.Body), retried["retryOfId"]!.GetValue<long>());
        Assert.NotNull((await m.Post($"/reports/exports/{id}/retry")).Error("status"));
        Assert.True((await m.Get("/reports/summary")).Body!["failedExports"]!.GetValue<int>() >= 1);

        // Retention: an expired file is removed, the history keeps the record, and the download says so.
        await Db(db => db.ExportJobs.Where(j => j.Id == id).ExecuteUpdateAsync(s => s.SetProperty(j => j.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1))));
        using (var scope = Hub.Services.CreateScope())
            Assert.True(await ReportScheduler.CleanUpAsync(scope.ServiceProvider.GetRequiredService<HubDbContext>(), scope.ServiceProvider.GetRequiredService<ExportStore>(), DateTimeOffset.UtcNow, CancellationToken.None) >= 1);
        Assert.Equal(HttpStatusCode.Gone, (await Download(m, id)).Status);
        Assert.Equal("Expired", (await m.Get($"/reports/exports/{id}")).Body!["export"]!["status"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Unavailable_downloads_enable_retry_without_scheduler_cleanup(bool expired)
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        await NewCase(c);
        var job = (await m.Post("/reports/cases/exports", new { filters = new { clientId = c.ToString() }, format = "csv" })).Body!;
        var id = Id(job);
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var row = await db.ExportJobs.SingleAsync(j => j.Id == id);
            if (expired) row.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            else scope.ServiceProvider.GetRequiredService<ExportStore>().Delete(row.StoredPath!);
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Gone, (await Download(m, id)).Status);
        var details = (await m.Get($"/reports/exports/{id}")).Body!["export"]!;
        Assert.Equal("Expired", details["status"]!.GetValue<string>());
        Assert.True(details["canRetry"]!.GetValue<bool>());
        Assert.False(details["canDownload"]!.GetValue<bool>());
        var retry = (await m.Post($"/reports/exports/{id}/retry")).Body!;
        Assert.Equal("Completed", retry["status"]!.GetValue<string>());
        Assert.Equal(id, retry["retryOfId"]!.GetValue<long>());
        Assert.Equal(HttpStatusCode.OK, (await Download(m, Id(retry))).Status);
    }

    [Fact]
    public async Task Cancelled_generation_persists_a_retryable_failed_job()
    {
        var m = await Hub.As(HubFactory.Manager);
        using var scope = Hub.Services.CreateScope();
        var sp = scope.ServiceProvider;
        sp.GetRequiredService<TioHub.Api.Security.UserContext>().Set(
            (await sp.GetRequiredService<TioHub.Api.Security.UserResolver>().ForUserAsync(m.UserId, CancellationToken.None))!);
        using var cancel = new CancellationTokenSource();
        var def = new TableReport<string>
        {
            Key = "cases", Name = "Cancelled cases", Category = "Operations", Description = "Test", Icon = "case",
            Cols = [new("Reference", "Reference", r => r)],
            Load = (_, _) => { cancel.Cancel(); throw new OperationCanceledException(cancel.Token); }
        };
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => sp.GetRequiredService<ExportService>().ExportAsync(
            def, new ValidFilters(new(), ""), ExportFormat.Csv, null, TimeZoneInfo.Utc, "Test", null, -1, cancel.Token));
        var db = sp.GetRequiredService<HubDbContext>();
        db.ChangeTracker.Clear();
        var row = await db.ExportJobs.SingleAsync(j => j.ReportName == "Cancelled cases");
        Assert.Equal(ExportStatus.Failed, row.Status);
        Assert.NotNull(row.CompletedAt);
        Assert.Contains("cancelled", row.Error);
        var retry = (await m.Post($"/reports/exports/{row.Id}/retry")).Body!;
        Assert.Equal("Completed", retry["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Presets_and_schedules_belong_to_their_owner_and_runs_use_each_recipients_access()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var other = await NewClient();
        await NewCase(c); await NewCase(c);
        var (scoped, scopedId) = await NewEngineer();
        var (_, leaverId) = await NewEngineer();

        // Presets: private, unique per report and name, validated like any filter.
        var preset = await m.Create("/reports/presets", new { report = "cases", name = "My client, all", filters = new { clientId = c.ToString(), status = "all" } });
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/reports/presets", new { report = "cases", name = "My client, all", filters = new { status = "all" } })).Status);
        Assert.NotNull((await m.Post("/reports/presets", new { report = "cases", name = "Bad", filters = new { createdFrom = "x" } })).Error("filters.createdFrom"));
        Assert.Contains((await m.Get("/reports/presets?report=cases")).Body!.AsArray(), p => Id(p) == preset);
        Assert.DoesNotContain((await scoped.Get("/reports/presets")).Body!.AsArray(), p => Id(p) == preset);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Send(HttpMethod.Delete, $"/reports/presets/{preset}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/reports/presets/{preset}")).Status);

        // Schedule validation.
        var body = new { name = "Weekly client cases", report = "cases", filters = new { clientId = c.ToString(), status = "all" }, format = "xlsx", frequency = "Weekly", dayOfWeek = 0, time = "07:30", timeZone = "Asia/Dubai", recipientIds = new[] { m.UserId, scoped.UserId, leaverId } };
        Assert.Equal(HttpStatusCode.Created, (await m.Post("/reports/schedules", body)).Status);
        var bad = await m.Post("/reports/schedules", new { name = "x", report = "cases", format = "csv", frequency = "Weekly", time = "25:00", timeZone = "Nowhere", recipientIds = new[] { 999999L } });
        Assert.NotNull(bad.Error("dayOfWeek"));
        Assert.NotNull(bad.Error("time"));
        Assert.NotNull(bad.Error("timeZone"));
        Assert.NotNull(bad.Error("recipientIds"));
        var list = (await m.Get("/reports/schedules")).Body!.AsArray();
        var sched = list.First(s => s!["name"]!.GetValue<string>() == "Weekly client cases")!;
        var sid = Id(sched);
        Assert.True(sched["nextRunAt"]!.GetValue<DateTimeOffset>() > DateTimeOffset.UtcNow);
        Assert.Equal(DayOfWeek.Sunday, TimeZoneInfo.ConvertTime(sched["nextRunAt"]!.GetValue<DateTimeOffset>(), TimeZoneInfo.FindSystemTimeZoneById("Asia/Dubai")).DayOfWeek);
        Assert.Equal((await m.Get("/reports/summary")).Body!["scheduledReports"]!.GetValue<int>(), list.Count(s => s!["isActive"]!.GetValue<bool>()));
        // Other users cannot see or change it.
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Get($"/reports/schedules/{sid}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Post($"/reports/schedules/{sid}/pause")).Status);

        // Run it now: each recipient gets a file made with their own access, checked at run time. A recipient deactivated since the
        // schedule was made gets a failed run, not a file.
        var admin = await Hub.As(HubFactory.Admin);
        Assert.Equal(HttpStatusCode.OK, (await admin.Post($"/admin/users/{leaverId}/deactivate", new { reason = "Left (fictional)" }, (await admin.Get($"/admin/users/{leaverId}")).ETag)).Status);
        await Db(db => db.ReportSchedules.Where(s => s.Id == sid).ExecuteUpdateAsync(s => s.SetProperty(x => x.NextRunAt, DateTimeOffset.UtcNow.AddMinutes(-1))));
        Assert.True(await ReportScheduler.RunDueAsync(Hub.Services.GetRequiredService<IServiceScopeFactory>(), DateTimeOffset.UtcNow, CancellationToken.None) >= 1);
        var runs = (await m.Get($"/reports/schedules/{sid}/runs")).Body!["items"]!.AsArray();
        Assert.Equal(3, runs.Count);
        var ownRun = runs.First(r => r!["canDownload"]!.GetValue<bool>())!;
        Assert.Equal(2, ownRun["rowCount"]!.GetValue<int>());
        Assert.Equal("Schedule", ownRun["source"]!.GetValue<string>());
        // The other recipient's file is theirs: the owner sees the run but cannot download it.
        var theirs = runs.First(r => r!["user"]!.GetValue<string>() == "Fictional Report Engineer" && r["status"]!.GetValue<string>() == "Completed")!;
        Assert.False(theirs["canDownload"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NotFound, (await Download(m, Id(theirs))).Status);
        Assert.Equal(HttpStatusCode.OK, (await Download(scoped, Id(theirs))).Status);
        var refused = runs.First(r => r!["status"]!.GetValue<string>() == "Failed")!;
        Assert.Contains("not an active hub user", refused["error"]!.GetValue<string>());
        Assert.Contains((await m.Get("/notifications?pageSize=50")).Body!["items"]!.AsArray(), n => n!["title"]!.GetValue<string>() == "Scheduled report ready: Weekly client cases");
        Assert.Contains((await scoped.Get("/notifications?pageSize=50")).Body!["items"]!.AsArray(), n => n!["title"]!.GetValue<string>() == "Scheduled report ready: Weekly client cases");
        var after = (await m.Get($"/reports/schedules/{sid}")).Body!["schedule"]!;
        Assert.Equal("2 completed, 1 failed", after["lastOutcome"]!.GetValue<string>());
        Assert.True(after["nextRunAt"]!.GetValue<DateTimeOffset>() > DateTimeOffset.UtcNow);

        // Filters can become invalid after a schedule is saved. The failure notification must link to its persisted run.
        var invalidScheduleId = await m.Create("/reports/schedules", new { name = "Invalid filters", report = "cases", format = "csv", frequency = "Daily", time = "07:30", timeZone = "UTC", recipientIds = new[] { scoped.UserId } });
        await Db(db => db.ReportSchedules.Where(s => s.Id == invalidScheduleId).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.FiltersJson, "{\"priority\":\"Invalid\"}")
            .SetProperty(x => x.NextRunAt, DateTimeOffset.UtcNow.AddMinutes(-1))));
        await ReportScheduler.RunDueAsync(Hub.Services.GetRequiredService<IServiceScopeFactory>(), DateTimeOffset.UtcNow, CancellationToken.None);
        var failedRuns = (await m.Get($"/reports/schedules/{invalidScheduleId}/runs")).Body!["items"]!.AsArray();
        var invalidRun = failedRuns.First(r => r!["error"]?.GetValue<string>().Contains("filters are not valid") == true && r["user"]!.GetValue<string>() == "Fictional Report Engineer")!;
        Assert.True(Id(invalidRun) > 0);
        Assert.Contains((await scoped.Get("/notifications?pageSize=50")).Body!["items"]!.AsArray(),
            n => n!["title"]!.GetValue<string>() == "Scheduled report failed: Invalid filters"
                && n["link"]!.GetValue<string>() == $"/reporting-center?tab=history&export={Id(invalidRun)}");
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/reports/schedules/{invalidScheduleId}")).Status);

        // Pause, resume, edit, delete.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/reports/schedules/{sid}/pause")).Status);
        Assert.False((await m.Get($"/reports/schedules/{sid}")).Body!["schedule"]!["isActive"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/reports/schedules/{sid}/resume")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/reports/schedules/{sid}", new { name = "Monthly client cases", report = "cases", filters = new { clientId = c.ToString() }, format = "csv", frequency = "Monthly", dayOfMonth = 1, time = "06:00", timeZone = "UTC", recipientIds = new[] { m.UserId } })).Status);
        var edited = (await m.Get($"/reports/schedules/{sid}")).Body!["schedule"]!;
        Assert.Equal(1, edited["recipients"]!.AsArray().Count);
        Assert.Equal(1, edited["nextRunAt"]!.GetValue<DateTimeOffset>().UtcDateTime.Day);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/reports/schedules/{sid}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/reports/schedules/{sid}")).Status);
    }
}

/// <summary>A62: schedule times and the workbook writer (no database).</summary>
public class ReportingUnitTests
{
    private static readonly TimeZoneInfo Dubai = TimeZoneInfo.FindSystemTimeZoneById("Asia/Dubai");
    private static readonly TimeZoneInfo Berlin = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");

    [Fact]
    public void Schedules_run_at_the_local_time_daily_weekly_and_monthly()
    {
        var after = new DateTimeOffset(2026, 10, 22, 4, 0, 0, TimeSpan.Zero); // Thursday 08:00 in Dubai
        Assert.Equal(new DateTimeOffset(2026, 10, 22, 5, 30, 0, TimeSpan.Zero), ScheduleClock.Next(ScheduleFrequency.Daily, null, null, new TimeOnly(9, 30), Dubai, after));
        Assert.Equal(new DateTimeOffset(2026, 10, 23, 3, 0, 0, TimeSpan.Zero), ScheduleClock.Next(ScheduleFrequency.Daily, null, null, new TimeOnly(7, 0), Dubai, after)); // 07:00 passed today
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 3, 0, 0, TimeSpan.Zero), ScheduleClock.Next(ScheduleFrequency.Weekly, 0, null, new TimeOnly(7, 0), Dubai, after)); // next Sunday
        Assert.Equal(new DateTimeOffset(2026, 11, 1, 2, 0, 0, TimeSpan.Zero), ScheduleClock.Next(ScheduleFrequency.Monthly, null, 1, new TimeOnly(6, 0), Dubai, after));
        // Berlin leaves summer time on 25 Oct 2026: 08:00 local is 06:00 UTC before and 07:00 UTC after.
        var b = new DateTimeOffset(2026, 10, 24, 12, 0, 0, TimeSpan.Zero);
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 7, 0, 0, TimeSpan.Zero), ScheduleClock.Next(ScheduleFrequency.Daily, null, null, new TimeOnly(8, 0), Berlin, b));
    }

    [Fact]
    public void Workbook_cells_are_text_or_numbers_and_never_formulas()
    {
        Assert.Equal("A", Xlsx.Column(0));
        Assert.Equal("Z", Xlsx.Column(25));
        Assert.Equal("AA", Xlsx.Column(26));
        var bytes = Xlsx.Build([new XlsxSheet("Data: [x]", ["Name", "Count"], [new object?[] { "=HYPERLINK(\"x\")", 3 }, new object?[] { "a\u0001b & <c>", true }])]);
        using var zip = new ZipArchive(new MemoryStream(bytes));
        using var r = new StreamReader(zip.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var xml = r.ReadToEnd();
        Assert.DoesNotContain("<f>", xml);
        Assert.Contains("<t xml:space=\"preserve\">=HYPERLINK(&quot;x&quot;)</t>", xml);
        Assert.Contains("<v>3</v>", xml);
        Assert.Contains("ab &amp; &lt;c&gt;", xml);
        using var w = new StreamReader(zip.GetEntry("xl/workbook.xml")!.Open());
        Assert.Contains("name=\"Data x\"", w.ReadToEnd());
    }
}
