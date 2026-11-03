using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class JiraReuseAuthorizationTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Every_jira_link_requires_a_reason(string? reason)
    {
        var check = new Check();
        CaseEndpoints.CheckJiraLinkReason(check, reason);
        Assert.True(check.Has("reuseReason"));
    }

    [Fact]
    public void A_valid_reason_does_not_depend_on_hidden_reuse()
    {
        var check = new Check();
        CaseEndpoints.CheckJiraLinkReason(check, "Track the customer issue");
        Assert.False(check.Has("reuseReason"));
    }

    [Fact]
    public void Jira_matches_are_selected_from_scope_filtered_cases()
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(42, "scope-test", "Scope test", "UTC", true, ["Operator"], Right.None,
            PermissionHierarchy.WithAncestors(["Cases:View"]), Grant.None, false, [10], [20], [30], [40], false, [50]));
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, me, TimeProvider.System);
        var sql = CaseEndpoints.VisibleJiraMatches(db, 1, "ABC-123", null).ToQueryString();
        Assert.Contains("JiraReference", sql);
        Assert.Contains("CaseEnvironment", sql);
        Assert.Contains("NOT EXISTS", sql);
    }
}
