using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Modules.Jira;

public enum JiraAuthMode { ApiTokenBasic, ScopedApiToken }
public enum JiraSecretProvider { DataProtected, EnvironmentVariable }
public enum JiraMappingSource { Created, Adopted }
public enum JiraActivityType { Status, Assignee, Field }
public enum JiraSyncType { Initial, Incremental, FullReconciliation }
public enum JiraSyncTrigger { Schedule, Startup, Manual }
public enum JiraSyncStatus { Running, Success, Warning, Failed, Skipped }
public enum JiraIssueStatus { Open, Resolved, Dismissed }
public enum JiraIssueType
{
    DuplicateCaseCandidate, MissingUserMapping, UnknownWorkflowStatus, WorkflowTransitionBlocked, ClientOwnershipConflict,
    SpaceReassignment, IssueMovedBetweenSpaces, MissingCaseInformation, FailedCommentImport, FailedActivityImport,
    InvalidExternalReference, FailedIssueImport
}

/// <summary>A76: one Jira Cloud site the hub reads from. The API token is never stored on this row (see <see cref="JiraCredential"/>).</summary>
public class JiraConnection : Entity
{
    public string Name { get; set; } = "";
    /// <summary>Normalized https://site.atlassian.net, no path.</summary>
    public string SiteUrl { get; set; } = "";
    public JiraAuthMode AuthMode { get; set; }
    public string? AccountEmail { get; set; }
    public string? CloudId { get; set; }
    public bool IsEnabled { get; set; } = true;
    /// <summary>Where manual and imported references of this site are listed (existing Customer Cloud Jira instance).</summary>
    public long JiraInstanceId { get; set; }
    public JiraInstance? JiraInstance { get; set; }
    public JiraSecretProvider SecretProvider { get; set; }
    /// <summary>Provider-specific pointer, never the secret: the environment variable name, or the row marker of the protected credential.</summary>
    public string? SecretReference { get; set; }
    public DateTimeOffset? CredentialRotatedAt { get; set; }
    public string? AccountTimeZone { get; set; }
    public DateTimeOffset? LastTestAt { get; set; }
    public bool? LastTestOk { get; set; }
    public int? LastTestDurationMs { get; set; }
    public string? LastTestJson { get; set; }
    public DateTimeOffset? LastSuccessfulTestAt { get; set; }
    public DateTimeOffset? LastDiscoveryAt { get; set; }
    public string? LastDiscoveryError { get; set; }
    /// <summary>Jira custom fields shown under Jira details, by display name, separated by semicolons.</summary>
    public string DetailFieldNames { get; set; } = "Ticket Classification;Application Component;Program";
}

/// <summary>The protected token of a connection. Separate table, never audited, never selected by an API read.</summary>
public class JiraCredential
{
    public long JiraConnectionId { get; set; }
    public string Ciphertext { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
    public long? UpdatedById { get; set; }
}

/// <summary>A Jira space (project) seen by discovery. Discovery never assigns a space to a client.</summary>
public class JiraDiscoveredSpace
{
    public long Id { get; set; }
    public long JiraConnectionId { get; set; }
    public string JiraProjectId { get; set; } = "";
    public string ProjectKey { get; set; } = "";
    public string ProjectName { get; set; } = "";
    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    /// <summary>The last discovery did not return it (deleted, or the account lost access).</summary>
    public bool Missing { get; set; }
}

/// <summary>Per-client settings; what Jira cannot provide for a new case is configured here and never guessed.</summary>
public class ClientJiraSettings : Entity
{
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public bool IsEnabled { get; set; }
    public long? JiraConnectionId { get; set; }
    public long? DefaultResponsibleTeamId { get; set; }
    public string? DefaultCaseType { get; set; }
    public Priority DefaultPriority { get; set; } = Priority.Normal;
    public int NextReviewHours { get; set; } = 48;
    public bool ImportDoneIssues { get; set; }
    public DateOnly? ImportFrom { get; set; }
    public bool SyncOnStartup { get; set; }
    public bool FullReconciliation { get; set; } = true;
    public int FullReconciliationDays { get; set; } = 7;
    public int SyncIntervalMinutes { get; set; } = 15;
    /// <summary>Enabling needs a completed dry run.</summary>
    public DateTimeOffset? LastPreviewAt { get; set; }
}

/// <summary>Validated ownership: one active client per connection and Jira project (filtered unique index).</summary>
public class ClientJiraSpace : Entity
{
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public long JiraConnectionId { get; set; }
    public JiraConnection? JiraConnection { get; set; }
    public string JiraProjectId { get; set; } = "";
    public string ProjectKey { get; set; } = "";
    public string ProjectName { get; set; } = "";
    public bool IsEnabled { get; set; } = true;
    /// <summary>A84: the contract of cases created from this space. Not a foreign key: a deleted contract reads as none.</summary>
    public long? ContractId { get; set; }
    /// <summary>Set when released or reassigned; the row stays as history and its cases stay with the client.</summary>
    public DateTimeOffset? ReleasedAt { get; set; }
    public string? ReleaseReason { get; set; }
}

/// <summary>Checkpoints and lease of one assigned space. Not audited: it changes on every run.</summary>
public class JiraSpaceSyncState
{
    public long ClientJiraSpaceId { get; set; }
    public DateTimeOffset? IssueCheckpoint { get; set; }
    public DateTimeOffset? LastRunAt { get; set; }
    public DateTimeOffset? LastSuccessAt { get; set; }
    public DateTimeOffset? LastFullAt { get; set; }
    public JiraSyncStatus? LastStatus { get; set; }
    public string? LastError { get; set; }
    public int ConsecutiveFailures { get; set; }
    public bool ForceFullNext { get; set; }
    public DateTimeOffset? ManualRequestedAt { get; set; }
    /// <summary>Claimed by a conditional update, so several servers run one space at a time.</summary>
    public string? LeaseOwner { get; set; }
    public DateTimeOffset? LeaseUntil { get; set; }
}

/// <summary>Maps an immutable Jira issue to one real case. A null case means the case was deleted; the issue is not imported again.</summary>
public class JiraCaseMapping
{
    public long Id { get; set; }
    public long JiraConnectionId { get; set; }
    public JiraConnection? JiraConnection { get; set; }
    public string JiraIssueId { get; set; } = "";
    public string IssueKey { get; set; } = "";
    public string JiraProjectId { get; set; } = "";
    public long ClientId { get; set; }
    public long ClientJiraSpaceId { get; set; }
    public long? CaseId { get; set; }
    public Case? Case { get; set; }
    public JiraMappingSource Source { get; set; }
    public string Url { get; set; } = "";
    public string? Summary { get; set; }
    public string? DescriptionText { get; set; }
    public string? StatusId { get; set; }
    public string? StatusName { get; set; }
    public string? StatusCategory { get; set; }
    public string? PriorityName { get; set; }
    public string? IssueTypeName { get; set; }
    public string? AssigneeAccountId { get; set; }
    public string? AssigneeName { get; set; }
    public string? ReporterName { get; set; }
    public DateTimeOffset? JiraCreatedAt { get; set; }
    public DateTimeOffset? JiraUpdatedAt { get; set; }
    public DateOnly? JiraDueDate { get; set; }
    public string? Resolution { get; set; }
    public string? Labels { get; set; }
    public string? Components { get; set; }
    public string? DetailsJson { get; set; }
    public DateTimeOffset LastSyncedAt { get; set; }
    /// <summary>The Jira values already applied to the case; a difference is retried without a new Jira request.</summary>
    public string? AppliedAssigneeAccountId { get; set; }
    public string? AppliedStatusId { get; set; }
    /// <summary>The owner shown on the case came from this issue's assignee.</summary>
    public bool OwnerFromJira { get; set; }
    /// <summary>The issue version whose comments and changelog were imported completely; a failed import is retried.</summary>
    public DateTimeOffset? ChildrenSyncedFor { get; set; }
    public DateTimeOffset? MissingInJiraAt { get; set; }
}

public class JiraUserMapping : Entity
{
    public long JiraConnectionId { get; set; }
    public string JiraAccountId { get; set; } = "";
    public string? JiraDisplayName { get; set; }
    public long? TioUserId { get; set; }
    /// <summary>A79: instead of a hub user, the client's contact this Jira user represents. Not a foreign key: a deleted contact reads as unmapped.</summary>
    public long? ClientContactId { get; set; }
    public User? TioUser { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
}

/// <summary>Validated mapping of a Jira status. Empty project id = the whole connection; a null target is an unmapped status needing review.</summary>
public class JiraWorkflowStatusMapping : Entity
{
    public long JiraConnectionId { get; set; }
    public string JiraProjectId { get; set; } = "";
    public string JiraStatusId { get; set; } = "";
    public string JiraStatusName { get; set; } = "";
    public string? JiraStatusCategory { get; set; }
    public string? TargetStatusCode { get; set; }
}

public class JiraComment
{
    public long Id { get; set; }
    public long JiraConnectionId { get; set; }
    public string JiraCommentId { get; set; } = "";
    public string JiraIssueId { get; set; } = "";
    public long CaseId { get; set; }
    public string? AuthorAccountId { get; set; }
    public string? AuthorName { get; set; }
    public string BodyText { get; set; } = "";
    public DateTimeOffset JiraCreatedAt { get; set; }
    public DateTimeOffset? JiraUpdatedAt { get; set; }
    public string? VisibilityType { get; set; }
    public string? VisibilityValue { get; set; }
    /// <summary>The body looked like a credential (IAM-03), so it was not stored; read it in Jira.</summary>
    public bool Withheld { get; set; }
    public DateTimeOffset? DeletedInJiraAt { get; set; }
    public DateTimeOffset ImportedAt { get; set; }
}

public class JiraActivity
{
    public long Id { get; set; }
    public long JiraConnectionId { get; set; }
    /// <summary>Changelog history id and item position.</summary>
    public string ExternalEventId { get; set; } = "";
    public string JiraIssueId { get; set; } = "";
    public long CaseId { get; set; }
    public JiraActivityType Type { get; set; }
    public string Field { get; set; } = "";
    public string? ActorName { get; set; }
    public DateTimeOffset At { get; set; }
    public string? FromValue { get; set; }
    public string? ToValue { get; set; }
    public DateTimeOffset ImportedAt { get; set; }
}

/// <summary>A local comment. There is no code path from this table to Jira.</summary>
public class CaseComment
{
    public long Id { get; set; }
    public long CaseId { get; set; }
    public long AuthorId { get; set; }
    public User? Author { get; set; }
    public string Body { get; set; } = "";
    public DateTimeOffset At { get; set; }
}

public class JiraSyncRun
{
    public long Id { get; set; }
    public long JiraConnectionId { get; set; }
    public long? ClientId { get; set; }
    public long? ClientJiraSpaceId { get; set; }
    public string? ProjectKey { get; set; }
    public JiraSyncType Type { get; set; }
    public JiraSyncTrigger Trigger { get; set; }
    public JiraSyncStatus Status { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? EndedAt { get; set; }
    public int IssuesRetrieved { get; set; }
    public int CasesCreated { get; set; }
    public int CasesUpdated { get; set; }
    public int CommentsImported { get; set; }
    public int ActivitiesImported { get; set; }
    public int FailedRecords { get; set; }
    public string? Error { get; set; }
}

/// <summary>Import review and conflict queue. A repeat of the same problem updates its open row (filtered unique fingerprint).</summary>
public class JiraIntegrationIssue : Entity
{
    public JiraIssueType Type { get; set; }
    public JiraIssueStatus Status { get; set; }
    public string Fingerprint { get; set; } = "";
    public long JiraConnectionId { get; set; }
    public long? ClientId { get; set; }
    public string? ProjectKey { get; set; }
    public string? JiraProjectId { get; set; }
    public string? JiraIssueId { get; set; }
    public string? IssueKey { get; set; }
    public long? CaseId { get; set; }
    public long? CandidateCaseId { get; set; }
    /// <summary>The Jira account or status the problem is about.</summary>
    public string? Subject { get; set; }
    public string Description { get; set; } = "";
    public string SuggestedAction { get; set; } = "";
    public DateTimeOffset LastSeenAt { get; set; }
    public int Occurrences { get; set; } = 1;
    /// <summary>Adopt, CreateNew, Ignore, Mapped, Automatic…: decides what the next run does with the issue.</summary>
    public string? Resolution { get; set; }
    public string? ResolutionNote { get; set; }
    public long? ResolvedById { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
