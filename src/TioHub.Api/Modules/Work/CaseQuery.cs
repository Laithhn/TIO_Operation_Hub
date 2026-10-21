using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Quality;

namespace TioHub.Api.Modules.Work;

/// <summary>
/// One filter definition for case lists, dashboard counts and exports, so a count always equals its drilldown (AC-11).
/// Scope is applied by the global query filter before any of this.
/// </summary>
public sealed record CaseFilter(
    long? ClientId = null, long? RegionId = null, long? EnvironmentId = null, long? ProductId = null, long? TeamId = null, long? OwnerId = null,
    bool? Unassigned = null, string? Status = null, Priority? Priority = null, WorkScope? Scope = null, string? Due = null, bool? Waiting = null,
    bool? ReviewOverdue = null, bool? Stale = null, string? JiraKey = null, string? Q = null, DateTimeOffset? CreatedFrom = null, DateTimeOffset? CreatedTo = null,
    bool? CoverageGap = null, bool? DeactivatedOwner = null, string? Country = null);

public static class CaseQuery
{
    public static readonly CaseStatus[] Done = [CaseStatus.Closed, CaseStatus.Cancelled];

    public static bool IsOpen(CaseStatus s) => s is not (CaseStatus.Closed or CaseStatus.Cancelled);

    public static IQueryable<Case> Apply(IQueryable<Case> q, CaseFilter f, DateTimeOffset now, int upcomingDays, ReviewPolicy? policy, HubDbContext db, IReadOnlyCollection<Priority>? coveragePriorities = null)
    {
        if (f.ClientId is not null) q = q.Where(c => c.ClientId == f.ClientId);
        if (!string.IsNullOrWhiteSpace(f.Country)) q = f.Country == "Unknown" ? q.Where(c => c.Client!.CountryUnknown) : q.Where(c => c.Client!.Country == f.Country);
        if (f.RegionId is not null) q = q.Where(c => c.Environments.Any(e => db.Environments.Any(env => env.Id == e.EnvironmentId && env.RegionId == f.RegionId)));
        if (f.EnvironmentId is not null) q = q.Where(c => c.Environments.Any(e => e.EnvironmentId == f.EnvironmentId));
        if (f.ProductId is not null) q = q.Where(c => c.Environments.Any(e => db.Installations.Any(i => i.EnvironmentId == e.EnvironmentId && i.ProductId == f.ProductId)) || c.Components.Any(cc => db.Components.Any(comp => comp.Id == cc.ComponentId && comp.Installation!.ProductId == f.ProductId)));
        if (f.TeamId is not null) q = q.Where(c => c.ResponsibleTeamId == f.TeamId);
        if (f.OwnerId is not null) q = q.Where(c => c.OwnerUserId == f.OwnerId);
        if (f.Unassigned == true) q = q.Where(c => c.OwnerUserId == null);
        if (f.Priority is not null) q = q.Where(c => c.Priority == f.Priority);
        if (f.Scope is not null) q = q.Where(c => c.Scope == f.Scope);
        q = f.Status switch
        {
            null or "" or "open" => q.Where(c => c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled),
            "all" => q,
            "done" => q.Where(c => c.Status == CaseStatus.Closed || c.Status == CaseStatus.Cancelled),
            _ when Enum.TryParse<CaseStatus>(f.Status, true, out var s) => q.Where(c => c.Status == s),
            _ => q
        };
        // DAS-03: overdue = open with a due timestamp strictly earlier than the evaluation time; missing deadlines are separate.
        var horizon = now.AddDays(upcomingDays);
        q = f.Due switch
        {
            "overdue" => q.Where(c => c.DueAt != null && c.DueAt < now),
            "none" => q.Where(c => c.DueAt == null),
            "upcoming" => q.Where(c => c.DueAt != null && c.DueAt >= now && c.DueAt <= horizon),
            _ => q
        };
        if (f.Waiting == true) q = q.Where(c => c.WaitingReason != null);
        if (f.Waiting == false) q = q.Where(c => c.WaitingReason == null);
        if (f.ReviewOverdue == true) q = q.Where(c => c.NextReviewAt < now);
        if (f.Stale == true) q = StaleOnly(q, now, policy);
        if (!string.IsNullOrWhiteSpace(f.JiraKey))
        {
            var key = f.JiraKey.Trim().ToUpperInvariant();
            q = q.Where(c => c.JiraReferences.Any(j => j.RemovedAt == null && j.IssueKey == key));
        }
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(c => c.Title.Contains(f.Q) || c.Ref.Contains(f.Q) || c.NextAction.Contains(f.Q));
        if (f.CreatedFrom is not null) q = q.Where(c => c.CreatedAt >= f.CreatedFrom);
        if (f.CreatedTo is not null) q = q.Where(c => c.CreatedAt < f.CreatedTo);
        if (f.DeactivatedOwner == true) q = q.Where(c => c.Owner != null && !c.Owner.IsActive);
        if (f.CoverageGap == true)
        {
            var prios = (coveragePriorities ?? []).ToList();
            q = q.Where(c => prios.Contains(c.Priority) && (c.BackupOwnerUserId == null || !c.BackupOwner!.IsActive));
        }
        return q;
    }

    /// <summary>OPS-02: stale when the maximum age since meaningful review or the explicit next-review date has passed. Creation is the baseline.</summary>
    public static IQueryable<Case> StaleOnly(IQueryable<Case> q, DateTimeOffset now, ReviewPolicy? policy)
    {
        if (policy is null) return q.Where(c => false);
        var byNext = policy.UsesNextReviewDate;
        if (policy.MaxAgeDays is { } days)
        {
            var limit = now.AddDays(-days);
            return q.Where(c => (c.LastReviewedAt ?? c.CreatedAt) < limit || (byNext && c.NextReviewAt < now));
        }
        return byNext ? q.Where(c => c.NextReviewAt < now) : q.Where(c => false);
    }
}
