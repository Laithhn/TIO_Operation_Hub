using TioHub.Api.Common;

namespace TioHub.Api.Security;

/// <summary>The versioned application manifest. Access nodes are grants, never implicit wildcards.</summary>
public static class PermissionHierarchy
{
    public const string Access = "Access";
    public static string Module(string module) => $"module.{module}:{Access}";
    public static string Area(string resource) => $"area.{resource}:{Access}";
    public static string Tab(string resource, string tab, string action = Access) => $"tab.{resource}.{tab}:{action}";

    public static readonly (string Key, string Label)[] Modules =
    [
        ("dashboard", "Dashboard"), ("clients", "Clients"), ("products", "Products"), ("cases", "Cases"),
        ("commitments", "Commitments"), ("notes", "Notes"), ("escalations", "Escalations"), ("teams", "Teams"),
        ("reporting", "Reporting Center"), ("admin", "Administration")
    ];

    // These are real functional tabs/sections. List filters and attachment preview modes are not security boundaries.
    public static readonly (string Resource, string Key, string Label, string[] Sources)[] Tabs =
    [
        ("ClientStructure", "structure", "Regions & environments", ["ClientStructure:View", "Environments:View"]),
        ("ClientStructure", "organizations", "Organizations", ["ClientStructure:View"]),
        ("ClientStructure", "contracts", "Contracts & SLAs", ["Contracts:View"]),
        ("ClientStructure", "cases", "Cases", ["Cases:View"]),
        ("ClientStructure", "commitments", "Commitments", ["Commitments:View"]),
        ("ClientStructure", "escalations", "Escalations", ["OtherOperations:View"]),
        ("ClientStructure", "infra", "Infrastructure", ["Servers:View"]),
        ("ClientStructure", "projects", "Projects", ["Projects:View"]),
        ("ClientStructure", "contacts", "Contacts & responsibilities", ["OtherOperations:View"]),
        ("ClientStructure", "notes", "My notes", ["PersonalNotes:View"]),
        ("Environments", "apps", "Applications", ["Installations:View", "Products:View", "Servers:View"]),
        ("Environments", "assets", "Servers & assets", ["Servers:View"]),
        ("Environments", "work", "Work", ["Cases:View", "Commitments:View", "OtherOperations:View"]),
        ("Environments", "network", "Firewall rules", ["OtherOperations:View"]),
        ("Environments", "conditions", "Condition history", ["Environments:View"]),
        ("Environments", "quality", "Data quality", CapabilityPermissions.BusinessViewKeys),
        ("Cases", "timeline", "Timeline", ["Cases:HistoryView"]),
        ("Cases", "affected", "Affected records", ["Cases:DetailsView"]),
        ("Cases", "jira", "Jira references", ["Cases:View"]),
        ("Cases", "impact", "Documented impact", ["Cases:View"]),
        ("Cases", "commitments", "Commitments", ["Commitments:View"]),
        ("Cases", "escalations", "Escalations", ["OtherOperations:View"])
    ];

    public static readonly (string Resource, string Module, string Label)[] ExtraAreas =
    [
        ("ClientMap", "dashboard", "Client map"), ("ActionList", "dashboard", "Action list"), ("DataQuality", "dashboard", "Data quality"),
        ("Handovers", "teams", "Handovers"), ("Reassignment", "teams", "Reassignment queue"),
        ("ReportOverview", "reporting", "Overview"), ("ReportLibrary", "reporting", "Report library"),
        ("ReportBuilder", "reporting", "Cases report builder"), ("SavedReports", "reporting", "My reports"),
        ("ReportSchedules", "reporting", "Scheduled reports"), ("ReportHistory", "reporting", "Export history"), ("ReportTemplates", "reporting", "Templates"),
        ("AdminUsers", "admin", "Users & access"), ("AdminRoles", "admin", "Roles and rights"), ("AdminGroups", "admin", "Group mappings"),
        ("AdminConfig", "admin", "Configuration"), ("AdminSettings", "admin", "Settings"), ("AdminAudit", "admin", "Change history")
    ];

    public static string ModuleOf(string resource) => resource switch
    {
        "ClientStructure" or "Projects" or "Contracts" or "Environments" or "Servers" or "Installations" => "clients",
        "Products" => "products", "Cases" => "cases", "Commitments" => "commitments", "Teams" => "teams",
        "Dashboard" or "Notifications" => "dashboard", "Reporting" => "reporting", "PersonalNotes" => "notes",
        "OtherOperations" => "escalations",
        _ => ExtraAreas.First(x => x.Resource == resource).Module
    };

    public static readonly PermissionDefinitionInfo[] Definitions = Build();
    private static readonly Dictionary<string, PermissionDefinitionInfo> ByKey = Definitions.ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);
    public static PermissionDefinitionInfo? Find(string key) => ByKey.GetValueOrDefault(key);

    public static string[] AreaActions(string resource) => resource switch
    {
        "AdminAudit" or "ClientMap" or "ActionList" or "ReportOverview" or "ReportTemplates" or "Reassignment" => ["View"],
        "ReportHistory" => ["View", "Create", "Maintain", "Download"],
        "ReportBuilder" => ["View", "Export"],
        "ReportLibrary" => ["View", "Create", "Delete", "Export"],
        "AdminSettings" or "DataQuality" => ["View", "Maintain"],
        "AdminGroups" or "Handovers" => ["View", "Create", "Maintain"],
        _ => ["View", "Create", "Maintain", "Delete"]
    };

    private static PermissionDefinitionInfo[] Build()
    {
        var result = new List<PermissionDefinitionInfo>();
        void Add(string key, string label, string? parent, string type, string module, string resource, string action, string description, string risk = "Normal", bool scope = false) =>
            result.Add(new(key, label, description, Modules.First(x => x.Key == module).Label, resource, parent, action, risk, scope, type, result.Count));
        foreach (var module in Modules)
            Add(Module(module.Key), module.Label, null, "Module", module.Key, $"module.{module.Key}", Access, "Access this module. Child grants are independent and retained when this access is revoked.");
        foreach (var resource in ResourcePermissions.Catalog.GroupBy(p => p.Resource))
        {
            var module = ModuleOf(resource.Key);
            Add(Area(resource.Key), resource.First().ResourceLabel, Module(module), "Submodule", module, $"area.{resource.Key}", Access, "Access this functional area. This does not grant its actions or tabs.");
            foreach (var section in new[] { ("details", "Record details"), ("files", "Attachments"), ("history", "History") }.Where(section => resource.Any(p => p.Action == "DetailsView") && (section.Item1 != "details" || resource.Key is not ("ClientStructure" or "Cases" or "Environments"))))
                Add(Tab(resource.Key, section.Item1), section.Item2, Area(resource.Key), "Tab", module, $"tab.{resource.Key}.{section.Item1}", Access, "Access this record section. Each operation requires its own action grant.");
            foreach (var p in resource)
            {
                var section = p.Action switch { "DetailsView" => resource.Key is "ClientStructure" or "Cases" or "Environments" ? null : "details", "HistoryView" => "history", "AttachmentsView" or "AttachmentsUpload" or "AttachmentsDeleteOwn" or "AttachmentsDelete" => "files", _ => null };
                Add(p.Key, p.ActionLabel, section == null ? Area(p.Resource) : Tab(p.Resource, section), "Action", module, p.Resource, p.Action, p.Description,
                    p.Action is "Delete" or "AttachmentsDelete" or "Export" ? "High" : "Normal", !new[] { "Dashboard", "Reporting", "PersonalNotes", "Notifications" }.Contains(p.Resource));
            }
        }
        foreach (var tab in Tabs)
        {
            var resource = $"tab.{tab.Resource}.{tab.Key}";
            var module = ModuleOf(tab.Resource);
            Add(Tab(tab.Resource, tab.Key), tab.Label, Area(tab.Resource), "Tab", module, resource, Access, "Access this tab. Previously configured actions remain stored when disabled.");
            Add(Tab(tab.Resource, tab.Key, "View"), "View", Tab(tab.Resource, tab.Key), "Action", module, resource, "View", "View this tab's data; source resource permissions and record scope also apply.");
        }
        // Regions and organizations have distinct CRUD APIs, and Jira has its own reference operations.
        foreach (var tab in new[] { ("ClientStructure", "structure"), ("ClientStructure", "organizations"), ("ClientStructure", "contacts"), ("Cases", "jira"), ("Environments", "conditions") })
            foreach (var action in (tab.Item2 switch { "conditions" => new[] { "Create" }, "jira" => new[] { "Create", "Delete" }, "structure" or "contacts" => new[] { "Create", "Maintain", "ArchiveRestore", "Delete" }, _ => new[] { "Create", "Maintain", "Delete" } }))
                Add(Tab(tab.Item1, tab.Item2, action), action == "Maintain" ? "Edit" : action, Tab(tab.Item1, tab.Item2), "Action", ModuleOf(tab.Item1), $"tab.{tab.Item1}.{tab.Item2}", action, $"{action} within this section; the existing resource action is also required.");
        foreach (var area in ExtraAreas)
        {
            Add(Area(area.Resource), area.Label, Module(area.Module), "Submodule", area.Module, $"area.{area.Resource}", Access, "Access this functional area; actions are independent.");
            foreach (var action in AreaActions(area.Resource))
                Add($"{area.Resource}:{action}", action == "Maintain" ? "Edit" : action, Area(area.Resource), "Action", area.Module, area.Resource, action, $"{action} in {area.Label}. Existing administration, data, ownership and scope checks still apply.", area.Module == "admin" ? "High" : "Normal");
        }
        return result.ToArray();
    }

    /// <summary>All ancestors, nearest first. Unknown keys never acquire authority by string prefix.</summary>
    public static string[] Ancestors(string key)
    {
        var parents = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { key };
        var node = Find(key);
        while (node?.ParentKey is { } parent)
        {
            if (!seen.Add(parent)) throw new InvalidOperationException("The permission manifest contains a cycle.");
            parents.Add(parent);
            node = Find(parent) ?? throw new InvalidOperationException($"Missing permission parent {parent}.");
        }
        return parents.ToArray();
    }

    public static string[] Resolve(IEnumerable<string> assigned, ISet<string>? active = null)
    {
        var keys = assigned.Where(k => Find(k) != null && (active == null || active.Contains(k))).ToHashSet(StringComparer.OrdinalIgnoreCase);
        while (keys.RemoveWhere(key => CapabilityPermissions.Dependencies(key).Any(required => !keys.Contains(required))) > 0) { }
        return keys.Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    // Used only by the reviewed, one-time upgrade and explicit fixture/default mappings, never on sign-in or save.
    public static string[] WithAncestors(IEnumerable<string> keys) => keys.SelectMany(k => new[] { k }.Concat(Ancestors(k))).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

    public static string[] GrantCandidates(IEnumerable<string> existing, IEnumerable<string> requested, bool enabling = false, IEnumerable<string>? otherAssignments = null)
    {
        var current = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var proposed = requested.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = proposed.Except(current, StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return proposed.Concat(otherAssignments ?? []).Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(k => enabling && proposed.Contains(k) || added.Contains(k) || Ancestors(k).Any(added.Contains)).ToArray();
    }

    /// <summary>Effective capabilities newly enabled by a change to the union of a user's roles.</summary>
    public static string[] NewlyEffective(IEnumerable<string> before, IEnumerable<string> after, ISet<string>? active = null)
    {
        var previous = Resolve(before, active).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return Resolve(after, active).Where(key => !previous.Contains(key)).ToArray();
    }

    public static void RequireRecordSection(UserContext me, string recordType, string action)
    {
        var section = recordType switch { "Region" => "structure", "Contact" or "ResponsibilityBoundary" => "contacts", "Organization" or "OrganizationRelationship" => "organizations", _ => null };
        if (section != null) me.RequirePermission(Tab("ClientStructure", section, action));
    }

    /// <summary>Frozen into the upgrade migration. Each new grant still requires the old source authority at evaluation.</summary>
    public static (string Source, string Target)[] UpgradeMappings() =>
    [
        .. ResourcePermissions.Catalog.Where(p => p.Action is "View" or "DetailsView" or "HistoryView" or "AttachmentsView" or "AttachmentsUpload" or "AttachmentsDeleteOwn" or "AttachmentsDelete")
            .SelectMany(p => Ancestors(p.Key).Select(parent => (p.Key, parent))),
        .. Tabs.SelectMany(t => (t.Resource == "ClientStructure" ? t.Sources : new[] { $"{t.Resource}:DetailsView" })
            .SelectMany(source => WithAncestors([Tab(t.Resource, t.Key, "View")]).Select(target => (source, target)))),
        .. Definitions.Where(d => d.NodeType == "Action" && d.ResourceType.StartsWith("tab.") && d.Action != "View")
            .SelectMany(d =>
            {
                var tab = Tabs.First(t => d.ResourceType == $"tab.{t.Resource}.{t.Key}");
                var source = tab.Key == "contacts" ? "OtherOperations" : tab.Resource;
                var action = tab.Key is "jira" or "conditions" ? "Maintain" : d.Action;
                return WithAncestors([d.Key]).Select(target => ($"{source}:{action}", target));
            }),
        // Legacy read access never implied mutation. Built-in roles with the old Edit bit
        // retain note and notification operations; custom read-only roles gain none.
        .. ResourcePermissions.Catalog.Where(p => p.Resource is "PersonalNotes" or "Notifications" && p.Action != "View")
            .SelectMany(p => WithAncestors([p.Key]).Select(target => ("@Edit", target))),
        .. ExtraAreas.SelectMany(a => AreaActions(a.Resource).SelectMany(action =>
        {
            var source = a.Resource == "AdminAudit" ? "@Audit"
                : a.Module == "admin" ? "@Administer"
                : a.Module == "dashboard" ? action == "View" ? "Dashboard:View" : "@Edit"
                : a.Module == "teams" ? $"Teams:{(action == "View" ? "View" : action)}"
                : action == "View" ? "Reporting:View" : "@Export";
            return WithAncestors([$"{a.Resource}:{action}"]).Select(target => (source, target));
        })),
        .. WithAncestors(["Handovers:Maintain"]).Select(target => ("Teams:Coordinate", target))
    ];

    public static string[] UpgradeLegacy(IEnumerable<string> assigned, Right rights)
    {
        var keys = assigned.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return WithAncestors(keys.Concat(UpgradeMappings().Where(m => keys.Contains(m.Source)
            || m.Source == "@Administer" && rights.HasFlag(Right.Administer)
            || m.Source == "@Audit" && rights.HasFlag(Right.Audit)
            || m.Source == "@Edit" && rights.HasFlag(Right.Edit)
            || m.Source == "@Export" && rights.HasFlag(Right.Export)).Select(m => m.Target)));
    }
}
