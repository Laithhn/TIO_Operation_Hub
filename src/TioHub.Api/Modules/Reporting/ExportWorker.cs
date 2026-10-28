using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Notifications;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A70: wakes the export worker as soon as a job is queued (it also polls, so a lost signal only delays a job).</summary>
public sealed class ExportQueue
{
    private readonly SemaphoreSlim _signal = new(0, int.MaxValue);
    public void Signal() => _signal.Release();
    public async Task WaitAsync(TimeSpan timeout, CancellationToken ct) { try { await _signal.WaitAsync(timeout, ct); } catch (OperationCanceledException) { } }
}

/// <summary>A70: reporting metrics (counts and timings only; never case data).</summary>
public static class ReportingMetrics
{
    public static readonly Meter Meter = new("TioHub.Reporting");
    public static readonly Histogram<double> PreviewMs = Meter.CreateHistogram<double>("tiohub.reporting.preview.duration", "ms");
    public static readonly Histogram<double> QueueMs = Meter.CreateHistogram<double>("tiohub.reporting.export.queue_wait", "ms");
    public static readonly Histogram<double> ExportMs = Meter.CreateHistogram<double>("tiohub.reporting.export.duration", "ms");
    public static readonly Counter<long> Jobs = Meter.CreateCounter<long>("tiohub.reporting.export.jobs");
    public static readonly Counter<long> Downloads = Meter.CreateCounter<long>("tiohub.reporting.downloads");
}

/// <summary>
/// A70: runs queued builder exports (Queued → Processing → Completed | Failed | Cancelled). Each job is claimed with a conditional
/// update, so several servers never run the same job; at most <see cref="ReportingOptions.ExportConcurrency"/> run at once here.
/// The requester's access is resolved again when the job runs — interactive jobs with the directory groups of their last sign-in,
/// scheduled jobs with directly assigned access only (as the A62 scheduler) — so a file never holds more than that user may see now.
/// </summary>
public sealed class ExportWorker(IServiceScopeFactory scopes, IOptions<ReportingOptions> options, ExportQueue queue, ILogger<ExportWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var o = options.Value;
        if (o.ExportWorkerSeconds <= 0) return;
        var running = new List<Task>();
        await Task.Yield();
        while (!stop.IsCancellationRequested)
        {
            try
            {
                running.RemoveAll(t => t.IsCompleted);
                await RecoverAsync(scopes, stop);
                while (running.Count < Math.Max(1, o.ExportConcurrency) && await ClaimNextAsync(scopes, stop) is { } id)
                    running.Add(Task.Run(async () => { try { await RunAsync(scopes, id, stop); } finally { queue.Signal(); } }, stop));
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "Export worker loop failed; it continues at the next interval"); }
            await queue.WaitAsync(TimeSpan.FromSeconds(o.ExportWorkerSeconds), stop);
        }
    }

    /// <summary>Claims the oldest due queued job, or returns null.</summary>
    public static async Task<long?> ClaimNextAsync(IServiceScopeFactory scopes, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var now = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow();
        var candidates = await db.ExportJobs.AsNoTracking().Where(j => j.DefinitionJson != null && j.Status == ExportStatus.Pending && (j.NotBefore == null || j.NotBefore <= now))
            .OrderBy(j => j.RequestedAt).ThenBy(j => j.Id).Select(j => j.Id).Take(10).ToListAsync(ct);
        foreach (var id in candidates)
        {
            var claimed = await db.ExportJobs.Where(j => j.Id == id && j.Status == ExportStatus.Pending && !j.CancelRequested)
                .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, ExportStatus.Processing).SetProperty(j => j.StartedAt, now).SetProperty(j => j.Attempts, j => j.Attempts + 1), ct);
            if (claimed == 1) return id;
        }
        return null;
    }

    /// <summary>Jobs left Processing by a stopped server are queued again (or failed after the last attempt).</summary>
    public static async Task RecoverAsync(IServiceScopeFactory scopes, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var max = scope.ServiceProvider.GetRequiredService<IOptions<ReportingOptions>>().Value.MaxAttempts;
        var now = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow();
        var stale = now.AddMinutes(-30);
        await db.ExportJobs.Where(j => j.DefinitionJson != null && j.Status == ExportStatus.Processing && j.StartedAt < stale && j.Attempts < max)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, ExportStatus.Pending), ct);
        await db.ExportJobs.Where(j => j.DefinitionJson != null && j.Status == ExportStatus.Processing && j.StartedAt < stale)
            .ExecuteUpdateAsync(s => s.SetProperty(j => j.Status, ExportStatus.Failed).SetProperty(j => j.CompletedAt, now)
                .SetProperty(j => j.Error, "The export was interrupted repeatedly. Start it again."), ct);
    }

    /// <summary>Claims and runs every due job (tests and diagnostics). Returns how many ran.</summary>
    public static async Task<int> RunAllAsync(IServiceScopeFactory scopes, CancellationToken ct)
    {
        var n = 0;
        while (await ClaimNextAsync(scopes, ct) is { } id) { await RunAsync(scopes, id, ct); n++; }
        return n;
    }

    private sealed class Cancelled : Exception;
    private sealed class Refused(string message) : Exception(message);

    private static bool Transient(Exception ex) => ex is TimeoutException or IOException || (ex is SqlException sql && sql.Number is -2 or 1205 or 4060 or 40613 or 40501 or 49918);

    /// <summary>Runs one claimed job to its terminal state (or back to the queue for a transient failure).</summary>
    public static async Task RunAsync(IServiceScopeFactory scopes, long id, CancellationToken stop)
    {
        using var scope = scopes.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<HubDbContext>();
        var clock = sp.GetRequiredService<TimeProvider>();
        var opts = sp.GetRequiredService<IOptions<ReportingOptions>>().Value;
        var log = sp.GetRequiredService<ILogger<ExportWorker>>();
        var job = await db.ExportJobs.FirstAsync(j => j.Id == id, stop);
        var watch = Stopwatch.StartNew();
        ReportingMetrics.QueueMs.Record(((job.StartedAt ?? clock.GetUtcNow()) - job.RequestedAt).TotalMilliseconds);
        var zone = Zones.Find(job.TimeZone) ?? TimeZoneInfo.Utc;
        try
        {
            // ---- the requester's access, now ----
            var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.Id == job.UserId, stop);
            if (user is null || !user.IsActive) throw new Refused("The requester is not an active hub user.");
            var resolved = job.Source == "Schedule"
                ? await AccessCalculator.ComputeAsync(db, user, [], stop)
                : await sp.GetRequiredService<UserResolver>().ForUserAsync(user.Id, stop);
            if (resolved is null || resolved.Roles.Length == 0 || (resolved.Grants & Grant.Export) != Grant.Export) throw new Refused("The requester no longer has the Export permission.");
            sp.GetRequiredService<UserContext>().Set(resolved);

            // ---- the definition, validated again under that access ----
            var svc = sp.GetRequiredService<CasesReportService>();
            var definition = CasesReportService.Deserialize(job.DefinitionJson) ?? throw new Refused("The report definition could not be read.");
            var options = JsonSerializer.Deserialize<BuilderExportOptions>(job.OptionsJson ?? "{}", new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new BuilderExportOptions();
            var cutoff = job.CutoffAt ?? job.RequestedAt;
            var k = await svc.ClockAsync(cutoff, stop);
            ValidCases v;
            try { v = await svc.ValidateAsync(definition, zone, k, stop); }
            catch (ValidationException ex) { throw new Refused("The report definition is not valid for the requester: " + string.Join(" ", ex.Errors.SelectMany(e => e.Value))); }

            // ---- limits, before any row is read ----
            var q = await svc.QueryAsync(v, k, cutoff, stop);
            var total = await q.CountAsync(stop);
            if (total > opts.MaxRows) throw new Refused($"{total:N0} cases match; one export can hold at most {opts.MaxRows:N0}. Narrow the filters and export again.");
            if (job.Format == ExportFormat.Pdf && options.PdfMode == "detailed" && total > opts.PdfMaxRows)
                throw new Refused($"{total:N0} cases match; a detailed PDF holds at most {opts.PdfMaxRows:N0}. Use Excel, the PDF summary, or narrower filters.");

            // ---- rows in deterministic chunks; a cancel request is honoured between chunks ----
            var rows = new List<CaseReportRow>(total);
            const int chunk = 5000;
            for (var skip = 0; skip < total; skip += chunk)
            {
                if (await db.ExportJobs.AsNoTracking().AnyAsync(j => j.Id == id && j.CancelRequested, stop)) throw new Cancelled();
                rows.AddRange(await CasesReportService.Project(CasesReportService.Sorted(q, v, k), k).Skip(skip).Take(chunk).ToListAsync(stop));
            }
            await svc.AttachJiraAsync(v, rows, stop);
            var summary = await svc.RunAsync(v, k, 0, 0, stop, cutoff);
            var page = summary with { Rows = rows };
            if (await db.ExportJobs.AsNoTracking().AnyAsync(j => j.Id == id && j.CancelRequested, stop)) throw new Cancelled();

            var now = clock.GetUtcNow();
            var name = job.SavedReportId is { } sid ? await db.SavedReports.AsNoTracking().Where(r => r.Id == sid).Select(r => r.Name).FirstOrDefaultAsync(stop) : null;
            var context = new BuilderFileContext(name ?? job.ReportName, resolved.DisplayName, now, cutoff, zone, job.AuditId, opts.RetentionDays);
            var labels = await svc.LabelsAsync(stop);
            var bytes = job.Format == ExportFormat.Pdf ? CasesExportFiles.Pdf(v, page, options, context, labels) : CasesExportFiles.Xlsx(v, page, options, context, labels);
            var store = sp.GetRequiredService<ExportStore>();
            var ext = job.Format == ExportFormat.Pdf ? ".pdf" : ".xlsx";
            job.StoredPath = await store.SaveAsync(bytes, ext, now, stop);
            job.FileName = CasesExportFiles.SafeFileName(options.FileName, $"tio-hub-cases-{now.UtcDateTime:yyyyMMdd-HHmm}") + ext;
            job.FileSize = bytes.LongLength;
            job.RowCount = rows.Count;
            job.Status = ExportStatus.Completed;
            job.CompletedAt = now;
            job.ExpiresAt = now.AddDays(Math.Max(1, opts.RetentionDays));
            job.Error = null;
            if (job.SavedReportId is { } saved) await db.SavedReports.Where(r => r.Id == saved).ExecuteUpdateAsync(s => s.SetProperty(r => r.LastRunAt, now), stop);
        }
        catch (Cancelled)
        {
            job.Status = ExportStatus.Cancelled;
            job.CompletedAt = clock.GetUtcNow();
            job.Error = "Cancelled by the requester.";
        }
        catch (Refused ex)
        {
            job.Status = ExportStatus.Failed;
            job.CompletedAt = clock.GetUtcNow();
            job.Error = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !stop.IsCancellationRequested)
        {
            if (Transient(ex) && job.Attempts < opts.MaxAttempts)
            {
                // Bounded exponential back-off: 15 s, 30 s, 60 s …
                job.Status = ExportStatus.Pending;
                job.NotBefore = clock.GetUtcNow().AddSeconds(15 * Math.Pow(2, job.Attempts - 1));
                log.LogWarning(ex, "Export {AuditId} failed transiently (attempt {Attempt}); queued again", job.AuditId, job.Attempts);
            }
            else
            {
                log.LogError(ex, "Export {AuditId} failed", job.AuditId);
                job.Status = ExportStatus.Failed;
                job.CompletedAt = clock.GetUtcNow();
                job.Error = $"The export could not be generated (reference {job.AuditId}). Retry; if it fails again, give the reference to the application team.";
            }
        }
        catch (OperationCanceledException)
        {
            // The server is stopping: the job goes back to the queue for the next start.
            job.Status = ExportStatus.Pending;
        }
        using var finish = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        if (job.Status is ExportStatus.Completed or ExportStatus.Failed or ExportStatus.Cancelled)
        {
            db.ExportLogs.Add(new Admin.ExportLog { UserId = job.UserId, Report = "cases-builder", Filters = job.FilterSummary.Length > 0 ? job.FilterSummary : "none", RowCount = job.RowCount ?? 0, At = job.RequestedAt });
            await db.AuditActionAsync("Export", "Report", job.Id, job.ReportName, null, null,
                new { exportId = job.AuditId, report = "cases-builder", format = job.Format.ToString(), filters = job.FilterSummary, rows = job.RowCount, status = job.Status.ToString(), error = job.Error,
                    timeZone = job.TimeZone, source = job.Source, attempts = job.Attempts, requestedAt = job.RequestedAt, completedAt = job.CompletedAt }, finish.Token);
            if (job.Source == "Schedule" && job.Status != ExportStatus.Cancelled)
            {
                var title = job.ScheduleId is { } sch ? await db.ReportSchedules.AsNoTracking().Where(s => s.Id == sch).Select(s => s.Name).FirstOrDefaultAsync(finish.Token) : null;
                db.Notifications.Add(new Notification
                {
                    UserId = job.UserId, Kind = "Report", Title = job.Status == ExportStatus.Completed ? $"Scheduled report ready: {title ?? job.ReportName}" : $"Scheduled report failed: {title ?? job.ReportName}",
                    Body = job.Status == ExportStatus.Completed ? $"{job.ReportName}, {job.RowCount} row(s)." : job.Error, Link = $"/reporting-center/history?export={job.Id}",
                    Key = $"report:{job.ScheduleId}:{job.UserId}:{job.Id}", CreatedAt = clock.GetUtcNow()
                });
            }
            ReportingMetrics.Jobs.Add(1, new KeyValuePair<string, object?>("status", job.Status.ToString()), new KeyValuePair<string, object?>("format", job.Format.ToString()));
            ReportingMetrics.ExportMs.Record(watch.Elapsed.TotalMilliseconds);
            log.LogInformation("Export {AuditId} {Status}: {Rows} row(s), {Format}, {Ms} ms, attempt {Attempt}", job.AuditId, job.Status, job.RowCount, job.Format, (int)watch.Elapsed.TotalMilliseconds, job.Attempts);
        }
        await db.SaveChangesAsync(finish.Token);
    }
}
