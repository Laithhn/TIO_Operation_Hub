namespace TioHub.Api.Common;

/// <summary>Base for every editable business record: immutable identity, who and when, and the concurrency token (DAT-01, NFR-04).</summary>
public abstract class Entity
{
    public long Id { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public long? CreatedById { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
    public byte[] RowVersion { get; set; } = [];
}

/// <summary>Records are archived instead of deleted (DAT-05). A named global query filter hides archived rows.</summary>
public interface IArchivable
{
    DateTimeOffset? ArchivedAt { get; set; }
    long? ArchivedById { get; set; }
    string? ArchiveReason { get; set; }
}

/// <summary>Records that live inside one client (or, when the client is null, inside an internal team scope).</summary>
public interface IClientOwned
{
    long? ScopeClientId { get; }
}

/// <summary>OPS-01 accountability: one internal owner plus the organization doing the work. External or unknown responsibility keeps an internal coordinator.</summary>
public interface IAccountable
{
    long? OwnerUserId { get; set; }
    ResponsibleParty ResponsibleParty { get; set; }
    string? ResponsibleOrganization { get; set; }
    long? ResponsibleTeamId { get; set; }
    long? CoordinatorUserId { get; set; }
}

/// <summary>Marks a property as restricted technical detail (IAM-04): masked for users without the Technical detail grant, including in audit and exports.</summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class TechnicalDetailAttribute : Attribute;

/// <summary>Stable record-type names used by reviews, document references, data-quality items, handovers and audit.</summary>
public static class RecordTypes
{
    public const string Client = "Client";
    public const string Region = "Region";
    public const string Project = "Project";
    public const string Contact = "Contact";
    public const string Boundary = "ResponsibilityBoundary";
    public const string Environment = "Environment";
    public const string Installation = "Installation";
    public const string Component = "Component";
    public const string Asset = "Asset";
    public const string Volume = "Volume";
    public const string Case = "Case";
    public const string Commitment = "Commitment";
    public const string Handover = "Handover";
    public const string Contract = "Contract";
    public const string Escalation = "Escalation";

    /// <summary>Record types that carry a meaningful-review policy (OPS-02).</summary>
    public static readonly string[] Reviewable = [Client, Contact, Region, Project, Environment, Installation, Asset, Case, Commitment];

    /// <summary>Record types whose owner can be transferred by a handover.</summary>
    public static readonly string[] Ownable = [Client, Region, Project, Environment, Asset, Component, Case, Commitment, Contract];
}
