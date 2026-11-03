using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Firewall;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class FirewallScopeTests
{
    [Fact]
    public void Firewall_query_requires_both_endpoints_and_compiles_with_sql_server()
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(7, "test", "Test", "UTC", true, ["Operator"], Right.None,
            PermissionHierarchy.WithAncestors(["OtherOperations:View"]), Grant.TechnicalDetail,
            false, [], [20], [10], [40], false, []));
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, user, TimeProvider.System);
        var sql = FirewallEndpoints.VisibleRules(db).ToQueryString();
        Assert.True(sql.Split("EXISTS", StringSplitOptions.None).Length - 1 >= 2);
        Assert.Contains("SourceAssetId", sql);
        Assert.Contains("DestinationAssetId", sql);
        Assert.Contains("EnvironmentId", sql);
        Assert.Contains("ClientId", sql);
    }
}
