using TioHub.Api.Common;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class ClientDuplicateAuthorizationTests
{
    private static UserContext User(bool allClients, bool create)
    {
        var me = new UserContext();
        var action = create ? ResourcePermissions.Create : ResourcePermissions.View;
        var permissions = PermissionHierarchy.WithAncestors([ResourcePermissions.KeyOf(ResourcePermissions.Structure, ResourcePermissions.View), ResourcePermissions.KeyOf(ResourcePermissions.Structure, action)]);
        me.Set(new ResolvedUser(1, "test", "Test", "UTC", true, ["Operator"], Right.None, permissions, Grant.None,
            allClients, [10], [20], [10], [30], false, []));
        return me;
    }

    [Fact]
    public void Duplicate_search_requires_client_creation_and_global_client_scope()
    {
        ClientEndpoints.RequireDuplicateLookupAccess(User(true, create: true));
        Assert.Throws<ForbiddenException>(() => ClientEndpoints.RequireDuplicateLookupAccess(User(false, create: true)));
        Assert.Throws<ForbiddenException>(() => ClientEndpoints.RequireDuplicateLookupAccess(User(true, create: false)));
    }
}
