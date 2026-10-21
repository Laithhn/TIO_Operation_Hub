using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Teams;

namespace TioHub.Api.Modules.Work;

/// <summary>
/// WRK-01…08: hub management record for operational work. Status is independent of any Jira ticket status.
/// Unassigned is an ownership condition (OwnerUserId null), not a status.
/// </summary>
public class Case : Entity, IClientOwned, IAccountable
{
    public string Ref { get; set; } = null!;
    public string Title { get; set; } = "";
    /// <summary>A34: the configured type (Administration → Configuration); <see cref="TypeCategory"/> keeps the built-in behaviour.</summary>
    public string Type { get; set; } = "";
    public CaseType TypeCategory { get; set; }
    public WorkScope Scope { get; set; }
    public long? ClientId { get; set; }
    public Client? Client { get; set; }
    /// <summary>Required: the responsible team. For internal work it is also the access scope.</summary>
    public long? ResponsibleTeamId { get; set; }
    public Team? ResponsibleTeam { get; set; }
    public string ImpactSummary { get; set; } = "";
    public Priority Priority { get; set; } = Priority.Normal;
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public long? BackupOwnerUserId { get; set; }
    public User? BackupOwner { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    public string? ResponsibleOrganization { get; set; }
    public long? CoordinatorUserId { get; set; }
    public CaseStatus Status { get; set; } = CaseStatus.New;
    public string? ProgressSummary { get; set; }
    public WaitingReason? WaitingReason { get; set; }
    public DateTimeOffset? WaitingSince { get; set; }
    public string NextAction { get; set; } = "";
    public DateTimeOffset NextReviewAt { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public string? DueTimeZone { get; set; }
    public string? UnknownEnvironmentReason { get; set; }
    public string? ValidationRequest { get; set; }
    public string? Outcome { get; set; }
    public string? ValidationEvidence { get; set; }
    public string? EvidenceExceptionReason { get; set; }
    public long? EvidenceExceptionApprovedById { get; set; }
    public long? EvidenceExceptionFollowUpOwnerId { get; set; }
    public DateOnly? EvidenceExceptionFollowUpDate { get; set; }
    public string? CancelReason { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public int ReopenCount { get; set; }
    /// <summary>Start of the current cycle after a reopen; creation time otherwise. Age since creation is kept separately (Section 7).</summary>
    public DateTimeOffset CycleStartedAt { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public long? ScopeClientId => ClientId;
    public List<CaseEnvironment> Environments { get; set; } = [];
    public List<CaseAsset> Assets { get; set; } = [];
    public List<CaseComponent> Components { get; set; } = [];
    public List<JiraReference> JiraReferences { get; set; } = [];
    public List<CaseWaitingInterval> WaitingIntervals { get; set; } = [];
}

public class CaseEnvironment { public long CaseId { get; set; } public long EnvironmentId { get; set; } public long ClientId { get; set; } }
public class CaseAsset { public long CaseId { get; set; } public long AssetId { get; set; } public long ClientId { get; set; } }
public class CaseComponent { public long CaseId { get; set; } public long ComponentId { get; set; } public long ClientId { get; set; } }

/// <summary>Waiting is separate from status; intervals give waiting time without pausing any deadline (DAS-04).</summary>
public class CaseWaitingInterval
{
    public long Id { get; set; }
    public long CaseId { get; set; }
    public WaitingReason Reason { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public long? StartedById { get; set; }
    public long? EndedById { get; set; }
}

public enum CaseEventType
{
    Created, Triaged, Started, ValidationRequested, Closed, Cancelled, Reopened, WaitingStarted, WaitingEnded,
    OwnerChanged, PriorityChanged, DueChanged, ScopeChanged, Progress, Reviewed, JiraAdded, JiraRemoved, EvidenceException
}

/// <summary>Timeline (WRK-06): retains previous owner, priority, status, due date and material scope changes with reasons.</summary>
public class CaseEvent
{
    public long Id { get; set; }
    public long CaseId { get; set; }
    public CaseEventType Type { get; set; }
    public string? FromValue { get; set; }
    public string? ToValue { get; set; }
    public string? Note { get; set; }
    public long? ById { get; set; }
    public User? By { get; set; }
    public DateTimeOffset At { get; set; }
}

/// <summary>One of the two disconnected Jira systems. The hub never calls it (Section 3).</summary>
public class JiraInstance : Entity
{
    public string Name { get; set; } = "";
    public JiraInstanceKind Kind { get; set; }
    /// <summary>Approved HTTPS host for ticket links, for example example.atlassian.net.</summary>
    public string ApprovedHost { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

/// <summary>Manual reference: instance + normalized key + approved HTTPS URL (WRK-03). Unique per case/instance/key, not by key alone.</summary>
public class JiraReference : Entity
{
    public long CaseId { get; set; }
    public long? ClientId { get; set; }
    public long JiraInstanceId { get; set; }
    public JiraInstance? JiraInstance { get; set; }
    public string IssueKey { get; set; } = "";
    public string Url { get; set; } = "";
    public string? ReuseReason { get; set; }
    /// <summary>Removal keeps the row and its audit history.</summary>
    public DateTimeOffset? RemovedAt { get; set; }
    public long? RemovedById { get; set; }
}
