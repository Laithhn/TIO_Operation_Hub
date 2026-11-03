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
    public void Unfiltered_cascade_preview_and_mutation_require_global_scope()
    {
        Assert.Throws<NotFoundException>(() => Cascade.RequireGlobalScope(User(true, false, [10], [], true)));
        Assert.Throws<NotFoundException>(() => Cascade.RequireGlobalScope(User(true, true, [], [], false)));
        Assert.Throws<NotFoundException>(() => Cascade.RequireGlobalScope(User(false, true, [], [], true)));
        Cascade.RequireGlobalScope(User(true, true, [], [], true));
        Cascade.RequireGlobalScope(new UserContext());
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
