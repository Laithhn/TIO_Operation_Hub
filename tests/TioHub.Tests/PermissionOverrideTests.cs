using TioHub.Api.Modules.Access;
using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class PermissionOverrideTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-02T12:00:00Z");
    private const string Action = "Cases:Maintain";

    [Fact]
    public void Deny_overrides_role_and_allow_and_cascades_through_dependencies()
    {
        var role = RightsCatalog.AllKeys;
        var parent = RightsCatalog.Find(Action)!.Requires[0];
        var exceptions = new[] { Entry(parent, "Deny"), Entry(Action, "Allow"), Entry(Action, "Deny") };
        var effective = RightExceptions.Resolve(role, exceptions, Now);
        Assert.DoesNotContain(parent, effective);
        Assert.DoesNotContain(Action, effective);
    }

    [Fact]
    public void Direct_allow_requires_prerequisites_and_active_registration()
    {
        var role = RightsCatalog.AllKeys.Where(k => k != Action).ToArray();
        Assert.Contains(Action, RightExceptions.Resolve(role, [Entry(Action, "Allow")], Now));
        Assert.DoesNotContain(Action, RightExceptions.Resolve([], [Entry(Action, "Allow")], Now));
        var active = role.ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain(Action, RightExceptions.Resolve(role, [Entry(Action, "Allow")], Now, active));
    }

    [Fact]
    public void Expiry_is_strict_and_unknown_effect_fails_closed()
    {
        var role = RightsCatalog.AllKeys;
        Assert.DoesNotContain(Action, RightExceptions.Resolve(role, [Entry(Action, "Deny", Now.AddTicks(1))], Now));
        Assert.Contains(Action, RightExceptions.Resolve(role, [Entry(Action, "Deny", Now)], Now));
        Assert.DoesNotContain(Action, RightExceptions.Resolve(role, [Entry(Action, "unexpected")], Now));
        Assert.DoesNotContain(Action, RightExceptions.Resolve(role.Where(k => k != Action), [Entry(Action, "Allow", Now)], Now));
    }

    [Fact]
    public void Denied_action_is_not_reintroduced_by_user_context_or_legacy_rights()
    {
        var permissions = RightExceptions.Resolve(RightsCatalog.AllKeys, [Entry(Action, "Deny")], Now);
        var context = new UserContext();
        context.Set(new ResolvedUser(1, "account", "User", "UTC", true, ["Role"], permissions, true, [], [], [], [], true, []));
        Assert.DoesNotContain(Action, context.EffectiveRights);
        Assert.False(context.HasRight(Action));
        Assert.Throws<ForbiddenException>(() => context.RequireRight(Action));
    }

    [Fact]
    public void Role_assignment_detects_direct_allow_enabled_by_a_new_parent()
    {
        var before = RightsCatalog.AllKeys.Except(["Cases:View", "Cases:Delete"]);
        var after = before.Append("Cases:View");
        var direct = new[] { Entry("Cases:Delete", "Allow") };
        Assert.Contains("Cases:Delete", RightExceptions.NewlyEffective(before, after, direct, Now));
        Assert.Contains("Cases:Delete", RightExceptions.PotentiallyEffective(after, direct, Now));
    }

    [Fact]
    public void Delegation_applies_denies_at_each_expiry_boundary()
    {
        var before = RightsCatalog.AllKeys.Except(["Cases:View", "Cases:Delete"]);
        var after = before.Append("Cases:View");
        var allow = Entry("Cases:Delete", "Allow", Now.AddHours(2));
        var permanentDeny = Entry("Cases:View", "Deny");
        var shortDeny = Entry("Cases:View", "Deny", Now.AddHours(1));
        var longDeny = Entry("Cases:View", "Deny", Now.AddHours(3));
        Assert.DoesNotContain("Cases:Delete", RightExceptions.NewlyEffective(before, after, [allow, permanentDeny], Now));
        Assert.Contains("Cases:Delete", RightExceptions.NewlyEffective(before, after, [allow, shortDeny], Now));
        Assert.DoesNotContain("Cases:Delete", RightExceptions.NewlyEffective(before, after, [allow, longDeny], Now));
        Assert.Contains("Cases:Delete", RightExceptions.PotentiallyEffective(after, [allow, shortDeny], Now));
        Assert.DoesNotContain("Cases:Delete", RightExceptions.PotentiallyEffective(after, [allow, longDeny], Now));
    }

    [Fact]
    public void Administrator_ignores_direct_allows_but_still_obeys_denies_and_expiry()
    {
        var role = RightsCatalog.AllKeys.Where(key => key != "Cases:Delete").ToArray();
        var directAllow = Entry("Cases:Delete", "Allow", Now.AddHours(2));
        var directDeny = Entry("Cases:View", "Deny", Now.AddHours(1));
        var entries = new[] { directAllow, directDeny };
        Assert.DoesNotContain("Cases:View", RightExceptions.ResolveForRoles([.. role, RightKeys.Administration], entries, Now));
        Assert.DoesNotContain("Cases:Delete", RightExceptions.ResolveForRoles([.. role, RightKeys.Administration], entries, Now));
        var afterDenyExpires = RightExceptions.ResolveForRoles([.. role, RightKeys.Administration], entries, Now.AddHours(1));
        Assert.Contains("Cases:View", afterDenyExpires);
        Assert.DoesNotContain("Cases:Delete", afterDenyExpires);
        Assert.Contains("Cases:Delete", RightExceptions.Resolve(role, entries, Now.AddHours(1)));
        Assert.DoesNotContain("Cases:Delete", RightExceptions.Resolve(role, entries, Now.AddHours(2)));
    }

    private static UserRightException Entry(string key, string effect, DateTimeOffset? expires = null) =>
        new() { UserId = 1, RightKey = key, Effect = effect, ExpiresAt = expires };
}
