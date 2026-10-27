using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Shared;

public sealed record UserRef(long Id, string Name, bool IsActive);

public sealed record ArchiveInput(string? Reason, string? ExceptionReason);

/// <summary>Cached application policy values (approved link hosts, vault prefix, coverage policy, upcoming window).</summary>
public sealed class HubSettings(HubDbContext db, IMemoryCache cache)
{
    public const string CacheKey = "hub-settings";

    public async Task<Dictionary<string, string>> AllAsync(CancellationToken ct)
    {
        if (cache.TryGetValue(CacheKey, out Dictionary<string, string>? s) && s is not null) return s;
        s = await db.Settings.AsNoTracking().ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        cache.Set(CacheKey, s, TimeSpan.FromSeconds(30));
        return s;
    }

    public async Task<string> GetAsync(string key, string fallback, CancellationToken ct) => (await AllAsync(ct)).GetValueOrDefault(key, fallback);

    public async Task<string[]> ListAsync(string key, CancellationToken ct) =>
        (await GetAsync(key, "", ct)).Split([',', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public async Task<int> UpcomingDaysAsync(CancellationToken ct) => int.TryParse(await GetAsync(SettingKeys.UpcomingDays, "7", ct), out var d) && d > 0 ? d : 7;

    public async Task<HashSet<Criticality>> CoverageCriticalitiesAsync(CancellationToken ct) =>
        (await ListAsync(SettingKeys.CoverageCriticalities, ct)).Select(v => Enum.TryParse<Criticality>(v, out var c) ? c : (Criticality?)null).OfType<Criticality>().ToHashSet();

    public async Task<HashSet<Priority>> CoveragePrioritiesAsync(CancellationToken ct) =>
        (await ListAsync(SettingKeys.CoveragePriorities, ct)).Select(v => Enum.TryParse<Priority>(v, out var c) ? c : (Priority?)null).OfType<Priority>().ToHashSet();

    public void Invalidate() => cache.Remove(CacheKey);
}

/// <summary>Server-side authorization helpers shared by all modules (ACC-02, ACC-03, OPS-01).</summary>
public sealed class HubAccess(HubDbContext db, UserContext me, UserResolver resolver)
{
    public UserContext Me => me;

    public void RequireBusiness()
    {
        if (!me.HasBusinessRole) throw new ForbiddenException("Your account has no business role, so it cannot see client or internal records.");
    }

    /// <summary>TIO Manager actions: client structure (clients, regions, projects), archive/restore, triage, assignment, handovers.</summary>
    public void RequireLeadFor(long? clientId, long? teamId = null, string resource = ResourcePermissions.Structure)
    {
        if (!me.SeesScope(clientId, teamId)) throw new NotFoundException("The record");
        me.RequirePermission(resource, ResourcePermissions.Coordinate);
    }

    /// <summary>A31: archiving and restoring needs the Archive right.</summary>
    public void RequireArchiveFor(long? clientId, long? teamId = null, string resource = ResourcePermissions.Other)
    {
        if (!me.SeesScope(clientId, teamId)) throw new NotFoundException("The record");
        me.RequirePermission(resource, ResourcePermissions.ArchiveRestore);
    }

    /// <summary>Day-to-day work that any Operation Engineer may do (environments, contracts, network, products…).</summary>
    public void RequireEngineerFor(long? clientId, long? teamId = null, string resource = ResourcePermissions.Other)
        => RequireCreateFor(resource, clientId, teamId);

    public void RequireCreateFor(string resource, long? clientId, long? teamId = null)
    {
        if (!me.SeesScope(clientId, teamId)) throw new NotFoundException("The record");
        me.RequirePermission(resource, ResourcePermissions.Create);
    }

    /// <summary>Maintain a record: every Operation Engineer and the TIO Manager (owner decision, 19 Oct 2026). Ownership changes stay with the Manager (CheckOwnerChange).</summary>
    public void RequireMaintain(long? clientId, long? teamId, params long?[] responsibleUserIds) =>
        RequireMaintain(ResourcePermissions.Other, clientId, teamId, responsibleUserIds);

    public void RequireMaintain(string resource, long? clientId, long? teamId, params long?[] responsibleUserIds)
    {
        if (!me.SeesScope(clientId, teamId)) throw new NotFoundException("The record");
        me.RequirePermission(resource, ResourcePermissions.Maintain);
    }

    /// <summary>Validates an assignee/owner: exists, active, has a business role and can access the record's scope.</summary>
    public async Task CheckAssignableAsync(Check check, string field, long? userId, long? clientId, long? teamId, string label, CancellationToken ct, long? environmentId = null)
    {
        if (userId is null) return;
        var u = await resolver.ForUserAsync(userId.Value, ct);
        if (u is null) { check.Add(field, $"Select an existing person as {label}."); return; }
        if (!u.IsActive) { check.Add(field, $"{u.DisplayName} is deactivated and cannot be {label}."); return; }
        var business = u.Roles.Length > 0;
        var inScope = business && (clientId is { } c
            ? u.AllClients || u.ClientIds.Contains(c) || (environmentId is { } e && u.ProjectEnvironmentIds.Contains(e))
            : u.AllInternal || (teamId is { } t && u.TeamIds.Contains(t)));
        if (!inScope) check.Add(field, $"{u.DisplayName} has no access to this {(clientId is null ? "internal scope" : "client")}, so cannot be {label}.");
    }

    /// <summary>OPS-01 / ACC-03: only the TIO Manager or Manager changes ownership; an Engineer may only take unowned work themselves.</summary>
    public void CheckOwnerChange(Check check, string field, long? current, long? requested, bool allowSelfTakeIfUnassigned = false, string resource = ResourcePermissions.Other)
    {
        if (current == requested || me.HasPermission(resource, ResourcePermissions.Coordinate)) return;
        if (allowSelfTakeIfUnassigned && current is null && requested == me.UserId && me.HasPermission(resource, ResourcePermissions.Maintain)) return;
        check.Add(field, "You do not have permission to change the owner.");
    }

    public async Task<UserRef?> UserRefAsync(long? id, CancellationToken ct) =>
        id is null ? null : await db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => new UserRef(u.Id, u.DisplayName, u.IsActive)).FirstOrDefaultAsync(ct);

    public async Task<Dictionary<long, UserRef>> UserRefsAsync(IEnumerable<long?> ids, CancellationToken ct)
    {
        var list = ids.OfType<long>().Distinct().ToList();
        if (list.Count == 0) return [];
        return await db.Users.AsNoTracking().Where(u => list.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => new UserRef(u.Id, u.DisplayName, u.IsActive), ct);
    }
}

public enum FreshnessState { Current, Stale, NotYetReviewed, NoPolicy, NotApplicable }

public sealed record Freshness(FreshnessState State, DateTimeOffset? LastReviewedAt, DateTimeOffset? DueAt, string Rule);

/// <summary>OPS-02 / DAS-05: stale when either the maximum age since meaningful review or the explicit next-review date has passed.</summary>
public sealed class FreshnessService(HubDbContext db, IMemoryCache cache)
{
    public const string CacheKey = "review-policies";

    public async Task<Dictionary<(string, ReviewScope), ReviewPolicy>> PoliciesAsync(CancellationToken ct)
    {
        if (cache.TryGetValue(CacheKey, out Dictionary<(string, ReviewScope), ReviewPolicy>? p) && p is not null) return p;
        p = (await db.ReviewPolicies.AsNoTracking().Where(x => x.IsActive).ToListAsync(ct)).ToDictionary(x => (x.RecordType, x.Scope));
        cache.Set(CacheKey, p, TimeSpan.FromSeconds(30));
        return p;
    }

    public void Invalidate() => cache.Remove(CacheKey);

    public static Freshness Evaluate(ReviewPolicy? policy, DateTimeOffset createdAt, DateTimeOffset? lastReviewed, DateTimeOffset? nextReviewAt, DateTimeOffset now)
    {
        if (policy is null) return new Freshness(FreshnessState.NoPolicy, lastReviewed, null, "No review policy");
        DateTimeOffset? due = null;
        var rule = "";
        if (policy.MaxAgeDays is { } days)
        {
            due = (lastReviewed ?? createdAt).AddDays(days);
            rule = $"Review every {days} days";
        }
        if (policy.UsesNextReviewDate && nextReviewAt is { } next)
        {
            if (due is null || next < due) due = next;
            rule = rule.Length == 0 ? "Review by next-review date" : rule + " or by next-review date";
        }
        if (due is null) return new Freshness(lastReviewed is null ? FreshnessState.NotYetReviewed : FreshnessState.Current, lastReviewed, null, rule);
        if (due < now) return new Freshness(FreshnessState.Stale, lastReviewed, due, rule);
        return new Freshness(lastReviewed is null ? FreshnessState.NotYetReviewed : FreshnessState.Current, lastReviewed, due, rule);
    }

    public async Task<Freshness> ForAsync(string recordType, ReviewScope scope, DateTimeOffset createdAt, DateTimeOffset? lastReviewed, DateTimeOffset? nextReviewAt, DateTimeOffset now, CancellationToken ct) =>
        Evaluate((await PoliciesAsync(ct)).GetValueOrDefault((recordType, scope)), createdAt, lastReviewed, nextReviewAt, now);
}

public static class Rules
{
    public static string RequireReason(string? reason, string field = "reason", string label = "a reason")
    {
        if (string.IsNullOrWhiteSpace(reason)) throw new ValidationException(field, $"Enter {label}.");
        if (reason.Trim().Length > 1000) throw new ValidationException(field, "The reason can be at most 1000 characters.");
        if (CredentialGuard.LooksLikeSecret(reason)) throw new ValidationException(field, CredentialGuard.Message);
        return reason.Trim();
    }

    public static void Archive(IArchivable item, UserContext user, DateTimeOffset now, string reason)
    {
        item.ArchivedAt = now;
        item.ArchivedById = user.UserId;
        item.ArchiveReason = reason;
    }

    public static void Restore(IArchivable item)
    {
        item.ArchivedAt = null;
        item.ArchivedById = null;
        item.ArchiveReason = null;
    }

    /// <summary>OPS-01: external or unknown responsibility keeps an internal coordinator.</summary>
    public static void CheckAccountability(Check check, ResponsibleParty party, long? owner, long? coordinator, bool ownerRequired)
    {
        // The internal owner coordinates by default; without one, an explicit coordinator records the assignment gap.
        if (ownerRequired && owner is null) check.Add("ownerUserId", "Select the accountable internal owner.");
        else if (owner is null && coordinator is null)
            check.Add("coordinatorUserId", party == ResponsibleParty.TIO
                ? "With no owner, select an internal coordinator for the assignment gap."
                : "Responsibility is external or unknown: select an internal coordinator.");
    }

}

