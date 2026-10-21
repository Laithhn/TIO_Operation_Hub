using TioHub.Api.Common;

namespace TioHub.Api.Modules.Admin;

/// <summary>Administrator-maintained reference list value (NFR-09). Retired values keep their historical meaning.</summary>
public class LookupValue : Entity
{
    public string ListName { get; set; } = "";
    public string Code { get; set; } = "";
    public string Label { get; set; } = "";
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsRetired { get; set; }
    /// <summary>A34: for type lists, the built-in category whose behaviour the value follows (for example a "Container host" server counts as Physical).</summary>
    public string? Category { get; set; }
}

public static class LookupLists
{
    public const string ComponentRole = "ComponentRole";
    public const string AssetRole = "AssetRole";
    public const string NetworkZone = "NetworkZone";
    public const string ProjectPhase = "ProjectPhase";

    public const string BoundaryArea = "BoundaryArea";
    public const string OsFamily = "OsFamily";
    public const string PriorityGuidance = "PriorityGuidance";

    // A34: configurable types; each value belongs to a built-in category.
    public const string EnvironmentType = "EnvironmentType";
    public const string AssetType = "AssetType";
    public const string ContractType = "ContractType";
    public const string CaseType = "CaseType";

    /// <summary>A37: roles offered for a client's project team.</summary>
    public const string TeamRole = "TeamRole";

    /// <summary>A41: the channels an escalation arrives or is raised through (e-mail, formal letter, verbal, Jira…).</summary>
    public const string EscalationChannel = "EscalationChannel";

    public static readonly string[] All = [ComponentRole, AssetRole, NetworkZone, ProjectPhase, BoundaryArea, OsFamily, PriorityGuidance, EnvironmentType, AssetType, ContractType, CaseType, TeamRole, EscalationChannel];

    /// <summary>The category enum of each type list.</summary>
    public static readonly Dictionary<string, Type> Categories = new()
    {
        [EnvironmentType] = typeof(Common.EnvironmentType), [AssetType] = typeof(Common.AssetType),
        [ContractType] = typeof(Common.ContractType), [CaseType] = typeof(Common.CaseType)
    };
}

/// <summary>Application policy values (approved link hosts, vault prefix, coverage policy, upcoming window). Changes are audited.</summary>
public class AppSetting : Entity
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "";
    public string? Description { get; set; }
}

public static class SettingKeys
{
    public const string ApprovedLinkHosts = "ApprovedLinkHosts";
    public const string VaultReferencePrefix = "VaultReferencePrefix";
    public const string CoverageCriticalities = "Coverage.EnvironmentCriticalities";
    public const string CoveragePriorities = "Coverage.CasePriorities";
    public const string UpcomingDays = "Dashboard.UpcomingDays";
    public const string DefaultTimeZone = "DefaultTimeZone";
    /// <summary>A49: how many days ahead a contract payment due date is announced in the notifications.</summary>
    public const string PaymentReminderDays = "Contracts.PaymentReminderDays";
}

/// <summary>Append-only audit (NFR-03). The application login has no UPDATE/DELETE permission on this table in production.</summary>
public class AuditEntry
{
    public long Id { get; set; }
    public DateTimeOffset At { get; set; }
    public long? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = "";
    public string Category { get; set; } = "Business";
    public string EntityType { get; set; } = "";
    public long? EntityId { get; set; }
    public string? EntityLabel { get; set; }
    public long? ClientId { get; set; }
    public long? TeamId { get; set; }
    public string? Reason { get; set; }
    public string? Changes { get; set; }
    public string? CorrelationId { get; set; }
}

/// <summary>NFR-10: who exported which report, with filters, time and row count.</summary>
public class ExportLog
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Report { get; set; } = "";
    public string Filters { get; set; } = "";
    public int RowCount { get; set; }
    public DateTimeOffset At { get; set; }
}
