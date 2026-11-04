using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Modules.Jira;

public enum JiraIssueDecision { Create, Existing, AdoptCandidate, AmbiguousCandidates, ForeignCandidate, MovedFromOtherClient, SkipDone, SkipIgnored, MissingCaseInformation, CaseDeleted }

public sealed record JiraClassification(JiraIssueDecision Decision, long? CaseId = null, long[]? Candidates = null, string? Problem = null);

public sealed record JiraRunContext(JiraConnection Connection, ClientJiraSpace Space, ClientJiraSettings Settings, JiraAuth Auth, IReadOnlyDictionary<string, string> DetailFields, bool Full);

public sealed class JiraIssueOutcome
{
    public bool Created, Updated, Failed;
    public string? Error;
    public int Comments, Activities;
}

/// <summary>
/// How a Jira status moves a case (A78). Jira is the trusted source, so every mapped status applies, using the same transitions and events as the
/// case module. Closing records the Jira issue and status as its outcome and evidence.
/// </summary>
public static class JiraWorkflow
{
    private static readonly CaseStatus[] Forward = [CaseStatus.New, CaseStatus.Triaged, CaseStatus.InProgress, CaseStatus.PendingValidation];

    /// <summary>The stages a case passes through to reach the target. A finished case is reopened first; going back is one step.</summary>
    public static IReadOnlyList<CaseStatus> Path(CaseStatus from, CaseStatus to)
    {
        if (from == to) return [];
        if (to == CaseStatus.Closed) return [CaseStatus.Closed];
        if (from is CaseStatus.Closed or CaseStatus.Cancelled) return [CaseStatus.Triaged, .. Path(CaseStatus.Triaged, to)];
        int a = Array.IndexOf(Forward, from), b = Array.IndexOf(Forward, to);
        return b < a ? [to] : Forward[(a + 1)..(b + 1)];
    }

    public static CaseEventType EventFor(CaseStatus from, CaseStatus to)
    {
        if (from is CaseStatus.Closed or CaseStatus.Cancelled) return CaseEventType.Reopened;
        if (from == CaseStatus.PendingValidation && to == CaseStatus.InProgress) return CaseEventType.Started; // validation rejected
        return to switch
        {
            CaseStatus.Closed => CaseEventType.Closed,
            _ when Array.IndexOf(Forward, to) < Array.IndexOf(Forward, from) => CaseEventType.StatusChanged,
            CaseStatus.Triaged => CaseEventType.Triaged,
            CaseStatus.InProgress => CaseEventType.Started,
            CaseStatus.PendingValidation => CaseEventType.ValidationRequested,
            _ => throw new InvalidOperationException($"{to} is not an automatic transition.")
        };
    }
}

/// <summary>Turns Jira issues into changes of real cases, through the case module's own transitions and events (never by writing status columns).</summary>
public sealed class JiraCaseBridge(HubDbContext db, HubAccess access, TimeProvider clock)
{
    public static readonly HashSet<string> RelevantChangelogFields = new(StringComparer.OrdinalIgnoreCase)
        { "status", "assignee", "resolution", "priority", "duedate", "labels", "Component", "issuetype", "summary", "Key", "project" };

    public static string CaseFingerprint(long connectionId, string issueId) => $"case:{connectionId}:{issueId}";
    public static string UserFingerprint(long connectionId, string accountId) => $"user:{connectionId}:{accountId}";
    public static string StatusFingerprint(long connectionId, string projectId, string statusId) => $"status:{connectionId}:{projectId}:{statusId}";

    /// <summary>Decides what an issue means, without changing anything. The dry run and the real import use this same decision.</summary>
    public async Task<JiraClassification> ClassifyAsync(JiraConnection conn, ClientJiraSpace space, ClientJiraSettings settings, JiraIssue issue, CancellationToken ct)
    {
        var mapping = await db.JiraCaseMappings.AsNoTracking().Where(m => m.JiraConnectionId == conn.Id && m.JiraIssueId == issue.Id).Select(m => new { m.CaseId, m.ClientId }).FirstOrDefaultAsync(ct);
        if (mapping is not null)
        {
            if (mapping.CaseId is null) return new(JiraIssueDecision.CaseDeleted);
            return mapping.ClientId == space.ClientId ? new(JiraIssueDecision.Existing, mapping.CaseId) : new(JiraIssueDecision.MovedFromOtherClient, mapping.CaseId);
        }
        var decision = await db.JiraIntegrationIssues.AsNoTracking().Where(i => i.Fingerprint == CaseFingerprint(conn.Id, issue.Id) && i.Status != JiraIssueStatus.Open)
            .OrderByDescending(i => i.ResolvedAt).Select(i => i.Resolution).FirstOrDefaultAsync(ct);
        if (decision == "Ignore") return new(JiraIssueDecision.SkipIgnored);
        if (decision != "CreateNew")
        {
            // Existing references: same instance and key, on the same site. Titles are never compared.
            var references = await db.JiraReferences.IgnoreQueryFilters().AsNoTracking().Where(j => j.RemovedAt == null && j.JiraInstanceId == conn.JiraInstanceId && j.IssueKey == issue.Key)
                .Join(db.Cases.IgnoreQueryFilters(), j => j.CaseId, c => c.Id, (j, c) => new { j.Url, c.Id, c.ClientId }).ToListAsync(ct);
            var host = new Uri(conn.SiteUrl).Host;
            var candidates = references.Where(r => Uri.TryCreate(r.Url, UriKind.Absolute, out var u) && string.Equals(u.Host, host, StringComparison.OrdinalIgnoreCase)).ToList();
            var own = candidates.Where(r => r.ClientId == space.ClientId).Select(r => r.Id).Distinct().ToArray();
            if (candidates.Count > 0 && own.Length == 0) return new(JiraIssueDecision.ForeignCandidate, Candidates: candidates.Select(r => r.Id).Distinct().ToArray());
            if (candidates.Any(r => r.ClientId != space.ClientId) || own.Length > 1) return new(JiraIssueDecision.AmbiguousCandidates, Candidates: candidates.Select(r => r.Id).Distinct().ToArray());
            if (own.Length == 1) return new(JiraIssueDecision.AdoptCandidate, own[0], own);
        }
        if (string.Equals(issue.StatusCategory, "done", StringComparison.OrdinalIgnoreCase) && !settings.ImportDoneIssues) return new(JiraIssueDecision.SkipDone);
        if (settings.DefaultResponsibleTeamId is null || !await db.Teams.AnyAsync(t => t.Id == settings.DefaultResponsibleTeamId && t.IsActive, ct))
            return new(JiraIssueDecision.MissingCaseInformation, Problem: "The client's Jira settings have no active default responsible team.");
        if (string.IsNullOrWhiteSpace(settings.DefaultCaseType)) return new(JiraIssueDecision.MissingCaseInformation, Problem: "The client's Jira settings have no default case type.");
        if (string.IsNullOrWhiteSpace(issue.Summary)) return new(JiraIssueDecision.MissingCaseInformation, Problem: "The Jira issue has no summary, and a case needs a title.");
        return new(JiraIssueDecision.Create);
    }

    /// <summary>Applies one issue atomically. Jira is read first, outside the transaction.</summary>
    public async Task<JiraIssueOutcome> ProcessAsync(JiraRunContext x, JiraIssue issue, IJiraApiClient jira, CancellationToken ct)
    {
        var outcome = new JiraIssueOutcome();
        var now = clock.GetUtcNow();
        var known = await db.JiraCaseMappings.AsNoTracking().Where(m => m.JiraConnectionId == x.Connection.Id && m.JiraIssueId == issue.Id).Select(m => new { m.ChildrenSyncedFor }).FirstOrDefaultAsync(ct);
        var classification = await ClassifyAsync(x.Connection, x.Space, x.Settings, issue, ct);
        if (classification.Decision is JiraIssueDecision.SkipDone or JiraIssueDecision.SkipIgnored or JiraIssueDecision.CaseDeleted) return outcome;

        IReadOnlyList<JiraCommentInfo>? comments = null;
        IReadOnlyList<JiraChangeItem>? changes = null;
        string? commentError = null, activityError = null;
        var wantsChildren = classification.Decision is JiraIssueDecision.Create or JiraIssueDecision.Existing && (x.Full || known?.ChildrenSyncedFor != issue.UpdatedAt);
        if (wantsChildren)
        {
            try { comments = await jira.GetCommentsAsync(x.Auth, issue.Id, ct); }
            catch (JiraApiException ex) { commentError = ex.Message; }
            try { changes = await jira.GetChangelogAsync(x.Auth, issue.Id, ct); }
            catch (JiraApiException ex) { activityError = ex.Message; }
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        switch (classification.Decision)
        {
            case JiraIssueDecision.AdoptCandidate:
                Raise(JiraIssueType.DuplicateCaseCandidate, x, issue, CaseFingerprint(x.Connection.Id, issue.Id), now,
                    $"{issue.Key} is already referenced by one case of this client. No case was created.",
                    "Adopt the case as the synchronized source of this issue, or decide that a new case is needed.", classification.CaseId, classification.CaseId);
                break;
            case JiraIssueDecision.AmbiguousCandidates:
                Raise(JiraIssueType.DuplicateCaseCandidate, x, issue, CaseFingerprint(x.Connection.Id, issue.Id), now,
                    $"{issue.Key} is referenced by {classification.Candidates!.Length} cases (ids {string.Join(", ", classification.Candidates)}). No case was created.",
                    "Choose which case is the source of this issue, or ignore the issue.", null, classification.Candidates.Length > 0 ? classification.Candidates[0] : null);
                break;
            case JiraIssueDecision.ForeignCandidate:
                Raise(JiraIssueType.ClientOwnershipConflict, x, issue, CaseFingerprint(x.Connection.Id, issue.Id), now,
                    $"{issue.Key} belongs to a space of this client, but it is referenced by a case of another client. No case was created.",
                    "Check the space assignment and the reference. Cases are never moved between clients automatically.", null, classification.Candidates![0]);
                break;
            case JiraIssueDecision.MovedFromOtherClient:
                Raise(JiraIssueType.IssueMovedBetweenSpaces, x, issue, $"moved:{x.Connection.Id}:{issue.Id}", now,
                    $"{issue.Key} is now in space {x.Space.ProjectKey}, owned by another client, while its case stays with the original client. The case was not changed.",
                    "Decide who owns the work. The case is not moved automatically.", classification.CaseId, null);
                break;
            case JiraIssueDecision.MissingCaseInformation:
                Raise(JiraIssueType.MissingCaseInformation, x, issue, CaseFingerprint(x.Connection.Id, issue.Id), now,
                    $"{issue.Key} cannot become a case: {classification.Problem}", "Complete the client's Jira settings; the issue is imported at the next run.", null, null);
                break;
            case JiraIssueDecision.Create:
                await ResolveAutomaticAsync(CaseFingerprint(x.Connection.Id, issue.Id), now, ct);
                await CreateCaseAsync(x, issue, now, ct);
                outcome.Created = true;
                goto case JiraIssueDecision.Existing;
            case JiraIssueDecision.Existing:
                var m = await db.JiraCaseMappings.FirstAsync(a => a.JiraConnectionId == x.Connection.Id && a.JiraIssueId == issue.Id, ct);
                var c = await LoadCaseAsync(m.CaseId!.Value, ct);
                var snapshotChanged = m.JiraUpdatedAt != issue.UpdatedAt;
                Snapshot(m, issue, x, now);
                await EnsureSourceReferenceAsync(x, c, m, now, ct);
                var caseChanged = await ApplyOwnerAsync(x.Connection, x.Space, c, m, now, ct);
                if (m.JiraCreatedAt is { } jiraCreated && c.SlaClockStartAt != jiraCreated) { c.SlaClockStartAt = jiraCreated; caseChanged = true; }
                caseChanged |= await ApplyStatusAsync(x.Connection, x.Space, c, m, now, ct);
                caseChanged |= ApplyJiraResolutionTime(c, m, now);
                if (!outcome.Created && (caseChanged || snapshotChanged)) outcome.Updated = true;
                if (comments is not null)
                {
                    outcome.Comments = await ImportCommentsAsync(x.Connection, issue.Id, c.Id, comments, now, ct);
                    await db.SaveChangesAsync(ct);
                    await RecordNewReplyAsync(x.Connection.Id, c, m.IssueKey, now, ct);
                }
                else if (commentError is not null)
                {
                    Raise(JiraIssueType.FailedCommentImport, x, issue, $"comments:{x.Connection.Id}:{issue.Id}", now, $"Comments of {issue.Key} could not be read: {commentError}", "Retried at the next run.", c.Id, null);
                    outcome.Failed = true;
                }
                if (changes is not null) outcome.Activities = await ImportActivityAsync(x.Connection, issue.Id, c.Id, changes, now, ct);
                else if (activityError is not null)
                {
                    Raise(JiraIssueType.FailedActivityImport, x, issue, $"activity:{x.Connection.Id}:{issue.Id}", now, $"Activity of {issue.Key} could not be read: {activityError}", "Retried at the next run.", c.Id, null);
                    outcome.Failed = true;
                }
                if (commentError is null) await ResolveAutomaticAsync($"comments:{x.Connection.Id}:{issue.Id}", now, ct);
                if (activityError is null) await ResolveAutomaticAsync($"activity:{x.Connection.Id}:{issue.Id}", now, ct);
                if (comments is not null && changes is not null) m.ChildrenSyncedFor = issue.UpdatedAt;
                break;
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return outcome;
    }

    /// <summary>Retries owner and status of issues whose mapping was missing or whose step was blocked. Needs no Jira request.</summary>
    public async Task<int> ReapplyPendingAsync(JiraConnection conn, ClientJiraSpace space, CancellationToken ct)
    {
        var ids = await db.JiraCaseMappings.AsNoTracking().Where(m => m.ClientJiraSpaceId == space.Id && m.CaseId != null
            && (m.AssigneeAccountId != m.AppliedAssigneeAccountId || m.StatusId != m.AppliedStatusId)).Select(m => m.Id).ToListAsync(ct);
        var changed = 0;
        foreach (var id in ids)
        {
            var now = clock.GetUtcNow();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var m = await db.JiraCaseMappings.FirstAsync(a => a.Id == id, ct);
            var c = await LoadCaseAsync(m.CaseId!.Value, ct);
            var any = await ApplyOwnerAsync(conn, space, c, m, now, ct);
            any |= await ApplyStatusAsync(conn, space, c, m, now, ct);
            any |= ApplyJiraResolutionTime(c, m, now);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            db.ChangeTracker.Clear();
            if (any) changed++;
        }
        return changed;
    }

    /// <summary>A83: an administrator's decision to apply today's mappings to the stored comments. Corrects mappings made later, deleted comments and first responses taken from any comment by 2.47.0.</summary>
    public async Task<int> RecalculateFirstResponsesAsync(long connectionId, string reason, CancellationToken ct)
    {
        var replies = TeamReplies(connectionId);
        var rows = await db.JiraCaseMappings.AsNoTracking().IgnoreQueryFilters().Where(m => m.JiraConnectionId == connectionId && m.CaseId != null)
            .Select(m => new { CaseId = m.CaseId!.Value, m.IssueKey,
                Recorded = db.Cases.IgnoreQueryFilters().Where(c => c.Id == m.CaseId).Select(c => c.FirstResponseAt).FirstOrDefault(),
                Reply = replies.Where(k => k.CaseId == m.CaseId).Min(k => (DateTimeOffset?)k.JiraCreatedAt) })
            .Where(x => x.Recorded != x.Reply).ToListAsync(ct);
        var changed = 0;
        foreach (var row in rows)
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var c = await LoadCaseAsync(row.CaseId, ct);
            db.AuditReason = reason;
            var any = await ApplyFirstResponseAsync(connectionId, c, row.IssueKey, clock.GetUtcNow(), ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            db.ChangeTracker.Clear();
            if (any) changed++;
        }
        return changed;
    }

    /// <summary>A83: synchronization only records a first response that is still open, from comments arriving now. A mapping changed later does not touch earlier comments (BR-04).</summary>
    private async Task RecordNewReplyAsync(long connectionId, Case c, string issueKey, DateTimeOffset now, CancellationToken ct)
    {
        if (c.FirstResponseAt is not null) return;
        var reply = await TeamReplies(connectionId).Where(k => k.CaseId == c.Id && k.ImportedAt == now).MinAsync(k => (DateTimeOffset?)k.JiraCreatedAt, ct);
        if (reply is { } at) CaseEndpoints.RecordFirstResponse(db, c, at, $"{FirstReplyNote}{issueKey}", db.CurrentUser, now);
    }

    /// <summary>A82: the first response is a reply the customer could see, written by someone mapped to a hub user or a Vitronic team member.</summary>
    private IQueryable<JiraComment> TeamReplies(long connectionId) => db.JiraComments.AsNoTracking().Where(k => k.JiraConnectionId == connectionId && k.DeletedInJiraAt == null && k.VisibilityValue == null
        && db.JiraUserMappings.Any(u => u.JiraConnectionId == connectionId && u.JiraAccountId == k.AuthorAccountId && u.TioUserId != null));

    /// <summary>Follows the earliest team reply among the stored comments. A first response a person recorded before the case was linked to Jira stays.</summary>
    private async Task<bool> ApplyFirstResponseAsync(long connectionId, Case c, string issueKey, DateTimeOffset now, CancellationToken ct)
    {
        var reply = await TeamReplies(connectionId).Where(k => k.CaseId == c.Id).MinAsync(k => (DateTimeOffset?)k.JiraCreatedAt, ct);
        if (reply == c.FirstResponseAt) return false;
        var lastNote = await db.CaseEvents.AsNoTracking().Where(e => e.CaseId == c.Id && e.Type == CaseEventType.FirstResponse).OrderByDescending(e => e.Id).Select(e => e.Note).FirstOrDefaultAsync(ct);
        if (lastNote is not null && !lastNote.StartsWith(FirstReplyNote, StringComparison.Ordinal) && !lastNote.StartsWith("First Jira comment on ", StringComparison.Ordinal)) return false;
        var note = reply is null ? $"{FirstReplyNote}{issueKey} no longer counts: no public reply from the team" : $"{FirstReplyNote}{issueKey}";
        CaseEndpoints.AddEvent(db, c, CaseEventType.FirstResponse, c.FirstResponseAt?.ToString("O"), reply?.ToString("O"), note, db.CurrentUser, now);
        c.FirstResponseAt = reply;
        return true;
    }

    private const string FirstReplyNote = "First Jira reply on ";

    /// <summary>Links an existing case as the source of an issue after an authorized decision. The manual reference stays.</summary>
    public async Task AdoptAsync(JiraConnection conn, ClientJiraSpace space, Case c, string issueId, string issueKey, DateTimeOffset now, CancellationToken ct)
    {
        var url = IssueUrl(conn, issueKey);
        db.JiraCaseMappings.Add(new JiraCaseMapping { JiraConnectionId = conn.Id, JiraIssueId = issueId, IssueKey = issueKey, JiraProjectId = space.JiraProjectId, ClientId = space.ClientId,
            ClientJiraSpaceId = space.Id, CaseId = c.Id, Source = JiraMappingSource.Adopted, Url = url, LastSyncedAt = now });
        var reference = await db.JiraReferences.FirstOrDefaultAsync(j => j.CaseId == c.Id && j.JiraInstanceId == conn.JiraInstanceId && j.IssueKey == issueKey && j.RemovedAt == null, ct);
        if (reference is not null) reference.Origin = JiraReferenceOrigin.AdoptedSource;
        CaseEndpoints.AddEvent(db, c, CaseEventType.JiraAdded, null, $"Synchronized source {issueKey}", "Case adopted as the source of the Jira issue", db.CurrentUser, now);
        // A84: a contract a person already linked stays.
        if (c.ContractId is null && await SpaceContractAsync(space, ct) is { } contract)
        {
            c.ContractId = contract.Id;
            CaseEndpoints.AddEvent(db, c, CaseEventType.ContractChanged, "No contract", contract.Ref, $"Contract of Jira space {space.ProjectKey}", db.CurrentUser, now);
        }
    }

    /// <summary>A86: the case value of a Jira priority or issue type: the client's mapping, then a match by name. A value with neither is listed for a person to map, and null is returned.</summary>
    public async Task<string?> ValueAsync(long clientId, JiraValueKind kind, string? jiraValue, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(jiraValue)) return null;
        var value = Trim(jiraValue.Trim(), 200);
        var local = db.ChangeTracker.Entries<JiraValueMapping>().Select(e => e.Entity).FirstOrDefault(v => v.ClientId == clientId && v.Kind == kind && string.Equals(v.JiraValue, value, StringComparison.OrdinalIgnoreCase));
        var row = local ?? await db.JiraValueMappings.FirstOrDefaultAsync(v => v.ClientId == clientId && v.Kind == kind && v.JiraValue == value, ct);
        if (row?.TargetCode is { } mapped) return mapped;
        var named = kind == JiraValueKind.Priority
            ? PriorityNamedIn(value)
            : await db.LookupValues.AsNoTracking().Where(l => l.ListName == LookupLists.CaseType && !l.IsRetired && (l.Code == value || l.Label == value)).Select(l => l.Code).FirstOrDefaultAsync(ct);
        if (named is not null) return named;
        if (row is null) db.JiraValueMappings.Add(new JiraValueMapping { ClientId = clientId, Kind = kind, JiraValue = value });
        return null;
    }

    /// <summary>A90: a closed case was resolved when Jira says so, not when the hub imported it. With no resolution date in Jira, its last update is the nearest time known.</summary>
    private static bool ApplyJiraResolutionTime(Case c, JiraCaseMapping m, DateTimeOffset now)
    {
        if (c.ResolvedAt is null) return false;
        var at = m.JiraResolvedAt ?? (c.ResolvedAt == now ? m.JiraUpdatedAt : null);
        if (at is null || at == c.ResolvedAt) return false;
        c.ResolvedAt = at;
        if (c.ClosedAt is not null) c.ClosedAt = at;
        return true;
    }

    /// <summary>A case priority a Jira name contains as a word, such as Normal in "P3 - Normal". A name with two or none is left for a person.</summary>
    internal static string? PriorityNamedIn(string jiraValue)
    {
        var words = jiraValue.Split(jiraValue.Where(ch => !char.IsLetter(ch)).Distinct().ToArray(), StringSplitOptions.RemoveEmptyEntries);
        var found = Enum.GetNames<Priority>().Where(n => words.Contains(n, StringComparer.OrdinalIgnoreCase)).ToList();
        return found.Count == 1 ? found[0] : null;
    }

    /// <summary>A84: the space's contract, while it is active and still belongs to the space's client.</summary>
    private async Task<SpaceContract?> SpaceContractAsync(ClientJiraSpace space, CancellationToken ct) => space.ContractId is not { } id ? null
        : await db.Contracts.AsNoTracking().Where(k => k.Id == id && k.ClientId == space.ClientId && k.Status == ContractStatus.Active).Select(k => new SpaceContract(k.Id, k.Ref)).FirstOrDefaultAsync(ct);

    private sealed record SpaceContract(long Id, string Ref);

    private Task<Case> LoadCaseAsync(long id, CancellationToken ct) =>
        db.Cases.IgnoreQueryFilters().Include(c => c.Owner).Include(c => c.WaitingIntervals).FirstAsync(c => c.Id == id, ct);

    private static string IssueUrl(JiraConnection conn, string key) => $"{conn.SiteUrl}/browse/{Uri.EscapeDataString(key)}";

    /// <summary>Creates the case with the same required values as POST /cases. No contract is linked; once a person links one, the SLA counts from Jira's creation time (A78).</summary>
    private async Task CreateCaseAsync(JiraRunContext x, JiraIssue issue, DateTimeOffset now, CancellationToken ct)
    {
        // A86: priority and type come from Jira, by name or through the client's mapping. The client's defaults cover what Jira leaves open.
        var lookups = new LookupService(db);
        var typeCheck = new Check();
        var (typeCode, typeCategory) = await lookups.TypeAsync<CaseType>(typeCheck, "type", LookupLists.CaseType, await ValueAsync(x.Space.ClientId, JiraValueKind.IssueType, issue.IssueTypeName, ct), "the case type", null, ct);
        if (typeCheck.HasErrors) (typeCode, typeCategory) = await lookups.TypeAsync<CaseType>(new Check(), "type", LookupLists.CaseType, x.Settings.DefaultCaseType, "the case type", null, ct);
        var priority = Enum.TryParse<Priority>(await ValueAsync(x.Space.ClientId, JiraValueKind.Priority, issue.PriorityName, ct), out var fromJira) ? fromJira : x.Settings.DefaultPriority;
        var title = CredentialGuard.LooksLikeSecret(issue.Summary) ? $"Jira issue {issue.Key}" : issue.Summary.Trim();
        var contract = await SpaceContractAsync(x.Space, ct);
        var c = new Case
        {
            ContractId = contract?.Id, SlaClockStartAt = issue.CreatedAt,
            Title = title.Length > 200 ? title[..200] : title, Type = typeCode, TypeCategory = typeCategory, Scope = WorkScope.Client, ClientId = x.Space.ClientId,
            ResponsibleTeamId = x.Settings.DefaultResponsibleTeamId, ImpactSummary = $"Not yet assessed. Imported from Jira {issue.Key}.", Priority = priority,
            NextAction = "Review the case imported from Jira.", NextReviewAt = now.AddHours(Math.Max(1, x.Settings.NextReviewHours)), Status = CaseStatus.New, StatusCode = await CaseStatuses.DefaultCodeAsync(db, CaseStatusBehavior.Initial, CaseStatus.New, ct), CycleStartedAt = now, LastReviewedAt = now
        };
        db.Cases.Add(c);
        await db.SaveChangesAsync(ct);
        CaseEndpoints.AddEvent(db, c, CaseEventType.Created, null, CaseStatus.New.ToString(), $"Imported from Jira {issue.Key}", db.CurrentUser, now);
        if (contract is not null)
        {
            CaseEndpoints.AddEvent(db, c, CaseEventType.ContractChanged, "No contract", contract.Ref, $"Contract of Jira space {x.Space.ProjectKey}", db.CurrentUser, now);
            await ResolveAutomaticAsync($"contract:{x.Space.Id}", now, ct);
        }
        else if (x.Space.ContractId is not null)
        {
            Raise(JiraIssueType.MissingCaseInformation, x, issue, $"contract:{x.Space.Id}", now, $"The contract of Jira space {x.Space.ProjectKey} is not active, so {issue.Key} and later issues become cases with no contract.",
                "Link an active contract to the space, then link it to these cases.", c.Id, null);
        }
        db.JiraCaseMappings.Add(new JiraCaseMapping { JiraConnectionId = x.Connection.Id, JiraIssueId = issue.Id, IssueKey = issue.Key, JiraProjectId = issue.ProjectId, ClientId = x.Space.ClientId,
            ClientJiraSpaceId = x.Space.Id, CaseId = c.Id, Source = JiraMappingSource.Created, Url = IssueUrl(x.Connection, issue.Key), LastSyncedAt = now });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>External values for display. After creation they never reach the case's priority or type, and they never reach its due date, team or other responsibility fields.</summary>
    private static void Snapshot(JiraCaseMapping m, JiraIssue i, JiraRunContext x, DateTimeOffset now)
    {
        static string? Safe(string? s, int max) => s is null || CredentialGuard.LooksLikeSecret(s) ? null : s.Length > max ? s[..max] : s;
        m.IssueKey = i.Key;
        m.JiraProjectId = i.ProjectId;
        m.ClientJiraSpaceId = x.Space.Id;
        m.Url = IssueUrl(x.Connection, i.Key);
        m.Summary = Safe(i.Summary, 400);
        m.DescriptionText = CredentialGuard.LooksLikeSecret(i.DescriptionText) ? "[Withheld: the description looks like it contains a credential. Read it in Jira.]" : i.DescriptionText;
        m.StatusId = i.StatusId;
        m.StatusName = i.StatusName;
        m.StatusCategory = i.StatusCategory;
        m.PriorityName = i.PriorityName;
        m.IssueTypeName = i.IssueTypeName;
        m.AssigneeAccountId = i.AssigneeId;
        m.AssigneeName = i.AssigneeName;
        m.ReporterName = i.ReporterName;
        m.JiraCreatedAt = i.CreatedAt;
        m.JiraUpdatedAt = i.UpdatedAt;
        m.JiraDueDate = i.DueDate;
        m.Resolution = i.Resolution;
        m.JiraResolvedAt = i.ResolvedAt;
        m.Labels = Safe(string.Join(", ", i.Labels), int.MaxValue);
        m.Components = Safe(string.Join(", ", i.Components), int.MaxValue);
        var details = i.Details.Where(d => x.DetailFields.ContainsKey(d.Key) && !CredentialGuard.LooksLikeSecret(d.Value))
            .Select(d => new { name = x.DetailFields[d.Key], value = d.Value }).ToList();
        m.DetailsJson = details.Count == 0 ? null : JsonSerializer.Serialize(details);
        m.LastSyncedAt = now;
        m.MissingInJiraAt = null;
    }

    /// <summary>The source issue appears in the existing Jira references; existing manual references are never removed or duplicated.</summary>
    private async Task EnsureSourceReferenceAsync(JiraRunContext x, Case c, JiraCaseMapping m, DateTimeOffset now, CancellationToken ct)
    {
        if (await db.JiraReferences.AnyAsync(j => j.CaseId == c.Id && j.JiraInstanceId == x.Connection.JiraInstanceId && j.IssueKey == m.IssueKey && j.RemovedAt == null, ct)) return;
        if (db.ChangeTracker.Entries<JiraReference>().Any(e => e.Entity.CaseId == c.Id && e.Entity.IssueKey == m.IssueKey && e.State == EntityState.Added)) return;
        db.JiraReferences.Add(new JiraReference { CaseId = c.Id, ClientId = c.ClientId, JiraInstanceId = x.Connection.JiraInstanceId, IssueKey = m.IssueKey, Url = m.Url,
            ReuseReason = "Source issue of the Jira synchronization", Origin = m.Source == JiraMappingSource.Adopted ? JiraReferenceOrigin.AdoptedSource : JiraReferenceOrigin.ImportedSource });
        CaseEndpoints.AddEvent(db, c, CaseEventType.JiraAdded, null, $"{x.Connection.Name} {m.IssueKey}", "Source issue of the Jira synchronization", db.CurrentUser, now);
    }

    /// <summary>Jira assignee to case owner: mapped, active and with access, through the same rules as Assign owner. Backup owner, team, coordinator and party are not touched.</summary>
    private async Task<bool> ApplyOwnerAsync(JiraConnection conn, ClientJiraSpace space, Case c, JiraCaseMapping m, DateTimeOffset now, CancellationToken ct)
    {
        if (m.AssigneeAccountId == m.AppliedAssigneeAccountId) return false;
        // Unassigned in Jira keeps the current owner: an open case may have to keep an owner (WRK-04), and no fallback person is invented.
        if (m.AssigneeAccountId is null) { m.AppliedAssigneeAccountId = null; c.InternalAssignee = null; return false; } // waiting on a client contact continues: only the team ends it (BR-02)
        var map = await UserMappingAsync(conn.Id, m.AssigneeAccountId, m.AssigneeName, now, ct);
        var fingerprint = UserFingerprint(conn.Id, m.AssigneeAccountId);
        var contact = map.ClientContactId is { } contactId ? await db.Contacts.IgnoreQueryFilters().AsNoTracking().Where(k => k.Id == contactId && k.ArchivedAt == null).Select(k => new { k.Name, k.ClientId, k.Organization }).FirstOrDefaultAsync(ct) : null;
        if (contact is not null)
        {
            await ResolveAutomaticAsync(fingerprint, now, ct);
            var representative = $"client:{c.Id}";
            if (contact.ClientId != c.ClientId)
            {
                Raise(JiraIssueType.MissingUserMapping, conn, space, m.JiraIssueId, m.IssueKey, representative, now, $"{m.IssueKey} is assigned to {contact.Name}, a contact of another client, so the case is unchanged.",
                    "Map this Jira user to a contact of the right client.", c.Id, null, m.AssigneeAccountId);
                return false;
            }
            await ResolveAutomaticAsync(representative, now, ct);
            m.AppliedAssigneeAccountId = m.AssigneeAccountId;
            c.InternalAssignee = null;
            if (c.ClientRepresentative == contact.Name) return false;
            c.ClientRepresentative = contact.Name;
            c.ResponsibleParty = ResponsibleParty.CustomerIT;
            c.ResponsibleOrganization = contact.Organization ?? c.ResponsibleOrganization;
            if (CaseQuery.IsOpen(c.Status)) await WaitOnCustomerAsync(c, $"Assigned in Jira to {contact.Name}: {m.IssueKey}", now, ct);
            return true;
        }
        c.InternalAssignee = null;
        if (map.TioUserId is null)
        {
            Raise(JiraIssueType.MissingUserMapping, conn, space, m.JiraIssueId, m.IssueKey, fingerprint, now, $"Jira user {m.AssigneeName ?? "(no name)"} is not mapped to a hub user or client contact, so the case keeps its current owner.",
                "Map the Jira user to a hub user or a client contact; the case is updated at the next run.", c.Id, null, m.AssigneeAccountId);
            return false;
        }
        var ended = await EndClientRepresentationAsync(c, m, now, ct);
        await ResolveAutomaticAsync(fingerprint, now, ct);
        var conflict = $"owner:{c.Id}";
        if (!CaseQuery.IsOpen(c.Status)) { m.AppliedAssigneeAccountId = m.AssigneeAccountId; return ended; }
        var check = new Check();
        await access.CheckAssignableAsync(check, "owner", map.TioUserId, c.ClientId, c.ResponsibleTeamId, "the owner", ct);
        if (map.TioUserId == c.BackupOwnerUserId) check.Add("owner", "This person is the case's backup owner, and the owner and backup must be different people.");
        if (check.HasErrors)
        {
            Raise(JiraIssueType.MissingUserMapping, conn, space, m.JiraIssueId, m.IssueKey, conflict, now, $"{m.IssueKey}: the mapped user cannot own this case. {check.First("owner")}",
                "Change the user mapping or the case's backup owner.", c.Id, null, m.AssigneeAccountId);
            return ended;
        }
        await ResolveAutomaticAsync(conflict, now, ct);
        var changed = c.OwnerUserId != map.TioUserId;
        if (changed)
        {
            var names = await access.UserRefsAsync([c.OwnerUserId, map.TioUserId], ct);
            CaseEndpoints.AddEvent(db, c, CaseEventType.OwnerChanged, c.OwnerUserId is { } o ? names.GetValueOrDefault(o)?.Name : "Unassigned", names.GetValueOrDefault(map.TioUserId!.Value)?.Name, $"From Jira {m.IssueKey}", db.CurrentUser, now);
            c.OwnerUserId = map.TioUserId;
            c.Owner = await db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == map.TioUserId, ct);
        }
        m.OwnerFromJira = true;
        m.AppliedAssigneeAccountId = m.AssigneeAccountId;
        return changed || ended;
    }

    /// <summary>A79: waiting that follows a Jira assignment. Any other wait ends first, as when a person sets waiting.</summary>
    private async Task WaitOnCustomerAsync(Case c, string note, DateTimeOffset now, CancellationToken ct)
    {
        if (c.WaitingReason == WaitingReason.Customer) return;
        CaseEndpoints.EndWaiting(db, c, db.CurrentUser, now, note);
        CaseEndpoints.StartWaiting(db, c, WaitingReason.Customer, note, db.CurrentUser, now);
        await CaseEndpoints.SyncWaitingStatusAsync(db, c, ct);
    }

    /// <summary>A79: the issue left the client's contact. The Jira status is applied again, in case it says the case is still waiting.</summary>
    private async Task<bool> EndClientRepresentationAsync(Case c, JiraCaseMapping m, DateTimeOffset now, CancellationToken ct)
    {
        if (c.ClientRepresentative is null) return false;
        c.ClientRepresentative = null;
        c.ResponsibleParty = ResponsibleParty.TIO;
        c.ResponsibleOrganization = null;
        if (c.WaitingReason == WaitingReason.Customer) CaseEndpoints.EndWaiting(db, c, db.CurrentUser, now, $"Reassigned in Jira: {m.IssueKey}");
        await CaseEndpoints.SyncWaitingStatusAsync(db, c, ct);
        m.AppliedStatusId = null;
        return true;
    }

    /// <summary>Jira status to case status, only through a validated mapping and legal steps. Unknown statuses wait for an administrator.</summary>
    private async Task<bool> ApplyStatusAsync(JiraConnection conn, ClientJiraSpace space, Case c, JiraCaseMapping m, DateTimeOffset now, CancellationToken ct)
    {
        if (m.StatusId == m.AppliedStatusId || m.StatusId is null) return false;
        var projectId = m.JiraProjectId;
        var rows = await db.JiraWorkflowStatusMappings.Where(s => s.JiraConnectionId == conn.Id && s.JiraStatusId == m.StatusId && (s.JiraProjectId == projectId || s.JiraProjectId == "")).ToListAsync(ct);
        var row = rows.FirstOrDefault(s => s.JiraProjectId == projectId) ?? rows.FirstOrDefault();
        var unknown = StatusFingerprint(conn.Id, projectId, m.StatusId);
        if (row is null)
        {
            db.JiraWorkflowStatusMappings.Add(new JiraWorkflowStatusMapping { JiraConnectionId = conn.Id, JiraProjectId = projectId, JiraStatusId = m.StatusId, JiraStatusName = m.StatusName ?? m.StatusId, JiraStatusCategory = m.StatusCategory });
            await db.SaveChangesAsync(ct);
        }
        var behavior = row?.TargetStatusCode is { } mapped ? await CaseStatuses.BehaviorOfAsync(db, mapped, ct) : null;
        if (behavior is null)
        {
            Raise(JiraIssueType.UnknownWorkflowStatus, conn, space, null, null, unknown, now, $"Jira status \"{m.StatusName}\" in space {space.ProjectKey} has no case status, so cases keep their current status.",
                "Map the Jira status to a case status; cases are updated at the next run.", null, null, m.StatusId);
            return false;
        }
        await ResolveAutomaticAsync(unknown, now, ct);
        var blocked = $"workflow:{c.Id}";
        var target = row!.TargetStatusCode!;
        var from = $"From Jira {m.IssueKey}: {m.StatusName}";
        var waiting = behavior == CaseStatusBehavior.WaitingForCustomer;
        // Waiting keeps the stage, but a finished case is reopened for it.
        var stage = CaseStatuses.StageOf(behavior.Value) ?? (CaseQuery.IsOpen(c.Status) ? c.Status : CaseStatus.Triaged);
        var path = JiraWorkflow.Path(c.Status, stage);
        var changed = false;
        for (var i = 0; i < path.Count; i++)
        {
            var step = path[i];
            var type = JiraWorkflow.EventFor(c.Status, step);
            if (step == CaseStatus.Closed)
            {
                c.Outcome = from;
                c.ValidationEvidence = $"Closed in Jira: {m.IssueKey}, status {m.StatusName}";
                c.ClosedAt = now;
                CaseEndpoints.EndWaiting(db, c, db.CurrentUser, now, from);
            }
            else if (type == CaseEventType.Reopened)
            {
                c.ReopenCount++;
                c.CycleStartedAt = now;
                c.LastReviewedAt = now;
                c.ClosedAt = null;
                c.CancelledAt = null;
            }
            await CaseEndpoints.TransitionAsync(db, c, step, type, from, db.CurrentUser, now, ct, type == CaseEventType.Reopened ? CaseStatusBehavior.Reopened : null, i == path.Count - 1 && !waiting ? target : null);
            changed = true;
        }
        // A79: while the issue is assigned to the client's contact, the case waits whatever the Jira status says.
        var withClient = c.ClientRepresentative is not null && CaseQuery.IsOpen(c.Status);
        if ((waiting || withClient) && c.WaitingReason != WaitingReason.Customer)
        {
            CaseEndpoints.EndWaiting(db, c, db.CurrentUser, now, from);
            CaseEndpoints.StartWaiting(db, c, WaitingReason.Customer, from, db.CurrentUser, now);
            changed = true;
        }
        else if (!waiting && !withClient && c.WaitingReason == WaitingReason.Customer)
        {
            CaseEndpoints.EndWaiting(db, c, db.CurrentUser, now, from);
            changed = true;
        }
        if (withClient && !waiting) await CaseEndpoints.SyncWaitingStatusAsync(db, c, ct);
        else if (c.StatusCode != target)
        {
            CaseEndpoints.AddEvent(db, c, CaseEventType.StatusChanged, c.StatusCode, target, from, db.CurrentUser, now);
            c.StatusCode = target;
            changed = true;
        }
        await ResolveAutomaticAsync(blocked, now, ct);
        m.AppliedStatusId = m.StatusId;
        return changed;
    }

    public async Task<JiraUserMapping> UserMappingAsync(long connectionId, string accountId, string? name, DateTimeOffset now, CancellationToken ct)
    {
        var local = db.ChangeTracker.Entries<JiraUserMapping>().Select(e => e.Entity).FirstOrDefault(u => u.JiraConnectionId == connectionId && u.JiraAccountId == accountId);
        var row = local ?? await db.JiraUserMappings.FirstOrDefaultAsync(u => u.JiraConnectionId == connectionId && u.JiraAccountId == accountId, ct);
        if (row is null) db.JiraUserMappings.Add(row = new JiraUserMapping { JiraConnectionId = connectionId, JiraAccountId = accountId, JiraDisplayName = name, LastSeenAt = now });
        else
        {
            // Mapping changes are audited, so the time is kept coarse enough not to bury them.
            if (now - row.LastSeenAt >= TimeSpan.FromDays(1)) row.LastSeenAt = now;
            if (name is not null) row.JiraDisplayName = name;
        }
        return row;
    }

    /// <summary>Idempotent by Jira comment id; an edited comment replaces its text. Comments are never progress; the caller takes the first response from them (A82). Their authors join the user mappings, so they can be mapped.</summary>
    private async Task<int> ImportCommentsAsync(JiraConnection conn, string issueId, long caseId, IReadOnlyList<JiraCommentInfo> comments, DateTimeOffset now, CancellationToken ct)
    {
        var existing = await db.JiraComments.Where(x => x.JiraConnectionId == conn.Id && x.JiraIssueId == issueId).ToDictionaryAsync(x => x.JiraCommentId, ct);
        var imported = 0;
        foreach (var author in comments.Where(c => c.AuthorId is not null).GroupBy(c => c.AuthorId!)) await UserMappingAsync(conn.Id, author.Key, author.First().AuthorName, now, ct);
        foreach (var c in comments)
        {
            var withheld = CredentialGuard.LooksLikeSecret(c.BodyText);
            var body = withheld ? "" : c.BodyText;
            if (existing.TryGetValue(c.Id, out var row))
            {
                if (row.JiraUpdatedAt != c.Updated || row.DeletedInJiraAt is not null || row.VisibilityValue != c.VisibilityValue)
                {
                    row.BodyText = body; row.Withheld = withheld; row.AuthorName = c.AuthorName; row.JiraUpdatedAt = c.Updated; row.VisibilityType = c.VisibilityType; row.VisibilityValue = c.VisibilityValue; row.DeletedInJiraAt = null; row.CaseId = caseId;
                }
                continue;
            }
            db.JiraComments.Add(new JiraComment { JiraConnectionId = conn.Id, JiraCommentId = c.Id, JiraIssueId = issueId, CaseId = caseId, AuthorAccountId = c.AuthorId, AuthorName = c.AuthorName, BodyText = body, Withheld = withheld,
                JiraCreatedAt = c.Created, JiraUpdatedAt = c.Updated, VisibilityType = c.VisibilityType, VisibilityValue = c.VisibilityValue, ImportedAt = now });
            imported++;
        }
        var seen = comments.Select(c => c.Id).ToHashSet();
        foreach (var gone in existing.Values.Where(r => r.DeletedInJiraAt is null && !seen.Contains(r.JiraCommentId))) gone.DeletedInJiraAt = now;
        return imported;
    }

    private async Task<int> ImportActivityAsync(JiraConnection conn, string issueId, long caseId, IReadOnlyList<JiraChangeItem> changes, DateTimeOffset now, CancellationToken ct)
    {
        var relevant = changes.Where(c => RelevantChangelogFields.Contains(c.Field)).ToList();
        var existing = (await db.JiraActivities.AsNoTracking().Where(x => x.JiraConnectionId == conn.Id && x.JiraIssueId == issueId).Select(x => x.ExternalEventId).ToListAsync(ct)).ToHashSet();
        static string? Safe(string? s) => s is null || CredentialGuard.LooksLikeSecret(s) ? null : s;
        var imported = 0;
        foreach (var c in relevant.Where(c => !existing.Contains(c.EventId)))
        {
            db.JiraActivities.Add(new JiraActivity { JiraConnectionId = conn.Id, ExternalEventId = c.EventId, JiraIssueId = issueId, CaseId = caseId, Field = c.Field, ActorName = c.ActorName, At = c.At, ImportedAt = now,
                Type = c.Field.ToLowerInvariant() switch { "status" => JiraActivityType.Status, "assignee" => JiraActivityType.Assignee, _ => JiraActivityType.Field },
                FromValue = Safe(c.FromText), ToValue = Safe(c.ToText) });
            imported++;
        }
        return imported;
    }

    private void Raise(JiraIssueType type, JiraRunContext x, JiraIssue issue, string fingerprint, DateTimeOffset now, string description, string suggested, long? caseId, long? candidateId, string? subject = null) =>
        Raise(type, x.Connection, x.Space, issue.Id, issue.Key, fingerprint, now, description, suggested, caseId, candidateId, subject);

    private void Raise(JiraIssueType type, JiraConnection conn, ClientJiraSpace space, string? issueId, string? issueKey, string fingerprint, DateTimeOffset now, string description, string suggested, long? caseId, long? candidateId, string? subject)
    {
        var local = db.ChangeTracker.Entries<JiraIntegrationIssue>().Select(e => e.Entity).FirstOrDefault(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open);
        var open = local ?? db.JiraIntegrationIssues.FirstOrDefault(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open);
        if (open is not null)
        {
            open.LastSeenAt = now; open.Occurrences++; open.Description = Trim(description, 1000); open.SuggestedAction = Trim(suggested, 500); open.CaseId = caseId ?? open.CaseId; open.CandidateCaseId = candidateId ?? open.CandidateCaseId;
            return;
        }
        db.JiraIntegrationIssues.Add(new JiraIntegrationIssue { Type = type, Fingerprint = fingerprint, JiraConnectionId = conn.Id, ClientId = space.ClientId, ProjectKey = space.ProjectKey, JiraProjectId = space.JiraProjectId,
            JiraIssueId = issueId, IssueKey = issueKey, CaseId = caseId, CandidateCaseId = candidateId, Subject = subject, Description = Trim(description, 1000), SuggestedAction = Trim(suggested, 500), LastSeenAt = now });
    }

    /// <summary>A problem that no longer exists closes itself; the row stays as history.</summary>
    private async Task ResolveAutomaticAsync(string fingerprint, DateTimeOffset now, CancellationToken ct)
    {
        var open = db.ChangeTracker.Entries<JiraIntegrationIssue>().Select(e => e.Entity).FirstOrDefault(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open)
            ?? await db.JiraIntegrationIssues.FirstOrDefaultAsync(i => i.Fingerprint == fingerprint && i.Status == JiraIssueStatus.Open, ct);
        if (open is null) return;
        open.Status = JiraIssueStatus.Resolved; open.Resolution = "Automatic"; open.ResolvedAt = now;
    }

    public static string Trim(string s, int max) => s.Length > max ? s[..max] : s;
}
