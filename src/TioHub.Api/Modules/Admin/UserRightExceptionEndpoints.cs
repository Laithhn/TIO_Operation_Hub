using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json.Serialization;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

public static class UserRightExceptionEndpoints
{
    // Unknown fields must not be silently ignored: a client could otherwise submit a
    // restriction that appears to narrow an exception but is actually applied globally.
    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public sealed record ExceptionInput(string? Key, string? Effect, DateTimeOffset? ExpiresAt, long? ClientId = null, long? ProjectId = null, long? TeamId = null);
    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public sealed record ReplaceInput(ExceptionInput[]? Exceptions);

    public static void MapUserRightExceptionEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/admin/users/{id:long}/right-exceptions").WithTags("Administration");
        group.MapGet("", async (long id, HttpContext http, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var target = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("The user");
            var rows = await db.UserRightExceptions.AsNoTracking().Where(o => o.UserId == id).OrderBy(o => o.RightKey).ThenBy(o => o.Id).ToListAsync(ct);
            var labels = await ScopeLabelsAsync(rows, db, ct);
            return http.WithETag(target, new
            {
                version = Concurrency.Version(target.RowVersion),
                scopableRights = ScopedRights.Eligible,
                exceptions = rows.Select(o => new
                {
                    key = o.RightKey, effect = o.Effect, expiresAt = o.ExpiresAt, clientId = o.ClientId, projectId = o.ProjectId, teamId = o.TeamId,
                    scopeLabel = labels.GetValueOrDefault(o.Id)
                })
            });
        });

        group.MapPut("", async (long id, ReplaceInput input, HttpContext http, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            var target = await db.Users.SingleOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(http, target);
            if (me.UserId == id) throw new ValidationException("user", "You cannot change your own exceptions. Ask another administrator.");
            resolver.RequireGroups(target.MappedGroups);
            var effective = await resolver.ForUserAsync(id, ct);
            if (effective is not null && effective.Holds(RightKeys.Administration))
                throw new ValidationException("user", "Exceptions cannot be changed for an administrator. Change their roles through another administrator.");
            var active = (await db.RightDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            // Removing a deny or granting a prerequisite can enable another role's permissions. Require
            // complete authority until delegated administration can prove all combinations safely.
            if (!me.IsSystem && active.Any(k => !me.HasRight(k)))
                throw new ForbiddenException("Changing exceptions requires all active rights.");
            if (input.Exceptions is null) throw new ValidationException("exceptions", "Provide the complete list of exceptions.");
            var requested = new Dictionary<(string Key, long? Client, long? Project, long? Team), ExceptionInput>();
            var now = clock.GetUtcNow();
            var existing = await db.UserRightExceptions.Where(o => o.UserId == id).ToListAsync(ct);
            foreach (var row in input.Exceptions)
            {
                var prior = existing.FirstOrDefault(o => string.Equals(o.RightKey, row.Key, StringComparison.OrdinalIgnoreCase)
                    && o.ClientId == row.ClientId && o.ProjectId == row.ProjectId && o.TeamId == row.TeamId);
                var unchanged = prior is not null && prior.Effect == row.Effect && prior.ExpiresAt == row.ExpiresAt;
                if (row.Key is null || (!unchanged && (!active.Contains(row.Key) || RightsCatalog.Find(row.Key) is null)))
                    throw new ValidationException("exceptions", "Every exception must name an active right from the catalog.");
                if (!unchanged && string.Equals(RightsCatalog.Find(row.Key)?.Module, "Administration", StringComparison.OrdinalIgnoreCase))
                    throw new ValidationException("exceptions", "Administration and platform-wide rights must be managed through roles, not individual exceptions.");
                if (row.Effect is not ("Allow" or "Deny"))
                    throw new ValidationException("exceptions", "The effect must be Allow or Deny.");
                if (!unchanged && row.ExpiresAt is { } expires && expires <= now)
                    throw new ValidationException("exceptions", "An expiration must be in the future.");
                if (!unchanged) await CheckScopeAsync(row, me, db, ct);
                var canonical = prior?.RightKey ?? active.Single(k => string.Equals(k, row.Key, StringComparison.OrdinalIgnoreCase));
                if (!requested.TryAdd((canonical, row.ClientId, row.ProjectId, row.TeamId), row))
                    throw new ValidationException("exceptions", "Each right can have only one exception per scope.");
            }
            foreach (var row in existing)
            {
                if (!requested.Remove((row.RightKey, row.ClientId, row.ProjectId, row.TeamId), out var replacement)) db.UserRightExceptions.Remove(row);
                else { row.Effect = replacement.Effect!; row.ExpiresAt = replacement.ExpiresAt; }
            }
            foreach (var (key, row) in requested)
                db.UserRightExceptions.Add(new UserRightException
                {
                    UserId = id, RightKey = key.Key, Effect = row.Effect!, ExpiresAt = row.ExpiresAt, ClientId = key.Client, ProjectId = key.Project, TeamId = key.Team
                });
            // Force an update with the submitted version so concurrent edits cannot silently overwrite one another.
            resolver.MarkFormsSnapshot(target);
            db.Entry(target).Property(u => u.UpdatedAt).IsModified = true;
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }

    /// <summary>
    /// A scope is accepted only for a right whose every path evaluates the record's context, and only for a live record inside the
    /// administrator's own data scope. A missing and a hidden record give the same answer.
    /// </summary>
    private static async Task CheckScopeAsync(ExceptionInput row, UserContext me, HubDbContext db, CancellationToken ct)
    {
        var parts = (row.ClientId is null ? 0 : 1) + (row.ProjectId is null ? 0 : 1) + (row.TeamId is null ? 0 : 1);
        if (parts == 0) return;
        if (parts > 1) throw new ValidationException("exceptions", "An exception can name one client, one project or one team, not several.");
        if (!ScopedRights.IsEligible(row.Key))
            throw new ValidationException("exceptions", $"{row.Key} cannot be limited to a client, project or team yet. Use a global exception or change the role.");
        var available = row.ClientId is { } client ? me.HasClient(client) && await db.Clients.AnyAsync(c => c.Id == client, ct)
            : row.ProjectId is { } project ? await db.Projects.AnyAsync(p => p.Id == project && (me.IsSystem || me.AllClients || me.ClientIds.Contains(p.ClientId) || me.ProjectIds.Contains(p.Id)), ct)
            : row.TeamId is { } team && me.SeesInternal(team) && await db.Teams.AnyAsync(t => t.Id == team, ct);
        if (!available) throw new ValidationException("exceptions", "Select an existing client, project or team that you can access.");
    }

    /// <summary>Readable scope names for inspection. A scope outside the administrator's own data scope shows no name.</summary>
    public static async Task<Dictionary<long, string>> ScopeLabelsAsync(IReadOnlyCollection<UserRightException> rows, HubDbContext db, CancellationToken ct)
    {
        var clients = rows.Where(r => r.ClientId is not null).Select(r => r.ClientId!.Value).Distinct().ToArray();
        var projects = rows.Where(r => r.ProjectId is not null).Select(r => r.ProjectId!.Value).Distinct().ToArray();
        var teams = rows.Where(r => r.TeamId is not null).Select(r => r.TeamId!.Value).Distinct().ToArray();
        var clientNames = clients.Length == 0 ? [] : await db.Clients.AsNoTracking().Where(c => clients.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        var projectNames = projects.Length == 0 ? [] : await db.Projects.AsNoTracking().Where(p => projects.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Name, ct);
        var teamNames = teams.Length == 0 ? [] : await db.Teams.AsNoTracking().Where(t => teams.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t.Name, ct);
        const string hidden = "a scope you cannot access";
        return rows.Where(r => !r.IsGlobal).ToDictionary(r => r.Id, r =>
            r.ClientId is { } c ? $"Client: {clientNames.GetValueOrDefault(c, hidden)}"
            : r.ProjectId is { } p ? $"Project: {projectNames.GetValueOrDefault(p, hidden)}"
            : $"Team: {teamNames.GetValueOrDefault(r.TeamId!.Value, hidden)}");
    }
}
