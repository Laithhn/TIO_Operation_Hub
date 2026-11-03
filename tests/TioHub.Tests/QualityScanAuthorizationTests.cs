using TioHub.Api.Common;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class QualityScanAuthorizationTests
{
    private static UserContext User(bool allClients, bool allInternal, bool maintain = true)
    {
        var me = new UserContext();
        var action = maintain ? ResourcePermissions.Maintain : ResourcePermissions.View;
        var permissions = PermissionHierarchy.WithAncestors([ResourcePermissions.KeyOf(ResourcePermissions.Other, ResourcePermissions.View), ResourcePermissions.KeyOf(ResourcePermissions.Other, action)]);
        me.Set(new ResolvedUser(1, "test", "Test", "UTC", true, ["Operator"], Right.None, permissions, Grant.None,
            allClients, [10], [20], [10], [30], allInternal, [40]));
        return me;
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public void Global_scan_rejects_partial_scope(bool clients, bool teams) =>
        Assert.Throws<ForbiddenException>(() => QualityEndpoints.RequireGlobalScanAccess(User(clients, teams)));

    [Fact]
    public void Global_scan_requires_both_global_scopes_and_maintain_permission()
    {
        QualityEndpoints.RequireGlobalScanAccess(User(true, true));
        Assert.Throws<ForbiddenException>(() => QualityEndpoints.RequireGlobalScanAccess(User(true, true, maintain: false)));
    }
}
