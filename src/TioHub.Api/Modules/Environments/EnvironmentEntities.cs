using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;

namespace TioHub.Api.Modules.Environments;

/// <summary>
/// ENV-01 / REG-02: belongs to one client; optionally to one same-client region and project. A null region is a valid
/// direct-client environment. Name is unique within client + region scope, with null region as one direct scope (REG-03).
/// </summary>
public class ClientEnvironment : Entity, IArchivable, IAccountable, IClientOwned
{
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public long? RegionId { get; set; }
    public Region? Region { get; set; }
    public long? ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    /// <summary>Computed column: RegionId or 0, so the unique index treats all direct-client environments as one scope.</summary>
    public long RegionScope { get; private set; }
    /// <summary>A34: the configured type (Administration → Configuration); <see cref="TypeCategory"/> keeps the built-in behaviour.</summary>
    public string Type { get; set; } = "";
    public EnvironmentType TypeCategory { get; set; }
    public string? TypeDescription { get; set; }
    public HostingType Hosting { get; set; } = HostingType.Unknown;
    public string? Location { get; set; }
    public Criticality Criticality { get; set; } = Criticality.Unknown;
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public long? BackupOwnerUserId { get; set; }
    public User? BackupOwner { get; set; }
    /// <summary>Required when there is no backup owner: the explicit coverage gap (ENV-01).</summary>
    public string? BackupGapReason { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    public string? ResponsibleOrganization { get; set; }
    public long? ResponsibleTeamId { get; set; }
    public long? CoordinatorUserId { get; set; }
    public User? Coordinator { get; set; }
    public string? Description { get; set; }

    // Latest supported condition report (ENV-04/05). History lives in ConditionReport.
    public Condition Condition { get; set; } = Condition.Unknown;
    public string? ConditionReason { get; set; }
    public DateTimeOffset? ConditionObservedAt { get; set; }
    public long? ConditionReportId { get; set; }

    // Separately scoped meaningful reviews (OPS-03): condition review is not an inventory review.
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? InventoryReviewedAt { get; set; }
    public DateTimeOffset? DependenciesReviewedAt { get; set; }
    public DateTimeOffset? NextReviewAt { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>Manually reported operating condition with history (ENV-04). Never a live measurement.</summary>
public class ConditionReport
{
    public long Id { get; set; }
    public long EnvironmentId { get; set; }
    public long ClientId { get; set; }
    public Condition Condition { get; set; }
    public string? Reason { get; set; }
    public string? Evidence { get; set; }
    public DateTimeOffset ObservedAt { get; set; }
    public long? RecordedById { get; set; }
    public User? RecordedBy { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
}
