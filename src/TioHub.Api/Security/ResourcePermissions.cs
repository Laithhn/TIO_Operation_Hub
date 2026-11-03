using TioHub.Api.Common;

namespace TioHub.Api.Security;

public sealed record ResourcePermissionInfo(string Key, string Resource, string ResourceLabel, string Action, string ActionLabel, string Description);

public sealed record PermissionDefinitionInfo(string Key, string DisplayName, string Description, string Module, string ResourceType,
    string? ParentKey, string Action, string RiskLevel, bool SupportsScope, string NodeType = "Action", int DisplayOrder = 0);

/// <summary>A63 resource/action catalog and compatibility mapping for existing broad role rights.</summary>
public static class ResourcePermissions
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

    private static readonly (string Resource, string Label, string[] Actions)[] Resources =
    [
        (Structure, "Client structure", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Projects, "Projects", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Contracts, "Contracts", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Environments, "Environments", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Servers, "Servers", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Installations, "Installations", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Products, "Products", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Cases, "Cases", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Commitments, "Commitments", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Teams, "Teams and handovers", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Other, "Other operations", [View, Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Dashboard, "Operations dashboard", [View]),
        (Reporting, "Reporting center", [View]),
        (PersonalNotes, "Personal notes", [View, Create, Maintain, Delete, "Download"]),
        (Notifications, "Notifications", [View, Maintain, Delete])
    ];

    public static readonly ResourcePermissionInfo[] Catalog = Resources
        .SelectMany(r => (r.Resource is Dashboard or Reporting or PersonalNotes or Notifications ? r.Actions : [.. r.Actions, DetailsView, HistoryView, AttachmentsView, AttachmentsUpload, AttachmentsDeleteOwn, AttachmentsDelete, Export])
            .Select(a => new ResourcePermissionInfo(
            KeyOf(r.Resource, a), r.Resource, r.Label, a, ActionLabel(a), Description(r.Resource, a))))
        .ToArray();

    /// <summary>Stable legacy actions plus independently grantable hierarchy nodes.</summary>
    public static PermissionDefinitionInfo[] Registry => PermissionHierarchy.Definitions;

    public static string KeyOf(string resource, string action) => $"{resource}:{action}";

    /// <summary>Shared record actions must use the owning module's permission, never an action granted for another module.</summary>
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

    public static bool TryParse(string key, out string resource, out string action)
    {
        var row = Catalog.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase));
        var node = row is null ? PermissionHierarchy.Find(key) : null;
        resource = row?.Resource ?? node?.ResourceType ?? "";
        action = row?.Action ?? node?.Action ?? "";
        return row is not null || node is not null;
    }

    public static string[] All => Registry.Select(x => x.Key).ToArray();

    public static string[] EngineerDefault => PermissionHierarchy.UpgradeLegacy(
    [
        .. Catalog.Where(p => p.Action is View or DetailsView or HistoryView or AttachmentsView or Export).Select(p => p.Key),
        .. Catalog.Where(p => p.Action is AttachmentsUpload or AttachmentsDeleteOwn).Select(p => p.Key),
        KeyOf(Structure, Maintain),
        KeyOf(Projects, Create), KeyOf(Projects, Maintain),
        .. new[] { Contracts, Environments, Servers, Installations, Products, Cases, Commitments, Other }
            .SelectMany(r => new[] { KeyOf(r, Create), KeyOf(r, Maintain) })
    ], BuiltInRoles.EngineerDefault);

    public static string[] ExpandLegacy(Right rights)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        // This translates an explicitly submitted legacy rights payload only. It is never applied on sign-in
        // or registry synchronization, so removing a View assignment remains effective after restarts.
        if (rights != Right.None)
            foreach (var permission in Catalog.Where(x => x.Action is View or DetailsView or HistoryView or AttachmentsView)) result.Add(permission.Key);
        if (rights.HasFlag(Right.Edit))
        {
            result.Add(KeyOf(Structure, Maintain));
            result.Add(KeyOf(Projects, Create));
            result.Add(KeyOf(Projects, Maintain));
            foreach (var resource in new[] { Contracts, Environments, Servers, Installations, Products, Cases, Commitments, Other })
                foreach (var action in new[] { Create, Maintain, AttachmentsUpload, AttachmentsDeleteOwn }) result.Add(KeyOf(resource, action));
            result.Add(KeyOf(Structure, AttachmentsUpload));
            result.Add(KeyOf(Structure, AttachmentsDeleteOwn));
            // Before granular file actions all attachment owners used the broad OtherOperations Maintain permission.
            foreach (var permission in Catalog.Where(x => x.Action is AttachmentsUpload or AttachmentsDeleteOwn)) result.Add(permission.Key);
        }
        if (rights.HasFlag(Right.Manage))
        {
            result.Add(KeyOf(Structure, Create));
            result.Add(KeyOf(Teams, Create));
            foreach (var permission in Catalog.Where(x => x.Action == Coordinate))
                result.Add(permission.Key);
        }
        if (rights.HasFlag(Right.Archive))
            foreach (var permission in Catalog.Where(x => x.Action == ArchiveRestore)) result.Add(permission.Key);
        if (rights.HasFlag(Right.Delete))
            foreach (var permission in Catalog.Where(x => x.Action is Delete or AttachmentsDelete)) result.Add(permission.Key);
        if (rights.HasFlag(Right.Export))
            foreach (var permission in Catalog.Where(x => x.Action == Export)) result.Add(permission.Key);
        return PermissionHierarchy.UpgradeLegacy(result, rights);
    }

    public static Right CrossCutting(Right rights) => rights & (Right.Export | Right.TechnicalDetail | Right.Audit | Right.Administer);

    private static string ActionLabel(string action) => action switch
    {
        View => "View pages and records",
        DetailsView => "View record details",
        HistoryView => "View record history",
        AttachmentsView => "View and download attachments",
        AttachmentsUpload => "Upload and describe attachments",
        AttachmentsDeleteOwn => "Delete own attachments",
        AttachmentsDelete => "Delete any attachment",
        Export => "Export module data",
        Create => "Create",
        Maintain => "Edit existing records",
        Coordinate => "Coordinate workflow and assignment",
        ArchiveRestore => "Archive and restore",
        Delete => "Permanently delete unused records",
        _ => action
    };

    private static string Description(string resource, string action) => action switch
    {
        View when resource == Dashboard => "Open the Operations Command Center and its combined measures. Source module View permissions are also required.",
        View when resource == Reporting => "Use the Reporting Center. Report data also needs its source module View permissions and the separate Export right.",
        View when resource == PersonalNotes => "Access your own notebooks, pages and files. Ownership restrictions always apply.",
        View when resource == Notifications => "Access your own notification center and unread counts. Other users' notices remain private.",
        View => $"Open {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} pages and read their records. Required before any action in this module.",
        DetailsView => "Open record detail pages and their detail API endpoints. Module View is also required.",
        HistoryView => "Read this module's business change history. Record details and the separate Audit right are also required.",
        AttachmentsView => "List, preview and download attachments belonging to records in this module. Record details access is also required.",
        AttachmentsUpload => "Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.",
        AttachmentsDeleteOwn => "Remove only files you uploaded in this module. Attachments access and record scope are required.",
        AttachmentsDelete => "Remove any file belonging to an authorized record in this module independently of deleting the record itself.",
        Export => "Export this module's data through list downloads and reports. The separate Export right and applicable data scope are also required.",
        Create when resource == Structure => "Create clients, sub-clients and regions.",
        Create when resource == Projects => "Create projects independently of client structure permissions.",
        Maintain when resource == Structure => "Edit existing clients and regions.",
        Maintain when resource == Projects => "Edit existing projects independently of client structure permissions.",
        Create => $"Create {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()}.",
        Maintain => $"Edit existing {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} records.",
        Coordinate when resource == Structure => "Manage client structure and assign client and region owners.",
        Coordinate when resource == Cases => "Triage cases, assign owners, change contracts and coordinate case workflow.",
        Coordinate when resource == Commitments => "Revise, complete, cancel and reopen commitments.",
        Coordinate when resource == Teams => "Manage teams, membership, coverage, handovers and reassignment.",
        Coordinate => $"Coordinate {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} workflow.",
        ArchiveRestore => $"Archive and restore {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()}.",
        Delete => $"Permanently delete unused {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} records.",
        _ => action
    };
}
