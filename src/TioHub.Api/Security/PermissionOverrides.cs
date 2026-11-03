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
        var keys = roleKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var current = overrides.Where(o => o.ExpiresAt is null || o.ExpiresAt > now).ToArray();
        foreach (var entry in current.Where(o => string.Equals(o.Effect, "Allow", StringComparison.Ordinal)))
            keys.Add(entry.PermissionKey);
        // Any unknown stored effect fails closed too. Denies precede hierarchy resolution so denying a
        // prerequisite makes all dependent capabilities ineffective, even if directly allowed.
        foreach (var entry in current.Where(o => !string.Equals(o.Effect, "Allow", StringComparison.Ordinal)))
            keys.Remove(entry.PermissionKey);
        return PermissionHierarchy.Resolve(keys, active);
    }

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
        var entries = overrides.ToArray();
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
        var entries = overrides.ToArray();
        return EvaluationTimes(entries, now).SelectMany(at => Resolve(keys, entries, at, active))
            .Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IEnumerable<DateTimeOffset> EvaluationTimes(IEnumerable<UserPermissionOverride> overrides, DateTimeOffset now) =>
        new[] { now }.Concat(overrides.Where(o => o.ExpiresAt > now).Select(o => o.ExpiresAt!.Value).Distinct().Order());
}
