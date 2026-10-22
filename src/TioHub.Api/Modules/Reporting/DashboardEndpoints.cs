using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

public sealed record DashboardQuery(long? ClientId, long? TeamId, long? OwnerId, long? ProductId, string? Country, DateTimeOffset? AsOf, string? Category);

/// <summary>One action-list row. A60: Severity (Critical, High, Medium, Low) orders the command center queue; Priority is the record's own priority when it has one.</summary>
public sealed record ActionItem(string Category, string RecordType, long RecordId, string Reference, string Title, long? ClientId, string? ClientCode,
    string Owner, string Reason, string? NextAction, DateTimeOffset? DueAt, string Link, string Severity = "Medium", string? Priority = null);

/// <summary>
/// DAS-01…05: measures and the action list. Every count is produced by the same filter as its drilldown, at one evaluation time,
/// through the caller's scope filters — so a count always equals the rows behind it (AC-11). Deferred modules (tasks, changes, capacity) are absent, not zero.
/// </summary>
public sealed class Dashboard(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly string[] Categories = ["Unassigned", "Waiting", "ReviewOverdue", "OverdueCase", "CaseDueSoon", "OverdueCommitment", "ApproachingCommitment", "StaleReview", "CoverageGap",
        "DataQuality", "ContractRenewal", "PaymentDue", "EscalationOverdue", "EnvironmentCondition"];

    /// <summary>A60: how urgent each kind of item is; overdue Critical/High work and service outages come first.</summary>
    public static string SeverityOf(ActionItem a) => a.Category switch
    {
        "OverdueCase" => a.Priority is "Critical" or "High" ? "Critical" : "High",
        "CaseDueSoon" => a.Priority is "Critical" ? "Critical" : "High",
        "EscalationOverdue" => "Critical",
        "EnvironmentCondition" => a.Reason.StartsWith("Unavailable") ? "Critical" : "High",
        "OverdueCommitment" => "High",
        "PaymentDue" => a.Reason.StartsWith("Payment overdue") ? "High" : "Medium",
        // Ended but still Active, or the notice deadline has passed (ContractQuery.Reason).
        "ContractRenewal" => a.Reason.StartsWith("Ended") || a.Reason.Contains("has passed") ? "High" : "Medium",
        "Unassigned" => a.Priority is "Critical" or "High" ? "High" : "Medium",
        "CoverageGap" or "ApproachingCommitment" => "Medium",
        _ => "Low"
    };

    public async Task<object> MeasuresAsync(DashboardQuery p, CancellationToken ct)
    {
        var now = p.AsOf ?? DateTimeOffset.UtcNow;
        var days = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var baseCase = new CaseFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios);
        var baseCom = new CommitmentFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        IQueryable<Commitment> Coms(CommitmentFilter f) => CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, days, db);

        var open = await Cases(baseCase).Select(c => new { c.CreatedAt, waiting = c.WaitingIntervals.Select(w => new { w.StartedAt, w.EndedAt }).ToList() }).ToListAsync(ct);
        var waitingHours = open.SelectMany(c => c.waiting).Sum(w => ((w.EndedAt ?? now) - w.StartedAt).TotalHours);
        var link = Link(p, now);
        object M(string key, string label, int value, string definition, string drill) => new { key, label, value, definition, drilldown = drill };

        return new
        {
            evaluatedAt = now,
            upcomingDays = days,
            filters = p,
            cases = new object[]
            {
                M("openCases", "Open cases", open.Count, "All cases except Closed and Cancelled. Waiting cases stay open.", link("/cases", "status=open")),
                M("overdueCases", "Overdue cases", await Cases(baseCase with { Due = "overdue" }).CountAsync(ct), "Open cases with a due time strictly before the evaluation time.", link("/cases", "due=overdue")),
                M("noDeadlineCases", "Open cases without a deadline", await Cases(baseCase with { Due = "none" }).CountAsync(ct), "Open cases with no due time; not counted as overdue or on time.", link("/cases", "due=none")),
                M("unassignedCases", "Unassigned cases", await Cases(baseCase with { Unassigned = true }).CountAsync(ct), "Open cases with no owner (an ownership condition, not a status).", link("/cases", "unassigned=true")),
                M("waitingCases", "Waiting cases", await Cases(baseCase with { Waiting = true }).CountAsync(ct), "Open cases with a recorded waiting reason. Deadlines are not paused.", link("/cases", "waiting=true")),
                M("reviewOverdueCases", "Next review passed", await Cases(baseCase with { ReviewOverdue = true }).CountAsync(ct), "Open cases whose next-review time is in the past.", link("/cases", "reviewOverdue=true")),
                M("staleCases", "Stale cases", await Cases(baseCase with { Stale = true }).CountAsync(ct), "Open cases whose last meaningful review is older than the policy or whose next-review date passed.", link("/cases", "stale=true"))
            },
            caseAge = new
            {
                averageDays = open.Count == 0 ? (double?)null : Math.Round(open.Average(c => (now - c.CreatedAt).TotalDays), 1),
                oldestDays = open.Count == 0 ? (double?)null : Math.Round(open.Max(c => (now - c.CreatedAt).TotalDays), 1),
                totalWaitingHours = Math.Round(waitingHours, 1),
                definition = "Age is calendar time since creation for open cases. Waiting time sums recorded waiting intervals and does not pause any deadline."
            },
            commitments = new object[]
            {
                M("openCommitments", "Open commitments", await Coms(baseCom).CountAsync(ct), "Commitments with status Open.", link("/commitments", "status=open")),
                M("overdueCommitments", "Overdue commitments", await Coms(baseCom with { Due = "overdue" }).CountAsync(ct), "Open commitments whose current deadline is strictly before the evaluation time.", link("/commitments", "due=overdue")),
                M("upcomingCommitments", $"Due in the next {days} days", await Coms(baseCom with { Due = "upcoming" }).CountAsync(ct), $"Open commitments due between now and {days} calendar days ahead.", link("/commitments", "due=upcoming"))
            },
            actionCounts = (await ActionsAsync(p, ct)).GroupBy(a => a.Category).ToDictionary(g => g.Key, g => g.Count()),
            deferred = "Tasks, changes, capacity and on-time delivery rates are delivered in the Next release and are not shown."
        };
    }

    private static Func<string, string, string> Link(DashboardQuery p, DateTimeOffset now) => (path, extra) =>
    {
        var parts = new List<string> { extra };
        if (p.ClientId is not null) parts.Add($"clientId={p.ClientId}");
        if (p.TeamId is not null) parts.Add($"teamId={p.TeamId}");
        if (p.OwnerId is not null) parts.Add($"ownerId={p.OwnerId}");
        if (p.ProductId is not null) parts.Add($"productId={p.ProductId}");
        if (!string.IsNullOrWhiteSpace(p.Country)) parts.Add($"country={Uri.EscapeDataString(p.Country)}");
        if (p.AsOf is not null) parts.Add($"asOf={Uri.EscapeDataString(now.ToString("O"))}");
        return path + "?" + string.Join("&", parts.Where(x => x.Length > 0));
    };

    public async Task<List<ActionItem>> ActionsAsync(DashboardQuery p, CancellationToken ct)
    {
        var now = p.AsOf ?? DateTimeOffset.UtcNow;
        var days = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var crit = (await settings.CoverageCriticalitiesAsync(ct)).ToList();
        var baseCase = new CaseFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        var baseCom = new CommitmentFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        var list = new List<ActionItem>();
        bool Want(string c) => p.Category is null || p.Category == c;

        async Task AddCases(string category, CaseFilter f, Func<CaseEndpoints.CaseRow, string> reason)
        {
            if (!Want(category)) return;
            var rows = await CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios).Select(CaseEndpoints.Row(now, policy)).ToListAsync(ct);
            list.AddRange(rows.Select(r => new ActionItem(category, RecordTypes.Case, r.Id, r.Ref, r.Title, r.ClientId, r.ClientCode, r.OwnerName ?? "Unassigned", reason(r), r.NextAction, r.DueAt, $"/cases/{r.Id}", Priority: r.Priority.ToString())));
        }
        async Task AddCommitments(string category, CommitmentFilter f, Func<CommitmentEndpoints.CommitmentRow, string> reason)
        {
            if (!Want(category)) return;
            var rows = await CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, days, db).Select(CommitmentEndpoints.Row(now)).ToListAsync(ct);
            list.AddRange(rows.Select(r => new ActionItem(category, RecordTypes.Commitment, r.Id, r.Ref, r.Description, r.ClientId, r.ClientCode, r.OwnerName ?? "Unassigned", reason(r), null, r.CurrentDueAt, $"/commitments/{r.Id}")));
        }

        await AddCases("Unassigned", baseCase with { Unassigned = true }, _ => "No owner assigned");
        await AddCases("Waiting", baseCase with { Waiting = true }, r => $"Waiting on {r.WaitingReason} since {r.WaitingSince:yyyy-MM-dd}");
        await AddCases("ReviewOverdue", baseCase with { ReviewOverdue = true }, r => $"Next review was due {r.NextReviewAt:yyyy-MM-dd HH:mm} UTC");
        await AddCases("OverdueCase", baseCase with { Due = "overdue" }, r => $"Due {r.DueAt:yyyy-MM-dd HH:mm} UTC");
        await AddCases("CaseDueSoon", baseCase with { Due = "24h" }, r => $"Due within 24 hours ({r.DueAt:yyyy-MM-dd HH:mm} UTC)");
        await AddCommitments("OverdueCommitment", baseCom with { Due = "overdue" }, r => $"Due {r.CurrentDueAt:yyyy-MM-dd HH:mm} UTC ({r.TimeZone})");
        await AddCommitments("ApproachingCommitment", baseCom with { Due = "upcoming" }, r => $"Due within {days} days");
        await AddCases("StaleReview", baseCase with { Stale = true }, _ => "No meaningful review within the policy period");
        await AddCommitments("StaleReview", baseCom with { Stale = true }, r => $"Next review {r.NextReviewAt:yyyy-MM-dd} passed");

        if (Want("CoverageGap"))
        {
            await AddCases("CoverageGap", baseCase with { CoverageGap = true }, r => $"{r.Priority} priority case without an active backup owner");
            if (p.TeamId is null && p.OwnerId is null)
            {
                var envQ = db.Environments.AsNoTracking().Where(e => crit.Contains(e.Criticality) && (e.BackupOwnerUserId == null || !e.BackupOwner!.IsActive));
                if (p.ClientId is not null) envQ = envQ.Where(e => e.ClientId == p.ClientId);
                if (p.ProductId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == p.ProductId));
                if (!string.IsNullOrWhiteSpace(p.Country)) envQ = p.Country == "Unknown" ? envQ.Where(e => e.Client!.CountryUnknown) : envQ.Where(e => e.Client!.Country == p.Country);
                list.AddRange((await envQ.Select(e => new { e.Id, e.Name, e.ClientId, code = e.Client!.Code, e.Criticality, owner = e.Owner == null ? null : e.Owner.DisplayName, e.BackupGapReason }).ToListAsync(ct))
                    .Select(e => new ActionItem("CoverageGap", RecordTypes.Environment, e.Id, e.code, e.Name, e.ClientId, e.code, e.owner ?? "Unassigned",
                        $"{e.Criticality} environment without an active backup owner" + (e.BackupGapReason is null ? "" : $" ({e.BackupGapReason})"), "Assign a backup owner", null, $"/environments/{e.Id}")));
                foreach (var q in await TeamEndpoints.ReassignmentQueueAsync(db, ct))
                    if (p.ClientId is null || q.ClientId == p.ClientId)
                        list.Add(new ActionItem("CoverageGap", q.RecordType, q.Id, q.Label, q.Label, q.ClientId, null, q.OwnerName, $"{q.Reason} — awaiting reassignment", "Reassign or hand over", null, RecordLink(q.RecordType, q.Id)));
                var ho = db.Handovers.AsNoTracking().Where(h => h.Status == HandoverStatus.PendingAcknowledgment);
                if (p.ClientId is not null) ho = ho.Where(h => h.ClientId == p.ClientId);
                list.AddRange((await ho.Select(h => new { h.Id, h.Ref, h.Summary, h.ClientId, receiver = h.ReceivingOwner!.DisplayName, h.EffectiveAt }).ToListAsync(ct))
                    .Select(h => new ActionItem("CoverageGap", RecordTypes.Handover, h.Id, h.Ref, h.Summary, h.ClientId, null, h.receiver, "Handover awaiting acknowledgment", "Receiving owner acknowledges, or the Manager records an exception", h.EffectiveAt, $"/handovers/{h.Id}")));
            }
        }
        if (Want("DataQuality") && p.TeamId is null && p.ProductId is null)
        {
            var dq = QualityEndpoints.Filter(db.DataQualityItems.AsNoTracking(), null, p.ClientId, p.OwnerId, "Open", null);
            if (!string.IsNullOrWhiteSpace(p.Country)) dq = dq.Where(i => i.ClientId != null && db.Clients.Any(c => c.Id == i.ClientId && (p.Country == "Unknown" ? c.CountryUnknown : c.Country == p.Country)));
            list.AddRange((await dq.Select(i => new { i.Id, i.Rule, i.RecordType, i.RecordId, i.RecordLabel, i.Detail, i.ClientId, coordinator = i.Coordinator == null ? null : i.Coordinator.DisplayName, i.NextAction, i.NextReviewAt }).ToListAsync(ct))
                .Select(i => new ActionItem("DataQuality", i.RecordType, i.RecordId, DataQualityEngine.Rule.Labels.GetValueOrDefault(i.Rule, i.Rule), i.RecordLabel, i.ClientId, null, i.coordinator ?? "Unassigned", i.Detail, i.NextAction, i.NextReviewAt, $"/data-quality?rule={i.Rule}")));
        }
        if (Want("ContractRenewal") && p.TeamId is null && p.OwnerId is null)
        {
            var cq = ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(ClientId: p.ClientId, ProductId: p.ProductId, Country: p.Country, Renewal: "attention"), now, db);
            list.AddRange((await cq.Select(c => new { c.Id, c.Ref, c.Title, c.ClientId, code = c.Client!.Code, owner = c.Owner == null ? null : c.Owner.DisplayName, c.Status, c.EndDate, c.NoticeDays }).ToListAsync(ct))
                .Select(c =>
                {
                    var contract = new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays };
                    var state = ContractQuery.State(contract, now);
                    var next = state switch { "Expired" => "Record the renewal or mark the contract Ended", "EndDateUnknown" => "Record the end date from the contract", _ => "Decide on renewal before the notice deadline" };
                    return new ActionItem("ContractRenewal", RecordTypes.Contract, c.Id, c.Ref, c.Title, c.ClientId, c.code, c.owner ?? "Unassigned", ContractQuery.Reason(state, c.EndDate, contract.NoticeDeadline, now), next,
                        (contract.NoticeDeadline ?? c.EndDate)?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), $"/contracts/{c.Id}");
                }));
        }
        if (Want("PaymentDue") && p.TeamId is null)
        {
            // A50: open contract payments overdue or due within the reminder window.
            var payDays = await PaymentQuery.ReminderDaysAsync(db, ct);
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            list.AddRange((await PaymentQuery.Rows(db.Contracts.AsNoTracking(), new PaymentFilter(p.ClientId, p.OwnerId, p.ProductId, p.Country, State: "attention"), now, db, payDays).ToListAsync(ct))
                .Select(x => new ActionItem("PaymentDue", RecordTypes.Contract, x.ContractId, x.ContractRef, $"{x.Condition}{(x.Amount is { } a ? $" — {a:N2} {x.Currency}" : "")}", x.ClientId, x.ClientCode, x.Owner ?? "Unassigned",
                    x.DueDate < today ? $"Payment overdue since {x.DueDate:dd MMM yyyy}" : $"Payment due {x.DueDate:dd MMM yyyy}",
                    x.Status == PaymentStatus.Invoiced ? "Follow up the invoice; record Paid with the date when received" : "Invoice the client, then record the payment",
                    x.DueDate?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), $"/contracts/{x.ContractId}")));
        }
        if (Want("EscalationOverdue") && p.TeamId is null)
        {
            // A60: active escalations past their response target (still Open) or their resolution target.
            var eq = Escalations.EscalationQuery.Apply(db.Escalations.AsNoTracking(), new Escalations.EscalationFilter(ClientId: p.ClientId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country, Overdue: true), now, db);
            list.AddRange((await eq.Select(e => new { e.Id, e.Ref, e.Title, e.ClientId, code = e.Client!.Code, owner = e.Owner!.DisplayName, e.Level, e.Priority, e.Status, e.ResponseDueAt, e.ResolutionDueAt }).ToListAsync(ct))
                .Select(e =>
                {
                    var responseLate = e.Status == Escalations.EscalationStatus.Open && e.ResponseDueAt < now;
                    var due = responseLate ? e.ResponseDueAt : e.ResolutionDueAt;
                    return new ActionItem("EscalationOverdue", "Escalation", e.Id, e.Ref, e.Title, e.ClientId, e.code, e.owner,
                        $"Level {e.Level} · {(responseLate ? "response" : "resolution")} target passed", responseLate ? "Acknowledge and respond to the client" : "Resolve, or agree a new target", due, $"/escalations/{e.Id}", Priority: e.Priority.ToString());
                }));
        }
        if (Want("EnvironmentCondition") && p.TeamId is null)
        {
            // A60: environments reported Degraded or Unavailable (manual condition reports, not live monitoring).
            var envQ = db.Environments.AsNoTracking().Where(e => (e.Condition == Condition.Degraded || e.Condition == Condition.Unavailable) && db.Clients.Any(c => c.Id == e.ClientId));
            if (p.ClientId is not null) envQ = envQ.Where(e => e.ClientId == p.ClientId);
            if (p.ProductId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == p.ProductId));
            if (!string.IsNullOrWhiteSpace(p.Country)) envQ = p.Country == "Unknown" ? envQ.Where(e => e.Client!.CountryUnknown) : envQ.Where(e => e.Client!.Country == p.Country);
            if (p.OwnerId is not null) envQ = envQ.Where(e => e.OwnerUserId == p.OwnerId || e.BackupOwnerUserId == p.OwnerId);
            list.AddRange((await envQ.Select(e => new { e.Id, e.Name, e.ClientId, code = e.Client!.Code, owner = e.Owner == null ? null : e.Owner.DisplayName, e.Condition, e.ConditionReason, e.ConditionObservedAt }).ToListAsync(ct))
                .Select(e => new ActionItem("EnvironmentCondition", RecordTypes.Environment, e.Id, e.code, e.Name, e.ClientId, e.code, e.owner ?? "Unassigned",
                    $"{e.Condition} (reported){(e.ConditionReason is null ? "" : $" — {e.ConditionReason}")}", "Restore the service and report the condition", e.ConditionObservedAt, $"/environments/{e.Id}")));
        }
        return list.Select(a => a with { Severity = SeverityOf(a) }).ToList();
    }

    public static string RecordLink(string type, long id) => type switch
    {
        RecordTypes.Client => $"/clients/{id}", RecordTypes.Region => $"/regions/{id}", RecordTypes.Project => $"/projects/{id}", RecordTypes.Environment => $"/environments/{id}",
        RecordTypes.Asset => $"/assets/{id}", RecordTypes.Component => $"/components/{id}", RecordTypes.Case => $"/cases/{id}", RecordTypes.Commitment => $"/commitments/{id}",
        RecordTypes.Installation => $"/installations/{id}", RecordTypes.Contract => $"/contracts/{id}", _ => "/"
    };
}

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/dashboard").WithTags("Dashboard");
        g.MapGet("", async ([AsParameters] DashboardQuery p, Dashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            return Results.Ok(await dash.MeasuresAsync(p, ct));
        });
        g.MapGet("/insights", async ([AsParameters] DashboardQuery p, Insights insights, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            return Results.Ok(await insights.BuildAsync(p, ct));
        });
        // A60: the Operations Command Center's period and attention figures (period = today, 7d, 30d, quarter or custom with from/to).
        g.MapGet("/command-center", async ([AsParameters] DashboardQuery p, string? period, DateTimeOffset? from, DateTimeOffset? to, long? slaContractId, Priority? slaPriority, CommandCenter cc, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (period is not null && !CommandCenter.Periods.Contains(period)) throw new ValidationException("period", "Unknown reporting period.");
            if (period == "custom" && (from is null || to is null || from >= to)) throw new ValidationException("from", "Give a start before the end for a custom period.");
            if (period == "custom" && to - from > TimeSpan.FromDays(731)) throw new ValidationException("to", "A custom period can cover at most two years.");
            return Results.Ok(await cc.BuildAsync(p, period, from, to, access.Me, ct, slaContractId, slaPriority));
        });
        g.MapGet("/actions", async ([AsParameters] DashboardQuery p, Dashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (p.Category is not null && !Dashboard.Categories.Contains(p.Category)) throw new ValidationException("category", "Unknown action-list category.");
            var items = await dash.ActionsAsync(p, ct);
            return Results.Ok(new { evaluatedAt = p.AsOf ?? DateTimeOffset.UtcNow, categories = Dashboard.Categories.ToDictionary(c => c, c => items.Count(i => i.Category == c)), items });
        });
    }
}
