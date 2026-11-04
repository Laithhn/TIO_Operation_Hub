using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Security;

/// <summary>
/// Proves an administrator remains after a proposed change, by effective permissions rather than by holding a role name: inactive roles,
/// direct denies, missing prerequisites and role conflicts all disqualify. Forms additionally needs a usable password. Directory modes use
/// each person's last-observed groups; an account whose snapshot is unavailable counts through direct roles only, and not at all while a
/// role conflict policy is active, because an unseen mapped role could put it in conflict.
/// </summary>
public static class AdministratorRecovery
{
    public sealed record Mapping(string GroupName, long[] RoleIds);

    public static async Task<bool> RemainsAsync(HubDbContext db, UserResolver resolver, DateTimeOffset now, CancellationToken ct,
        long changedUserId = 0, bool targetActive = true, IReadOnlyCollection<long>? targetRoleIds = null,
        Modules.Access.AppRole? proposedRole = null, IReadOnlyCollection<Mapping>? proposedMappings = null)
    {
        var users = await db.Users.AsNoTracking().Where(u => u.IsActive).Include(u => u.Roles).ToListAsync(ct);
        if (resolver.IsForms)
        {
            var forms = users.Where(u => u.Id != changedUserId).Select(u => (u.Id, u.Roles.Select(r => r.AppRoleId).ToArray())).ToList();
            if (targetActive && changedUserId != 0)
                forms.Add((changedUserId, targetRoleIds?.ToArray() ?? await db.UserRoles.AsNoTracking().Where(r => r.UserId == changedUserId).Select(r => r.AppRoleId).ToArrayAsync(ct)));
            return await RoleConflicts.HasFormsUserAdministratorAsync(db, forms, now, ct, proposedRole);
        }

        var mappings = proposedMappings ?? (await db.GroupMappings.AsNoTracking().Include(m => m.Roles).ToListAsync(ct))
            .Select(m => new Mapping(m.GroupName, m.Roles.Select(r => r.AppRoleId).ToArray())).ToArray();
        var conflictPolicyActive = (await RoleConflicts.LoadAsync(db, ct)).Length > 0;
        var candidates = new List<(long UserId, long[] RoleIds)>();
        void Add(long id, IEnumerable<long> direct, string? stored)
        {
            var known = resolver.TryGroups(stored, out var groups);
            if (!known && conflictPolicyActive) return;
            var names = groups.ToHashSet(StringComparer.OrdinalIgnoreCase);
            var mapped = mappings.Where(m => names.Contains(m.GroupName.Trim())).SelectMany(m => m.RoleIds);
            candidates.Add((id, direct.Concat(mapped).Distinct().ToArray()));
        }
        foreach (var user in users.Where(u => u.Id != changedUserId))
            Add(user.Id, user.Roles.Select(r => r.AppRoleId), user.MappedGroups);
        if (targetActive)
        {
            var target = changedUserId == 0 ? null : await db.Users.AsNoTracking().Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == changedUserId, ct);
            if (changedUserId == 0 || target is not null)
                Add(changedUserId, targetRoleIds ?? target?.Roles.Select(r => r.AppRoleId).ToArray() ?? [], target?.MappedGroups);
        }
        return await RoleConflicts.HasUserAdministratorAsync(db, candidates, requireFormsCredential: false, now, ct, proposedRole);
    }
}
