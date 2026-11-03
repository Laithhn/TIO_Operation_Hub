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
    public int Comments, Activities;
}

/// <summary>
/// What a Jira status may do to a case. Only the steps below are automatic, and each is the same transition a person can make. Closing needs
/// an outcome and validation evidence, cancelling removes the case from the SLA, reopening needs a Manager: those stay with people (A76).
/// </summary>
public static class JiraWorkflow
{
    public static readonly CaseStatus[] AllowedTargets = [CaseStatus.New, CaseStatus.Triaged, CaseStatus.InProgress, CaseStatus.PendingValidation];

    /// <summary>The legal steps from a status to the target; empty when already there; null when no automatic path exists.</summary>
    public static IReadOnlyList<CaseStatus>? Path(CaseStatus from, CaseStatus to)
    {
        if (from == to) return [];
        if (from == CaseStatus.PendingValidation && to == CaseStatus.InProgress) return [CaseStatus.InProgress];
        CaseStatus[] forward = [CaseStatus.New, CaseStatus.Triaged, CaseStatus.InProgress, CaseStatus.PendingValidation];
        int a = Array.IndexOf(forward, from), b = Array.IndexOf(forward, to);
        return a < 0 || b < 0 || b < a ? null : forward[(a + 1)..(b + 1)];
    }

    public static CaseEventType EventFor(CaseStatus to) => to switch
    {
        CaseStatus.Triaged => CaseEventType.Triaged,
        CaseStatus.InProgress => CaseEventType.Started,
        CaseStatus.PendingValidation => CaseEventType.ValidationRequested,
        _ => throw new InvalidOperationException($"{to} is not an automatic transition.")
    };
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
                caseChanged |= await ApplyStatusAsync(x.Connection, x.Space, c, m, now, ct);
                if (!outcome.Created && (caseChanged || snapshotChanged)) outcome.Updated = true;
                if (comments is not null) outcome.Comments = await ImportCommentsAsync(x.Connection, issue.Id, c.Id, comments, now, ct);
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
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            db.ChangeTracker.Clear();
            if (any) changed++;
        }
        return changed;
    }

    /// <summary>Links an existing case as the source of an issue after an authorized decision. The manual reference stays.</summary>
    public async Task AdoptAsync(JiraConnection conn, ClientJiraSpace space, Case c, string issueId, string issueKey, DateTimeOffset now, CancellationToken ct)
    {
        var url = IssueUrl(conn, issueKey);
        db.JiraCaseMappings.Add(new JiraCaseMapping { JiraConnectionId = conn.Id, JiraIssueId = issueId, IssueKey = issueKey, JiraProjectId = space.JiraProjectId, ClientId = space.ClientId,
            ClientJiraSpaceId = space.Id, CaseId = c.Id, Source = JiraMappingSource.Adopted, Url = url, LastSyncedAt = now });
        var reference = await db.JiraReferences.FirstOrDefaultAsync(j => j.CaseId == c.Id && j.JiraInstanceId == conn.JiraInstanceId && j.IssueKey == issueKey && j.RemovedAt == null, ct);
        if (reference is not null) reference.Origin = JiraReferenceOrigin.AdoptedSource;
        CaseEndpoints.AddEvent(db, c, CaseEventType.JiraAdded, null, $"Synchronized source {issueKey}", "Case adopted as the source of the Jira issue", db.CurrentUser, now);
    }

    private Task<Case> LoadCaseAsync(long id, CancellationToken ct) =>
        db.Cases.IgnoreQueryFilters().Include(c => c.Owner).FirstAsync(c => c.Id == id, ct);

    private static string IssueUrl(JiraConnection conn, string key) => $"{conn.SiteUrl}/browse/{Uri.EscapeDataString(key)}";

    /// <summary>Creates the case with the same required values as POST /cases. No contract is linked, so nothing is measured retroactively.</summary>
    private async Task CreateCaseAsync(JiraRunContext x, JiraIssue issue, DateTimeOffset now, CancellationToken ct)
    {
        var (typeCode, typeCategory) = await new LookupService(db).TypeAsync<CaseType>(new Check(), "type", LookupLists.CaseType, x.Settings.DefaultCaseType, "the case type", null, ct);
        var title = CredentialGuard.LooksLikeSecret(issue.Summary) ? $"Jira issue {issue.Key}" : issue.Summary.Trim();
        var c = new Case
        {
            Title = title.Length > 200 ? title[..200] : title, Type = typeCode, TypeCategory = typeCategory, Scope = WorkScope.Client, ClientId = x.Space.ClientId,
            ResponsibleTeamId = x.Settings.DefaultResponsibleTeamId, ImpactSummary = $"Not yet assessed. Imported from Jira {issue.Key}.", Priority = x.Settings.DefaultPriority,
            NextAction = "Review the case imported from Jira.", NextReviewAt = now.AddHours(Math.Max(1, x.Settings.NextReviewHours)), Status = CaseStatus.New, CycleStartedAt = now, LastReviewedAt = now
        };
        db.Cases.Add(c);
        await db.SaveChangesAsync(ct);
        CaseEndpoints.AddEvent(db, c, CaseEventType.Created, null, CaseStatus.New.ToString(), $"Imported from Jira {issue.Key}", db.CurrentUser, now);
        db.JiraCaseMappings.Add(new JiraCaseMapping { JiraConnectionId = x.Connection.Id, JiraIssueId = issue.Id, IssueKey = issue.Key, JiraProjectId = issue.ProjectId, ClientId = x.Space.ClientId,
            ClientJiraSpaceId = x.Space.Id, CaseId = c.Id, Source = JiraMappingSource.Created, Url = IssueUrl(x.Connection, issue.Key), LastSyncedAt = now });
        await db.SaveChangesAsync(ct);
    }

    /// <summary>External values for display. They never reach the case's priority, due date, team or other responsibility fields.</summary>
    private static void Snapshot(JiraCaseMapping m, JiraIssue i, JiraRunContext x, DateTimeOffset now)
    {
        static string? Safe(string? s, int max) => s is null || CredentialGuard.LooksLikeSecret(s) ? null : s.Length > max ? s[..max] : s;
        m.IssueKey = i.Key;
        m.JiraProjectId = i.ProjectId;
        m.ClientJiraSpaceId = x.Space.Id;
        m.Url = IssueUrl(x.Connection, i.Key);
        m.Summary = Safe(i.Summary, 400);
        m.DescriptionText = CredentialGuard.LooksLikeSecret(i.DescriptionText) ? "[Withheld: the description looks like it contains a credential. Read it in Jira.]" : i.DescriptionText is { Length: > 8000 } d ? d[..8000] : i.DescriptionText;
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
        m.Labels = Safe(string.Join(", ", i.Labels), 1000);
        m.Components = Safe(string.Join(", ", i.Components), 1000);
        var details = i.Details.Where(d => x.DetailFields.ContainsKey(d.Key) && !CredentialGuard.LooksLikeSecret(d.Value))
            .Select(d => new { name = x.DetailFields[d.Key], value = d.Value.Length > 500 ? d.Value[..500] : d.Value }).ToList();
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
        if (m.AssigneeAccountId is null) { m.AppliedAssigneeAccountId = null; return false; }
        var map = await UserMappingAsync(conn.Id, m.AssigneeAccountId, m.AssigneeName, now, ct);
        var fingerprint = UserFingerprint(conn.Id, m.AssigneeAccountId);
        if (map.TioUserId is null)
        {
            Raise(JiraIssueType.MissingUserMapping, conn, space, m.JiraIssueId, m.IssueKey, fingerprint, now, $"Jira user {m.AssigneeName ?? "(no name)"} is not mapped to a hub user, so the case keeps its current owner.",
                "Map the Jira user to a hub user; the owner is updated at the next run.", c.Id, null, m.AssigneeAccountId);
            return false;
        }
        await ResolveAutomaticAsync(fingerprint, now, ct);
        var conflict = $"owner:{c.Id}";
        if (!CaseQuery.IsOpen(c.Status)) { m.AppliedAssigneeAccountId = m.AssigneeAccountId; return false; }
        var check = new Check();
        await access.CheckAssignableAsync(check, "owner", map.TioUserId, c.ClientId, c.ResponsibleTeamId, "the owner", ct);
        if (map.TioUserId == c.BackupOwnerUserId) check.Add("owner", "This person is the case's backup owner, and the owner and backup must be different people.");
        if (check.HasErrors)
        {
            Raise(JiraIssueType.MissingUserMapping, conn, space, m.JiraIssueId, m.IssueKey, conflict, now, $"{m.IssueKey}: the mapped user cannot own this case. {check.First("owner")}",
                "Change the user mapping or the case's backup owner.", c.Id, null, m.AssigneeAccountId);
            return false;
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
        return changed;
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
        if (row?.TargetStatus is null)
        {
            Raise(JiraIssueType.UnknownWorkflowStatus, conn, space, null, null, unknown, now, $"Jira status \"{m.StatusName}\" in space {space.ProjectKey} has no case status, so cases keep their current status.",
                "Map the Jira status to a case status; cases are updated at the next run.", null, null, m.StatusId);
            return false;
        }
        await ResolveAutomaticAsync(unknown, now, ct);
        var blocked = $"workflow:{c.Id}";
        var path = JiraWorkflow.Path(c.Status, row.TargetStatus.Value);
        if (path is null)
        {
            Raise(JiraIssueType.WorkflowTransitionBlocked, conn, space, m.JiraIssueId, m.IssueKey, blocked, now, $"{m.IssueKey} is \"{m.StatusName}\" in Jira (mapped to {row.TargetStatus}), but the case is {c.Status} and no automatic step leads there.",
                c.Status is CaseStatus.Closed or CaseStatus.Cancelled ? "Reopen the case if the work continues." : "Update the case by hand, or review the status mapping.", c.Id, null, m.StatusId);
            return false;
        }
        var changed = false;
        foreach (var step in path)
        {
            // WRK-04 applies to the sync too: no case moves into In progress without an active owner.
            if (step == CaseStatus.InProgress && c.Owner is not { IsActive: true })
            {
                Raise(JiraIssueType.WorkflowTransitionBlocked, conn, space, m.JiraIssueId, m.IssueKey, blocked, now, $"{m.IssueKey} is \"{m.StatusName}\" in Jira, but the case has no active owner, so it stays {c.Status}.",
                    "Map the Jira assignee or assign an owner; the status is updated at the next run.", c.Id, null, m.StatusId);
                return changed;
            }
            CaseEndpoints.Transition(db, c, step, JiraWorkflow.EventFor(step), $"From Jira {m.IssueKey}: {m.StatusName}", db.CurrentUser, now);
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
        else { row.LastSeenAt = now; if (name is not null) row.JiraDisplayName = name; }
        return row;
    }

    /// <summary>Idempotent by Jira comment id; an edited comment replaces its text. Comments are never progress and never a first response (A61).</summary>
    private async Task<int> ImportCommentsAsync(JiraConnection conn, string issueId, long caseId, IReadOnlyList<JiraCommentInfo> comments, DateTimeOffset now, CancellationToken ct)
    {
        var existing = await db.JiraComments.Where(x => x.JiraConnectionId == conn.Id && x.JiraIssueId == issueId).ToDictionaryAsync(x => x.JiraCommentId, ct);
        var imported = 0;
        foreach (var c in comments)
        {
            var withheld = CredentialGuard.LooksLikeSecret(c.BodyText);
            var body = withheld ? "" : c.BodyText.Length > 32000 ? c.BodyText[..32000] : c.BodyText;
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
        static string? Safe(string? s) => s is null || CredentialGuard.LooksLikeSecret(s) ? null : s.Length > 400 ? s[..400] : s;
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
