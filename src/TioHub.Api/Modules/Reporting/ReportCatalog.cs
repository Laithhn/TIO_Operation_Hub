using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

public enum FilterKind { Client, Team, Product, Owner, Date, Select, Bool, Text }

/// <summary>A filter a report offers. Dates are local calendar days in the chosen time zone; "To" includes the whole day.</summary>
public sealed record ReportFilterDef(string Key, string Label, FilterKind Kind, bool Advanced = false, string[]? Options = null, string? Hint = null, string? RangeEnd = null);
public sealed record ReportColumnDef(string Key, string Header, string Definition);
public sealed record ReportMetric(string Label, string Value, string Definition, string? Tone = null);
public sealed record ReportBreakdown(string Title, string[] Columns, List<object?[]> Rows);

/// <summary>Rows of one page (or all rows) of a report, with the total and, for operational reports, the summary over all matching rows.</summary>
public sealed record ReportResult(int Total, IReadOnlyList<ReportColumnDef> Columns, List<object?[]> Rows, List<ReportMetric>? Summary = null, List<ReportBreakdown>? Breakdowns = null);

/// <summary>The request a report runs in: the caller's scoped database and access, the evaluation time, the time zone and the validated filters.</summary>
public sealed class ReportContext(HubDbContext db, HubAccess access, HubSettings settings, FreshnessService fresh, Dashboard dash, DateTimeOffset now, TimeZoneInfo zone, IReadOnlyDictionary<string, string> values)
{
    public HubDbContext Db { get; } = db;
    public HubAccess Access { get; } = access;
    public HubSettings Settings { get; } = settings;
    public FreshnessService Fresh { get; } = fresh;
    public Dashboard Dash { get; } = dash;
    public DateTimeOffset Now { get; } = now;
    public TimeZoneInfo Zone { get; } = zone;
    public IReadOnlyDictionary<string, string> Values { get; } = values;

    public string? S(string k) => Values.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v) ? v.Trim() : null;
    public long? L(string k) => long.TryParse(S(k), out var x) ? x : null;
    public bool? B(string k) => bool.TryParse(S(k), out var x) ? x : null;
    public T? E<T>(string k) where T : struct, Enum => Enum.TryParse<T>(S(k), true, out var x) ? x : null;

    /// <summary>Start of a range: a calendar day is local midnight in the chosen zone; a full timestamp (list-page exports) is taken as is.</summary>
    public DateTimeOffset? From(string k) => Instant(S(k), 0);
    /// <summary>End of a range (exclusive): a calendar day means the end of that day in the chosen zone.</summary>
    public DateTimeOffset? To(string k) => Instant(S(k), 1);

    private DateTimeOffset? Instant(string? v, int addDays)
    {
        if (v is null) return null;
        if (DateOnly.TryParseExact(v, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
        {
            var local = d.AddDays(addDays).ToDateTime(TimeOnly.MinValue);
            while (Zone.IsInvalidTime(local)) local = local.AddMinutes(30);
            return new DateTimeOffset(local, Zone.GetUtcOffset(local)).ToUniversalTime();
        }
        return DateTimeOffset.TryParse(v, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var t) ? t : null;
    }
}

/// <summary>
/// A62: one entry of the Reporting Center. Definitions are registered once in <see cref="ReportCatalog"/>; the UI, the preview,
/// the exports, the list-page CSV buttons and the schedules all use the same definition, filters and columns.
/// </summary>
public abstract class ReportDefinition
{
    public required string Key { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public required string Description { get; init; }
    public required string Icon { get; init; }
    public IReadOnlyList<ReportFilterDef> Filters { get; init; } = [];
    /// <summary>Further query keys accepted from list-page exports (their URL filters) but not offered in the Reporting Center.</summary>
    public IReadOnlyList<string> ListKeys { get; init; } = [];
    /// <summary>Operational reports compute KPIs over all matching rows.</summary>
    public bool Operational { get; init; }
    public abstract IReadOnlyList<ReportColumnDef> Columns { get; }
    public abstract Task<ReportResult> RunAsync(ReportContext ctx, int skip, int? take, CancellationToken ct);
}

/// <summary>A report over rows of one type: either a database query (paged in the database) or a list built in memory.</summary>
public sealed class TableReport<T> : ReportDefinition
{
    public required IReadOnlyList<CsvColumn<T>> Cols { get; init; }
    public Func<ReportContext, CancellationToken, Task<IQueryable<T>>>? Query { get; init; }
    public Func<ReportContext, CancellationToken, Task<List<T>>>? Load { get; init; }
    public Func<ReportContext, List<T>, (List<ReportMetric>, List<ReportBreakdown>)>? Summarize { get; init; }

    public override IReadOnlyList<ReportColumnDef> Columns => Cols.Select(c => new ReportColumnDef(ReportCatalog.Slug(c.Header), c.Header, c.Definition)).ToList();

    public override async Task<ReportResult> RunAsync(ReportContext ctx, int skip, int? take, CancellationToken ct)
    {
        List<T> page;
        int total;
        List<ReportMetric>? summary = null;
        List<ReportBreakdown>? breakdowns = null;
        if (Query is not null && Summarize is null)
        {
            var q = await Query(ctx, ct);
            total = await q.CountAsync(ct);
            var paged = q.Skip(skip);
            page = await (take is null ? paged : paged.Take(take.Value)).ToListAsync(ct);
        }
        else
        {
            var all = Load is not null ? await Load(ctx, ct) : await (await Query!(ctx, ct)).ToListAsync(ct);
            total = all.Count;
            if (Summarize is not null) (summary, breakdowns) = Summarize(ctx, all);
            page = all.Skip(skip).Take(take ?? int.MaxValue).ToList();
        }
        return new ReportResult(total, Columns, page.Select(r => Cols.Select(c => c.Value(r)).ToArray()).ToList(), summary, breakdowns);
    }
}

public static class ReportCatalog
{
    public const string Operations = "Operations", Technical = "Technical", Governance = "Governance", Performance = "Operational intelligence";

    public static string Slug(string header) => new string(header.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-').Replace("--", "-");

    private static readonly ReportFilterDef Client = new("clientId", "Client", FilterKind.Client);
    private static readonly ReportFilterDef Team = new("teamId", "Team", FilterKind.Team);
    private static readonly ReportFilterDef Product = new("productId", "Product", FilterKind.Product);
    private static readonly ReportFilterDef Owner = new("ownerId", "Owner", FilterKind.Owner);
    private static string[] Names<TE>() where TE : struct, Enum => Enum.GetNames<TE>();
    private static ReportFilterDef[] Range(string from, string to, string label, bool advanced = false, string? hint = null) =>
        [new(from, $"{label} from", FilterKind.Date, advanced, Hint: hint, RangeEnd: to), new(to, $"{label} to", FilterKind.Date, advanced)];

    private static string Pct(int met, int measured) => measured == 0 ? "Not available" : $"{Math.Round(100.0 * met / measured, 1).ToString(CultureInfo.InvariantCulture)} %";
    private static string? Pct0(int met, int measured) => measured == 0 ? null : $"{Math.Round(100.0 * met / measured, 1).ToString(CultureInfo.InvariantCulture)} %";

    private static async Task<IQueryable<Case>> Cases(ReportContext x, CaseFilter f, CancellationToken ct)
    {
        var policy = (await x.Fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        return CaseQuery.Apply(x.Db.Cases.AsNoTracking(), f, x.Now, await x.Settings.UpcomingDaysAsync(ct), policy, x.Db, await x.Settings.CoveragePrioritiesAsync(ct));
    }

    private static CaseFilter CaseFilterOf(ReportContext x) => new(x.L("clientId"), x.L("regionId"), x.L("environmentId"), x.L("productId"), x.L("teamId"), x.L("ownerId"), x.B("unassigned"), x.S("status"),
        x.E<Priority>("priority"), x.E<WorkScope>("scope"), x.S("due"), x.B("waiting"), x.B("reviewOverdue"), x.B("stale"), x.S("jiraKey"), x.S("q"), x.From("createdFrom"), x.To("createdTo"),
        x.B("coverageGap"), x.B("deactivatedOwner"), x.S("country"), x.L("contractId"), x.S("sla"));

    public static readonly IReadOnlyList<ReportDefinition> All = Build();

    public static ReportDefinition? Find(string key) => All.FirstOrDefault(r => string.Equals(r.Key, key, StringComparison.OrdinalIgnoreCase));

    private static List<ReportDefinition> Build()
    {
        var list = new List<ReportDefinition>();

        // ---------------- Operations ----------------
        list.Add(new TableReport<CaseEndpoints.CaseRow>
        {
            Key = "cases", Name = "Cases report", Category = Operations, Icon = "case",
            Description = "Cases with status, priority, owner, next action, due date and Jira references — the same rows as the Cases list.",
            Filters = [Client, Team, Product, Owner,
                new("status", "Status", FilterKind.Select, Options: ["open", "all", "done", .. Names<CaseStatus>()], Hint: "Empty = open cases."),
                new("priority", "Priority", FilterKind.Select, Options: Names<Priority>()),
                new("scope", "Work scope", FilterKind.Select, Options: Names<WorkScope>()),
                .. Range("createdFrom", "createdTo", "Created"),
                new("due", "Deadline", FilterKind.Select, true, ["overdue", "24h", "upcoming", "none"]),
                new("waiting", "Waiting only", FilterKind.Bool, true), new("q", "Title or reference contains", FilterKind.Text, true)],
            ListKeys = ["regionId", "environmentId", "unassigned", "reviewOverdue", "stale", "jiraKey", "coverageGap", "deactivatedOwner", "country", "contractId", "sla", "asOf"],
            Query = async (x, ct) => (await Cases(x, CaseFilterOf(x), ct)).OrderBy(c => c.Id).Select(CaseEndpoints.Row(x.Now, (await x.Fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record)))),
            Cols = [
                new("Reference", "Hub case reference", r => r.Ref),
                new("Title", "Case title", r => r.Title), new("Type", "Case type", r => r.Type), new("Scope", "Client-related or Internal", r => r.Scope),
                new("Client", "Client alias; empty for internal work", r => r.ClientCode), new("Team", "Responsible team", r => r.TeamName),
                new("Status", "Hub status (independent of Jira)", r => r.Status), new("Priority", "Priority", r => r.Priority),
                new("Owner", "Accountable owner or Unassigned", r => r.OwnerName ?? "Unassigned"), new("Owner deactivated", "Owner account deactivated", r => r.OwnerDeactivated),
                new("Waiting", "Recorded waiting reason; the operational due date is not paused", r => r.WaitingReason), new("Next action", "Next action", r => r.NextAction),
                new("Next review", "Next review time", r => r.NextReviewAt), new("Due", "Due time; empty = no deadline (not overdue)", r => r.DueAt),
                new("Overdue", "Open with due time strictly before the evaluation time", r => r.Overdue), new("Stale", "Meaningful review older than policy or next review passed", r => r.Stale),
                new("Jira keys", "Manual Jira references (instance + key)", r => string.Join(" ", r.JiraKeys)), new("Created", "Creation time", r => r.CreatedAt),
                new("Contract", "Contract whose SLA applies (A61)", r => r.ContractRef), new("Response SLA", "Contractual first-response outcome", r => r.ResponseSla),
                new("Resolution SLA", "Contractual resolution outcome", r => r.ResolutionSla)]
        });

        list.Add(new TableReport<CommitmentEndpoints.CommitmentRow>
        {
            Key = "commitments", Name = "Commitments report", Category = Operations, Icon = "commitment",
            Description = "Promises with their original and current deadlines, revisions and completion — the same rows as the Commitments list.",
            Filters = [Client, Team, Owner, Product,
                new("status", "Status", FilterKind.Select, Options: ["open", "all", "done", .. Names<CommitmentStatus>()], Hint: "Empty = open commitments."),
                .. Range("dueFrom", "dueTo", "Deadline"), .. Range("completedFrom", "completedTo", "Completed", true),
                new("late", "Completed late only", FilterKind.Bool, true), new("q", "Description or reference contains", FilterKind.Text, true)],
            ListKeys = ["scope", "type", "due", "stale", "projectId", "caseId", "deactivatedOwner", "country", "asOf"],
            Query = async (x, ct) =>
            {
                var f = new CommitmentFilter(x.L("clientId"), x.L("teamId"), x.L("ownerId"), x.E<WorkScope>("scope"), x.E<CommitmentType>("type"), x.S("status"), x.S("due"), x.B("late"), x.B("stale"),
                    x.L("projectId"), x.L("caseId"), x.S("q"), x.From("completedFrom"), x.To("completedTo"), x.B("deactivatedOwner"), x.S("country"), x.L("productId"));
                var q = CommitmentQuery.Apply(x.Db.Commitments.AsNoTracking(), f, x.Now, await x.Settings.UpcomingDaysAsync(ct), x.Db);
                if (x.From("dueFrom") is { } df) q = q.Where(c => c.CurrentDueAt >= df);
                if (x.To("dueTo") is { } dt) q = q.Where(c => c.CurrentDueAt < dt);
                return q.OrderBy(c => c.CurrentDueAt).Select(CommitmentEndpoints.Row(x.Now));
            },
            Cols = [
                new("Reference", "Commitment reference", r => r.Ref), new("Description", "Promise", r => r.Description),
                new("Type", "Recorded contractual deadlines are manual entries, not verified SLA results", r => r.Type), new("Status", "Open, Completed or Cancelled", r => r.Status),
                new("Client", "Client alias; empty for internal", r => r.ClientCode), new("Team", "Responsible team", r => r.TeamName), new("Owner", "Accountable owner", r => r.OwnerName),
                new("Original deadline", "First recorded deadline", r => r.OriginalDueAt), new("Current deadline", "Deadline in force", r => r.CurrentDueAt),
                new("Entry time zone", "Original IANA zone", r => r.TimeZone), new("Revisions", "Number of deadline revisions", r => r.RevisionCount),
                new("Completed", "Completion time", r => r.CompletedAt), new("Completed late", "Derived: completion after the deadline in force", r => r.CompletedLate),
                new("Overdue", "Open and deadline before evaluation time", r => r.Overdue)]
        });

        list.Add(new TableReport<ActionItem>
        {
            Key = "actions", Name = "Action list report", Category = Operations, Icon = "list",
            Description = "Everything that needs attention now — overdue and due work, renewals, payments, coverage gaps — with severity and reason.",
            Filters = [Client, Team, Owner, Product,
                new("category", "Issue type", FilterKind.Select, Options: ["OverdueCase", "CaseDueSoon", "Unassigned", "Waiting", "ReviewOverdue", "StaleReview", "OverdueCommitment", "ApproachingCommitment", "EscalationOverdue", "EnvironmentCondition", "ContractRenewal", "PaymentDue", "CoverageGap", "DataQuality"]),
                .. Range("dueFrom", "dueTo", "Due"), new("overdueOnly", "Overdue only", FilterKind.Bool)],
            ListKeys = ["country", "asOf"],
            Load = async (x, ct) =>
            {
                var items = await x.Dash.ActionsAsync(new DashboardQuery(x.L("clientId"), x.L("teamId"), x.L("ownerId"), x.L("productId"), x.S("country"), x.Now, x.S("category")), ct);
                if (x.From("dueFrom") is { } df) items = items.Where(i => i.DueAt >= df).ToList();
                if (x.To("dueTo") is { } dt) items = items.Where(i => i.DueAt < dt).ToList();
                if (x.B("overdueOnly") == true) items = items.Where(i => i.DueAt < x.Now).ToList();
                return items;
            },
            Cols = [
                new("Severity", "Critical, High, Medium or Low (A60)", r => r.Severity), new("Category", "Action-list category", r => r.Category), new("Record type", "Source record type", r => r.RecordType),
                new("Reference", "Source record", r => r.Reference), new("Title", "Title", r => r.Title), new("Client", "Client alias", r => r.ClientCode), new("Owner", "Owner or Unassigned", r => r.Owner),
                new("Reason", "Why it needs attention", r => r.Reason), new("Next action", "Next action", r => r.NextAction), new("Due", "Due or review time", r => r.DueAt)]
        });

        // ---------------- Technical ----------------
        list.Add(new TableReport<EnvRow>
        {
            Key = "environments", Name = "Environments report", Category = Technical, Icon = "server",
            Description = "Environments with type, criticality, hosting, owners, coverage gaps and the last reported condition.",
            Filters = [Client, Product, new("type", "Environment type", FilterKind.Text, Hint: "As configured, e.g. Production."),
                new("criticality", "Criticality", FilterKind.Select, Options: Names<Criticality>()), new("ownerId", "Technical owner", FilterKind.Owner, true)],
            ListKeys = ["regionId"],
            Query = (x, ct) =>
            {
                var q = x.Db.Environments.AsNoTracking().AsQueryable();
                if (x.L("clientId") is { } cid) q = q.Where(e => e.ClientId == cid);
                if (x.L("regionId") is { } rid) q = q.Where(e => e.RegionId == rid);
                if (x.L("productId") is { } pid) q = q.Where(e => x.Db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == pid));
                if (x.S("type") is { } t) q = q.Where(e => e.Type == t);
                if (x.E<Criticality>("criticality") is { } cr) q = q.Where(e => e.Criticality == cr);
                if (x.L("ownerId") is { } oid) q = q.Where(e => e.OwnerUserId == oid || e.BackupOwnerUserId == oid);
                return Task.FromResult(q.OrderBy(e => e.Client!.Code).ThenBy(e => e.Name).Select(e => new EnvRow(e.Client!.Code, e.Region == null ? null : e.Region.Code, e.Name, e.Type, e.Criticality.ToString(), e.Hosting.ToString(),
                    e.Owner == null ? null : e.Owner.DisplayName, e.BackupOwner == null ? null : e.BackupOwner.DisplayName, e.BackupGapReason, e.ConditionObservedAt == null ? "Unknown" : e.Condition.ToString(), e.ConditionObservedAt, e.InventoryReviewedAt)));
            },
            Cols = [
                new("Client", "Client alias", r => r.Client), new("Region", "Region code; empty = direct-client environment (valid)", r => r.Region), new("Environment", "Name", r => r.Name),
                new("Type", "Environment type", r => r.Type), new("Criticality", "Criticality", r => r.Criticality), new("Hosting", "Hosting; empty = Unknown", r => r.Hosting),
                new("Technical owner", "Owner; empty = assignment gap", r => r.Owner), new("Backup owner", "Backup; empty = coverage gap", r => r.Backup), new("Coverage gap reason", "Recorded gap", r => r.Gap),
                new("Reported condition", "Manually reported; not live health", r => r.Condition), new("Condition observed", "Observation time", r => r.Observed), new("Inventory reviewed", "Last inventory review", r => r.Inventory)]
        });

        list.Add(new TableReport<VerRow>
        {
            Key = "versions", Name = "Version matrix report", Category = Technical, Icon = "matrix",
            Description = "Installed product versions per client and environment, with deployment date and the last confirmation.",
            Filters = [Client, Product, new("unknownVersion", "Unknown version only", FilterKind.Bool), new("q", "Instance or product contains", FilterKind.Text, true)],
            ListKeys = ["regionId", "environmentId"],
            Query = (x, ct) => Task.FromResult(Catalogue.CatalogueEndpoints.Filter(x.Db.Installations.AsNoTracking(), x.L("clientId"), x.L("regionId"), x.L("environmentId"), x.L("productId"), null, x.B("unknownVersion"), x.S("q"))
                .OrderBy(i => i.Environment!.Client!.Code).ThenBy(i => i.Environment!.Name).Select(i => new VerRow(i.Environment!.Client!.Code, i.Environment.Region == null ? null : i.Environment.Region.Code, i.Environment.Name,
                    i.Product!.Code, i.InstanceName, i.ProductVersion == null ? "Unknown" : i.ProductVersion.Version, i.DeployedOn, i.LastReviewedAt))),
            Cols = [
                new("Client", "Client alias", r => r.Client), new("Region", "Region; empty = direct", r => r.Region), new("Environment", "Environment", r => r.Env),
                new("Product", "Product code", r => r.Product), new("Instance", "Named installation", r => r.Instance), new("Version", "Product-specific version or Unknown", r => r.Version),
                new("Deployed on", "Deployment date when known", r => r.Deployed), new("Last confirmed", "Last version confirmation or review", r => r.Reviewed)]
        });

        list.Add(new TableReport<AssetRow>
        {
            Key = "assets", Name = "Assets inventory report", Category = Technical, Icon = "server",
            Description = "Servers and other assets with type, role, lifecycle and recorded CPU, RAM and operating system. Network zones need the Technical detail permission.",
            Filters = [Client, Product, new("type", "Asset type", FilterKind.Text, Hint: "As configured, e.g. VM."),
                new("lifecycle", "Lifecycle", FilterKind.Select, Options: Names<AssetLifecycle>()), new("role", "Role", FilterKind.Text, true), new("q", "Name contains", FilterKind.Text, true)],
            ListKeys = ["regionId", "environmentId", "phase", "zone"],
            Query = (x, ct) =>
            {
                var tech = x.Access.Me.SeesTechnical;
                var q = Inventory.InventoryEndpoints.FilterAssets(x.Db, x.L("clientId"), x.L("regionId"), x.L("environmentId"), x.L("productId"), x.S("type"), x.E<AssetLifecycle>("lifecycle"), x.S("role"), x.S("phase"), tech ? x.S("zone") : null, x.S("q")).AsNoTracking();
                return Task.FromResult(q.OrderBy(a => a.Name).Select(a => new AssetRow(a.Environment!.Client!.Code, a.Environment.Name, a.Name, a.Type, a.Role, a.Lifecycle.ToString(),
                    tech ? a.NetworkZone : (a.NetworkZone == null ? null : "Restricted"), a.CpuQuantity, a.CpuUnit == null ? null : a.CpuUnit.ToString(), a.RamQuantity, a.RamUnit == null ? null : a.RamUnit.ToString(), a.OsFamily, a.VerifiedAt)));
            },
            Cols = [
                new("Client", "Client alias", r => r.Client), new("Environment", "Environment", r => r.Env), new("Asset", "Asset name", r => r.Name),
                new("Type", "VM, Physical or LogicalEndpoint (never counted as VM)", r => r.Type), new("Role", "Role", r => r.Role), new("Lifecycle", "Documented lifecycle", r => r.Lifecycle),
                new("Network zone", "Restricted technical detail", r => r.Zone), new("CPU", "Recorded quantity; empty = unknown (not zero)", r => r.Cpu), new("CPU unit", "vCPU or PhysicalCore", r => r.CpuUnit),
                new("RAM", "Recorded quantity; empty = unknown", r => r.Ram), new("RAM unit", "GB or GiB", r => r.RamUnit), new("OS", "OS family", r => r.Os),
                new("Verified", "Last verification", r => r.Verified)]
        });

        // ---------------- Governance ----------------
        list.Add(new TableReport<DqRow>
        {
            Key = "data-quality", Name = "Data quality report", Category = Governance, Icon = "quality",
            Description = "Records that fail a data-quality rule, with the accountable coordinator and next action.",
            Filters = [Client, new("recordType", "Entity type", FilterKind.Text, Hint: "e.g. Environment, Asset, Case."), new("rule", "Validation rule", FilterKind.Text, Hint: "Rule name as listed on the Data quality page."),
                new("status", "Status", FilterKind.Select, Options: [.. Names<DataQualityStatus>(), "all"], Hint: "Empty = open and resolved."), new("coordinatorId", "Coordinator", FilterKind.Owner, true)],
            Query = (x, ct) => Task.FromResult(QualityEndpoints.Filter(x.Db.DataQualityItems.AsNoTracking(), x.S("rule"), x.L("clientId"), x.L("coordinatorId"), x.S("status"), x.S("recordType")).OrderBy(i => i.Rule)
                .Select(i => new DqRow(i.Rule, i.RecordType, i.RecordLabel, i.Detail, i.Coordinator == null ? null : i.Coordinator.DisplayName, i.NextAction, i.Status.ToString(), i.OpenedAt))),
            Cols = [
                new("Rule", "Quality rule", r => r.Rule), new("Record type", "Affected record type", r => r.Type), new("Record", "Affected record", r => r.Label),
                new("Detail", "Safe detail", r => r.Detail), new("Coordinator", "Accountable internal coordinator", r => r.Coordinator), new("Next action", "Next action", r => r.Next),
                new("Status", "Open or Resolved (by rule re-evaluation only)", r => r.Status), new("Opened", "When the rule first failed", r => r.Opened)]
        });

        list.Add(new TableReport<ContractEndpoints.ContractExport>
        {
            Key = "contracts", Name = "Contracts report", Category = Governance, Icon = "report",
            Description = "Contracts with dates, notice period, renewal state and support terms.",
            Filters = [Client, Product, new("status", "Status", FilterKind.Select, Options: Names<ContractStatus>()),
                new("renewal", "Renewal state", FilterKind.Select, Options: ["attention", "expired", "due", "unknownEnd", "current"]), new("ownerId", "Contract owner", FilterKind.Owner, true), new("q", "Title or reference contains", FilterKind.Text, true)],
            ListKeys = ["type", "country", "projectId", "asOf"],
            Load = async (x, ct) =>
            {
                var f = new ContractFilter(x.L("clientId"), x.E<ContractStatus>("status"), x.S("type"), x.S("renewal"), x.L("ownerId"), x.L("productId"), x.S("country"), x.S("q"), x.L("projectId"));
                return (await ContractQuery.Apply(x.Db.Contracts.AsNoTracking(), f, x.Now, x.Db).OrderBy(c => c.EndDate).Select(ContractEndpoints.ExportRow).ToListAsync(ct))
                    .Select(r => r with { RenewalState = ContractQuery.State(new Contract { Status = r.Status, EndDate = r.EndDate, NoticeDays = r.NoticeDays }, x.Now) }).ToList();
            },
            Cols = [
                new("Reference", "Hub contract reference", r => r.Ref), new("Title", "Contract title", r => r.Title),
                new("Contract reference", "Number on the contract document", r => r.ContractReference), new("Client", "Client alias", r => r.ClientCode),
                new("Project", "Project the contract belongs to", r => r.ProjectCode), new("Type", "Contract type", r => r.Type), new("Status", "Draft, Active, Ended or Terminated", r => r.Status), new("Owner", "Contract owner", r => r.Owner),
                new("Start", "Start date; empty = unknown", r => r.StartDate), new("End", "End date; empty = unknown", r => r.EndDate),
                new("Notice days", "Notice period; empty = unknown", r => r.NoticeDays), new("Renewal terms", "Recorded renewal terms", r => r.RenewalTerms),
                new("Renewal state", $"Derived for Active contracts; renewal due = notice deadline or end within {ContractQuery.RenewalWindowDays} days", r => r.RenewalState),
                new("Support model", "Remote, on-site or hybrid", r => r.SupportModel), new("Support hours", "Recorded support hours", r => r.SupportHours),
                new("Support time zone", "IANA zone of the support hours", r => r.SupportTimeZone), new("On-site engineers required", "Recorded staffing obligation", r => r.OnSiteEngineersRequired)]
        });

        // ---------------- Operational intelligence (A62, computed on the server over every matching row) ----------------
        list.Add(new TableReport<SlaRow>
        {
            Key = "sla-compliance", Name = "SLA compliance report", Category = Performance, Icon = "matrix", Operational = true,
            Description = "Contractual first-response and resolution compliance of client cases linked to a contract (A61), with breached and at-risk cases and performance by client, team and owner.",
            Filters = [Client, Team, Owner, new("priority", "Priority", FilterKind.Select, Options: Names<Priority>()), .. Range("createdFrom", "createdTo", "Opened", hint: "Cases opened in this range.")],
            Load = async (x, ct) =>
            {
                var f = new CaseFilter(ClientId: x.L("clientId"), TeamId: x.L("teamId"), OwnerId: x.L("ownerId"), Status: "all", Priority: x.E<Priority>("priority"), Scope: WorkScope.Client,
                    CreatedFrom: x.From("createdFrom"), CreatedTo: x.To("createdTo"), Sla: "withContract");
                var rows = await (await Cases(x, f, ct)).Where(c => c.Status != CaseStatus.Cancelled).OrderBy(c => c.Id).Select(c => new
                {
                    c.Ref, c.Title, client = c.Client == null ? null : c.Client.Code, contract = c.Contract == null ? null : c.Contract.Ref, c.Priority, team = c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name,
                    owner = c.Owner == null ? null : c.Owner.DisplayName, c.CreatedAt, c.ResponseDueAt, c.FirstResponseAt, c.ResponseSlaStatus, c.ResolutionDueAt, c.ResolvedAt, c.ResolutionSlaStatus
                }).ToListAsync(ct);
                return rows.Select(r => new SlaRow(r.Ref, r.Title, r.client, r.contract, r.Priority.ToString(), r.team, r.owner ?? "Unassigned", r.CreatedAt,
                    r.ResponseDueAt, r.FirstResponseAt, CaseSla.Now(r.ResponseSlaStatus, r.ResponseDueAt, x.Now), r.ResolutionDueAt, r.ResolvedAt, CaseSla.Now(r.ResolutionSlaStatus, r.ResolutionDueAt, x.Now),
                    (r.ResponseSlaStatus == SlaState.Pending && r.ResponseDueAt >= x.Now && r.ResponseDueAt <= x.Now.AddHours(24)) || (r.ResolutionSlaStatus == SlaState.Pending && r.ResolutionDueAt >= x.Now && r.ResolutionDueAt <= x.Now.AddHours(24)))).ToList();
            },
            Summarize = (x, rows) =>
            {
                int Met(IEnumerable<SlaState> s) => s.Count(v => v == SlaState.Met);
                int Measured(IEnumerable<SlaState> s) => s.Count(v => v is SlaState.Met or SlaState.Breached);
                var breached = rows.Count(r => r.Response == SlaState.Breached || r.Resolution == SlaState.Breached);
                var metrics = new List<ReportMetric>
                {
                    new("Cases measured", rows.Count.ToString(CultureInfo.InvariantCulture), "Client cases linked to a contract (not cancelled)."),
                    new("Response compliance", Pct(Met(rows.Select(r => r.Response)), Measured(rows.Select(r => r.Response))), $"Met ÷ (met + breached) = {Met(rows.Select(r => r.Response))} of {Measured(rows.Select(r => r.Response))}; pending and not measurable excluded."),
                    new("Resolution compliance", Pct(Met(rows.Select(r => r.Resolution)), Measured(rows.Select(r => r.Resolution))), $"Met ÷ (met + breached) = {Met(rows.Select(r => r.Resolution))} of {Measured(rows.Select(r => r.Resolution))}."),
                    new("Breached cases", breached.ToString(CultureInfo.InvariantCulture), "Response or resolution breached (a pending obligation past its deadline counts as breached).", breached > 0 ? "bad" : null),
                    new("At risk", rows.Count(r => r.AtRisk).ToString(CultureInfo.InvariantCulture), "Pending with a deadline within the next 24 hours.", rows.Any(r => r.AtRisk) ? "warn" : null),
                    new("Not measurable", rows.Count(r => r.Response == SlaState.NotMeasurable || r.Resolution == SlaState.NotMeasurable).ToString(CultureInfo.InvariantCulture), "No target for the priority, incomplete support calendar, or opened before responses were recorded.")
                };
                List<object?[]> By(Func<SlaRow, string?> key) => rows.GroupBy(r => key(r) ?? "—").OrderByDescending(g => g.Count(r => r.Response == SlaState.Breached || r.Resolution == SlaState.Breached)).ThenBy(g => g.Key)
                    .Select(g => new object?[] { g.Key, g.Count(), Pct0(Met(g.Select(r => r.Response)), Measured(g.Select(r => r.Response))), Pct0(Met(g.Select(r => r.Resolution)), Measured(g.Select(r => r.Resolution))),
                        g.Count(r => r.Response == SlaState.Breached || r.Resolution == SlaState.Breached), g.Count(r => r.AtRisk) }).ToList();
                string[] cols = ["", "Cases", "Response", "Resolution", "Breached", "At risk"];
                return (metrics, [new("By client", ["Client", .. cols[1..]], By(r => r.Client)), new("By team", ["Team", .. cols[1..]], By(r => r.Team)), new("By owner", ["Owner", .. cols[1..]], By(r => r.Owner))]);
            },
            Cols = [
                new("Reference", "Case reference", r => r.Ref), new("Title", "Case title", r => r.Title), new("Client", "Client alias", r => r.Client), new("Contract", "Contract whose SLA applies", r => r.Contract),
                new("Priority", "Case priority (the target is taken for this priority)", r => r.Priority), new("Team", "Responsible team", r => r.Team), new("Owner", "Owner", r => r.Owner),
                new("Opened", "Clock start", r => r.Created), new("Response deadline", "Contractual first-response deadline", r => r.ResponseDue), new("First response", "When the first response was sent", r => r.Responded),
                new("Response status", "Met, Breached, Pending, Not measurable", r => r.Response), new("Resolution deadline", "Contractual resolution deadline", r => r.ResolutionDue),
                new("Resolved", "First move into Pending validation or Closed", r => r.Resolved), new("Resolution status", "Met, Breached, Pending, Not measurable", r => r.Resolution),
                new("At risk", "Pending with a deadline within 24 hours", r => r.AtRisk)]
        });

        list.Add(new TableReport<CommitmentEndpoints.CommitmentRow>
        {
            Key = "commitment-performance", Name = "Commitment performance report", Category = Performance, Icon = "commitment", Operational = true,
            Description = "Commitments due in a period: completed, completed on time, overdue and cancelled, with on-time completion by team and client.",
            Filters = [Client, Team, Owner, .. Range("dueFrom", "dueTo", "Deadline", hint: "Commitments whose deadline in force falls in this range.")],
            Load = async (x, ct) =>
            {
                var f = new CommitmentFilter(ClientId: x.L("clientId"), TeamId: x.L("teamId"), OwnerId: x.L("ownerId"), Status: "all");
                var q = CommitmentQuery.Apply(x.Db.Commitments.AsNoTracking(), f, x.Now, await x.Settings.UpcomingDaysAsync(ct), x.Db);
                if (x.From("dueFrom") is { } df) q = q.Where(c => c.CurrentDueAt >= df);
                if (x.To("dueTo") is { } dt) q = q.Where(c => c.CurrentDueAt < dt);
                return await q.OrderBy(c => c.CurrentDueAt).Select(CommitmentEndpoints.Row(x.Now)).ToListAsync(ct);
            },
            Summarize = (x, rows) =>
            {
                var live = rows.Where(r => r.Status != CommitmentStatus.Cancelled).ToList();
                var done = live.Where(r => r.Status == CommitmentStatus.Completed).ToList();
                var onTime = done.Count(r => r.CompletedLate == false);
                var metrics = new List<ReportMetric>
                {
                    new("Commitments", live.Count.ToString(CultureInfo.InvariantCulture), $"Not cancelled ({rows.Count - live.Count} cancelled, excluded)."),
                    new("Completed", done.Count.ToString(CultureInfo.InvariantCulture), "Completed with evidence."),
                    new("On-time completion", Pct(onTime, done.Count), $"Completed by the deadline in force ÷ completed = {onTime} of {done.Count}."),
                    new("Overdue", live.Count(r => r.Overdue).ToString(CultureInfo.InvariantCulture), "Open with the deadline in force passed.", live.Any(r => r.Overdue) ? "bad" : null),
                    new("Open, not yet due", live.Count(r => r.Status == CommitmentStatus.Open && !r.Overdue).ToString(CultureInfo.InvariantCulture), "Open and still within the deadline.")
                };
                List<object?[]> By(Func<CommitmentEndpoints.CommitmentRow, string?> key) => live.GroupBy(r => key(r) ?? "—").OrderBy(g => g.Key)
                    .Select(g => new object?[] { g.Key, g.Count(), g.Count(r => r.Status == CommitmentStatus.Completed), Pct0(g.Count(r => r.CompletedLate == false && r.Status == CommitmentStatus.Completed), g.Count(r => r.Status == CommitmentStatus.Completed)), g.Count(r => r.Overdue) }).ToList();
                return (metrics, [new("By team", ["Team", "Commitments", "Completed", "On time", "Overdue"], By(r => r.TeamName)), new("By client", ["Client", "Commitments", "Completed", "On time", "Overdue"], By(r => r.ClientCode ?? "Internal"))]);
            },
            Cols = [
                new("Reference", "Commitment reference", r => r.Ref), new("Description", "Promise", r => r.Description), new("Client", "Client alias; empty for internal", r => r.ClientCode),
                new("Team", "Responsible team", r => r.TeamName), new("Owner", "Accountable owner", r => r.OwnerName), new("Status", "Open, Completed or Cancelled", r => r.Status),
                new("Deadline", "Deadline in force", r => r.CurrentDueAt), new("Revisions", "Deadline revisions", r => r.RevisionCount), new("Completed", "Completion time", r => r.CompletedAt),
                new("On time", "Completed by the deadline in force", r => r.Status == CommitmentStatus.Completed ? r.CompletedLate == false : null), new("Overdue", "Open and past the deadline", r => r.Overdue)]
        });

        list.Add(new TableReport<AgingRow>
        {
            Key = "case-aging", Name = "Case aging & backlog report", Category = Performance, Icon = "case", Operational = true,
            Description = "Open cases by age bucket, overdue cases, priority distribution and the backlog by owner and client.",
            Filters = [Client, Team, Owner, Product, new("priority", "Priority", FilterKind.Select, Options: Names<Priority>())],
            Load = async (x, ct) =>
            {
                var f = new CaseFilter(ClientId: x.L("clientId"), ProductId: x.L("productId"), TeamId: x.L("teamId"), OwnerId: x.L("ownerId"), Priority: x.E<Priority>("priority"));
                var rows = await (await Cases(x, f, ct)).OrderBy(c => c.CreatedAt).Select(c => new
                {
                    c.Ref, c.Title, client = c.Client == null ? "Internal" : c.Client.Code, c.Priority, c.Status, owner = c.Owner == null ? null : c.Owner.DisplayName,
                    team = c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name, c.CreatedAt, c.DueAt
                }).ToListAsync(ct);
                return rows.Select(r =>
                {
                    var age = (int)Math.Floor((x.Now - r.CreatedAt).TotalDays);
                    return new AgingRow(r.Ref, r.Title, r.client, r.Priority.ToString(), r.Status.ToString(), r.owner ?? "Unassigned", r.team, r.CreatedAt, age, Bucket(age), r.DueAt, r.DueAt < x.Now);
                }).ToList();
            },
            Summarize = (x, rows) =>
            {
                var metrics = new List<ReportMetric>
                {
                    new("Open cases", rows.Count.ToString(CultureInfo.InvariantCulture), "Cases not closed or cancelled."),
                    new("Overdue", rows.Count(r => r.Overdue).ToString(CultureInfo.InvariantCulture), "Due date passed.", rows.Any(r => r.Overdue) ? "bad" : null),
                    new("Unassigned", rows.Count(r => r.Owner == "Unassigned").ToString(CultureInfo.InvariantCulture), "No accountable owner.", rows.Any(r => r.Owner == "Unassigned") ? "warn" : null),
                    new("Average age", rows.Count == 0 ? "Not available" : $"{Math.Round(rows.Average(r => r.AgeDays), 1).ToString(CultureInfo.InvariantCulture)} days", "Since creation."),
                    new("Older than 90 days", rows.Count(r => r.AgeDays > 90).ToString(CultureInfo.InvariantCulture), "Long-running backlog.", rows.Any(r => r.AgeDays > 90) ? "warn" : null)
                };
                string[] buckets = ["0–7 days", "8–30 days", "31–90 days", "Over 90 days"];
                return (metrics, [
                    new("Age buckets", ["Age", "Open cases", "Overdue"], buckets.Select(b => new object?[] { b, rows.Count(r => r.Bucket == b), rows.Count(r => r.Bucket == b && r.Overdue) }).ToList()),
                    new("By priority", ["Priority", "Open cases", "Overdue", "Over 30 days"], Enum.GetNames<Priority>().Select(p => new object?[] { p, rows.Count(r => r.Priority == p), rows.Count(r => r.Priority == p && r.Overdue), rows.Count(r => r.Priority == p && r.AgeDays > 30) }).ToList()),
                    new("By owner", ["Owner", "Open cases", "Overdue", "Oldest (days)"], rows.GroupBy(r => r.Owner).OrderByDescending(g => g.Count()).Select(g => new object?[] { g.Key, g.Count(), g.Count(r => r.Overdue), g.Max(r => r.AgeDays) }).ToList()),
                    new("By client", ["Client", "Open cases", "Overdue", "Oldest (days)"], rows.GroupBy(r => r.Client).OrderByDescending(g => g.Count()).Select(g => new object?[] { g.Key, g.Count(), g.Count(r => r.Overdue), g.Max(r => r.AgeDays) }).ToList())]);
            },
            Cols = [
                new("Reference", "Case reference", r => r.Ref), new("Title", "Case title", r => r.Title), new("Client", "Client alias or Internal", r => r.Client), new("Priority", "Priority", r => r.Priority),
                new("Status", "Hub status", r => r.Status), new("Owner", "Owner or Unassigned", r => r.Owner), new("Team", "Responsible team", r => r.Team), new("Created", "Creation time", r => r.Created),
                new("Age (days)", "Whole days since creation", r => r.AgeDays), new("Age bucket", "0–7, 8–30, 31–90 or over 90 days", r => r.Bucket), new("Due", "Due time; empty = no deadline", r => r.Due),
                new("Overdue", "Due time passed", r => r.Overdue)]
        });

        list.Add(new TableReport<WorkloadRow>
        {
            Key = "team-workload", Name = "Team workload report", Category = Performance, Icon = "team", Operational = true,
            Description = "Open cases and commitments per team and owner, with overdue and critical/high work — the current workload distribution.",
            Filters = [Client, Team, Product],
            Load = async (x, ct) =>
            {
                var cases = await (await Cases(x, new CaseFilter(ClientId: x.L("clientId"), ProductId: x.L("productId"), TeamId: x.L("teamId")), ct))
                    .Select(c => new { team = c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name, owner = c.Owner == null ? null : c.Owner.DisplayName, c.Priority, overdue = c.DueAt < x.Now }).ToListAsync(ct);
                var coms = await CommitmentQuery.Apply(x.Db.Commitments.AsNoTracking(), new CommitmentFilter(ClientId: x.L("clientId"), TeamId: x.L("teamId"), ProductId: x.L("productId")), x.Now, await x.Settings.UpcomingDaysAsync(ct), x.Db)
                    .Select(c => new { team = c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name, owner = c.Owner == null ? null : c.Owner.DisplayName, overdue = c.CurrentDueAt < x.Now }).ToListAsync(ct);
                var keys = cases.Select(c => (c.team, c.owner)).Concat(coms.Select(c => (c.team, c.owner))).Distinct();
                return keys.Select(k => new WorkloadRow(k.team ?? "No team", k.owner ?? "Unassigned",
                        cases.Count(c => c.team == k.team && c.owner == k.owner), cases.Count(c => c.team == k.team && c.owner == k.owner && c.overdue),
                        cases.Count(c => c.team == k.team && c.owner == k.owner && c.Priority is Priority.Critical or Priority.High),
                        coms.Count(c => c.team == k.team && c.owner == k.owner), coms.Count(c => c.team == k.team && c.owner == k.owner && c.overdue)))
                    .OrderBy(r => r.Team).ThenByDescending(r => r.Cases + r.Commitments).ToList();
            },
            Summarize = (x, rows) =>
            {
                var owners = rows.Where(r => r.Owner != "Unassigned").ToList();
                var metrics = new List<ReportMetric>
                {
                    new("Open cases", rows.Sum(r => r.Cases).ToString(CultureInfo.InvariantCulture), "Assigned and unassigned."),
                    new("Open commitments", rows.Sum(r => r.Commitments).ToString(CultureInfo.InvariantCulture), "Open promises."),
                    new("Overdue work", (rows.Sum(r => r.OverdueCases) + rows.Sum(r => r.OverdueCommitments)).ToString(CultureInfo.InvariantCulture), "Overdue cases plus overdue commitments.", rows.Any(r => r.OverdueCases + r.OverdueCommitments > 0) ? "bad" : null),
                    new("Unassigned cases", rows.Where(r => r.Owner == "Unassigned").Sum(r => r.Cases).ToString(CultureInfo.InvariantCulture), "Cases without an owner.", rows.Any(r => r.Owner == "Unassigned" && r.Cases > 0) ? "warn" : null),
                    new("Average per owner", owners.Count == 0 ? "Not available" : Math.Round(owners.Average(r => (double)(r.Cases + r.Commitments)), 1).ToString(CultureInfo.InvariantCulture), "Open cases and commitments per named owner and team.")
                };
                return (metrics, [new("By team", ["Team", "Open cases", "Overdue cases", "Critical/High", "Open commitments", "Overdue commitments"],
                    rows.GroupBy(r => r.Team).OrderBy(g => g.Key).Select(g => new object?[] { g.Key, g.Sum(r => r.Cases), g.Sum(r => r.OverdueCases), g.Sum(r => r.CriticalHigh), g.Sum(r => r.Commitments), g.Sum(r => r.OverdueCommitments) }).ToList())]);
            },
            Cols = [
                new("Team", "Responsible team", r => r.Team), new("Owner", "Owner or Unassigned", r => r.Owner), new("Open cases", "Cases not closed or cancelled", r => r.Cases),
                new("Overdue cases", "Due date passed", r => r.OverdueCases), new("Critical/High cases", "Open cases of Critical or High priority", r => r.CriticalHigh),
                new("Open commitments", "Open promises", r => r.Commitments), new("Overdue commitments", "Deadline in force passed", r => r.OverdueCommitments)]
        });

        list.Add(new TableReport<HealthRow>
        {
            Key = "client-health", Name = "Client health report", Category = Performance, Icon = "clients", Operational = true,
            Description = "Per client: open and overdue cases, overdue commitments, active and overdue escalations, open data-quality items and contractual SLA compliance.",
            Filters = [Client, .. Range("createdFrom", "createdTo", "SLA period", hint: "Cases opened in this range count for the SLA columns; empty = all.")],
            Load = async (x, ct) =>
            {
                var cid = x.L("clientId");
                var clients = await x.Db.Clients.AsNoTracking().Where(c => cid == null || c.Id == cid).OrderBy(c => c.Code).Select(c => new { c.Id, c.Code, c.Name }).ToListAsync(ct);
                var open = await (await Cases(x, new CaseFilter(ClientId: cid, Scope: WorkScope.Client), ct)).Select(c => new { c.ClientId, overdue = c.DueAt < x.Now }).ToListAsync(ct);
                var sla = await (await Cases(x, new CaseFilter(ClientId: cid, Scope: WorkScope.Client, Status: "all", Sla: "withContract", CreatedFrom: x.From("createdFrom"), CreatedTo: x.To("createdTo")), ct))
                    .Where(c => c.Status != CaseStatus.Cancelled).Select(c => new { c.ClientId, c.ResponseSlaStatus, c.ResponseDueAt, c.ResolutionSlaStatus, c.ResolutionDueAt }).ToListAsync(ct);
                var coms = await CommitmentQuery.Apply(x.Db.Commitments.AsNoTracking(), new CommitmentFilter(ClientId: cid), x.Now, await x.Settings.UpcomingDaysAsync(ct), x.Db)
                    .Where(c => c.ClientId != null && c.CurrentDueAt < x.Now).Select(c => c.ClientId!.Value).ToListAsync(ct);
                var esc = await EscalationQuery.Apply(x.Db.Escalations.AsNoTracking(), new EscalationFilter(ClientId: cid, Status: "all"), x.Now, x.Db)
                    .Where(e => Escalation.Active.Contains(e.Status)).Select(e => new { e.ClientId, overdue = (e.Status == EscalationStatus.Open && e.ResponseDueAt < x.Now) || e.ResolutionDueAt < x.Now }).ToListAsync(ct);
                var dq = await x.Db.DataQualityItems.AsNoTracking().Where(i => i.Status == DataQualityStatus.Open && i.ClientId != null && (cid == null || i.ClientId == cid)).Select(i => i.ClientId!.Value).ToListAsync(ct);
                return clients.Select(c =>
                {
                    var s = sla.Where(r => r.ClientId == c.Id).Select(r => (resp: CaseSla.Now(r.ResponseSlaStatus, r.ResponseDueAt, x.Now), reso: CaseSla.Now(r.ResolutionSlaStatus, r.ResolutionDueAt, x.Now))).ToList();
                    int respMeasured = s.Count(v => v.resp is SlaState.Met or SlaState.Breached), resoMeasured = s.Count(v => v.reso is SlaState.Met or SlaState.Breached);
                    return new HealthRow(c.Code, c.Name, open.Count(o => o.ClientId == c.Id), open.Count(o => o.ClientId == c.Id && o.overdue), coms.Count(v => v == c.Id),
                        esc.Count(e => e.ClientId == c.Id), esc.Count(e => e.ClientId == c.Id && e.overdue), dq.Count(v => v == c.Id),
                        Pct0(s.Count(v => v.resp == SlaState.Met), respMeasured), Pct0(s.Count(v => v.reso == SlaState.Met), resoMeasured), s.Count(v => v.resp == SlaState.Breached || v.reso == SlaState.Breached));
                }).ToList();
            },
            Summarize = (x, rows) =>
            {
                var attention = rows.Count(r => r.OverdueCases + r.OverdueCommitments + r.OverdueEscalations + r.SlaBreaches > 0);
                return ([
                    new("Clients", rows.Count.ToString(CultureInfo.InvariantCulture), "Clients you are authorized to see."),
                    new("Clients needing attention", attention.ToString(CultureInfo.InvariantCulture), "Any overdue case, commitment or escalation, or an SLA breach.", attention > 0 ? "warn" : null),
                    new("Open cases", rows.Sum(r => r.OpenCases).ToString(CultureInfo.InvariantCulture), "Client-related cases not closed or cancelled."),
                    new("Active escalations", rows.Sum(r => r.Escalations).ToString(CultureInfo.InvariantCulture), $"{rows.Sum(r => r.OverdueEscalations)} past a target.", rows.Any(r => r.OverdueEscalations > 0) ? "bad" : null),
                    new("SLA breaches", rows.Sum(r => r.SlaBreaches).ToString(CultureInfo.InvariantCulture), "Cases with a breached response or resolution (contract linked).", rows.Any(r => r.SlaBreaches > 0) ? "bad" : null)
                ], []);
            },
            Cols = [
                new("Client", "Client alias", r => r.Code), new("Name", "Client name", r => r.Name), new("Open cases", "Client-related cases not closed or cancelled", r => r.OpenCases),
                new("Overdue cases", "Open with the due date passed", r => r.OverdueCases), new("Overdue commitments", "Open with the deadline in force passed", r => r.OverdueCommitments),
                new("Active escalations", "Open, acknowledged or in progress", r => r.Escalations), new("Overdue escalations", "Past the response or resolution target", r => r.OverdueEscalations),
                new("Open data-quality items", "Records failing a quality rule", r => r.DataQuality), new("Response SLA", "Met ÷ (met + breached); empty = nothing measured", r => r.ResponseRate),
                new("Resolution SLA", "Met ÷ (met + breached); empty = nothing measured", r => r.ResolutionRate), new("SLA breaches", "Cases with a breached obligation", r => r.SlaBreaches)]
        });

        return list;
    }

    private static string Bucket(int days) => days <= 7 ? "0–7 days" : days <= 30 ? "8–30 days" : days <= 90 ? "31–90 days" : "Over 90 days";

    public sealed record EnvRow(string Client, string? Region, string Name, string Type, string Criticality, string? Hosting, string? Owner, string? Backup, string? Gap, string Condition, DateTimeOffset? Observed, DateTimeOffset? Inventory);
    public sealed record VerRow(string Client, string? Region, string Env, string Product, string Instance, string Version, DateOnly? Deployed, DateTimeOffset? Reviewed);
    public sealed record AssetRow(string Client, string Env, string Name, string Type, string? Role, string Lifecycle, string? Zone, decimal? Cpu, string? CpuUnit, decimal? Ram, string? RamUnit, string? Os, DateTimeOffset? Verified);
    public sealed record DqRow(string Rule, string Type, string Label, string Detail, string? Coordinator, string? Next, string Status, DateTimeOffset Opened);
    public sealed record SlaRow(string Ref, string Title, string? Client, string? Contract, string Priority, string? Team, string Owner, DateTimeOffset Created,
        DateTimeOffset? ResponseDue, DateTimeOffset? Responded, SlaState Response, DateTimeOffset? ResolutionDue, DateTimeOffset? Resolved, SlaState Resolution, bool AtRisk);
    public sealed record AgingRow(string Ref, string Title, string Client, string Priority, string Status, string Owner, string? Team, DateTimeOffset Created, int AgeDays, string Bucket, DateTimeOffset? Due, bool Overdue);
    public sealed record WorkloadRow(string Team, string Owner, int Cases, int OverdueCases, int CriticalHigh, int Commitments, int OverdueCommitments);
    public sealed record HealthRow(string Code, string Name, int OpenCases, int OverdueCases, int OverdueCommitments, int Escalations, int OverdueEscalations, int DataQuality, string? ResponseRate, string? ResolutionRate, int SlaBreaches);
}
