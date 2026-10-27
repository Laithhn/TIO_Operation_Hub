using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Notifications;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A62: the Reporting Center API — catalog, preview, exports and their history, presets and schedules.</summary>
public static class ReportingEndpoints
{
    public sealed record PreviewInput(Dictionary<string, string?>? Filters, int? Page, int? PageSize, string? TimeZone);
    public sealed record ExportInput(Dictionary<string, string?>? Filters, string? Format, List<string>? Columns, string? TimeZone);
    public sealed record PresetInput(string? Report, string? Name, Dictionary<string, string?>? Filters);
    public sealed record ScheduleInput(string? Name, string? Report, Dictionary<string, string?>? Filters, string? Format, ScheduleFrequency? Frequency, int? DayOfWeek, int? DayOfMonth,
        string? Time, string? TimeZone, List<long>? RecipientIds, bool? IsActive);

    private static ExportFormat ParseFormat(string? f) => (f ?? "").ToLowerInvariant() switch
    {
        "csv" => ExportFormat.Csv,
        "xlsx" or "excel" => ExportFormat.Xlsx,
        "pdf" => throw new ValidationException("format", "PDF is not available yet: use CSV or Excel."),
        _ => throw new ValidationException("format", "Choose CSV or Excel.")
    };

    private static ReportDefinition Report(string key) => ReportCatalog.Find(key) ?? throw new NotFoundException("The report");

    private static object Dto(ExportJob j, string? user = null, bool mine = true) => new
    {
        j.Id, j.AuditId, j.Report, j.ReportName, format = j.Format.ToString().ToLowerInvariant(), status = j.Status.ToString(), j.FilterSummary, j.TimeZone,
        j.RequestedAt, j.CompletedAt, j.RowCount, j.FileSize, j.FileName, j.ExpiresAt, j.Error, j.Source, j.ScheduleId, j.RetryOfId, user,
        canDownload = mine && j.Status == ExportStatus.Completed && j.StoredPath != null,
        canRetry = mine && j.Status is ExportStatus.Failed or ExportStatus.Expired
    };

    public static void MapReportingEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/reports").WithTags("Reporting Center");

        g.MapGet("/catalog", (UserContext me) =>
        {
            ExportService.RequireExport(me);
            return Results.Ok(ReportCatalog.All.Select(r => new
            {
                r.Key, r.Name, r.Category, r.Description, r.Icon, r.Operational,
                formats = new[] { new { key = "csv", label = "CSV", available = true, note = (string?)null }, new { key = "xlsx", label = "Excel (.xlsx)", available = true, note = (string?)null },
                    new { key = "pdf", label = "PDF", available = false, note = (string?)"A formatted PDF layout is not available yet." } },
                filters = r.Filters.Select(f => new { f.Key, f.Label, kind = f.Kind.ToString(), f.Advanced, f.Options, f.Hint, f.RangeEnd }),
                columns = r.Columns
            }));
        });

        g.MapGet("/summary", async (HubDbContext db, UserContext me, ExportStore store, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var now = clock.GetUtcNow();
            var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
            var local = TimeZoneInfo.ConvertTime(now, zone).Date;
            var today = new DateTimeOffset(local, zone.GetUtcOffset(local));
            var mine = db.ExportJobs.AsNoTracking().Where(j => j.UserId == me.UserId);
            return Results.Ok(new
            {
                availableReports = ReportCatalog.All.Count,
                exportsToday = await mine.CountAsync(j => j.Status == ExportStatus.Completed && j.RequestedAt >= today, ct),
                scheduledReports = await db.ReportSchedules.AsNoTracking().CountAsync(s => s.OwnerUserId == me.UserId && s.IsActive, ct),
                failedExports = await mine.CountAsync(j => j.Status == ExportStatus.Failed && j.RequestedAt >= now.AddDays(-30), ct),
                retentionDays = store.Options.RetentionDays,
                maxRows = store.Options.MaxRows
            });
        });

        g.MapPost("/{key}/preview", async (string key, PreviewInput input, ExportService svc, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var def = Report(key);
            var f = await svc.ValidateAsync(def, input.Filters, strict: true, ct, svc.ZoneOf(input.TimeZone));
            var page = Math.Max(1, input.Page ?? 1);
            var size = Math.Clamp(input.PageSize ?? 25, 1, 100);
            return Results.Ok(await svc.PreviewAsync(def, f, svc.ZoneOf(input.TimeZone), page, size, ct));
        });

        g.MapPost("/{key}/exports", async (string key, ExportInput input, ExportService svc, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var def = Report(key);
            var format = ParseFormat(input.Format);
            ExportService.CheckColumns(def, input.Columns);
            var f = await svc.ValidateAsync(def, input.Filters, strict: true, ct, svc.ZoneOf(input.TimeZone));
            var job = await svc.ExportAsync(def, f, format, input.Columns, svc.ZoneOf(input.TimeZone), "Reporting Center", null, null, ct);
            return Results.Created($"/api/v1/reports/exports/{job.Id}", Dto(job));
        });

        // History: your own exports; with the Audit permission, everyone's (details only — a file is only ever downloaded by its owner).
        g.MapGet("/exports", async (string? report, string? status, string? from, string? to, long? userId, string? scope, string? sort, int? page, int? pageSize,
            HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var all = scope == "all";
            if (all && !me.Has(Grant.Audit)) throw new ForbiddenException("Viewing everyone's exports needs the Audit permission.");
            var q = db.ExportJobs.AsNoTracking().AsQueryable();
            if (!all) q = q.Where(j => j.UserId == me.UserId);
            else if (userId is not null) q = q.Where(j => j.UserId == userId);
            if (!string.IsNullOrWhiteSpace(report)) q = q.Where(j => j.Report == report);
            if (Enum.TryParse<ExportStatus>(status, true, out var st)) q = q.Where(j => j.Status == st);
            var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
            DateTimeOffset? Day(string? d, int add) => DateOnly.TryParseExact(d, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var x)
                ? new DateTimeOffset(x.AddDays(add).ToDateTime(TimeOnly.MinValue), zone.GetUtcOffset(x.AddDays(add).ToDateTime(TimeOnly.MinValue))) : null;
            if (Day(from, 0) is { } f0) q = q.Where(j => j.RequestedAt >= f0);
            if (Day(to, 1) is { } t1) q = q.Where(j => j.RequestedAt < t1);
            q = sort switch
            {
                "requestedAt" => q.OrderBy(j => j.RequestedAt).ThenBy(j => j.Id),
                "report" => q.OrderBy(j => j.ReportName).ThenByDescending(j => j.Id),
                "-report" => q.OrderByDescending(j => j.ReportName).ThenByDescending(j => j.Id),
                "status" => q.OrderBy(j => j.Status).ThenByDescending(j => j.Id),
                "rows" => q.OrderBy(j => j.RowCount).ThenByDescending(j => j.Id),
                "-rows" => q.OrderByDescending(j => j.RowCount).ThenByDescending(j => j.Id),
                _ => q.OrderByDescending(j => j.RequestedAt).ThenByDescending(j => j.Id)
            };
            var paged = await q.Select(j => new { j, user = db.Users.Where(u => u.Id == j.UserId).Select(u => u.DisplayName).FirstOrDefault() }).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(new Paged<object>(paged.Items.Select(x => Dto(x.j, x.user, x.j.UserId == me.UserId)).ToList(), paged.Page, paged.PageSize, paged.TotalCount));
        });

        g.MapGet("/exports/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            // Someone else's export is "not found" unless the caller holds the Audit permission (no existence leak).
            if (j is null || (j.UserId != me.UserId && !me.Has(Grant.Audit))) throw new NotFoundException("The export");
            var user = await db.Users.AsNoTracking().Where(u => u.Id == j.UserId).Select(u => u.DisplayName).FirstOrDefaultAsync(ct);
            var columns = j.ColumnsJson is null ? null : JsonSerializer.Deserialize<List<string>>(j.ColumnsJson);
            return Results.Ok(new { export = Dto(j, user, j.UserId == me.UserId), filters = JsonSerializer.Deserialize<Dictionary<string, string>>(j.FiltersJson), columns, j.StartedAt });
        });

        g.MapGet("/exports/{id:long}/download", async (long id, HubDbContext db, UserContext me, ExportStore store, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.UserId, ct) ?? throw new NotFoundException("The export");
            if (j.Status == ExportStatus.Expired || (j.ExpiresAt is { } e && e < clock.GetUtcNow()))
            {
                if (j.StoredPath is not null) store.Delete(j.StoredPath);
                j.StoredPath = null;
                j.Status = ExportStatus.Expired;
                await db.SaveChangesAsync(ct);
                return Results.Problem(statusCode: StatusCodes.Status410Gone, title: "The file has expired", detail: "Export files are kept for a limited time. Generate the report again (Retry).");
            }
            if (j.Status != ExportStatus.Completed || j.StoredPath is null) throw new ValidationException("status", "This export has no file.");
            var stream = store.Open(j.StoredPath);
            if (stream is null)
            {
                j.Status = ExportStatus.Expired;
                j.StoredPath = null;
                await db.SaveChangesAsync(ct);
                return Results.Problem(statusCode: StatusCodes.Status410Gone, title: "The file is no longer available", detail: "Generate the report again (Retry).");
            }
            await db.AuditActionAsync("Download", "Report", j.Id, j.ReportName, null, null, new { exportId = j.AuditId, j.FileName }, ct);
            await db.SaveChangesAsync(ct);
            return Results.File(stream, j.Format == ExportFormat.Xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8", j.FileName);
        });

        g.MapPost("/exports/{id:long}/retry", async (long id, HubDbContext db, ExportService svc, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.UserId, ct) ?? throw new NotFoundException("The export");
            if (j.Status is not (ExportStatus.Failed or ExportStatus.Expired)) throw new ValidationException("status", "Only a failed or expired export can be generated again.");
            var def = Report(j.Report);
            // The filters are validated again under the caller's current access.
            var f = await svc.ValidateAsync(def, JsonSerializer.Deserialize<Dictionary<string, string?>>(j.FiltersJson), strict: true, ct, svc.ZoneOf(j.TimeZone));
            var cols = j.ColumnsJson is null ? null : JsonSerializer.Deserialize<List<string>>(j.ColumnsJson);
            var job = await svc.ExportAsync(def, f, j.Format, cols, svc.ZoneOf(j.TimeZone), j.Source == "Schedule" ? "Reporting Center" : j.Source, null, j.Id, ct);
            return Results.Created($"/api/v1/reports/exports/{job.Id}", Dto(job));
        });

        // ---- saved filter presets (private to their owner) ----
        g.MapGet("/presets", async (string? report, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var list = await db.ReportPresets.AsNoTracking().Where(p => p.UserId == me.UserId && (report == null || p.Report == report)).OrderBy(p => p.Name).ToListAsync(ct);
            return Results.Ok(list.Select(p => new { p.Id, p.Report, p.Name, filters = JsonSerializer.Deserialize<Dictionary<string, string>>(p.FiltersJson), p.CreatedAt }));
        });
        g.MapPost("/presets", async (PresetInput input, HubDbContext db, ExportService svc, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var def = Report(input.Report ?? "");
            new Check().Text("name", input.Name, 80, "the preset name", true).ThrowIfAny();
            var f = await svc.ValidateAsync(def, input.Filters, strict: true, ct);
            var name = input.Name!.Trim();
            if (await db.ReportPresets.AnyAsync(p => p.UserId == me.UserId && p.Report == def.Key && p.Name == name, ct)) throw new ConflictException("A preset with this name exists.", new() { ["name"] = ["You already have a preset with this name for this report."] });
            if (await db.ReportPresets.CountAsync(p => p.UserId == me.UserId, ct) >= 100) throw new ValidationException("name", "You can keep at most 100 presets; delete some first.");
            var p = new ReportPreset { UserId = me.UserId!.Value, Report = def.Key, Name = name, FiltersJson = JsonSerializer.Serialize(f.Values), CreatedAt = clock.GetUtcNow() };
            db.ReportPresets.Add(p);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/reports/presets/{p.Id}", new { p.Id });
        });
        g.MapDelete("/presets/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var p = await db.ReportPresets.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.UserId, ct) ?? throw new NotFoundException("The preset");
            db.ReportPresets.Remove(p);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- schedules: owned by their creator; each run makes one file per recipient, with that recipient's own access ----
        g.MapGet("/schedules", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var list = await db.ReportSchedules.AsNoTracking().Include(s => s.Recipients).ThenInclude(r => r.User).Where(s => s.OwnerUserId == me.UserId).OrderBy(s => s.Name).ToListAsync(ct);
            return Results.Ok(list.Select(ScheduleDto));
        });
        g.MapGet("/schedules/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = await db.ReportSchedules.AsNoTracking().Include(x => x.Recipients).ThenInclude(r => r.User).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct) ?? throw new NotFoundException("The schedule");
            return Results.Ok(new { schedule = ScheduleDto(s), filters = JsonSerializer.Deserialize<Dictionary<string, string>>(s.FiltersJson) });
        });
        g.MapPost("/schedules", async (ScheduleInput input, HubDbContext db, ExportService svc, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = new ReportSchedule { OwnerUserId = me.UserId!.Value, CreatedAt = clock.GetUtcNow() };
            await ApplyAsync(s, input, db, svc, resolver, me, clock, ct);
            db.ReportSchedules.Add(s);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/reports/schedules/{s.Id}", new { s.Id, s.NextRunAt });
        });
        g.MapPut("/schedules/{id:long}", async (long id, ScheduleInput input, HubDbContext db, ExportService svc, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = await db.ReportSchedules.Include(x => x.Recipients).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct) ?? throw new NotFoundException("The schedule");
            await ApplyAsync(s, input, db, svc, resolver, me, clock, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/schedules/{id:long}/pause", (long id, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) => SetActiveAsync(id, false, db, me, clock, ct));
        g.MapPost("/schedules/{id:long}/resume", (long id, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) => SetActiveAsync(id, true, db, me, clock, ct));
        g.MapDelete("/schedules/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = await db.ReportSchedules.Include(x => x.Recipients).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct) ?? throw new NotFoundException("The schedule");
            db.ReportScheduleRecipients.RemoveRange(s.Recipients);
            db.ReportSchedules.Remove(s);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        // Execution history: the runs of the schedule (one export per recipient). The owner sees outcome and counts, not other people's files.
        g.MapGet("/schedules/{id:long}/runs", async (long id, int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            if (!await db.ReportSchedules.AnyAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct)) throw new NotFoundException("The schedule");
            var paged = await db.ExportJobs.AsNoTracking().Where(j => j.ScheduleId == id).OrderByDescending(j => j.RequestedAt).ThenByDescending(j => j.Id)
                .Select(j => new { j, user = db.Users.Where(u => u.Id == j.UserId).Select(u => u.DisplayName).FirstOrDefault() }).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(new Paged<object>(paged.Items.Select(x => Dto(x.j, x.user, x.j.UserId == me.UserId)).ToList(), paged.Page, paged.PageSize, paged.TotalCount));
        });
    }

    private static object ScheduleDto(ReportSchedule s) => new
    {
        s.Id, s.Name, s.Report, reportName = ReportCatalog.Find(s.Report)?.Name ?? s.Report, s.FilterSummary, format = s.Format.ToString().ToLowerInvariant(), frequency = s.Frequency.ToString(),
        s.DayOfWeek, s.DayOfMonth, time = s.TimeOfDay.ToString("HH:mm", CultureInfo.InvariantCulture), s.TimeZone, s.IsActive, s.NextRunAt, s.LastRunAt, s.LastOutcome,
        recipients = s.Recipients.Select(r => new { id = r.UserId, name = r.User?.DisplayName })
    };

    private static async Task<IResult> SetActiveAsync(long id, bool active, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct)
    {
        ExportService.RequireExport(me);
        var s = await db.ReportSchedules.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct) ?? throw new NotFoundException("The schedule");
        s.IsActive = active;
        s.UpdatedAt = clock.GetUtcNow();
        // Resuming never catches up on missed runs: the next run is the next scheduled time from now.
        if (active) s.NextRunAt = ScheduleClock.Next(s.Frequency, s.DayOfWeek, s.DayOfMonth, s.TimeOfDay, Zones.Find(s.TimeZone) ?? TimeZoneInfo.Utc, s.UpdatedAt);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task ApplyAsync(ReportSchedule s, ScheduleInput input, HubDbContext db, ExportService svc, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct)
    {
        var check = new Check().Text("name", input.Name, 120, "the schedule name", true);
        var def = ReportCatalog.Find(input.Report ?? "");
        if (def is null) check.Add("report", "Select a report.");
        ExportFormat format = ExportFormat.Csv;
        try { format = ParseFormat(input.Format); } catch (ValidationException ex) { check.Add("format", ex.Message); }
        if (input.Frequency is null || !Enum.IsDefined(input.Frequency.Value)) check.Add("frequency", "Select daily, weekly or monthly.");
        if (input.Frequency == ScheduleFrequency.Weekly && input.DayOfWeek is not (>= 0 and <= 6)) check.Add("dayOfWeek", "Select the weekday.");
        if (input.Frequency == ScheduleFrequency.Monthly && input.DayOfMonth is not (>= 1 and <= 28)) check.Add("dayOfMonth", "Select a day from 1 to 28.");
        if (!TimeOnly.TryParseExact(input.Time ?? "", "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var time)) check.Add("time", "Enter the time as HH:mm.");
        var zone = Zones.Find(input.TimeZone);
        if (zone is null) check.Add("timeZone", "Select a time zone.");
        var ids = (input.RecipientIds ?? []).Distinct().ToList();
        if (ids.Count == 0) check.Add("recipientIds", "Select at least one recipient.");
        if (ids.Count > 25) check.Add("recipientIds", "A schedule can have at most 25 recipients.");
        foreach (var id in ids)
        {
            // Recipients are hub users who may export themselves; each receives only what their own access allows.
            var r = await resolver.ForUserAsync(id, ct);
            if (r is null || !r.IsActive) check.Add("recipientIds", $"Recipient #{id} is not an active hub user.");
            else if ((r.Grants & Grant.Export) != Grant.Export || r.Roles.Length == 0) check.Add("recipientIds", $"{r.DisplayName} does not have the Export permission.");
        }
        check.ThrowIfAny();
        var f = await svc.ValidateAsync(def!, input.Filters, strict: true, ct, zone);
        s.Name = input.Name!.Trim();
        s.Report = def!.Key;
        s.FiltersJson = JsonSerializer.Serialize(f.Values);
        s.FilterSummary = f.Summary.Length > 2000 ? f.Summary[..2000] : f.Summary;
        s.Format = format;
        s.Frequency = input.Frequency!.Value;
        s.DayOfWeek = s.Frequency == ScheduleFrequency.Weekly ? input.DayOfWeek : null;
        s.DayOfMonth = s.Frequency == ScheduleFrequency.Monthly ? input.DayOfMonth : null;
        s.TimeOfDay = time;
        s.TimeZone = zone!.Id;
        s.IsActive = input.IsActive ?? s.IsActive;
        s.UpdatedAt = clock.GetUtcNow();
        s.NextRunAt = ScheduleClock.Next(s.Frequency, s.DayOfWeek, s.DayOfMonth, s.TimeOfDay, zone, s.UpdatedAt);
        db.ReportScheduleRecipients.RemoveRange(s.Recipients.Where(r => !ids.Contains(r.UserId)));
        foreach (var id in ids.Where(id => s.Recipients.All(r => r.UserId != id))) s.Recipients.Add(new ReportScheduleRecipient { UserId = id });
    }
}

/// <summary>
/// A62: runs due schedules and removes expired export files. Each recipient's file is generated in its own scope with that
/// recipient's directly assigned roles and scopes (directory-group access is not used outside a sign-in), so a scheduled file
/// never contains more than the recipient could see; a recipient who lost the Export permission gets a failed run instead.
/// </summary>
public sealed class ReportScheduler(IServiceScopeFactory scopes, Microsoft.Extensions.Options.IOptions<ReportingOptions> options, ILogger<ReportScheduler> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var minutes = options.Value.SchedulerMinutes;
        if (minutes <= 0) return;
        await Task.Delay(TimeSpan.FromSeconds(20), stop);
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var now = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow();
                await CleanUpAsync(scope.ServiceProvider.GetRequiredService<HubDbContext>(), scope.ServiceProvider.GetRequiredService<ExportStore>(), now, stop);
                await RunDueAsync(scopes, now, stop);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "Report scheduler failed; it is retried at the next interval"); }
            await Task.Delay(TimeSpan.FromMinutes(minutes), stop);
        }
    }

    /// <summary>Deletes export files past their retention and marks the exports Expired (history is kept).</summary>
    public static async Task<int> CleanUpAsync(HubDbContext db, ExportStore store, DateTimeOffset now, CancellationToken ct)
    {
        var expired = await db.ExportJobs.Where(j => j.Status == ExportStatus.Completed && j.ExpiresAt < now).Take(500).ToListAsync(ct);
        foreach (var j in expired)
        {
            if (j.StoredPath is not null) store.Delete(j.StoredPath);
            j.StoredPath = null;
            j.Status = ExportStatus.Expired;
        }
        if (expired.Count > 0) await db.SaveChangesAsync(ct);
        return expired.Count;
    }

    public static async Task<int> RunDueAsync(IServiceScopeFactory scopes, DateTimeOffset now, CancellationToken ct)
    {
        List<ReportSchedule> due;
        using (var scope = scopes.CreateScope())
            due = await scope.ServiceProvider.GetRequiredService<HubDbContext>().ReportSchedules.AsNoTracking().Include(s => s.Recipients)
                .Where(s => s.IsActive && s.NextRunAt <= now).OrderBy(s => s.NextRunAt).Take(20).ToListAsync(ct);
        int processed = 0;
        foreach (var candidate in due)
        {
            using var scope = scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            // A schedule occurrence must be claimed across overlapping workers before any recipient file is generated.
            var resource = $"TioHub:ReportSchedule:{candidate.Id}";
            var acquired = await db.Database.SqlQuery<int>($"""
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock @Resource={resource}, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=0;
                SELECT @result AS [Value];
                """).ToListAsync(ct);
            if (acquired[0] < 0) continue;
            var s = await db.ReportSchedules.Include(x => x.Recipients).FirstOrDefaultAsync(x => x.Id == candidate.Id, ct);
            if (s is null || !s.IsActive || s.NextRunAt > now) continue;
            int ok = 0, failed = 0;
            foreach (var r in s.Recipients)
            {
                if (await RunForAsync(scopes, s, r.UserId, ct)) ok++; else failed++;
            }
            s.LastRunAt = now;
            s.LastOutcome = failed == 0 ? $"Completed for {ok} recipient(s)" : $"{ok} completed, {failed} failed";
            s.NextRunAt = ScheduleClock.Next(s.Frequency, s.DayOfWeek, s.DayOfMonth, s.TimeOfDay, Zones.Find(s.TimeZone) ?? TimeZoneInfo.Utc, now);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            processed++;
        }
        return processed;
    }

    private static async Task<bool> RunForAsync(IServiceScopeFactory scopes, ReportSchedule s, long userId, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<HubDbContext>();
        var now = sp.GetRequiredService<TimeProvider>().GetUtcNow();
        var def = ReportCatalog.Find(s.Report);
        var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.Id == userId, ct);
        string? refusal = null;
        ResolvedUser? resolved = null;
        if (def is null) refusal = "The report no longer exists.";
        else if (user is null || !user.IsActive) refusal = "The recipient is not an active hub user.";
        else
        {
            resolved = await AccessCalculator.ComputeAsync(db, user, [], ct);
            if (resolved.Roles.Length == 0 || (resolved.Grants & Grant.Export) != Grant.Export) refusal = "The recipient no longer has the Export permission.";
        }
        if (refusal is not null)
        {
            if (user is not null)
            {
                db.ExportJobs.Add(new ExportJob
                {
                    UserId = userId, Report = s.Report, ReportName = def?.Name ?? s.Report, Format = s.Format, FiltersJson = s.FiltersJson, FilterSummary = s.FilterSummary, TimeZone = s.TimeZone,
                    Status = ExportStatus.Failed, RequestedAt = now, CompletedAt = now, Error = refusal, Source = "Schedule", ScheduleId = s.Id
                });
                await db.SaveChangesAsync(ct);
            }
            return false;
        }
        sp.GetRequiredService<UserContext>().Set(resolved!);
        var svc = sp.GetRequiredService<ExportService>();
        ExportJob job;
        try
        {
            var f = await svc.ValidateAsync(def!, JsonSerializer.Deserialize<Dictionary<string, string?>>(s.FiltersJson), strict: true, ct, svc.ZoneOf(s.TimeZone));
            job = await svc.ExportAsync(def!, f, s.Format, null, Zones.Find(s.TimeZone) ?? TimeZoneInfo.Utc, "Schedule", s.Id, null, ct);
        }
        catch (ValidationException ex)
        {
            // e.g. a client in the filters that this recipient may not see: the run fails instead of widening or narrowing silently.
            job = new ExportJob
            {
                UserId = userId, Report = s.Report, ReportName = def!.Name, Format = s.Format, FiltersJson = s.FiltersJson, FilterSummary = s.FilterSummary, TimeZone = s.TimeZone,
                Status = ExportStatus.Failed, RequestedAt = now, CompletedAt = now, Error = "The filters are not valid for this recipient: " + string.Join(" ", ex.Errors.SelectMany(e => e.Value)), Source = "Schedule", ScheduleId = s.Id
            };
            db.ExportJobs.Add(job);
            await db.SaveChangesAsync(ct);
        }
        db.Notifications.Add(new Notification
        {
            UserId = userId, Kind = "Report", Title = job.Status == ExportStatus.Completed ? $"Scheduled report ready: {s.Name}" : $"Scheduled report failed: {s.Name}",
            Body = job.Status == ExportStatus.Completed ? $"{job.ReportName}, {job.RowCount} row(s)." : job.Error, Link = $"/reporting-center?tab=history&export={job.Id}",
            Key = $"report:{s.Id}:{userId}:{job.Id}", CreatedAt = now
        });
        await db.SaveChangesAsync(ct);
        return job.Status == ExportStatus.Completed;
    }
}
