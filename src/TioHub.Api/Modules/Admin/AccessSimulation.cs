using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

/// <summary>A non-executing capability and scope check. It never promises a business operation will succeed.</summary>
public static class AccessSimulation
{
    public sealed record Decision(string Status, string Reason, string Right, string Scope, string[] Roles, string[] MissingPrerequisites)
    {
        public string[] Sources { get; init; } = [];
        public string? DirectEffect { get; init; }
        public DateTimeOffset? ExpiresAt { get; init; }
        public bool DirectAllowApplied { get; init; } = true;
        public RightExplanation[] PrerequisiteDetails { get; init; } = [];
        public ScopedExplanation[] ScopedExceptions { get; init; } = [];
    }

    public sealed record ScopedExplanation(string Effect, string? Scope, DateTimeOffset? ExpiresAt, bool Matches);

    public sealed record RightExplanation(string Right, string Reason, string[] Sources, string? DirectEffect, DateTimeOffset? ExpiresAt);

    public static Decision Evaluate(ResolvedUser user, string right, string scope, long? scopeId, long? projectClientId = null, bool scopeAvailable = false, ResourceContext? context = null)
    {
        var target = new UserContext();
        target.Set(user);
        var missing = RightsCatalog.Dependencies(right).Where(key => !target.HasRight(key)).ToArray();
        if (!user.IsActive) return new("denied", "The account is inactive.", right, scope, user.Roles, missing);
        if (user.AccessRestriction is not null) return new("denied", user.AccessRestriction == "incompatible_roles"
            ? "A mandatory separation-of-duties rule prevents access because assigned roles conflict."
            : "A mandatory access restriction prevents access to this account.", right, scope, user.Roles, missing);
        // With a selected scope the same contextual decision as the operation applies; without one only the global snapshot counts.
        if (context is not null)
        {
            var contextual = target.Decide(right, context);
            if (!contextual.Allowed) return new("denied", contextual.Reason, right, scope, user.Roles, missing);
        }
        else if (!target.HasRight(right)) return new("denied", "The right or one of its prerequisites is not effective.", right, scope, user.Roles, missing);
        // A non-global scope must first be resolved to an existing resource that the actor
        // may inspect. In particular, AllClients/AllInternal do not make arbitrary IDs real.
        var inScope = scope switch
        {
            "none" => true,
            "client" => scopeAvailable && scopeId is > 0 && target.HasClient(scopeId.Value),
            "team" => scopeAvailable && scopeId is > 0 && target.SeesInternal(scopeId.Value),
            "project" => scopeAvailable && scopeId is > 0 && projectClientId is > 0 && (target.HasClient(projectClientId.Value) || target.ProjectIds.Contains(scopeId.Value)),
            _ => false
        };
        if (!inScope) return new("denied", "The selected scope is unavailable to this user.", right, scope, user.Roles, missing);
        return new("conditional", scope == "none"
            ? "The right passes. No resource scope was checked; the actual operation may require additional rights, scope, ownership, workflow, or record-specific checks."
            : "The right and selected scope pass. The actual operation may require additional rights, ownership, workflow, or record-specific checks.", right, scope, user.Roles, missing);
    }

    /// <summary>Explain why a prerequisite is ineffective without treating a stored assignment as a grant.</summary>
    public static RightExplanation ExplainPrerequisite(ResolvedUser user, string right, string[] sources,
        UserRightException? direct, DateTimeOffset now)
    {
        var current = direct is not null && (direct.ExpiresAt is null || direct.ExpiresAt > now) ? direct : null;
        var target = new UserContext();
        target.Set(user);
        var reason = !user.IsActive ? "Account inactive"
            : user.AccessRestriction is not null ? "Mandatory access restriction"
            : current is not null && current.Effect != "Allow" ? "Explicitly denied or invalid exception"
            : target.HasRight(right) ? "Effective"
            : sources.Length > 0 || (current?.Effect == "Allow" && !user.Holds(RightKeys.Administration)) ? "A prerequisite is not effective"
            : current?.Effect == "Allow" && user.Holds(RightKeys.Administration) ? "Direct allows are not applied to administrators"
            : "Not granted";
        return new(right, reason, sources, current?.Effect, current?.ExpiresAt);
    }

    public static void MapAccessSimulationEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/admin/users/{id:long}/access-simulation", async (long id, string right, string? scope, long? scopeId,
            UserContext actor, UserResolver resolver, HubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var definition = RightsCatalog.Find(right);
            if (definition is null || !await db.RightDefinitions.AsNoTracking().AnyAsync(d => d.Key == definition.Key && d.IsActive, ct))
                throw new ValidationException("right", "Select an active right from the catalog.");
            var scopeKind = (scope ?? "none").Trim().ToLowerInvariant();
            if (scopeKind is not ("none" or "client" or "project" or "team") || (scopeKind != "none" && scopeId is not > 0) || (scopeKind == "none" && scopeId is not null))
                throw new ValidationException("scope", "Select a valid scope and, where required, its identifier.");
            var user = await resolver.ForUserAsync(id, ct, directWhenGroupsUnknown: true) ?? throw new NotFoundException("The user");
            long? projectClientId = null;
            var scopeAvailable = false;
            if (scopeKind == "project")
            {
                projectClientId = await db.Projects.IgnoreQueryFilters()
                    .Where(p => p.Id == scopeId && (actor.IsSystem || actor.AllClients || actor.ClientIds.Contains(p.ClientId) || actor.ProjectIds.Contains(p.Id)))
                    .Select(p => (long?)p.ClientId).FirstOrDefaultAsync(ct);
                scopeAvailable = projectClientId is > 0;
            }
            else if (scopeKind == "client" && actor.HasClient(scopeId!.Value))
                scopeAvailable = await db.Clients.IgnoreQueryFilters().AnyAsync(c => c.Id == scopeId, ct);
            else if (scopeKind == "team" && actor.SeesInternal(scopeId))
                scopeAvailable = await db.Teams.IgnoreQueryFilters().AnyAsync(t => t.Id == scopeId, ct);
            var roleSources = await db.AppRoles.AsNoTracking().Include(r => r.Rights)
                .Where(r => r.IsActive && user.Roles.Contains(r.Name)).ToListAsync(ct);
            string[] SourcesFor(string key) => roleSources.Where(r => BuiltInRoles.KeysOf(r).Contains(key, StringComparer.OrdinalIgnoreCase))
                .Select(r => r.Name).Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
            var sources = SourcesFor(definition.Key).ToList();
            var now = clock.GetUtcNow();
            var relevant = RightsCatalog.Dependencies(definition.Key).Append(definition.Key).ToArray();
            var allRows = await db.UserRightExceptions.AsNoTracking().Where(o => o.UserId == id && relevant.Contains(o.RightKey)
                && (o.ExpiresAt == null || o.ExpiresAt > now)).ToListAsync(ct);
            var directByKey = allRows.Where(o => o.IsGlobal).ToDictionary(o => o.RightKey, StringComparer.OrdinalIgnoreCase);
            var direct = directByKey.GetValueOrDefault(definition.Key);
            var directAllowApplied = !user.Holds(RightKeys.Administration);
            if (direct?.Effect == "Allow" && directAllowApplied) sources.Add("Direct allow");
            ResourceContext? context = !ScopedRights.IsEligible(definition.Key) ? null : scopeKind switch
            {
                "client" => ResourceContext.ForRecord(scopeId, null, []),
                "project" => ResourceContext.ForRecord(projectClientId, null, [scopeId]),
                "team" => ResourceContext.ForRecord(null, scopeId, []),
                _ => null
            };
            var result = Evaluate(user, definition.Key, scopeKind, scopeId, projectClientId, scopeAvailable, context);
            var scopedRows = allRows.Where(o => !o.IsGlobal && string.Equals(o.RightKey, definition.Key, StringComparison.OrdinalIgnoreCase)).ToArray();
            var scopeLabels = await UserRightExceptionEndpoints.ScopeLabelsAsync(scopedRows, db, ct);
            if (user.IsActive && user.AccessRestriction is null && direct is not null && direct.Effect != "Allow")
                result = result with { Reason = "This right is explicitly denied, or has an invalid exception that fails closed." };
            return Results.Ok(result with {
                Sources = sources.ToArray(), DirectEffect = direct?.Effect, ExpiresAt = direct?.ExpiresAt, DirectAllowApplied = directAllowApplied,
                PrerequisiteDetails = result.MissingPrerequisites.Select(key => ExplainPrerequisite(user, key, SourcesFor(key), directByKey.GetValueOrDefault(key), now)).ToArray(),
                ScopedExceptions = scopedRows.Select(o =>
                {
                    var row = new ScopedException(o.RightKey, o.Effect == "Allow", o.ClientId, o.ProjectId, o.TeamId, o.ExpiresAt);
                    return new ScopedExplanation(o.Effect, scopeLabels.GetValueOrDefault(o.Id), o.ExpiresAt, context is not null && (row.Allow ? row.Covers(context) : row.Intersects(context)));
                }).ToArray()
            });
        });
    }
}
