using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>One rule-based signal of a project: its state, the facts behind it, the rule in words and the list it opens.</summary>
public sealed record Signal(string Key, string Label, string State, string Text, string Rule, string? Link);

public static class SignalState
{
    public const string OnTrack = "OnTrack", Watch = "Watch", OffTrack = "OffTrack", Unknown = "Unknown";
}

public sealed record ContractFact(long Id, string Ref, string Title, string Type, ContractStatus Status, DateOnly? StartDate, DateOnly? EndDate, int? NoticeDays, string? Currency);
public sealed record MilestoneFact(long ContractId, string ContractRef, ContractStatus ContractStatus, int SortOrder, string Phase, string? Description, DateOnly? Date, int? Percent);
public sealed record PaymentFact(long Id, long ContractId, string ContractRef, ContractStatus ContractStatus, int SortOrder, string Condition, decimal? Amount, string? Currency, DateOnly? DueDate, PaymentStatus Status, DateOnly? PaidOn);
public sealed record EnvFact(long Id, string Name, string Type, EnvironmentType TypeCategory, Condition Condition, DateTimeOffset? ObservedAt, string? Reason);
public sealed record CaseFact(long Id, string Ref, string Title, Priority Priority, CaseStatus Status, DateTimeOffset CreatedAt, DateTimeOffset? DueAt, long? ContractId, string? Owner,
    SlaState Response, DateTimeOffset? ResponseDueAt, SlaState Resolution, DateTimeOffset? ResolutionDueAt, List<long> EnvIds);
public sealed record EscFact(long Id, string Ref, string Title, int Level, EscalationStatus Status, DateTimeOffset ReceivedAt, DateTimeOffset? ResponseDueAt, DateTimeOffset? ResolutionDueAt,
    long? ProjectId, long? ContractId, long? CaseId, string Owner);
public sealed record CommitFact(long Id, string Ref, string Description, DateTimeOffset DueAt, string? Owner, long ProjectId);
public sealed record StatusFact(long Id, ProjectReportedStatus Status, string Summary, DateOnly? NextReviewOn, DateTimeOffset RecordedAt, string? RecordedBy);

/// <summary>Everything the signals of one project are worked out from. Loaded through the caller's scope filters.</summary>
public sealed class ProjectFacts
{
    public long Id { get; init; }
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public long ClientId { get; init; }
    public string ClientCode { get; init; } = "";
    public string ClientName { get; init; } = "";
    public ProjectStatus RecordStatus { get; init; }
    public long? OwnerUserId { get; init; }
    public string? Owner { get; init; }
    public DateOnly? ServiceStart { get; init; }
    public DateOnly? ServiceEnd { get; init; }
    public string? ScopeSummary { get; init; }
    public List<ContractFact> Contracts { get; init; } = [];
    public List<MilestoneFact> Milestones { get; init; } = [];
    public List<PaymentFact> Payments { get; init; } = [];
    public List<EnvFact> Environments { get; init; } = [];
    /// <summary>Open cases, and cases opened in the SLA window (not cancelled).</summary>
    public List<CaseFact> Cases { get; init; } = [];
    /// <summary>Active escalations.</summary>
    public List<EscFact> Escalations { get; init; } = [];
    /// <summary>Open commitments.</summary>
    public List<CommitFact> Commitments { get; init; } = [];
    public StatusFact? Status { get; init; }
}

public sealed record SignalSettings(int ComplianceTarget, int StatusMaxAgeDays, ReviewPolicy? ConditionPolicy, int SlaWindowDays = ProjectSignals.SlaWindowDays);

public sealed record Verdict(string Agreement, string Text, bool Stale);

/// <summary>
/// A108: the rule-based signals shown beside a project's recorded status. They are not a score and never replace the recorded status
/// (DAS-02): each signal states its rule and its facts, missing data is Unknown (never On track), and the page says when the signals
/// contradict what the project manager recorded. Pure functions over <see cref="ProjectFacts"/>, so the rules are unit-tested.
/// </summary>
public static class ProjectSignals
{
    public const int SlaWindowDays = 90;
    public static readonly string[] Keys = ["delivery", "sla", "escalations", "commitments", "commercial", "environments", "review"];

    public static bool IsOpenPayment(PaymentFact p) => p.Status is PaymentStatus.Pending or PaymentStatus.Invoiced && p.ContractStatus != ContractStatus.Terminated;
    public static bool IsLate(MilestoneFact m, DateOnly today) => m.ContractStatus == ContractStatus.Active && m.Date is { } d && d < today && (m.Percent ?? 0) < 100;
    public static string MilestoneState(MilestoneFact m, DateOnly today) =>
        (m.Percent ?? 0) >= 100 ? "Done" : m.Date is null ? "Undated" : IsLate(m, today) ? "Late" : "Planned";

    public sealed record Tally(int Met, int Breached, int Pending, int NotMeasurable)
    {
        public int Measured => Met + Breached;
        public double? Rate => Measured == 0 ? null : Math.Round(100.0 * Met / Measured, 1);
        public static Tally Of(IEnumerable<SlaState> states)
        {
            var s = states.ToList();
            return new Tally(s.Count(x => x == SlaState.Met), s.Count(x => x == SlaState.Breached), s.Count(x => x == SlaState.Pending), s.Count(x => x == SlaState.NotMeasurable));
        }
    }

    public static (Tally Response, Tally Resolution, int OpenBreached) Sla(ProjectFacts f, DateTimeOffset now, int windowDays)
    {
        var from = now.AddDays(-windowDays);
        var rows = f.Cases.Where(c => c.ContractId != null && c.CreatedAt >= from).ToList();
        var response = Tally.Of(rows.Select(c => CaseSla.Now(c.Response, c.ResponseDueAt, now)));
        var resolution = Tally.Of(rows.Select(c => CaseSla.Now(c.Resolution, c.ResolutionDueAt, now)));
        var openBreached = f.Cases.Count(c => CaseQuery.IsOpen(c.Status) && c.ContractId != null
            && (CaseSla.Now(c.Response, c.ResponseDueAt, now) == SlaState.Breached || CaseSla.Now(c.Resolution, c.ResolutionDueAt, now) == SlaState.Breached));
        return (response, resolution, openBreached);
    }

    public static List<Signal> Evaluate(ProjectFacts f, DateTimeOffset now, SignalSettings s)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        string Days(int n) => n == 1 ? "1 day" : $"{n} days";
        var list = new List<Signal>();

        // ---- delivery: milestones of the Active contracts ----
        {
            const string rule = "Milestones of Active contracts. Late = planned date passed and completion below 100 %. Off track: two or more late, or one late by more than 30 days. Watch: one late. Unknown: no dated milestone.";
            var ms = f.Milestones.Where(m => m.ContractStatus == ContractStatus.Active && m.Date != null).ToList();
            var late = ms.Where(m => IsLate(m, today)).OrderBy(m => m.Date).ToList();
            var link = $"/projects/{f.Id}";
            if (ms.Count == 0) list.Add(new("delivery", "Delivery", SignalState.Unknown, "No dated milestone is recorded on an Active contract.", rule, link));
            else if (late.Count > 0)
            {
                var worst = today.DayNumber - late[0].Date!.Value.DayNumber;
                var state = late.Count >= 2 || worst > 30 ? SignalState.OffTrack : SignalState.Watch;
                list.Add(new("delivery", "Delivery", state, $"{late.Count} milestone(s) late — {late[0].Phase}, {Days(worst)}.", rule, link));
            }
            else
            {
                var next = ms.Where(m => (m.Percent ?? 0) < 100).OrderBy(m => m.Date).FirstOrDefault();
                list.Add(new("delivery", "Delivery", SignalState.OnTrack, next is null ? "All dated milestones are complete." : $"No milestone is late. Next: {next.Phase}, {next.Date:dd MMM yyyy}.", rule, link));
            }
        }

        // ---- service: measured contractual SLA of the project's cases ----
        {
            var rule = $"Tickets of the project opened in the last {s.SlaWindowDays} days with a linked contract. Rate = met ÷ (met + breached), the lower of response and resolution. "
                + $"Off track: more than 10 points under the {s.ComplianceTarget} % objective. Watch: under the objective, or an open ticket is breached. Unknown: nothing measured.";
            var (response, resolution, openBreached) = Sla(f, now, s.SlaWindowDays);
            var rates = new[] { response.Rate, resolution.Rate }.OfType<double>().ToList();
            var link = $"/cases?projectId={f.Id}&sla=withContract&status=all";
            string Pct(double? r) => r is null ? "not measured" : $"{r:0.#} %";
            var text = $"Response {Pct(response.Rate)} · resolution {Pct(resolution.Rate)}" + (openBreached > 0 ? $" · {openBreached} open ticket(s) breached" : "") + ".";
            if (rates.Count == 0 && openBreached == 0) list.Add(new("sla", "Service / SLA", SignalState.Unknown, $"No measured SLA obligation in the last {s.SlaWindowDays} days.", rule, link));
            else
            {
                var worst = rates.Count == 0 ? (double?)null : rates.Min();
                var state = worst < s.ComplianceTarget - 10 ? SignalState.OffTrack : worst < s.ComplianceTarget || openBreached > 0 ? SignalState.Watch : SignalState.OnTrack;
                list.Add(new("sla", "Service / SLA", state, text, rule, link));
            }
        }

        // ---- escalations ----
        {
            const string rule = "Active escalations of the project, its contracts or its tickets. Off track: one is at level 3 or past a target. Watch: any active escalation.";
            bool Late(EscFact e) => (e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now);
            var link = $"/escalations?clientId={f.ClientId}";
            if (f.Escalations.Count == 0) list.Add(new("escalations", "Escalations", SignalState.OnTrack, "No active escalation.", rule, link));
            else
            {
                var late = f.Escalations.Count(Late);
                var top = f.Escalations.Max(e => e.Level);
                list.Add(new("escalations", "Escalations", late > 0 || top >= 3 ? SignalState.OffTrack : SignalState.Watch,
                    $"{f.Escalations.Count} active, highest level {top}" + (late > 0 ? $", {late} past a target" : "") + ".", rule, link));
            }
        }

        // ---- commitments ----
        {
            const string rule = "Open commitments linked to the project. Off track: one or more overdue. Watch: one due within 48 hours.";
            var link = $"/commitments?clientId={f.ClientId}";
            var overdue = f.Commitments.Count(c => c.DueAt < now);
            var soon = f.Commitments.Count(c => c.DueAt >= now && c.DueAt <= now.AddHours(48));
            var next = f.Commitments.Where(c => c.DueAt >= now).OrderBy(c => c.DueAt).FirstOrDefault();
            if (overdue > 0) list.Add(new("commitments", "Commitments", SignalState.OffTrack, $"{overdue} of {f.Commitments.Count} open commitment(s) overdue.", rule, link));
            else if (soon > 0) list.Add(new("commitments", "Commitments", SignalState.Watch, $"{soon} commitment(s) due within 48 hours.", rule, link));
            else list.Add(new("commitments", "Commitments", SignalState.OnTrack, next is null ? "No open commitment." : $"None overdue. Next: {next.DueAt:dd MMM yyyy}.", rule, link));
        }

        // ---- commercial: payments and contract term ----
        {
            var rule = $"Recorded contract terms. Off track: an open payment is past its due date, or an Active contract has ended. Watch: a renewal decision is due within {ContractQuery.RenewalWindowDays} days or an end date is unknown. Unknown: no contract.";
            var link = $"/contracts?projectId={f.Id}";
            var overdue = f.Payments.Where(p => IsOpenPayment(p) && p.DueDate < today).OrderBy(p => p.DueDate).ToList();
            var states = f.Contracts.Select(c => ContractQuery.State(new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays }, now)).ToList();
            if (f.Contracts.Count == 0) list.Add(new("commercial", "Commercial", SignalState.Unknown, "No contract is recorded for this project.", rule, link));
            else if (overdue.Count > 0)
                list.Add(new("commercial", "Commercial", SignalState.OffTrack, $"{overdue.Count} payment(s) overdue, the oldest by {Days(today.DayNumber - overdue[0].DueDate!.Value.DayNumber)}.", rule, link));
            else if (states.Contains("Expired")) list.Add(new("commercial", "Commercial", SignalState.OffTrack, "A contract has ended but is still marked Active.", rule, link));
            else if (states.Contains("RenewalDue")) list.Add(new("commercial", "Commercial", SignalState.Watch, "A renewal decision is due.", rule, link));
            else if (states.Contains("EndDateUnknown")) list.Add(new("commercial", "Commercial", SignalState.Watch, "An Active contract has no recorded end date.", rule, link));
            else list.Add(new("commercial", "Commercial", SignalState.OnTrack, "No overdue payment; no renewal decision due.", rule, link));
        }

        // ---- environments: manually reported condition ----
        {
            const string rule = "Reported condition of the project's environments (manual reports, not monitoring). Off track: one is Unavailable. Watch: one is Degraded, has no report or needs verification. Unknown: no environment, or none reported.";
            var link = $"/projects/{f.Id}";
            var views = f.Environments.Select(e => EnvironmentEndpoints.ConditionView(e.Condition, e.ObservedAt, s.ConditionPolicy, now)).ToList();
            int N(Condition c) => views.Count(v => v.Reported == c);
            if (views.Count == 0) list.Add(new("environments", "Environments", SignalState.Unknown, "No environment is linked to this project.", rule, link));
            else if (N(Condition.Unknown) == views.Count) list.Add(new("environments", "Environments", SignalState.Unknown, "No condition has been reported for its environments.", rule, link));
            else
            {
                var stale = views.Count(v => v.NeedsVerification);
                var text = $"{N(Condition.Healthy)} healthy · {N(Condition.Degraded)} degraded · {N(Condition.Unavailable)} unavailable"
                    + (N(Condition.Unknown) > 0 ? $" · {N(Condition.Unknown)} not reported" : "") + (stale > 0 ? $" · {stale} need verification" : "") + ".";
                var state = N(Condition.Unavailable) > 0 ? SignalState.OffTrack : N(Condition.Degraded) > 0 || N(Condition.Unknown) > 0 || stale > 0 ? SignalState.Watch : SignalState.OnTrack;
                list.Add(new("environments", "Environments", state, text, rule, link));
            }
        }

        // ---- status review: how fresh the recorded status is ----
        {
            var rule = $"The recorded project status. Watch: recorded more than {s.StatusMaxAgeDays} days ago, or its next review date has passed. Unknown: no status recorded.";
            var link = $"/dashboards/project?projectId={f.Id}";
            if (f.Status is null) list.Add(new("review", "Status review", SignalState.Unknown, "No status has been recorded yet.", rule, link));
            else
            {
                var age = (int)(now - f.Status.RecordedAt).TotalDays;
                var stale = IsStale(f.Status, now, s.StatusMaxAgeDays);
                list.Add(new("review", "Status review", stale ? SignalState.Watch : SignalState.OnTrack,
                    stale ? $"Recorded {Days(age)} ago" + (f.Status.NextReviewOn < today ? $"; review was due {f.Status.NextReviewOn:dd MMM yyyy}." : ".") : $"Recorded {Days(age)} ago.", rule, link));
            }
        }
        return list;
    }

    public static bool IsStale(StatusFact st, DateTimeOffset now, int maxAgeDays) =>
        (now - st.RecordedAt).TotalDays > maxAgeDays || st.NextReviewOn < DateOnly.FromDateTime(now.UtcDateTime);

    /// <summary>Whether the signals support the recorded status. The recorded status is never changed by this.</summary>
    public static Verdict Compare(StatusFact? status, IReadOnlyCollection<Signal> signals, DateTimeOffset now, int maxAgeDays)
    {
        var facts = signals.Where(x => x.Key != "review").ToList();
        var off = facts.Where(x => x.State == SignalState.OffTrack).Select(x => x.Label).ToList();
        var watch = facts.Count(x => x.State == SignalState.Watch);
        var unknown = facts.Count(x => x.State == SignalState.Unknown);
        var summary = $"{off.Count} off track, {watch} watch, {facts.Count - off.Count - watch - unknown} on track" + (unknown > 0 ? $", {unknown} unknown" : "");
        if (status is null) return new Verdict("NoStatus", $"No status has been recorded for this project. Signals: {summary}.", false);
        var stale = IsStale(status, now, maxAgeDays);
        if (status.Status == ProjectReportedStatus.OnTrack && off.Count > 0)
            return new Verdict("Disagree", $"Signals disagree with the recorded status: {string.Join(", ", off)} off track. Ask the project manager to review.", stale);
        if (status.Status == ProjectReportedStatus.OffTrack && off.Count == 0 && watch == 0 && unknown < facts.Count)
            return new Verdict("Disagree", "Signals show nothing off track or on watch, but the recorded status is Off track. Review the status.", stale);
        if (stale) return new Verdict("Stale", $"The recorded status needs review (older than {maxAgeDays} days, or its review date passed). Signals: {summary}.", true);
        return new Verdict("Agree", $"Signals are consistent with the recorded status: {summary}.", false);
    }
}

/// <summary>A108: loads project facts through the caller's scope filters and builds the project dashboard and the portfolio rows.</summary>
public sealed class ProjectInsight(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly ProjectStatus[] Running = [ProjectStatus.Planned, ProjectStatus.Active, ProjectStatus.OnHold];

    public async Task<SignalSettings> SettingsAsync(CancellationToken ct) => new(
        await settings.SlaComplianceTargetAsync(ct), await settings.ProjectStatusMaxAgeDaysAsync(ct),
        (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition)));

    public async Task<List<ProjectFacts>> LoadAsync(IQueryable<Project> projects, DateTimeOffset now, CancellationToken ct)
    {
        var ps = await projects.AsNoTracking().Select(p => new
        {
            p.Id, p.Code, p.Name, p.ClientId, clientCode = p.Client!.Code, clientName = p.Client.Name, p.Status, p.OwnerUserId,
            owner = p.Owner == null ? null : p.Owner.DisplayName, p.ServiceStart, p.ServiceEnd, p.ScopeSummary
        }).ToListAsync(ct);
        var ids = ps.Select(p => p.Id).ToList();
        if (ids.Count == 0) return [];

        var contracts = await db.Contracts.AsNoTracking().Where(c => ids.Contains(c.ProjectId)).Select(c => new
        {
            c.Id, c.ProjectId, c.Ref, c.Title, c.Type, c.Status, c.StartDate, c.EndDate, c.NoticeDays, c.Currency,
            milestones = c.Milestones.Select(m => new { m.SortOrder, m.Phase, m.Description, m.Date, m.CompletionPercent }).ToList(),
            payments = c.Payments.Select(p => new { p.Id, p.SortOrder, p.Condition, p.Amount, p.DueDate, p.Status, p.PaidOn }).ToList()
        }).ToListAsync(ct);
        var contractProject = contracts.ToDictionary(c => c.Id, c => c.ProjectId);
        var contractIds = contracts.Select(c => (long?)c.Id).ToList();

        var envs = await db.Environments.AsNoTracking().Where(e => e.ProjectId != null && ids.Contains(e.ProjectId.Value))
            .Select(e => new { e.Id, projectId = e.ProjectId!.Value, e.Name, e.Type, e.TypeCategory, e.Condition, e.ConditionObservedAt, e.ConditionReason }).ToListAsync(ct);
        var envProject = envs.ToDictionary(e => e.Id, e => e.projectId);
        var envIds = envs.Select(e => e.Id).ToList();

        var from = now.AddDays(-ProjectSignals.SlaWindowDays);
        var cases = await db.Cases.AsNoTracking()
            .Where(c => c.Status != CaseStatus.Cancelled && (c.Status != CaseStatus.Closed || (c.SlaClockStartAt ?? c.CreatedAt) >= from))
            .Where(c => contractIds.Contains(c.ContractId) || c.Environments.Any(e => envIds.Contains(e.EnvironmentId)))
            .Select(c => new CaseFact(c.Id, c.Ref, c.Title, c.Priority, c.Status, c.SlaClockStartAt ?? c.CreatedAt, c.DueAt, c.ContractId, c.Owner == null ? null : c.Owner.DisplayName,
                c.ResponseSlaStatus, c.ResponseDueAt, c.ResolutionSlaStatus, c.ResolutionDueAt, c.Environments.Select(e => e.EnvironmentId).ToList())).ToListAsync(ct);
        HashSet<long> ProjectsOf(CaseFact c)
        {
            var set = new HashSet<long>();
            if (c.ContractId is { } k && contractProject.TryGetValue(k, out var p)) set.Add(p);
            foreach (var e in c.EnvIds) if (envProject.TryGetValue(e, out var ep)) set.Add(ep);
            return set;
        }
        var casesByProject = cases.SelectMany(c => ProjectsOf(c).Select(p => (p, c))).ToLookup(x => x.p, x => x.c);
        var caseProjects = cases.ToDictionary(c => c.Id, ProjectsOf);
        var caseIds = cases.Select(c => (long?)c.Id).ToList();
        var nullableIds = ids.Select(i => (long?)i).ToList();

        var escs = await db.Escalations.AsNoTracking()
            .Where(e => e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress)
            .Where(e => nullableIds.Contains(e.ProjectId) || contractIds.Contains(e.ContractId) || caseIds.Contains(e.CaseId))
            .Select(e => new EscFact(e.Id, e.Ref, e.Title, e.Level, e.Status, e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt, e.ProjectId, e.ContractId, e.CaseId, e.Owner!.DisplayName)).ToListAsync(ct);
        HashSet<long> ProjectsOfEsc(EscFact e)
        {
            var set = new HashSet<long>();
            if (e.ProjectId is { } p && ids.Contains(p)) set.Add(p);
            if (e.ContractId is { } k && contractProject.TryGetValue(k, out var kp)) set.Add(kp);
            if (e.CaseId is { } c && caseProjects.TryGetValue(c, out var cp)) set.UnionWith(cp);
            return set;
        }
        var escByProject = escs.SelectMany(e => ProjectsOfEsc(e).Select(p => (p, e))).ToLookup(x => x.p, x => x.e);

        var commitments = (await db.Commitments.AsNoTracking().Where(c => c.Status == CommitmentStatus.Open && nullableIds.Contains(c.ProjectId))
            .Select(c => new CommitFact(c.Id, c.Ref, c.Description, c.CurrentDueAt, c.Owner == null ? null : c.Owner.DisplayName, c.ProjectId!.Value)).ToListAsync(ct)).ToLookup(c => c.ProjectId);

        var status = (await db.ProjectStatusReports.AsNoTracking().Where(r => ids.Contains(r.ProjectId)
                && r.Id == db.ProjectStatusReports.Where(x => x.ProjectId == r.ProjectId).OrderByDescending(x => x.RecordedAt).ThenByDescending(x => x.Id).Select(x => x.Id).First())
            .Select(r => new { r.ProjectId, fact = new StatusFact(r.Id, r.Status, r.Summary, r.NextReviewOn, r.RecordedAt, r.RecordedBy == null ? null : r.RecordedBy.DisplayName) }).ToListAsync(ct))
            .ToDictionary(x => x.ProjectId, x => x.fact);

        return ps.Select(p => new ProjectFacts
        {
            Id = p.Id, Code = p.Code, Name = p.Name, ClientId = p.ClientId, ClientCode = p.clientCode, ClientName = p.clientName, RecordStatus = p.Status, OwnerUserId = p.OwnerUserId, Owner = p.owner,
            ServiceStart = p.ServiceStart, ServiceEnd = p.ServiceEnd, ScopeSummary = p.ScopeSummary,
            Contracts = contracts.Where(c => c.ProjectId == p.Id).Select(c => new ContractFact(c.Id, c.Ref, c.Title, c.Type, c.Status, c.StartDate, c.EndDate, c.NoticeDays, c.Currency)).ToList(),
            Milestones = contracts.Where(c => c.ProjectId == p.Id).SelectMany(c => c.milestones.Select(m => new MilestoneFact(c.Id, c.Ref, c.Status, m.SortOrder, m.Phase, m.Description, m.Date, m.CompletionPercent))).ToList(),
            Payments = contracts.Where(c => c.ProjectId == p.Id).SelectMany(c => c.payments.Select(x => new PaymentFact(x.Id, c.Id, c.Ref, c.Status, x.SortOrder, x.Condition, x.Amount, c.Currency, x.DueDate, x.Status, x.PaidOn))).ToList(),
            Environments = envs.Where(e => e.projectId == p.Id).Select(e => new EnvFact(e.Id, e.Name, e.Type, e.TypeCategory, e.Condition, e.ConditionObservedAt, e.ConditionReason)).ToList(),
            Cases = casesByProject[p.Id].ToList(),
            Escalations = escByProject[p.Id].ToList(),
            Commitments = commitments[p.Id].ToList(),
            Status = status.GetValueOrDefault(p.Id)
        }).ToList();
    }

    public sealed record PortfolioRow(long Id, string Code, string Name, long ClientId, string ClientCode, string ClientName, string RecordStatus, string? Owner,
        string? Status, string? StatusSummary, DateTimeOffset? StatusRecordedAt, int? StatusAgeDays, bool StatusStale, string Agreement, List<Signal> Signals, string? NextMilestone, DateOnly? NextMilestoneDate, bool NextMilestoneLate);

    /// <summary>One row per running project (Planned, Active, On hold): the recorded status and the signals. Worst first.</summary>
    public async Task<List<PortfolioRow>> PortfolioAsync(long? clientId, string? country, long? productId, long? ownerId, DateTimeOffset now, CancellationToken ct)
    {
        var q = db.Projects.Where(p => Running.Contains(p.Status));
        if (clientId is not null) q = q.Where(p => p.ClientId == clientId);
        if (ownerId is not null) q = q.Where(p => p.OwnerUserId == ownerId);
        if (productId is not null) q = q.Where(p => p.Products.Any(x => x.ProductId == productId));
        if (!string.IsNullOrWhiteSpace(country)) q = country == "Unknown" ? q.Where(p => p.Client!.CountryUnknown) : q.Where(p => p.Client!.Country == country);
        var s = await SettingsAsync(ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var rows = (await LoadAsync(q, now, ct)).Select(f =>
        {
            var signals = ProjectSignals.Evaluate(f, now, s);
            var verdict = ProjectSignals.Compare(f.Status, signals, now, s.StatusMaxAgeDays);
            var next = f.Milestones.Where(m => m.ContractStatus == ContractStatus.Active && m.Date != null && (m.Percent ?? 0) < 100).OrderBy(m => m.Date).FirstOrDefault();
            return new PortfolioRow(f.Id, f.Code, f.Name, f.ClientId, f.ClientCode, f.ClientName, f.RecordStatus.ToString(), f.Owner,
                f.Status?.Status.ToString(), f.Status?.Summary, f.Status?.RecordedAt, f.Status is null ? null : (int)(now - f.Status.RecordedAt).TotalDays,
                f.Status is not null && ProjectSignals.IsStale(f.Status, now, s.StatusMaxAgeDays), verdict.Agreement, signals, next?.Phase, next?.Date, next is not null && ProjectSignals.IsLate(next, today));
        }).ToList();
        static int Rank(PortfolioRow r) => r.Status switch { "OffTrack" => 0, "AtRisk" => 1, null => 2, _ => 3 };
        return rows.OrderBy(Rank).ThenByDescending(r => r.Signals.Count(x => x.State == SignalState.OffTrack)).ThenBy(r => r.NextMilestoneDate ?? DateOnly.MaxValue).ThenBy(r => r.Code).ToList();
    }

    /// <summary>The project dashboard: recorded status, signals and the records behind them.</summary>
    public async Task<object> ProjectAsync(long id, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var f = (await LoadAsync(db.Projects.Where(p => p.Id == id), now, ct)).FirstOrDefault() ?? throw new NotFoundException("The project");
        var s = await SettingsAsync(ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var signals = ProjectSignals.Evaluate(f, now, s);
        var verdict = ProjectSignals.Compare(f.Status, signals, now, s.StatusMaxAgeDays);
        var (response, resolution, openBreached) = ProjectSignals.Sla(f, now, s.SlaWindowDays);
        var reminder = await PaymentQuery.ReminderDaysAsync(db, ct);
        object T(ProjectSignals.Tally t) => new { met = t.Met, breached = t.Breached, pending = t.Pending, notMeasurable = t.NotMeasurable, measured = t.Measured, rate = t.Rate };

        var products = await db.ProjectProducts.AsNoTracking().Where(pp => pp.ProjectId == id).Join(db.Products, pp => pp.ProductId, pr => pr.Id, (pp, pr) => new { pr.Id, pr.Code, pr.Name }).ToListAsync(ct);
        var envIds = f.Environments.Select(e => e.Id).ToList();
        var installs = await db.Installations.AsNoTracking().Where(i => envIds.Contains(i.EnvironmentId))
            .Select(i => new { i.EnvironmentId, product = i.Product!.Code, version = i.ProductVersion == null ? null : i.ProductVersion.Version }).ToListAsync(ct);
        var team = await db.ClientTeamMembers.AsNoTracking().Where(t => t.ClientId == f.ClientId).OrderBy(t => t.SortOrder)
            .Select(t => new { t.UserId, name = t.User!.DisplayName, t.Role, active = t.User.IsActive }).ToListAsync(ct);
        var history = await db.ProjectStatusReports.AsNoTracking().Where(r => r.ProjectId == id).OrderByDescending(r => r.RecordedAt).ThenByDescending(r => r.Id).Take(10)
            .Select(r => new { r.Id, status = r.Status.ToString(), r.Summary, r.NextReviewOn, r.RecordedAt, recordedBy = r.RecordedBy == null ? null : r.RecordedBy.DisplayName }).ToListAsync(ct);

        var open = f.Cases.Where(c => CaseQuery.IsOpen(c.Status)).ToList();
        string CaseLink(string extra) => $"/cases?projectId={id}" + (extra.Length > 0 ? "&" + extra : "");

        // Recent events worked out from the records (not a separate log): newest first.
        var activity = new List<(DateTimeOffset At, string Text, string Link)>();
        activity.AddRange(history.Take(5).Select(h => (h.RecordedAt, $"Status recorded as {Words(h.status)} by {h.recordedBy ?? "an unknown user"}", $"/dashboards/project?projectId={id}")));
        activity.AddRange(f.Cases.Where(c => c.CreatedAt >= now.AddDays(-30)).Select(c => (c.CreatedAt, $"{c.Ref} opened ({c.Priority}) — {c.Title}", $"/cases/{c.Id}")));
        activity.AddRange(f.Escalations.Select(e => (e.ReceivedAt, $"{e.Ref} escalation received (level {e.Level}) — {e.Title}", $"/escalations/{e.Id}")));
        activity.AddRange(f.Milestones.Where(m => ProjectSignals.IsLate(m, today)).Select(m => (new DateTimeOffset(m.Date!.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), $"Milestone “{m.Phase}” passed its planned date ({m.Percent ?? 0} % complete)", $"/contracts/{m.ContractId}")));
        activity.AddRange(f.Payments.Where(p => ProjectSignals.IsOpenPayment(p) && p.DueDate < today).Select(p => (new DateTimeOffset(p.DueDate!.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), $"Payment “{p.Condition}” became overdue", $"/contracts/{p.ContractId}")));

        return new
        {
            evaluatedAt = now,
            project = new
            {
                f.Id, f.Code, f.Name, f.ClientId, f.ClientCode, f.ClientName, recordStatus = f.RecordStatus.ToString(), f.Owner, f.OwnerUserId, f.ServiceStart, f.ServiceEnd, f.ScopeSummary, products
            },
            status = new
            {
                recorded = f.Status is null ? null : new { status = f.Status.Status.ToString(), f.Status.Summary, f.Status.NextReviewOn, f.Status.RecordedAt, f.Status.RecordedBy, ageDays = (int)(now - f.Status.RecordedAt).TotalDays },
                agreement = verdict.Agreement, agreementText = verdict.Text, stale = verdict.Stale, maxAgeDays = s.StatusMaxAgeDays,
                canRecord = me.SeesContext(ResourceContext.ForRecord(f.ClientId, null)) && me.HasRightIn(RightKeys.Projects, RightKeys.Maintain, ResourceContext.ForRecord(f.ClientId, null)),
                history
            },
            signals,
            contracts = f.Contracts.OrderByDescending(c => c.Status == ContractStatus.Active).ThenBy(c => c.StartDate).Select(c =>
            {
                var k = new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays };
                return new { c.Id, c.Ref, c.Title, c.Type, status = c.Status.ToString(), c.StartDate, c.EndDate, noticeDeadline = k.NoticeDeadline, state = ContractQuery.State(k, now) };
            }).ToList(),
            milestones = f.Milestones.Where(m => m.ContractStatus != ContractStatus.Terminated).OrderBy(m => m.Date ?? DateOnly.MaxValue).ThenBy(m => m.SortOrder)
                .Select(m => new { m.ContractId, m.ContractRef, m.Phase, m.Description, m.Date, percent = m.Percent, state = ProjectSignals.MilestoneState(m, today) }).ToList(),
            payments = f.Payments.OrderBy(p => p.DueDate ?? DateOnly.MaxValue).ThenBy(p => p.SortOrder).Select(p => new
            {
                p.Id, p.ContractId, p.ContractRef, p.Condition, p.Amount, p.Currency, p.DueDate, status = p.Status.ToString(), p.PaidOn,
                state = PaymentQuery.StateOf(new PaymentRow { ContractStatus = p.ContractStatus, DueDate = p.DueDate, Status = p.Status }, today, reminder)
            }).ToList(),
            cases = new
            {
                open = open.Count,
                overdue = open.Count(c => c.DueAt < now),
                link = CaseLink(""),
                byPriority = Enum.GetValues<Priority>().Select(pr => new { key = pr.ToString(), label = pr.ToString(), value = open.Count(c => c.Priority == pr), link = CaseLink($"priority={pr}") }).ToList(),
                list = open.OrderBy(c => c.Priority).ThenBy(c => c.DueAt ?? DateTimeOffset.MaxValue).Take(8)
                    .Select(c => new { c.Id, c.Ref, c.Title, priority = c.Priority.ToString(), status = c.Status.ToString(), c.Owner, c.DueAt, overdue = c.DueAt < now }).ToList()
            },
            sla = new { target = s.ComplianceTarget, windowDays = s.SlaWindowDays, response = T(response), resolution = T(resolution), openBreached, link = CaseLink("sla=withContract&status=all") },
            escalations = f.Escalations.OrderByDescending(e => e.Level).ThenBy(e => e.ReceivedAt).Select(e => new
            {
                e.Id, e.Ref, e.Title, e.Level, status = e.Status.ToString(), e.Owner, e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt,
                overdue = (e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now)
            }).ToList(),
            commitments = f.Commitments.OrderBy(c => c.DueAt).Take(8).Select(c => new { c.Id, c.Ref, c.Description, dueAt = c.DueAt, c.Owner, overdue = c.DueAt < now }).ToList(),
            environments = f.Environments.OrderBy(e => e.TypeCategory).ThenBy(e => e.Name).Select(e => new
            {
                e.Id, e.Name, e.Type, condition = EnvironmentEndpoints.ConditionView(e.Condition, e.ObservedAt, s.ConditionPolicy, now), reason = e.Reason,
                installations = installs.Where(i => i.EnvironmentId == e.Id).Select(i => new { i.product, i.version }).ToList()
            }).ToList(),
            team = new { note = "The project team is recorded per client (A29): everyone on this client's team is shown.", members = team },
            activity = activity.OrderByDescending(a => a.At).Take(10).Select(a => new { at = a.At, text = a.Text, link = a.Link }).ToList()
        };
    }

    public static string Words(string status) => status switch { "OnTrack" => "On track", "AtRisk" => "At risk", "OffTrack" => "Off track", _ => status };
}
