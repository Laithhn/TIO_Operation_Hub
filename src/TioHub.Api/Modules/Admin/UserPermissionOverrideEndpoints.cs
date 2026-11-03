using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json.Serialization;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

public static class UserPermissionOverrideEndpoints
{
    // Unknown fields must not be silently ignored: a client could otherwise submit a
    // scope that appears to narrow an exception but is actually applied globally.
    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public sealed record OverrideInput(string? Key, string? Effect, DateTimeOffset? ExpiresAt);
    [JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
    public sealed record ReplaceInput(OverrideInput[]? Overrides);

    public static void MapUserPermissionOverrideEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/admin/users/{id:long}/permission-overrides").WithTags("Administration");
        group.MapGet("", async (long id, HttpContext http, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            me.RequirePermission("AdminUsers:View");
            var target = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("The user");
            var rows = await db.UserPermissionOverrides.AsNoTracking().Where(o => o.UserId == id).OrderBy(o => o.PermissionKey).ToListAsync(ct);
            return http.WithETag(target, new { version = Concurrency.Version(target.RowVersion), overrides = rows.Select(o => new { key = o.PermissionKey, effect = o.Effect, expiresAt = o.ExpiresAt }) });
        });

        group.MapPut("", async (long id, ReplaceInput input, HttpContext http, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            me.RequirePermission("AdminUsers:Maintain");
            var target = await db.Users.SingleOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(http, target);
            if (me.UserId == id) throw new ValidationException("user", "You cannot change your own permission exceptions. Ask another administrator.");
            resolver.RequireGroups(target.MappedGroups);
            var effective = await resolver.ForUserAsync(id, ct);
            if (effective is not null && effective.Rights.HasFlag(Right.Administer))
                throw new ValidationException("user", "Permission exceptions cannot be changed for an administrator. Change their roles through another administrator.");
            var active = (await db.PermissionDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            // Removing a deny or granting a prerequisite can enable another role's permissions. Require
            // complete authority until delegated administration can prove all combinations safely.
            if (!me.IsSystem && active.Any(k => !me.HasPermission(k)))
                throw new ForbiddenException("Changing permission exceptions requires all active permissions.");
            if (input.Overrides is null) throw new ValidationException("overrides", "Provide the complete list of permission exceptions.");
            var requested = new Dictionary<string, OverrideInput>(StringComparer.OrdinalIgnoreCase);
            var now = clock.GetUtcNow();
            var existing = await db.UserPermissionOverrides.Where(o => o.UserId == id).ToListAsync(ct);
            foreach (var row in input.Overrides)
            {
                var prior = existing.FirstOrDefault(o => string.Equals(o.PermissionKey, row.Key, StringComparison.OrdinalIgnoreCase));
                var unchanged = prior is not null && prior.Effect == row.Effect && prior.ExpiresAt == row.ExpiresAt;
                if (row.Key is null || (!unchanged && (!active.Contains(row.Key) || PermissionHierarchy.Find(row.Key) is null)))
                    throw new ValidationException("overrides", "Every exception must name an active, registered permission.");
                if (!unchanged && string.Equals(PermissionHierarchy.Find(row.Key)?.Module, "Administration", StringComparison.OrdinalIgnoreCase))
                    throw new ValidationException("overrides", "Administration permissions must be managed through roles, not individual exceptions.");
                if (row.Effect is not ("Allow" or "Deny"))
                    throw new ValidationException("overrides", "The effect must be Allow or Deny.");
                if (!unchanged && row.ExpiresAt is { } expires && expires <= now)
                    throw new ValidationException("overrides", "An expiration must be in the future.");
                var canonical = prior?.PermissionKey ?? active.Single(k => string.Equals(k, row.Key, StringComparison.OrdinalIgnoreCase));
                if (!requested.TryAdd(canonical, row)) throw new ValidationException("overrides", "Each permission can have only one exception.");
            }
            foreach (var row in existing)
            {
                if (!requested.Remove(row.PermissionKey, out var replacement)) db.UserPermissionOverrides.Remove(row);
                else { row.Effect = replacement.Effect!; row.ExpiresAt = replacement.ExpiresAt; }
            }
            foreach (var (key, row) in requested)
                db.UserPermissionOverrides.Add(new UserPermissionOverride { UserId = id, PermissionKey = key, Effect = row.Effect!, ExpiresAt = row.ExpiresAt });
            // Force an update with the submitted version so concurrent edits cannot silently overwrite one another.
            resolver.MarkFormsSnapshot(target);
            db.Entry(target).Property(u => u.UpdatedAt).IsModified = true;
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }
}
