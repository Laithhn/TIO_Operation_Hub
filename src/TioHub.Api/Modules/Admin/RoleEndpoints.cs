using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

/// <summary>A31: Administration → Roles &amp; rights. The TIO Manager role keeps every right; built-in roles cannot be deleted.</summary>
public static class RoleEndpoints
{
    public sealed record RoleInput(string? Name, string? Description, string[]? Rights);

    public static void MapRoleEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin/roles").WithTags("Administration");

        g.MapGet("", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var roles = await db.AppRoles.AsNoTracking().OrderBy(r => r.Key == null).ThenBy(r => r.Key == BuiltInRoles.EngineerKey).ThenBy(r => r.Name).ToListAsync(ct);
            var counts = await db.UserRoles.Where(ur => db.Users.Any(u => u.Id == ur.UserId && u.IsActive)).GroupBy(ur => ur.AppRoleId)
                .Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            return Results.Ok(new
            {
                rights = BuiltInRoles.Catalog.Select(r => new { key = r.Key.ToString(), r.Label, r.Description }),
                roles = roles.Select(r => new
                {
                    r.Id, r.Name, r.Description, r.Key, r.IsLocked, rights = BuiltInRoles.Names(r.IsLocked ? BuiltInRoles.All : r.Rights),
                    userCount = counts.GetValueOrDefault(r.Id), version = Convert.ToBase64String(r.RowVersion)
                })
            });
        });

        g.MapPost("", async (RoleInput input, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var r = new AppRole();
            await ApplyAsync(r, input, db, me, ct);
            db.AppRoles.Add(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/roles/{r.Id}", new { r.Id });
        });

        g.MapPut("/{id:long}", async (long id, RoleInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var r = await db.AppRoles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The role");
            db.ExpectVersion(ctx, r);
            await ApplyAsync(r, input, db, me, ct);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });

        g.MapDelete("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var r = await db.AppRoles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The role");
            db.ExpectVersion(ctx, r);
            if (r.Key is not null) throw new ValidationException("role", $"{r.Name} is a built-in role and cannot be deleted. You can change its rights instead.");
            var holders = await db.UserRoles.CountAsync(ur => ur.AppRoleId == id, ct);
            if (holders > 0) throw new ValidationException("role", $"{holders} user(s) still hold {r.Name}. Give them another role first (deactivated users included).");
            db.AppRoles.Remove(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }

    private static async Task ApplyAsync(AppRole r, RoleInput i, HubDbContext db, UserContext me, CancellationToken ct)
    {
        var check = new Check().Text("name", i.Name, 60, "the role name", required: true).Text("description", i.Description, 300, "Description");
        var rights = Right.None;
        foreach (var name in i.Rights ?? [])
        {
            if (Enum.TryParse<Right>(name, true, out var right) && BuiltInRoles.Catalog.Any(c => c.Key == right)) rights |= right;
            else check.Add("rights", $"Unknown right: {name}.");
        }
        if (r.IsLocked && rights != BuiltInRoles.All && i.Rights is not null)
            check.Add("rights", "The TIO Manager role always holds every right, so administration can never be lost.");
        // Nobody removes their own administration (it would lock them out of this page).
        if (r.Id != 0 && !r.IsLocked && r.Rights.HasFlag(Right.Administer) && !rights.HasFlag(Right.Administer)
            && await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id && ur.UserId == me.UserId, ct))
            check.Add("rights", "You hold this role, so removing Administration would lock you out. Ask another administrator.");
        check.ThrowIfAny();
        var name0 = i.Name!.Trim();
        if (await db.AppRoles.AnyAsync(x => x.Name == name0 && x.Id != r.Id, ct))
            throw new ConflictException("A role with this name already exists.", new() { ["name"] = ["Role names are unique."] });
        r.Name = name0;
        r.Description = Text.Clean(i.Description);
        r.Rights = r.IsLocked ? BuiltInRoles.All : rights;
    }
}
