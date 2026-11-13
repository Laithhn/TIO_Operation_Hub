using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Teams;

namespace TioHub.Api.Modules.Commitments;

/// <summary>
/// COM-01…05: an owned promise with a deadline in its original IANA zone. Status is Open/Completed/Cancelled only;
/// timeliness is derived and stored at completion against the deadline then in force.
/// </summary>
public class Commitment : Entity, IClientOwned, IAccountable
{
    public string Ref { get; set; } = null!;
    public WorkScope Scope { get; set; }
    public long? ClientId { get; set; }
    public Client? Client { get; set; }
    /// <summary>Internal team scope (required for internal commitments).</summary>
    public long? ResponsibleTeamId { get; set; }
    public Team? ResponsibleTeam { get; set; }
    /// <summary>A114: short name of the promise (required). Existing commitments took it from the first 200 characters of their description.</summary>
    public string Title { get; set; } = "";
    /// <summary>A114: optional longer text (empty when none).</summary>
    public string Description { get; set; } = "";
    public CommitmentType Type { get; set; }
    /// <summary>A114: Ours (we deliver) or External (an external party delivers to us).</summary>
    public CommitmentDirection Direction { get; set; } = CommitmentDirection.Ours;
    /// <summary>A114: the external party of an External commitment: a standalone organization (no client), shared across clients.</summary>
    public long? ExternalOrganizationId { get; set; }
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    /// <summary>Free text before A114; for External commitments it holds the external party's name, kept in step at every save.</summary>
    public string? ResponsibleOrganization { get; set; }
    public long? CoordinatorUserId { get; set; }
    public DateTimeOffset OriginalDueAt { get; set; }
    public DateTimeOffset CurrentDueAt { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public DateTimeOffset? NextReviewAt { get; set; }
    public CommitmentStatus Status { get; set; } = CommitmentStatus.Open;
    public DateTimeOffset? CompletedAt { get; set; }
    public string? CompletionEvidence { get; set; }
    /// <summary>Deadline in force when completed, so later analysis is against the right date (DAS-07).</summary>
    public DateTimeOffset? DueAtCompletion { get; set; }
    public bool? CompletedLate { get; set; }
    /// <summary>A114: when completed late, the dependency whose delivery made it late (set at completion, cleared on reopening).</summary>
    public long? LateCauseCommitmentId { get; set; }
    public string? CancelReason { get; set; }
    public long? CaseId { get; set; }
    public long? ProjectId { get; set; }
    public int RevisionCount { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public long? ScopeClientId => ClientId;
    public List<CommitmentEvent> Events { get; set; } = [];
    /// <summary>A114: the commitments this one waits for.</summary>
    public List<CommitmentDependency> Dependencies { get; set; } = [];
}

/// <summary>Original and every revised deadline, completion, cancellation and reopening with reason, actor and time.</summary>
public class CommitmentEvent
{
    public long Id { get; set; }
    public long CommitmentId { get; set; }
    public CommitmentEventType Type { get; set; }
    public DateTimeOffset? PreviousDueAt { get; set; }
    public DateTimeOffset? NewDueAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? Reason { get; set; }
    public string? Evidence { get; set; }
    /// <summary>A114: a revision caused by this dependency, or the dependency added or removed.</summary>
    public long? CauseCommitmentId { get; set; }
    public long? ById { get; set; }
    public User? By { get; set; }
    public DateTimeOffset At { get; set; }
}

/// <summary>
/// A114: <see cref="CommitmentId"/> can only be delivered <see cref="LeadTimeDays"/> calendar days after <see cref="DependsOnCommitmentId"/> is.
/// Both are in the same client (or internal team) scope; chains are allowed, cycles are not.
/// </summary>
public class CommitmentDependency
{
    public long Id { get; set; }
    public long CommitmentId { get; set; }
    public long DependsOnCommitmentId { get; set; }
    public Commitment? DependsOn { get; set; }
    public int LeadTimeDays { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public long? CreatedById { get; set; }
}
