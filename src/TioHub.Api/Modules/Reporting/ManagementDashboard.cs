using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A108 (owner request, 10 Nov 2026): the Management dashboard — is the operation getting better or worse, and where to step in.
/// Period figures are compared with the same number of days of the previous period. Nothing is estimated: a rate or a median
/// without records is null ("not available"), and the page shows how far its own figures can be trusted.
/// </summary>
public sealed class ManagementDashboard(HubDbContext db, HubSettings settings, FreshnessService fresh, ProjectInsight projects)
{
    public static readonly string[] Periods = ["quarter", "month", "ytd"];

    /// <summary>The current period to date, and the same elapsed time of the previous one.</summary>
    public static (DateTimeOffset From, DateTimeOffset To, DateTimeOffset PrevFrom, DateTimeOffset PrevTo) Range(string? period, DateTimeOffset now, TimeZoneInfo zone)
    {
        var l = TimeZoneInfo.ConvertTime(now, zone).DateTime;
        DateTimeOffset At(DateTime d) => new(d, zone.GetUtcOffset(d));
        var (start, prev) = period switch
        {
            "month" => (new DateTime(l.Year, l.Month, 1), new DateTime(l.Year, l.Month, 1).AddMonths(-1)),
            "ytd" => (new DateTime(l.Year, 1, 1), new DateTime(l.Year - 1, 1, 1)),
            _ => (new DateTime(l.Year, (l.Month - 1) / 3 * 3 + 1, 1), new DateTime(l.Year, (l.Month - 1) / 3 * 3 + 1, 1).AddMonths(-3))
        };
        var from = At(start);
        var prevFrom = At(prev);
        var prevTo = prevFrom + (now - from);
        return (from, now, prevFrom, prevTo > from ? from : prevTo);
    }

    public static double? Median(IEnumerable<double> values)
    {
        var v = values.OrderBy(x => x).ToList();
        if (v.Count == 0) return null;
        return Math.Round(v.Count % 2 == 1 ? v[v.Count / 2] : (v[v.Count / 2 - 1] + v[v.Count / 2]) / 2, 1);
    }

    public async Task<object> BuildAsync(string? period, string? country, long? teamId, long? productId, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
        var (pf, pt, qf, qt) = Range(period, now, zone);
        var days = await settings.UpcomingDaysAsync(ct);
        var policies = await fresh.PoliciesAsync(ct);
        var policy = policies.GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var target = await settings.SlaComplianceTargetAsync(ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var baseCase = new CaseFilter(TeamId: teamId, ProductId: productId, Country: country);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios);
        var all = Cases(baseCase with { Status = "all" });
        static double? Rate(int a, int b) => b == 0 ? null : Math.Round(100.0 * a / b, 1);
        static double? Diff(double? a, double? b) => a is null || b is null ? null : Math.Round(a.Value - b.Value, 1);

        // ---- cases: backlog, flow and time to resolve ----
        // A case counts in the backlog at T when it existed and was neither closed nor cancelled before T (a later reopen is not replayed).
        var hist = await all.Select(c => new { CreatedAt = c.SlaClockStartAt ?? c.CreatedAt, c.ClosedAt, c.CancelledAt, c.Status }).ToListAsync(ct);
        int BacklogAt(DateTimeOffset t) => hist.Count(c => c.CreatedAt < t && (c.ClosedAt == null || c.ClosedAt >= t) && (c.CancelledAt == null || c.CancelledAt >= t));
        var backlogNow = hist.Count(c => CaseQuery.IsOpen(c.Status));
        var backlogStart = BacklogAt(pf);
        double? Resolve(DateTimeOffset a, DateTimeOffset b) => Median(hist.Where(c => c.Status == CaseStatus.Closed && c.ClosedAt >= a && c.ClosedAt < b).Select(c => (c.ClosedAt!.Value - c.CreatedAt).TotalDays));
        var resolveNow = Resolve(pf, pt);
        var resolvePrev = Resolve(qf, qt);
        var l = TimeZoneInfo.ConvertTime(now, zone).DateTime;
        var firstMonth = new DateTime(l.Year, l.Month, 1).AddMonths(-11);
        var trend = Enumerable.Range(0, 12).Select(i =>
        {
            var m = firstMonth.AddMonths(i);
            DateTimeOffset a = new(m, zone.GetUtcOffset(m)), b = new(m.AddMonths(1), zone.GetUtcOffset(m.AddMonths(1)));
            var end = b > now ? now : b;
            return new { key = m.ToString("yyyy-MM"), label = m.ToString("MMM yy"), opened = hist.Count(c => c.CreatedAt >= a && c.CreatedAt < b), closed = hist.Count(c => c.ClosedAt >= a && c.ClosedAt < b), backlog = BacklogAt(end) };
        }).ToList();

        // ---- contractual SLA: cases with a contract opened in each period ----
        var slaRows = (await Cases(baseCase with { Status = "all", Scope = WorkScope.Client, Sla = "withContract", CreatedFrom = qf }).Where(c => c.Status != CaseStatus.Cancelled)
            .Select(c => new { CreatedAt = c.SlaClockStartAt ?? c.CreatedAt, c.ResponseSlaStatus, c.ResponseDueAt, c.ResolutionSlaStatus, c.ResolutionDueAt }).ToListAsync(ct))
            .Select(r => new { r.CreatedAt, Response = CaseSla.Now(r.ResponseSlaStatus, r.ResponseDueAt, now), Resolution = CaseSla.Now(r.ResolutionSlaStatus, r.ResolutionDueAt, now) }).ToList();
        var slaCur = slaRows.Where(r => r.CreatedAt >= pf && r.CreatedAt < pt).ToList();
        var slaPrev = slaRows.Where(r => r.CreatedAt >= qf && r.CreatedAt < qt).ToList();
        var resNow = ProjectSignals.Tally.Of(slaCur.Select(r => r.Resolution));
        var resPrev = ProjectSignals.Tally.Of(slaPrev.Select(r => r.Resolution));
        var rspNow = ProjectSignals.Tally.Of(slaCur.Select(r => r.Response));

        // ---- commitments completed in the period: on time or late ----
        var comDone = await CommitmentQuery.Apply(db.Commitments.AsNoTracking(), new CommitmentFilter(TeamId: teamId, ProductId: productId, Country: country, Status: "all"), now, days, db)
            .Where(c => c.Status == CommitmentStatus.Completed && c.CompletedAt >= qf && c.CompletedAt < pt).Select(c => new { At = c.CompletedAt!.Value, c.CompletedLate }).ToListAsync(ct);
        double? OnTime(DateTimeOffset a, DateTimeOffset b) { var x = comDone.Where(c => c.At >= a && c.At < b).ToList(); return Rate(x.Count(c => c.CompletedLate != true), x.Count); }
        var overdueComs = await CommitmentQuery.Apply(db.Commitments.AsNoTracking(), new CommitmentFilter(TeamId: teamId, ProductId: productId, Country: country, Due: "overdue"), now, days, db).CountAsync(ct);

        // ---- escalations and payments (not owned by a team: hidden under a team filter) ----
        object? escalations = null, payments = null;
        if (teamId is null)
        {
            var esc = await EscalationQuery.Apply(db.Escalations.AsNoTracking(), new EscalationFilter(ProductId: productId, Country: country, Status: "all"), now, db)
                .Select(e => new { e.ClientId, client = e.Client!.Code, e.Level, e.Status, e.ReceivedAt }).ToListAsync(ct);
            var cur = esc.Where(e => e.ReceivedAt >= pf && e.ReceivedAt < pt).ToList();
            var activeEsc = esc.Where(e => Escalation.Active.Contains(e.Status)).ToList();
            escalations = new
            {
                received = cur.Count, previous = esc.Count(e => e.ReceivedAt >= qf && e.ReceivedAt < qt), active = activeEsc.Count, activeLevel3 = activeEsc.Count(e => e.Level >= 3),
                byClient = cur.GroupBy(e => new { e.ClientId, e.client }).Select(g => new { key = g.Key.ClientId.ToString(), label = g.Key.client, value = g.Count(), level3 = g.Count(x => x.Level >= 3), link = $"/escalations?status=all&clientId={g.Key.ClientId}" })
                    .OrderByDescending(x => x.value).Take(6).ToList()
            };
            var reminder = await PaymentQuery.ReminderDaysAsync(db, ct);
            var overdue = await PaymentQuery.Rows(db.Contracts.AsNoTracking(), new PaymentFilter(ProductId: productId, Country: country, State: "overdue"), now, db, reminder)
                .Select(x => new { x.ContractId, x.Amount, x.Currency }).ToListAsync(ct);
            payments = new
            {
                overdueCount = overdue.Count, contracts = overdue.Select(x => x.ContractId).Distinct().Count(), withoutAmount = overdue.Count(x => x.Amount == null),
                amounts = overdue.Where(x => x.Amount != null).GroupBy(x => x.Currency ?? "").Select(g => new { currency = g.Key, amount = g.Sum(x => x.Amount!.Value) }).OrderByDescending(x => x.amount).ToList()
            };
        }

        // ---- workload against people, by team ----
        var teamsQ = db.Teams.AsNoTracking().Where(t => t.IsActive);
        if (teamId is not null) teamsQ = teamsQ.Where(t => t.Id == teamId);
        var teamRows = await teamsQ.Select(t => new { t.Id, t.Name, engineers = t.Members.Count(m => m.IsActive && m.User!.IsActive) }).ToListAsync(ct);
        var openByTeam = await Cases(baseCase).Select(c => new { c.ResponsibleTeamId, c.Priority, gap = c.BackupOwnerUserId == null || !c.BackupOwner!.IsActive }).ToListAsync(ct);
        var teams = teamRows.Select(t =>
        {
            var mine = openByTeam.Where(c => c.ResponsibleTeamId == t.Id).ToList();
            return new { t.Id, t.Name, t.engineers, open = mine.Count, perEngineer = t.engineers == 0 ? (double?)null : Math.Round((double)mine.Count / t.engineers, 1),
                coverageGaps = mine.Count(c => prios.Contains(c.Priority) && c.gap), link = $"/cases?teamId={t.Id}" };
        }).OrderByDescending(t => t.open).ToList();

        // ---- portfolio ----
        var portfolio = await projects.PortfolioAsync(null, country, productId, null, now, ct);

        // ---- risks and pending decisions ----
        var risks = await Cases(baseCase).Where(c => c.TypeCategory == CaseType.RiskFollowUp).OrderBy(c => c.Priority).ThenBy(c => c.SlaClockStartAt ?? c.CreatedAt).Take(5)
            .Select(c => new { c.Id, c.Ref, c.Title, priority = c.Priority.ToString(), client = c.Client == null ? null : c.Client.Code }).ToListAsync(ct);
        var decisions = teamId is not null ? [] : (await ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(ProductId: productId, Country: country, Renewal: "attention"), now, db)
            .Select(c => new { c.Id, c.Ref, c.Title, client = c.Client!.Code, c.Status, c.EndDate, c.NoticeDays }).ToListAsync(ct))
            .Select(c =>
            {
                var k = new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays };
                var state = ContractQuery.State(k, now);
                return new { c.Id, c.Ref, c.Title, c.client, state, decideBy = k.NoticeDeadline ?? c.EndDate, reason = ContractQuery.Reason(state, c.EndDate, k.NoticeDeadline, now) };
            }).OrderBy(c => c.decideBy ?? DateOnly.MaxValue).Take(5).ToList();

        // ---- how far the figures can be trusted ----
        var condPolicy = policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition));
        var envQ = db.Environments.AsNoTracking().Where(e => db.Clients.Any(c => c.Id == e.ClientId));
        if (!string.IsNullOrWhiteSpace(country)) envQ = country == "Unknown" ? envQ.Where(e => e.Client!.CountryUnknown) : envQ.Where(e => e.Client!.Country == country);
        if (productId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == productId));
        var envViews = (await envQ.Select(e => new { e.Condition, e.ConditionObservedAt }).ToListAsync(ct)).Select(e => EnvironmentEndpoints.ConditionView(e.Condition, e.ConditionObservedAt, condPolicy, now)).ToList();
        var dqOpen = await db.DataQualityItems.AsNoTracking().CountAsync(i => i.Status == DataQualityStatus.Open, ct);
        var unknownEnd = teamId is not null ? (int?)null : await ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(ProductId: productId, Country: country, Renewal: "unknownEnd"), now, db).CountAsync(ct);
        var notMeasurable = slaCur.Count(r => r.Response == SlaState.NotMeasurable || r.Resolution == SlaState.NotMeasurable);

        return new
        {
            evaluatedAt = now,
            period = new { name = Periods.Contains(period) ? period : "quarter", from = pf, to = pt, previousFrom = qf, previousTo = qt },
            target,
            kpis = new
            {
                projects = new { total = portfolio.Count, offTrack = portfolio.Count(p => p.Status == "OffTrack"), atRisk = portfolio.Count(p => p.Status == "AtRisk"), onTrack = portfolio.Count(p => p.Status == "OnTrack"),
                    noStatus = portfolio.Count(p => p.Status is null), clients = portfolio.Select(p => p.ClientId).Distinct().Count() },
                backlog = new { value = backlogNow, atPeriodStart = backlogStart, change = backlogNow - backlogStart, changePercent = backlogStart == 0 ? (double?)null : Math.Round(100.0 * (backlogNow - backlogStart) / backlogStart, 1) },
                resolveDays = new { value = resolveNow, previous = resolvePrev, change = Diff(resolveNow, resolvePrev) },
                sla = new { resolutionRate = resNow.Rate, responseRate = rspNow.Rate, previousResolutionRate = resPrev.Rate, change = Diff(resNow.Rate, resPrev.Rate), measured = resNow.Measured },
                commitments = new { onTimeRate = OnTime(pf, pt), previous = OnTime(qf, qt), change = Diff(OnTime(pf, pt), OnTime(qf, qt)), completed = comDone.Count(c => c.At >= pf), overdueNow = overdueComs },
                escalations, payments
            },
            trend, teams, portfolio, risks, decisions,
            dataTrust = new
            {
                dataQualityOpen = dqOpen,
                environments = new { total = envViews.Count, needsVerification = envViews.Count(v => v.NeedsVerification), unknown = envViews.Count(v => v.Reported == Condition.Unknown) },
                sla = new { notMeasurable, withContract = slaCur.Count },
                projects = new { total = portfolio.Count, staleStatus = portfolio.Count(p => p.StatusStale), noStatus = portfolio.Count(p => p.Status is null), disagree = portfolio.Count(p => p.Agreement == "Disagree") },
                contractsUnknownEnd = unknownEnd
            },
            note = "Changes compare the period to date with the same number of days of the previous period. The backlog history does not replay reopened tickets."
        };
    }
}
