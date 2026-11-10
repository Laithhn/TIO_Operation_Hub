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

/// <summary>One rule-based signal of a client: its state, the facts behind it, the rule in words and the list it opens.</summary>
public sealed record Signal(string Key, string Label, string State, string Text, string Rule, string? Link);

public static class SignalState
{
    public const string OnTrack = "OnTrack", Watch = "Watch", OffTrack = "OffTrack", Unknown = "Unknown";
}

public sealed record ProjectFact(long Id, string Code, string Name, ProjectStatus Status, string? Owner, DateOnly? ServiceStart, DateOnly? ServiceEnd);
public sealed record ContractFact(long Id, string Ref, string Title, string Type, ContractStatus Status, DateOnly? StartDate, DateOnly? EndDate, int? NoticeDays, string? Currency, long ProjectId = 0, string? ProjectCode = null);
public sealed record MilestoneFact(long ContractId, string ContractRef, ContractStatus ContractStatus, int SortOrder, string Phase, string? Description, DateOnly? Date, int? Percent);
public sealed record PaymentFact(long Id, long ContractId, string ContractRef, ContractStatus ContractStatus, int SortOrder, string Condition, decimal? Amount, string? Currency, DateOnly? DueDate, PaymentStatus Status, DateOnly? PaidOn);
public sealed record EnvFact(long Id, string Name, string Type, EnvironmentType TypeCategory, Condition Condition, DateTimeOffset? ObservedAt, string? Reason);
public sealed record CaseFact(long Id, string Ref, string Title, Priority Priority, CaseStatus Status, DateTimeOffset CreatedAt, DateTimeOffset? DueAt, long? ContractId, string? Owner,
    SlaState Response, DateTimeOffset? ResponseDueAt, SlaState Resolution, DateTimeOffset? ResolutionDueAt);
public sealed record EscFact(long Id, string Ref, string Title, int Level, EscalationStatus Status, DateTimeOffset ReceivedAt, DateTimeOffset? ResponseDueAt, DateTimeOffset? ResolutionDueAt, string Owner);
public sealed record CommitFact(long Id, string Ref, string Description, DateTimeOffset DueAt, string? Owner);
public sealed record StatusFact(long Id, ReportedStatus Status, string Summary, DateOnly? NextReviewOn, DateTimeOffset RecordedAt, string? RecordedBy);

/// <summary>Everything the signals of one client are worked out from. Loaded through the caller's scope filters.</summary>
public sealed class ClientFacts
{
    public long Id { get; init; }
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public ClientStatus RecordStatus { get; init; }
    public long? OwnerUserId { get; init; }
    public string? Owner { get; init; }
    public string? Country { get; init; }
    public List<ProjectFact> Projects { get; init; } = [];
    public List<ContractFact> Contracts { get; init; } = [];
    public List<MilestoneFact> Milestones { get; init; } = [];
    public List<PaymentFact> Payments { get; init; } = [];
    public List<EnvFact> Environments { get; init; } = [];
    /// <summary>Open tickets of the client, and its tickets opened in the SLA window (not cancelled).</summary>
    public List<CaseFact> Cases { get; init; } = [];
    /// <summary>Active escalations.</summary>
    public List<EscFact> Escalations { get; init; } = [];
    /// <summary>Open commitments.</summary>
    public List<CommitFact> Commitments { get; init; } = [];
    public StatusFact? Status { get; init; }
}

public sealed record SignalSettings(int ComplianceTarget, int StatusMaxAgeDays, ReviewPolicy? ConditionPolicy, int SlaWindowDays = ClientSignals.SlaWindowDays);

public sealed record Verdict(string Agreement, string Text, bool Stale);

/// <summary>
/// A108/A109: the rule-based signals shown beside a client's recorded status. They are not a score and never replace the recorded status
/// (DAS-02): each signal states its rule and its facts, missing data is Unknown (never On track), and the page says when the signals
/// contradict what was recorded. Pure functions over <see cref="ClientFacts"/>, so the rules are unit-tested.
/// 2.59.0 worked the same rules out per project; A109 moved them to the client, across all its projects.
/// </summary>
public static class ClientSignals
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

    public static (Tally Response, Tally Resolution, int OpenBreached) Sla(ClientFacts f, DateTimeOffset now, int windowDays)
    {
        var from = now.AddDays(-windowDays);
        var rows = f.Cases.Where(c => c.ContractId != null && c.CreatedAt >= from).ToList();
        var response = Tally.Of(rows.Select(c => CaseSla.Now(c.Response, c.ResponseDueAt, now)));
        var resolution = Tally.Of(rows.Select(c => CaseSla.Now(c.Resolution, c.ResolutionDueAt, now)));
        var openBreached = f.Cases.Count(c => CaseQuery.IsOpen(c.Status) && c.ContractId != null
            && (CaseSla.Now(c.Response, c.ResponseDueAt, now) == SlaState.Breached || CaseSla.Now(c.Resolution, c.ResolutionDueAt, now) == SlaState.Breached));
        return (response, resolution, openBreached);
    }

    public static List<Signal> Evaluate(ClientFacts f, DateTimeOffset now, SignalSettings s)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        string Days(int n) => n == 1 ? "1 day" : $"{n} days";
        var list = new List<Signal>();

        // ---- delivery: milestones of the Active contracts ----
        {
            const string rule = "Milestones of the client's Active contracts, in all its projects. Late = planned date passed and completion below 100 %. Off track: two or more late, or one late by more than 30 days. Watch: one late. Unknown: no dated milestone.";
            var ms = f.Milestones.Where(m => m.ContractStatus == ContractStatus.Active && m.Date != null).ToList();
            var late = ms.Where(m => IsLate(m, today)).OrderBy(m => m.Date).ToList();
            var link = $"/contracts?clientId={f.Id}";
            if (ms.Count == 0) list.Add(new("delivery", "Delivery", SignalState.Unknown, "No dated milestone is recorded on an Active contract.", rule, link));
            else if (late.Count > 0)
            {
                var worst = today.DayNumber - late[0].Date!.Value.DayNumber;
                var state = late.Count >= 2 || worst > 30 ? SignalState.OffTrack : SignalState.Watch;
                list.Add(new("delivery", "Delivery", state, $"{late.Count} milestone(s) late — {late[0].Phase} ({late[0].ContractRef}), {Days(worst)}.", rule, link));
            }
            else
            {
                var next = ms.Where(m => (m.Percent ?? 0) < 100).OrderBy(m => m.Date).FirstOrDefault();
                list.Add(new("delivery", "Delivery", SignalState.OnTrack, next is null ? "All dated milestones are complete." : $"No milestone is late. Next: {next.Phase}, {next.Date:dd MMM yyyy}.", rule, link));
            }
        }

        // ---- service: measured contractual SLA of the client's tickets ----
        {
            var rule = $"Tickets of the client opened in the last {s.SlaWindowDays} days with a linked contract. Rate = met ÷ (met + breached), the lower of response and resolution. "
                + $"Off track: more than 10 points under the {s.ComplianceTarget} % objective. Watch: under the objective, or an open ticket is breached. Unknown: nothing measured.";
            var (response, resolution, openBreached) = Sla(f, now, s.SlaWindowDays);
            var rates = new[] { response.Rate, resolution.Rate }.OfType<double>().ToList();
            var link = $"/cases?clientId={f.Id}&sla=withContract&status=all";
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
            const string rule = "Active escalations of the client. Off track: one is at level 3 or past a target. Watch: any active escalation.";
            bool Late(EscFact e) => (e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now);
            var link = $"/escalations?clientId={f.Id}";
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
            const string rule = "Open commitments of the client. Off track: one or more overdue. Watch: one due within 48 hours.";
            var link = $"/commitments?clientId={f.Id}";
            var overdue = f.Commitments.Count(c => c.DueAt < now);
            var soon = f.Commitments.Count(c => c.DueAt >= now && c.DueAt <= now.AddHours(48));
            var next = f.Commitments.Where(c => c.DueAt >= now).OrderBy(c => c.DueAt).FirstOrDefault();
            if (overdue > 0) list.Add(new("commitments", "Commitments", SignalState.OffTrack, $"{overdue} of {f.Commitments.Count} open commitment(s) overdue.", rule, link));
            else if (soon > 0) list.Add(new("commitments", "Commitments", SignalState.Watch, $"{soon} commitment(s) due within 48 hours.", rule, link));
            else list.Add(new("commitments", "Commitments", SignalState.OnTrack, next is null ? "No open commitment." : $"None overdue. Next: {next.DueAt:dd MMM yyyy}.", rule, link));
        }

        // ---- commercial: payments and contract term ----
        {
            var rule = $"Recorded terms of the client's contracts. Off track: an open payment is past its due date, or an Active contract has ended. Watch: a renewal decision is due within {ContractQuery.RenewalWindowDays} days or an end date is unknown. Unknown: no contract.";
            var link = $"/contracts?clientId={f.Id}";
            var overdue = f.Payments.Where(p => IsOpenPayment(p) && p.DueDate < today).OrderBy(p => p.DueDate).ToList();
            var states = f.Contracts.Select(c => ContractQuery.State(new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays }, now)).ToList();
            if (f.Contracts.Count == 0) list.Add(new("commercial", "Commercial", SignalState.Unknown, "No contract is recorded for this client.", rule, link));
            else if (overdue.Count > 0)
                list.Add(new("commercial", "Commercial", SignalState.OffTrack, $"{overdue.Count} payment(s) overdue, the oldest by {Days(today.DayNumber - overdue[0].DueDate!.Value.DayNumber)}.", rule, link));
            else if (states.Contains("Expired")) list.Add(new("commercial", "Commercial", SignalState.OffTrack, "A contract has ended but is still marked Active.", rule, link));
            else if (states.Contains("RenewalDue")) list.Add(new("commercial", "Commercial", SignalState.Watch, "A renewal decision is due.", rule, link));
            else if (states.Contains("EndDateUnknown")) list.Add(new("commercial", "Commercial", SignalState.Watch, "An Active contract has no recorded end date.", rule, link));
            else list.Add(new("commercial", "Commercial", SignalState.OnTrack, "No overdue payment; no renewal decision due.", rule, link));
        }

        // ---- environments: manually reported condition ----
        {
            const string rule = "Reported condition of the client's environments (manual reports, not monitoring). Off track: one is Unavailable. Watch: one is Degraded, has no report or needs verification. Unknown: no environment, or none reported.";
            var link = $"/environments?clientId={f.Id}";
            var views = f.Environments.Select(e => EnvironmentEndpoints.ConditionView(e.Condition, e.ObservedAt, s.ConditionPolicy, now)).ToList();
            int N(Condition c) => views.Count(v => v.Reported == c);
            if (views.Count == 0) list.Add(new("environments", "Environments", SignalState.Unknown, "No environment is recorded for this client.", rule, link));
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
            var rule = $"The recorded client status. Watch: recorded more than {s.StatusMaxAgeDays} days ago, or its next review date has passed. Unknown: no status recorded.";
            var link = $"/dashboards/client?clientId={f.Id}";
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
        if (status is null) return new Verdict("NoStatus", $"No status has been recorded for this client. Signals: {summary}.", false);
        var stale = IsStale(status, now, maxAgeDays);
        if (status.Status == ReportedStatus.OnTrack && off.Count > 0)
            return new Verdict("Disagree", $"Signals disagree with the recorded status: {string.Join(", ", off)} off track. Ask whoever recorded it to review.", stale);
        if (status.Status == ReportedStatus.OffTrack && off.Count == 0 && watch == 0 && unknown < facts.Count)
            return new Verdict("Disagree", "Signals show nothing off track or on watch, but the recorded status is Off track. Review the status.", stale);
        if (stale) return new Verdict("Stale", $"The recorded status needs review (older than {maxAgeDays} days, or its review date passed). Signals: {summary}.", true);
        return new Verdict("Agree", $"Signals are consistent with the recorded status: {summary}.", false);
    }
}

/// <summary>A109: loads client facts through the caller's scope filters and builds the client dashboard and the client portfolio rows.</summary>
public sealed class ClientInsight(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly ProjectStatus[] Running = [ProjectStatus.Planned, ProjectStatus.Active, ProjectStatus.OnHold];

    public async Task<SignalSettings> SettingsAsync(CancellationToken ct) => new(
        await settings.SlaComplianceTargetAsync(ct), await settings.ClientStatusMaxAgeDaysAsync(ct),
        (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition)));

    public async Task<List<ClientFacts>> LoadAsync(IQueryable<Client> clients, DateTimeOffset now, CancellationToken ct)
    {
        var cs = await clients.AsNoTracking().Select(c => new
        {
            c.Id, c.Code, c.Name, c.Status, c.OwnerUserId, owner = c.Owner == null ? null : c.Owner.DisplayName, c.Country, c.CountryUnknown
        }).ToListAsync(ct);
        var ids = cs.Select(c => c.Id).ToList();
        if (ids.Count == 0) return [];
        var nullableIds = ids.Select(i => (long?)i).ToList();

        var projects = (await db.Projects.AsNoTracking().Where(p => ids.Contains(p.ClientId))
            .Select(p => new { p.ClientId, fact = new ProjectFact(p.Id, p.Code, p.Name, p.Status, p.Owner == null ? null : p.Owner.DisplayName, p.ServiceStart, p.ServiceEnd) }).ToListAsync(ct))
            .ToLookup(x => x.ClientId, x => x.fact);

        var contracts = await db.Contracts.AsNoTracking().Where(c => ids.Contains(c.ClientId)).Select(c => new
        {
            c.Id, c.ClientId, c.ProjectId, projectCode = c.Project!.Code, c.Ref, c.Title, c.Type, c.Status, c.StartDate, c.EndDate, c.NoticeDays, c.Currency,
            milestones = c.Milestones.Select(m => new { m.SortOrder, m.Phase, m.Description, m.Date, m.CompletionPercent }).ToList(),
            payments = c.Payments.Select(p => new { p.Id, p.SortOrder, p.Condition, p.Amount, p.DueDate, p.Status, p.PaidOn }).ToList()
        }).ToListAsync(ct);

        var envs = (await db.Environments.AsNoTracking().Where(e => ids.Contains(e.ClientId))
            .Select(e => new { e.ClientId, fact = new EnvFact(e.Id, e.Name, e.Type, e.TypeCategory, e.Condition, e.ConditionObservedAt, e.ConditionReason) }).ToListAsync(ct))
            .ToLookup(x => x.ClientId, x => x.fact);

        var from = now.AddDays(-ClientSignals.SlaWindowDays);
        var cases = (await db.Cases.AsNoTracking()
            .Where(c => c.ClientId != null && nullableIds.Contains(c.ClientId))
            .Where(c => c.Status != CaseStatus.Cancelled && (c.Status != CaseStatus.Closed || (c.SlaClockStartAt ?? c.CreatedAt) >= from))
            .Select(c => new
            {
                clientId = c.ClientId!.Value,
                fact = new CaseFact(c.Id, c.Ref, c.Title, c.Priority, c.Status, c.SlaClockStartAt ?? c.CreatedAt, c.DueAt, c.ContractId, c.Owner == null ? null : c.Owner.DisplayName,
                    c.ResponseSlaStatus, c.ResponseDueAt, c.ResolutionSlaStatus, c.ResolutionDueAt)
            }).ToListAsync(ct)).ToLookup(x => x.clientId, x => x.fact);

        var escs = (await db.Escalations.AsNoTracking()
            .Where(e => e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress)
            .Where(e => ids.Contains(e.ClientId))
            .Select(e => new { e.ClientId, fact = new EscFact(e.Id, e.Ref, e.Title, e.Level, e.Status, e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt, e.Owner!.DisplayName) }).ToListAsync(ct))
            .ToLookup(x => x.ClientId, x => x.fact);

        var commitments = (await db.Commitments.AsNoTracking().Where(c => c.Status == CommitmentStatus.Open && c.ClientId != null && nullableIds.Contains(c.ClientId))
            .Select(c => new { clientId = c.ClientId!.Value, fact = new CommitFact(c.Id, c.Ref, c.Description, c.CurrentDueAt, c.Owner == null ? null : c.Owner.DisplayName) }).ToListAsync(ct))
            .ToLookup(x => x.clientId, x => x.fact);

        var status = (await db.ClientStatusReports.AsNoTracking().Where(r => ids.Contains(r.ClientId)
                && r.Id == db.ClientStatusReports.Where(x => x.ClientId == r.ClientId).OrderByDescending(x => x.RecordedAt).ThenByDescending(x => x.Id).Select(x => x.Id).First())
            .Select(r => new { r.ClientId, fact = new StatusFact(r.Id, r.Status, r.Summary, r.NextReviewOn, r.RecordedAt, r.RecordedBy == null ? null : r.RecordedBy.DisplayName) }).ToListAsync(ct))
            .ToDictionary(x => x.ClientId, x => x.fact);

        return cs.Select(c =>
        {
            var mine = contracts.Where(k => k.ClientId == c.Id).ToList();
            return new ClientFacts
            {
                Id = c.Id, Code = c.Code, Name = c.Name, RecordStatus = c.Status, OwnerUserId = c.OwnerUserId, Owner = c.owner, Country = c.CountryUnknown ? "Unknown" : c.Country,
                Projects = projects[c.Id].ToList(),
                Contracts = mine.Select(k => new ContractFact(k.Id, k.Ref, k.Title, k.Type, k.Status, k.StartDate, k.EndDate, k.NoticeDays, k.Currency, k.ProjectId, k.projectCode)).ToList(),
                Milestones = mine.SelectMany(k => k.milestones.Select(m => new MilestoneFact(k.Id, k.Ref, k.Status, m.SortOrder, m.Phase, m.Description, m.Date, m.CompletionPercent))).ToList(),
                Payments = mine.SelectMany(k => k.payments.Select(x => new PaymentFact(x.Id, k.Id, k.Ref, k.Status, x.SortOrder, x.Condition, x.Amount, k.Currency, x.DueDate, x.Status, x.PaidOn))).ToList(),
                Environments = envs[c.Id].ToList(),
                Cases = cases[c.Id].ToList(),
                Escalations = escs[c.Id].ToList(),
                Commitments = commitments[c.Id].ToList(),
                Status = status.GetValueOrDefault(c.Id)
            };
        }).ToList();
    }

    public sealed record PortfolioRow(long Id, string Code, string Name, string RecordStatus, string? Owner, string? Country, int RunningProjects,
        string? Status, string? StatusSummary, DateTimeOffset? StatusRecordedAt, int? StatusAgeDays, bool StatusStale, string Agreement, List<Signal> Signals, string? NextMilestone, DateOnly? NextMilestoneDate, bool NextMilestoneLate);

    /// <summary>The clients the portfolio covers: Active clients, and any other client with a running project (Planned, Active, On hold). Archived clients are hidden by the archive filter.</summary>
    public IQueryable<Client> Portfolio(long? clientId, string? country, long? productId, long? ownerId)
    {
        var q = db.Clients.Where(c => c.Status == ClientStatus.Active || db.Projects.Any(p => p.ClientId == c.Id && Running.Contains(p.Status)));
        if (clientId is not null) q = q.Where(c => c.Id == clientId);
        if (ownerId is not null) q = q.Where(c => c.OwnerUserId == ownerId);
        if (productId is not null) q = q.Where(c => db.Projects.Any(p => p.ClientId == c.Id && p.Products.Any(x => x.ProductId == productId)));
        if (!string.IsNullOrWhiteSpace(country)) q = country == "Unknown" ? q.Where(c => c.CountryUnknown) : q.Where(c => c.Country == country);
        return q;
    }

    /// <summary>One row per client in the portfolio: the recorded status and the signals. Worst first.</summary>
    public async Task<List<PortfolioRow>> PortfolioAsync(long? clientId, string? country, long? productId, long? ownerId, DateTimeOffset now, CancellationToken ct)
    {
        var s = await SettingsAsync(ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var rows = (await LoadAsync(Portfolio(clientId, country, productId, ownerId), now, ct)).Select(f =>
        {
            var signals = ClientSignals.Evaluate(f, now, s);
            var verdict = ClientSignals.Compare(f.Status, signals, now, s.StatusMaxAgeDays);
            var next = f.Milestones.Where(m => m.ContractStatus == ContractStatus.Active && m.Date != null && (m.Percent ?? 0) < 100).OrderBy(m => m.Date).FirstOrDefault();
            return new PortfolioRow(f.Id, f.Code, f.Name, f.RecordStatus.ToString(), f.Owner, f.Country, f.Projects.Count(p => Running.Contains(p.Status)),
                f.Status?.Status.ToString(), f.Status?.Summary, f.Status?.RecordedAt, f.Status is null ? null : (int)(now - f.Status.RecordedAt).TotalDays,
                f.Status is not null && ClientSignals.IsStale(f.Status, now, s.StatusMaxAgeDays), verdict.Agreement, signals, next?.Phase, next?.Date, next is not null && ClientSignals.IsLate(next, today));
        }).ToList();
        static int Rank(PortfolioRow r) => r.Status switch { "OffTrack" => 0, "AtRisk" => 1, null => 2, _ => 3 };
        return rows.OrderBy(Rank).ThenByDescending(r => r.Signals.Count(x => x.State == SignalState.OffTrack)).ThenBy(r => r.NextMilestoneDate ?? DateOnly.MaxValue).ThenBy(r => r.Code).ToList();
    }

    /// <summary>Who may record a client's status: Projects:Maintain in the client's scope (the people who could record a project status in 2.59.0).</summary>
    public static bool CanRecord(UserContext me, long clientId, ClientStatus status) =>
        status != ClientStatus.Archived && me.SeesContext(ResourceContext.ForRecord(clientId, null)) && me.HasRightIn(RightKeys.Projects, RightKeys.Maintain, ResourceContext.ForRecord(clientId, null));

    /// <summary>The client dashboard: recorded status, signals and the records behind them, across all the client's projects.</summary>
    public async Task<object> ClientAsync(long id, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var f = (await LoadAsync(db.Clients.Where(c => c.Id == id), now, ct)).FirstOrDefault() ?? throw new NotFoundException("The client");
        var s = await SettingsAsync(ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var signals = ClientSignals.Evaluate(f, now, s);
        var verdict = ClientSignals.Compare(f.Status, signals, now, s.StatusMaxAgeDays);
        var (response, resolution, openBreached) = ClientSignals.Sla(f, now, s.SlaWindowDays);
        var reminder = await PaymentQuery.ReminderDaysAsync(db, ct);
        object T(ClientSignals.Tally t) => new { met = t.Met, breached = t.Breached, pending = t.Pending, notMeasurable = t.NotMeasurable, measured = t.Measured, rate = t.Rate };

        var projectIds = f.Projects.Select(p => p.Id).ToList();
        var products = await db.ProjectProducts.AsNoTracking().Where(pp => projectIds.Contains(pp.ProjectId)).Join(db.Products, pp => pp.ProductId, pr => pr.Id, (pp, pr) => new { pr.Id, pr.Code, pr.Name })
            .Distinct().OrderBy(p => p.Code).ToListAsync(ct);
        var envIds = f.Environments.Select(e => e.Id).ToList();
        var installs = await db.Installations.AsNoTracking().Where(i => envIds.Contains(i.EnvironmentId))
            .Select(i => new { i.EnvironmentId, product = i.Product!.Code, version = i.ProductVersion == null ? null : i.ProductVersion.Version }).ToListAsync(ct);
        var team = await db.ClientTeamMembers.AsNoTracking().Where(t => t.ClientId == f.Id).OrderBy(t => t.SortOrder)
            .Select(t => new { t.UserId, name = t.User!.DisplayName, t.Role, active = t.User.IsActive }).ToListAsync(ct);
        var history = await db.ClientStatusReports.AsNoTracking().Where(r => r.ClientId == id).OrderByDescending(r => r.RecordedAt).ThenByDescending(r => r.Id).Take(10)
            .Select(r => new { r.Id, status = r.Status.ToString(), r.Summary, r.NextReviewOn, r.RecordedAt, recordedBy = r.RecordedBy == null ? null : r.RecordedBy.DisplayName }).ToListAsync(ct);

        var open = f.Cases.Where(c => CaseQuery.IsOpen(c.Status)).ToList();
        string CaseLink(string extra) => $"/cases?clientId={id}" + (extra.Length > 0 ? "&" + extra : "");

        // Recent events worked out from the records (not a separate log): newest first.
        var activity = new List<(DateTimeOffset At, string Text, string Link)>();
        activity.AddRange(history.Take(5).Select(h => (h.RecordedAt, $"Status recorded as {Words(h.status)} by {h.recordedBy ?? "an unknown user"}", $"/dashboards/client?clientId={id}")));
        activity.AddRange(f.Cases.Where(c => c.CreatedAt >= now.AddDays(-30)).Select(c => (c.CreatedAt, $"{c.Ref} opened ({c.Priority}) — {c.Title}", $"/cases/{c.Id}")));
        activity.AddRange(f.Escalations.Select(e => (e.ReceivedAt, $"{e.Ref} escalation received (level {e.Level}) — {e.Title}", $"/escalations/{e.Id}")));
        activity.AddRange(f.Milestones.Where(m => ClientSignals.IsLate(m, today)).Select(m => (new DateTimeOffset(m.Date!.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), $"Milestone “{m.Phase}” of {m.ContractRef} passed its planned date ({m.Percent ?? 0} % complete)", $"/contracts/{m.ContractId}")));
        activity.AddRange(f.Payments.Where(p => ClientSignals.IsOpenPayment(p) && p.DueDate < today).Select(p => (new DateTimeOffset(p.DueDate!.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), $"Payment “{p.Condition}” of {p.ContractRef} became overdue", $"/contracts/{p.ContractId}")));

        return new
        {
            evaluatedAt = now,
            client = new { f.Id, f.Code, f.Name, recordStatus = f.RecordStatus.ToString(), f.Owner, f.OwnerUserId, f.Country, products },
            projects = f.Projects.OrderByDescending(p => Running.Contains(p.Status)).ThenBy(p => p.Code).Select(p => new
            {
                p.Id, p.Code, p.Name, status = p.Status.ToString(), running = Running.Contains(p.Status), p.Owner, p.ServiceStart, p.ServiceEnd,
                contracts = f.Contracts.Count(k => k.ProjectId == p.Id)
            }).ToList(),
            status = new
            {
                recorded = f.Status is null ? null : new { status = f.Status.Status.ToString(), f.Status.Summary, f.Status.NextReviewOn, f.Status.RecordedAt, f.Status.RecordedBy, ageDays = (int)(now - f.Status.RecordedAt).TotalDays },
                agreement = verdict.Agreement, agreementText = verdict.Text, stale = verdict.Stale, maxAgeDays = s.StatusMaxAgeDays,
                canRecord = CanRecord(me, f.Id, f.RecordStatus),
                history
            },
            signals,
            contracts = f.Contracts.OrderByDescending(c => c.Status == ContractStatus.Active).ThenBy(c => c.StartDate).Select(c =>
            {
                var k = new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays };
                return new { c.Id, c.Ref, c.Title, c.Type, status = c.Status.ToString(), c.StartDate, c.EndDate, noticeDeadline = k.NoticeDeadline, state = ContractQuery.State(k, now), c.ProjectId, c.ProjectCode };
            }).ToList(),
            milestones = f.Milestones.Where(m => m.ContractStatus != ContractStatus.Terminated).OrderBy(m => m.Date ?? DateOnly.MaxValue).ThenBy(m => m.SortOrder)
                .Select(m => new { m.ContractId, m.ContractRef, m.Phase, m.Description, m.Date, percent = m.Percent, state = ClientSignals.MilestoneState(m, today) }).ToList(),
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
            team = new { note = "The team recorded for this client (A29).", members = team },
            activity = activity.OrderByDescending(a => a.At).Take(10).Select(a => new { at = a.At, text = a.Text, link = a.Link }).ToList()
        };
    }

    public static string Words(string status) => status switch { "OnTrack" => "On track", "AtRisk" => "At risk", "OffTrack" => "Off track", _ => status };
}
