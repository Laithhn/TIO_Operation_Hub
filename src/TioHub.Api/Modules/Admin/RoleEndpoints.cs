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
    public sealed record RoleInput(string? Name, string? Description, string[]? Rights, string[]? Permissions = null, bool? IsActive = null);

    public static void MapRoleEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin/roles").WithTags("Administration");

        g.MapGet("", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var roles = await db.AppRoles.AsNoTracking().Include(r => r.Permissions).OrderBy(r => r.Key == null).ThenBy(r => r.Key == BuiltInRoles.EngineerKey).ThenBy(r => r.Name).ToListAsync(ct);
            var definitions = await db.PermissionDefinitions.AsNoTracking().OrderBy(p => p.Module).ThenBy(p => p.ResourceType).ThenBy(p => p.Action).ToListAsync(ct);
            var counts = await db.UserRoles.Where(ur => db.Users.Any(u => u.Id == ur.UserId && u.IsActive)).GroupBy(ur => ur.AppRoleId)
                .Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            return Results.Ok(new
            {
                rights = BuiltInRoles.Catalog.Where(r => ResourcePermissions.CrossCutting(r.Key) != Right.None)
                    .Select(r => new { key = r.Key.ToString(), r.Label, r.Description }),
                permissions = definitions.Select(d =>
                {
                    var legacy = ResourcePermissions.Catalog.FirstOrDefault(p => p.Key == d.Key);
                    return new { key = d.Key, displayName = d.DisplayName, resource = d.ResourceType, resourceLabel = legacy?.ResourceLabel ?? d.DisplayName,
                        action = d.Action, actionLabel = legacy?.ActionLabel ?? d.Action, description = d.Description,
                        module = d.Module, parentKey = d.ParentKey, riskLevel = d.RiskLevel, isActive = d.IsActive, supportsScope = d.SupportsScope, nodeType = d.NodeType, displayOrder = d.DisplayOrder,
                        requires = CapabilityPermissions.Dependencies(d.Key) };
                }),
                roles = roles.Select(r => new
                {
                    r.Id, r.Name, r.Description, r.Key, r.IsLocked, r.IsActive,
                    rights = BuiltInRoles.Names(ResourcePermissions.CrossCutting(r.IsLocked ? BuiltInRoles.All : r.Rights)),
                    permissions = r.IsLocked ? ResourcePermissions.All : r.Permissions.Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToArray(),
                    userCount = counts.GetValueOrDefault(r.Id), version = Convert.ToBase64String(r.RowVersion)
                })
            });
        });

        g.MapPost("", async (RoleInput input, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var r = new AppRole();
            await ApplyAsync(r, input, db, me, resolver, clock.GetUtcNow(), ct);
            db.AppRoles.Add(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/roles/{r.Id}", new { r.Id });
        });

        g.MapPost("/{id:long}/clone", async (long id, RoleInput input, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var source = await db.AppRoles.AsNoTracking().Include(r => r.Permissions).FirstOrDefaultAsync(r => r.Id == id, ct)
                ?? throw new NotFoundException("The role");
            var clone = new AppRole();
            var cloneInput = input with
            {
                Rights = BuiltInRoles.Names(source.IsLocked ? BuiltInRoles.All : source.Rights),
                Permissions = source.IsLocked ? ResourcePermissions.All : source.Permissions.Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToArray()
            };
            await ApplyAsync(clone, cloneInput, db, me, resolver, clock.GetUtcNow(), ct);
            db.AppRoles.Add(clone);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/roles/{clone.Id}", new { clone.Id });
        });

        g.MapPut("/{id:long}", async (long id, RoleInput input, HttpContext ctx, HubDbContext db, UserContext me, UserResolver resolver, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var r = await db.AppRoles.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The role");
            db.ExpectVersion(ctx, r);
            await ApplyAsync(r, input, db, me, resolver, clock.GetUtcNow(), ct);
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
            db.RolePermissions.RemoveRange(await db.RolePermissions.Where(p => p.AppRoleId == id).ToListAsync(ct));
            db.AppRoles.Remove(r);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
    }

    private static async Task ApplyAsync(AppRole r, RoleInput i, HubDbContext db, UserContext me, UserResolver resolver, DateTimeOffset now, CancellationToken ct)
    {
        var check = new Check().Text("name", i.Name, 60, "the role name", required: true).Text("description", i.Description, 300, "Description");
        var rights = Right.None;
        var legacyRights = Right.None;
        var legacyProvided = false;
        foreach (var name in i.Rights ?? [])
        {
            if (Enum.TryParse<Right>(name, true, out var right) && BuiltInRoles.Catalog.Any(c => c.Key == right))
            {
                if (ResourcePermissions.CrossCutting(right) != Right.None) rights |= right;
                else if (right is Right.Edit or Right.Manage or Right.Archive or Right.Delete)
                {
                    legacyProvided = true;
                    legacyRights |= right;
                }
            }
            else check.Add("rights", $"Unknown right: {name}.");
        }
        if (r.IsLocked && rights != ResourcePermissions.CrossCutting(BuiltInRoles.All) && i.Rights is not null)
            check.Add("rights", "The TIO Manager role always holds every right, so administration can never be lost.");
        if (r.IsLocked && i.IsActive == false)
            check.Add("isActive", "The protected TIO Manager role cannot be deactivated.");
        // Nobody removes their own administration (it would lock them out of this page).
        if (r.Id != 0 && !r.IsLocked && r.Rights.HasFlag(Right.Administer) && !rights.HasFlag(Right.Administer)
            && await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id && ur.UserId == me.UserId, ct))
            check.Add("rights", "You hold this role, so removing Administration would lock you out. Ask another administrator.");

        HashSet<string> permissionKeys;
        if (i.Permissions is not null)
        {
            permissionKeys = new(StringComparer.OrdinalIgnoreCase);
            var existingKeys = r.Id == 0 ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : (await db.RolePermissions.Where(p => p.AppRoleId == r.Id)
                    .Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var activeKeys = (await db.PermissionDefinitions.Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            var inactiveKeys = (await db.PermissionDefinitions.Where(p => !p.IsActive).Select(p => p.Key).ToListAsync(ct))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
            foreach (var key in i.Permissions)
                if (ResourcePermissions.TryParse(key, out var resource, out var action) && activeKeys.Contains(key)) permissionKeys.Add(ResourcePermissions.KeyOf(resource, action));
                else if (existingKeys.Contains(key) && inactiveKeys.Contains(key)) permissionKeys.Add(key);
                else check.Add("permissions", $"Unknown or inactive resource permission: {key}.");
        }
        else if (legacyProvided) permissionKeys = ResourcePermissions.ExpandLegacy(legacyRights).ToHashSet(StringComparer.OrdinalIgnoreCase);
        else if (r.Id == 0) permissionKeys = [];
        else permissionKeys = (await db.RolePermissions.Where(p => p.AppRoleId == r.Id)
            .Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var allPermissions = ResourcePermissions.All.ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (r.IsLocked && !permissionKeys.SetEquals(allPermissions) && i.Permissions is not null)
            check.Add("permissions", "The TIO Manager role always keeps every resource permission.");
        if (!me.IsSystem && r.Id != 0)
        {
            var ownRole = me.Roles.Contains(r.Name, StringComparer.OrdinalIgnoreCase)
                || await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id && ur.UserId == me.UserId, ct);
            if (ownRole)
            {
                var currentKeys = r.IsLocked ? allPermissions : (await db.RolePermissions.Where(p => p.AppRoleId == r.Id)
                    .Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
                if (ResourcePermissions.CrossCutting(r.Rights) != rights || !currentKeys.SetEquals(permissionKeys)
                    || (i.IsActive ?? r.IsActive) != r.IsActive)
                    check.Add("role", "You cannot change your own authorization through a role assigned to you. Ask another authorized administrator.");
            }
        }
        if (!me.IsSystem)
        {
            var existingKeys = r.Id == 0 ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                : (await db.RolePermissions.Where(p => p.AppRoleId == r.Id).Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var enabling = r.Id == 0 || !r.IsActive && i.IsActive != false;
            var increasesAccess = r.Id != 0 && (i.IsActive ?? r.IsActive)
                && (!r.IsActive || permissionKeys.Except(existingKeys, StringComparer.OrdinalIgnoreCase).Any()
                    || (rights & ~ResourcePermissions.CrossCutting(r.Rights)) != Right.None);
            if (increasesAccess)
            {
                var hasUsers = await db.UserRoles.AnyAsync(ur => ur.AppRoleId == r.Id, ct);
                var mappedRole = r.Key switch { BuiltInRoles.ManagerKey => Role.Manager, BuiltInRoles.EngineerKey => Role.Engineer, _ => (Role?)null };
                var hasMappedGroup = mappedRole is not null && await db.GroupMappings.AnyAsync(m => m.Role == mappedRole, ct);
                if (hasUsers || hasMappedGroup)
                {
                    // A recipient can have directory-mapped roles which are not recorded until their next sign-in.
                    // Such roles may combine with this change to enable capabilities or cross-cutting rights.
                    var activeKeys = await db.PermissionDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct);
                    var crossCutting = ResourcePermissions.CrossCutting(BuiltInRoles.All);
                    if (activeKeys.Any(key => !me.HasPermission(key)) || (me.Rights & crossCutting) != crossCutting)
                        check.Add("role", "Increasing an assigned or directory-mapped role requires all active permissions and cross-cutting rights because recipients may hold other roles.");
                }
            }
            var recipients = db.UserRoles.Where(ur => ur.AppRoleId == r.Id).Select(ur => ur.UserId);
            var coassigned = await db.RolePermissions.Where(p => p.AppRole!.IsActive &&
                db.UserRoles.Any(ur => recipients.Contains(ur.UserId) && ur.AppRoleId == p.AppRoleId))
                .Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToListAsync(ct);
            // Parent grants can also activate retained actions in another role held by the recipient.
            foreach (var key in PermissionHierarchy.GrantCandidates(existingKeys, permissionKeys, enabling, coassigned).Where(k => !me.HasPermission(k)))
                check.Add("permissions", $"You cannot grant {key}; you do not hold that permission.");
            foreach (var right in Enum.GetValues<Right>().Where(x => x != Right.None && ResourcePermissions.CrossCutting(x) == x && rights.HasFlag(x) && !me.Rights.HasFlag(x)))
                check.Add("rights", $"You cannot grant {right}; you do not hold that right.");
            if (r.IsLocked && (ResourcePermissions.All.Any(k => !me.HasPermission(k)) || (me.Rights & BuiltInRoles.All) != BuiltInRoles.All))
                check.Add("role", "Editing the protected TIO Manager role requires all of its permissions and rights.");
        }
        if (r.Id != 0 && r.IsActive && (resolver.IsForms || i.IsActive == false || r.Rights.HasFlag(Right.Administer) && !rights.HasFlag(Right.Administer)))
        {
            var proposed = new AppRole { Id = r.Id, Key = r.Key, Rights = r.IsLocked ? BuiltInRoles.All : rights, IsActive = r.IsLocked || (i.IsActive ?? r.IsActive) };
            foreach (var key in permissionKeys)
                if (ResourcePermissions.TryParse(key, out var resource, out var action)) proposed.Permissions.Add(new RolePermission { Resource = resource, Action = action });
            try { await EnsureAdministratorRemainsAsync(db, proposed, resolver, now, ct); }
            catch (ValidationException ex) { check.Add("isActive", ex.Message); }
        }
        check.ThrowIfAny();
        var name0 = i.Name!.Trim();
        if (await db.AppRoles.AnyAsync(x => x.Name == name0 && x.Id != r.Id, ct))
            throw new ConflictException("A role with this name already exists.", new() { ["name"] = ["Role names are unique."] });
        r.Name = name0;
        r.Description = Text.Clean(i.Description);
        r.Rights = r.IsLocked ? BuiltInRoles.All : rights;
        r.IsActive = r.IsLocked || (i.IsActive ?? r.IsActive);
        if (r.IsLocked) permissionKeys = allPermissions;
        var current = r.Id == 0 ? [] : await db.RolePermissions.Where(p => p.AppRoleId == r.Id).ToListAsync(ct);
        db.RolePermissions.RemoveRange(current.Where(p => !permissionKeys.Contains(ResourcePermissions.KeyOf(p.Resource, p.Action))));
        var present = current.Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var key in permissionKeys.Where(k => !present.Contains(k)))
            if (ResourcePermissions.TryParse(key, out var resource, out var action))
                db.RolePermissions.Add(new RolePermission { AppRole = r, Resource = resource, Action = action });
    }

    private static async Task EnsureAdministratorRemainsAsync(HubDbContext db, AppRole proposedRole, UserResolver resolver, DateTimeOffset now, CancellationToken ct)
    {
        if (resolver.IsForms)
        {
            var activeUsers = await db.Users.AsNoTracking().Where(u => u.IsActive).Include(u => u.Roles).ToListAsync(ct);
            var candidates = activeUsers.Select(u => (u.Id, u.Roles.Select(r => r.AppRoleId).ToArray()));
            if (!await RoleConflicts.HasFormsUserAdministratorAsync(db, candidates, now, ct, proposedRole))
                throw new ValidationException("role", "Keep an active administrator with a Forms password and effective user administration permissions.");
            return;
        }
        var privilegedGroups = (await db.GroupMappings.AsNoTracking().Where(m => m.Role == Role.Manager)
            .Select(m => m.GroupName).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var users = await db.Users.AsNoTracking().Where(u => u.IsActive).Include(u => u.Roles).ThenInclude(r => r.AppRole).ToListAsync(ct);
        var remains = users.Any(u => u.Roles.Any(r => r.AppRole is { IsActive: true } role && role.Id != proposedRole.Id && (role.IsLocked || role.Rights.HasFlag(Right.Administer)))
            || resolver.Groups(u.MappedGroups).Any(privilegedGroups.Contains));
        if (!remains) throw new ValidationException("role", "This change would remove the last active administrator. Assign Administration to another active user first.");
    }
}
