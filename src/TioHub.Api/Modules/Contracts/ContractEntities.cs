using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;

namespace TioHub.Api.Modules.Contracts;

// CLI-04 / AC-20 (brought forward from Next): contracts and their recorded SLA terms. Since 2.8.0 (A27) every contract belongs to a project:
// the project carries the client and the supported products; a project can hold several contracts (implementation, then support…).
// CLI-04 / AC-20: contracts and their recorded SLA terms. Recorded terms only — no SLA calendars, compliance calculation or measured results.
// A49 (owner request, 21 Oct 2026): contracts also record their delivery schedule, fees and costs (with a currency) and payment terms; payment
// due dates feed the notifications. These are recorded contract terms, not invoicing or accounting.

public class Contract : Entity, IArchivable, IClientOwned
{
    public string Ref { get; set; } = null!;
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public long ProjectId { get; set; }
    public Project? Project { get; set; }
    public string Title { get; set; } = "";
    /// <summary>The contract or agreement number as written on the document (not a secret; credential-like values are refused).</summary>
    public string? ContractReference { get; set; }
    /// <summary>A34: the configured type (Administration → Configuration); <see cref="TypeCategory"/> keeps the built-in behaviour.</summary>
    public string Type { get; set; } = "";
    public ContractType TypeCategory { get; set; }
    public ContractStatus Status { get; set; } = ContractStatus.Draft;
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    /// <summary>Unknown dates stay null and are shown as Unknown (CLI-04: mark unknown values explicitly).</summary>
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public RenewalTerms RenewalTerms { get; set; }
    public int? NoticeDays { get; set; }
    public SupportModel SupportModel { get; set; }
    /// <summary>Free notes about support hours (before 2.20 the only support-hours field; kept for those notes).</summary>
    public string? SupportHours { get; set; }
    public string? SupportTimeZone { get; set; }
    /// <summary>A49: round-the-clock support; days and hours are then not used.</summary>
    public bool Support24x7 { get; set; }
    public SupportDays SupportDays { get; set; }
    public TimeOnly? SupportFrom { get; set; }
    public TimeOnly? SupportTo { get; set; }
    /// <summary>ISO 4217 code of the amounts in fees and payment terms.</summary>
    public string? Currency { get; set; }
    public List<ContractMilestone> Milestones { get; set; } = [];
    public List<ContractFee> Fees { get; set; } = [];
    public List<ContractPayment> Payments { get; set; } = [];
    public int? OnSiteEngineersRequired { get; set; }
    public string? Coverage { get; set; }
    public string? Obligations { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
    public List<ContractEnvironment> Environments { get; set; } = [];
    public List<SlaTarget> SlaTargets { get; set; } = [];

    /// <summary>Last day to give notice (end date minus notice period), when both are recorded.</summary>
    public DateOnly? NoticeDeadline => EndDate is { } end && NoticeDays is { } n ? end.AddDays(-n) : null;
}

public class ContractEnvironment
{
    public long ContractId { get; set; }
    public long EnvironmentId { get; set; }
    public long ClientId { get; set; }
}

/// <summary>A recorded target from the contract text for one priority. Displayed as "recorded target", never as a compliance result.</summary>
public class SlaTarget
{
    public long Id { get; set; }
    public long ContractId { get; set; }
    public Priority Priority { get; set; }
    public int? ResponseMinutes { get; set; }
    public int? ResolutionMinutes { get; set; }
    public SlaBasis Basis { get; set; }
    public string? Notes { get; set; }
}

/// <summary>A49: support days, Sunday first (the regional working week).</summary>
[Flags]
public enum SupportDays { None = 0, Sunday = 1, Monday = 2, Tuesday = 4, Wednesday = 8, Thursday = 16, Friday = 32, Saturday = 64 }

/// <summary>A49: one row of the contract's delivery schedule.</summary>
public class ContractMilestone
{
    public long Id { get; set; }
    public long ContractId { get; set; }
    public int SortOrder { get; set; }
    public string Phase { get; set; } = "";
    public string? Description { get; set; }
    public int? CompletionPercent { get; set; }
    public DateOnly? Date { get; set; }
}

/// <summary>A49: one line of the contract's fees and costs, in the contract currency.</summary>
public class ContractFee
{
    public long Id { get; set; }
    public long ContractId { get; set; }
    public int SortOrder { get; set; }
    public string Description { get; set; } = "";
    public string? Unit { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
}

public enum PaymentStatus { Pending, Invoiced, Paid, Waived }

/// <summary>A49: a contractual payment condition and its due date; open ones are reminded ahead of time.</summary>
public class ContractPayment
{
    public long Id { get; set; }
    public long ContractId { get; set; }
    public int SortOrder { get; set; }
    public string Condition { get; set; } = "";
    public decimal? Percentage { get; set; }
    public decimal? Amount { get; set; }
    public DateOnly? DueDate { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateOnly? PaidOn { get; set; }
    public string? Notes { get; set; }
}
