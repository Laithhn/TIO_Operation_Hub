using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>Applies individual exceptions before prerequisites are enforced. Denies always win.</summary>
public static class RightExceptions
{
    public static bool IsAllow(UserRightException exception) => string.Equals(exception.Effect, "Allow", StringComparison.Ordinal);

    /// <summary>Whether a set of role rights makes the account an administrator, before any exception is considered.</summary>
    public static bool MakesAdministrator(IEnumerable<string> roleKeys) => roleKeys.Contains(RightKeys.Administration, StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Administrators derive authority only from roles: a direct allow must never become a temporary ceiling from which an administrator
    /// can delegate permanent access. Direct denies remain mandatory and can still expire normally.
    /// </summary>
    public static string[] ResolveForRoles(IEnumerable<string> roleKeys, IEnumerable<UserRightException> exceptions, DateTimeOffset now, ISet<string>? active = null)
    {
        var keys = roleKeys.ToArray();
        return Resolve(keys, MakesAdministrator(keys) ? exceptions.Where(o => !IsAllow(o)) : exceptions, now, active);
    }

    public static string[] Resolve(IEnumerable<string> roleKeys, IEnumerable<UserRightException> exceptions, DateTimeOffset now, ISet<string>? active = null) =>
        RightsCatalog.Resolve(Assigned(roleKeys, exceptions, now), active);

    /// <summary>
    /// Role keys with the global exceptions applied, before prerequisites. Scoped rows take no part: they never make a
    /// right globally effective and are evaluated per record by <see cref="AuthorizationDecisions"/>.
    /// </summary>
    public static HashSet<string> Assigned(IEnumerable<string> roleKeys, IEnumerable<UserRightException> exceptions, DateTimeOffset now)
    {
        var keys = roleKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var current = exceptions.Where(o => o.IsGlobal && (o.ExpiresAt is null || o.ExpiresAt > now)).ToArray();
        foreach (var entry in current.Where(IsAllow))
            keys.Add(entry.RightKey);
        // Any unknown stored effect fails closed too. Denies precede resolution so denying a prerequisite disables its dependents, even if directly allowed.
        foreach (var entry in current.Where(o => !IsAllow(o)))
            keys.Remove(entry.RightKey);
        return keys;
    }

    /// <summary>The scoped rows that apply to this account. Administrators derive authority only from roles, so scoped allows never apply to them.</summary>
    public static ScopedException[] Scoped(IEnumerable<UserRightException> exceptions, bool isAdministrator, ISet<string>? active = null) => exceptions
        .Where(o => !o.IsGlobal)
        .Where(o => !IsAllow(o) || (!isAdministrator && (active is null || active.Contains(o.RightKey))))
        .Select(o => new ScopedException(o.RightKey, IsAllow(o), o.ClientId, o.ProjectId, o.TeamId, o.ExpiresAt))
        .ToArray();

    /// <summary>
    /// Delegation must consider everything an account could use somewhere. For these checks a scoped allow counts as if it were global and
    /// a scoped deny is ignored; that only ever enlarges the set an administrator must already hold.
    /// </summary>
    private static UserRightException[] DelegationView(IEnumerable<UserRightException> exceptions) => exceptions
        .Where(o => o.IsGlobal || IsAllow(o))
        .Select(o => new UserRightException { UserId = o.UserId, RightKey = o.RightKey, Effect = o.Effect, ExpiresAt = o.ExpiresAt })
        .ToArray();

    /// <summary>
    /// The rights a role change can enable now or when a temporary exception expires. Evaluate each expiry boundary: an expiring deny
    /// may reveal a direct allow, while an expiring allow may cease to exist before that deny expires.
    /// </summary>
    public static string[] NewlyEffective(IEnumerable<string> before, IEnumerable<string> after,
        IEnumerable<UserRightException> exceptions, DateTimeOffset now, ISet<string>? active = null)
    {
        var oldKeys = before.ToArray();
        var newKeys = after.ToArray();
        var entries = DelegationView(exceptions);
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var at in EvaluationTimes(entries, now))
        {
            var previous = Resolve(oldKeys, entries, at, active).ToHashSet(StringComparer.OrdinalIgnoreCase);
            result.UnionWith(Resolve(newKeys, entries, at, active).Where(key => !previous.Contains(key)));
        }
        return result.Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    /// <summary>Rights that can become effective without another access administration change.</summary>
    public static string[] PotentiallyEffective(IEnumerable<string> roleKeys, IEnumerable<UserRightException> exceptions,
        DateTimeOffset now, ISet<string>? active = null)
    {
        var keys = roleKeys.ToArray();
        var entries = DelegationView(exceptions);
        return EvaluationTimes(entries, now).SelectMany(at => Resolve(keys, entries, at, active))
            .Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    private static IEnumerable<DateTimeOffset> EvaluationTimes(IEnumerable<UserRightException> exceptions, DateTimeOffset now) =>
        new[] { now }.Concat(exceptions.Where(o => o.ExpiresAt > now).Select(o => o.ExpiresAt!.Value).Distinct().Order());
}
