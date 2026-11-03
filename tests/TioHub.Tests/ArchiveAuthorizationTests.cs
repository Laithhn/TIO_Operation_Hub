using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class ArchiveAuthorizationTests
{
    private static UserContext UserWithout(string permission)
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(7, "test", "Test", "UTC", true, ["Custom"], Right.None,
            ResourcePermissions.All.Where(p => p != permission).ToArray(), Grant.None,
            true, [], [], [], [], true, []));
        return user;
    }

    [Fact]
    public async Task Archive_filter_enforces_resource_and_client_section_permissions_before_handler()
    {
        var structure = PermissionHierarchy.Tab(ResourcePermissions.Structure, "structure", "View");
        var contacts = PermissionHierarchy.Tab(ResourcePermissions.Structure, "contacts", "View");
        var cases = new[]
        {
            (Query: "?recordType=Contract", Missing: "Contracts:View"),
            (Query: "", Missing: "Contracts:View"),
            (Query: "?recordType=Client", Missing: structure),
            (Query: "?recordType=Region", Missing: structure),
            (Query: "?recordType=Contact", Missing: contacts),
            (Query: "", Missing: contacts)
        };
        foreach (var (query, missing) in cases)
        {
            var services = new ServiceCollection().AddLogging().AddSingleton(UserWithout(missing)).BuildServiceProvider();
            var http = new DefaultHttpContext { RequestServices = services };
            http.Request.Method = "GET";
            http.Request.Path = "/api/v1/admin/archived";
            http.Request.QueryString = new QueryString(query);
            var invoked = false;
            await Assert.ThrowsAsync<ForbiddenException>(async () => await new CapabilityPermissionFilter().InvokeAsync(
                new DefaultEndpointFilterInvocationContext(http), _ =>
                {
                    invoked = true;
                    return ValueTask.FromResult<object?>(Results.Ok());
                }));
            Assert.False(invoked);
        }
    }
}
