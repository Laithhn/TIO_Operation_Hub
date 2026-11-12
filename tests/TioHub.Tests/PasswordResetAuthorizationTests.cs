using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class PasswordResetAuthorizationTests
{
    private static ResolvedUser Snapshot(long id, string[] rights, bool allClients = true, bool allInternal = true,
        string? restriction = null) => new(id, $"user{id}", "User", "UTC", true, ["role"], rights,
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
}
