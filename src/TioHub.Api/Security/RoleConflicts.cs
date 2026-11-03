using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>Opt-in incompatible active roles. Invalid stored policy denies access instead of silently disabling enforcement.</summary>
public static class RoleConflicts
{
    public const string SettingKey = "Authorization.RoleConflicts";
    public sealed record Pair(long FirstRoleId, long SecondRoleId);

    public static Pair[] Parse(string? value)
    {
        if (value is null) return [];
        try
        {
            var pairs = JsonSerializer.Deserialize<Pair[]>(value) ?? throw new JsonException();
            if (pairs.Any(p => p is null || p.FirstRoleId <= 0 || p.SecondRoleId <= p.FirstRoleId)
                || pairs.Distinct().Count() != pairs.Length) throw new JsonException();
            return pairs;
        }
        catch (JsonException) { throw new ForbiddenException("The role conflict policy is invalid. Contact an administrator."); }
    }

    public static bool Conflicts(IEnumerable<long> roleIds, IEnumerable<Pair> pairs)
    {
        var roles = roleIds.ToHashSet();
        return pairs.Any(p => roles.Contains(p.FirstRoleId) && roles.Contains(p.SecondRoleId));
    }

    /// <summary>Recovery must be able to read and change this policy after all direct denies and prerequisites are applied.</summary>
    public static bool HasRecoveryPermissions(IEnumerable<UserPermissionOverride> overrides, ISet<string> active, DateTimeOffset now)
    {
        var effective = PermissionOverrides.ResolveForRights(ResourcePermissions.All, overrides, BuiltInRoles.All, now, active)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        return effective.Contains("AdminRoles:View") && effective.Contains("AdminRoles:Maintain");
    }

    public static async Task<bool> HasRecoveryAsync(HubDbContext db, long managerId,
        IEnumerable<(long UserId, long[] RoleIds)> candidates, bool forms, DateTimeOffset now, CancellationToken ct)
    {
        if (managerId == 0) return false;
        var ids = candidates.Where(c => c.RoleIds.Length == 1 && c.RoleIds[0] == managerId).Select(c => c.UserId).ToArray();
        if (ids.Length == 0) return false;
        if (forms)
        {
            var credentials = await db.UserCredentials.AsNoTracking().Where(c => ids.Contains(c.UserId))
                .Select(c => new { c.UserId, c.PasswordHash }).ToListAsync(ct);
            ids = credentials.Where(c => IsUsableFormsCredential(c.PasswordHash)).Select(c => c.UserId).ToArray();
            if (ids.Length == 0) return false;
        }
        var active = (await db.PermissionDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var entries = await db.UserPermissionOverrides.AsNoTracking().Where(o => ids.Contains(o.UserId)).ToListAsync(ct);
        return ids.Any(id => HasRecoveryPermissions(entries.Where(o => o.UserId == id), active, now));
    }

    // An account with no issued password is not a recovery path in Forms mode. A structurally
    // usable hash cannot prove that its owner knows the password; that is an operational check.
    public static bool IsUsableFormsCredential(string? hash)
    {
        var parts = (hash ?? "").Split('$');
        if (parts.Length != 4 || parts[0] != "pbkdf2-sha256" || !int.TryParse(parts[1], out var iterations) || iterations < 100_000)
            return false;
        try { return Convert.FromBase64String(parts[2]).Length > 0 && Convert.FromBase64String(parts[3]).Length > 0; }
        catch (FormatException) { return false; }
    }

    /// <summary>Verify that at least one Forms account can manage users after the proposed role change.</summary>
    public static async Task<bool> HasFormsUserAdministratorAsync(HubDbContext db,
        IEnumerable<(long UserId, long[] RoleIds)> candidates, DateTimeOffset now, CancellationToken ct, AppRole? proposedRole = null)
    {
        var candidateList = candidates.Where(c => c.UserId > 0).ToArray();
        var ids = candidateList.Select(c => c.UserId).ToArray();
        var credentials = await db.UserCredentials.AsNoTracking().Where(c => ids.Contains(c.UserId))
            .Select(c => new { c.UserId, c.PasswordHash }).ToListAsync(ct);
        var usableIds = credentials.Where(c => IsUsableFormsCredential(c.PasswordHash)).Select(c => c.UserId).ToHashSet();
        var roleIds = candidateList.SelectMany(c => c.RoleIds).Distinct().ToArray();
        var roles = await db.AppRoles.AsNoTracking().Include(r => r.Permissions).Where(r => r.IsActive && roleIds.Contains(r.Id)).ToListAsync(ct);
        if (proposedRole is not null)
        {
            roles.RemoveAll(r => r.Id == proposedRole.Id);
            if (proposedRole.IsActive && roleIds.Contains(proposedRole.Id)) roles.Add(proposedRole);
        }
        var entries = await db.UserPermissionOverrides.AsNoTracking().Where(o => ids.Contains(o.UserId)).ToListAsync(ct);
        var active = (await db.PermissionDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var pairs = await LoadAsync(db, ct);
        return candidateList.Any(c => usableIds.Contains(c.UserId)
            && !Conflicts(roles.Where(r => c.RoleIds.Contains(r.Id)).Select(r => r.Id), pairs)
            && HasUserAdministrationPermissions(roles.Where(r => c.RoleIds.Contains(r.Id)), entries.Where(o => o.UserId == c.UserId), active, now));
    }

    public static bool HasUserAdministrationPermissions(IEnumerable<AppRole> roles, IEnumerable<UserPermissionOverride> overrides,
        ISet<string> active, DateTimeOffset now)
    {
        var held = roles.Where(r => r.IsActive).ToArray();
        var rights = held.Aggregate(Right.None, (current, role) => current | (role.IsLocked ? BuiltInRoles.All : role.Rights));
        if (!rights.HasFlag(Right.Administer)) return false;
        var keys = held.SelectMany(role => role.IsLocked ? ResourcePermissions.All : role.Permissions.Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)));
        var effective = PermissionOverrides.ResolveForRights(keys, overrides, rights, now, active).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return effective.Contains("AdminUsers:View") && effective.Contains("AdminUsers:Maintain");
    }

    public static async Task<Pair[]> LoadAsync(HubDbContext db, CancellationToken ct) =>
        Parse(await db.Settings.AsNoTracking().Where(s => s.Key == SettingKey).Select(s => s.Value).SingleOrDefaultAsync(ct));
}
