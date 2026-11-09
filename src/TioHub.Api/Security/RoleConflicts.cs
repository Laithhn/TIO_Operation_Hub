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
    public static bool HasRecoveryRights(IEnumerable<UserRightException> exceptions, ISet<string> active, DateTimeOffset now)
    {
        var effective = RightExceptions.ResolveForRoles(RightsCatalog.AllKeys, exceptions, now, active)
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
        var active = (await db.RightDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var entries = await db.UserRightExceptions.AsNoTracking().Where(o => ids.Contains(o.UserId)).ToListAsync(ct);
        return ids.Any(id => HasRecoveryRights(entries.Where(o => o.UserId == id), active, now));
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
    public static Task<bool> HasFormsUserAdministratorAsync(HubDbContext db,
        IEnumerable<(long UserId, long[] RoleIds)> candidates, DateTimeOffset now, CancellationToken ct, AppRole? proposedRole = null) =>
        HasUserAdministratorAsync(db, candidates.Where(c => c.UserId > 0), requireFormsCredential: true, now, ct, proposedRole);

    /// <summary>Whether any candidate can manage users once denies, prerequisites, inactive roles and role conflicts are applied.</summary>
    public static async Task<bool> HasUserAdministratorAsync(HubDbContext db, IEnumerable<(long UserId, long[] RoleIds)> candidates,
        bool requireFormsCredential, DateTimeOffset now, CancellationToken ct, AppRole? proposedRole = null)
    {
        var candidateList = candidates.ToArray();
        var ids = candidateList.Select(c => c.UserId).ToArray();
        var usableIds = new HashSet<long>();
        if (requireFormsCredential)
        {
            var credentials = await db.UserCredentials.AsNoTracking().Where(c => ids.Contains(c.UserId))
                .Select(c => new { c.UserId, c.PasswordHash }).ToListAsync(ct);
            usableIds = credentials.Where(c => IsUsableFormsCredential(c.PasswordHash)).Select(c => c.UserId).ToHashSet();
        }
        var roleIds = candidateList.SelectMany(c => c.RoleIds).Distinct().ToArray();
        var roles = await db.AppRoles.AsNoTracking().Include(r => r.Rights).Where(r => r.IsActive && roleIds.Contains(r.Id)).ToListAsync(ct);
        if (proposedRole is not null)
        {
            roles.RemoveAll(r => r.Id == proposedRole.Id);
            if (proposedRole.IsActive && roleIds.Contains(proposedRole.Id)) roles.Add(proposedRole);
        }
        var entries = await db.UserRightExceptions.AsNoTracking().Where(o => ids.Contains(o.UserId)).ToListAsync(ct);
        var active = (await db.RightDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var pairs = await LoadAsync(db, ct);
        return candidateList.Any(c => (!requireFormsCredential || usableIds.Contains(c.UserId))
            && !Conflicts(roles.Where(r => c.RoleIds.Contains(r.Id)).Select(r => r.Id), pairs)
            && HasUserAdministrationRights(roles.Where(r => c.RoleIds.Contains(r.Id)), entries.Where(o => o.UserId == c.UserId), active, now));
    }

    public static bool HasUserAdministrationRights(IEnumerable<AppRole> roles, IEnumerable<UserRightException> exceptions,
        ISet<string> active, DateTimeOffset now)
    {
        var keys = roles.Where(r => r.IsActive).SelectMany(BuiltInRoles.KeysOf);
        var effective = RightExceptions.ResolveForRoles(keys, exceptions, now, active).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return effective.Contains("AdminUsers:View") && effective.Contains("AdminUsers:Maintain");
    }

    public static async Task<Pair[]> LoadAsync(HubDbContext db, CancellationToken ct) =>
        Parse(await db.Settings.AsNoTracking().Where(s => s.Key == SettingKey).Select(s => s.Value).SingleOrDefaultAsync(ct));
}
