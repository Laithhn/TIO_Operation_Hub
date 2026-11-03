using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Routing and authorization must interpret URL casing identically; no database or server is used.</summary>
public sealed class AuthorizationPathCasingTests
{
    [Theory]
    [InlineData("cases/1/jira/2/remove", "POST", null)]
    [InlineData("admin/roles/1", "PUT", null)]
    [InlineData("admin/archived/Region/1", "POST", null)]
    [InlineData("clients/1/overview", "GET", "organizations")]
    [InlineData("reporting/exports/1/download", "GET", null)]
    [InlineData("notes/files/1", "GET", null)]
    public void Route_policy_is_independent_of_path_and_tab_casing(string path, string method, string? tab)
    {
        var expected = HierarchyEndpointPermissions.Required(path, method, tab);
        Assert.NotEmpty(expected);
        Assert.Equal(expected, HierarchyEndpointPermissions.Required(path.ToUpperInvariant(), method, tab?.ToUpperInvariant()));
    }

    [Theory]
    [InlineData("clients/1/contacts")]
    [InlineData("reporting/report-types")]
    [InlineData("environments/1/microservice-options")]
    public void Read_policy_is_independent_of_path_casing(string path) =>
        Assert.Equal(CapabilityPermissions.ReadResources(path), CapabilityPermissions.ReadResources(path.ToUpperInvariant()));

    [Fact]
    public async Task Alternate_case_cannot_skip_jira_section_permission()
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(10, "test", "Test", "UTC", true, ["Custom"], Right.None,
            PermissionHierarchy.WithAncestors(["Cases:View", "Cases:Maintain"]), Grant.None,
            true, [], [], [], [], true, []));
        var services = new ServiceCollection().AddLogging().AddSingleton(me).BuildServiceProvider();
        var http = new DefaultHttpContext { RequestServices = services };
        http.Request.Path = "/api/v1/CASES/1/JIRA";
        http.Request.Method = "POST";
        var invoked = false;
        await Assert.ThrowsAsync<ForbiddenException>(async () => await new CapabilityPermissionFilter().InvokeAsync(
            new DefaultEndpointFilterInvocationContext(http), _ => { invoked = true; return ValueTask.FromResult<object?>(Results.Ok()); }));
        Assert.False(invoked);
    }
}
