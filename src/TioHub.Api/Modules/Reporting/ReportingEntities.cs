using TioHub.Api.Modules.Access;

namespace TioHub.Api.Modules.Reporting;

public enum ExportStatus { Pending, Processing, Completed, Failed, Expired }
public enum ExportFormat { Csv, Xlsx }
public enum ScheduleFrequency { Daily, Weekly, Monthly }

/// <summary>
/// A62: one generated (or failed) export. It belongs to the user it was generated for — only that user can download the file —
/// and keeps the report, the filters, the format, the timing and the outcome for the export history and the audit trail.
/// </summary>
public class ExportJob
{
    public long Id { get; set; }
    /// <summary>Public identifier quoted in the audit trail and in support requests.</summary>
    public Guid AuditId { get; set; } = Guid.NewGuid();
    public long UserId { get; set; }
    public User? User { get; set; }
    public string Report { get; set; } = "";
    public string ReportName { get; set; } = "";
    public ExportFormat Format { get; set; }
    /// <summary>Normalized filters as JSON (key → value), re-used for a retry.</summary>
    public string FiltersJson { get; set; } = "{}";
    /// <summary>Readable filter summary ("Client = DEMO-NTA; Created from = 2026-10-01").</summary>
    public string FilterSummary { get; set; } = "";
    /// <summary>Chosen columns in order (JSON array of keys); empty = all.</summary>
    public string? ColumnsJson { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public ExportStatus Status { get; set; }
    public DateTimeOffset RequestedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? RowCount { get; set; }
    public long? FileSize { get; set; }
    public string? FileName { get; set; }
    /// <summary>Path relative to the export storage folder; null once the file has expired.</summary>
    public string? StoredPath { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public string? Error { get; set; }
    /// <summary>"Reporting Center", "List export" (the download buttons on list pages) or "Schedule".</summary>
    public string Source { get; set; } = "Reporting Center";
    public long? ScheduleId { get; set; }
    public long? RetryOfId { get; set; }
}

/// <summary>A62: a report run automatically; each recipient receives their own file, generated with their own access.</summary>
public class ReportSchedule
{
    public long Id { get; set; }
    public long OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public string Name { get; set; } = "";
    public string Report { get; set; } = "";
    public string FiltersJson { get; set; } = "{}";
    public string FilterSummary { get; set; } = "";
    public ExportFormat Format { get; set; }
    public ScheduleFrequency Frequency { get; set; }
    /// <summary>Weekly: 0 = Sunday … 6 = Saturday.</summary>
    public int? DayOfWeek { get; set; }
    /// <summary>Monthly: 1–28 (so every month has the day).</summary>
    public int? DayOfMonth { get; set; }
    public TimeOnly TimeOfDay { get; set; }
    public string TimeZone { get; set; } = "UTC";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset NextRunAt { get; set; }
    public DateTimeOffset? LastRunAt { get; set; }
    public string? LastOutcome { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ReportScheduleRecipient> Recipients { get; set; } = [];
}

public class ReportScheduleRecipient
{
    public long Id { get; set; }
    public long ScheduleId { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>A62: a user's saved filter set for one report (private to that user).</summary>
public class ReportPreset
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Report { get; set; } = "";
    public string Name { get; set; } = "";
    public string FiltersJson { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>A62: where export files are kept and for how long, and how large one export may be.</summary>
public sealed class ReportingOptions
{
    /// <summary>Relative paths are under the application folder; App_Data is kept across upgrades.</summary>
    public string Path { get; set; } = "App_Data/exports";
    public int RetentionDays { get; set; } = 14;
    public int MaxRows { get; set; } = 100_000;
    /// <summary>How often the scheduler looks for due schedules and expired files; 0 switches scheduled runs off.</summary>
    public int SchedulerMinutes { get; set; } = 1;
}
