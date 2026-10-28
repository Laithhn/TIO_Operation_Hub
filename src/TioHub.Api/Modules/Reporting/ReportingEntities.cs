using TioHub.Api.Modules.Access;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A62/A70: Pending is shown as "Queued". Cancelled was added for asynchronous builder exports (enums are stored by name).</summary>
public enum ExportStatus { Pending, Processing, Completed, Failed, Expired, Cancelled }
public enum ExportFormat { Csv, Xlsx, Pdf }
public enum ReportVisibility { Private, Team, Shared }
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

    // ---- A70: asynchronous builder exports (Cases Report Builder). Null for the synchronous catalog exports. ----
    /// <summary>The builder definition (JSON, schema-versioned) the worker runs; its presence marks an asynchronous job.</summary>
    public string? DefinitionJson { get; set; }
    /// <summary>File options (JSON): file name, summary/filters/metadata sheets, PDF mode.</summary>
    public string? OptionsJson { get; set; }
    /// <summary>Client-supplied key; a repeated request with the same key returns the first job.</summary>
    public string? IdempotencyKey { get; set; }
    public long? SavedReportId { get; set; }
    /// <summary>The evaluation time of the preview the export was started from; derived values (overdue, SLA, age) use it.</summary>
    public DateTimeOffset? CutoffAt { get; set; }
    public int Attempts { get; set; }
    /// <summary>A queued job waits until this time (retry back-off).</summary>
    public DateTimeOffset? NotBefore { get; set; }
    public bool CancelRequested { get; set; }
}

/// <summary>
/// A70: a saved Cases Report Builder configuration. Private to its owner, visible to the members of one team, or shared with
/// named users. Viewers may run, duplicate and favorite it; only the owner edits or deletes it. Revision guards concurrent edits.
/// </summary>
public class SavedReport
{
    public long Id { get; set; }
    public long OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public string ReportType { get; set; } = "cases";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public ReportVisibility Visibility { get; set; }
    /// <summary>Team visibility: the team whose active members see the report.</summary>
    public long? TeamId { get; set; }
    public int SchemaVersion { get; set; } = 1;
    public string DefinitionJson { get; set; } = "{}";
    public int Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? LastRunAt { get; set; }
    public List<SavedReportShare> Shares { get; set; } = [];
}

public class SavedReportShare
{
    public long Id { get; set; }
    public long SavedReportId { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>A70: a user's favorite mark on a saved report they can see.</summary>
public class SavedReportFavorite
{
    public long Id { get; set; }
    public long SavedReportId { get; set; }
    public long UserId { get; set; }
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
    /// <summary>A70: a schedule of a saved builder report; each run queues one asynchronous export per recipient.</summary>
    public long? SavedReportId { get; set; }
    public SavedReport? SavedReport { get; set; }
    /// <summary>A70: file options of builder schedules (JSON).</summary>
    public string? OptionsJson { get; set; }
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
    /// <summary>A70: how often the export worker looks for queued jobs (seconds); 0 switches the worker off (tests run jobs directly).</summary>
    public int ExportWorkerSeconds { get; set; } = 5;
    /// <summary>A70: exports generated at the same time by this server.</summary>
    public int ExportConcurrency { get; set; } = 2;
    /// <summary>A70: queued or running builder exports one user may have at a time.</summary>
    public int MaxActiveExportsPerUser { get; set; } = 5;
    /// <summary>A70: automatic attempts for a job that failed for a transient reason (database timeout, I/O).</summary>
    public int MaxAttempts { get; set; } = 3;
    /// <summary>A70: detailed PDF exports are limited to this many rows; larger results belong in Excel.</summary>
    public int PdfMaxRows { get; set; } = 2_000;
}
