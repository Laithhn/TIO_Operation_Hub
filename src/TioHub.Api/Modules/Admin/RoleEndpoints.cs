using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

/// <summary>Administration → Roles and Rights. The TIO Manager role keeps every right; built-in roles cannot be deleted.</summary>
public static class RoleEndpoints
{
    public sealed record RoleInput(string? Name, string? Description, string[]? Rights = null, bool? IsActive = null);

    public static void MapRoleEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin/roles").WithTags("Administration");

        g.MapGet("", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var roles = await db.AppRoles.AsNoTracking().Include(r => r.Rights).OrderBy(r => r.Key == null).ThenBy(r => r.Key == BuiltInRoles.EngineerKey).ThenBy(r => r.Name).ToListAsync(ct);
            var stored = await db.RightDefinitions.AsNoTracking().ToDictionaryAsync(d => d.Key, d => d.IsActive, StringComparer.OrdinalIgnoreCase, ct);
            var counts = await db.UserRoles.Where(ur => db.Users.Any(u => u.Id == ur.UserId && u.IsActive)).GroupBy(ur => ur.AppRoleId)
                .Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            return Results.Ok(new
            {
                catalog = RightsCatalog.All.Select(d => new
                {
                    d.Key, d.Label, d.Description, d.Module, d.Feature, d.FeatureLabel, d.Action, d.Kind, d.RiskLevel, d.SupportsScope, d.Requires, d.DisplayOrder,
                    isActive = stored.GetValueOrDefault(d.Key)
                }),
                roles = roles.Select(r => new
                {
                    r.Id, r.Name, r.Description, r.Key, r.IsLocked, r.IsActive,
                    rights = BuiltInRoles.KeysOf(r).ToArray(),
                    userCount = counts.GetValueOrDefault(r.Id), version = Convert.ToBase64String(r.RowVersion)
                })
            });
        });

        // Who holds a role directly. Directory group mappings are listed on the mappings page: their members are not known here.
        g.MapGet("/{id:long}/holders", async (long id, HubDbContext db, CancellationToken ct) =>
        {
            if (!await db.AppRoles.AnyAsync(r => r.Id == id, ct)) throw new NotFoundException("The role");
            return Results.Ok(await db.Users.AsNoTracking().Where(u => u.Roles.Any(r => r.AppRoleId == id)).OrderBy(u => u.DisplayName)
                .Select(u => new { u.Id, u.DisplayName, u.AccountName, u.IsActive }).ToListAsync(ct));
        });

        g.MapPost("", async (RoleInput input, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            var r = new AppRole();
            await ApplyAsync(r, input, db, me, resolver, clock.GetUtcNow(), ct);
            db.AppRoles.Add(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/roles/{r.Id}", new { r.Id });
        });

        g.MapPost("/{id:long}/clone", async (long id, RoleInput input, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            var source = await db.AppRoles.AsNoTracking().Include(r => r.Rights).FirstOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new NotFoundException("The role");
            var clone = new AppRole();
            await ApplyAsync(clone, input with { Rights = BuiltInRoles.KeysOf(source).ToArray() }, db, me, resolver, clock.GetUtcNow(), ct);
            db.AppRoles.Add(clone);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/roles/{clone.Id}", new { clone.Id });
        });

        g.MapPut("/{id:long}", async (long id, RoleInput input, HttpContext ctx, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            var r = await db.AppRoles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The role");
            db.ExpectVersion(ctx, r);
            await ApplyAsync(r, input, db, me, resolver, clock.GetUtcNow(), ct);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });

        g.MapDelete("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            var r = await db.AppRoles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The role");
            db.ExpectVersion(ctx, r);
            if (r.Key is not null) throw new ValidationException("role", $"{r.Name} is a built-in role and cannot be deleted. You can change its rights instead.");
            var holders = await db.UserRoles.CountAsync(ur => ur.AppRoleId == id, ct);
            if (holders > 0) throw new ValidationException("role", $"{holders} user(s) still hold {r.Name}. Give them another role first (deactivated users included).");
            var mappings = await db.GroupMappingRoles.CountAsync(m => m.AppRoleId == id, ct);
            if (mappings > 0) throw new ValidationException("role", $"{mappings} directory group mapping(s) still give {r.Name}. Change those mappings first.");
            db.RoleRights.RemoveRange(await db.RoleRights.Where(p => p.AppRoleId == id).ToListAsync(ct));
            db.AppRoles.Remove(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }

    private static async Task ApplyAsync(AppRole r, RoleInput i, HubDbContext db, UserContext me, UserResolver resolver, DateTimeOffset now, CancellationToken ct)
    {
        var check = new Check().Text("name", i.Name, 60, "the role name", required: true).Text("description", i.Description, 300, "Description");
        if (r.IsLocked && i.IsActive == false)
            check.Add("isActive", "The protected TIO Manager role cannot be deactivated.");

        var existing = r.Id == 0 ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : (await db.RoleRights.Where(p => p.AppRoleId == r.Id).Select(p => p.RightKey).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var active = (await db.RightDefinitions.Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        HashSet<string> keys;
        if (i.Rights is null) keys = existing;
        else
        {
            keys = new(StringComparer.OrdinalIgnoreCase);
            foreach (var key in i.Rights)
                if (RightsCatalog.TryCanonical(key, out var canonical) && active.Contains(canonical)) keys.Add(canonical);
                else if (existing.Contains(key)) keys.Add(key); // A retired key that is already stored stays reviewable, and grants nothing.
                else check.Add("rights", $"Unknown or retired right: {key}.");
        }
        var all = RightsCatalog.AllKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (r.IsLocked && !keys.SetEquals(all) && i.Rights is not null)
            check.Add("rights", "The TIO Manager role always holds every right, so administration can never be lost.");
        // Nobody removes their own administration (it would lock them out of this page).
        if (r.Id != 0 && !r.IsLocked && existing.Contains(RightKeys.Administration) && !keys.Contains(RightKeys.Administration)
            && await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id && ur.UserId == me.UserId, ct))
            check.Add("rights", "You hold this role, so removing Administration would lock you out. Ask another administrator.");

        if (!me.IsSystem && r.Id != 0)
        {
            var ownRole = me.Roles.Contains(r.Name, StringComparer.OrdinalIgnoreCase)
                || await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id && ur.UserId == me.UserId, ct);
            if (ownRole && (!(r.IsLocked ? all : existing).SetEquals(keys) || (i.IsActive ?? r.IsActive) != r.IsActive))
                check.Add("role", "You cannot change your own authorization through a role assigned to you. Ask another authorized administrator.");
        }
        if (!me.IsSystem)
        {
            var enabling = r.Id == 0 || !r.IsActive && i.IsActive != false;
            var increases = r.Id != 0 && (i.IsActive ?? r.IsActive) && (!r.IsActive || keys.Except(existing, StringComparer.OrdinalIgnoreCase).Any());
            if (increases)
            {
                var hasUsers = await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id, ct);
                var hasMappedGroup = await db.GroupMappingRoles.AnyAsync(m => m.AppRoleId == r.Id, ct);
                // A recipient can have directory-mapped roles which are not recorded until their next sign-in.
                // Such roles may combine with this change to enable rights.
                if ((hasUsers || hasMappedGroup) && active.Any(key => !me.HasRight(key)))
                    check.Add("role", "Increasing an assigned or directory-mapped role requires all active rights because recipients may hold other roles.");
            }
            var recipients = db.UserRoles.Where(ur => ur.AppRoleId == r.Id).Select(ur => ur.UserId);
            var coassigned = await db.RoleRights.Where(p => p.AppRole!.IsActive &&
                db.UserRoles.Any(ur => recipients.Contains(ur.UserId) && ur.AppRoleId == p.AppRoleId))
                .Select(p => p.RightKey).ToListAsync(ct);
            // A prerequisite can also activate a right already stored in another role held by the recipient.
            foreach (var key in RightsCatalog.GrantCandidates(existing, keys, enabling, coassigned).Where(k => !me.HasRight(k)))
                check.Add("rights", $"You cannot grant {key}; you do not hold that right.");
            if (r.IsLocked && RightsCatalog.AllKeys.Any(k => !me.HasRight(k)))
                check.Add("role", "Editing the protected TIO Manager role requires all of its rights.");
        }
        if (r.Id != 0 && r.IsActive && (resolver.IsForms || i.IsActive == false || existing.Contains(RightKeys.Administration) && !keys.Contains(RightKeys.Administration)))
        {
            var proposed = new AppRole { Id = r.Id, Key = r.Key, IsActive = r.IsLocked || (i.IsActive ?? r.IsActive) };
            foreach (var key in keys) proposed.Rights.Add(new RoleRight { RightKey = key });
            try { await EnsureAdministratorRemainsAsync(db, proposed, resolver, now, ct); }
            catch (ValidationException ex) { check.Add("isActive", ex.Message); }
        }
        check.ThrowIfAny();
        var name = i.Name!.Trim();
        if (await db.AppRoles.AnyAsync(x => x.Name == name && x.Id != r.Id, ct))
            throw new ConflictException("A role with this name already exists.", new() { ["name"] = ["Role names are unique."] });
        r.Name = name;
        r.Description = Text.Clean(i.Description);
        r.IsActive = r.IsLocked || (i.IsActive ?? r.IsActive);
        if (r.IsLocked) keys = all;
        var current = r.Id == 0 ? [] : await db.RoleRights.Where(p => p.AppRoleId == r.Id).ToListAsync(ct);
        db.RoleRights.RemoveRange(current.Where(p => !keys.Contains(p.RightKey)));
        var present = current.Select(p => p.RightKey).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var key in keys.Where(k => !present.Contains(k)))
            db.RoleRights.Add(new RoleRight { AppRole = r, RightKey = key });
    }

    private static async Task EnsureAdministratorRemainsAsync(HubDbContext db, AppRole proposedRole, UserResolver resolver, DateTimeOffset now, CancellationToken ct)
    {
        if (await AdministratorRecovery.RemainsAsync(db, resolver, now, ct, proposedRole: proposedRole)) return;
        throw new ValidationException("role", resolver.IsForms
            ? "Keep an active administrator with a Forms password and effective user administration rights."
            : "This change would remove the last administrator with effective user administration rights. Assign them to another active user first.");
    }
}
