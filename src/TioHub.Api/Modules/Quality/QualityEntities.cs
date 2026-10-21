using TioHub.Api.Common;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Modules.Quality;

/// <summary>OPS-02/04: maximum age and/or explicit next-review rule per record type and review scope. Missing policy is a quality exception.</summary>
public class ReviewPolicy : Entity
{
    public string RecordType { get; set; } = "";
    public ReviewScope Scope { get; set; }
    /// <summary>Positive maximum age in calendar days; null when only the explicit next-review date applies.</summary>
    public int? MaxAgeDays { get; set; }
    public bool UsesNextReviewDate { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public long? PolicyOwnerId { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>OPS-03 meaningful review: reviewer, time, scope checked, verification note and evidence when required. Viewing or unrelated edits never create one.</summary>
public class Review
{
    public long Id { get; set; }
    public string RecordType { get; set; } = "";
    public long RecordId { get; set; }
    public long? ClientId { get; set; }
    public long? EnvironmentId { get; set; }
    public long? TeamId { get; set; }
    public ReviewScope Scope { get; set; }
    public string Note { get; set; } = "";
    public string? Evidence { get; set; }
    public long? ReviewerId { get; set; }
    public User? Reviewer { get; set; }
    public DateTimeOffset ReviewedAt { get; set; }
    public DateTimeOffset? NextReviewAt { get; set; }
}

/// <summary>
/// DAT-06 / RDY-03 exception with an accountable coordinator and next action. Opened and resolved by rule evaluation only,
/// so closing an item can never falsely verify unresolved data.
/// </summary>
public class DataQualityItem : Entity, IClientOwned
{
    public string Rule { get; set; } = "";
    public string RecordType { get; set; } = "";
    public long RecordId { get; set; }
    public long? ClientId { get; set; }
    public long? EnvironmentId { get; set; }
    public long? TeamId { get; set; }
    public string RecordLabel { get; set; } = "";
    /// <summary>Safe detail: never restricted technical values.</summary>
    public string Detail { get; set; } = "";
    public long? CoordinatorUserId { get; set; }
    public User? Coordinator { get; set; }
    public string? NextAction { get; set; }
    public DateTimeOffset? NextReviewAt { get; set; }
    public DataQualityStatus Status { get; set; } = DataQualityStatus.Open;
    public DateTimeOffset OpenedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public string? ResolutionEvidence { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>Approved document link or vault reference attached to a record. A stored link does not prove reachability or access.</summary>
public class DocumentReference : Entity, IArchivable, IClientOwned
{
    public string RecordType { get; set; } = "";
    public long RecordId { get; set; }
    public long? ClientId { get; set; }
    public long? EnvironmentId { get; set; }
    public long? TeamId { get; set; }
    public DocumentKind Kind { get; set; }
    public string Title { get; set; } = "";
    public string Reference { get; set; } = "";
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public DateOnly? ReviewDate { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}
