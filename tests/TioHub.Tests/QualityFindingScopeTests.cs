using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class QualityFindingScopeTests
{
    [Fact]
    public void Case_findings_require_the_current_scope_filtered_case()
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(42, "scope-test", "Scope test", "UTC", true, ["Operator"],
            RightsCatalog.AllKeys, false, [], [], [], [], false, [20]));
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, me, TimeProvider.System);

        // Translation is verified without connecting; runtime behavior is covered by the
        // separately approved SQL/API regression test.
        var sql = db.DataQualityItems.AsNoTracking().ToQueryString();
        Assert.Contains("[work].[Case]", sql);
        Assert.Contains("EXISTS", sql);
        Assert.Contains("[ResponsibleTeamId]", sql);
    }
}
