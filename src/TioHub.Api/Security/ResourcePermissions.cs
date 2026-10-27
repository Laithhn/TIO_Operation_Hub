using TioHub.Api.Common;

namespace TioHub.Api.Security;

public sealed record ResourcePermissionInfo(string Key, string Resource, string ResourceLabel, string Action, string ActionLabel, string Description);

/// <summary>A63 resource/action catalog and compatibility mapping for existing broad role rights.</summary>
public static class ResourcePermissions
{
    public const string Structure = "ClientStructure";
    public const string Contracts = "Contracts";
    public const string Environments = "Environments";
    public const string Servers = "Servers";
    public const string Installations = "Installations";
    public const string Products = "Products";
    public const string Cases = "Cases";
    public const string Commitments = "Commitments";
    public const string Teams = "Teams";
    public const string Other = "OtherOperations";

    public const string Maintain = "Maintain";
    public const string Create = "Create";
    public const string Coordinate = "Coordinate";
    public const string ArchiveRestore = "ArchiveRestore";
    public const string Delete = "Delete";

    private static readonly (string Resource, string Label, string[] Actions)[] Resources =
    [
        (Structure, "Client structure", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Contracts, "Contracts", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Environments, "Environments", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Servers, "Servers", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Installations, "Installations", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Products, "Products", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Cases, "Cases", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Commitments, "Commitments", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Teams, "Teams and handovers", [Create, Maintain, Coordinate, ArchiveRestore, Delete]),
        (Other, "Other operations", [Create, Maintain, Coordinate, ArchiveRestore, Delete])
    ];

    public static readonly ResourcePermissionInfo[] Catalog = Resources
        .SelectMany(r => r.Actions.Select(a => new ResourcePermissionInfo(
            KeyOf(r.Resource, a), r.Resource, r.Label, a, ActionLabel(a), Description(r.Resource, a))))
        .ToArray();

    public static string KeyOf(string resource, string action) => $"{resource}:{action}";

    /// <summary>Shared record actions must use the owning module's permission, never an action granted for another module.</summary>
    public static string ForRecord(string recordType) => recordType switch
    {
        RecordTypes.Client or RecordTypes.Region or RecordTypes.Project or "Organization" or "OrganizationRelationship" => Structure,
        RecordTypes.Contract => Contracts,
        RecordTypes.Environment => Environments,
        RecordTypes.Asset or RecordTypes.Component or RecordTypes.Volume or "SharedStorage" => Servers,
        RecordTypes.Installation => Installations,
        "Product" or "ProductModule" or "ProductVersion" => Products,
        RecordTypes.Case => Cases,
        RecordTypes.Commitment => Commitments,
        "Team" or RecordTypes.Handover => Teams,
        RecordTypes.Contact or RecordTypes.Boundary or RecordTypes.Escalation or "FirewallRule" => Other,
        _ => throw new NotFoundException("The record type")
    };

    public static bool TryParse(string key, out string resource, out string action)
    {
        var row = Catalog.FirstOrDefault(x => string.Equals(x.Key, key, StringComparison.OrdinalIgnoreCase));
        resource = row?.Resource ?? "";
        action = row?.Action ?? "";
        return row is not null;
    }

    public static string[] All => Catalog.Select(x => x.Key).ToArray();

    public static string[] EngineerDefault =>
    [
        KeyOf(Structure, Maintain),
        .. new[] { Contracts, Environments, Servers, Installations, Products, Cases, Commitments, Other }
            .SelectMany(r => new[] { KeyOf(r, Create), KeyOf(r, Maintain) })
    ];

    public static string[] ExpandLegacy(Right rights)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (rights.HasFlag(Right.Edit))
        {
            result.Add(KeyOf(Structure, Maintain));
            foreach (var resource in new[] { Contracts, Environments, Servers, Installations, Products, Cases, Commitments, Other })
                foreach (var action in new[] { Create, Maintain }) result.Add(KeyOf(resource, action));
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
            foreach (var permission in Catalog.Where(x => x.Action == Delete)) result.Add(permission.Key);
        return [.. result];
    }

    public static Right CrossCutting(Right rights) => rights & (Right.Export | Right.TechnicalDetail | Right.Audit | Right.Administer);

    private static string ActionLabel(string action) => action switch
    {
        Create => "Create",
        Maintain => "Edit existing records",
        Coordinate => "Coordinate workflow and assignment",
        ArchiveRestore => "Archive and restore",
        Delete => "Permanently delete unused records",
        _ => action
    };

    private static string Description(string resource, string action) => action switch
    {
        Create when resource == Structure => "Create clients, sub-clients, regions and projects.",
        Maintain when resource == Structure => "Edit existing clients, regions and projects. Owner and project-manager assignment needs Coordinate.",
        Create => $"Create {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()}.",
        Maintain => $"Edit existing {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} records.",
        Coordinate when resource == Structure => "Manage structure and assign project managers and record owners.",
        Coordinate when resource == Cases => "Triage cases, assign owners, change contracts and coordinate case workflow.",
        Coordinate when resource == Commitments => "Revise, complete, cancel and reopen commitments.",
        Coordinate when resource == Teams => "Manage teams, membership, coverage, handovers and reassignment.",
        Coordinate => $"Coordinate {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} workflow.",
        ArchiveRestore => $"Archive and restore {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()}.",
        Delete => $"Permanently delete unused {Resources.First(r => r.Resource == resource).Label.ToLowerInvariant()} records.",
        _ => action
    };
}
