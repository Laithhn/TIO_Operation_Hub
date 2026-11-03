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
        var role = ResourcePermissions.All;
        var parent = PermissionHierarchy.Ancestors(Action)[0];
        var exceptions = new[] { Entry(parent, "Deny"), Entry(Action, "Allow"), Entry(Action, "Deny") };
        var effective = PermissionOverrides.Resolve(role, exceptions, Now);
        Assert.DoesNotContain(parent, effective);
        Assert.DoesNotContain(Action, effective);
    }

    [Fact]
    public void Direct_allow_requires_prerequisites_and_active_registration()
    {
        var role = ResourcePermissions.All.Where(k => k != Action).ToArray();
        Assert.Contains(Action, PermissionOverrides.Resolve(role, [Entry(Action, "Allow")], Now));
        Assert.DoesNotContain(Action, PermissionOverrides.Resolve([], [Entry(Action, "Allow")], Now));
        var active = role.ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain(Action, PermissionOverrides.Resolve(role, [Entry(Action, "Allow")], Now, active));
    }

    [Fact]
    public void Expiry_is_strict_and_unknown_effect_fails_closed()
    {
        var role = ResourcePermissions.All;
        Assert.DoesNotContain(Action, PermissionOverrides.Resolve(role, [Entry(Action, "Deny", Now.AddTicks(1))], Now));
        Assert.Contains(Action, PermissionOverrides.Resolve(role, [Entry(Action, "Deny", Now)], Now));
        Assert.DoesNotContain(Action, PermissionOverrides.Resolve(role, [Entry(Action, "unexpected")], Now));
        Assert.DoesNotContain(Action, PermissionOverrides.Resolve(role.Where(k => k != Action), [Entry(Action, "Allow", Now)], Now));
    }

    [Fact]
    public void Denied_action_is_not_reintroduced_by_user_context_or_legacy_rights()
    {
        var permissions = PermissionOverrides.Resolve(ResourcePermissions.All, [Entry(Action, "Deny")], Now);
        var context = new UserContext();
        context.Set(new ResolvedUser(1, "account", "User", "UTC", true, ["Role"], BuiltInRoles.All,
            permissions, Grant.Export | Grant.TechnicalDetail | Grant.Audit, true, [], [], [], [], true, []));
        Assert.DoesNotContain(Action, context.PermissionKeys);
        Assert.False(context.HasPermission(Action));
        Assert.Throws<ForbiddenException>(() => context.RequirePermission(Action));
    }

    [Fact]
    public void Role_assignment_detects_direct_allow_enabled_by_a_new_parent()
    {
        var before = ResourcePermissions.All.Except(["module.cases:Access", "Cases:Delete"]);
        var after = before.Append("module.cases:Access");
        var direct = new[] { Entry("Cases:Delete", "Allow") };
        Assert.Contains("Cases:Delete", PermissionOverrides.NewlyEffective(before, after, direct, Now));
        Assert.Contains("Cases:Delete", PermissionOverrides.PotentiallyEffective(after, direct, Now));
    }

    [Fact]
    public void Delegation_applies_denies_at_each_expiry_boundary()
    {
        var before = ResourcePermissions.All.Except(["module.cases:Access", "Cases:Delete"]);
        var after = before.Append("module.cases:Access");
        var allow = Entry("Cases:Delete", "Allow", Now.AddHours(2));
        var permanentDeny = Entry("Cases:View", "Deny");
        var shortDeny = Entry("Cases:View", "Deny", Now.AddHours(1));
        var longDeny = Entry("Cases:View", "Deny", Now.AddHours(3));
        Assert.DoesNotContain("Cases:Delete", PermissionOverrides.NewlyEffective(before, after, [allow, permanentDeny], Now));
        Assert.Contains("Cases:Delete", PermissionOverrides.NewlyEffective(before, after, [allow, shortDeny], Now));
        Assert.DoesNotContain("Cases:Delete", PermissionOverrides.NewlyEffective(before, after, [allow, longDeny], Now));
        Assert.Contains("Cases:Delete", PermissionOverrides.PotentiallyEffective(after, [allow, shortDeny], Now));
        Assert.DoesNotContain("Cases:Delete", PermissionOverrides.PotentiallyEffective(after, [allow, longDeny], Now));
    }

    [Fact]
    public void Administrator_ignores_direct_allows_but_still_obeys_denies_and_expiry()
    {
        var role = ResourcePermissions.All.Where(key => key != "Cases:Delete").ToArray();
        var directAllow = Entry("Cases:Delete", "Allow", Now.AddHours(2));
        var directDeny = Entry("Cases:View", "Deny", Now.AddHours(1));
        var entries = new[] { directAllow, directDeny };
        Assert.DoesNotContain("Cases:View", PermissionOverrides.ResolveForRights(role, entries, Right.Administer, Now));
        Assert.DoesNotContain("Cases:Delete", PermissionOverrides.ResolveForRights(role, entries, Right.Administer, Now));
        var afterDenyExpires = PermissionOverrides.ResolveForRights(role, entries, Right.Administer | Right.Audit, Now.AddHours(1));
        Assert.Contains("Cases:View", afterDenyExpires);
        Assert.DoesNotContain("Cases:Delete", afterDenyExpires);
        Assert.Contains("Cases:Delete", PermissionOverrides.ResolveForRights(role, entries, Right.None, Now.AddHours(1)));
        Assert.DoesNotContain("Cases:Delete", PermissionOverrides.ResolveForRights(role, entries, Right.None, Now.AddHours(2)));
    }

    private static UserPermissionOverride Entry(string key, string effect, DateTimeOffset? expires = null) =>
        new() { UserId = 1, PermissionKey = key, Effect = effect, ExpiresAt = expires };
}
