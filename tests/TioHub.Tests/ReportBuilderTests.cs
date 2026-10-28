using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;
using TioHub.Api.Modules.Reporting;

namespace TioHub.Tests;

/// <summary>A70: the Cases Report Builder — metadata, validated filters, preview, asynchronous exports, saved reports and schedules.</summary>
[Collection("hub")]
public class ReportBuilderTests(HubFactory hub) : Scenario(hub)
{
    private Task<int> Work() => ExportWorker.RunAllAsync(Hub.Services.GetRequiredService<IServiceScopeFactory>(), CancellationToken.None);

    private async Task Db(Func<HubDbContext, Task> action)
    {
        using var scope = Hub.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private async Task<long> Case(long client, string title, string priority)
    {
        var m = await Hub.As(HubFactory.Manager);
        return await m.Create("/cases", new
        {
            title, type = "Incident", scope = "Client", clientId = client, responsibleTeamId = await Team(), impactSummary = "Report builder test", priority,
            ownerUserId = m.UserId, nextAction = "Check", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
    }

    private static object Definition(long client, object? extra = null, string[]? columns = null, object[]? sort = null) => new
    {
        schemaVersion = 1,
        filters = extra ?? new { clientIds = new[] { client } },
        columns = columns ?? ["caseId", "title", "priority", "status", "clientCode"],
        sort = sort ?? [new { field = "priority", direction = "asc" }, new { field = "caseId", direction = "asc" }]
    };

    private static List<string> Titles(Res r, int column = 1) => r.Body!["rows"]!.AsArray().Select(x => x!["cells"]![column]!.GetValue<string>()).ToList();

    [Fact]
    public async Task Metadata_lists_allowlisted_fields_and_the_export_limits_and_needs_the_export_permission()
    {
        var m = await Hub.As(HubFactory.Manager);
        var meta = await m.Get("/reporting/report-types/cases");
        Assert.Equal(HttpStatusCode.OK, meta.Status);
        var keys = meta.Body!["fields"]!.AsArray().Select(f => f!["key"]!.GetValue<string>()).ToList();
        Assert.Contains("caseId", keys);
        Assert.Contains("slaStatus", keys);
        Assert.Equal(100_000, meta.Body["limits"]!["maxRows"]!.GetValue<int>());
        Assert.Equal(14, meta.Body["limits"]!["retentionDays"]!.GetValue<int>());
        var filters = await m.Get("/reporting/report-types/cases/filters");
        Assert.NotEmpty(filters.Body!["clients"]!.AsArray());
        var viewer = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Get("/reporting/report-types/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Post("/reporting/reports/cases/preview", new { definition = new { } })).Status);
    }

    [Fact]
    public async Task Preview_applies_basic_and_nested_conditions_with_the_chosen_columns_order_and_stable_paging()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var tag = U("RB");
        await Case(client, $"{tag} critical one", "Critical");
        await Case(client, $"{tag} normal one", "Normal");
        await Case(client, $"{tag} low special", "Low");
        await Case(client, $"{tag} low plain", "Low");

        var basic = await m.Post("/reporting/reports/cases/preview", new { definition = Definition(client, new { clientIds = new[] { client }, priorities = new[] { "Critical", "Low" } }) });
        Assert.Equal(HttpStatusCode.OK, basic.Status);
        Assert.Equal(3, basic.Body!["total"]!.GetValue<int>());
        Assert.Equal(["caseId", "title", "priority", "status", "clientCode"], basic.Body["columns"]!.AsArray().Select(c => c!["key"]!.GetValue<string>()));
        Assert.Equal($"{tag} critical one", Titles(basic)[0]);

        // (priority = Critical) OR (title contains "special" AND priority = Low)
        var nested = new
        {
            clientIds = new[] { client },
            conditions = new
            {
                op = "or", rules = new object[]
                {
                    new { field = "priority", @operator = "in", value = new[] { "Critical" } },
                    new { op = "and", rules = new object[] { new { field = "title", @operator = "contains", value = "special" }, new { field = "priority", @operator = "in", value = new[] { "Low" } } } }
                }
            }
        };
        var adv = await m.Post("/reporting/reports/cases/preview", new { definition = Definition(client, nested) });
        Assert.Equal(HttpStatusCode.OK, adv.Status);
        Assert.Equal([$"{tag} critical one", $"{tag} low special"], Titles(adv));

        var page1 = await m.Post("/reporting/reports/cases/preview", new { definition = Definition(client), page = 1, pageSize = 25 });
        Assert.Equal(4, page1.Body!["total"]!.GetValue<int>());
        Assert.Equal(4, page1.Body["summary"]!["byPriority"]!.AsObject().Sum(x => x.Value!.GetValue<int>()));
    }

    [Fact]
    public async Task Definitions_are_validated_against_the_allowlist()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        async Task<Res> Preview(object definition) => await m.Post("/reporting/reports/cases/preview", new { definition });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Preview(Definition(client, columns: ["caseId", "passwordHash"]))).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Preview(Definition(client, columns: ["title"]))).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Preview(Definition(client, sort: [new { field = "nextAction", direction = "asc" }]))).Status);
        var badOp = new { conditions = new { op = "and", rules = new object[] { new { field = "title", @operator = "sql", value = "1=1" } } } };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Preview(Definition(client, badOp))).Status);
        var deep = new { conditions = new { op = "and", rules = new object[] { new { op = "or", rules = new object[] { new { op = "and", rules = new object[] { new { op = "or", rules = new object[] { new { field = "title", @operator = "contains", value = "x" } } } } } } } } } };
        var tooDeep = await Preview(Definition(client, deep));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, tooDeep.Status);
        Assert.Contains("nested", tooDeep.Text);
        var reversed = await Preview(Definition(client, new { dateField = "createdAt", dateRange = new { fromDay = "2026-10-10", toDay = "2026-10-01" } }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, reversed.Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await Preview(Definition(client, new { clientIds = new[] { -5L } }))).Status);
    }

    [Fact]
    public async Task Excel_export_is_queued_then_generated_with_typed_sheets_the_preview_columns_and_no_formulas()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Case(client, "=HYPERLINK(\"http://evil\",\"x\")", "High");
        await Case(client, "Plain title", "Normal");
        var definition = Definition(client, columns: ["caseId", "title", "createdAt", "ageDays", "priority"]);
        var job = await m.Post("/reporting/exports", new { definition, format = "xlsx", options = new { fileName = "cases-ops", includeSummary = true, includeFilters = true, includeMetadata = true }, idempotencyKey = U("K") });
        Assert.True(job.Status == HttpStatusCode.Accepted, job.Text);
        Assert.Equal("Queued", job.Body!["status"]!.GetValue<string>());
        Assert.True(await Work() >= 1);
        var done = await m.Get($"/reporting/exports/{job.Id}");
        Assert.Equal("Completed", done.Body!["status"]!.GetValue<string>());
        Assert.Equal(2, done.Body["rowCount"]!.GetValue<int>());
        Assert.Equal("cases-ops.xlsx", done.Body["fileName"]!.GetValue<string>());

        var file = await m.Http.GetAsync($"/api/v1/reporting/exports/{job.Id}/download");
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        using var zip = new ZipArchive(new MemoryStream(await file.Content.ReadAsByteArrayAsync()));
        string Part(string name) { using var r = new StreamReader(zip.GetEntry(name)!.Open(), Encoding.UTF8); return r.ReadToEnd(); }
        var workbook = Part("xl/workbook.xml");
        foreach (var sheet in new[] { "Cases Data", "Summary", "Applied Filters", "Metadata" }) Assert.Contains($"name=\"{sheet}\"", workbook);
        var data = Part("xl/worksheets/sheet1.xml");
        Assert.DoesNotContain("<f>", data);
        Assert.Contains("HYPERLINK", data);
        Assert.Contains("t=\"inlineStr\"><is><t xml:space=\"preserve\">Case ID</t>", data);
        Assert.True(data.IndexOf(">Title<", StringComparison.Ordinal) < data.IndexOf(">Created<", StringComparison.Ordinal));
        Assert.Contains("s=\"2\"", data);     // created: a real Excel date
        Assert.Contains("<autoFilter", data);
        Assert.Contains("state=\"frozen\"", data);

        await Db(async db => Assert.True(await db.AuditEntries.AnyAsync(a => a.Action == "Export" && a.EntityId == job.Id)));
    }

    [Fact]
    public async Task Pdf_exports_summary_and_detailed_modes()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Case(client, "PDF case", "Critical");
        foreach (var mode in new[] { "summary", "detailed" })
        {
            var job = await m.Post("/reporting/exports", new { definition = Definition(client), format = "pdf", options = new { pdfMode = mode } });
            Assert.Equal(HttpStatusCode.Accepted, job.Status);
            await Work();
            var file = await m.Http.GetAsync($"/api/v1/reporting/exports/{job.Id}/download");
            Assert.Equal("application/pdf", file.Content.Headers.ContentType!.MediaType);
            var bytes = await file.Content.ReadAsByteArrayAsync();
            Assert.Equal("%PDF-1.4", Encoding.ASCII.GetString(bytes, 0, 8));
            var pages = Encoding.ASCII.GetString(bytes).Split("/Type /Page ").Length - 1;
            Assert.Equal(mode == "summary" ? 1 : 2, pages);
        }
    }

    [Fact]
    public async Task Exports_are_idempotent_cancellable_retryable_and_refused_when_empty()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Case(client, "Idempotent", "High");
        var key = U("IDEM");
        var first = await m.Post("/reporting/exports", new { definition = Definition(client), format = "xlsx", idempotencyKey = key });
        var again = await m.Post("/reporting/exports", new { definition = Definition(client), format = "xlsx", idempotencyKey = key });
        Assert.Equal(HttpStatusCode.Accepted, first.Status);
        Assert.Equal(HttpStatusCode.OK, again.Status);
        Assert.Equal(first.Id, again.Id);

        Assert.Equal(HttpStatusCode.Accepted, (await m.Post($"/reporting/exports/{first.Id}/cancel")).Status);
        var cancelled = await m.Get($"/reporting/exports/{first.Id}");
        Assert.Equal("Cancelled", cancelled.Body!["status"]!.GetValue<string>());
        Assert.Equal(0, await Work());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post($"/reporting/exports/{first.Id}/cancel")).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post($"/reports/exports/{first.Id}/retry")).Status);

        var retry = await m.Post($"/reporting/exports/{first.Id}/retry");
        Assert.Equal(HttpStatusCode.Accepted, retry.Status);
        Assert.Equal(first.Id, retry.Body!["retryOfId"]!.GetValue<long>());
        await Work();
        Assert.Equal("Completed", (await m.Get($"/reporting/exports/{retry.Id}")).Body!["status"]!.GetValue<string>());

        var none = await m.Post("/reporting/exports", new { definition = Definition(client, new { clientIds = new[] { client }, q = "no-such-case-" + Guid.NewGuid() }), format = "xlsx" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, none.Status);
        // Another user can neither read nor download nor cancel the job.
        var e = await Hub.As(HubFactory.Engineer);
        Assert.Equal(HttpStatusCode.NotFound, (await e.Get($"/reporting/exports/{retry.Id}/download")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await e.Post($"/reporting/exports/{retry.Id}/cancel")).Status);
    }

    [Fact]
    public async Task Export_jobs_are_revalidated_when_they_run()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Case(client, "Revalidated", "High");
        var job = await m.Post("/reporting/exports", new { definition = Definition(client), format = "xlsx" });
        // The stored definition is tampered with (an unknown column) before the worker runs it: the job fails instead of running unchecked.
        await Db(db => db.ExportJobs.Where(j => j.Id == job.Id).ExecuteUpdateAsync(s => s.SetProperty(j => j.DefinitionJson, "{\"schemaVersion\":1,\"columns\":[\"caseId\",\"secret\"]}")));
        await Work();
        var failed = await m.Get($"/reporting/exports/{job.Id}");
        Assert.Equal("Failed", failed.Body!["status"]!.GetValue<string>());
        Assert.Contains("not valid", failed.Body["error"]!.GetValue<string>());
    }

    [Fact]
    public async Task Saved_reports_are_private_shared_read_only_for_viewers_revisioned_and_sanitized()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var client = await NewClient();
        var name = U("Saved");
        var created = await m.Post("/reporting/report-definitions", new { name, description = "Weekly view", visibility = "Private", definition = Definition(client) });
        Assert.True(created.Status == HttpStatusCode.Created, created.Text);
        var id = created.Id;
        Assert.Equal(HttpStatusCode.NotFound, (await e.Get($"/reporting/report-definitions/{id}")).Status);
        var duplicate = await m.Post("/reporting/report-definitions", new { name, visibility = "Private", definition = Definition(client) });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, duplicate.Status);
        Assert.NotNull(duplicate.Error("name"));

        var share = await m.Put($"/reporting/report-definitions/{id}", new { name, visibility = "Shared", shareUserIds = new[] { e.UserId }, definition = Definition(client), revision = 1 });
        Assert.Equal(HttpStatusCode.OK, share.Status);
        Assert.Equal(2, share.Body!["revision"]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.Conflict, (await m.Put($"/reporting/report-definitions/{id}", new { name, visibility = "Private", definition = Definition(client), revision = 1 })).Status);

        var seen = await e.Get($"/reporting/report-definitions/{id}");
        Assert.Equal(HttpStatusCode.OK, seen.Status);
        Assert.False(seen.Body!["report"]!["isOwner"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Put($"/reporting/report-definitions/{id}", new { name, visibility = "Private", definition = Definition(client), revision = 2 })).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/reporting/report-definitions/{id}/favorite")).Status);
        Assert.Contains((await e.Get("/reporting/report-definitions?scope=favorites")).Body!.AsArray(), r => r!["id"]!.GetValue<long>() == id);
        var copy = await e.Post($"/reporting/report-definitions/{id}/duplicate", new { });
        Assert.Equal(HttpStatusCode.Created, copy.Status);

        // A stored definition with a field that no longer exists opens with a warning and without that field.
        await Db(db => db.SavedReports.Where(r => r.Id == id).ExecuteUpdateAsync(s => s.SetProperty(r => r.DefinitionJson, "{\"schemaVersion\":1,\"columns\":[\"caseId\",\"retiredField\",\"title\"],\"sort\":[{\"field\":\"retiredField\",\"direction\":\"asc\"}]}")));
        var stale = await m.Get($"/reporting/report-definitions/{id}");
        Assert.Equal(["caseId", "title"], stale.Body!["definition"]!["columns"]!.AsArray().Select(c => c!.GetValue<string>()));
        Assert.NotEmpty(stale.Body["warnings"]!.AsArray());

        Assert.Equal(HttpStatusCode.NotFound, (await e.Send(HttpMethod.Delete, $"/reporting/report-definitions/{id}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/reporting/report-definitions/{id}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await e.Get($"/reporting/report-definitions/{id}")).Status);
    }

    [Fact]
    public async Task Scheduled_saved_reports_queue_one_job_per_recipient_and_recheck_access_when_they_run()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var admin = await Hub.As(HubFactory.Admin);
        var noRole = await admin.Create("/admin/users", new { accountName = "DEV\\" + U("temp").ToLowerInvariant(), displayName = "Temp recipient", workingTimeZone = "UTC", roles = new[] { "Engineer" }, allClients = true, scopes = Array.Empty<object>() });
        var client = await NewClient();
        await Case(client, "Scheduled", "High");
        var saved = await m.Post("/reporting/report-definitions", new { name = U("Sched"), visibility = "Private", definition = Definition(client) });
        var schedule = await m.Post("/reporting/schedules", new { savedReportId = saved.Id, name = "Weekly", format = "pdf", options = new { pdfMode = "summary" }, frequency = "Daily", time = "07:00", timeZone = "Asia/Dubai", recipientIds = new[] { m.UserId, e.UserId, noRole } });
        Assert.True(schedule.Status == HttpStatusCode.Created, schedule.Text);
        // The temporary recipient loses every role after the schedule was created: its run fails instead of producing a file.
        await Db(async db =>
        {
            await db.Set<TioHub.Api.Modules.Access.UserRole>().Where(r => r.UserId == noRole).ExecuteDeleteAsync();
            var row = await db.ReportSchedules.SingleAsync(s => s.Id == schedule.Id);
            row.NextRunAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        });
        var badRecipient = await m.Post("/reporting/schedules", new { savedReportId = saved.Id, name = "Weekly 2", format = "xlsx", frequency = "Weekly", dayOfWeek = 1, time = "07:00", timeZone = "Asia/Dubai", recipientIds = new[] { noRole } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badRecipient.Status);
        await ReportScheduler.RunDueAsync(Hub.Services.GetRequiredService<IServiceScopeFactory>(), DateTimeOffset.UtcNow, CancellationToken.None);
        Assert.True(await Work() >= 2);
        await Db(async db =>
        {
            var jobs = await db.ExportJobs.AsNoTracking().Where(j => j.ScheduleId == schedule.Id).ToListAsync();
            Assert.Equal(3, jobs.Count);
            Assert.All(jobs.Where(j => j.UserId != noRole), j => Assert.Equal(ExportStatus.Completed, j.Status));
            Assert.Equal(ExportStatus.Failed, jobs.Single(j => j.UserId == noRole).Status);
            Assert.True(await db.Notifications.AnyAsync(n => n.UserId == e.UserId && n.Title.Contains("Weekly")));
        });
        var patched = await m.Send(new HttpMethod("PATCH"), $"/reporting/schedules/{schedule.Id}", new { name = "Weekly", format = "xlsx", frequency = "Weekly", dayOfWeek = 0, time = "08:00", timeZone = "Asia/Dubai", recipientIds = new[] { m.UserId }, isActive = false });
        Assert.Equal(HttpStatusCode.OK, patched.Status);
        Assert.False(patched.Body!["isActive"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/reports/schedules/{schedule.Id}", new { name = "x", report = "cases", format = "csv", frequency = "Daily", time = "07:00", timeZone = "UTC", recipientIds = new[] { m.UserId } })).Status);
    }

    [Fact]
    public async Task Overview_reports_usage_of_the_callers_exports_only()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Case(client, "Overview", "High");
        await m.Post("/reporting/exports", new { definition = Definition(client), format = "xlsx" });
        await Work();
        var o = await m.Get("/reporting/overview?days=30");
        Assert.Equal(HttpStatusCode.OK, o.Status);
        Assert.Equal(30, o.Body!["perDay"]!.AsArray().Count);
        Assert.True(o.Body["exports"]!["completed"]!.GetValue<int>() >= 1);
        Assert.Equal(13, o.Body["availableReports"]!.GetValue<int>());
    }
}
