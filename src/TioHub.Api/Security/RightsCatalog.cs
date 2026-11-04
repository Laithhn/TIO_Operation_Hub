using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>Stable right keys and the record type each shared operation belongs to. Keys are identifiers: labels may change, keys never do.</summary>
public static class RightKeys
{
    public const string Structure = "ClientStructure";
    public const string Projects = "Projects";
    public const string Contracts = "Contracts";
    public const string Environments = "Environments";
    public const string Servers = "Servers";
    public const string Installations = "Installations";
    public const string Products = "Products";
    public const string Cases = "Cases";
    public const string Commitments = "Commitments";
    public const string Teams = "Teams";
    public const string Other = "OtherOperations";

    public const string Dashboard = "Dashboard";
    public const string Reporting = "Reporting";
    public const string PersonalNotes = "PersonalNotes";
    public const string Notifications = "Notifications";

    public const string View = "View";
    public const string DetailsView = "DetailsView";
    public const string HistoryView = "HistoryView";
    public const string AttachmentsView = "AttachmentsView";
    public const string AttachmentsUpload = "AttachmentsUpload";
    public const string AttachmentsDeleteOwn = "AttachmentsDeleteOwn";
    public const string AttachmentsDelete = "AttachmentsDelete";
    public const string Export = "Export";
    public const string Maintain = "Maintain";
    public const string Create = "Create";
    public const string Coordinate = "Coordinate";
    public const string ArchiveRestore = "ArchiveRestore";
    public const string Delete = "Delete";

    public const string Administration = "Platform:Administration";
    public const string PlatformExport = "Platform:Export";
    public const string TechnicalDetail = "Platform:TechnicalDetail";
    public const string Audit = "Platform:Audit";
    /// <summary>Open the clients page: the list and the client shell. Each tab needs its own right.</summary>
    public const string ClientsAccess = "ClientStructure:Access";

    public static string KeyOf(string resource, string action) => $"{resource}:{action}";
    public static string Tab(string resource, string tab, string action = View) => $"tab.{resource}.{tab}:{action}";

    /// <summary>Shared record actions must use the owning module's right, never an action granted for another module.</summary>
    public static string ForRecord(string recordType) => recordType switch
    {
        RecordTypes.Client or RecordTypes.Region or "Organization" or "OrganizationRelationship" => Structure,
        RecordTypes.Project => Projects,
        RecordTypes.Contract => Contracts,
        RecordTypes.Environment => Environments,
        RecordTypes.Asset or RecordTypes.Component or RecordTypes.Volume or "SharedStorage" => Servers,
        RecordTypes.Installation => Installations,
        "Product" or "ProductModule" or "ProductFeature" or "ProductVersion" or "ProductMicroservice" or "MicroserviceVersion" or "ProductDeveloper" => Products,
        RecordTypes.Case => Cases,
        RecordTypes.Commitment => Commitments,
        "Team" or RecordTypes.Handover => Teams,
        RecordTypes.Contact or RecordTypes.Boundary or RecordTypes.Escalation or "FirewallRule" => Other,
        _ => throw new NotFoundException("The record type")
    };
}

/// <summary>
/// One right. <paramref name="Kind"/> is "Access" (see a feature) or "Action" (do something). <paramref name="Requires"/> lists direct
/// prerequisites: a right is effective only while all of them are effective, across all of a person's roles.
/// </summary>
public sealed record RightInfo(string Key, string Label, string Description, string Module, string Feature, string FeatureLabel, string Action,
    string Kind, string RiskLevel, bool SupportsScope, string[] Requires, int DisplayOrder);

/// <summary>The central rights catalog. Only code defines rights; role editing assigns them and can never create, rename or remove one.</summary>
public static class RightsCatalog
{
    private static readonly (string Resource, string Label, string Module, string[] Actions)[] Resources =
    [
        (RightKeys.Structure, "Client structure", "Clients", StandardActions),
        (RightKeys.Projects, "Projects", "Clients", StandardActions),
        (RightKeys.Contracts, "Contracts", "Clients", StandardActions),
        (RightKeys.Environments, "Environments", "Clients", StandardActions),
        (RightKeys.Servers, "Servers", "Clients", StandardActions),
        (RightKeys.Installations, "Installations", "Clients", StandardActions),
        (RightKeys.Products, "Products", "Products", StandardActions),
        (RightKeys.Cases, "Cases", "Cases", StandardActions),
        (RightKeys.Commitments, "Commitments", "Commitments", StandardActions),
        (RightKeys.Teams, "Teams and handovers", "Teams", StandardActions),
        (RightKeys.Other, "Other operations", "Escalations", StandardActions),
        (RightKeys.Dashboard, "Operations dashboard", "Dashboard", [RightKeys.View]),
        (RightKeys.Notifications, "Notifications", "Dashboard", [RightKeys.View, RightKeys.Maintain, RightKeys.Delete]),
        (RightKeys.Reporting, "Reporting center", "Reporting Center", [RightKeys.View]),
        (RightKeys.PersonalNotes, "Personal notes", "Notes", [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete, "Download"])
    ];

    private static string[] StandardActions => [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Coordinate, RightKeys.ArchiveRestore, RightKeys.Delete,
        RightKeys.DetailsView, RightKeys.HistoryView, RightKeys.AttachmentsView, RightKeys.AttachmentsUpload, RightKeys.AttachmentsDeleteOwn, RightKeys.AttachmentsDelete, RightKeys.Export];

    public static readonly string[] BusinessResources =
    [
        RightKeys.Structure, RightKeys.Projects, RightKeys.Contracts, RightKeys.Environments, RightKeys.Servers, RightKeys.Installations,
        RightKeys.Products, RightKeys.Cases, RightKeys.Commitments, RightKeys.Teams, RightKeys.Other
    ];
    public static string[] BusinessViewKeys => BusinessResources.Select(r => RightKeys.KeyOf(r, RightKeys.View)).ToArray();

    /// <summary>Functional tabs and sections of the client, environment and case pages, with the source rights their data comes from.</summary>
    public static readonly (string Resource, string Key, string Label, string[] Sources)[] Tabs =
    [
        (RightKeys.Structure, "structure", "Regions & environments", ["ClientStructure:View", "Environments:View"]),
        (RightKeys.Structure, "organizations", "Organizations", ["ClientStructure:View"]),
        (RightKeys.Structure, "contracts", "Contracts & SLAs", ["Contracts:View"]),
        (RightKeys.Structure, "cases", "Cases", ["Cases:View"]),
        (RightKeys.Structure, "commitments", "Commitments", ["Commitments:View"]),
        (RightKeys.Structure, "escalations", "Escalations", ["OtherOperations:View"]),
        (RightKeys.Structure, "infra", "Infrastructure", ["Servers:View"]),
        (RightKeys.Structure, "projects", "Projects", ["Projects:View"]),
        (RightKeys.Structure, "jira", "Jira integration", ["ClientStructure:View"]),
        (RightKeys.Structure, "contacts", "Contacts & responsibilities", ["OtherOperations:View"]),
        (RightKeys.Structure, "notes", "My notes", ["PersonalNotes:View"]),
        (RightKeys.Environments, "apps", "Applications", ["Installations:View", "Products:View", "Servers:View"]),
        (RightKeys.Environments, "assets", "Servers & assets", ["Servers:View"]),
        (RightKeys.Environments, "work", "Work", ["Cases:View", "Commitments:View", "OtherOperations:View"]),
        (RightKeys.Environments, "network", "Firewall rules", ["OtherOperations:View"]),
        (RightKeys.Environments, "conditions", "Condition history", ["Environments:View"]),
        (RightKeys.Environments, "quality", "Data quality", BusinessViewKeysStatic),
        (RightKeys.Cases, "timeline", "Timeline", ["Cases:DetailsView"]),
        (RightKeys.Cases, "affected", "Affected records", ["Cases:DetailsView"]),
        (RightKeys.Cases, "jira", "Jira references", ["Cases:View"]),
        (RightKeys.Cases, "impact", "Documented impact", ["Cases:View"]),
        (RightKeys.Cases, "commitments", "Commitments", ["Commitments:View"]),
        (RightKeys.Cases, "escalations", "Escalations", ["OtherOperations:View"])
    ];

    private static string[] BusinessViewKeysStatic =>
        ["ClientStructure:View", "Projects:View", "Contracts:View", "Environments:View", "Servers:View", "Installations:View", "Products:View", "Cases:View", "Commitments:View", "Teams:View", "OtherOperations:View"];

    // Regions and organizations have distinct CRUD APIs, and Jira has its own reference operations.
    private static readonly (string Resource, string Tab, string[] Actions)[] TabActions =
    [
        (RightKeys.Structure, "structure", [RightKeys.Create, RightKeys.Maintain, RightKeys.ArchiveRestore, RightKeys.Delete]),
        (RightKeys.Structure, "organizations", [RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        (RightKeys.Structure, "contacts", [RightKeys.Create, RightKeys.Maintain, RightKeys.ArchiveRestore, RightKeys.Delete]),
        (RightKeys.Cases, "jira", [RightKeys.Create, RightKeys.Delete]),
        (RightKeys.Environments, "conditions", [RightKeys.Create])
    ];

    /// <summary>Features that are not record resources. <c>Base</c> is a right every action in the feature needs beyond the feature's own View.</summary>
    private static readonly (string Resource, string Module, string Label, string? ViewNeeds, string[] Actions)[] Features =
    [
        ("ClientMap", "Dashboard", "Client map", RightKeys.KeyOf(RightKeys.Dashboard, RightKeys.View), [RightKeys.View]),
        ("ActionList", "Dashboard", "Action list", RightKeys.KeyOf(RightKeys.Dashboard, RightKeys.View), [RightKeys.View]),
        ("DataQuality", "Dashboard", "Data quality", RightKeys.KeyOf(RightKeys.Dashboard, RightKeys.View), [RightKeys.View, RightKeys.Maintain]),
        ("Handovers", "Teams", "Handovers", RightKeys.KeyOf(RightKeys.Teams, RightKeys.View), [RightKeys.View, RightKeys.Create, RightKeys.Maintain]),
        ("Reassignment", "Teams", "Reassignment queue", RightKeys.KeyOf(RightKeys.Teams, RightKeys.View), [RightKeys.View]),
        ("ReportOverview", "Reporting Center", "Overview", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View]),
        ("ReportLibrary", "Reporting Center", "Report library", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View, RightKeys.Create, RightKeys.Delete, RightKeys.Export]),
        ("ReportBuilder", "Reporting Center", "Cases report builder", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View, RightKeys.Export]),
        ("SavedReports", "Reporting Center", "My reports", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        ("ReportSchedules", "Reporting Center", "Scheduled reports", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        ("ReportHistory", "Reporting Center", "Export history", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View, RightKeys.Create, RightKeys.Maintain, "Download"]),
        ("ReportTemplates", "Reporting Center", "Templates", RightKeys.KeyOf(RightKeys.Reporting, RightKeys.View), [RightKeys.View]),
        ("AdminUsers", "Administration", "Users", RightKeys.Administration, [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        ("AdminRoles", "Administration", "Roles and rights", RightKeys.Administration, [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        ("AdminGroups", "Administration", "Directory group mappings", RightKeys.Administration, [RightKeys.View, RightKeys.Create, RightKeys.Maintain]),
        ("AdminConfig", "Administration", "Configuration", RightKeys.Administration, [RightKeys.View, RightKeys.Create, RightKeys.Maintain, RightKeys.Delete]),
        ("AdminSettings", "Administration", "Settings", RightKeys.Administration, [RightKeys.View, RightKeys.Maintain]),
        ("AdminAudit", "Administration", "Change history", RightKeys.Audit, [RightKeys.View]),
        ("AdminIntegrations", "Administration", "Integrations", RightKeys.Administration, [RightKeys.View, RightKeys.Create, RightKeys.Maintain])
    ];

    public static readonly RightInfo[] All = Build();
    private static readonly Dictionary<string, RightInfo> ByKey = All.ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);
    public static readonly string[] AllKeys = All.Select(x => x.Key).ToArray();
    public static RightInfo? Find(string? key) => key is null ? null : ByKey.GetValueOrDefault(key);

    /// <summary>The canonical key for any spelling of a known key; unknown keys never acquire authority.</summary>
    public static bool TryCanonical(string? key, out string canonical)
    {
        var info = Find(key);
        canonical = info?.Key ?? "";
        return info is not null;
    }

    private static RightInfo[] Build()
    {
        var result = new List<RightInfo>();
        void Add(string key, string label, string description, string module, string feature, string featureLabel, string action, string risk, bool scope, params string[] requires) =>
            result.Add(new(key, label, description, module, feature, featureLabel, action, IsAccess(action) ? "Access" : "Action", risk, scope, requires, result.Count));

        Add(RightKeys.Administration, "Administration", "Enter administration. Each administration feature also needs its own right. Holders cannot receive individual exceptions as allows.", "Administration", "Platform", "Platform-wide controls", "Administration", "High", false);
        Add(RightKeys.PlatformExport, "Export files", "Allow exporting at all. Each source also needs its own Export right.", "Administration", "Platform", "Platform-wide controls", "Export", "High", false);
        Add(RightKeys.TechnicalDetail, "Technical detail", "See and edit network zones and firewall rules.", "Administration", "Platform", "Platform-wide controls", "TechnicalDetail", "High", false);
        Add(RightKeys.Audit, "Change history", "Read who changed what and when. Each source also needs its own history right.", "Administration", "Platform", "Platform-wide controls", "Audit", "High", false);

        Add(RightKeys.ClientsAccess, "Open the clients page", "Open the client list and the client page shell. Each tab and action needs its own right.", "Clients", RightKeys.Structure, "Client structure", "Access", "Normal", false);

        foreach (var r in Resources)
        {
            var record = r.Actions.Contains(RightKeys.DetailsView);
            foreach (var action in r.Actions)
            {
                var risk = action is RightKeys.Delete or RightKeys.AttachmentsDelete or RightKeys.Export ? "High" : "Normal";
                var scope = r.Resource is not (RightKeys.Dashboard or RightKeys.Reporting or RightKeys.PersonalNotes or RightKeys.Notifications);
                Add(RightKeys.KeyOf(r.Resource, action), ActionLabel(action), Description(r.Resource, r.Label, action), r.Module, r.Resource, r.Label, action, risk, scope, ResourceRequires(r.Resource, action));
            }
        }
        foreach (var tab in Tabs)
        {
            var module = Resources.First(r => r.Resource == tab.Resource).Module;
            string[] requires = tab.Resource == RightKeys.Structure ? [RightKeys.ClientsAccess, .. tab.Sources] : tab.Sources;
            Add(RightKeys.Tab(tab.Resource, tab.Key), $"{tab.Label} tab", "See this tab's data. The source rights and record scope also apply.", module, tab.Resource, Resources.First(r => r.Resource == tab.Resource).Label, RightKeys.View, "Normal", false, requires);
        }
        foreach (var (resource, key, actions) in TabActions)
        {
            var tab = Tabs.First(t => t.Resource == resource && t.Key == key);
            var owner = Resources.First(r => r.Resource == resource);
            foreach (var action in actions)
            {
                var source = key == "contacts" ? RightKeys.Other : resource;
                var sourceAction = key is "jira" or "conditions" ? RightKeys.Maintain : action;
                Add(RightKeys.Tab(resource, key, action), $"{tab.Label}: {(action == RightKeys.Maintain ? "edit" : action == RightKeys.ArchiveRestore ? "archive and restore" : action.ToLowerInvariant())}",
                    $"{action} within this section. The matching record right is also required.", owner.Module, resource, owner.Label, action, "Normal", false,
                    RightKeys.Tab(resource, key), RightKeys.KeyOf(source, sourceAction));
            }
        }
        foreach (var f in Features)
            foreach (var action in f.Actions)
            {
                string[] requires = action == RightKeys.View ? f.ViewNeeds is null ? [] : [f.ViewNeeds] : [RightKeys.KeyOf(f.Resource, RightKeys.View)];
                Add(RightKeys.KeyOf(f.Resource, action), action == RightKeys.Maintain ? "Edit" : action, $"{action} in {f.Label}. Data, ownership and scope checks still apply.",
                    f.Module, f.Resource, f.Label, action, f.Module == "Administration" ? "High" : "Normal", false, requires);
            }
        return result.ToArray();
    }

    private static bool IsAccess(string action) => action is RightKeys.View or RightKeys.DetailsView or RightKeys.HistoryView or RightKeys.AttachmentsView or "Access";

    private static string[] ResourceRequires(string resource, string action)
    {
        var view = RightKeys.KeyOf(resource, RightKeys.View);
        var details = RightKeys.KeyOf(resource, RightKeys.DetailsView);
        var attachments = RightKeys.KeyOf(resource, RightKeys.AttachmentsView);
        return action switch
        {
            RightKeys.AttachmentsUpload or RightKeys.AttachmentsDeleteOwn or RightKeys.AttachmentsDelete => [attachments],
            RightKeys.AttachmentsView => [details],
            RightKeys.HistoryView => [details, RightKeys.Audit],
            RightKeys.Export => [view, RightKeys.PlatformExport],
            RightKeys.DetailsView or RightKeys.Create or RightKeys.Maintain or RightKeys.Coordinate or RightKeys.ArchiveRestore or RightKeys.Delete or "Download" => [view],
            // These screens combine rows from several independent resources: fail closed unless the caller can read all of them.
            RightKeys.View when resource == RightKeys.Dashboard => BusinessViewKeysStatic,
            RightKeys.View when resource == RightKeys.Structure => [RightKeys.ClientsAccess],
            _ => []
        };
    }

    /// <summary>All prerequisites, direct and indirect.</summary>
    public static string[] Dependencies(string key)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var pending = new Stack<string>(Find(key)?.Requires ?? []);
        while (pending.TryPop(out var next))
            if (seen.Add(next))
                foreach (var required in Find(next)?.Requires ?? [])
                    pending.Push(required);
        return seen.ToArray();
    }

    /// <summary>
    /// The effective rights of a set of assigned rights: known, active keys whose prerequisites are all present, repeated until stable,
    /// so a missing prerequisite anywhere in a chain fails closed.
    /// </summary>
    public static string[] Resolve(IEnumerable<string> assigned, ISet<string>? active = null)
    {
        var keys = assigned.Where(k => Find(k) != null && (active == null || active.Contains(k))).ToHashSet(StringComparer.OrdinalIgnoreCase);
        while (keys.RemoveWhere(key => Find(key)!.Requires.Any(required => !keys.Contains(required))) > 0) { }
        return keys.Order(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    /// <summary>The rights a change could activate: anything added, and anything already held elsewhere that an added right completes.</summary>
    public static string[] GrantCandidates(IEnumerable<string> existing, IEnumerable<string> requested, bool enabling = false, IEnumerable<string>? otherAssignments = null)
    {
        var current = existing.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var proposed = requested.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = proposed.Except(current, StringComparer.OrdinalIgnoreCase).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return proposed.Concat(otherAssignments ?? []).Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(k => enabling && proposed.Contains(k) || added.Contains(k) || Dependencies(k).Any(added.Contains)).ToArray();
    }

    /// <summary>Default grants of a freshly created Operation Engineer role. Existing roles are never touched by this list.</summary>
    public static string[] EngineerDefault => All.Where(r => r.Module != "Administration" || r.Key is RightKeys.PlatformExport or RightKeys.TechnicalDetail or RightKeys.Audit or "AdminAudit:View")
        .Where(r => !(BusinessResources.Contains(r.Feature) && !r.Key.StartsWith("tab.", StringComparison.Ordinal)
            && r.Action is RightKeys.Coordinate or RightKeys.ArchiveRestore or RightKeys.Delete or RightKeys.AttachmentsDelete))
        .Where(r => r.Key is not ("ClientStructure:Create" or "Teams:Create" or "Teams:Maintain" or "Handovers:Create" or "Handovers:Maintain"))
        .Where(r => !(r.Key != "tab.ClientStructure.contacts:Create" && r.Key.StartsWith("tab.ClientStructure.", StringComparison.Ordinal) && r.Action is RightKeys.Create or RightKeys.ArchiveRestore or RightKeys.Delete))
        .Select(r => r.Key).ToArray();

    private static string ActionLabel(string action) => action switch
    {
        RightKeys.View => "View pages and records",
        RightKeys.DetailsView => "View record details",
        RightKeys.HistoryView => "View record history",
        RightKeys.AttachmentsView => "View and download attachments",
        RightKeys.AttachmentsUpload => "Upload and describe attachments",
        RightKeys.AttachmentsDeleteOwn => "Delete own attachments",
        RightKeys.AttachmentsDelete => "Delete any attachment",
        RightKeys.Export => "Export module data",
        RightKeys.Create => "Create",
        RightKeys.Maintain => "Edit existing records",
        RightKeys.Coordinate => "Coordinate workflow and assignment",
        RightKeys.ArchiveRestore => "Archive and restore",
        RightKeys.Delete => "Permanently delete unused records",
        _ => action
    };

    private static string Description(string resource, string label, string action)
    {
        var lower = label.ToLowerInvariant();
        return action switch
        {
            RightKeys.View when resource == RightKeys.Dashboard => "Open the Operations Command Center and its combined measures. Source module View rights are also required.",
            RightKeys.View when resource == RightKeys.Reporting => "Use the Reporting Center. Report data also needs its source View rights and the Export files right.",
            RightKeys.View when resource == RightKeys.PersonalNotes => "Access your own notebooks, pages and files. Ownership restrictions always apply.",
            RightKeys.View when resource == RightKeys.Notifications => "Access your own notification center and unread counts. Other users' notices remain private.",
            RightKeys.View => $"Open {lower} pages and read their records. Required before any action in this module.",
            RightKeys.DetailsView => "Open record detail pages and their detail API endpoints.",
            RightKeys.HistoryView => "Read this module's business change history. Record details and the Change history right are also required.",
            RightKeys.AttachmentsView => "List, preview and download attachments belonging to records in this module.",
            RightKeys.AttachmentsUpload => "Upload files and update attachment descriptions, independently of record editing. Record scope is required.",
            RightKeys.AttachmentsDeleteOwn => "Remove only files you uploaded in this module. Record scope is required.",
            RightKeys.AttachmentsDelete => "Remove any file belonging to an authorized record in this module, independently of deleting the record itself.",
            RightKeys.Export => "Export this module's data through list downloads and reports. The Export files right and data scope also apply.",
            RightKeys.Create when resource == RightKeys.Structure => "Create clients, sub-clients and regions.",
            RightKeys.Create when resource == RightKeys.Projects => "Create projects independently of client structure rights.",
            RightKeys.Maintain when resource == RightKeys.Structure => "Edit existing clients and regions.",
            RightKeys.Maintain when resource == RightKeys.Projects => "Edit existing projects independently of client structure rights.",
            RightKeys.Create => $"Create {lower}.",
            RightKeys.Maintain => $"Edit existing {lower} records.",
            RightKeys.Coordinate when resource == RightKeys.Structure => "Manage client structure and assign client and region owners.",
            RightKeys.Coordinate when resource == RightKeys.Cases => "Triage cases, assign owners, change contracts and coordinate case workflow.",
            RightKeys.Coordinate when resource == RightKeys.Commitments => "Revise, complete, cancel and reopen commitments.",
            RightKeys.Coordinate when resource == RightKeys.Teams => "Manage teams, membership, coverage, handovers and reassignment.",
            RightKeys.Coordinate => $"Coordinate {lower} workflow.",
            RightKeys.ArchiveRestore => $"Archive and restore {lower}.",
            RightKeys.Delete => $"Permanently delete unused {lower} records.",
            _ => action
        };
    }

    /// <summary>Keeps the stored definitions equal to this catalog. Removed keys are deactivated, never deleted, so assignments stay reviewable.</summary>
    public static async Task SynchronizeAsync(HubDbContext db, CancellationToken ct = default)
    {
        // All instances share this database mutex, so simultaneous starts cannot insert the same immutable key twice.
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var locked = await db.Database.ExecuteSqlRawAsync("UPDATE [iam].[AuthorizationVersion] WITH (UPDLOCK,HOLDLOCK) SET [Version] = [Version] WHERE [Id] = 1", ct);
        if (locked != 1) throw new InvalidOperationException("The authorization version record is missing; apply the reviewed database migration.");
        var stored = await db.RightDefinitions.ToListAsync(ct);
        var byKey = stored.ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);
        foreach (var right in All)
        {
            if (!byKey.TryGetValue(right.Key, out var row))
            {
                row = new RightDefinition { Key = right.Key };
                db.RightDefinitions.Add(row);
            }
            row.Label = right.Label;
            row.Description = right.Description;
            row.Module = right.Module;
            row.Feature = right.Feature;
            row.Kind = right.Kind;
            row.RiskLevel = right.RiskLevel;
            row.DisplayOrder = right.DisplayOrder;
            row.IsActive = true;
        }
        foreach (var stale in stored.Where(x => Find(x.Key) is null)) stale.IsActive = false;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}

/// <summary>The protected TIO Manager role always holds every right, so administration can never be lost. Operation Engineer can be changed like any other role.</summary>
public static class BuiltInRoles
{
    public const string ManagerKey = "Manager";
    public const string EngineerKey = "Engineer";

    /// <summary>The rights a role carries. The protected role holds the whole catalog, whatever is stored.</summary>
    public static IEnumerable<string> KeysOf(AppRole role) => role.IsLocked ? RightsCatalog.AllKeys : role.Rights.Select(p => p.RightKey);

    /// <summary>Creates the two built-in roles when missing and returns their ids by key (seeds and bootstrap).</summary>
    public static async Task<Dictionary<string, long>> EnsureAsync(HubDbContext db, CancellationToken ct)
    {
        var roles = await db.AppRoles.Where(r => r.Key != null).ToListAsync(ct);
        AppRole Get(string key, string name, string description, string[] rights)
        {
            var role = roles.FirstOrDefault(x => x.Key == key);
            if (role is not null) return role;
            role = new AppRole { Key = key, Name = name, Description = description };
            foreach (var right in rights) role.Rights.Add(new RoleRight { RightKey = right });
            db.AppRoles.Add(role);
            roles.Add(role);
            return role;
        }
        var manager = Get(ManagerKey, "TIO Manager", "Runs the TIO team; administers the hub. Always holds every right.", RightsCatalog.AllKeys);
        var engineer = Get(EngineerKey, "Operation Engineer", "Day-to-day operations work on every client.", RightsCatalog.EngineerDefault);
        if (manager.Id == 0 || engineer.Id == 0) await db.SaveChangesAsync(ct);
        return new() { [ManagerKey] = manager.Id, [EngineerKey] = engineer.Id };
    }
}
