using System.Globalization;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;

namespace TioHub.Api.Modules.Jira;

public static class JiraQueries
{
    /// <summary>JQL dates have no zone: Jira reads them in the API account's own time zone, so the checkpoint is converted to it.</summary>
    public static string Issues(string projectKey, DateTimeOffset? since, string? accountTimeZone, DateOnly? importFrom, bool newestFirst = false)
    {
        var jql = $"project = \"{projectKey.Replace("\"", "").Replace("\\", "")}\"";
        if (importFrom is { } from) jql += $" AND created >= \"{from:yyyy-MM-dd}\"";
        if (since is { } s)
        {
            var zone = Zones.Find(accountTimeZone) ?? TimeZoneInfo.Utc;
            jql += $" AND updated >= \"{TimeZoneInfo.ConvertTime(s, zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)}\"";
        }
        return jql + (newestFirst ? " ORDER BY updated DESC" : " ORDER BY updated ASC");
    }

    public static bool IsDue(JiraSpaceSyncState? s, ClientJiraSettings settings, DateTimeOffset now, bool startup)
    {
        if (s?.ManualRequestedAt is not null || s?.LastRunAt is null) return true;
        if (startup && settings.SyncOnStartup) return true;
        var interval = Math.Max(1, settings.SyncIntervalMinutes);
        // Repeated failures back off, up to four hours; a manual run still goes at once.
        var minutes = s.ConsecutiveFailures > 0 ? Math.Min(240, interval * Math.Pow(2, Math.Min(s.ConsecutiveFailures, 8) - 1)) : interval;
        return now >= s.LastRunAt.Value.AddMinutes(minutes);
    }

    public static JiraSyncType TypeFor(JiraSpaceSyncState s, ClientJiraSettings settings, DateTimeOffset now)
    {
        if (s.LastSuccessAt is null) return JiraSyncType.Initial;
        if (s.ForceFullNext) return JiraSyncType.FullReconciliation;
        if (settings.FullReconciliation && (s.LastFullAt is null || now >= s.LastFullAt.Value.AddDays(Math.Max(1, settings.FullReconciliationDays)))) return JiraSyncType.FullReconciliation;
        return JiraSyncType.Incremental;
    }
}

/// <summary>Wakes the worker for a manual run.</summary>
public sealed class JiraSyncSignal
{
    private readonly Channel<bool> _wake = Channel.CreateBounded<bool>(new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });
    public void Wake() => _wake.Writer.TryWrite(true);
    public ChannelReader<bool> Reader => _wake.Reader;
}

public sealed record JiraPreview(int TotalIssues, int NewCases, int ExistingMatched, int RequiringReview, int SkippedDone, int MissingUserMappings, int MissingWorkflowMappings, int OwnershipConflicts, int EstimatedComments, bool Truncated,
    IReadOnlyList<JiraPreviewSpace> Spaces, IReadOnlyList<JiraPreviewRow> Samples);
public sealed record JiraPreviewSpace(string ProjectKey, int Issues, string? Error);
public sealed record JiraPreviewRow(string IssueKey, string Summary, string ProjectKey, string? StatusName, string? AssigneeName, string Decision, long? CaseId, string? Problem);

public sealed class JiraSyncService(HubDbContext db, IJiraApiClient jira, JiraSecretStore secrets, JiraCaseBridge bridge, TimeProvider clock, IOptions<JiraOptions> options, ILogger<JiraSyncService> log)
{
    private static readonly string InstanceId = $"{Environment.MachineName}:{Guid.NewGuid():N}";

    /// <summary>Spaces whose client, connection and mapping are all enabled and whose interval has passed.</summary>
    public async Task<List<long>> DueSpacesAsync(bool startup, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var rows = await db.ClientJiraSpaces.IgnoreQueryFilters().AsNoTracking()
            .Where(s => s.ReleasedAt == null && s.IsEnabled && s.JiraConnection!.IsEnabled)
            .Join(db.ClientJiraSettings.Where(x => x.IsEnabled), s => s.ClientId, x => x.ClientId, (s, x) => new { s.Id, Settings = x })
            .ToListAsync(ct);
        var ids = rows.Select(r => r.Id).ToList();
        var states = await db.JiraSpaceSyncStates.AsNoTracking().Where(s => ids.Contains(s.ClientJiraSpaceId)).ToDictionaryAsync(s => s.ClientJiraSpaceId, ct);
        return rows.Where(r => JiraQueries.IsDue(states.GetValueOrDefault(r.Id), r.Settings, now, startup)).Select(r => r.Id).ToList();
    }

    /// <summary>One run of one space. Null when it is switched off or another server holds it.</summary>
    public async Task<JiraSyncRun?> RunSpaceAsync(long spaceId, JiraSyncTrigger trigger, CancellationToken ct)
    {
        var o = options.Value;
        var space = await db.ClientJiraSpaces.IgnoreQueryFilters().Include(s => s.JiraConnection).FirstOrDefaultAsync(s => s.Id == spaceId, ct);
        if (space is null || space.ReleasedAt is not null || !space.IsEnabled || space.JiraConnection is not { IsEnabled: true } conn) return null;
        var settings = await db.ClientJiraSettings.FirstOrDefaultAsync(x => x.ClientId == space.ClientId && x.IsEnabled, ct);
        if (settings is null) return null;

        var now = clock.GetUtcNow();
        if (!await db.JiraSpaceSyncStates.AnyAsync(s => s.ClientJiraSpaceId == spaceId, ct))
        {
            db.JiraSpaceSyncStates.Add(new JiraSpaceSyncState { ClientJiraSpaceId = spaceId });
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { db.ChangeTracker.Clear(); } // another server created it first
        }
        var claimed = await db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == spaceId && (s.LeaseUntil == null || s.LeaseUntil < now))
            .ExecuteUpdateAsync(u => u.SetProperty(s => s.LeaseOwner, InstanceId).SetProperty(s => s.LeaseUntil, now.AddMinutes(o.LeaseMinutes)), ct);
        if (claimed == 0) return null;

        // A run left Running by a stopped server ended with that server.
        await db.JiraSyncRuns.Where(r => r.ClientJiraSpaceId == spaceId && r.Status == JiraSyncStatus.Running)
            .ExecuteUpdateAsync(u => u.SetProperty(r => r.Status, JiraSyncStatus.Failed).SetProperty(r => r.EndedAt, now).SetProperty(r => r.Error, "The server stopped during this run."), ct);

        var state = await db.JiraSpaceSyncStates.AsNoTracking().FirstAsync(s => s.ClientJiraSpaceId == spaceId, ct);
        var run = new JiraSyncRun { JiraConnectionId = conn.Id, ClientId = space.ClientId, ClientJiraSpaceId = spaceId, ProjectKey = space.ProjectKey, Type = JiraQueries.TypeFor(state, settings, now), Trigger = trigger, Status = JiraSyncStatus.Running, StartedAt = now };
        db.JiraSyncRuns.Add(run);
        await db.SaveChangesAsync(ct);

        DateTimeOffset? safeCheckpoint = state.IssueCheckpoint;
        var complete = false;
        var capped = false;
        try
        {
            var auth = await secrets.AuthAsync(conn, ct);
            var me = await jira.GetMyselfAsync(auth, ct);
            if (me.TimeZone != conn.AccountTimeZone) conn.AccountTimeZone = me.TimeZone;
            var fields = await DetailFieldsAsync(conn, auth, ct);
            await db.SaveChangesAsync(ct);

            run.CasesUpdated += await bridge.ReapplyPendingAsync(conn, space, ct);

            var incremental = run.Type == JiraSyncType.Incremental;
            var since = incremental || state.LastSuccessAt is null ? state.IssueCheckpoint?.AddMinutes(-Math.Max(0, o.CheckpointOverlapMinutes)) : null;
            var jql = JiraQueries.Issues(space.ProjectKey, since, conn.AccountTimeZone, settings.ImportFrom);
            var context = new JiraRunContext(conn, space, settings, auth, fields, !incremental);
            var seen = new HashSet<string>();
            var failedSeen = false;
            string? token = null;
            do
            {
                var page = await jira.SearchAsync(auth, jql, fields.Keys.ToArray(), token, 100, ct);
                foreach (var issue in page.Issues)
                {
                    seen.Add(issue.Id);
                    run.IssuesRetrieved++;
                    var outcome = await ProcessWithRetryAsync(context, issue, ct);
                    run.CasesCreated += outcome.Created ? 1 : 0;
                    run.CasesUpdated += outcome.Updated ? 1 : 0;
                    run.CommentsImported += outcome.Comments;
                    run.ActivitiesImported += outcome.Activities;
                    if (outcome.Failed) { run.FailedRecords++; failedSeen = true; }
                    // Results arrive oldest first: the checkpoint stops before the first failure, so that issue is read again.
                    if (!failedSeen && issue.UpdatedAt is { } u && (safeCheckpoint is null || u > safeCheckpoint)) safeCheckpoint = u;
                    if (run.IssuesRetrieved >= o.MaxIssuesPerRun) { capped = true; break; }
                }
                token = capped ? null : page.NextPageToken;
                await RenewLeaseAsync(spaceId, ct);
            } while (token is not null);

            complete = !failedSeen && !capped;
            if (!incremental && !capped) await ReconcileMissingAsync(conn, space, auth, fields, seen, run, ct);
            run.Status = run.FailedRecords > 0 || capped ? JiraSyncStatus.Warning : JiraSyncStatus.Success;
            if (capped) run.Error = $"Stopped after {o.MaxIssuesPerRun} issues; the next run continues from the checkpoint.";
        }
        catch (JiraApiException ex)
        {
            run.Status = JiraSyncStatus.Failed;
            run.Error = JiraCaseBridge.Trim(ex.Message, 1000);
            log.LogWarning("Jira synchronization of space {SpaceId} failed: {Reason}", spaceId, ex.Message);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            run.Status = JiraSyncStatus.Failed;
            run.Error = $"The run failed on the server (reference {run.Id}).";
            log.LogError(ex, "Jira synchronization of space {SpaceId} failed (run {RunId})", spaceId, run.Id);
        }
        catch (OperationCanceledException)
        {
            db.ChangeTracker.Clear();
            await FinishAsync(spaceId, run, JiraSyncStatus.Failed, "The run was cancelled.", safeCheckpoint, false, CancellationToken.None);
            throw;
        }
        await FinishAsync(spaceId, run, run.Status, run.Error, safeCheckpoint, complete, CancellationToken.None);
        return run;
    }

    private async Task<JiraIssueOutcome> ProcessWithRetryAsync(JiraRunContext x, JiraIssue issue, CancellationToken ct)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                var outcome = await bridge.ProcessAsync(x, issue, jira, ct);
                db.ChangeTracker.Clear();
                db.Attach(x.Connection); db.Attach(x.Space); db.Attach(x.Settings);
                return outcome;
            }
            // A person edited the case during the run; everything is re-read once. Any other failure stays with this issue.
            catch (DbUpdateConcurrencyException) when (attempt == 0) { db.ChangeTracker.Clear(); db.Attach(x.Connection); db.Attach(x.Space); db.Attach(x.Settings); }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Jira issue {IssueId} of connection {ConnectionId} could not be imported", issue.Id, x.Connection.Id);
                db.ChangeTracker.Clear();
                db.Attach(x.Connection); db.Attach(x.Space); db.Attach(x.Settings);
                await RecordFailureAsync(x, issue, ct);
                return new JiraIssueOutcome { Failed = true };
            }
        }
    }

    private async Task RecordFailureAsync(JiraRunContext x, JiraIssue issue, CancellationToken ct)
    {
        var fingerprint = $"failed:{x.Connection.Id}:{issue.Id}";
        var now = clock.GetUtcNow();
        var open = await db.JiraIntegrationIssues.FirstOrDefaultAsync(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open, ct);
        if (open is not null) { open.LastSeenAt = now; open.Occurrences++; }
        else db.JiraIntegrationIssues.Add(new JiraIntegrationIssue { Type = JiraIssueType.FailedIssueImport, Fingerprint = fingerprint, JiraConnectionId = x.Connection.Id, ClientId = x.Space.ClientId, ProjectKey = x.Space.ProjectKey,
            JiraProjectId = x.Space.JiraProjectId, JiraIssueId = issue.Id, IssueKey = issue.Key, Description = $"{issue.Key} could not be imported on the server. Details are in the application log.", SuggestedAction = "Retried at the next run. If it stays, give the issue key to the application team.", LastSeenAt = now });
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
        db.Attach(x.Connection); db.Attach(x.Space); db.Attach(x.Settings);
    }

    /// <summary>Full reconciliation: a mapped issue the search no longer returned has moved, or Jira no longer has it. The case is never changed for this.</summary>
    private async Task ReconcileMissingAsync(JiraConnection conn, ClientJiraSpace space, JiraAuth auth, IReadOnlyDictionary<string, string> fields, HashSet<string> seen, JiraSyncRun run, CancellationToken ct)
    {
        var settingsFrom = await db.ClientJiraSettings.AsNoTracking().Where(x => x.ClientId == space.ClientId).Select(x => x.ImportFrom).FirstOrDefaultAsync(ct);
        if (settingsFrom is not null) return; // issues older than the import start are not returned, by design
        var mapped = await db.JiraCaseMappings.Where(m => m.ClientJiraSpaceId == space.Id && m.CaseId != null).ToListAsync(ct);
        foreach (var m in mapped.Where(m => !seen.Contains(m.JiraIssueId)))
        {
            var now = clock.GetUtcNow();
            var issue = await jira.GetIssueAsync(auth, m.JiraIssueId, fields.Keys.ToArray(), ct);
            var fingerprint = $"moved:{conn.Id}:{m.JiraIssueId}";
            if (await db.JiraIntegrationIssues.AnyAsync(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open, ct)) continue;
            if (issue is null) m.MissingInJiraAt = now;
            db.JiraIntegrationIssues.Add(new JiraIntegrationIssue
            {
                Type = issue is null ? JiraIssueType.InvalidExternalReference : JiraIssueType.IssueMovedBetweenSpaces, Fingerprint = fingerprint, JiraConnectionId = conn.Id, ClientId = space.ClientId, ProjectKey = space.ProjectKey, JiraProjectId = space.JiraProjectId,
                JiraIssueId = m.JiraIssueId, IssueKey = m.IssueKey, CaseId = m.CaseId, LastSeenAt = now,
                Description = issue is null ? $"{m.IssueKey} no longer exists in Jira, or the account can no longer see it. The case was not changed." : $"{m.IssueKey} left space {space.ProjectKey} and is now {issue.Key}. The case was not changed.",
                SuggestedAction = issue is null ? "Check the issue in Jira and update or close the case by hand." : "Assign the new space to the right client; the case stays with its client until a person decides."
            });
            run.FailedRecords++;
        }
        await db.SaveChangesAsync(ct);
    }

    private async Task RenewLeaseAsync(long spaceId, CancellationToken ct)
    {
        var until = clock.GetUtcNow().AddMinutes(options.Value.LeaseMinutes);
        await db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == spaceId && s.LeaseOwner == InstanceId).ExecuteUpdateAsync(u => u.SetProperty(s => s.LeaseUntil, until), ct);
    }

    private async Task FinishAsync(long spaceId, JiraSyncRun run, JiraSyncStatus status, string? error, DateTimeOffset? checkpoint, bool complete, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        run.Status = status;
        run.EndedAt = now;
        run.Error = error;
        db.ChangeTracker.Clear();
        db.JiraSyncRuns.Attach(run).State = EntityState.Modified;
        await db.SaveChangesAsync(ct);
        var state = await db.JiraSpaceSyncStates.FirstAsync(s => s.ClientJiraSpaceId == spaceId, ct);
        state.LastRunAt = run.StartedAt;
        state.LastStatus = status;
        state.LastError = error;
        state.ManualRequestedAt = null;
        state.LeaseOwner = null;
        state.LeaseUntil = null;
        state.IssueCheckpoint = checkpoint;
        state.ConsecutiveFailures = status == JiraSyncStatus.Failed ? state.ConsecutiveFailures + 1 : 0;
        if (status != JiraSyncStatus.Failed) state.LastSuccessAt = now;
        if (complete && run.Type != JiraSyncType.Incremental) { state.LastFullAt = now; state.ForceFullNext = false; }
        await db.SaveChangesAsync(ct);
    }

    private async Task<IReadOnlyDictionary<string, string>> DetailFieldsAsync(JiraConnection conn, JiraAuth auth, CancellationToken ct)
    {
        var wanted = conn.DetailFieldNames.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (wanted.Count == 0) return new Dictionary<string, string>();
        return (await jira.GetFieldsAsync(auth, ct)).Where(f => wanted.Contains(f.Name)).GroupBy(f => f.Id).ToDictionary(g => g.Key, g => g.First().Name);
    }

    /// <summary>Dry run: reads Jira and classifies with the same rules as the import. Writes no case, mapping or queue row and has no business side effects.</summary>
    public async Task<JiraPreview> PreviewAsync(long clientId, CancellationToken ct)
    {
        var settings = await db.ClientJiraSettings.AsNoTracking().FirstOrDefaultAsync(x => x.ClientId == clientId, ct) ?? new ClientJiraSettings { ClientId = clientId };
        var spaces = await db.ClientJiraSpaces.AsNoTracking().Include(s => s.JiraConnection).Where(s => s.ClientId == clientId && s.ReleasedAt == null && s.IsEnabled).ToListAsync(ct);
        int total = 0, fresh = 0, existing = 0, review = 0, done = 0, conflicts = 0, comments = 0;
        var truncated = false;
        var users = new HashSet<string>();
        var statuses = new HashSet<string>();
        var spaceRows = new List<JiraPreviewSpace>();
        var samples = new List<JiraPreviewRow>();
        foreach (var space in spaces)
        {
            var conn = space.JiraConnection!;
            var count = 0;
            try
            {
                var auth = await secrets.AuthAsync(conn, ct);
                var jql = JiraQueries.Issues(space.ProjectKey, null, conn.AccountTimeZone, settings.ImportFrom, newestFirst: true);
                string? token = null;
                do
                {
                    var page = await jira.SearchAsync(auth, jql, [], token, 100, ct);
                    foreach (var issue in page.Issues)
                    {
                        count++; total++;
                        var c = await bridge.ClassifyAsync(conn, space, settings, issue, ct);
                        switch (c.Decision)
                        {
                            case JiraIssueDecision.Create: fresh++; comments += issue.CommentTotal; break;
                            case JiraIssueDecision.Existing: existing++; comments += issue.CommentTotal; break;
                            case JiraIssueDecision.SkipDone or JiraIssueDecision.SkipIgnored or JiraIssueDecision.CaseDeleted: done++; break;
                            case JiraIssueDecision.ForeignCandidate or JiraIssueDecision.MovedFromOtherClient: conflicts++; review++; break;
                            default: review++; break;
                        }
                        if (c.Decision is JiraIssueDecision.Create or JiraIssueDecision.Existing)
                        {
                            if (issue.AssigneeId is { } a && !await db.JiraUserMappings.AnyAsync(u => u.JiraConnectionId == conn.Id && u.JiraAccountId == a && (u.TioUserId != null || u.ClientContactId != null), ct)) users.Add($"{conn.Id}:{a}");
                            if (issue.StatusId is { } st && !await db.JiraWorkflowStatusMappings.AnyAsync(s => s.JiraConnectionId == conn.Id && s.JiraStatusId == st && (s.JiraProjectId == space.JiraProjectId || s.JiraProjectId == "") && s.TargetStatusCode != null, ct)) statuses.Add($"{conn.Id}:{space.JiraProjectId}:{st}");
                        }
                        if (samples.Count < 200) samples.Add(new JiraPreviewRow(issue.Key, JiraCaseBridge.Trim(CredentialGuard.LooksLikeSecret(issue.Summary) ? "(withheld)" : issue.Summary, 200), space.ProjectKey, issue.StatusName, issue.AssigneeName, c.Decision.ToString(), c.CaseId ?? c.Candidates?.FirstOrDefault(), c.Problem));
                    }
                    token = page.NextPageToken;
                    if (total >= options.Value.PreviewMaxIssues) { truncated = token is not null; token = null; }
                } while (token is not null);
                spaceRows.Add(new(space.ProjectKey, count, null));
            }
            catch (JiraApiException ex) { spaceRows.Add(new(space.ProjectKey, count, ex.Message)); }
            if (truncated) break;
        }
        return new JiraPreview(total, fresh, existing, review, done, users.Count, statuses.Count, conflicts, comments, truncated, spaceRows, samples);
    }
}

/// <summary>A76: the 15-minute synchronization while the application runs. The worker wakes every minute and runs what is due; IIS must keep the site running (see the operations guide).</summary>
public sealed class JiraSyncWorker(IServiceScopeFactory scopes, IOptions<JiraOptions> options, JiraSyncSignal signal, ILogger<JiraSyncWorker> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var o = options.Value;
        if (!o.Enabled || o.WorkerSeconds <= 0) return;
        await Task.Delay(TimeSpan.FromSeconds(30), stop);
        var startup = true;
        while (!stop.IsCancellationRequested)
        {
            try { await RunDueAsync(startup, stop); }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "The Jira synchronization pass failed; it is retried at the next interval"); }
            startup = false;
            using var delay = CancellationTokenSource.CreateLinkedTokenSource(stop);
            delay.CancelAfter(TimeSpan.FromSeconds(o.WorkerSeconds));
            try { await signal.Reader.ReadAsync(delay.Token); }
            catch (OperationCanceledException) when (!stop.IsCancellationRequested) { }
        }
    }

    /// <summary>Each space runs in its own scope with the system identity.</summary>
    public async Task RunDueAsync(bool startup, CancellationToken stop)
    {
        List<long> due;
        using (var scope = scopes.CreateScope()) due = await scope.ServiceProvider.GetRequiredService<JiraSyncService>().DueSpacesAsync(startup, stop);
        foreach (var id in due)
        {
            using var scope = scopes.CreateScope();
            var manual = await scope.ServiceProvider.GetRequiredService<HubDbContext>().JiraSpaceSyncStates.AsNoTracking().AnyAsync(s => s.ClientJiraSpaceId == id && s.ManualRequestedAt != null, stop);
            await scope.ServiceProvider.GetRequiredService<JiraSyncService>().RunSpaceAsync(id, manual ? JiraSyncTrigger.Manual : startup ? JiraSyncTrigger.Startup : JiraSyncTrigger.Schedule, stop);
        }
    }
}
