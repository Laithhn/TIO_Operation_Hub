using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A70: the Reporting Center redesign API under <c>/api/v1/reporting</c> — Cases Report Builder metadata and authorized filter values,
/// server-side preview, saved report definitions, asynchronous export jobs (202 + polling, idempotent, cancellable), schedules of saved
/// reports and the usage overview. Every endpoint needs a business role and the Export permission (as the A62 Reporting Center).
/// </summary>
public static class BuilderEndpoints
{
    public sealed record PreviewInput(CasesDefinition? Definition, int? Page, int? PageSize, string? TimeZone);
    public sealed record ExportInput(CasesDefinition? Definition, long? SavedReportId, string? Format, BuilderExportOptions? Options, string? TimeZone, DateTimeOffset? Cutoff, string? IdempotencyKey);
    public sealed record SavedReportInput(string? Name, string? Description, string? Visibility, long? TeamId, List<long>? ShareUserIds, CasesDefinition? Definition, int? Revision);
    public sealed record DuplicateInput(string? Name);
    public sealed record BuilderScheduleInput(long? SavedReportId, string? Name, string? Format, BuilderExportOptions? Options, ScheduleFrequency? Frequency, int? DayOfWeek, int? DayOfMonth,
        string? Time, string? TimeZone, List<long>? RecipientIds, bool? IsActive);

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static readonly int[] PageSizes = [25, 50, 100];

    private static object? Out(CaseField f, CaseReportRow r) => f.Key == "jiraKeys" ? r.JiraKeys : CasesFields.Value(r, f) is Enum e ? e.ToString() : CasesFields.Value(r, f);

    public static object JobDto(ExportJob j, string? user, bool mine) => new
    {
        j.Id, j.AuditId, j.Report, j.ReportName, format = j.Format.ToString().ToLowerInvariant(), status = j.Status == ExportStatus.Pending ? "Queued" : j.Status.ToString(),
        j.FilterSummary, j.TimeZone, j.RequestedAt, j.StartedAt, j.CompletedAt, j.RowCount, j.FileSize, j.FileName, j.ExpiresAt, j.Error, j.Source, j.ScheduleId, j.RetryOfId,
        j.SavedReportId, j.Attempts, j.CutoffAt, user, builder = j.DefinitionJson != null,
        canDownload = mine && j.Status == ExportStatus.Completed && j.StoredPath != null,
        canRetry = mine && j.Status is ExportStatus.Failed or ExportStatus.Expired or ExportStatus.Cancelled,
        canCancel = mine && j.DefinitionJson != null && j.Status is ExportStatus.Pending or ExportStatus.Processing && !j.CancelRequested
    };

    private static async Task<List<long>> MyTeamsAsync(HubDbContext db, UserContext me, CancellationToken ct) =>
        await db.TeamMembers.AsNoTracking().Where(m => m.UserId == me.UserId && m.IsActive).Select(m => m.TeamId).Distinct().ToListAsync(ct);

    private static IQueryable<SavedReport> VisibleReports(HubDbContext db, long uid, List<long> teams) =>
        db.SavedReports.Where(r => r.OwnerUserId == uid || (r.Visibility == ReportVisibility.Shared && r.Shares.Any(s => s.UserId == uid))
            || (r.Visibility == ReportVisibility.Team && r.TeamId != null && teams.Contains(r.TeamId.Value)));

    private static async Task<SavedReport> FindVisibleAsync(HubDbContext db, UserContext me, long id, CancellationToken ct) =>
        await VisibleReports(db, me.UserId!.Value, await MyTeamsAsync(db, me, ct)).Include(r => r.Shares).ThenInclude(s => s.User).Include(r => r.Owner).FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("The saved report");

    private static async Task<object> SavedDto(HubDbContext db, SavedReport r, UserContext me, CancellationToken ct)
    {
        var fav = await db.SavedReportFavorites.AnyAsync(f => f.SavedReportId == r.Id && f.UserId == me.UserId, ct);
        var team = r.TeamId is { } t ? await db.Teams.AsNoTracking().Where(x => x.Id == t).Select(x => x.Name).FirstOrDefaultAsync(ct) : null;
        var schedules = await db.ReportSchedules.CountAsync(s => s.SavedReportId == r.Id, ct);
        return new
        {
            r.Id, r.Name, r.Description, r.ReportType, visibility = r.Visibility.ToString(), r.TeamId, team, owner = r.Owner?.DisplayName, r.OwnerUserId, isOwner = r.OwnerUserId == me.UserId,
            isFavorite = fav, r.Revision, r.SchemaVersion, r.CreatedAt, r.UpdatedAt, r.LastRunAt, schedules,
            shares = r.Shares.Select(s => new { id = s.UserId, name = s.User?.DisplayName })
        };
    }

    public static void MapBuilderEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/reporting").WithTags("Reporting Center");

        // ---------------------------------------------------------------- metadata ----------------------------------------------------------------
        g.MapGet("/report-types", (UserContext me) =>
        {
            ExportService.RequireExport(me);
            return Results.Ok(new[] { new { key = "cases", name = "Cases report", category = ReportCatalog.Operations, builder = true, catalogKey = "cases" } });
        });

        g.MapGet("/report-types/cases", (UserContext me, ExportStore store) =>
        {
            ExportService.RequireExport(me);
            var o = store.Options;
            return Results.Ok(new
            {
                key = "cases", name = "Cases report", schemaVersion = 1,
                description = "Build a cases report with filters, columns, sorting and grouping; preview it live and export it to Excel or PDF.",
                fields = CasesFields.VisibleTo(me).Select(f => new
                {
                    f.Key, f.Label, type = f.Type.ToString(), f.Category, f.Description, f.Sortable, f.Groupable, filterable = f.Filterable && f.Build is not null,
                    f.Options, operators = f.Filterable && f.Build is not null ? CasesFields.Operators[f.Type] : [], required = f.Key == "caseId"
                }),
                dateFields = CasesFields.DateFields.Select(k => new { key = k, label = CasesFields.ByKey[k].Label }),
                datePresets = CasesFields.DatePresets, slaStatuses = CasesFields.SlaStatuses, dueOptions = CasesFields.DueOptions,
                statuses = Enum.GetNames<CaseStatus>(), priorities = Enum.GetNames<Priority>(), scopes = Enum.GetNames<WorkScope>(),
                defaultColumns = CasesFields.DefaultColumns, defaultSort = new[] { new { field = "priority", direction = "asc" }, new { field = "caseId", direction = "asc" } },
                limits = new { maxRows = o.MaxRows, pdfMaxRows = o.PdfMaxRows, retentionDays = o.RetentionDays, maxColumns = CasesFields.MaxColumns, maxSort = CasesFields.MaxSort,
                    maxRules = CasesFields.MaxRules, maxDepth = CasesFields.MaxDepth, pageSizes = PageSizes, maxActiveExports = o.MaxActiveExportsPerUser },
                formats = new[] { new { key = "xlsx", label = "Excel (.xlsx)" }, new { key = "pdf", label = "PDF (.pdf)" } }
            });
        });

        // Authorized option values: clients and environments come through the scope filters, so only accessible ones are listed.
        g.MapGet("/report-types/cases/filters", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var clients = await db.Clients.AsNoTracking().OrderBy(c => c.Code).Select(c => new { id = c.Id, label = c.Code, sub = c.Name }).ToListAsync(ct);
            var teams = await db.Teams.AsNoTracking().OrderBy(t => t.Name).Select(t => new { id = t.Id, label = t.Name }).ToListAsync(ct);
            var products = await db.Products.AsNoTracking().OrderBy(p => p.Code).Select(p => new { id = p.Id, label = p.Code, sub = p.Name }).ToListAsync(ct);
            var environments = await db.Environments.AsNoTracking().OrderBy(e => e.Client!.Code).ThenBy(e => e.Name).Take(1000)
                .Select(e => new { id = e.Id, label = e.Name, sub = e.Client!.Code, clientId = e.ClientId }).ToListAsync(ct);
            var owners = await db.Users.AsNoTracking().Where(u => u.IsActive || db.Cases.Any(c => c.OwnerUserId == u.Id)).OrderBy(u => u.DisplayName)
                .Select(u => new { id = u.Id, label = u.DisplayName, active = u.IsActive }).ToListAsync(ct);
            var types = await db.LookupValues.AsNoTracking().Where(l => l.ListName == Admin.LookupLists.CaseType).OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
                .Select(l => new { id = l.Code, label = l.Label, retired = l.IsRetired }).ToListAsync(ct);
            return Results.Ok(new { clients, teams, products, environments, owners, types, myTeams = await MyTeamsAsync(db, me, ct) });
        });

        // ---------------------------------------------------------------- preview ----------------------------------------------------------------
        g.MapPost("/reports/cases/preview", async (PreviewInput input, CasesReportService svc, ExportService export, ExportStore store, UserContext me, ILoggerFactory logs, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var zone = export.ZoneOf(input.TimeZone);
            var k = await svc.ClockAsync(null, ct);
            var v = await svc.ValidateAsync(input.Definition, zone, k, ct);
            var size = PageSizes.Contains(input.PageSize ?? 25) ? input.PageSize ?? 25 : 25;
            var page = Math.Clamp(input.Page ?? 1, 1, 100_000);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(30));
            var watch = Stopwatch.StartNew();
            CasesPage result;
            try { result = await svc.RunAsync(v, k, (page - 1) * size, size, timeout.Token); }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                return Results.Problem(statusCode: StatusCodes.Status504GatewayTimeout, title: "The preview took too long", detail: "Narrow the filters (for example a shorter date range or fewer clients) and try again.");
            }
            ReportingMetrics.PreviewMs.Record(watch.Elapsed.TotalMilliseconds);
            logs.CreateLogger("Reporting").LogDebug("Cases preview: {Total} row(s) in {Ms} ms", result.Total, (int)watch.Elapsed.TotalMilliseconds);
            var o = store.Options;
            var warnings = new List<string>(v.Warnings);
            if (result.Total > o.MaxRows) warnings.Add($"{result.Total:N0} cases match; one export holds at most {o.MaxRows:N0}. Narrow the filters before exporting.");
            if (result.Total > o.PdfMaxRows && result.Total <= o.MaxRows) warnings.Add($"A detailed PDF holds at most {o.PdfMaxRows:N0} rows; use Excel or the PDF summary for this result.");
            return Results.Ok(new
            {
                total = result.Total, countExact = true, page, pageSize = size, cutoff = k.Now, timeZone = zone.Id, durationMs = (int)watch.Elapsed.TotalMilliseconds,
                dateRange = new { from = v.RangeFrom, toExclusive = v.RangeTo },
                columns = v.Columns.Select(c => new { c.Key, c.Label, type = c.Type.ToString() }),
                rows = result.Rows.Select(r => new { id = r.Id, cells = v.Columns.Select(c => Out(c, r)), clientId = r.ClientId }),   // A71: clientId for the logo
                summary = new { byStatus = result.ByStatus, byPriority = result.ByPriority, bySla = result.BySla },
                groupBy = v.GroupBy?.Key, groups = result.Groups?.Select(x => new { key = x.Key, count = x.Count }),
                filters = v.Summary.Select(s => new { label = s.Label, value = s.Value }), warnings,
                limits = new { maxRows = o.MaxRows, pdfMaxRows = o.PdfMaxRows }, exportable = result.Total > 0 && result.Total <= o.MaxRows
            });
        });

        // ---------------------------------------------------------- saved report definitions ----------------------------------------------------------
        g.MapGet("/report-definitions", async (string? scope, string? q, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var uid = me.UserId!.Value;
            var query = VisibleReports(db, uid, await MyTeamsAsync(db, me, ct)).AsNoTracking();
            var favs = db.SavedReportFavorites.Where(f => f.UserId == uid).Select(f => f.SavedReportId);
            query = scope switch
            {
                "mine" => query.Where(r => r.OwnerUserId == uid),
                "shared" => query.Where(r => r.OwnerUserId != uid),
                "favorites" => query.Where(r => favs.Contains(r.Id)),
                _ => query
            };
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(r => r.Name.Contains(q) || (r.Description != null && r.Description.Contains(q)));
            var list = await query.OrderByDescending(r => favs.Contains(r.Id)).ThenBy(r => r.Name).Take(500).Select(r => new
            {
                r.Id, r.Name, r.Description, r.ReportType, visibility = r.Visibility.ToString(), r.TeamId, team = db.Teams.Where(t => t.Id == r.TeamId).Select(t => t.Name).FirstOrDefault(),
                owner = r.Owner!.DisplayName, r.OwnerUserId, isOwner = r.OwnerUserId == uid, isFavorite = favs.Contains(r.Id), r.Revision, r.UpdatedAt, r.LastRunAt,
                schedules = db.ReportSchedules.Count(s => s.SavedReportId == r.Id), shares = r.Shares.Count
            }).ToListAsync(ct);
            return Results.Ok(list);
        });

        g.MapGet("/report-definitions/{id:long}", async (long id, HubDbContext db, CasesReportService svc, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var r = await FindVisibleAsync(db, me, id, ct);
            var warnings = new List<string>();
            var stored = CasesReportService.Deserialize(r.DefinitionJson);
            if (stored is null) warnings.Add("The stored definition could not be read; the default configuration is shown.");
            var definition = svc.Sanitize(stored ?? new CasesDefinition(), warnings);
            return Results.Ok(new { report = await SavedDto(db, r, me, ct), definition, warnings });
        });

        g.MapPost("/report-definitions", async (SavedReportInput input, HubDbContext db, CasesReportService svc, ExportService export, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            if (await db.SavedReports.CountAsync(r => r.OwnerUserId == me.UserId, ct) >= 200) throw new ValidationException("name", "You can keep at most 200 saved reports; delete some first.");
            var r = new SavedReport { OwnerUserId = me.UserId!.Value, CreatedAt = clock.GetUtcNow() };
            await ApplyAsync(r, input, db, svc, export, me, clock, ct);
            db.SavedReports.Add(r);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/reporting/report-definitions/{r.Id}", new { r.Id, r.Revision });
        });

        g.MapPut("/report-definitions/{id:long}", async (long id, SavedReportInput input, HubDbContext db, CasesReportService svc, ExportService export, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var r = await db.SavedReports.Include(x => x.Shares).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct);
            if (r is null)
            {
                // Viewers of a shared report may not change it; everyone else learns nothing about it.
                if (await VisibleReports(db, me.UserId!.Value, await MyTeamsAsync(db, me, ct)).AnyAsync(x => x.Id == id, ct)) throw new ForbiddenException("Only the owner can change this report. Duplicate it to make your own version.");
                throw new NotFoundException("The saved report");
            }
            if (input.Revision != r.Revision) throw new ConflictException("The report was changed in the meantime (another tab or session). Reload it, then save again.", new() { ["revision"] = ["Reload the report: it has a newer revision."] });
            await ApplyAsync(r, input, db, svc, export, me, clock, ct);
            r.Revision++;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { r.Id, r.Revision });
        });

        g.MapDelete("/report-definitions/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var r = await db.SavedReports.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId, ct) ?? throw new NotFoundException("The saved report");
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var schedules = db.ReportSchedules.Where(s => s.SavedReportId == id);
            await db.ReportScheduleRecipients.Where(x => schedules.Any(s => s.Id == x.ScheduleId)).ExecuteDeleteAsync(ct);
            await db.ExportJobs.Where(j => j.SavedReportId == id).ExecuteUpdateAsync(s => s.SetProperty(j => j.SavedReportId, (long?)null), ct);
            await schedules.ExecuteDeleteAsync(ct);
            await db.SavedReportFavorites.Where(f => f.SavedReportId == id).ExecuteDeleteAsync(ct);
            await db.SavedReportShares.Where(s => s.SavedReportId == id).ExecuteDeleteAsync(ct);
            db.SavedReports.Remove(r);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/report-definitions/{id:long}/duplicate", async (long id, DuplicateInput input, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var source = await FindVisibleAsync(db, me, id, ct);
            var name = string.IsNullOrWhiteSpace(input.Name) ? $"Copy of {source.Name}" : input.Name.Trim();
            new Check().Text("name", name, 120, "the report name", true).ThrowIfAny();
            var baseName = name.Length > 110 ? name[..110] : name;
            for (var n = 2; await db.SavedReports.AnyAsync(r => r.OwnerUserId == me.UserId && r.Name == name, ct); n++) name = $"{baseName} ({n})";
            var copy = new SavedReport { OwnerUserId = me.UserId!.Value, ReportType = source.ReportType, Name = name, Description = source.Description, Visibility = ReportVisibility.Private,
                SchemaVersion = source.SchemaVersion, DefinitionJson = source.DefinitionJson, CreatedAt = clock.GetUtcNow(), UpdatedAt = clock.GetUtcNow() };
            db.SavedReports.Add(copy);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/reporting/report-definitions/{copy.Id}", new { copy.Id, copy.Name });
        });

        g.MapPut("/report-definitions/{id:long}/favorite", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            await FindVisibleAsync(db, me, id, ct);
            if (!await db.SavedReportFavorites.AnyAsync(f => f.SavedReportId == id && f.UserId == me.UserId, ct))
            {
                db.SavedReportFavorites.Add(new SavedReportFavorite { SavedReportId = id, UserId = me.UserId!.Value });
                await db.SaveChangesAsync(ct);
            }
            return Results.NoContent();
        });
        g.MapDelete("/report-definitions/{id:long}/favorite", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            await db.SavedReportFavorites.Where(f => f.SavedReportId == id && f.UserId == me.UserId).ExecuteDeleteAsync(ct);
            return Results.NoContent();
        });

        // ---------------------------------------------------------------- exports ----------------------------------------------------------------
        g.MapPost("/exports", async (ExportInput input, HttpRequest http, HubDbContext db, CasesReportService svc, ExportService export, ExportStore store, ExportQueue queue,
            UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var o = store.Options;
            var key = (http.Headers["Idempotency-Key"].FirstOrDefault() ?? input.IdempotencyKey)?.Trim();
            if (key is { Length: > 80 }) throw new ValidationException("idempotencyKey", "The idempotency key is too long.");
            if (!string.IsNullOrEmpty(key) && await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(j => j.UserId == me.UserId && j.IdempotencyKey == key, ct) is { } same)
                return Results.Ok(JobDto(same, me.DisplayName, true));
            var format = (input.Format ?? "").ToLowerInvariant() switch
            {
                "xlsx" or "excel" => ExportFormat.Xlsx,
                "pdf" => ExportFormat.Pdf,
                _ => throw new ValidationException("format", "Choose Excel (.xlsx) or PDF.")
            };
            var options = input.Options ?? new BuilderExportOptions();
            if (options.PdfMode is not (null or "summary" or "detailed")) throw new ValidationException("options.pdfMode", "Choose the summary or the detailed PDF.");
            new Check().Text("options.fileName", options.FileName, 100, "the file name").ThrowIfAny();
            var definition = input.Definition;
            SavedReport? saved = null;
            if (input.SavedReportId is { } sid)
            {
                saved = await FindVisibleAsync(db, me, sid, ct);
                definition ??= CasesReportService.Deserialize(saved.DefinitionJson);
            }
            var zone = export.ZoneOf(input.TimeZone);
            var now = clock.GetUtcNow();
            // The preview's evaluation time, when recent: the file then uses the same "now" for overdue/SLA/age and leaves out cases created later.
            var cutoff = input.Cutoff is { } c && c <= now && c >= now.AddHours(-24) ? c.ToUniversalTime() : now;
            var k = await svc.ClockAsync(cutoff, ct);
            var v = await svc.ValidateAsync(definition, zone, k, ct);
            var total = await (await svc.QueryAsync(v, k, cutoff, ct)).CountAsync(ct);
            if (total == 0) throw new ValidationException("definition", "No cases match these filters: there is nothing to export.");
            if (total > o.MaxRows) throw new ValidationException("definition", $"{total:N0} cases match; one export can hold at most {o.MaxRows:N0}. Narrow the filters and export again.");
            if (format == ExportFormat.Pdf && options.PdfMode == "detailed" && total > o.PdfMaxRows)
                throw new ValidationException("options.pdfMode", $"{total:N0} cases match; a detailed PDF holds at most {o.PdfMaxRows:N0}. Use Excel or the PDF summary.");
            var active = await db.ExportJobs.CountAsync(j => j.UserId == me.UserId && j.DefinitionJson != null && (j.Status == ExportStatus.Pending || j.Status == ExportStatus.Processing), ct);
            if (active >= o.MaxActiveExportsPerUser)
                return Results.Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "Too many exports in progress", detail: $"You have {active} exports queued or running. Wait for one to finish, or cancel one.");
            var summary = string.Join("; ", v.Summary.Select(s => $"{s.Label} = {s.Value}"));
            var job = new ExportJob
            {
                UserId = me.UserId!.Value, Report = "cases", ReportName = saved?.Name ?? "Cases report", Format = format, FiltersJson = "{}", FilterSummary = summary.Length > 2000 ? summary[..2000] : summary,
                ColumnsJson = JsonSerializer.Serialize(v.Columns.Select(x => x.Key)), TimeZone = zone.Id, Status = ExportStatus.Pending, RequestedAt = now, Source = "Report builder",
                DefinitionJson = CasesReportService.Serialize(v.Definition), OptionsJson = JsonSerializer.Serialize(options, Json), IdempotencyKey = string.IsNullOrEmpty(key) ? null : key,
                SavedReportId = saved?.Id, CutoffAt = cutoff
            };
            db.ExportJobs.Add(job);
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException ex) when (key is not null && ex.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 })
            {
                // A concurrent request with the same key won the race: return its job.
                var first = await db.ExportJobs.AsNoTracking().FirstAsync(j => j.UserId == me.UserId && j.IdempotencyKey == key, ct);
                return Results.Ok(JobDto(first, me.DisplayName, true));
            }
            await db.AuditActionAsync("ExportRequested", "Report", job.Id, job.ReportName, null, null, new { exportId = job.AuditId, format = format.ToString(), rows = total, filters = job.FilterSummary }, ct);
            await db.SaveChangesAsync(ct);
            queue.Signal();
            return Results.Accepted($"/api/v1/reporting/exports/{job.Id}", JobDto(job, me.DisplayName, true));
        });

        g.MapGet("/exports/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (j is null || (j.UserId != me.UserId && !me.Has(Grant.Audit))) throw new NotFoundException("The export");
            var user = await db.Users.AsNoTracking().Where(u => u.Id == j.UserId).Select(u => u.DisplayName).FirstOrDefaultAsync(ct);
            return Results.Ok(JobDto(j, user, j.UserId == me.UserId));
        });

        g.MapGet("/exports/{id:long}/download", (long id, HubDbContext db, UserContext me, ExportStore store, TimeProvider clock, CancellationToken ct) => ReportingEndpoints.DownloadAsync(id, db, me, store, clock, ct));

        g.MapPost("/exports/{id:long}/cancel", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.UserId && x.DefinitionJson != null, ct) ?? throw new NotFoundException("The export");
            // A queued job is cancelled at once; a running one stops at its next checkpoint.
            var queued = await db.ExportJobs.Where(x => x.Id == id && x.Status == ExportStatus.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, ExportStatus.Cancelled).SetProperty(x => x.CancelRequested, true).SetProperty(x => x.CompletedAt, DateTimeOffset.UtcNow).SetProperty(x => x.Error, "Cancelled by the requester."), ct);
            if (queued == 0)
            {
                var running = await db.ExportJobs.Where(x => x.Id == id && x.Status == ExportStatus.Processing).ExecuteUpdateAsync(s => s.SetProperty(x => x.CancelRequested, true), ct);
                if (running == 0) throw new ValidationException("status", $"The export is already {j.Status.ToString().ToLowerInvariant()} and cannot be cancelled.");
            }
            await db.AuditActionAsync("ExportCancelled", "Report", j.Id, j.ReportName, null, null, new { exportId = j.AuditId }, ct);
            await db.SaveChangesAsync(ct);
            return Results.Accepted($"/api/v1/reporting/exports/{id}");
        });

        g.MapPost("/exports/{id:long}/retry", async (long id, HubDbContext db, ExportQueue queue, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var j = await db.ExportJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.UserId && x.DefinitionJson != null, ct) ?? throw new NotFoundException("The export");
            if (j.Status is not (ExportStatus.Failed or ExportStatus.Expired or ExportStatus.Cancelled)) throw new ValidationException("status", "Only a failed, cancelled or expired export can be generated again.");
            // The new job runs with today's data (a new cutoff) and is validated again under the requester's access by the worker.
            var now = clock.GetUtcNow();
            var job = new ExportJob
            {
                UserId = j.UserId, Report = j.Report, ReportName = j.ReportName, Format = j.Format, FiltersJson = j.FiltersJson, FilterSummary = j.FilterSummary, ColumnsJson = j.ColumnsJson, TimeZone = j.TimeZone,
                Status = ExportStatus.Pending, RequestedAt = now, Source = j.Source == "Schedule" ? "Report builder" : j.Source, RetryOfId = j.Id, DefinitionJson = j.DefinitionJson, OptionsJson = j.OptionsJson,
                SavedReportId = j.SavedReportId, CutoffAt = now
            };
            db.ExportJobs.Add(job);
            await db.SaveChangesAsync(ct);
            queue.Signal();
            return Results.Accepted($"/api/v1/reporting/exports/{job.Id}", JobDto(job, me.DisplayName, true));
        });

        // ---------------------------------------------------------------- schedules ----------------------------------------------------------------
        g.MapPost("/schedules", async (BuilderScheduleInput input, HubDbContext db, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = new ReportSchedule { OwnerUserId = me.UserId!.Value, CreatedAt = clock.GetUtcNow(), Report = "cases" };
            await ApplyScheduleAsync(s, input, db, resolver, me, clock, ct, creating: true);
            db.ReportSchedules.Add(s);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/reporting/schedules/{s.Id}", new { s.Id, s.NextRunAt });
        });
        g.MapGet("/schedules", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var list = await db.ReportSchedules.AsNoTracking().Include(s => s.Recipients).ThenInclude(r => r.User).Include(s => s.SavedReport).Where(s => s.OwnerUserId == me.UserId).OrderBy(s => s.Name).ToListAsync(ct);
            return Results.Ok(list.Select(ReportingEndpoints.ScheduleDto));
        });
        g.MapMethods("/schedules/{id:long}", ["PATCH"], async (long id, BuilderScheduleInput input, HubDbContext db, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var s = await db.ReportSchedules.Include(x => x.Recipients).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == me.UserId && x.SavedReportId != null, ct) ?? throw new NotFoundException("The schedule");
            await ApplyScheduleAsync(s, input, db, resolver, me, clock, ct, creating: false);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { s.Id, s.NextRunAt, s.IsActive });
        });

        // ---------------------------------------------------------------- overview ----------------------------------------------------------------
        // Report usage only (the caller's own exports and schedules): never presented as operational or SLA performance.
        g.MapGet("/overview", async (int? days, HubDbContext db, UserContext me, ExportStore store, TimeProvider clock, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var span = days is 7 or 30 or 90 ? days.Value : 30;
            var now = clock.GetUtcNow();
            var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
            var today = TimeZoneInfo.ConvertTime(now, zone).Date;
            DateTimeOffset Day(DateTime d) => new DateTimeOffset(d, zone.GetUtcOffset(d)).ToUniversalTime();
            var start = Day(today.AddDays(-(span - 1)));
            var prevStart = Day(today.AddDays(-(2 * span - 1)));
            var mine = db.ExportJobs.AsNoTracking().Where(j => j.UserId == me.UserId);
            var window = await mine.Where(j => j.RequestedAt >= prevStart).Select(j => new { j.RequestedAt, j.Status, j.Report }).ToListAsync(ct);
            var current = window.Where(j => j.RequestedAt >= start).ToList();
            var previous = window.Where(j => j.RequestedAt < start).ToList();
            var completed = current.Count(j => j.Status is ExportStatus.Completed or ExportStatus.Expired);
            var failed = current.Count(j => j.Status == ExportStatus.Failed);
            var prevCompleted = previous.Count(j => j.Status is ExportStatus.Completed or ExportStatus.Expired);
            var prevFailed = previous.Count(j => j.Status == ExportStatus.Failed);
            var perDay = Enumerable.Range(0, span).Select(i =>
            {
                var d = today.AddDays(-(span - 1) + i);
                var a = Day(d); var b = Day(d.AddDays(1));
                var inDay = current.Where(j => j.RequestedAt >= a && j.RequestedAt < b).ToList();
                return new { day = d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), completed = inDay.Count(j => j.Status is ExportStatus.Completed or ExportStatus.Expired), failed = inDay.Count(j => j.Status == ExportStatus.Failed) };
            }).ToList();
            var categories = current.GroupBy(j => ReportCatalog.Find(j.Report)?.Category ?? ReportCatalog.Operations).Select(x => new { category = x.Key, count = x.Count() }).OrderByDescending(x => x.count).ToList();
            var top = current.GroupBy(j => j.Report).Select(x => new { report = x.Key, name = ReportCatalog.Find(x.Key)?.Name ?? x.Key, count = x.Count() }).OrderByDescending(x => x.count).Take(5).ToList();
            var recent = await mine.OrderByDescending(j => j.RequestedAt).ThenByDescending(j => j.Id).Take(6).ToListAsync(ct);
            var schedules = await db.ReportSchedules.AsNoTracking().Include(s => s.Recipients).ThenInclude(r => r.User).Include(s => s.SavedReport).Where(s => s.OwnerUserId == me.UserId)
                .OrderByDescending(s => s.IsActive).ThenBy(s => s.NextRunAt).Take(6).ToListAsync(ct);
            var activeSchedules = await db.ReportSchedules.CountAsync(s => s.OwnerUserId == me.UserId && s.IsActive, ct);
            var nextRun = await db.ReportSchedules.Where(s => s.OwnerUserId == me.UserId && s.IsActive).OrderBy(s => s.NextRunAt).Select(s => (DateTimeOffset?)s.NextRunAt).FirstOrDefaultAsync(ct);
            var savedReports = await VisibleReports(db, me.UserId!.Value, await MyTeamsAsync(db, me, ct)).CountAsync(ct);
            return Results.Ok(new
            {
                days = span, from = start, generatedAt = now, timeZone = zone.Id,
                exports = new { total = current.Count, completed, failed, previousCompleted = prevCompleted, previousFailed = prevFailed,
                    successRate = completed + failed == 0 ? (double?)null : Math.Round(100.0 * completed / (completed + failed), 1),
                    inProgress = current.Count(j => j.Status is ExportStatus.Pending or ExportStatus.Processing) },
                schedules = new { active = activeSchedules, nextRunAt = nextRun },
                availableReports = ReportCatalog.All.Count, savedReports,
                perDay, categories, topReports = top,
                recent = recent.Select(j => JobDto(j, me.DisplayName, true)), upcoming = schedules.Select(ReportingEndpoints.ScheduleDto),
                retentionDays = store.Options.RetentionDays, maxRows = store.Options.MaxRows
            });
        });
    }

    private static async Task ApplyAsync(SavedReport r, SavedReportInput input, HubDbContext db, CasesReportService svc, ExportService export, UserContext me, TimeProvider clock, CancellationToken ct)
    {
        var check = new Check().Text("name", input.Name, 120, "the report name", true).Text("description", input.Description, 1000, "the description");
        if (!Enum.TryParse<ReportVisibility>(input.Visibility ?? "Private", true, out var visibility) || int.TryParse(input.Visibility, out _)) check.Add("visibility", "Choose private, team or shared.");
        var teams = await MyTeamsAsync(db, me, ct);
        if (visibility == ReportVisibility.Team && (input.TeamId is not { } t || !teams.Contains(t))) check.Add("teamId", "Select one of your teams.");
        var shares = (input.ShareUserIds ?? []).Where(id => id != me.UserId).Distinct().ToList();
        if (visibility == ReportVisibility.Shared)
        {
            if (shares.Count == 0) check.Add("shareUserIds", "Select at least one person to share with.");
            if (shares.Count > 50) check.Add("shareUserIds", "Share with at most 50 people.");
            var known = await db.Users.AsNoTracking().Where(u => shares.Contains(u.Id) && u.IsActive).Select(u => u.Id).ToListAsync(ct);
            if (known.Count != shares.Count) check.Add("shareUserIds", "Share only with active hub users.");
        }
        var name = input.Name?.Trim() ?? "";
        if (name.Length > 0 && await db.SavedReports.AnyAsync(x => x.OwnerUserId == me.UserId && x.Name == name && x.Id != r.Id, ct))
            check.Add("name", "You already have a saved report with this name.");
        check.ThrowIfAny();
        // The definition is checked under the owner's access; viewers' runs are checked again under theirs.
        var v = await svc.ValidateAsync(input.Definition, export.ZoneOf(null), await svc.ClockAsync(null, ct), ct);
        r.Name = name;
        r.Description = Text.Clean(input.Description);
        r.Visibility = visibility;
        r.TeamId = visibility == ReportVisibility.Team ? input.TeamId : null;
        r.DefinitionJson = CasesReportService.Serialize(v.Definition);
        r.SchemaVersion = 1;
        r.UpdatedAt = clock.GetUtcNow();
        var keep = visibility == ReportVisibility.Shared ? shares : [];
        db.SavedReportShares.RemoveRange(r.Shares.Where(s => !keep.Contains(s.UserId)));
        foreach (var id in keep.Where(id => r.Shares.All(s => s.UserId != id))) r.Shares.Add(new SavedReportShare { UserId = id });
    }

    private static async Task ApplyScheduleAsync(ReportSchedule s, BuilderScheduleInput input, HubDbContext db, UserResolver resolver, UserContext me, TimeProvider clock, CancellationToken ct, bool creating)
    {
        var check = new Check().Text("name", input.Name, 120, "the schedule name", true);
        SavedReport? saved = null;
        var savedId = input.SavedReportId ?? s.SavedReportId;
        if (savedId is null) check.Add("savedReportId", "Save the report first, then schedule it.");
        else
        {
            saved = await VisibleReports(db, me.UserId!.Value, await MyTeamsAsync(db, me, ct)).FirstOrDefaultAsync(r => r.Id == savedId, ct);
            if (saved is null) check.Add("savedReportId", "Select a saved report you can see.");
        }
        var format = (input.Format ?? "xlsx").ToLowerInvariant() switch { "xlsx" or "excel" => (ExportFormat?)ExportFormat.Xlsx, "pdf" => ExportFormat.Pdf, _ => null };
        if (format is null) check.Add("format", "Choose Excel (.xlsx) or PDF.");
        var options = input.Options ?? new BuilderExportOptions();
        if (options.PdfMode is not (null or "summary" or "detailed")) check.Add("options.pdfMode", "Choose the summary or the detailed PDF.");
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
            // Recipients are checked now and again at every run: each receives only what their own access allows.
            var r = await resolver.ForUserAsync(id, ct);
            if (r is null || !r.IsActive) check.Add("recipientIds", $"Recipient #{id} is not an active hub user.");
            else if ((r.Grants & Grant.Export) != Grant.Export || r.Roles.Length == 0) check.Add("recipientIds", $"{r.DisplayName} does not have the Export permission.");
        }
        check.ThrowIfAny();
        s.Name = input.Name!.Trim();
        s.SavedReportId = saved!.Id;
        s.Report = "cases";
        s.FiltersJson = "{}";
        s.FilterSummary = $"Saved report: {saved.Name}";
        s.Format = format!.Value;
        s.OptionsJson = JsonSerializer.Serialize(options, Json);
        s.Frequency = input.Frequency!.Value;
        s.DayOfWeek = s.Frequency == ScheduleFrequency.Weekly ? input.DayOfWeek : null;
        s.DayOfMonth = s.Frequency == ScheduleFrequency.Monthly ? input.DayOfMonth : null;
        s.TimeOfDay = time;
        s.TimeZone = zone!.Id;
        s.IsActive = input.IsActive ?? (creating || s.IsActive);
        s.UpdatedAt = clock.GetUtcNow();
        s.NextRunAt = ScheduleClock.Next(s.Frequency, s.DayOfWeek, s.DayOfMonth, s.TimeOfDay, zone, s.UpdatedAt);
        db.ReportScheduleRecipients.RemoveRange(s.Recipients.Where(r => !ids.Contains(r.UserId)));
        foreach (var id in ids.Where(id => s.Recipients.All(r => r.UserId != id))) s.Recipients.Add(new ReportScheduleRecipient { UserId = id });
    }
}
