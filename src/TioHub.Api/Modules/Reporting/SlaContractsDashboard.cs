using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A108 (owner request, 10 Nov 2026): the SLA &amp; Contracts dashboard — measured contractual compliance (A61 rules), where it is
/// breached and why some cases cannot be measured, and the contract lifecycle (term, notice deadlines, payments). Compliance is
/// met ÷ (met + breached); pending and not measurable obligations are never counted as met. Amounts are never added across currencies.
/// </summary>
public sealed class SlaContractsDashboard(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly string[] Periods = ["30d", "90d", "quarter", "12m", "custom"];
    public sealed record Query(long? ClientId, long? ContractId, string? ContractType, Priority? Priority, string? Country, string? Period, DateTimeOffset? From, DateTimeOffset? To);

    public static (DateTimeOffset From, DateTimeOffset To) Range(string? period, DateTimeOffset? from, DateTimeOffset? to, DateTimeOffset now, TimeZoneInfo zone)
    {
        var local = TimeZoneInfo.ConvertTime(now, zone).DateTime;
        var quarter = new DateTime(local.Year, (local.Month - 1) / 3 * 3 + 1, 1);
        return period switch
        {
            "30d" => (now.AddDays(-30), now),
            "quarter" => (new DateTimeOffset(quarter, zone.GetUtcOffset(quarter)), now),
            "12m" => (now.AddMonths(-12), now),
            "custom" when from is not null && to is not null && from < to => (from.Value, to.Value),
            _ => (now.AddDays(-90), now)
        };
    }

    /// <summary>Why an obligation could not be measured, grouped from the case's SLA note (A61 writes one sentence per reason).</summary>
    public static string ReasonOf(string? note) => note switch
    {
        null => "Reason not recorded",
        _ when note.Contains("covers the ticket") => "No contract covers the ticket's creation date",
        _ when note.Contains("target for") => "No target recorded for the priority",
        _ when note.Contains("opened before") => "Opened before responses were recorded",
        _ when note.Contains("support time zone") || note.Contains("support days") => "Support calendar incomplete",
        _ when note.Contains("calendar or support hours") => "Clock basis unknown",
        _ => "Other"
    };

    public async Task<object> BuildAsync(Query p, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
        var (pf, pt) = Range(p.Period, p.From, p.To, now, zone);
        var prevFrom = pf - (pt - pf);
        var target = await settings.SlaComplianceTargetAsync(ct);
        var atRisk = await settings.SlaAtRiskPercentAsync(ct);
        var days = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var filter = new CaseFilter(ClientId: p.ClientId, Country: p.Country, ContractId: p.ContractId, Priority: p.Priority, Scope: WorkScope.Client, Sla: "withContract");
        IQueryable<Case> Cases(CaseFilter f)
        {
            var q = CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db);
            return string.IsNullOrWhiteSpace(p.ContractType) ? q : q.Where(c => c.Contract!.Type == p.ContractType);
        }

        // ---- measured compliance: client cases with a contract, by the time they were opened ----
        var monthStart = TimeZoneInfo.ConvertTime(now, zone).DateTime is var l ? new DateTime(l.Year, l.Month, 1).AddMonths(-11) : default;
        var trendFrom = new DateTimeOffset(monthStart, zone.GetUtcOffset(monthStart));
        var loadFrom = new[] { prevFrom, trendFrom }.Min();
        var rows = (await Cases(filter with { Status = "all", CreatedFrom = loadFrom }).Where(c => c.Status != CaseStatus.Cancelled)
            .Select(c => new { c.Id, CreatedAt = c.SlaClockStartAt ?? c.CreatedAt, c.Priority, ContractId = c.ContractId!.Value, c.ResponseSlaStatus, c.ResponseDueAt, c.ResolutionSlaStatus, c.ResolutionDueAt, c.SlaNote }).ToListAsync(ct))
            .Select(r => new { r.Id, r.CreatedAt, r.Priority, r.ContractId, r.SlaNote, Response = CaseSla.Now(r.ResponseSlaStatus, r.ResponseDueAt, now), Resolution = CaseSla.Now(r.ResolutionSlaStatus, r.ResolutionDueAt, now) }).ToList();
        var cur = rows.Where(r => r.CreatedAt >= pf && r.CreatedAt < pt).ToList();
        var prev = rows.Where(r => r.CreatedAt >= prevFrom && r.CreatedAt < pf).ToList();
        static object T(ProjectSignals.Tally t) => new { met = t.Met, breached = t.Breached, pending = t.Pending, notMeasurable = t.NotMeasurable, measured = t.Measured, rate = t.Rate };
        var response = ProjectSignals.Tally.Of(cur.Select(r => r.Response));
        var resolution = ProjectSignals.Tally.Of(cur.Select(r => r.Resolution));
        var prevResponse = ProjectSignals.Tally.Of(prev.Select(r => r.Response));
        var prevResolution = ProjectSignals.Tally.Of(prev.Select(r => r.Resolution));
        static double? Delta(double? a, double? b) => a is null || b is null ? null : Math.Round(a.Value - b.Value, 1);
        string CaseLink(string extra) => "/cases?" + string.Join("&", new[] { extra, "status=all", $"createdFrom={Uri.EscapeDataString(pf.ToString("O"))}", $"createdTo={Uri.EscapeDataString(pt.ToString("O"))}",
            p.ClientId is null ? null : $"clientId={p.ClientId}", p.ContractId is null ? null : $"contractId={p.ContractId}", p.Priority is null ? null : $"priority={p.Priority}",
            string.IsNullOrWhiteSpace(p.Country) ? null : $"country={Uri.EscapeDataString(p.Country)}" }.Where(x => !string.IsNullOrEmpty(x)));

        // Clocks running now (not tied to the period).
        var pending = await Cases(filter).Where(c => c.ResponseSlaStatus == SlaState.Pending || c.ResolutionSlaStatus == SlaState.Pending).Include(c => c.WaitingIntervals).ToListAsync(ct);
        var clocks = pending.Select(c => SlaClocks.Of(c, c.WaitingIntervals, now, atRisk).FirstOrDefault()).Where(c => c is not null).ToList();

        var notMeasurable = cur.Where(r => r.Response == SlaState.NotMeasurable || r.Resolution == SlaState.NotMeasurable).ToList();
        var reasons = notMeasurable.GroupBy(r => ReasonOf(r.SlaNote)).Select(g => new { key = g.Key, label = g.Key, value = g.Count() }).OrderByDescending(x => x.value).ToList();

        var months = Enumerable.Range(0, 12).Select(i =>
        {
            var m = monthStart.AddMonths(i);
            DateTimeOffset a = new(m, zone.GetUtcOffset(m)), b = new(m.AddMonths(1), zone.GetUtcOffset(m.AddMonths(1)));
            var inM = rows.Where(r => r.CreatedAt >= a && r.CreatedAt < b).ToList();
            var rs = ProjectSignals.Tally.Of(inM.Select(r => r.Response));
            var xs = ProjectSignals.Tally.Of(inM.Select(r => r.Resolution));
            return new { key = m.ToString("yyyy-MM"), label = m.ToString("MMM yy"), cases = inM.Count, responseRate = rs.Rate, responseMeasured = rs.Measured, resolutionRate = xs.Rate, resolutionMeasured = xs.Measured };
        }).ToList();

        var byPriority = Enum.GetValues<Priority>().Select(pr => new
        {
            priority = pr.ToString(), cases = cur.Count(r => r.Priority == pr),
            responseBreached = cur.Count(r => r.Priority == pr && r.Response == SlaState.Breached), resolutionBreached = cur.Count(r => r.Priority == pr && r.Resolution == SlaState.Breached),
            link = CaseLink($"sla=breached&priority={pr}")
        }).ToList();

        // ---- contracts in view ----
        var kq = ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(ClientId: p.ClientId, Country: p.Country, Type: string.IsNullOrWhiteSpace(p.ContractType) ? null : p.ContractType), now, db);
        if (p.ContractId is not null) kq = kq.Where(c => c.Id == p.ContractId);
        var contracts = await kq.Where(c => c.Status == ContractStatus.Active || c.Status == ContractStatus.Draft).Include(c => c.Payments).Include(c => c.SlaTargets)
            .Select(c => new { c, client = c.Client!.Code, project = c.Project!.Code, owner = c.Owner == null ? null : c.Owner.DisplayName }).ToListAsync(ct);
        var active = contracts.Where(x => x.c.Status == ContractStatus.Active).ToList();
        var contractRows = active.Select(x =>
        {
            var mine = cur.Where(r => r.ContractId == x.c.Id).ToList();
            var breachedBy = mine.Where(r => r.Response == SlaState.Breached || r.Resolution == SlaState.Breached).Select(r => r.Priority).ToList();
            return new
            {
                x.c.Id, x.c.Ref, x.c.Title, x.c.ClientId, x.client, x.c.ProjectId, x.project, x.c.Type, support = ContractEndpoints.SupportSummary(x.c), targets = x.c.SlaTargets.Count,
                cases = mine.Count, response = T(ProjectSignals.Tally.Of(mine.Select(r => r.Response))), resolution = T(ProjectSignals.Tally.Of(mine.Select(r => r.Resolution))),
                resolutionRate = ProjectSignals.Tally.Of(mine.Select(r => r.Resolution)).Rate,
                breached = breachedBy.Count, worstPriority = breachedBy.Count == 0 ? null : breachedBy.Min().ToString(),
                x.c.StartDate, x.c.EndDate, noticeDeadline = x.c.NoticeDeadline, state = ContractQuery.State(x.c, now), x.owner,
                link = CaseLink($"contractId={x.c.Id}&sla=withContract")
            };
        }).ToList();
        var watch = contractRows.Where(c => c.state is "RenewalDue" or "Expired" or "EndDateUnknown").Select(c =>
        {
            var by = c.noticeDeadline ?? c.EndDate;
            return new { c.Id, c.Ref, c.Title, c.client, c.state, decideBy = by, daysLeft = by is null ? (int?)null : by.Value.DayNumber - today.DayNumber, c.EndDate, c.owner,
                reason = ContractQuery.Reason(c.state, c.EndDate, c.noticeDeadline, now) };
        }).OrderBy(c => c.daysLeft ?? int.MaxValue).ToList();
        var noticeSoon = watch.Where(w => w.state == "RenewalDue" && w.daysLeft is not null).ToList();

        // ---- payments of those contracts: per currency, never added across currencies ----
        var openPay = contracts.Where(x => x.c.Status != ContractStatus.Terminated).SelectMany(x => x.c.Payments.Where(pm => pm.Status is PaymentStatus.Pending or PaymentStatus.Invoiced)
            .Select(pm => new { x.c.Currency, pm.Amount, pm.DueDate })).ToList();
        var payments = openPay.Where(x => x.DueDate != null && x.DueDate <= today.AddDays(30)).GroupBy(x => x.Currency ?? "").OrderBy(g => g.Key).Select(g => new
        {
            currency = g.Key,
            overdue = g.Where(x => x.DueDate < today).Sum(x => x.Amount ?? 0), overdueCount = g.Count(x => x.DueDate < today),
            due30 = g.Where(x => x.DueDate >= today).Sum(x => x.Amount ?? 0), due30Count = g.Count(x => x.DueDate >= today),
            withoutAmount = g.Count(x => x.Amount == null)
        }).ToList();

        return new
        {
            evaluatedAt = now,
            period = new { from = pf, to = pt, name = Periods.Contains(p.Period) ? p.Period : "90d" },
            target, atRiskPercent = atRisk,
            compliance = new
            {
                cases = cur.Count,
                response = T(response), resolution = T(resolution),
                responseDelta = Delta(response.Rate, prevResponse.Rate), resolutionDelta = Delta(resolution.Rate, prevResolution.Rate),
                breaches = response.Breached + resolution.Breached,
                atRiskNow = clocks.Count(c => c!.AtRisk), breachedNow = clocks.Count(c => c!.Breached), runningNow = clocks.Count,
                notMeasurable = notMeasurable.Count, reasons,
                links = new { responseBreached = CaseLink("sla=responseBreached"), resolutionBreached = CaseLink("sla=resolutionBreached"), atRisk = "/cases?sla=approaching", all = CaseLink("sla=withContract") },
                definition = "Client tickets with a linked contract, by the time they were opened. Rate = met ÷ (met + breached); pending and not measurable obligations are excluded. A pending obligation past its deadline counts as breached."
            },
            trend = months,
            byPriority,
            contracts = new
            {
                active = active.Count, draft = contracts.Count - active.Count, withTargets = active.Count(x => x.c.SlaTargets.Count > 0),
                noticeWithin90 = noticeSoon.Count, earliestNoticeDays = noticeSoon.Count == 0 ? (int?)null : noticeSoon.Min(w => w.daysLeft),
                rows = contractRows.OrderBy(c => c.resolutionRate ?? double.MaxValue).ThenByDescending(c => c.breached).ThenBy(c => c.Ref).ToList(),
                watch
            },
            payments,
            note = "SLA targets are terms recorded from the contracts; compliance is measured from recorded ticket times. The compliance objective is an internal setting, not a contract term. Public holidays are not modelled."
        };
    }
}
