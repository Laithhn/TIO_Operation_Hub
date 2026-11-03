using TioHub.Api.Common;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>Applies direct exceptions before enforcing the permission prerequisites.</summary>
public static class PermissionOverrides
{
    /// <summary>
    /// Administrators derive authority only from roles: a direct allow must never become a
    /// temporary ceiling from which an administrator can delegate permanent access. Direct
    /// denies remain mandatory and can still expire normally.
    /// </summary>
    public static string[] ResolveForRights(IEnumerable<string> roleKeys, IEnumerable<UserPermissionOverride> overrides,
        Right rights, DateTimeOffset now, ISet<string>? active = null) =>
        Resolve(roleKeys, rights.HasFlag(Right.Administer)
            ? overrides.Where(o => !string.Equals(o.Effect, "Allow", StringComparison.Ordinal)) : overrides, now, active);

    public static string[] Resolve(IEnumerable<string> roleKeys, IEnumerable<UserPermissionOverride> overrides,
        DateTimeOffset now, ISet<string>? active = null)
    {
        return PermissionHierarchy.Resolve(Assigned(roleKeys, overrides, now), active);
    }

    /// <summary>
    /// Role keys with the global exceptions applied, before prerequisites. Scoped rows take no part: they never make a
    /// permission globally effective and are evaluated per record by <see cref="AuthorizationDecisions"/>.
    /// </summary>
    public static HashSet<string> Assigned(IEnumerable<string> roleKeys, IEnumerable<UserPermissionOverride> overrides, DateTimeOffset now)
    {
        var keys = roleKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var current = overrides.Where(o => o.IsGlobal && (o.ExpiresAt is null || o.ExpiresAt > now)).ToArray();
        foreach (var entry in current.Where(o => string.Equals(o.Effect, "Allow", StringComparison.Ordinal)))
            keys.Add(entry.PermissionKey);
        // Any unknown stored effect fails closed too. Denies precede hierarchy resolution so denying a
        // prerequisite makes all dependent capabilities ineffective, even if directly allowed.
        foreach (var entry in current.Where(o => !string.Equals(o.Effect, "Allow", StringComparison.Ordinal)))
            keys.Remove(entry.PermissionKey);
        return keys;
    }

    /// <summary>The scoped rows that apply to this account. Administrators derive authority only from roles, so scoped allows never apply to them.</summary>
    public static ScopedException[] Scoped(IEnumerable<UserPermissionOverride> overrides, Right rights, ISet<string>? active = null) => overrides
        .Where(o => !o.IsGlobal)
        .Where(o => !string.Equals(o.Effect, "Allow", StringComparison.Ordinal) || (!rights.HasFlag(Right.Administer) && (active is null || active.Contains(o.PermissionKey))))
        .Select(o => new ScopedException(o.PermissionKey, string.Equals(o.Effect, "Allow", StringComparison.Ordinal), o.ClientId, o.ProjectId, o.TeamId, o.ExpiresAt))
        .ToArray();

    /// <summary>
    /// Delegation must consider everything an account could use somewhere. For these checks a scoped allow counts as if it were global and
    /// a scoped deny is ignored; that only ever enlarges the set an administrator must already hold.
    /// </summary>
    private static UserPermissionOverride[] DelegationView(IEnumerable<UserPermissionOverride> overrides) => overrides
        .Where(o => o.IsGlobal || string.Equals(o.Effect, "Allow", StringComparison.Ordinal))
        .Select(o => new UserPermissionOverride { UserId = o.UserId, PermissionKey = o.PermissionKey, Effect = o.Effect, ExpiresAt = o.ExpiresAt })
        .ToArray();

    /// <summary>
    /// The capabilities a role change can enable now or when a temporary exception expires.
    /// Evaluate each expiry boundary: an expiring deny may reveal a direct allow, while an
    /// expiring allow may cease to exist before that deny expires.
    /// </summary>
    public static string[] NewlyEffective(IEnumerable<string> before, IEnumerable<string> after,
        IEnumerable<UserPermissionOverride> overrides, DateTimeOffset now, ISet<string>? active = null)
    {
        var oldKeys = before.ToArray();
        var newKeys = after.ToArray();
        var entries = DelegationView(overrides);
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var at in EvaluationTimes(entries, now))
        {
            var previous = Resolve(oldKeys, entries, at, active).ToHashSet(StringComparer.OrdinalIgnoreCase);
            result.UnionWith(Resolve(newKeys, entries, at, active).Where(key => !previous.Contains(key)));
        }
        return result.Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    /// <summary>Capabilities that can become effective without another access administration change.</summary>
    public static string[] PotentiallyEffective(IEnumerable<string> roleKeys, IEnumerable<UserPermissionOverride> overrides,
        DateTimeOffset now, ISet<string>? active = null)
    {
        var keys = roleKeys.ToArray();
        var entries = DelegationView(overrides);
        return EvaluationTimes(entries, now).SelectMany(at => Resolve(keys, entries, at, active))
            .Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IEnumerable<DateTimeOffset> EvaluationTimes(IEnumerable<UserPermissionOverride> overrides, DateTimeOffset now) =>
        new[] { now }.Concat(overrides.Where(o => o.ExpiresAt > now).Select(o => o.ExpiresAt!.Value).Distinct().Order());
}
