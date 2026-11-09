using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

public static class RoleConflictEndpoints
{
    public sealed record Input(RoleConflicts.Pair[]? Pairs);

    public static void MapRoleConflictEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin/roles/conflicts").WithTags("Administration");
        g.MapGet("", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireRight("AdminRoles:View");
            var setting = await db.Settings.AsNoTracking().SingleOrDefaultAsync(s => s.Key == RoleConflicts.SettingKey, ct);
            return Results.Ok(new { pairs = RoleConflicts.Parse(setting?.Value), version = setting is null ? null : Convert.ToBase64String(setting.RowVersion) });
        });
        g.MapPut("", async (Input input, HttpContext ctx, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireRight("AdminRoles:Maintain");
            var setting = await db.Settings.SingleOrDefaultAsync(s => s.Key == RoleConflicts.SettingKey, ct);
            if (setting is null)
            {
                if (ctx.Request.Headers.IfNoneMatch.ToString() != "*") throw new PreconditionRequiredException();
            }
            else db.ExpectVersion(ctx, setting);
            if (input.Pairs is null || input.Pairs.Length > 50 || input.Pairs.Any(p => p is null || p.FirstRoleId <= 0 || p.SecondRoleId <= 0 || p.FirstRoleId == p.SecondRoleId))
                throw new ValidationException("pairs", "Provide up to 50 pairs of distinct roles.");
            var pairs = input.Pairs.Select(p => new RoleConflicts.Pair(Math.Min(p.FirstRoleId, p.SecondRoleId), Math.Max(p.FirstRoleId, p.SecondRoleId))).Distinct().OrderBy(p => p.FirstRoleId).ThenBy(p => p.SecondRoleId).ToArray();
            var ids = pairs.SelectMany(p => new[] { p.FirstRoleId, p.SecondRoleId }).Distinct().ToArray();
            var roles = await db.AppRoles.AsNoTracking().Where(r => ids.Contains(r.Id)).ToListAsync(ct);
            if (roles.Count != ids.Length || roles.Any(r => r.IsLocked))
                throw new ValidationException("pairs", "Each role must exist and the protected Manager role cannot be included.");
            var value = JsonSerializer.Serialize(pairs);
            if (value.Length > 2000) throw new ValidationException("pairs", "The policy is too large.");
            if (pairs.Length > 0)
            {
                var users = await db.Users.AsNoTracking().Where(u => u.IsActive).Include(u => u.Roles).ToListAsync(ct);
                var manager = await db.AppRoles.AsNoTracking().Where(r => r.Key == BuiltInRoles.ManagerKey && r.IsActive).Select(r => r.Id).SingleOrDefaultAsync(ct);
                if (!await RoleConflicts.HasRecoveryAsync(db, manager, users.Select(u => (u.Id, u.Roles.Select(r => r.AppRoleId).ToArray())), resolver.IsForms, clock.GetUtcNow(), ct))
                    throw new ValidationException("pairs", "Keep an active recovery administrator with Manager as their only directly assigned role and effective rights to maintain roles.");
                var mappings = await db.GroupMappings.AsNoTracking().Include(m => m.Roles).ToListAsync(ct);
                var activeRoleIds = (await db.AppRoles.AsNoTracking().Where(r => r.IsActive).Select(r => r.Id).ToListAsync(ct)).ToHashSet();
                foreach (var user in users)
                {
                    var groups = user.Id == me.UserId ? resolver.PrincipalGroups(ctx.User) : resolver.RequireGroups(user.MappedGroups).ToHashSet(StringComparer.OrdinalIgnoreCase);
                    var held = user.Roles.Select(r => r.AppRoleId).Concat(mappings.Where(m => groups.Contains(m.GroupName)).SelectMany(m => m.Roles.Select(r => r.AppRoleId))).Distinct().ToArray();
                    var active = held.Where(activeRoleIds.Contains);
                    if (RoleConflicts.Conflicts(active, pairs))
                        throw new ValidationException("pairs", "The policy conflicts with an active user's assigned or last observed directory roles. Resolve those assignments first.");
                }
            }
            if (setting is null) db.Settings.Add(new AppSetting { Key = RoleConflicts.SettingKey, Value = value, Description = "Incompatible role pairs" });
            else setting.Value = value;
            db.AuditReason = "Separation-of-duties policy updated";
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }
}
