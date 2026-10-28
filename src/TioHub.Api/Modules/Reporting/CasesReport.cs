using System.Globalization;
using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/* ---------------------------------------------------------------------------------------------------------------------------
 * A70: the Cases Report Builder. A schema-versioned definition (filters, columns, sort, grouping) is validated against an
 * allowlisted field registry and translated into one EF query over the caller's scoped Cases set: no SQL text is ever built
 * from user input, client scope comes from the global query filter, and a client id outside the caller's access is refused.
 * Preview, export, schedule runs and saved reports use this one service, so their semantics cannot drift apart.
 * ------------------------------------------------------------------------------------------------------------------------- */

public enum CaseFieldType { Text, Number, Date, Enum, Bool }

/// <summary>Replaces one parameter of an expression (field expressions are re-rooted on the query's parameter).</summary>
internal sealed class Rebind(ParameterExpression from, Expression to) : ExpressionVisitor
{
    protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : base.VisitParameter(node);
}

public sealed record DateRangeInput(string? From = null, string? ToExclusive = null, string? FromDay = null, string? ToDay = null);
public sealed record SortInput(string? Field, string? Direction);

/// <summary>An advanced condition: either a rule (field, operator, value) or a group (op = and/or, rules).</summary>
public sealed record RuleInput(string? Field = null, string? Operator = null, JsonElement? Value = null, string? Op = null, List<RuleInput>? Rules = null);

public sealed record CasesFiltersInput(
    string? DateField = null, string? DatePreset = null, DateRangeInput? DateRange = null,
    List<long>? ClientIds = null, List<string>? Statuses = null, List<string>? Priorities = null, List<long>? OwnerIds = null, bool? Unassigned = null,
    List<long>? TeamIds = null, List<long>? ProductIds = null, List<long>? EnvironmentIds = null, List<string>? SlaStatuses = null, string? Due = null,
    int? AgeMin = null, int? AgeMax = null, string? Jira = null, string? JiraKey = null, string? Q = null, List<string>? Types = null, string? Scope = null,
    bool? Waiting = null, RuleInput? Conditions = null);

public sealed record CasesDefinition(int SchemaVersion = 1, CasesFiltersInput? Filters = null, List<string>? Columns = null, List<SortInput>? Sort = null, string? GroupBy = null);

/// <summary>The flat row of the builder: every scalar field computed in SQL; Jira keys are loaded separately for the rows of a page.</summary>
public sealed class CaseReportRow
{
    public long Id { get; set; }
    public string Ref { get; set; } = "";
    public string Title { get; set; } = "";
    public string Type { get; set; } = "";
    public WorkScope Scope { get; set; }
    public CaseStatus Status { get; set; }
    public Priority Priority { get; set; }
    public long? ClientId { get; set; }
    public string? ClientCode { get; set; }
    public string? ClientName { get; set; }
    public string? Team { get; set; }
    public string? Owner { get; set; }
    public bool Waiting { get; set; }
    public WaitingReason? WaitingReason { get; set; }
    public string NextAction { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public DateTimeOffset NextReviewAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public int AgeDays { get; set; }
    public bool Overdue { get; set; }
    public string SlaStatus { get; set; } = "";
    public SlaState ResponseSla { get; set; }
    public SlaState ResolutionSla { get; set; }
    public DateTimeOffset? ResponseDueAt { get; set; }
    public DateTimeOffset? ResolutionDueAt { get; set; }
    public string? Contract { get; set; }
    public int ReopenCount { get; set; }
    public List<string> JiraKeys { get; set; } = [];
}

/// <summary>Evaluation times of one run, read by the field expressions as parameters (never inlined into SQL text).</summary>
public sealed class CaseClock
{
    public DateTimeOffset Now { get; init; }
    public DateTimeOffset Soon { get; init; }
    public DateTimeOffset Horizon { get; init; }
}

/// <summary>One allowlisted field: metadata for the UI and the typed expression used to filter, sort, group and project.</summary>
public sealed class CaseField
{
    public required string Key { get; init; }
    public required string Label { get; init; }
    public required CaseFieldType Type { get; init; }
    public required string Category { get; init; }
    public required string Description { get; init; }
    public required string Prop { get; init; }
    public bool Sortable { get; init; } = true;
    public bool Groupable { get; init; }
    public bool Filterable { get; init; } = true;
    public string[]? Options { get; init; }
    /// <summary>Field-level permission; null = every user who may read cases may see the field.</summary>
    public Func<UserContext, bool>? Visible { get; init; }
    /// <summary>Builds the expression over Case for one run (null for fields that are not computed in SQL, such as Jira keys).</summary>
    public Func<CaseClock, LambdaExpression>? Build { get; init; }
}

public sealed record ValidCases(CasesDefinition Definition, IReadOnlyList<CaseField> Columns, IReadOnlyList<(CaseField Field, bool Desc)> Sort, CaseField? GroupBy,
    DateTimeOffset? RangeFrom, DateTimeOffset? RangeTo, IReadOnlyList<(string Label, string Value)> Summary, List<string> Warnings);

public sealed record CasesPage(int Total, List<CaseReportRow> Rows, Dictionary<string, int> ByStatus, Dictionary<string, int> ByPriority, Dictionary<string, int> BySla,
    List<(string Key, int Count)>? Groups);

public static class CasesFields
{
    public const int MaxColumns = 40, MaxSort = 3, MaxRules = 30, MaxDepth = 3, MaxListValues = 100;
    public static readonly string[] SlaStatuses = ["Breached", "AtRisk", "OnTrack", "Met", "NotMeasurable", "NotApplicable"];
    public static readonly string[] DateFields = ["createdAt", "updatedAt", "dueAt", "resolvedAt", "closedAt"];
    public static readonly string[] DatePresets = ["today", "yesterday", "last7", "last30", "last90", "thisMonth", "lastMonth", "thisQuarter", "thisYear"];
    public static readonly string[] DueOptions = ["overdue", "dueSoon", "hasDue", "noDue"];
    public static readonly string[] DefaultColumns = ["caseId", "clientCode", "title", "priority", "status", "owner", "slaStatus", "dueAt"];

    public static readonly Dictionary<CaseFieldType, string[]> Operators = new()
    {
        [CaseFieldType.Text] = ["equals", "notEquals", "contains", "notContains", "startsWith", "isEmpty", "isNotEmpty"],
        [CaseFieldType.Enum] = ["in", "notIn"],
        [CaseFieldType.Number] = ["eq", "neq", "gt", "gte", "lt", "lte"],
        [CaseFieldType.Date] = ["before", "onOrAfter", "withinLastDays", "withinNextDays", "isEmpty", "isNotEmpty"],
        [CaseFieldType.Bool] = ["isTrue", "isFalse"]
    };

    /// <summary>A field expression over (case, clock); the clock is bound per run as a closure constant, so EF sends its times as parameters.</summary>
    private static Func<CaseClock, LambdaExpression> E<T>(Expression<Func<Case, CaseClock, T>> f) =>
        k => Expression.Lambda<Func<Case, T>>(new Rebind(f.Parameters[1], Expression.Constant(k)).Visit(f.Body), f.Parameters[0]);

    /// <summary>Combined contractual SLA state (A61 rule: a pending obligation whose deadline passed counts as breached; at risk = due within 24 hours).</summary>
    private static readonly Expression<Func<Case, CaseClock, string>> Sla = (c, k) =>
        c.ResponseSlaStatus == SlaState.Breached || c.ResolutionSlaStatus == SlaState.Breached
            || (c.ResponseSlaStatus == SlaState.Pending && c.ResponseDueAt < k.Now) || (c.ResolutionSlaStatus == SlaState.Pending && c.ResolutionDueAt < k.Now) ? "Breached"
        : (c.ResponseSlaStatus == SlaState.Pending && c.ResponseDueAt <= k.Soon) || (c.ResolutionSlaStatus == SlaState.Pending && c.ResolutionDueAt <= k.Soon) ? "AtRisk"
        : c.ResponseSlaStatus == SlaState.Pending || c.ResolutionSlaStatus == SlaState.Pending ? "OnTrack"
        : c.ResponseSlaStatus == SlaState.Met || c.ResolutionSlaStatus == SlaState.Met ? "Met"
        : c.ResponseSlaStatus == SlaState.NotMeasurable || c.ResolutionSlaStatus == SlaState.NotMeasurable ? "NotMeasurable"
        : "NotApplicable";

    public static readonly IReadOnlyList<CaseField> All =
    [
        new() { Key = "caseId", Label = "Case ID", Type = CaseFieldType.Text, Category = "Case", Prop = nameof(CaseReportRow.Ref), Description = "Hub case reference (always included; links to the case).", Build = E((c, _) => c.Ref) },
        new() { Key = "title", Label = "Title", Type = CaseFieldType.Text, Category = "Case", Prop = nameof(CaseReportRow.Title), Description = "Case title.", Build = E((c, _) => c.Title) },
        new() { Key = "type", Label = "Type", Type = CaseFieldType.Text, Category = "Case", Prop = nameof(CaseReportRow.Type), Description = "Configured case type.", Build = E((c, _) => c.Type), Groupable = true },
        new() { Key = "scope", Label = "Work scope", Type = CaseFieldType.Enum, Category = "Case", Prop = nameof(CaseReportRow.Scope), Description = "Client-related or Internal.", Options = Enum.GetNames<WorkScope>(), Build = E((c, _) => c.Scope), Groupable = true },
        new() { Key = "status", Label = "Status", Type = CaseFieldType.Enum, Category = "Case", Prop = nameof(CaseReportRow.Status), Description = "Hub status (independent of Jira).", Options = Enum.GetNames<CaseStatus>(), Build = E((c, _) => c.Status), Groupable = true },
        new() { Key = "priority", Label = "Priority", Type = CaseFieldType.Enum, Category = "Case", Prop = nameof(CaseReportRow.Priority), Description = "Priority (Critical, High, Normal, Low).", Options = Enum.GetNames<Priority>(), Build = E((c, _) => c.Priority), Groupable = true },
        new() { Key = "clientCode", Label = "Client", Type = CaseFieldType.Text, Category = "Client", Prop = nameof(CaseReportRow.ClientCode), Description = "Client alias; empty for internal work.", Build = E((c, _) => c.Client!.Code), Groupable = true },
        new() { Key = "clientName", Label = "Client name", Type = CaseFieldType.Text, Category = "Client", Prop = nameof(CaseReportRow.ClientName), Description = "Client name; empty for internal work.", Build = E((c, _) => c.Client!.Name) },
        new() { Key = "team", Label = "Team", Type = CaseFieldType.Text, Category = "Ownership", Prop = nameof(CaseReportRow.Team), Description = "Responsible team.", Build = E((c, _) => c.ResponsibleTeam!.Name), Groupable = true },
        new() { Key = "owner", Label = "Owner", Type = CaseFieldType.Text, Category = "Ownership", Prop = nameof(CaseReportRow.Owner), Description = "Accountable owner; empty = unassigned.", Build = E((c, _) => c.Owner!.DisplayName), Groupable = true },
        new() { Key = "waiting", Label = "Waiting", Type = CaseFieldType.Bool, Category = "Progress", Prop = nameof(CaseReportRow.Waiting), Description = "A waiting reason is recorded (the due date is not paused).", Build = E((c, _) => c.WaitingReason != null) },
        new() { Key = "waitingReason", Label = "Waiting reason", Type = CaseFieldType.Enum, Category = "Progress", Prop = nameof(CaseReportRow.WaitingReason), Description = "Recorded waiting reason.", Options = Enum.GetNames<WaitingReason>(), Build = E((c, _) => c.WaitingReason) },
        new() { Key = "nextAction", Label = "Next action", Type = CaseFieldType.Text, Category = "Progress", Prop = nameof(CaseReportRow.NextAction), Description = "Next action.", Build = E((c, _) => c.NextAction), Sortable = false },
        new() { Key = "createdAt", Label = "Created", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.CreatedAt), Description = "Creation time.", Build = E((c, _) => c.CreatedAt) },
        new() { Key = "updatedAt", Label = "Updated", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.UpdatedAt), Description = "Last change to the case record.", Build = E((c, _) => c.UpdatedAt) },
        new() { Key = "dueAt", Label = "Due date", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.DueAt), Description = "Operational due time; empty = no deadline (never overdue).", Build = E<DateTimeOffset?>((c, _) => c.DueAt) },
        new() { Key = "nextReviewAt", Label = "Next review", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.NextReviewAt), Description = "Next review time.", Build = E((c, _) => c.NextReviewAt) },
        new() { Key = "resolvedAt", Label = "Resolved", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.ResolvedAt), Description = "Resolution time (SLA clock stop).", Build = E<DateTimeOffset?>((c, _) => c.ResolvedAt) },
        new() { Key = "closedAt", Label = "Closed", Type = CaseFieldType.Date, Category = "Dates", Prop = nameof(CaseReportRow.ClosedAt), Description = "Closing time.", Build = E<DateTimeOffset?>((c, _) => c.ClosedAt) },
        new() { Key = "ageDays", Label = "Age (days)", Type = CaseFieldType.Number, Category = "Dates", Prop = nameof(CaseReportRow.AgeDays), Description = "Calendar days from creation to closing/cancellation, or to the evaluation time while open.",
            Build = E((c, k) => EF.Functions.DateDiffDay(c.CreatedAt, c.ClosedAt ?? c.CancelledAt ?? k.Now)) },
        new() { Key = "overdue", Label = "Overdue", Type = CaseFieldType.Bool, Category = "Dates", Prop = nameof(CaseReportRow.Overdue), Description = "Open with a due time strictly before the evaluation time.",
            Build = E((c, k) => c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.DueAt != null && c.DueAt < k.Now) },
        new() { Key = "slaStatus", Label = "SLA status", Type = CaseFieldType.Enum, Category = "SLA", Prop = nameof(CaseReportRow.SlaStatus), Options = SlaStatuses, Groupable = true,
            Description = "Combined contractual SLA state: Breached, AtRisk (due within 24 h), OnTrack, Met, NotMeasurable or NotApplicable.", Build = E(Sla) },
        new() { Key = "responseSla", Label = "Response SLA", Type = CaseFieldType.Enum, Category = "SLA", Prop = nameof(CaseReportRow.ResponseSla), Options = Enum.GetNames<SlaState>(), Description = "Contractual first-response outcome.",
            Build = E((c, k) => c.ResponseSlaStatus == SlaState.Pending && c.ResponseDueAt < k.Now ? SlaState.Breached : c.ResponseSlaStatus) },
        new() { Key = "resolutionSla", Label = "Resolution SLA", Type = CaseFieldType.Enum, Category = "SLA", Prop = nameof(CaseReportRow.ResolutionSla), Options = Enum.GetNames<SlaState>(), Description = "Contractual resolution outcome.",
            Build = E((c, k) => c.ResolutionSlaStatus == SlaState.Pending && c.ResolutionDueAt < k.Now ? SlaState.Breached : c.ResolutionSlaStatus) },
        new() { Key = "responseDueAt", Label = "Response due", Type = CaseFieldType.Date, Category = "SLA", Prop = nameof(CaseReportRow.ResponseDueAt), Description = "Contractual first-response deadline.", Build = E<DateTimeOffset?>((c, _) => c.ResponseDueAt) },
        new() { Key = "resolutionDueAt", Label = "Resolution due", Type = CaseFieldType.Date, Category = "SLA", Prop = nameof(CaseReportRow.ResolutionDueAt), Description = "Contractual resolution deadline.", Build = E<DateTimeOffset?>((c, _) => c.ResolutionDueAt) },
        new() { Key = "contract", Label = "Contract", Type = CaseFieldType.Text, Category = "SLA", Prop = nameof(CaseReportRow.Contract), Description = "Contract whose SLA applies (A61).", Build = E((c, _) => c.Contract!.Ref) },
        new() { Key = "reopenCount", Label = "Reopened", Type = CaseFieldType.Number, Category = "Progress", Prop = nameof(CaseReportRow.ReopenCount), Description = "Number of times the case was reopened.", Build = E((c, _) => c.ReopenCount) },
        new() { Key = "jiraKeys", Label = "Jira keys", Type = CaseFieldType.Text, Category = "Jira", Prop = nameof(CaseReportRow.JiraKeys), Description = "Manual Jira references (not synchronized).", Sortable = false, Filterable = false }
    ];

    public static readonly Dictionary<string, CaseField> ByKey = All.ToDictionary(f => f.Key, StringComparer.OrdinalIgnoreCase);

    public static IEnumerable<CaseField> VisibleTo(UserContext me) => All.Where(f => f.Visible?.Invoke(me) ?? true);

    /// <summary>Display text of a value as written into files (dates in the chosen zone, booleans Yes/No).</summary>
    public static object? Value(CaseReportRow r, CaseField f) => f.Key == "jiraKeys" ? string.Join(" ", r.JiraKeys) : Getters[f.Prop](r);

    private static readonly Dictionary<string, Func<CaseReportRow, object?>> Getters = typeof(CaseReportRow).GetProperties().ToDictionary(p => p.Name, p =>
    {
        var r = Expression.Parameter(typeof(CaseReportRow));
        return Expression.Lambda<Func<CaseReportRow, object?>>(Expression.Convert(Expression.Property(r, p), typeof(object)), r).Compile();
    });
}

/// <summary>A70: validates builder definitions and runs them under the caller's access.</summary>
public sealed class CasesReportService(HubDbContext db, HubAccess access, HubSettings settings, TimeProvider clock)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };
    public const int MaxDefinitionLength = 32000;
    public static string Serialize(CasesDefinition d) => JsonSerializer.Serialize(d, Json);
    public static CasesDefinition? Deserialize(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<CasesDefinition>(json, Json); } catch (JsonException) { return null; }
    }

    public async Task<CaseClock> ClockAsync(DateTimeOffset? at, CancellationToken ct)
    {
        var now = at ?? clock.GetUtcNow();
        return new CaseClock { Now = now, Soon = now.AddHours(24), Horizon = now.AddDays(await settings.UpcomingDaysAsync(ct)) };
    }

    /// <summary>
    /// Removes what a stored definition can no longer use (unknown or no-longer-visible columns, sorts and grouping) and says so.
    /// Used when a saved report is opened; preview and export themselves refuse unknown fields instead of dropping them.
    /// </summary>
    public CasesDefinition Sanitize(CasesDefinition d, List<string> warnings)
    {
        var visible = CasesFields.VisibleTo(access.Me).Select(f => f.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var cols = (d.Columns ?? []).Where(c => visible.Contains(c)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var c in (d.Columns ?? []).Where(c => !visible.Contains(c))) warnings.Add($"The column '{c}' is no longer available and was removed.");
        if (!cols.Contains("caseId", StringComparer.OrdinalIgnoreCase)) cols.Insert(0, "caseId");
        var sort = (d.Sort ?? []).Where(s => s.Field is not null && visible.Contains(s.Field) && CasesFields.ByKey[s.Field].Sortable).ToList();
        if (sort.Count != (d.Sort ?? []).Count) warnings.Add("A sort field is no longer available and was removed.");
        var group = d.GroupBy is not null && visible.Contains(d.GroupBy) && CasesFields.ByKey[d.GroupBy].Groupable ? d.GroupBy : null;
        if (d.GroupBy is not null && group is null) warnings.Add($"Grouping by '{d.GroupBy}' is no longer available and was removed.");
        if (d.SchemaVersion > 1) warnings.Add("The report was saved by a newer version of the hub; some settings may not apply.");
        return d with { SchemaVersion = 1, Columns = cols, Sort = sort, GroupBy = group };
    }

    /// <summary>Checks the whole definition and resolves date presets/days in the given zone. Throws a ValidationException with field paths.</summary>
    public async Task<ValidCases> ValidateAsync(CasesDefinition? raw, TimeZoneInfo zone, CaseClock k, CancellationToken ct)
    {
        var d = raw ?? new CasesDefinition();
        var check = new Check();
        var warnings = new List<string>();
        var summary = new List<(string, string)>();
        var me = access.Me;
        var visible = CasesFields.VisibleTo(me).ToDictionary(f => f.Key, StringComparer.OrdinalIgnoreCase);
        if (d.SchemaVersion != 1) check.Add("schemaVersion", "This report definition version is not supported.");

        // ---- columns ----
        var columns = new List<CaseField>();
        var colKeys = d.Columns is { Count: > 0 } ? d.Columns : [.. CasesFields.DefaultColumns];
        if (colKeys.Count > CasesFields.MaxColumns) check.Add("columns", $"Choose at most {CasesFields.MaxColumns} columns.");
        if (colKeys.Distinct(StringComparer.OrdinalIgnoreCase).Count() != colKeys.Count) check.Add("columns", "A column is chosen twice.");
        foreach (var key in colKeys)
        {
            if (!visible.TryGetValue(key ?? "", out var f)) { check.Add("columns", $"Unknown or unavailable column '{key}'."); continue; }
            columns.Add(f);
        }
        if (!columns.Any(c => c.Key == "caseId")) check.Add("columns", "The Case ID column is required.");

        // ---- sort and grouping ----
        var sort = new List<(CaseField, bool)>();
        if ((d.Sort?.Count ?? 0) > CasesFields.MaxSort) check.Add("sort", $"Sort by at most {CasesFields.MaxSort} fields.");
        foreach (var s in d.Sort ?? [])
        {
            if (s.Field is null || !visible.TryGetValue(s.Field, out var f) || !f.Sortable) { check.Add("sort", $"'{s.Field}' cannot be sorted."); continue; }
            var dir = (s.Direction ?? "asc").ToLowerInvariant();
            if (dir is not ("asc" or "desc")) { check.Add("sort", "Sort direction is asc or desc."); continue; }
            if (sort.Any(x => x.Item1.Key == f.Key)) { check.Add("sort", $"'{f.Label}' is sorted twice."); continue; }
            sort.Add((f, dir == "desc"));
        }
        CaseField? group = null;
        if (!string.IsNullOrWhiteSpace(d.GroupBy))
        {
            if (!visible.TryGetValue(d.GroupBy, out var g) || !g.Groupable) check.Add("groupBy", $"Grouping by '{d.GroupBy}' is not supported.");
            else group = g;
        }

        // ---- filters ----
        var f0 = d.Filters ?? new CasesFiltersInput();
        DateTimeOffset? from = null, to = null;
        var dateField = f0.DateField ?? "createdAt";
        if (!CasesFields.DateFields.Contains(dateField)) check.Add("filters.dateField", "Select created, updated, due, resolved or closed.");
        var hasRange = f0.DateRange is { } r0 && (r0.From ?? r0.ToExclusive ?? r0.FromDay ?? r0.ToDay) is not null;
        if (!string.IsNullOrWhiteSpace(f0.DatePreset))
        {
            if (!CasesFields.DatePresets.Contains(f0.DatePreset)) check.Add("filters.datePreset", "Select a valid date range.");
            else (from, to) = Preset(f0.DatePreset, zone, k.Now);
            if (hasRange) check.Add("filters.dateRange", "Use either a preset or a custom range.");
        }
        else if (hasRange)
        {
            var r = f0.DateRange!;
            from = Instant(r.From, check, "filters.dateRange.from") ?? Day(r.FromDay, 0, zone, check, "filters.dateRange.fromDay");
            to = Instant(r.ToExclusive, check, "filters.dateRange.toExclusive") ?? Day(r.ToDay, 1, zone, check, "filters.dateRange.toDay");
            if (from is not null && to is not null && from >= to) check.Add("filters.dateRange", "The end of the date range is before its start.");
        }
        if (from is not null || to is not null)
            summary.Add((CasesFields.ByKey[dateField].Label, $"{(from is { } a ? Csv.Format(a, zone) : "…")} – {(to is { } b ? Csv.Format(b.AddTicks(-1), zone) : "…")}{(f0.DatePreset is { } p ? $" ({PresetLabel(p)})" : "")}"));

        void Many<T>(string path, List<T>? values) { if (values is { Count: > 0 } && values.Count > CasesFields.MaxListValues) check.Add(path, $"Select at most {CasesFields.MaxListValues} values."); }
        Many("filters.clientIds", f0.ClientIds); Many("filters.ownerIds", f0.OwnerIds); Many("filters.teamIds", f0.TeamIds);
        Many("filters.productIds", f0.ProductIds); Many("filters.environmentIds", f0.EnvironmentIds); Many("filters.types", f0.Types);
        if (f0.ClientIds is { Count: > 0 } ids)
        {
            // Client-supplied ids are never trusted: each must be a client the caller may access.
            if (ids.Any(id => id <= 0 || !me.HasClient(id))) check.Add("filters.clientIds", "Select only clients you can access.");
            else summary.Add(("Client", string.Join(", ", await db.Clients.AsNoTracking().Where(c => ids.Contains(c.Id)).OrderBy(c => c.Code).Select(c => c.Code).ToListAsync(ct))));
        }
        foreach (var s in f0.Statuses ?? []) if (!Enum.TryParse<CaseStatus>(s, true, out _) || int.TryParse(s, out _)) check.Add("filters.statuses", $"'{s}' is not a case status.");
        if (f0.Statuses is { Count: > 0 }) summary.Add(("Status", string.Join(", ", f0.Statuses)));
        foreach (var s in f0.Priorities ?? []) if (!Enum.TryParse<Priority>(s, true, out _) || int.TryParse(s, out _)) check.Add("filters.priorities", $"'{s}' is not a priority.");
        if (f0.Priorities is { Count: > 0 }) summary.Add(("Priority", string.Join(", ", f0.Priorities)));
        foreach (var s in f0.SlaStatuses ?? []) if (!CasesFields.SlaStatuses.Contains(s, StringComparer.OrdinalIgnoreCase)) check.Add("filters.slaStatuses", $"'{s}' is not an SLA status.");
        if (f0.SlaStatuses is { Count: > 0 }) summary.Add(("SLA status", string.Join(", ", f0.SlaStatuses)));
        if (f0.OwnerIds is { Count: > 0 } || f0.Unassigned == true)
        {
            var names = f0.OwnerIds is { Count: > 0 } o ? await db.Users.AsNoTracking().Where(u => o.Contains(u.Id)).OrderBy(u => u.DisplayName).Select(u => u.DisplayName).ToListAsync(ct) : [];
            if (f0.OwnerIds is { Count: > 0 } && names.Count != f0.OwnerIds.Distinct().Count()) check.Add("filters.ownerIds", "Select valid owners.");
            if (f0.Unassigned == true) names.Add("Unassigned");
            summary.Add(("Owner", string.Join(", ", names)));
        }
        if (f0.TeamIds is { Count: > 0 } t)
        {
            var names = await db.Teams.AsNoTracking().Where(x => t.Contains(x.Id)).OrderBy(x => x.Name).Select(x => x.Name).ToListAsync(ct);
            if (names.Count != t.Distinct().Count()) check.Add("filters.teamIds", "Select valid teams.");
            summary.Add(("Team", string.Join(", ", names)));
        }
        if (f0.ProductIds is { Count: > 0 } p0)
        {
            var names = await db.Products.AsNoTracking().Where(x => p0.Contains(x.Id)).OrderBy(x => x.Code).Select(x => x.Code).ToListAsync(ct);
            if (names.Count != p0.Distinct().Count()) check.Add("filters.productIds", "Select valid products.");
            summary.Add(("Product", string.Join(", ", names)));
        }
        if (f0.EnvironmentIds is { Count: > 0 } e0)
        {
            // Environments are client-owned: the scope filter hides those outside the caller's access, so a hidden id fails here.
            var names = await db.Environments.AsNoTracking().Where(x => e0.Contains(x.Id)).OrderBy(x => x.Name).Select(x => x.Name).ToListAsync(ct);
            if (names.Count != e0.Distinct().Count()) check.Add("filters.environmentIds", "Select only environments you can access.");
            summary.Add(("Environment", string.Join(", ", names)));
        }
        if (f0.Types is { Count: > 0 }) summary.Add(("Type", string.Join(", ", f0.Types)));
        if (f0.Due is { } due) { if (!CasesFields.DueOptions.Contains(due)) check.Add("filters.due", "Select a valid due-date filter."); else summary.Add(("Due", due switch { "overdue" => "Overdue", "dueSoon" => "Due soon", "hasDue" => "Has a due date", _ => "No due date" })); }
        if (f0.AgeMin is < 0 || f0.AgeMax is < 0 || (f0.AgeMin is { } a1 && f0.AgeMax is { } a2 && a1 > a2)) check.Add("filters.ageMin", "Enter an age range from 0 days with the minimum not above the maximum.");
        if (f0.AgeMin is not null || f0.AgeMax is not null) summary.Add(("Age (days)", $"{f0.AgeMin?.ToString(CultureInfo.InvariantCulture) ?? "0"} – {f0.AgeMax?.ToString(CultureInfo.InvariantCulture) ?? "…"}"));
        if (f0.Jira is { } jira) { if (jira is not ("linked" or "notLinked")) check.Add("filters.jira", "Select linked or not linked."); else summary.Add(("Jira", jira == "linked" ? "Has a Jira reference" : "No Jira reference")); }
        if (f0.JiraKey is { Length: > 0 } jk) { if (jk.Length > 40) check.Add("filters.jiraKey", "The Jira key is too long."); else summary.Add(("Jira key", jk.Trim().ToUpperInvariant())); }
        if (f0.Q is { Length: > 0 } q) { if (q.Length > 200) check.Add("filters.q", "The search text is too long."); else summary.Add(("Search", $"\"{q.Trim()}\"")); }
        if (f0.Scope is { } sc) { if (!Enum.TryParse<WorkScope>(sc, true, out _) || int.TryParse(sc, out _)) check.Add("filters.scope", "Select Client or Internal."); else summary.Add(("Work scope", sc)); }
        if (f0.Waiting is { } w) summary.Add(("Waiting", w ? "Waiting only" : "Not waiting"));
        if (f0.Conditions is { } cond)
        {
            var count = 0;
            ValidateRule(cond, visible, check, "filters.conditions", 1, ref count);
            if (count > CasesFields.MaxRules) check.Add("filters.conditions", $"Use at most {CasesFields.MaxRules} conditions.");
            if (count > 0) summary.Add(("Conditions", Describe(cond, zone)));
        }
        if (Serialize(d).Length > MaxDefinitionLength) check.Add("definition", "The report definition is too large; use fewer values or conditions.");
        check.ThrowIfAny("The report definition needs attention.");
        return new ValidCases(d, columns, sort, group, from, to, summary, warnings);
    }

    private static string PresetLabel(string p) => p switch
    {
        "today" => "Today", "yesterday" => "Yesterday", "last7" => "Last 7 days", "last30" => "Last 30 days", "last90" => "Last 90 days",
        "thisMonth" => "This month", "lastMonth" => "Last month", "thisQuarter" => "This quarter", _ => "This year"
    };

    private static DateTimeOffset Midnight(DateTime localDay, TimeZoneInfo zone)
    {
        var local = localDay.Date;
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(30);
        return new DateTimeOffset(local, zone.GetUtcOffset(local)).ToUniversalTime();
    }

    /// <summary>Calendar presets in the report's time zone: [start, end) as UTC instants.</summary>
    public static (DateTimeOffset, DateTimeOffset) Preset(string preset, TimeZoneInfo zone, DateTimeOffset now)
    {
        var today = TimeZoneInfo.ConvertTime(now, zone).Date;
        var month = new DateTime(today.Year, today.Month, 1);
        var quarter = new DateTime(today.Year, (today.Month - 1) / 3 * 3 + 1, 1);
        var (a, b) = preset switch
        {
            "today" => (today, today.AddDays(1)),
            "yesterday" => (today.AddDays(-1), today),
            "last7" => (today.AddDays(-6), today.AddDays(1)),
            "last30" => (today.AddDays(-29), today.AddDays(1)),
            "last90" => (today.AddDays(-89), today.AddDays(1)),
            "thisMonth" => (month, month.AddMonths(1)),
            "lastMonth" => (month.AddMonths(-1), month),
            "thisQuarter" => (quarter, quarter.AddMonths(3)),
            _ => (new DateTime(today.Year, 1, 1), new DateTime(today.Year + 1, 1, 1))
        };
        return (Midnight(a, zone), Midnight(b, zone));
    }

    private static DateTimeOffset? Instant(string? v, Check check, string path)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        if (DateTimeOffset.TryParse(v, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var t) && t.Year is >= 2000 and <= 2100) return t.ToUniversalTime();
        check.Add(path, "Enter a valid UTC timestamp.");
        return null;
    }

    private static DateTimeOffset? Day(string? v, int add, TimeZoneInfo zone, Check check, string path)
    {
        if (string.IsNullOrWhiteSpace(v)) return null;
        if (DateOnly.TryParseExact(v, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) && d.Year is >= 2000 and <= 2100)
            return Midnight(d.AddDays(add).ToDateTime(TimeOnly.MinValue), zone);
        check.Add(path, "Enter a valid date (yyyy-MM-dd).");
        return null;
    }

    private static void ValidateRule(RuleInput r, Dictionary<string, CaseField> visible, Check check, string path, int depth, ref int count)
    {
        if (r.Rules is not null || r.Op is not null)
        {
            if (depth > CasesFields.MaxDepth) { check.Add(path, $"Conditions can be nested at most {CasesFields.MaxDepth} levels deep."); return; }
            if ((r.Op ?? "and").ToLowerInvariant() is not ("and" or "or")) check.Add(path, "A condition group combines with AND or OR.");
            if (r.Field is not null) check.Add(path, "A condition group has no field.");
            for (var i = 0; i < (r.Rules ?? []).Count; i++) ValidateRule(r.Rules![i], visible, check, $"{path}.rules[{i}]", depth + 1, ref count);
            return;
        }
        count++;
        if (r.Field is null || !visible.TryGetValue(r.Field, out var f) || !f.Filterable || f.Build is null) { check.Add(path, $"'{r.Field}' cannot be used in a condition."); return; }
        var op = r.Operator ?? "";
        if (!CasesFields.Operators[f.Type].Contains(op)) { check.Add(path, $"'{op}' is not an operator for {f.Label}."); return; }
        if (op is "isEmpty" or "isNotEmpty" or "isTrue" or "isFalse") return;
        var v = r.Value;
        switch (f.Type)
        {
            case CaseFieldType.Text:
                if (v is not { ValueKind: JsonValueKind.String } || v.Value.GetString()!.Trim().Length is 0 or > 200) check.Add(path, $"Enter a text of 1–200 characters for {f.Label}.");
                break;
            case CaseFieldType.Number:
                if (v is not { ValueKind: JsonValueKind.Number } || !v.Value.TryGetInt32(out var n) || n < -100000 || n > 100000) check.Add(path, $"Enter a whole number for {f.Label}.");
                break;
            case CaseFieldType.Date when op is "withinLastDays" or "withinNextDays":
                if (v is not { ValueKind: JsonValueKind.Number } || !v.Value.TryGetInt32(out var days) || days is < 1 or > 3660) check.Add(path, "Enter a number of days from 1 to 3660.");
                break;
            case CaseFieldType.Date:
                if (v is not { ValueKind: JsonValueKind.String } || !DateTimeOffset.TryParse(v.Value.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out _)) check.Add(path, $"Enter a valid date for {f.Label}.");
                break;
            case CaseFieldType.Enum:
                if (v is not { ValueKind: JsonValueKind.Array } || v.Value.GetArrayLength() is 0 or > CasesFields.MaxListValues
                    || v.Value.EnumerateArray().Any(x => x.ValueKind != JsonValueKind.String || !f.Options!.Contains(x.GetString(), StringComparer.OrdinalIgnoreCase)))
                    check.Add(path, $"Select one or more valid values of {f.Label}.");
                break;
        }
    }

    private static string Describe(RuleInput r, TimeZoneInfo zone)
    {
        if (r.Rules is not null || r.Op is not null)
            return "(" + string.Join($" {(r.Op ?? "and").ToUpperInvariant()} ", (r.Rules ?? []).Select(x => Describe(x, zone))) + ")";
        var f = CasesFields.ByKey[r.Field!];
        var v = r.Value is { ValueKind: JsonValueKind.Array } a ? string.Join(", ", a.EnumerateArray().Select(x => x.GetString())) : r.Value?.ToString();
        return $"{f.Label} {r.Operator} {v}".Trim();
    }

    /* ------------------------------------------------------------ query ------------------------------------------------------------ */

    private static Expression<Func<Case, bool>> Lambda(LambdaExpression field, Func<Expression, Expression> body)
    {
        var p = Expression.Parameter(typeof(Case), "c");
        return Expression.Lambda<Func<Case, bool>>(body(new Rebind(field.Parameters[0], p).Visit(field.Body)), p);
    }

    private static Expression Const(object? value, Type type) => Expression.Convert(Expression.Property(Expression.Constant(new Box(value)), nameof(Box.Value)), type);

    /// <summary>A holder so EF sends user values as SQL parameters (a closure member), never as inlined literals.</summary>
    private sealed class Box(object? value) { public object? Value { get; } = value; }

    /// <summary>The filtered (not yet sorted) query: scope from the global filter, then every validated filter and condition.</summary>
    public async Task<IQueryable<Case>> QueryAsync(ValidCases v, CaseClock k, DateTimeOffset? createdUpTo, CancellationToken ct)
    {
        var f = v.Definition.Filters ?? new CasesFiltersInput();
        IQueryable<Case> q = db.Cases.AsNoTracking();
        if (createdUpTo is { } cut) q = q.Where(c => c.CreatedAt <= cut);
        if (v.RangeFrom is not null || v.RangeTo is not null)
        {
            var field = CasesFields.ByKey[f.DateField ?? "createdAt"].Build!(k);
            if (v.RangeFrom is { } a) q = q.Where(Lambda(field, x => Expression.GreaterThanOrEqual(Nullable(x), Const(a, typeof(DateTimeOffset?)))));
            if (v.RangeTo is { } b) q = q.Where(Lambda(field, x => Expression.LessThan(Nullable(x), Const(b, typeof(DateTimeOffset?)))));
        }
        if (f.ClientIds is { Count: > 0 } clients) q = q.Where(c => c.ClientId != null && clients.Contains(c.ClientId.Value));
        if (f.Statuses is { Count: > 0 }) { var s = f.Statuses.Select(x => Enum.Parse<CaseStatus>(x, true)).ToList(); q = q.Where(c => s.Contains(c.Status)); }
        if (f.Priorities is { Count: > 0 }) { var p = f.Priorities.Select(x => Enum.Parse<Priority>(x, true)).ToList(); q = q.Where(c => p.Contains(c.Priority)); }
        if (f.OwnerIds is { Count: > 0 } || f.Unassigned == true)
        {
            var owners = f.OwnerIds ?? [];
            var unassigned = f.Unassigned == true;
            q = q.Where(c => (c.OwnerUserId != null && owners.Contains(c.OwnerUserId.Value)) || (unassigned && c.OwnerUserId == null));
        }
        if (f.TeamIds is { Count: > 0 } teams) q = q.Where(c => c.ResponsibleTeamId != null && teams.Contains(c.ResponsibleTeamId.Value));
        // Product semantics of the Cases list (CaseQuery): an affected environment has it installed, or an affected component belongs to it.
        if (f.ProductIds is { Count: > 0 } products)
            q = q.Where(c => c.Environments.Any(e => db.Installations.Any(i => i.EnvironmentId == e.EnvironmentId && products.Contains(i.ProductId)))
                || c.Components.Any(cc => db.Components.Any(comp => comp.Id == cc.ComponentId && products.Contains(comp.Installation!.ProductId))));
        if (f.EnvironmentIds is { Count: > 0 } envs) q = q.Where(c => c.Environments.Any(e => envs.Contains(e.EnvironmentId)));
        if (f.SlaStatuses is { Count: > 0 })
        {
            var wanted = CasesFields.SlaStatuses.Where(s => f.SlaStatuses.Contains(s, StringComparer.OrdinalIgnoreCase)).ToList();
            q = q.Where(Lambda(CasesFields.ByKey["slaStatus"].Build!(k), x => Expression.Call(Expression.Constant(wanted), typeof(List<string>).GetMethod(nameof(List<string>.Contains))!, x)));
        }
        var now = k.Now;
        var horizon = k.Horizon;
        q = f.Due switch
        {
            "overdue" => q.Where(c => c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.DueAt != null && c.DueAt < now),
            "dueSoon" => q.Where(c => c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.DueAt != null && c.DueAt >= now && c.DueAt <= horizon),
            "hasDue" => q.Where(c => c.DueAt != null),
            "noDue" => q.Where(c => c.DueAt == null),
            _ => q
        };
        if (f.AgeMin is not null || f.AgeMax is not null)
        {
            var age = CasesFields.ByKey["ageDays"].Build!(k);
            if (f.AgeMin is { } min) q = q.Where(Lambda(age, x => Expression.GreaterThanOrEqual(x, Const(min, typeof(int)))));
            if (f.AgeMax is { } max) q = q.Where(Lambda(age, x => Expression.LessThanOrEqual(x, Const(max, typeof(int)))));
        }
        if (f.Jira == "linked") q = q.Where(c => c.JiraReferences.Any(j => j.RemovedAt == null));
        if (f.Jira == "notLinked") q = q.Where(c => !c.JiraReferences.Any(j => j.RemovedAt == null));
        if (!string.IsNullOrWhiteSpace(f.JiraKey)) { var key = f.JiraKey.Trim().ToUpperInvariant(); q = q.Where(c => c.JiraReferences.Any(j => j.RemovedAt == null && j.IssueKey == key)); }
        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var text = f.Q.Trim();
            var upper = text.ToUpperInvariant();
            q = q.Where(c => c.Title.Contains(text) || c.Ref.Contains(text) || c.NextAction.Contains(text) || c.JiraReferences.Any(j => j.RemovedAt == null && j.IssueKey == upper));
        }
        if (f.Types is { Count: > 0 } types) q = q.Where(c => types.Contains(c.Type));
        if (f.Scope is { } scope) { var sc = Enum.Parse<WorkScope>(scope, true); q = q.Where(c => c.Scope == sc); }
        if (f.Waiting == true) q = q.Where(c => c.WaitingReason != null);
        if (f.Waiting == false) q = q.Where(c => c.WaitingReason == null);
        if (f.Conditions is { } cond)
        {
            var p = Expression.Parameter(typeof(Case), "c");
            var body = Rule(cond, k, p);
            if (body is not null) q = q.Where(Expression.Lambda<Func<Case, bool>>(body, p));
        }
        return await Task.FromResult(q);
    }

    private static Expression Nullable(Expression x) => x.Type == typeof(DateTimeOffset) ? Expression.Convert(x, typeof(DateTimeOffset?)) : x;

    private static Expression? Rule(RuleInput r, CaseClock k, ParameterExpression p)
    {
        if (r.Rules is not null || r.Op is not null)
        {
            var parts = (r.Rules ?? []).Select(x => Rule(x, k, p)).Where(x => x is not null).ToList();
            if (parts.Count == 0) return null;
            var or = (r.Op ?? "and").Equals("or", StringComparison.OrdinalIgnoreCase);
            return parts.Aggregate((a, b) => or ? Expression.OrElse(a!, b!) : Expression.AndAlso(a!, b!));
        }
        var f = CasesFields.ByKey[r.Field!];
        var lambda = f.Build!(k);
        var x = new Rebind(lambda.Parameters[0], p).Visit(lambda.Body);
        var op = r.Operator!;
        var v = r.Value;
        switch (f.Type)
        {
            case CaseFieldType.Text:
            {
                var str = typeof(string);
                if (op == "isEmpty") return Expression.OrElse(Expression.Equal(x, Expression.Constant(null, str)), Expression.Equal(x, Expression.Constant("")));
                if (op == "isNotEmpty") return Expression.AndAlso(Expression.NotEqual(x, Expression.Constant(null, str)), Expression.NotEqual(x, Expression.Constant("")));
                var text = Const(v!.Value.GetString()!.Trim(), str);
                Expression Call(string m) => Expression.AndAlso(Expression.NotEqual(x, Expression.Constant(null, str)), Expression.Call(x, str.GetMethod(m, [str])!, text));
                return op switch
                {
                    "equals" => Expression.Equal(x, text),
                    "notEquals" => Expression.OrElse(Expression.Equal(x, Expression.Constant(null, str)), Expression.NotEqual(x, text)),
                    "contains" => Call(nameof(string.Contains)),
                    "notContains" => Expression.Not(Call(nameof(string.Contains))),
                    _ => Call(nameof(string.StartsWith))
                };
            }
            case CaseFieldType.Number:
            {
                var n = Const(v!.Value.GetInt32(), typeof(int));
                return op switch
                {
                    "eq" => Expression.Equal(x, n), "neq" => Expression.NotEqual(x, n), "gt" => Expression.GreaterThan(x, n),
                    "gte" => Expression.GreaterThanOrEqual(x, n), "lt" => Expression.LessThan(x, n), _ => Expression.LessThanOrEqual(x, n)
                };
            }
            case CaseFieldType.Bool:
                return op == "isTrue" ? x : Expression.Not(x);
            case CaseFieldType.Date:
            {
                var d = Nullable(x);
                var nul = Expression.Constant(null, typeof(DateTimeOffset?));
                if (op == "isEmpty") return Expression.Equal(d, nul);
                if (op == "isNotEmpty") return Expression.NotEqual(d, nul);
                if (op is "withinLastDays" or "withinNextDays")
                {
                    var days = v!.Value.GetInt32();
                    var (a, b) = op == "withinLastDays" ? (k.Now.AddDays(-days), k.Now) : (k.Now, k.Now.AddDays(days));
                    return Expression.AndAlso(Expression.GreaterThanOrEqual(d, Const(a, typeof(DateTimeOffset?))), Expression.LessThanOrEqual(d, Const(b, typeof(DateTimeOffset?))));
                }
                var at = DateTimeOffset.Parse(v!.Value.GetString()!, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal).ToUniversalTime();
                return op == "before" ? Expression.LessThan(d, Const(at, typeof(DateTimeOffset?))) : Expression.GreaterThanOrEqual(d, Const(at, typeof(DateTimeOffset?)));
            }
            default:
            {
                // Enum fields: membership in the chosen values (stored enums are compared as enums, the SLA status as text).
                var values = v!.Value.EnumerateArray().Select(e => e.GetString()!).ToList();
                Expression contains;
                if (x.Type == typeof(string))
                {
                    var list = f.Options!.Where(o => values.Contains(o, StringComparer.OrdinalIgnoreCase)).ToList();
                    contains = Expression.Call(Expression.Constant(list), typeof(List<string>).GetMethod(nameof(List<string>.Contains))!, x);
                }
                else
                {
                    var enumType = System.Nullable.GetUnderlyingType(x.Type) ?? x.Type;
                    var listType = typeof(List<>).MakeGenericType(x.Type);
                    var list = (System.Collections.IList)Activator.CreateInstance(listType)!;
                    foreach (var s in values) list.Add(Enum.Parse(enumType, s, true));
                    contains = Expression.Call(Expression.Constant(list), listType.GetMethod("Contains")!, x);
                }
                return op == "notIn" ? Expression.Not(contains) : contains;
            }
        }
    }

    private static IOrderedQueryable<Case> Order(IQueryable<Case> q, LambdaExpression key, bool desc, bool first)
    {
        var name = first ? (desc ? nameof(Queryable.OrderByDescending) : nameof(Queryable.OrderBy)) : (desc ? nameof(Queryable.ThenByDescending) : nameof(Queryable.ThenBy));
        var m = typeof(Queryable).GetMethods().First(x => x.Name == name && x.GetParameters().Length == 2).MakeGenericMethod(typeof(Case), key.ReturnType);
        return (IOrderedQueryable<Case>)m.Invoke(null, [q, key])!;
    }

    /// <summary>Deterministic order: the group, the chosen sorts, then the id (so pages never overlap or skip rows).</summary>
    public static IOrderedQueryable<Case> Sorted(IQueryable<Case> q, ValidCases v, CaseClock k)
    {
        IOrderedQueryable<Case>? o = null;
        if (v.GroupBy is { } g) o = Order(q, g.Build!(k), false, true);
        foreach (var (f, desc) in v.Sort) o = Order(o ?? q, f.Build!(k), desc, o is null);
        return o is null ? q.OrderBy(c => c.Id) : o.ThenBy(c => c.Id);
    }

    /// <summary>The flat row projection, built from the field expressions (one source of truth with filters and sorting).</summary>
    public static IQueryable<CaseReportRow> Project(IQueryable<Case> q, CaseClock k)
    {
        var p = Expression.Parameter(typeof(Case), "c");
        var bindings = new List<MemberBinding> { Expression.Bind(typeof(CaseReportRow).GetProperty(nameof(CaseReportRow.Id))!, Expression.Property(p, nameof(Case.Id))),
            Expression.Bind(typeof(CaseReportRow).GetProperty(nameof(CaseReportRow.ClientId))!, Expression.Property(p, nameof(Case.ClientId))) };
        foreach (var f in CasesFields.All.Where(f => f.Build is not null))
        {
            var l = f.Build!(k);
            bindings.Add(Expression.Bind(typeof(CaseReportRow).GetProperty(f.Prop)!, new Rebind(l.Parameters[0], p).Visit(l.Body)));
        }
        return q.Select(Expression.Lambda<Func<Case, CaseReportRow>>(Expression.MemberInit(Expression.New(typeof(CaseReportRow)), bindings), p));
    }

    private async Task<Dictionary<string, int>> CountByAsync<T>(IQueryable<Case> q, Expression<Func<Case, T>> key, CancellationToken ct) =>
        (await q.GroupBy(key).Select(g => new { g.Key, Count = g.Count() }).ToListAsync(ct)).ToDictionary(x => Convert.ToString(x.Key, CultureInfo.InvariantCulture) ?? "", x => x.Count);

    private Task<Dictionary<string, int>> CountByFieldAsync(IQueryable<Case> q, LambdaExpression key, CancellationToken ct)
    {
        var m = typeof(CasesReportService).GetMethod(nameof(CountByAsync), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!.MakeGenericMethod(key.ReturnType);
        return (Task<Dictionary<string, int>>)m.Invoke(this, [q, key, ct])!;
    }

    /// <summary>One page (or, with take = null, every row) plus the exact total and the breakdowns shown in previews and files.</summary>
    public async Task<CasesPage> RunAsync(ValidCases v, CaseClock k, int skip, int? take, CancellationToken ct, DateTimeOffset? createdUpTo = null, bool breakdowns = true)
    {
        var q = await QueryAsync(v, k, createdUpTo, ct);
        var total = await q.CountAsync(ct);
        var rows = new List<CaseReportRow>();
        if (take is null || take > 0)
        {
            var paged = Project(Sorted(q, v, k), k).Skip(skip);
            rows = await (take is null ? paged : paged.Take(take.Value)).ToListAsync(ct);
            await AttachJiraAsync(v, rows, ct);
        }
        Dictionary<string, int> byStatus = [], byPriority = [], bySla = [];
        List<(string, int)>? groups = null;
        if (breakdowns && total > 0)
        {
            byStatus = await CountByAsync(q, c => c.Status, ct);
            byPriority = await CountByAsync(q, c => c.Priority, ct);
            bySla = await CountByFieldAsync(q, CasesFields.ByKey["slaStatus"].Build!(k), ct);
            if (v.GroupBy is { } g)
                groups = (await CountByFieldAsync(q, g.Build!(k), ct)).OrderByDescending(x => x.Value).ThenBy(x => x.Key).Take(200).Select(x => (x.Key, x.Value)).ToList();
        }
        return new CasesPage(total, rows, byStatus, byPriority, bySla, groups);
    }

    public async Task AttachJiraAsync(ValidCases v, List<CaseReportRow> rows, CancellationToken ct)
    {
        if (rows.Count == 0 || !v.Columns.Any(c => c.Key == "jiraKeys")) return;
        foreach (var chunk in rows.Chunk(2000))
        {
            var ids = chunk.Select(r => r.Id).ToList();
            var keys = await db.JiraReferences.AsNoTracking().Where(j => ids.Contains(j.CaseId) && j.RemovedAt == null).Select(j => new { j.CaseId, j.IssueKey }).ToListAsync(ct);
            var by = keys.GroupBy(x => x.CaseId).ToDictionary(x => x.Key, x => x.Select(y => y.IssueKey).Order().ToList());
            foreach (var r in chunk) r.JiraKeys = by.GetValueOrDefault(r.Id) ?? [];
        }
    }

    /// <summary>Configured display labels (case status labels and case types) for files.</summary>
    public async Task<Func<CaseField, object?, object?>> LabelsAsync(CancellationToken ct)
    {
        var lookups = await db.LookupValues.AsNoTracking().Where(l => l.ListName == LookupLists.CaseStatusLabel || l.ListName == LookupLists.CaseType)
            .Select(l => new { l.ListName, l.Code, l.Label }).ToListAsync(ct);
        var status = lookups.Where(l => l.ListName == LookupLists.CaseStatusLabel).ToDictionary(l => l.Code, l => l.Label);
        var types = lookups.Where(l => l.ListName == LookupLists.CaseType).GroupBy(l => l.Code).ToDictionary(g => g.Key, g => g.First().Label);
        return (f, value) => f.Key switch
        {
            "status" when value is CaseStatus s => status.GetValueOrDefault(s.ToString()) ?? s.ToString(),
            "type" when value is string t => types.GetValueOrDefault(t) ?? t,
            _ => value
        };
    }

    public UserContext Me => access.Me;
}
