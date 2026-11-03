using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Security;

/// <summary>
/// Explicit data dependencies for composite capabilities. Grouping in the permission editor has no grant semantics.
/// Mandatory client, project and team query filters continue to apply after these checks succeed.
/// </summary>
public static class CapabilityPermissions
{
    public static readonly string[] BusinessResources =
    [
        ResourcePermissions.Structure, ResourcePermissions.Projects, ResourcePermissions.Contracts, ResourcePermissions.Environments,
        ResourcePermissions.Servers, ResourcePermissions.Installations, ResourcePermissions.Products,
        ResourcePermissions.Cases, ResourcePermissions.Commitments, ResourcePermissions.Teams, ResourcePermissions.Other
    ];

    public static string[] AllViewKeys => ResourcePermissions.Catalog.Where(p => p.Action == ResourcePermissions.View).Select(p => p.Key).ToArray();
    public static string[] BusinessViewKeys => BusinessResources.Select(r => ResourcePermissions.KeyOf(r, ResourcePermissions.View)).ToArray();
    public static readonly string[] KnownReportKeys = ["cases", "commitments", "actions", "environments", "versions", "assets", "data-quality", "contracts", "sla-compliance", "commitment-performance", "case-aging", "team-workload", "client-health"];
    public static string[] ReadableReports(UserContext me) => KnownReportKeys.Where(key =>
        me.HasPermission(ResourcePermissions.Reporting, ResourcePermissions.View)
            && ReportResources(key).All(resource => me.HasPermission(resource, ResourcePermissions.View))).ToArray();

    public static string[] Dependencies(string key) => PermissionHierarchy.Ancestors(key)
        .Concat(ActionDependencies(key)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

    private static string[] ActionDependencies(string key)
    {
        var definition = PermissionHierarchy.Find(key);
        if (definition is null || definition.NodeType != "Action") return [];
        var tab = PermissionHierarchy.Tabs.FirstOrDefault(t => key.StartsWith($"tab.{t.Resource}.{t.Key}:", StringComparison.OrdinalIgnoreCase));
        if (tab.Resource is not null)
        {
            if (definition.Action == "View") return tab.Sources;
            var source = tab.Key == "contacts" ? ResourcePermissions.Other : tab.Resource;
            var sourceAction = tab.Key is "jira" or "conditions" ? ResourcePermissions.Maintain : definition.Action;
            return [PermissionHierarchy.Tab(tab.Resource, tab.Key, "View"), ResourcePermissions.KeyOf(source, sourceAction)];
        }
        var area = PermissionHierarchy.ExtraAreas.FirstOrDefault(a => a.Resource == definition.ResourceType);
        if (area.Resource is not null)
        {
            if (definition.Action != "View") return [$"{area.Resource}:View"];
            return area.Module switch
            {
                "dashboard" => ["Dashboard:View"], "teams" => ["Teams:View"], "reporting" => ["Reporting:View"], _ => []
            };
        }
        if (!ResourcePermissions.TryParse(key, out var resource, out var action)) return [];
        var view = ResourcePermissions.KeyOf(resource, ResourcePermissions.View);
        var details = ResourcePermissions.KeyOf(resource, ResourcePermissions.DetailsView);
        var attachments = ResourcePermissions.KeyOf(resource, ResourcePermissions.AttachmentsView);
        if (action is ResourcePermissions.AttachmentsUpload or ResourcePermissions.AttachmentsDeleteOwn or ResourcePermissions.AttachmentsDelete) return [view, details, attachments];
        if (action is ResourcePermissions.AttachmentsView or ResourcePermissions.HistoryView) return [view, details];
        if (action != ResourcePermissions.View) return [view];
        // These screens combine rows from several independent resources. Fail closed unless the caller can read all of them.
        // Report execution checks its particular source modules separately instead of requiring all business views.
        return resource == ResourcePermissions.Dashboard ? BusinessViewKeys : [];
    }

    public static void RequireViews(UserContext me, params string[] resources)
    {
        foreach (var resource in resources) me.RequirePermission(resource, ResourcePermissions.View);
    }

    /// <summary>Archived rows carry record details and must retain their resource and section boundaries.</summary>
    public static void RequireArchivedRead(UserContext me, string recordType)
    {
        RequireViews(me, string.IsNullOrEmpty(recordType) ? BusinessResources : [ResourcePermissions.ForRecord(recordType)]);
        if (string.IsNullOrEmpty(recordType) || recordType is RecordTypes.Client or RecordTypes.Region)
            me.RequirePermission(PermissionHierarchy.Tab(ResourcePermissions.Structure, "structure", "View"));
        if (string.IsNullOrEmpty(recordType) || recordType == RecordTypes.Contact)
            me.RequirePermission(PermissionHierarchy.Tab(ResourcePermissions.Structure, "contacts", "View"));
    }

    public static string[] ReportResources(string report) => report.ToLowerInvariant() switch
    {
        "cases" or "cases-builder" or "case-aging" => [ResourcePermissions.Cases],
        "commitments" or "commitment-performance" => [ResourcePermissions.Commitments],
        "environments" => [ResourcePermissions.Environments],
        "versions" => [ResourcePermissions.Installations, ResourcePermissions.Products],
        "assets" => [ResourcePermissions.Servers],
        "contracts" => [ResourcePermissions.Contracts],
        "sla-compliance" => [ResourcePermissions.Cases, ResourcePermissions.Contracts],
        "team-workload" => [ResourcePermissions.Teams, ResourcePermissions.Cases, ResourcePermissions.Commitments],
        "data-quality" or "actions" or "client-health" => BusinessResources,
        _ => throw new ForbiddenException("This report has no registered data access policy.")
    };

    public static void RequireReport(UserContext me, string report)
    {
        me.RequirePermission(ResourcePermissions.Reporting, ResourcePermissions.View);
        RequireViews(me, ReportResources(report));
    }

    public static void RequireReportExport(UserContext me, string report)
    {
        RequireReport(me, report);
        foreach (var resource in ReportResources(report)) me.RequirePermission(resource, ResourcePermissions.Export);
    }

    public static string? DetailResource(string relativePath)
    {
        var parts = relativePath.Trim('/').ToLowerInvariant().Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2) return null;
        if (parts[0] == "clients" && parts.Length == 3 && parts[2] == "logo") return null;
        // Only registered record route roots use a numeric id as a detail page. Identifiers such as export jobs are separate capabilities.
        var direct = long.TryParse(parts[1], out _);
        return parts[0].ToLowerInvariant() switch
        {
            // Client detail is a shell for independently permissioned tabs. The handler checks that
            // the caller can open at least one tab and is in scope; individual record tabs enforce
            // their own DetailsView policy through their dedicated endpoints.
            "regions" or "organizations" when direct => ResourcePermissions.Structure,
            "projects" when direct => ResourcePermissions.Projects,
            "contracts" or "payments" when direct => ResourcePermissions.Contracts,
            "environments" when direct => ResourcePermissions.Environments,
            "assets" or "components" or "volumes" or "shared-storage" when direct => ResourcePermissions.Servers,
            "products" when direct || parts.Length > 2 && parts[1] == "microservices" && long.TryParse(parts[2], out _) => ResourcePermissions.Products,
            "installations" when direct => ResourcePermissions.Installations,
            "cases" when direct => ResourcePermissions.Cases,
            "commitments" when direct => ResourcePermissions.Commitments,
            "teams" or "handovers" when direct => ResourcePermissions.Teams,
            "escalations" or "firewall-rules" when direct => ResourcePermissions.Other,
            _ => null
        };
    }

    /// <summary>Explicit API resource inventory; unrelated roots are never inferred from display names or route labels.</summary>
    public static string[] ReadResources(string relativePath)
    {
        var parts = relativePath.Trim('/').ToLowerInvariant().Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) throw new ForbiddenException("This endpoint has no registered read policy.");
        return parts[0].ToLowerInvariant() switch
        {
            "clients" when parts.Length == 1 => [],
            "clients" when parts.Length == 3 && parts[2] == "logo" => [],
            // Client 360 is sectioned by the active client tab. The endpoint enforces that section's
            // source permissions itself; the old all-business-resources rule made unrelated modules
            // (for example Contracts) block the entire client page.
            "clients" when parts.Length == 2 && long.TryParse(parts[1], out _) => [],
            "clients" when parts.Length > 2 && parts[2] == "overview" => [],
            "clients" when parts.Length > 2 && parts[2] == "active-work" => [ResourcePermissions.Structure, ResourcePermissions.Cases, ResourcePermissions.Commitments, ResourcePermissions.Environments],
            "clients" when parts.Length > 2 && parts[2] is "contacts" or "boundaries" => [ResourcePermissions.Other],
            "clients" or "regions" or "organizations" => [ResourcePermissions.Structure],
            "projects" => [ResourcePermissions.Projects],
            "contracts" or "payments" => [ResourcePermissions.Contracts],
            "environments" when parts.Length > 2 && parts[2] == "overview" => [ResourcePermissions.Environments],
            "environments" when parts.Length > 2 && parts[2] == "microservice-options" => [ResourcePermissions.Environments, ResourcePermissions.Products, ResourcePermissions.Installations, ResourcePermissions.Servers],
            "environments" => [ResourcePermissions.Environments],
            "assets" or "components" or "volumes" or "shared-storage" or "infrastructure" => [ResourcePermissions.Servers],
            "products" => [ResourcePermissions.Products],
            "installations" or "version-matrix" => [ResourcePermissions.Installations],
            "cases" or "jira" => [ResourcePermissions.Cases],
            "commitments" => [ResourcePermissions.Commitments],
            "teams" or "handovers" or "reassignment-queue" => [ResourcePermissions.Teams],
            "escalations" or "firewall-rules" or "review-policies" => [ResourcePermissions.Other],
            "data-quality" => BusinessResources,
            "dashboard" => [ResourcePermissions.Dashboard, .. BusinessResources],
            "reporting" when parts.Length > 1 && parts[1] is "report-definitions" or "report-types" => [ResourcePermissions.Reporting, ResourcePermissions.Cases],
            "reports" or "reporting" => [ResourcePermissions.Reporting],
            "notes" => [ResourcePermissions.PersonalNotes],
            "notifications" => [ResourcePermissions.Notifications],
            "dependents" => BusinessResources,
            _ => throw new ForbiddenException("This endpoint has no registered read policy.")
        };
    }

    public static string[] ClientTabViews(string tab) => tab.ToLowerInvariant() switch
    {
        "structure" => [ResourcePermissions.Structure, ResourcePermissions.Environments],
        "organizations" => [ResourcePermissions.Structure],
        "projects" => [ResourcePermissions.Projects],
        "contracts" => [ResourcePermissions.Contracts],
        "cases" => [ResourcePermissions.Cases],
        "commitments" => [ResourcePermissions.Commitments],
        "escalations" or "contacts" => [ResourcePermissions.Other],
        "infra" => [ResourcePermissions.Servers],
        _ => throw new ValidationException("tab", "Choose a supported client tab.")
    };

    public static bool CanOpenClientPage(UserContext me) => me.HasPermission(PermissionHierarchy.Area(ResourcePermissions.Structure)) &&
        (PermissionHierarchy.Tabs.Where(t => t.Resource == ResourcePermissions.Structure)
            .Any(t => me.HasPermission(PermissionHierarchy.Tab(t.Resource, t.Key, "View")))
        || me.HasPermission(ResourcePermissions.Structure, ResourcePermissions.AttachmentsView)
        || me.HasPermission(ResourcePermissions.Structure, ResourcePermissions.HistoryView) && me.Has(Grant.Audit));

}

/// <summary>
/// Defense at the API boundary for module reads. All mutations retain their existing service and record guards;
/// permission evaluation also requires module View for every resource action. Register on the /api/v1 route group.
/// </summary>
public sealed class CapabilityPermissionFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var me = http.RequestServices.GetRequiredService<UserContext>();
        if (http.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() is not null) return await next(context);
        var path = http.Request.Path.Value ?? "";
        if (!path.StartsWith("/api/v1/", StringComparison.OrdinalIgnoreCase)) return await next(context);
        // The router accepts any path casing, so all policy lookups must do so too.
        var relative = path[8..].Trim('/').ToLowerInvariant();
        var parts = relative.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var root = parts.FirstOrDefault()?.ToLowerInvariant() ?? "";
        // Session/bootstrap, validated reference values and assignee pickers have their own guards. They carry no record detail.
        if (root is "auth" or "me" || relative is "reference" or "users/assignable" or "attachments/limits") return await next(context);

        try
        {
            foreach (var required in HierarchyEndpointPermissions.Required(relative, http.Request.Method, http.Request.Query["tab"].FirstOrDefault()))
                me.RequirePermission(required);
            // Personal and reporting writes depend on opening those capabilities too, even where they use ownership checks.
            if (root is "notes" or "notifications" or "reports" or "reporting")
                CapabilityPermissions.RequireViews(me, CapabilityPermissions.ReadResources(relative));
            if (root == "reporting" && !HttpMethods.IsGet(http.Request.Method) && parts.Length > 1 && parts[1] is "exports" or "schedules")
                CapabilityPermissions.RequireReportExport(me, "cases");

            if (root == "attachments")
                await RequireAttachmentViewAsync(http, me, parts, http.RequestAborted);
            else if (HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method))
            {
                if (root == "admin") RequireAdministrativeRead(http, me, parts);
                else if (root == "export")
                {
                    if (parts.Length < 2) throw new ForbiddenException("A report access policy is required.");
                    CapabilityPermissions.RequireReportExport(me, parts[1]);
                }
                else if (root != "search") CapabilityPermissions.RequireViews(me, CapabilityPermissions.ReadResources(relative));
                if (CapabilityPermissions.DetailResource(relative) is { } detailResource)
                    me.RequirePermission(detailResource, ResourcePermissions.DetailsView);

                if (root is "reports" or "reporting" && http.Request.RouteValues.TryGetValue("id", out var idValue)
                    && parts.Contains("exports", StringComparer.OrdinalIgnoreCase) && long.TryParse(idValue?.ToString(), out var exportId))
                {
                    var db = http.RequestServices.GetRequiredService<HubDbContext>();
                    var report = await db.ExportJobs.AsNoTracking().Where(j => j.Id == exportId && (j.UserId == me.UserId || me.Has(Grant.Audit)))
                        .Select(j => j.Report).FirstOrDefaultAsync(http.RequestAborted);
                    if (report is not null) CapabilityPermissions.RequireReportExport(me, report);
                }
            }
            return await next(context);
        }
        catch (ForbiddenException)
        {
            http.RequestServices.GetRequiredService<ILogger<CapabilityPermissionFilter>>()
                .LogWarning("Access denied for user {UserId} on {Method} {Path}", me.UserId, http.Request.Method, path);
            try
            {
                var route = (http.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText;
                await http.RequestServices.GetRequiredService<HubDbContext>().AuditActionAsync("AccessDenied", "Permission", null,
                    route, null, "The requested capability is not granted.", new { method = http.Request.Method, route },
                    http.RequestAborted, category: "Access");
            }
            catch (Exception ex)
            {
                // Audit failure cannot convert a denial into access. Do not log request bodies, tokens or query strings.
                http.RequestServices.GetRequiredService<ILogger<CapabilityPermissionFilter>>().LogError(ex, "Could not persist the denied-access audit event");
            }
            throw;
        }
    }

    private static void RequireAdministrativeRead(HttpContext http, UserContext me, string[] parts)
    {
        if (parts.Length < 2) return;
        if (parts[1] == "archived")
        {
            var recordType = http.Request.Query["recordType"].ToString();
            CapabilityPermissions.RequireArchivedRead(me, recordType);
        }
        else if (parts[1] == "audit" && !string.Equals(http.Request.Query["category"], "Access", StringComparison.OrdinalIgnoreCase))
        {
            var entityType = http.Request.Query["entityType"].ToString();
            if (string.IsNullOrEmpty(entityType))
            {
                foreach (var resource in CapabilityPermissions.BusinessResources) me.RequirePermission(resource, ResourcePermissions.HistoryView);
            }
            else
            {
                try { me.RequirePermission(ResourcePermissions.ForRecord(entityType), ResourcePermissions.HistoryView); }
                catch (NotFoundException)
                {
                    // Access administration entries have a separate protected category. An unknown business audit type
                    // can contain child rows or polymorphic attachments, so require every source's history authority.
                    string[] accessTypes = ["User", "UserRole", "AppRole", "RolePermission", "UserPermissionOverride", "PermissionDefinition", "UserScope", "GroupMapping", "GroupMappingScope", "AppSetting", "LookupValue", "ReviewPolicy", "JiraInstance"];
                    if (accessTypes.Contains(entityType, StringComparer.Ordinal)) me.RequireAdministrator();
                    else foreach (var resource in CapabilityPermissions.BusinessResources) me.RequirePermission(resource, ResourcePermissions.HistoryView);
                }
            }
        }
    }

    private static async Task RequireAttachmentViewAsync(HttpContext http, UserContext me, string[] parts, CancellationToken ct)
    {
        var type = http.Request.Query["recordType"].ToString();
        long? uploaderId = null;
        if (parts.Length > 1 && long.TryParse(parts[1], out var id))
        {
            var db = http.RequestServices.GetRequiredService<HubDbContext>();
            var attachment = await db.Attachments.AsNoTracking().Where(a => a.Id == id).Select(a => new { a.RecordType, a.UploadedById }).FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("The attachment");
            type = attachment.RecordType;
            uploaderId = attachment.UploadedById;
        }
        // Multipart upload checks its record type after reading the validated form inside the handler.
        if (type.Length > 0)
        {
            var resource = ResourcePermissions.ForRecord(type);
            var action = HttpMethods.IsDelete(http.Request.Method)
                ? me.HasPermission(resource, ResourcePermissions.AttachmentsDelete) ? ResourcePermissions.AttachmentsDelete
                    : uploaderId == me.UserId ? ResourcePermissions.AttachmentsDeleteOwn : ResourcePermissions.AttachmentsDelete
                : HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method) ? ResourcePermissions.AttachmentsView
                : ResourcePermissions.AttachmentsUpload;
            me.RequirePermission(resource, action);
        }
    }
}
