using Microsoft.EntityFrameworkCore;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;

namespace TioHub.Api.Security;

/// <summary>
/// The authoritative location of one operation. Identifiers are distinct namespaces, loaded by the server and never taken from the browser.
/// Team context applies only to internal records: a client record assigned to a team stays a client record.
/// <paramref name="ProjectsKnown"/> is false when the record's complete project association was not established; a project-scoped
/// allow then does not apply and a project-scoped deny fails closed. <paramref name="HasUnprojectedPart"/> says part of the record is known
/// to lie outside every project, so no project-scoped allow can cover the whole of it.
/// </summary>
public sealed record ResourceContext(long[] ClientIds, long[] ProjectIds, long[] TeamIds, bool ProjectsKnown, bool HasUnprojectedPart = false)
{
    public static ResourceContext ForRecord(long? clientId, long? teamId, IEnumerable<long?>? projects = null)
    {
        var projectList = projects?.ToArray();
        return new(clientId is { } c ? [c] : [],
            projectList?.OfType<long>().Distinct().ToArray() ?? [],
            clientId is null && teamId is { } t ? [t] : [],
            projectList is not null,
            projectList is not null && projectList.Any(p => p is null));
    }

    /// <summary>Moves and multi-record commands: an allow must cover every part and a deny matches any part.</summary>
    public ResourceContext Merge(ResourceContext other) => new(
        [.. ClientIds.Union(other.ClientIds)], [.. ProjectIds.Union(other.ProjectIds)], [.. TeamIds.Union(other.TeamIds)],
        ProjectsKnown && other.ProjectsKnown, HasUnprojectedPart || other.HasUnprojectedPart);
}

/// <summary>An unexpired individual exception limited to exactly one client, project or internal team.</summary>
public sealed record ScopedException(string Key, bool Allow, long? ClientId, long? ProjectId, long? TeamId, DateTimeOffset? ExpiresAt)
{
    public bool IsCurrent(DateTimeOffset now) => ExpiresAt is null || ExpiresAt > now;

    /// <summary>A scoped allow applies only when the entire operation lies inside the scope.</summary>
    public bool Covers(ResourceContext context) =>
        ClientId is { } client ? context.ClientIds.Length == 1 && context.ClientIds[0] == client && context.TeamIds.Length == 0
        : ProjectId is { } project ? context.ProjectsKnown && !context.HasUnprojectedPart && context.ProjectIds.Length == 1 && context.ProjectIds[0] == project
        : TeamId is { } team && context.ClientIds.Length == 0 && context.TeamIds.Length == 1 && context.TeamIds[0] == team;

    /// <summary>A scoped deny applies when any part of the operation touches the scope, or when that cannot be excluded.</summary>
    public bool Intersects(ResourceContext context) =>
        ClientId is { } client ? context.ClientIds.Contains(client)
        : ProjectId is { } project ? context.ProjectIds.Contains(project) || !context.ProjectsKnown
        : TeamId is { } team && context.TeamIds.Contains(team);
}

public sealed record AuthorizationDecision(bool Allowed, string Reason);

/// <summary>
/// The single contextual evaluation: mandatory restrictions (applied by the caller's snapshot), matching denies, covering direct allows,
/// role allows, default deny. Every prerequisite is resolved at the same context and time, so a scoped grant cannot satisfy or bypass a
/// prerequisite elsewhere. Global decisions remain the snapshot's effective set: a scoped allow never makes a permission globally effective.
/// </summary>
public static class AuthorizationDecisions
{
    public static AuthorizationDecision Decide(IEnumerable<string> assigned, IReadOnlyCollection<ScopedException> scoped, string key, ResourceContext context, DateTimeOffset now)
    {
        var keys = assigned.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var current = scoped.Where(s => s.IsCurrent(now)).ToArray();
        foreach (var row in current.Where(s => s.Allow && s.Covers(context))) keys.Add(row.Key);
        var denied = current.Where(s => !s.Allow && s.Intersects(context)).ToArray();
        foreach (var row in denied) keys.Remove(row.Key);
        var effective = RightsCatalog.Resolve(keys).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (effective.Contains(key)) return new(true, "Effective for this record.");
        if (denied.Any(d => string.Equals(d.Key, key, StringComparison.OrdinalIgnoreCase))) return new(false, "An individual exception denies this right for this record.");
        if (denied.Length > 0 && RightsCatalog.Dependencies(key).Any(required => denied.Any(d => string.Equals(d.Key, required, StringComparison.OrdinalIgnoreCase))))
            return new(false, "An individual exception denies a prerequisite of this permission for this record.");
        return new(false, "The right or one of its prerequisites is not effective for this record.");
    }
}

/// <summary>
/// Rights that may carry a client, project or team scope. A key belongs here only after every path that uses it evaluates
/// <see cref="ResourceContext"/>; <c>ScopedRightCoverageTests</c> fails if a global check on one of these keys reappears.
/// These are record-edit capabilities: no list, aggregate, report, export, notification or attachment path reads them, so a scoped deny
/// cannot be silently ignored by a read path. View-type rights stay global until database filters exist for them.
/// </summary>
public static class ScopedRights
{
    public static readonly string[] Eligible =
    [
        RightKeys.KeyOf(RightKeys.Contracts, RightKeys.Maintain),
        RightKeys.KeyOf(RightKeys.Commitments, RightKeys.Maintain),
        RightKeys.KeyOf(RightKeys.Environments, RightKeys.Maintain)
    ];

    public static bool IsEligible(string? key) => Eligible.Contains(key, StringComparer.OrdinalIgnoreCase);
}

/// <summary>Loads the complete project association of records whose links can span projects.</summary>
public static class ResourceContexts
{
    /// <summary>A commitment's own project plus every project reached through its linked case, including rows hidden from the caller.</summary>
    public static async Task<ResourceContext> ForCommitmentAsync(HubDbContext db, long? clientId, long? teamId, long? projectId, long? caseId, CancellationToken ct)
    {
        var projects = new List<long?>();
        if (projectId is not null) projects.Add(projectId);
        if (caseId is { } id)
        {
            var cases = db.Cases.IgnoreQueryFilters().Where(c => c.Id == id);
            if (!await cases.AnyAsync(ct)) return ResourceContext.ForRecord(clientId, teamId);
            projects.AddRange(await db.CaseEnvironments.IgnoreQueryFilters().Where(x => x.CaseId == id)
                .Join(db.Environments.IgnoreQueryFilters(), x => x.EnvironmentId, e => e.Id, (x, e) => e.ProjectId).ToListAsync(ct));
            var contractProject = await cases.Where(c => c.ContractId != null)
                .Join(db.Contracts.IgnoreQueryFilters(), c => c.ContractId, x => x.Id, (c, x) => (long?)x.ProjectId).ToListAsync(ct);
            projects.AddRange(contractProject);
        }
        return ResourceContext.ForRecord(clientId, teamId, projects);
    }

    public static Task<ResourceContext> ForCommitmentAsync(HubDbContext db, Commitment c, CancellationToken ct) =>
        ForCommitmentAsync(db, c.ClientId, c.ResponsibleTeamId, c.ProjectId, c.CaseId, ct);
}
