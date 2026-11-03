using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class PasswordResetAuthorizationTests
{
    private static ResolvedUser Snapshot(long id, Right rights, string[] permissions, bool allClients = true, bool allInternal = true,
        string? restriction = null) => new(id, $"user{id}", "User", "UTC", true, ["role"], rights, permissions,
            Grant.Export | Grant.TechnicalDetail | Grant.Audit, allClients, [], [], [], [], allInternal, [], AccessRestriction: restriction);

    private static UserContext Actor(ResolvedUser snapshot)
    {
        var actor = new UserContext();
        actor.Set(snapshot);
        return actor;
    }

    [Fact]
    public void Reset_requires_complete_actor_authority_and_rejects_administrator_targets()
    {
        var all = ResourcePermissions.All;
        var actor = Actor(Snapshot(1, BuiltInRoles.All, all));
        var ordinary = Snapshot(2, Right.None, []);
        AuthEndpoints.EnsurePasswordResetAuthority(actor, ordinary, false, all);
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, ordinary, true, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, Snapshot(2, Right.Administer, []), false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, Snapshot(2, Right.None, [], restriction: "incompatible_roles"), false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(actor, null, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, BuiltInRoles.All, all, allClients: false)), ordinary, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, Right.Administer, all)), ordinary, false, all));
        Assert.Throws<ForbiddenException>(() => AuthEndpoints.EnsurePasswordResetAuthority(Actor(Snapshot(1, BuiltInRoles.All, ["AdminUsers:Maintain"])), ordinary, false, all));
    }
}
