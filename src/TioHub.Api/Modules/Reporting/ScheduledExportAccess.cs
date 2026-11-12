using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>Conservatively resolves scheduled access without relying on stale directory membership.</summary>
public static class ScheduledExportAccess
{
    /// <summary>
    /// Any enabled mapping could apply to the recipient. A union of possible roles is sufficient
    /// to detect any pair that could conflict, even if neither is directly assigned. An added
    /// administrator role can also suppress direct allows, so those cannot be trusted in that case.
    /// </summary>
    public static bool CouldRestrict(IEnumerable<long> directRoleIds, IEnumerable<long> possibleMappedRoleIds,
        IEnumerable<RoleConflicts.Pair> pairs, bool directlyAdministered, bool possiblyAdministered, bool hasCurrentDirectAllow) =>
        RoleConflicts.Conflicts(directRoleIds.Concat(possibleMappedRoleIds), pairs)
        || (!directlyAdministered && possiblyAdministered && hasCurrentDirectAllow);

    public static async Task<ResolvedUser?> ResolveAsync(HubDbContext db, long userId, TimeProvider clock, CancellationToken ct)
    {
        // Access records are versioned transactionally. Reject a mixed snapshot if any access
        // administration change commits while the potential memberships are being evaluated.
        var version = await db.AuthorizationVersions.AsNoTracking().Where(v => v.Id == 1).Select(v => v.Version).SingleAsync(ct);
        var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null || !user.IsActive) return null;
        RoleConflicts.Pair[] pairs;
        try { pairs = await RoleConflicts.LoadAsync(db, ct); }
        catch (ForbiddenException) { return null; }
        var mappedIds = await db.GroupMappingRoles.AsNoTracking().Select(m => m.AppRoleId).Distinct().ToArrayAsync(ct);
        var directIds = user.Roles.Select(r => r.AppRoleId).ToArray();
        var roles = await db.AppRoles.AsNoTracking().Include(r => r.Rights).Where(r => r.IsActive && (directIds.Contains(r.Id) || mappedIds.Contains(r.Id))).ToListAsync(ct);
        var direct = roles.Where(r => directIds.Contains(r.Id)).ToArray();
        var mapped = roles.Where(r => mappedIds.Contains(r.Id)).ToArray();
        var now = clock.GetUtcNow();
        var hasAllow = await db.UserRightExceptions.AsNoTracking().AnyAsync(o => o.UserId == userId && o.Effect == "Allow" && (o.ExpiresAt == null || o.ExpiresAt > now), ct);
        if (CouldRestrict(direct.Select(r => r.Id), mapped.Select(r => r.Id), pairs,
            RightExceptions.MakesAdministrator(direct.SelectMany(BuiltInRoles.KeysOf)),
            RightExceptions.MakesAdministrator(mapped.SelectMany(BuiltInRoles.KeysOf)), hasAllow)) return null;
        var result = await AccessCalculator.ComputeAsync(db, user, [], ct, now);
        var after = await db.AuthorizationVersions.AsNoTracking().Where(v => v.Id == 1).Select(v => v.Version).SingleAsync(ct);
        return version == after ? result : null;
    }
}
