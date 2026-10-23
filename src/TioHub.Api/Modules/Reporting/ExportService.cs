using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A62: export files on disk, under one root folder (default <c>App_Data/exports</c>, kept across upgrades).</summary>
public sealed class ExportStore(IOptions<ReportingOptions> options, IWebHostEnvironment env)
{
    public ReportingOptions Options => options.Value;
    public string Root => Path.GetFullPath(options.Value.Path, env.ContentRootPath);

    private string Full(string relative)
    {
        var root = Root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var full = Path.GetFullPath(Path.Combine(root, relative));
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Export path outside the storage root.");
        return full;
    }

    public async Task<string> SaveAsync(byte[] content, string extension, DateTimeOffset now, CancellationToken ct)
    {
        // Stored names never contain user input: a month folder and a random name.
        var relative = Path.Combine(now.UtcDateTime.ToString("yyyy-MM", CultureInfo.InvariantCulture), Guid.NewGuid().ToString("N") + extension);
        var full = Full(relative);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await File.WriteAllBytesAsync(full, content, ct);
        return relative;
    }

    public Stream? Open(string relative) { var f = Full(relative); return File.Exists(f) ? File.OpenRead(f) : null; }

    public void Delete(string relative) { try { var f = Full(relative); if (File.Exists(f)) File.Delete(f); } catch (IOException) { } catch (UnauthorizedAccessException) { } }
}

public sealed record ValidFilters(Dictionary<string, string> Values, string Summary);

/// <summary>
/// A62: validates report filters, builds previews and generates export files — always under the caller's access (the scoped
/// <see cref="UserContext"/>), so a preview, an export and a scheduled run see exactly the rows the screens show that user.
/// </summary>
public sealed class ExportService(HubDbContext db, HubAccess access, HubSettings settings, FreshnessService fresh, Dashboard dash, ExportStore store, TimeProvider clock, ILogger<ExportService> log)
{
    public static readonly string[] Formats = ["csv", "xlsx"];

    public TimeZoneInfo ZoneOf(string? requested) => Zones.Find(requested) ?? Zones.Find(access.Me.TimeZone) ?? TimeZoneInfo.Utc;

    /// <summary>
    /// Checks every filter against the report's definition: unknown keys (strict mode), dates, ranges, options and ids. A client
    /// outside the caller's scope is refused; everything else is in any case limited by the scope filters of the queries.
    /// </summary>
    public async Task<ValidFilters> ValidateAsync(ReportDefinition def, IDictionary<string, string?>? raw, bool strict, CancellationToken ct)
    {
        var check = new Check();
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var labels = new List<string>();
        var known = def.Filters.ToDictionary(f => f.Key, StringComparer.OrdinalIgnoreCase);
        foreach (var (key, v) in raw ?? new Dictionary<string, string?>())
        {
            if (string.IsNullOrWhiteSpace(v) || key is "timeZone" or "page" or "pageSize" or "sort") continue;
            var value = v.Trim();
            if (value.Length > 200) { check.Add($"filters.{key}", "The value is too long."); continue; }
            if (!known.TryGetValue(key, out var f))
            {
                if (def.ListKeys.Contains(key, StringComparer.OrdinalIgnoreCase)) { values[key] = value; continue; }
                if (strict) check.Add($"filters.{key}", $"{def.Name} has no filter '{key}'.");
                continue;
            }
            switch (f.Kind)
            {
                case FilterKind.Client or FilterKind.Team or FilterKind.Product or FilterKind.Owner:
                    if (!long.TryParse(value, out var id) || id <= 0) { check.Add($"filters.{key}", $"Select a valid {f.Label.ToLowerInvariant()}."); continue; }
                    if (f.Kind == FilterKind.Client && !access.Me.HasClient(id)) { check.Add($"filters.{key}", "Select a client you can access."); continue; }
                    labels.Add($"{f.Label} = {await LabelAsync(f.Kind, id, ct) ?? $"#{id}"}");
                    break;
                case FilterKind.Date:
                    if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _) && !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out _))
                    { check.Add($"filters.{key}", "Enter a valid date (yyyy-MM-dd)."); continue; }
                    labels.Add($"{f.Label} = {value}");
                    break;
                case FilterKind.Select:
                    var opt = f.Options?.FirstOrDefault(o => string.Equals(o, value, StringComparison.OrdinalIgnoreCase));
                    if (opt is null) { check.Add($"filters.{key}", $"'{value}' is not an option of {f.Label}."); continue; }
                    value = opt;
                    labels.Add($"{f.Label} = {value}");
                    break;
                case FilterKind.Bool:
                    if (!bool.TryParse(value, out var b)) { check.Add($"filters.{key}", "Use true or false."); continue; }
                    if (!b) continue;
                    value = "true";
                    labels.Add(f.Label);
                    break;
                default:
                    labels.Add($"{f.Label} contains \"{value}\"");
                    break;
            }
            values[f.Key] = value;
        }
        // Ranges: the end may not be before the start.
        foreach (var f in def.Filters.Where(f => f.RangeEnd is not null))
            if (values.TryGetValue(f.Key, out var a) && values.TryGetValue(f.RangeEnd!, out var b) && string.CompareOrdinal(a, b) > 0 && a.Length == 10 && b.Length == 10)
                check.Add($"filters.{f.RangeEnd}", $"{f.Label.Replace(" from", "")}: the end date is before the start date.");
        check.ThrowIfAny();
        return new ValidFilters(values, string.Join("; ", labels));
    }

    private async Task<string?> LabelAsync(FilterKind kind, long id, CancellationToken ct) => kind switch
    {
        FilterKind.Client => await db.Clients.AsNoTracking().Where(c => c.Id == id).Select(c => c.Code).FirstOrDefaultAsync(ct),
        FilterKind.Team => await db.Teams.AsNoTracking().Where(t => t.Id == id).Select(t => t.Name).FirstOrDefaultAsync(ct),
        FilterKind.Product => await db.Products.AsNoTracking().Where(p => p.Id == id).Select(p => p.Code).FirstOrDefaultAsync(ct),
        FilterKind.Owner => await db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => u.DisplayName).FirstOrDefaultAsync(ct),
        _ => null
    };

    public ReportContext Context(ValidFilters f, TimeZoneInfo zone, DateTimeOffset now)
    {
        var evaluationTime = f.Values.TryGetValue("asOf", out var value)
            && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var asOf) ? asOf : now;
        return new(db, access, settings, fresh, dash, evaluationTime, zone, f.Values);
    }

    public static void RequireExport(UserContext me)
    {
        if (!me.HasBusinessRole) throw new ForbiddenException("Reports need a business role.");
        me.RequireGrant(Grant.Export);
    }

    /// <summary>One page of the report as it would be exported, with the summary for operational reports.</summary>
    public async Task<object> PreviewAsync(ReportDefinition def, ValidFilters f, TimeZoneInfo zone, int page, int pageSize, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var result = await def.RunAsync(Context(f, zone, now), (page - 1) * pageSize, pageSize, ct);
        return new
        {
            report = new { def.Key, def.Name, def.Category },
            filters = f.Summary, generatedAt = now, timeZone = zone.Id, total = result.Total, page, pageSize,
            columns = result.Columns,
            rows = result.Rows.Select(r => r.Select(v => Csv.Display(v, zone)).ToArray()),
            summary = result.Summary, breakdowns = result.Breakdowns?.Select(b => new { b.Title, b.Columns, rows = b.Rows.Select(r => r.Select(v => Csv.Display(v, zone)).ToArray()) }),
            limit = store.Options.MaxRows
        };
    }

    /// <summary>
    /// Generates the file for the current user and records the job (completed or failed). The file is stored for the retention period
    /// and can only be downloaded by the user it was generated for.
    /// </summary>
    public async Task<ExportJob> ExportAsync(ReportDefinition def, ValidFilters f, ExportFormat format, IReadOnlyList<string>? columns, TimeZoneInfo zone, string source,
        long? scheduleId, long? retryOf, CancellationToken ct)
    {
        var me = access.Me;
        var now = clock.GetUtcNow();
        var filtersJson = JsonSerializer.Serialize(f.Values);
        var columnsJson = columns is { Count: > 0 } ? JsonSerializer.Serialize(columns) : null;
        // A second identical request within seconds (double click, retry by the browser) returns the first job.
        if (scheduleId is null && retryOf is null)
        {
            var since = now.AddSeconds(-10);
            var same = await db.ExportJobs.Where(j => j.UserId == me.UserId && j.Report == def.Key && j.Format == format && j.FiltersJson == filtersJson && j.ColumnsJson == columnsJson
                && j.TimeZone == zone.Id && j.RequestedAt >= since && j.Status != ExportStatus.Failed).OrderByDescending(j => j.Id).FirstOrDefaultAsync(ct);
            if (same is not null) return same;
        }
        var job = new ExportJob
        {
            UserId = me.UserId!.Value, Report = def.Key, ReportName = def.Name, Format = format, FiltersJson = filtersJson, FilterSummary = Cut(f.Summary, 2000), ColumnsJson = columnsJson,
            TimeZone = zone.Id, Status = ExportStatus.Processing, RequestedAt = now, StartedAt = now, Source = source, ScheduleId = scheduleId, RetryOfId = retryOf
        };
        db.ExportJobs.Add(job);
        await db.SaveChangesAsync(ct);
        try
        {
            var max = store.Options.MaxRows;
            var result = await def.RunAsync(Context(f, zone, now), 0, max + 1, ct);
            if (result.Total > max)
            {
                job.Status = ExportStatus.Failed;
                job.RowCount = result.Total;
                job.Error = $"{result.Total:N0} rows match; one export can hold at most {max:N0}. Narrow the filters and try again.";
            }
            else
            {
                var cols = Pick(result.Columns, columns);
                var rows = result.Rows.Select(r => cols.Select(c => r[c.Index]).ToArray()).ToList();
                var bytes = format == ExportFormat.Xlsx ? BuildXlsx(def, result, cols, rows, f, zone, now, me) : BuildCsv(def, result, cols, rows, f, zone, now, me);
                job.StoredPath = await store.SaveAsync(bytes, format == ExportFormat.Xlsx ? ".xlsx" : ".csv", now, ct);
                job.FileName = FileName(def.Key, now, format);
                job.FileSize = bytes.LongLength;
                job.RowCount = rows.Count;
                job.Status = ExportStatus.Completed;
                job.ExpiresAt = now.AddDays(Math.Max(1, store.Options.RetentionDays));
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "Export {AuditId} of {Report} failed", job.AuditId, def.Key);
            job.Status = ExportStatus.Failed;
            job.Error = $"The export could not be generated (reference {job.AuditId}). Try again; if it fails again, give the reference to the application team.";
        }
        job.CompletedAt = clock.GetUtcNow();
        db.ExportLogs.Add(new Admin.ExportLog { UserId = job.UserId, Report = def.Key, Filters = Cut(f.Summary.Length > 0 ? f.Summary : "none", 2000), RowCount = job.RowCount ?? 0, At = now });
        await db.AuditActionAsync("Export", "Report", job.Id, def.Name, f.Values.TryGetValue("clientId", out var c) && long.TryParse(c, out var cid) ? cid : null, null,
            new { exportId = job.AuditId, report = def.Key, format = format.ToString(), filters = f.Summary, rows = job.RowCount, status = job.Status.ToString(), error = job.Error, timeZone = zone.Id, source, requestedAt = job.RequestedAt, completedAt = job.CompletedAt }, ct);
        return job;
    }

    private static string Cut(string s, int n) => s.Length > n ? s[..n] : s;

    public static string FileName(string key, DateTimeOffset now, ExportFormat format) =>
        $"tio-hub-{key}-{now.UtcDateTime:yyyyMMdd-HHmm}.{(format == ExportFormat.Xlsx ? "xlsx" : "csv")}";

    private sealed record Col(int Index, ReportColumnDef Def);

    /// <summary>The chosen columns in the chosen order (unknown keys are refused); none chosen = all.</summary>
    private static List<Col> Pick(IReadOnlyList<ReportColumnDef> all, IReadOnlyList<string>? keys)
    {
        var indexed = all.Select((c, i) => new Col(i, c)).ToList();
        if (keys is null || keys.Count == 0) return indexed;
        return keys.Select(k => indexed.FirstOrDefault(c => c.Def.Key == k) ?? throw new ValidationException("columns", $"Unknown column '{k}'.")).ToList();
    }

    public static void CheckColumns(ReportDefinition def, IReadOnlyList<string>? keys)
    {
        if (keys is null) return;
        if (keys.Count > 0 && keys.Distinct().Count() != keys.Count) throw new ValidationException("columns", "A column is chosen twice.");
        _ = Pick(def.Columns, keys);
    }

    private static byte[] BuildCsv(ReportDefinition def, ReportResult result, List<Col> cols, List<object?[]> rows, ValidFilters f, TimeZoneInfo zone, DateTimeOffset now, UserContext me) =>
        Csv.Build(def.Name, me.AccountName, f.Summary, zone, now, cols.Select((c, i) => new CsvColumn<object?[]>(c.Def.Header, c.Def.Definition, r => r[i])).ToList(), rows,
            result.Summary?.Select(m => (m.Label, m.Value)));

    private static byte[] BuildXlsx(ReportDefinition def, ReportResult result, List<Col> cols, List<object?[]> rows, ValidFilters f, TimeZoneInfo zone, DateTimeOffset now, UserContext me)
    {
        var sheets = new List<XlsxSheet> { new(def.Name, cols.Select(c => c.Def.Header).ToList(), rows.Select(r => (IReadOnlyList<object?>)r.Select(v => Csv.Display(v, zone)).ToList())) };
        if (result.Summary is { Count: > 0 } || result.Breakdowns is { Count: > 0 })
        {
            var lines = new List<IReadOnlyList<object?>>();
            foreach (var m in result.Summary ?? []) lines.Add([m.Label, m.Value, m.Definition]);
            foreach (var b in result.Breakdowns ?? [])
            {
                lines.Add([]);
                lines.Add([b.Title]);
                lines.Add(b.Columns);
                lines.AddRange(b.Rows.Select(r => (IReadOnlyList<object?>)r.Select(v => Csv.Display(v, zone)).ToList()));
            }
            sheets.Add(new XlsxSheet("Summary", ["Measure", "Value", "Definition"], lines));
        }
        var about = new List<IReadOnlyList<object?>>
        {
            new object?[] { "Report", def.Name }, new object?[] { "Generated", Csv.Format(now, zone) }, new object?[] { "Time zone", zone.Id },
            new object?[] { "Generated by", me.AccountName }, new object?[] { "Filters", f.Summary.Length == 0 ? "none" : f.Summary }, new object?[] { "Rows", rows.Count }, Array.Empty<object?>()
        };
        about.AddRange(cols.Select(c => (IReadOnlyList<object?>)new object?[] { c.Def.Header, c.Def.Definition }));
        sheets.Add(new XlsxSheet("About this export", ["Item", "Value"], about));
        return Xlsx.Build(sheets);
    }
}

/// <summary>A62: when a schedule runs next — the chosen local time in its time zone, daily, on a weekday, or on a day of the month (1–28).</summary>
public static class ScheduleClock
{
    public static DateTimeOffset Next(ScheduleFrequency freq, int? dayOfWeek, int? dayOfMonth, TimeOnly time, TimeZoneInfo zone, DateTimeOffset after)
    {
        var localNow = TimeZoneInfo.ConvertTime(after, zone).DateTime;
        for (var i = 0; i < 400; i++)
        {
            var day = localNow.Date.AddDays(i);
            var fits = freq switch
            {
                ScheduleFrequency.Daily => true,
                ScheduleFrequency.Weekly => (int)day.DayOfWeek == (dayOfWeek ?? 1),
                _ => day.Day == (dayOfMonth ?? 1)
            };
            if (!fits) continue;
            var local = day + time.ToTimeSpan();
            while (zone.IsInvalidTime(local)) local = local.AddMinutes(30);
            var at = new DateTimeOffset(local, zone.GetUtcOffset(local)).ToUniversalTime();
            if (at > after) return at;
        }
        return after.AddDays(1);
    }
}
