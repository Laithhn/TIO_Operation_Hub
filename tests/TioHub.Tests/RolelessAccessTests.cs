using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Attachments;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class RolelessAccessTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-11-02T12:00:00Z");

    private static ResolvedUser Snapshot(string[] permissions, bool active = true) => new(
        42, "direct-user", "Direct user", "UTC", active, [], permissions,
        false, [10], [], [], [], false, [20]);

    private static UserRightException[] Grants(string key, DateTimeOffset? expires = null) =>
        Fixture.Rights([key]).Select(k => new UserRightException
        {
            UserId = 42, RightKey = k, Effect = "Allow", ExpiresAt = expires
        }).ToArray();

    [Fact]
    public void Direct_grants_allow_roleless_access_but_keep_scope_and_administrator_boundaries()
    {
        var permissions = RightExceptions.Resolve([], Grants("Cases:View"), Now);
        var resolved = Snapshot(permissions);
        var me = new UserContext();
        me.Set(resolved);

        Assert.True(resolved.HasAccess);
        Assert.True(me.HasRight("Cases:View"));
        Assert.False(me.HasRight("Cases:Maintain"));
        Assert.True(me.HasClient(10));
        Assert.False(me.HasClient(11));
        Assert.True(me.SeesInternal(20));
        Assert.False(me.SeesInternal(21));
        Assert.False(me.IsAdministrator);
        Assert.False(me.HasRight(RightKeys.PlatformExport));
        Assert.Throws<ForbiddenException>(me.RequireAdministrator);
    }

    [Fact]
    public void Expired_denied_inactive_and_unregistered_grants_cannot_admit_a_roleless_user()
    {
        var expiring = Grants("Cases:View", Now.AddMinutes(5));
        Assert.True(Snapshot(RightExceptions.Resolve([], expiring, Now)).HasAccess);
        Assert.False(Snapshot(RightExceptions.Resolve([], expiring, Now.AddMinutes(5))).HasAccess);

        var denied = new UserRightException { UserId = 42, RightKey = "Cases:View", Effect = "Deny" };
        Assert.False(Snapshot(RightExceptions.Resolve([], expiring.Append(denied), Now)).HasAccess);
        Assert.False(Snapshot(RightExceptions.Resolve([], Grants("Cases:View"), Now, new HashSet<string>())).HasAccess);
        Assert.False(Snapshot(RightExceptions.Resolve([], Grants("Cases:View"), Now), active: false).HasAccess);

        var deactivated = new UserContext();
        deactivated.Set(Snapshot(RightExceptions.Resolve([], Grants("Cases:View"), Now), active: false));
        Assert.False(deactivated.HasRight("Cases:View"));
        Assert.False(deactivated.HasClient(10));

        var me = new UserContext();
        me.Set(Snapshot([], active: true));
        Assert.False(me.HasAccess);
        Assert.False(me.HasClient(10));
        Assert.False(me.SeesInternal(20));
    }

    [Fact]
    public void Team_queries_use_the_same_internal_scope_for_roleless_users()
    {
        var teams = new[] { new Team { Id = 20 }, new Team { Id = 21 } }.AsQueryable();
        var me = new UserContext();
        me.Set(Snapshot(RightExceptions.Resolve([], Grants("Teams:View"), Now)));
        Assert.Equal([20L], TeamEndpoints.VisibleTeams(teams, me).Select(t => t.Id));
        Assert.True(AttachmentEndpoints.CanReadTarget(me, new("Team", 20, null, 20, "in scope")));
        Assert.False(AttachmentEndpoints.CanReadTarget(me, new("Team", 21, null, 21, "out of scope")));

        var noAccess = new UserContext();
        noAccess.Set(Snapshot([], active: true));
        Assert.Empty(TeamEndpoints.VisibleTeams(teams, noAccess));

        var allTeams = new UserContext();
        allTeams.Set(Snapshot(RightExceptions.Resolve([], Grants("Teams:View"), Now)) with { AllInternal = true });
        Assert.Equal([20L, 21L], TeamEndpoints.VisibleTeams(teams, allTeams).Select(t => t.Id));
    }

    [Fact]
    public void Team_scope_query_translates_to_sql()
    {
        var me = new UserContext();
        me.Set(Snapshot(RightExceptions.Resolve([], Grants("Teams:View"), Now)));
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, me, TimeProvider.System);
        var sql = TeamEndpoints.VisibleTeams(db.Teams, me).ToQueryString();
        Assert.Contains("WHERE", sql);
        Assert.Contains("[Id]", sql);
    }
}
