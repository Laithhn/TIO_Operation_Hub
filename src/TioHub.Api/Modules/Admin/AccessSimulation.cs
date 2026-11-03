using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

/// <summary>A non-executing capability and scope check. It never promises a business operation will succeed.</summary>
public static class AccessSimulation
{
    public sealed record Decision(string Status, string Reason, string Permission, string Scope, string[] Roles, string[] MissingPrerequisites)
    {
        public string[] Sources { get; init; } = [];
        public string? DirectEffect { get; init; }
        public DateTimeOffset? ExpiresAt { get; init; }
        public bool DirectAllowApplied { get; init; } = true;
        public PermissionExplanation[] PrerequisiteDetails { get; init; } = [];
        public ScopedExplanation[] ScopedExceptions { get; init; } = [];
    }

    public sealed record ScopedExplanation(string Effect, string? Scope, DateTimeOffset? ExpiresAt, bool Matches);

    public sealed record PermissionExplanation(string Permission, string Reason, string[] Sources, string? DirectEffect, DateTimeOffset? ExpiresAt);

    public static Decision Evaluate(ResolvedUser user, string permission, string scope, long? scopeId, long? projectClientId = null, bool scopeAvailable = false, ResourceContext? context = null)
    {
        var target = new UserContext();
        target.Set(user);
        var missing = CapabilityPermissions.Dependencies(permission).Where(key => !target.HasPermission(key)).ToArray();
        if (!user.IsActive) return new("denied", "The account is inactive.", permission, scope, user.Roles, missing);
        if (user.AccessRestriction is not null) return new("denied", user.AccessRestriction == "incompatible_roles"
            ? "A mandatory separation-of-duties rule prevents access because assigned roles conflict."
            : "A mandatory access restriction prevents access to this account.", permission, scope, user.Roles, missing);
        // With a selected scope the same contextual decision as the operation applies; without one only the global snapshot counts.
        if (context is not null)
        {
            var contextual = target.Decide(permission, context);
            if (!contextual.Allowed) return new("denied", contextual.Reason, permission, scope, user.Roles, missing);
        }
        else if (!target.HasPermission(permission)) return new("denied", "The permission or one of its prerequisites is not effective.", permission, scope, user.Roles, missing);
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
        if (!inScope) return new("denied", "The selected scope is unavailable to this user.", permission, scope, user.Roles, missing);
        return new("conditional", scope == "none"
            ? "The capability passes. No resource scope was checked; the actual operation may require additional permissions, scope, ownership, workflow, or record-specific checks."
            : "The capability and selected scope pass. The actual operation may require additional permissions, ownership, workflow, or record-specific checks.", permission, scope, user.Roles, missing);
    }

    /// <summary>Explain why a prerequisite is ineffective without treating a stored assignment as a grant.</summary>
    public static PermissionExplanation ExplainPrerequisite(ResolvedUser user, string permission, string[] sources,
        UserPermissionOverride? direct, DateTimeOffset now)
    {
        var current = direct is not null && (direct.ExpiresAt is null || direct.ExpiresAt > now) ? direct : null;
        var target = new UserContext();
        target.Set(user);
        var reason = !user.IsActive ? "Account inactive"
            : user.AccessRestriction is not null ? "Mandatory access restriction"
            : current is not null && current.Effect != "Allow" ? "Explicitly denied or invalid exception"
            : target.HasPermission(permission) ? "Effective"
            : sources.Length > 0 || (current?.Effect == "Allow" && !user.Rights.HasFlag(Right.Administer)) ? "A prerequisite is not effective"
            : current?.Effect == "Allow" && user.Rights.HasFlag(Right.Administer) ? "Direct allows are not applied to administrators"
            : "Not granted";
        return new(permission, reason, sources, current?.Effect, current?.ExpiresAt);
    }

    public static void MapAccessSimulationEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/admin/users/{id:long}/access-simulation", async (long id, string permission, string? scope, long? scopeId,
            UserContext actor, UserResolver resolver, HubDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            actor.RequireAdministrator();
            actor.RequirePermission("AdminUsers:View");
            var definition = PermissionHierarchy.Find(permission);
            if (definition is null || !await db.PermissionDefinitions.AsNoTracking().AnyAsync(d => d.Key == definition.Key && d.IsActive, ct))
                throw new ValidationException("permission", "Select an active registered permission.");
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
            var roleSources = await db.AppRoles.AsNoTracking().Include(r => r.Permissions)
                .Where(r => r.IsActive && user.Roles.Contains(r.Name)).ToListAsync(ct);
            string[] SourcesFor(string key) => roleSources.Where(r => r.IsLocked || r.Permissions.Any(p =>
                string.Equals(ResourcePermissions.KeyOf(p.Resource, p.Action), key, StringComparison.OrdinalIgnoreCase)))
                .Select(r => r.Name).Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
            var sources = SourcesFor(definition.Key).ToList();
            var now = clock.GetUtcNow();
            var relevant = CapabilityPermissions.Dependencies(definition.Key).Append(definition.Key).ToArray();
            var allRows = await db.UserPermissionOverrides.AsNoTracking().Where(o => o.UserId == id && relevant.Contains(o.PermissionKey)
                && (o.ExpiresAt == null || o.ExpiresAt > now)).ToListAsync(ct);
            var directByKey = allRows.Where(o => o.IsGlobal).ToDictionary(o => o.PermissionKey, StringComparer.OrdinalIgnoreCase);
            var direct = directByKey.GetValueOrDefault(definition.Key);
            var directAllowApplied = !user.Rights.HasFlag(Right.Administer);
            if (direct?.Effect == "Allow" && directAllowApplied) sources.Add("Direct allow");
            ResourceContext? context = !ScopedPermissions.IsEligible(definition.Key) ? null : scopeKind switch
            {
                "client" => ResourceContext.ForRecord(scopeId, null, []),
                "project" => ResourceContext.ForRecord(projectClientId, null, [scopeId]),
                "team" => ResourceContext.ForRecord(null, scopeId, []),
                _ => null
            };
            var result = Evaluate(user, definition.Key, scopeKind, scopeId, projectClientId, scopeAvailable, context);
            var scopedRows = allRows.Where(o => !o.IsGlobal && string.Equals(o.PermissionKey, definition.Key, StringComparison.OrdinalIgnoreCase)).ToArray();
            var scopeLabels = await UserPermissionOverrideEndpoints.ScopeLabelsAsync(scopedRows, db, ct);
            if (user.IsActive && user.AccessRestriction is null && direct is not null && direct.Effect != "Allow")
                result = result with { Reason = "This permission is explicitly denied, or has an invalid exception that fails closed." };
            return Results.Ok(result with {
                Sources = sources.ToArray(), DirectEffect = direct?.Effect, ExpiresAt = direct?.ExpiresAt, DirectAllowApplied = directAllowApplied,
                PrerequisiteDetails = result.MissingPrerequisites.Select(key => ExplainPrerequisite(user, key, SourcesFor(key), directByKey.GetValueOrDefault(key), now)).ToArray(),
                ScopedExceptions = scopedRows.Select(o =>
                {
                    var row = new ScopedException(o.PermissionKey, o.Effect == "Allow", o.ClientId, o.ProjectId, o.TeamId, o.ExpiresAt);
                    return new ScopedExplanation(o.Effect, scopeLabels.GetValueOrDefault(o.Id), o.ExpiresAt, context is not null && (row.Allow ? row.Covers(context) : row.Intersects(context)));
                }).ToArray()
            });
        });
    }
}
