using TioHub.Api.Common;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class DeletionScopeTests
{
    private static UserContext User(bool active, bool allClients, long[] clientIds, long[] projectClients, bool allInternal = false)
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(7, "test", "Test", "UTC", active, ["Custom"], Right.None, [], Grant.None,
            allClients, clientIds, [20], projectClients, [30], allInternal, []));
        return user;
    }

    [Fact]
    public void Project_summary_visibility_does_not_authorize_deleting_client_wide_records()
    {
        var projectOnly = User(true, false, [], [10]);
        Assert.True(projectOnly.SeesClient(10));
        Assert.Throws<NotFoundException>(() => Deletion.RequireWholeClientScope(projectOnly, 10));
        Assert.Throws<NotFoundException>(() => Deletion.RequireWholeClientScope(projectOnly, 11));
    }

    [Fact]
    public void Whole_client_scope_is_required_and_deactivated_users_are_denied()
    {
        Deletion.RequireWholeClientScope(User(true, false, [10], []), 10);
        Deletion.RequireWholeClientScope(User(true, true, [], []), 10);
        Deletion.RequireWholeClientScope(new UserContext(), 10); // Trusted system context.
        Assert.Throws<NotFoundException>(() => Deletion.RequireWholeClientScope(User(false, true, [10], []), 10));
    }

    [Fact]
    public void Cascade_needs_full_scope_over_every_affected_client_and_team()
    {
        static Cascade.Footprint Touching(long[] clients, long[] teams, bool unscoped = false) => new(clients.ToHashSet(), teams.ToHashSet(), unscoped);
        // Delegated: all rows in the caller's own client succeed without global scope.
        Cascade.RequireFootprintInScope(User(true, false, [10], []), Touching([10], []));
        // One unlinked row in another client stops everything, with the same answer as a missing record.
        Assert.Throws<NotFoundException>(() => Cascade.RequireFootprintInScope(User(true, false, [10], []), Touching([10, 11], [])));
        // A project grant never authorizes changes to a client's records.
        Assert.Throws<NotFoundException>(() => Cascade.RequireFootprintInScope(User(true, false, [], [10]), Touching([10], [])));
        Assert.Throws<NotFoundException>(() => Cascade.RequireFootprintInScope(User(true, true, [], []), Touching([10], [5])));
        // An internal row without a team needs all-internal scope.
        Assert.Throws<NotFoundException>(() => Cascade.RequireFootprintInScope(User(true, true, [], []), Touching([], [], unscoped: true)));
        Cascade.RequireFootprintInScope(User(true, true, [], [], true), Touching([10], [5], unscoped: true));
        Assert.Throws<NotFoundException>(() => Cascade.RequireFootprintInScope(User(false, true, [], [], true), Touching([10], [])));
        Cascade.RequireFootprintInScope(new UserContext(), Touching([10], [5], unscoped: true));
    }

    [Fact]
    public void Archived_client_details_only_include_full_client_scope()
    {
        var clients = new[] { new Client { Id = 10 }, new Client { Id = 11 } }.AsQueryable();
        var projectOnly = User(true, false, [], [10]);
        Assert.True(projectOnly.SeesClient(10));
        Assert.Empty(AdminEndpoints.ClientsWithFullScope(clients, projectOnly));
        Assert.Equal(new long[] { 11 }, AdminEndpoints.ClientsWithFullScope(clients, User(true, false, [11], [10])).Select(c => c.Id));
        Assert.Equal(new long[] { 10, 11 }, AdminEndpoints.ClientsWithFullScope(clients, User(true, true, [], [])).Select(c => c.Id));
        Assert.Empty(AdminEndpoints.ClientsWithFullScope(clients, User(false, true, [10], [10])));
    }
}
