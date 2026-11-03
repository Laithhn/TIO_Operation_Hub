using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Security;

/// <summary>Serializes access administration validation and writes so concurrent changes cannot remove the last administrator.</summary>
public sealed class AuthorizationAdministrationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var path = http.Request.Path;
        if (HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method)
            || !(path.StartsWithSegments("/api/v1/admin/users") || path.StartsWithSegments("/api/v1/admin/roles")
                || path.StartsWithSegments("/api/v1/admin/group-mappings"))) return await next(context);

        var db = http.RequestServices.GetRequiredService<HubDbContext>();
        await using var tx = await db.Database.BeginTransactionAsync(http.RequestAborted);
        await db.Database.ExecuteSqlRawAsync("UPDATE [iam].[AuthorizationVersion] WITH (UPDLOCK,HOLDLOCK) SET [Version]=[Version] WHERE [Id]=1", http.RequestAborted);
        // Access may have changed while this request waited for another administrator to commit.
        var fresh = await http.RequestServices.GetRequiredService<UserResolver>().ResolveAsync(http.User, http.RequestAborted);
        if (fresh is null || !fresh.IsActive) throw new ForbiddenException("Your account no longer has access.");
        var me = http.RequestServices.GetRequiredService<UserContext>();
        me.Set(fresh);
        me.RequireAdministrator();
        foreach (var key in HierarchyEndpointPermissions.Required(http.Request.Path.Value![8..], http.Request.Method))
            me.RequirePermission(key);
        var result = await next(context);
        await tx.CommitAsync(http.RequestAborted);
        return result;
    }
}
