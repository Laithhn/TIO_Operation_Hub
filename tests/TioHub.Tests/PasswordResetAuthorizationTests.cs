using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class PasswordResetAuthorizationTests
{
    private static ResolvedUser Snapshot(long id, string[] rights, bool allClients = true, bool allInternal = true,
        string? restriction = null, string? account = null, string[]? roles = null) => new(id, account ?? $"user{id}", "User", "UTC", true, roles ?? ["role"], rights,
            allClients, [], [], [], [], allInternal, [], AccessRestriction: restriction);

    private static UserContext Actor(ResolvedUser snapshot)
    {
        var actor = new UserContext();
        actor.Set(snapshot);
        return actor;
    }

    [Fact]
    public void Reset_requires_complete_actor_authority_and_rejects_administrator_targets()
    {
        var all = RightsCatalog.AllKeys;
        var actor = Actor(Snapshot(1, all));
        var ordinary = Snapshot(2, []);
        AuthEndpoints.EnsurePasswordResetAuthority(actor, ordinary, false, all);
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, ordinary, true, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, Snapshot(2, [RightKeys.Administration]), false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, Snapshot(2, [], restriction: "incompatible_roles"), false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, null, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, all, allClients: false)), ordinary, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, all.Except(["AdminUsers:Maintain"]).ToArray())), ordinary, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, [RightKeys.Administration, "AdminUsers:View", "AdminUsers:Maintain"])), ordinary, false, all));
    }

    [Fact]
    public void System_administrators_may_reset_administrators()
    {
        var all = RightsCatalog.AllKeys;
        // A holder of the built-in System Administrator role (e.g. the reserved owner TioAdmin).
        var sysadmin = Actor(Snapshot(1, all, roles: [RoleAccess.SystemAdministratorName]));
        var adminByRole = Snapshot(2, [], restriction: null);
        var adminByRight = Snapshot(3, [RightKeys.Administration]);
        // A System Administrator may reset an administrator both ways the guard detects one, and ordinary accounts too.
        AuthEndpoints.EnsurePasswordResetAuthority(sysadmin, adminByRole, assignedAdministrator: true, all);
        AuthEndpoints.EnsurePasswordResetAuthority(sysadmin, adminByRight, assignedAdministrator: false, all);
        AuthEndpoints.EnsurePasswordResetAuthority(sysadmin, Snapshot(4, []), assignedAdministrator: false, all);
        // An administrator who holds every right but NOT the System Administrator role stays barred from administrators.
        var otherAdmin = Actor(Snapshot(1, all, roles: ["Operations Lead"]));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(otherAdmin, adminByRight, assignedAdministrator: false, all));
        // A System Administrator is still blocked when the target's access cannot be evaluated safely.
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(sysadmin, Snapshot(5, [], restriction: "incompatible_roles"), assignedAdministrator: false, all));
    }
}
