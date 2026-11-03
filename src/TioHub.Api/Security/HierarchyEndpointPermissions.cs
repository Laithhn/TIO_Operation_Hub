namespace TioHub.Api.Security;

/// <summary>Additional section boundaries for existing endpoints; record, workflow and scope guards remain in their handlers.</summary>
public static class HierarchyEndpointPermissions
{
    public static string? AdministrativeArea(string root) => root switch
    {
        "users" or "scope-targets" => "AdminUsers", "roles" => "AdminRoles", "group-mappings" => "AdminGroups",
        "settings" or "attachments" or "attachment-storage" => "AdminSettings", "audit" => "AdminAudit", "exports" => "ReportHistory",
        "corrections" or "lookups" or "jira-instances" or "review-policies" or "configuration" => "AdminConfig",
        "jira-connections" or "jira-sync" or "jira-issues" or "jira-status-mappings" or "jira-user-mappings" => "AdminIntegrations", _ => null
    };

    public static string[] Required(string path, string method, string? tab = null)
    {
        // ASP.NET Core route matching is case-insensitive. Policy selection must use
        // the same semantics or alternate casing can skip a section's permission.
        var p = path.Trim('/').ToLowerInvariant().Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (p.Length == 0) return [];
        var root = p[0].ToLowerInvariant();
        var read = HttpMethods.IsGet(method) || HttpMethods.IsHead(method);
        var action = read ? "View" : HttpMethods.IsDelete(method) ? "Delete" : HttpMethods.IsPut(method) || HttpMethods.IsPatch(method) ? "Maintain" : "Create";
        if (root == "review-policies" && !read) return [$"AdminConfig:{action}"];
        if (root == "notes")
        {
            var operation = read ? p.Length > 1 && p[1] == "files" ? "Download" : "View"
                : HttpMethods.IsDelete(method) || p.Contains("empty") ? "Delete"
                : p.Contains("reorder") || p.Contains("restore") || p.LastOrDefault() == "files" ? "Maintain" : action;
            return [$"PersonalNotes:{operation}"];
        }
        if (root == "notifications") return [$"Notifications:{(read ? "View" : HttpMethods.IsDelete(method) ? "Delete" : "Maintain")}"];
        if (root == "admin" && p.Length > 1 && AdministrativeArea(p[1]) is { } admin)
            return [$"{admin}:{(p.LastOrDefault() == "clone" ? "Create" : !read && p.Length > 2 && !HttpMethods.IsDelete(method) ? "Maintain" : action)}"];
        if (root == "admin" && p.Length > 3 && p[1] == "archived" && !read)
        {
            var section = p[2] switch { "region" => "structure", "contact" => "contacts", _ => null };
            if (section != null) return [PermissionHierarchy.Tab("ClientStructure", section, "ArchiveRestore")];
        }
        if (root == "clients" && p.Length == 3 && p[2] == "overview")
            return [PermissionHierarchy.Tab("ClientStructure", tab?.ToLowerInvariant() ?? "structure", "View")];
        // A76: the tab opens the page; each change also needs Client structure Coordinate in the client's scope (in the handler).
        if (root == "clients" && p.Length > 2 && p[2] == "jira") return [PermissionHierarchy.Tab("ClientStructure", "jira", "View")];
        var clientTab = root switch
        {
            "regions" => "structure", "organizations" or "organization-relationships" => "organizations",
            "contacts" or "boundaries" => "contacts",
            "clients" when p.Length > 2 => p[2] switch
            {
                "regions" => "structure", "contacts" or "boundaries" => "contacts",
                "organizational-structure" or "organization-relationships" => "organizations", _ => null
            }, _ => null
        };
        if (clientTab != null)
        {
            if (!read && p.LastOrDefault() == "archive") action = "ArchiveRestore";
            return [PermissionHierarchy.Tab("ClientStructure", clientTab, action)];
        }
        if (root == "clients" && !(p.Length > 2 && p[2] == "logo") && !(p.Length == 2 && p[1] == "logos"))
            return [PermissionHierarchy.Area("ClientStructure")];
        if (root == "cases" && p.Length > 2 && p[2] == "impact") return [PermissionHierarchy.Tab("Cases", "impact", "View")];
        if (root == "cases" && p.Length > 2 && p[2] == "jira")
            return [PermissionHierarchy.Tab("Cases", "jira", p.LastOrDefault() == "remove" ? "Delete" : action)];
        if (root == "environments" && p.Length > 2 && p[2] == "conditions")
            return [PermissionHierarchy.Tab("Environments", "conditions", read ? "View" : "Create")];
        if (root == "dashboard" && p.Length > 1 && p[1] == "actions") return ["ActionList:View"];
        if (root == "data-quality") return [$"DataQuality:{(read ? "View" : "Maintain")}"];
        if (root is "handovers" or "reassignment-queue") return [$"{(root == "handovers" ? "Handovers" : "Reassignment")}:{(read ? "View" : p.Length > 1 ? "Maintain" : "Create")}"];
        if (root == "export") return ["ReportLibrary:Export"];
        // The catalog is shared, non-record metadata used by the overview, history and schedules too.
        if (root == "reports" && p.Length == 2 && p[1] == "catalog" && read) return ["Reporting:View"];
        if (root is "reports" or "reporting")
        {
            var area = p.ElementAtOrDefault(1) switch
            {
                "catalog" or "presets" => "ReportLibrary", "summary" or "overview" => "ReportOverview",
                "report-types" or "reports" => "ReportBuilder", "report-definitions" => "SavedReports",
                "exports" => "ReportHistory", "schedules" => "ReportSchedules", _ => "ReportLibrary"
            };
            var operation = read ? "View" : action;
            if (!read && p.LastOrDefault() == "preview") operation = "View";
            if (area == "SavedReports" && p.LastOrDefault() == "favorite") operation = "Maintain";
            if (p.LastOrDefault() == "download") operation = "Download";
            if (area == "ReportLibrary" && p.LastOrDefault() == "exports") operation = "Export";
            if (area == "ReportHistory" && !read && p.Length > 2) operation = "Maintain";
            if (area == "ReportSchedules" && !read && p.Length > 2 && !HttpMethods.IsDelete(method)) operation = "Maintain";
            return root == "reporting" && p.Length == 2 && p[1] == "exports" && !read
                ? [$"{area}:{operation}", "ReportBuilder:Export"] : [$"{area}:{operation}"];
        }
        return [];
    }

    public static bool CanViewTab(UserContext me, string resource, string tab) =>
        me.HasPermission(PermissionHierarchy.Tab(resource, tab, "View"));
}
