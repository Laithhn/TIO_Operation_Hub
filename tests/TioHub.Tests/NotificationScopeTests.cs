using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Notifications;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class NotificationScopeTests
{
    [Fact]
    public void Notification_query_requires_visible_source_records_and_current_report_access()
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(42, "account", "User", "UTC", true, ["role"],
            RightsCatalog.AllKeys,
            false, [10], [], [], [], false, [20]));
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, me, TimeProvider.System);
        var sql = NotificationEndpoints.VisibleNotifications(db, me).ToQueryString();
        Assert.Contains("EXISTS", sql);
        Assert.Contains("[work].[Case]", sql);
        Assert.Contains("[contracts].[Contract]", sql);
        Assert.Contains("[reporting].[ExportJob]", sql);
        Assert.Contains("[AccessFingerprint]", sql);
        Assert.Contains("[Source]", sql);
        Assert.Contains("[Status]", sql);
        Assert.Contains("[ClientId]", sql);
    }
}
