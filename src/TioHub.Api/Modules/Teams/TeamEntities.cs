using TioHub.Api.Common;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Modules.Teams;

/// <summary>TEAM-01. Teams also act as internal scope for internal cases and commitments.</summary>
public class Team : Entity, IArchivable
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public long? LeadUserId { get; set; }
    public User? Lead { get; set; }
    public long? ManagerUserId { get; set; }
    public User? Manager { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public List<TeamMember> Members { get; set; } = [];
}

/// <summary>Membership with team role, skills and product familiarity. Skills are not performance scores.</summary>
public class TeamMember : Entity
{
    public long TeamId { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
    public string? TeamRole { get; set; }
    public string? Skills { get; set; }
    public string? ProductFamiliarity { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// OPS-05: ownership transfer. Requires receiving-owner acknowledgment, or a Manager exception with reason, follow-up owner and date.
/// Ownership is applied on completion; prior owners are kept on each item.
/// </summary>
public class Handover : Entity, IClientOwned
{
    public string Ref { get; set; } = null!;
    public long? ClientId { get; set; }
    public long OutgoingOwnerId { get; set; }
    public User? OutgoingOwner { get; set; }
    public long ReceivingOwnerId { get; set; }
    public User? ReceivingOwner { get; set; }
    public DateTimeOffset EffectiveAt { get; set; }
    public string Summary { get; set; } = "";
    public string? OutstandingActions { get; set; }
    public string? DocumentationNotes { get; set; }
    public HandoverStatus Status { get; set; } = HandoverStatus.PendingAcknowledgment;
    public DateTimeOffset? AcknowledgedAt { get; set; }
    public string? AcknowledgmentNote { get; set; }
    public string? ExceptionReason { get; set; }
    public long? ExceptionApprovedById { get; set; }
    public long? ExceptionFollowUpOwnerId { get; set; }
    public DateOnly? ExceptionFollowUpDate { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? CancelReason { get; set; }
    public long? ScopeClientId => ClientId;
    public List<HandoverItem> Items { get; set; } = [];
}

public class HandoverItem
{
    public long Id { get; set; }
    public long HandoverId { get; set; }
    public string RecordType { get; set; } = "";
    public long RecordId { get; set; }
    public long? ClientId { get; set; }
    public string? Label { get; set; }
    public long? PreviousOwnerId { get; set; }
    public bool Applied { get; set; }
    public string? NotAppliedReason { get; set; }
}
