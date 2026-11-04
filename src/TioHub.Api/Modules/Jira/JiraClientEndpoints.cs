using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Jira;

/// <summary>A76: Clients → Jira integration. Reading needs the tab and the client's scope; changing also needs Client structure Coordinate for this client.</summary>
public static class JiraClientEndpoints
{
    private sealed record ContractOption(long Id, string Ref, string Title);
    public sealed record SettingsInput(bool IsEnabled, long? JiraConnectionId, long? DefaultResponsibleTeamId, string? DefaultCaseType, Priority? DefaultPriority, int? NextReviewHours,
        bool ImportDoneIssues, DateOnly? ImportFrom, bool SyncOnStartup, bool FullReconciliation, int? FullReconciliationDays, int? SyncIntervalMinutes);
    public sealed record AddSpacesInput(long? JiraConnectionId, string[]? JiraProjectIds, long? ContractId = null);
    public sealed record SpaceContractInput(long? ContractId, bool ApplyToOpenCases = false, string? Reason = null);
    public sealed record SpaceEnabledInput(bool Enabled);
    public sealed record ReleaseInput(string? Reason);

    private static async Task<long> RequireClientAsync(HubDbContext db, UserContext me, long id, CancellationToken ct)
    {
        if (!me.HasClient(id) || !await db.Clients.AnyAsync(c => c.Id == id, ct)) throw new NotFoundException("The client");
        return id;
    }

    /// <summary>A84: a space's cases can only follow an active contract of the client that owns the space.</summary>
    internal static async Task CheckSpaceContractAsync(HubDbContext db, long clientId, long? contractId, CancellationToken ct)
    {
        if (contractId is { } id && !await db.Contracts.AnyAsync(k => k.Id == id && k.ClientId == clientId && k.Status == ContractStatus.Active, ct))
            throw new ValidationException("contractId", "Select an active contract of this client.");
    }

    private static void RequireChange(HubAccess access, long id) => access.RequireIn(RightKeys.Structure, RightKeys.Coordinate, ResourceContext.ForRecord(id, null));

    public static void MapJiraClientEndpoints(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/clients/{id:long}/jira").WithTags("Jira integration");

        g.MapGet("", async (long id, HubDbContext db, UserContext me, TimeProvider clock, IOptions<JiraOptions> options, JiraSecretStore secrets, CancellationToken ct) =>
        {
            await RequireClientAsync(db, me, id, ct);
            var s = await db.ClientJiraSettings.AsNoTracking().FirstOrDefaultAsync(x => x.ClientId == id, ct);
            var spaces = await db.ClientJiraSpaces.AsNoTracking().Include(x => x.JiraConnection).Where(x => x.ClientId == id && x.ReleasedAt == null).OrderBy(x => x.ProjectKey).ToListAsync(ct);
            var ids = spaces.Select(x => x.Id).ToList();
            var states = await db.JiraSpaceSyncStates.AsNoTracking().Where(x => ids.Contains(x.ClientJiraSpaceId)).ToDictionaryAsync(x => x.ClientJiraSpaceId, ct);
            var cases = await db.JiraCaseMappings.AsNoTracking().Where(m => ids.Contains(m.ClientJiraSpaceId) && m.CaseId != null).GroupBy(m => m.ClientJiraSpaceId).Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            var openIssues = await db.JiraIntegrationIssues.AsNoTracking().Where(i => i.ClientId == id && i.Status == JiraIssueStatus.Open).OrderByDescending(i => i.LastSeenAt).Take(100).ToListAsync(ct);
            var runs = await db.JiraSyncRuns.AsNoTracking().Where(r => r.ClientId == id).OrderByDescending(r => r.StartedAt).ThenByDescending(r => r.Id).Take(10).ToListAsync(ct);
            var contractIds = spaces.Where(x => x.ContractId is not null).Select(x => x.ContractId!.Value).ToList();
            var spaceContracts = await db.Contracts.IgnoreQueryFilters().AsNoTracking().Where(k => contractIds.Contains(k.Id)).Select(k => new { k.Id, k.Ref, k.Title, k.Status }).ToDictionaryAsync(k => k.Id, ct);
            var canManage = me.HasRight(RightKeys.Structure, RightKeys.Coordinate);
            var activeContracts = !canManage ? [] : await db.Contracts.AsNoTracking().Where(k => k.ClientId == id && k.Status == ContractStatus.Active).OrderBy(k => k.Ref).Select(k => new ContractOption(k.Id, k.Ref, k.Title)).ToListAsync(ct);
            var selected = s?.JiraConnectionId;
            var connections = await db.JiraConnections.AsNoTracking().Where(c => c.IsEnabled || c.Id == selected).OrderBy(c => c.Name).Select(c => new { c.Id, c.Name }).ToListAsync(ct);
            var connection = s?.JiraConnectionId is { } cid ? await db.JiraConnections.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cid, ct) : null;

            var checks = new List<object>();
            void Check(string label, string state) => checks.Add(new { label, state });
            if (connection is not null)
            {
                Check("Connection credentials valid", connection.LastTestOk switch { true => "Passed", false => "Error", _ => "Warning" });
                Check("Project discovery successful", connection.LastDiscoveryAt is null ? "Warning" : connection.LastDiscoveryError is null ? "Passed" : "Error");
            }
            foreach (var x in spaces) Check($"{x.ProjectKey} ownership valid for this client", "Passed");
            foreach (var i in openIssues.Where(i => i.Type is JiraIssueType.MissingUserMapping or JiraIssueType.UnknownWorkflowStatus).GroupBy(i => i.Type))
                Check($"{i.Count()} {(i.Key == JiraIssueType.MissingUserMapping ? "user mapping" : "workflow mapping")} warning(s)", "Warning");
            foreach (var i in openIssues.Where(i => i.Type is JiraIssueType.ClientOwnershipConflict or JiraIssueType.IssueMovedBetweenSpaces).Take(5)) Check(i.Description, "Error");
            var errors = openIssues.Count(i => i.Type is JiraIssueType.ClientOwnershipConflict or JiraIssueType.IssueMovedBetweenSpaces or JiraIssueType.FailedIssueImport);
            var warnings = openIssues.Count - errors;

            return Results.Ok(new
            {
                syncEnabled = options.Value.Enabled && options.Value.WorkerSeconds > 0,
                canManage,
                contracts = activeContracts,
                settings = s is null ? null : new { s.IsEnabled, s.JiraConnectionId, s.DefaultResponsibleTeamId, s.DefaultCaseType, s.DefaultPriority, s.NextReviewHours, s.ImportDoneIssues, s.ImportFrom, s.SyncOnStartup, s.FullReconciliation, s.FullReconciliationDays, s.SyncIntervalMinutes, s.LastPreviewAt, version = Convert.ToBase64String(s.RowVersion) },
                summary = new { enabled = s?.IsEnabled == true, assignedSpaces = spaces.Count, lastSuccess = states.Values.Max(x => x.LastSuccessAt), syncIntervalMinutes = s?.SyncIntervalMinutes ?? 15, errors, warnings },
                connections,
                spaces = spaces.Select(x => { var st = states.GetValueOrDefault(x.Id); var contract = x.ContractId is { } linked ? spaceContracts.GetValueOrDefault(linked) : null; return new { x.Id, x.IsEnabled, x.ContractId, contractRef = contract?.Ref, contractTitle = contract?.Title, contractStatus = contract?.Status, x.ProjectKey, x.ProjectName, x.JiraProjectId, x.JiraConnectionId, connection = x.JiraConnection?.Name, siteUrl = x.JiraConnection?.SiteUrl, lastSync = st?.LastSuccessAt, lastRunAt = st?.LastRunAt, health = !x.IsEnabled ? "Disabled" : st?.LastStatus?.ToString() ?? "NotRun", lastError = st?.LastError, cases = cases.GetValueOrDefault(x.Id) }; }),
                checks,
                issues = openIssues.Take(10).Select(i => new { i.Id, i.Type, i.IssueKey, i.ProjectKey, i.Description, i.SuggestedAction, i.LastSeenAt }),
                runs
            });
        });

        g.MapPut("", async (long id, SettingsInput i, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            var s = await db.ClientJiraSettings.FirstOrDefaultAsync(x => x.ClientId == id, ct);
            if (s is not null) db.ExpectVersion(ctx, s);
            var check = new Check();
            if (i.JiraConnectionId is { } cid && !await db.JiraConnections.AnyAsync(c => c.Id == cid, ct)) check.Add("jiraConnectionId", "Select a Jira connection.");
            if (i.IsEnabled && i.JiraConnectionId is null) check.Add("jiraConnectionId", "Select a Jira connection.");
            if (i.IsEnabled && i.DefaultResponsibleTeamId is null) check.Add("defaultResponsibleTeamId", "Jira has no responsible team, so imported cases need this default.");
            if (i.DefaultResponsibleTeamId is { } team && !await db.Teams.AnyAsync(t => t.Id == team && t.IsActive, ct)) check.Add("defaultResponsibleTeamId", "Select an active team.");
            if (i.IsEnabled && string.IsNullOrWhiteSpace(i.DefaultCaseType)) check.Add("defaultCaseType", "Jira issue types are not case types, so imported cases need this default.");
            string? typeCode = null;
            if (!string.IsNullOrWhiteSpace(i.DefaultCaseType)) (typeCode, _) = await new LookupService(db).TypeAsync<CaseType>(check, "defaultCaseType", LookupLists.CaseType, i.DefaultCaseType, "the case type", s?.DefaultCaseType, ct);
            if (i.SyncIntervalMinutes is < 5 or > 1440) check.Add("syncIntervalMinutes", "Enter between 5 and 1440 minutes.");
            if (i.NextReviewHours is < 1 or > 2160) check.Add("nextReviewHours", "Enter between 1 and 2160 hours.");
            if (i.FullReconciliationDays is < 1 or > 90) check.Add("fullReconciliationDays", "Enter between 1 and 90 days.");
            // The dry run comes first: the owner sees what the import would do before anything is created.
            if (i.IsEnabled && s is not { IsEnabled: true } && s?.LastPreviewAt is null) check.Add("isEnabled", "Run Preview import first. Synchronization starts only after a dry run.");
            check.ThrowIfAny();
            if (s is null) db.ClientJiraSettings.Add(s = new ClientJiraSettings { ClientId = id });
            s.IsEnabled = i.IsEnabled; s.JiraConnectionId = i.JiraConnectionId; s.DefaultResponsibleTeamId = i.DefaultResponsibleTeamId; s.DefaultCaseType = typeCode; s.DefaultPriority = i.DefaultPriority ?? Priority.Normal;
            s.NextReviewHours = i.NextReviewHours ?? 48; s.ImportDoneIssues = i.ImportDoneIssues; s.ImportFrom = i.ImportFrom; s.SyncOnStartup = i.SyncOnStartup; s.FullReconciliation = i.FullReconciliation;
            s.FullReconciliationDays = i.FullReconciliationDays ?? 7; s.SyncIntervalMinutes = i.SyncIntervalMinutes ?? 15;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapGet("/available-spaces", async (long id, long connectionId, string? q, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            await RequireClientAsync(db, me, id, ct);
            var query = db.JiraDiscoveredSpaces.AsNoTracking().Where(s => s.JiraConnectionId == connectionId && !s.Missing);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(s => s.ProjectKey.Contains(q) || s.ProjectName.Contains(q));
            return Results.Ok(await JiraAdminEndpoints.SpaceRowsAsync(db, me, connectionId, await query.OrderBy(s => s.ProjectKey).Take(200).ToListAsync(ct), ct, id));
        });

        // All or nothing: a selection with one conflicting space assigns nothing and says which one.
        g.MapPost("/spaces", async (long id, AddSpacesInput i, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            if (i.JiraConnectionId is not { } connectionId || !await db.JiraConnections.AnyAsync(c => c.Id == connectionId, ct)) throw new ValidationException("jiraConnectionId", "Select a Jira connection.");
            await CheckSpaceContractAsync(db, id, i.ContractId, ct);
            var projects = (i.JiraProjectIds ?? []).Distinct().ToList();
            if (projects.Count == 0) throw new ValidationException("jiraProjectIds", "Select at least one Jira space.");
            var discovered = await db.JiraDiscoveredSpaces.AsNoTracking().Where(s => s.JiraConnectionId == connectionId && projects.Contains(s.JiraProjectId)).ToListAsync(ct);
            var check = new Check();
            if (discovered.Count != projects.Count) check.Add("jiraProjectIds", "Select spaces found by discovery of this connection.");
            var taken = await db.ClientJiraSpaces.IgnoreQueryFilters().AsNoTracking().Where(s => s.JiraConnectionId == connectionId && projects.Contains(s.JiraProjectId) && s.ReleasedAt == null).Select(s => new { s.ProjectKey, s.ClientId }).ToListAsync(ct);
            foreach (var t in taken) check.Add("jiraProjectIds", t.ClientId == id ? $"{t.ProjectKey} is already assigned to this client." : $"{t.ProjectKey} is already assigned to another client. Reassignment needs an administrator's decision under Jira connections.");
            check.ThrowIfAny();
            foreach (var d in discovered) db.ClientJiraSpaces.Add(new ClientJiraSpace { ClientId = id, JiraConnectionId = connectionId, JiraProjectId = d.JiraProjectId, ProjectKey = d.ProjectKey, ProjectName = d.ProjectName, ContractId = i.ContractId });
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException ex) when (SqlErrors.IsUniqueViolation(ex)) { throw new ConflictException("Another administrator assigned one of these spaces at the same time. Reload and try again."); }
            return Results.Ok(new { added = discovered.Count });
        });

        g.MapPut("/spaces/{spaceId:long}", async (long id, long spaceId, SpaceEnabledInput i, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            var s = await db.ClientJiraSpaces.FirstOrDefaultAsync(x => x.Id == spaceId && x.ClientId == id && x.ReleasedAt == null, ct) ?? throw new NotFoundException("The Jira space");
            s.IsEnabled = i.Enabled;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A84: new cases follow the space's contract. Cases already linked keep theirs, and open cases with none join only when asked, because old ones can breach at once.
        g.MapPut("/spaces/{spaceId:long}/contract", async (long id, long spaceId, SpaceContractInput i, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            var s = await db.ClientJiraSpaces.FirstOrDefaultAsync(x => x.Id == spaceId && x.ClientId == id && x.ReleasedAt == null, ct) ?? throw new NotFoundException("The Jira space");
            await CheckSpaceContractAsync(db, id, i.ContractId, ct);
            if (i.ApplyToOpenCases && i.ContractId is null) throw new ValidationException("applyToOpenCases", "Select the contract to link to the open cases.");
            if (i.ApplyToOpenCases && !access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate)) throw new ForbiddenException("Linking a contract to existing cases needs the right to coordinate cases.");
            var reason = s.ContractId is null && !i.ApplyToOpenCases ? Text.Clean(i.Reason) : Rules.RequireReason(i.Reason, "reason", "why the contract changes");
            s.ContractId = i.ContractId;
            var applied = 0;
            if (i.ApplyToOpenCases)
            {
                var now = clock.GetUtcNow();
                var contractRef = await db.Contracts.AsNoTracking().Where(k => k.Id == i.ContractId).Select(k => k.Ref).FirstAsync(ct);
                var ids = db.JiraCaseMappings.Where(m => m.ClientJiraSpaceId == spaceId && m.CaseId != null).Select(m => m.CaseId!.Value);
                var cases = await db.Cases.Where(c => ids.Contains(c.Id) && c.ContractId == null && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled).ToListAsync(ct);
                foreach (var c in cases)
                {
                    c.ContractId = i.ContractId;
                    CaseEndpoints.AddEvent(db, c, CaseEventType.ContractChanged, "No contract", contractRef, reason, access.Me, now);
                    applied++;
                }
            }
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { applied });
        });

        g.MapPost("/spaces/{spaceId:long}/release", async (long id, long spaceId, ReleaseInput i, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            var s = await db.ClientJiraSpaces.FirstOrDefaultAsync(x => x.Id == spaceId && x.ClientId == id && x.ReleasedAt == null, ct) ?? throw new NotFoundException("The Jira space");
            var reason = Rules.RequireReason(i.Reason, "reason", "why the space is released");
            s.ReleasedAt = clock.GetUtcNow(); s.ReleaseReason = reason; s.IsEnabled = false;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Dry run: the only thing recorded is that it ran.
        g.MapPost("/preview", async (long id, HubDbContext db, HubAccess access, JiraSyncService sync, TimeProvider clock, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            var preview = await sync.PreviewAsync(id, ct);
            var s = await db.ClientJiraSettings.FirstOrDefaultAsync(x => x.ClientId == id, ct);
            if (s is null) db.ClientJiraSettings.Add(s = new ClientJiraSettings { ClientId = id });
            if (preview.Spaces.Count > 0 && preview.Spaces.All(x => x.Error is null)) s.LastPreviewAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.Ok(preview);
        });

        g.MapPost("/sync", async (long id, long? spaceId, HubDbContext db, HubAccess access, TimeProvider clock, IOptions<JiraOptions> options, JiraSyncSignal signal, CancellationToken ct) =>
        {
            await RequireClientAsync(db, access.Me, id, ct);
            RequireChange(access, id);
            if (!options.Value.Enabled || options.Value.WorkerSeconds <= 0) throw new ConflictException("Jira synchronization is switched off on this server (Jira:Enabled).");
            if (!await db.ClientJiraSettings.AnyAsync(x => x.ClientId == id && x.IsEnabled, ct)) throw new ConflictException("Enable the client's Jira integration first.");
            var spaces = await db.ClientJiraSpaces.AsNoTracking().Where(x => x.ClientId == id && x.ReleasedAt == null && x.IsEnabled && (spaceId == null || x.Id == spaceId)).Select(x => x.Id).ToListAsync(ct);
            if (spaces.Count == 0) throw new ConflictException("No enabled Jira space to synchronize.");
            var now = clock.GetUtcNow();
            var states = await db.JiraSpaceSyncStates.Where(s => spaces.Contains(s.ClientJiraSpaceId)).ToListAsync(ct);
            foreach (var x in spaces)
            {
                var state = states.FirstOrDefault(s => s.ClientJiraSpaceId == x);
                if (state is null) db.JiraSpaceSyncStates.Add(new JiraSpaceSyncState { ClientJiraSpaceId = x, ManualRequestedAt = now });
                else state.ManualRequestedAt = now;
            }
            await db.SaveChangesAsync(ct);
            signal.Wake();
            return Results.Accepted(value: new { requested = spaces.Count });
        });

        g.MapGet("/runs", async (long id, long? spaceId, int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            await RequireClientAsync(db, me, id, ct);
            var q = db.JiraSyncRuns.AsNoTracking().Where(r => r.ClientId == id && (spaceId == null || r.ClientJiraSpaceId == spaceId));
            return Results.Ok(await q.OrderByDescending(r => r.StartedAt).ThenByDescending(r => r.Id).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        g.MapGet("/runs.csv", async (long id, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            await RequireClientAsync(db, me, id, ct);
            me.RequireRight(RightKeys.PlatformExport);
            var rows = await db.JiraSyncRuns.AsNoTracking().Where(r => r.ClientId == id).OrderByDescending(r => r.StartedAt).Take(5000).ToListAsync(ct);
            var now = clock.GetUtcNow();
            var bytes = Csv.Build("Jira synchronization history", me.AccountName, $"Client {id}", TimeZoneInfo.Utc, now, new List<CsvColumn<JiraSyncRun>>
            {
                new("Started", "When the run started", r => r.StartedAt), new("Jira space", "Space key", r => r.ProjectKey), new("Type", "Initial, incremental or full reconciliation", r => r.Type.ToString()), new("Trigger", "What started it", r => r.Trigger.ToString()),
                new("Issues retrieved", "Issues read from Jira", r => r.IssuesRetrieved), new("Cases created", "New cases", r => r.CasesCreated), new("Cases updated", "Changed cases", r => r.CasesUpdated), new("Comments imported", "New Jira comments", r => r.CommentsImported),
                new("Failed records", "Issues needing another attempt", r => r.FailedRecords), new("Status", "Result", r => r.Status.ToString()), new("Error", "Safe error text", r => r.Error)
            }, rows);
            await db.AuditActionAsync("Export", "JiraSyncRun", null, "Jira synchronization history", id, null, new { rows = rows.Count }, ct);
            return Results.File(bytes, "text/csv; charset=utf-8", Csv.FileName("jira-sync-history", now));
        });
    }
}
