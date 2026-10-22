using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A60 (owner request, 22 Oct 2026): figures for the Operations Command Center that the existing measures and insights do not give.
/// Current-state figures (open, overdue, due soon) are evaluated now; period figures (opened, closed, received, adherence, compliance)
/// use the chosen reporting period. Everything goes through the caller's scope filters, like every other dashboard figure.
/// Nothing is estimated: a rate without measurable records is returned as null ("not available").
/// </summary>
public sealed class CommandCenter(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly string[] Periods = ["today", "7d", "30d", "quarter", "custom"];

    public sealed record Point(string Key, string Label, int A, int B);

    /// <summary>The period in the user's time zone (today = local midnight until now), and the bucket size for trends.</summary>
    public static (DateTimeOffset From, DateTimeOffset To, string Unit) Period(string? period, DateTimeOffset? from, DateTimeOffset? to, DateTimeOffset now, TimeZoneInfo zone)
    {
        var local = TimeZoneInfo.ConvertTime(now, zone);
        DateTimeOffset LocalMidnight(DateTime d) => new(d.Date, zone.GetUtcOffset(d.Date));
        var (f, t) = period switch
        {
            "today" => (LocalMidnight(local.DateTime), now),
            "7d" => (now.AddDays(-7), now),
            "quarter" => (LocalMidnight(new DateTime(local.Year, (local.Month - 1) / 3 * 3 + 1, 1)), now),
            "custom" when from is not null && to is not null && from < to => (from.Value, to.Value),
            _ => (now.AddDays(-30), now)
        };
        var days = (t - f).TotalDays;
        return (f, t, days <= 1.01 ? "hour" : days <= 31.5 ? "day" : days <= 120 ? "week" : "month");
    }

    private static List<(DateTimeOffset From, DateTimeOffset To, string Key, string Label)> Buckets(DateTimeOffset from, DateTimeOffset to, string unit, TimeZoneInfo zone)
    {
        var list = new List<(DateTimeOffset, DateTimeOffset, string, string)>();
        DateTimeOffset Start(DateTimeOffset x)
        {
            var l = TimeZoneInfo.ConvertTime(x, zone).DateTime;
            var d = unit switch
            {
                "hour" => new DateTime(l.Year, l.Month, l.Day, l.Hour, 0, 0),
                "day" => l.Date,
                "week" => l.Date.AddDays(-(((int)l.DayOfWeek + 6) % 7)),
                _ => new DateTime(l.Year, l.Month, 1)
            };
            return new DateTimeOffset(d, zone.GetUtcOffset(d));
        }
        DateTimeOffset Next(DateTimeOffset s) => unit switch { "hour" => s.AddHours(1), "day" => s.AddDays(1), "week" => s.AddDays(7), _ => s.AddMonths(1) };
        for (var s = Start(from); s < to && list.Count < 120; s = Next(s))
        {
            var l = TimeZoneInfo.ConvertTime(s, zone);
            var label = unit switch { "hour" => l.ToString("HH:mm"), "day" => l.ToString("dd MMM"), "week" => "wk " + l.ToString("dd MMM"), _ => l.ToString("MMM yy") };
            list.Add((s < from ? from : s, Next(s) > to ? to : Next(s), l.ToString("O"), label));
        }
        return list;
    }

    public async Task<object> BuildAsync(DashboardQuery p, string? period, DateTimeOffset? from, DateTimeOffset? to, UserContext me, CancellationToken ct)
    {
        var now = p.AsOf ?? DateTimeOffset.UtcNow;
        var zone = Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc;
        var (pf, pt, unit) = Period(period, from, to, now, zone);
        var buckets = Buckets(pf, pt, unit, zone);
        var days = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var baseCase = new CaseFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios);

        // ---- cases: deadline risk now, and what happened in the period ----
        var open = await Cases(baseCase).Select(c => new { c.Priority, c.DueAt }).ToListAsync(ct);
        var in24 = now.AddHours(24);
        var risk = new
        {
            breached = open.Count(c => c.DueAt < now),
            approaching = open.Count(c => c.DueAt >= now && c.DueAt <= in24),
            withinTarget = open.Count(c => c.DueAt > in24),
            noDeadline = open.Count(c => c.DueAt == null)
        };
        var all = Cases(baseCase with { Status = "all" });
        var opened = await all.Where(c => c.CreatedAt >= pf && c.CreatedAt < pt).Select(c => c.CreatedAt).ToListAsync(ct);
        var closed = await all.Where(c => c.ClosedAt != null && c.ClosedAt >= pf && c.ClosedAt < pt).Select(c => new { At = c.ClosedAt!.Value, c.DueAt }).ToListAsync(ct);
        var withDue = closed.Where(c => c.DueAt != null).ToList();
        var caseTrend = buckets.Select(b => new Point(b.Key, b.Label, opened.Count(x => x >= b.From && x < b.To), closed.Count(x => x.At >= b.From && x.At < b.To))).ToList();

        // ---- escalations: active now; targets met for those received in the period ----
        object? escalations = null;
        if (p.TeamId is null)
        {
            var eq = EscalationQuery.Apply(db.Escalations.AsNoTracking(), new EscalationFilter(ClientId: p.ClientId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country, Status: "all"), now, db);
            var rows = await eq.Select(e => new
            {
                e.Id, e.Ref, e.Title, e.ClientId, client = e.Client!.Code, e.CaseId, caseRef = db.Cases.Where(c => c.Id == e.CaseId).Select(c => c.Ref).FirstOrDefault(),
                e.Level, owner = e.Owner!.DisplayName, e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt, e.Status, e.AcknowledgedAt, e.ResolvedAt, e.ClosedAt
            }).ToListAsync(ct);
            bool Active(EscalationStatus s) => Escalation.Active.Contains(s);
            var active = rows.Where(e => Active(e.Status)).Select(e =>
            {
                var responseLate = e.Status == EscalationStatus.Open && e.ResponseDueAt < now;
                var resolutionLate = e.ResolutionDueAt < now;
                var target = responseLate ? e.ResponseDueAt : e.ResolutionDueAt;
                var overdueHours = responseLate || resolutionLate ? (now - target!.Value).TotalHours : (double?)null;
                return new
                {
                    e.Id, e.Ref, e.Title, e.ClientId, e.client, e.CaseId, e.caseRef, e.Level, e.owner, e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt,
                    status = e.Status.ToString(), overdue = overdueHours is not null, overdueBy = overdueHours, missed = responseLate ? "response" : resolutionLate ? "resolution" : null
                };
            }).ToList();
            var received = rows.Where(e => e.ReceivedAt >= pf && e.ReceivedAt < pt).ToList();
            // A target is measured once it is met or has passed; one still running is not counted either way.
            var resp = received.Where(e => e.ResponseDueAt != null && (e.AcknowledgedAt != null || e.ResponseDueAt < now)).ToList();
            var reso = received.Where(e => e.ResolutionDueAt != null && ((e.ResolvedAt ?? e.ClosedAt) != null || e.ResolutionDueAt < now)).ToList();
            escalations = new
            {
                active = active.Count,
                overdue = active.Count(a => a.overdue),
                highestLevel = active.Count == 0 ? (int?)null : active.Max(a => a.Level),
                averageAgeDays = active.Count == 0 ? (double?)null : Math.Round(active.Average(a => (now - a.ReceivedAt).TotalDays), 1),
                receivedInPeriod = received.Count,
                response = new { measured = resp.Count, met = resp.Count(e => e.AcknowledgedAt != null && e.AcknowledgedAt <= e.ResponseDueAt) },
                resolution = new { measured = reso.Count, met = reso.Count(e => (e.ResolvedAt ?? e.ClosedAt) is { } r && r <= e.ResolutionDueAt) },
                trend = buckets.Select(b => new Point(b.Key, b.Label, received.Count(e => e.ReceivedAt >= b.From && e.ReceivedAt < b.To), 0)).ToList(),
                attention = active.OrderByDescending(a => a.overdue).ThenByDescending(a => a.Level).ThenBy(a => a.missed == "response" ? a.ResponseDueAt : a.ResolutionDueAt ?? DateTimeOffset.MaxValue).Take(8).ToList()
            };
        }

        // ---- contracts: end dates in the next 30 / 60 / 90 days (active contracts) ----
        object? contracts = null;
        if (p.TeamId is null && p.OwnerId is null)
        {
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var ends = await ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(ClientId: p.ClientId, ProductId: p.ProductId, Country: p.Country, Status: ContractStatus.Active), now, db)
                .Select(c => c.EndDate).ToListAsync(ct);
            contracts = new
            {
                within30 = ends.Count(e => e >= today && e <= today.AddDays(30)),
                within60 = ends.Count(e => e > today.AddDays(30) && e <= today.AddDays(60)),
                within90 = ends.Count(e => e > today.AddDays(60) && e <= today.AddDays(90)),
                expired = ends.Count(e => e < today),
                unknownEnd = ends.Count(e => e == null)
            };
        }

        // ---- payments: overdue by client and how many open payments have no amount ----
        object? payments = null;
        if (p.TeamId is null)
        {
            var reminder = await PaymentQuery.ReminderDaysAsync(db, ct);
            var pf2 = new PaymentFilter(p.ClientId, p.OwnerId, p.ProductId, p.Country);
            var openPay = await PaymentQuery.Rows(db.Contracts.AsNoTracking(), pf2 with { State = "open" }, now, db, reminder).Select(x => new { x.ClientId, x.ClientCode, x.Amount, x.Currency, x.DueDate }).ToListAsync(ct);
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            payments = new
            {
                open = openPay.Count,
                withoutAmount = openPay.Count(x => x.Amount == null),
                overdueByClient = openPay.Where(x => x.DueDate < today).GroupBy(x => new { x.ClientId, x.ClientCode })
                    .Select(g => new
                    {
                        clientId = g.Key.ClientId, client = g.Key.ClientCode, count = g.Count(),
                        amounts = g.Where(x => x.Amount != null).GroupBy(x => x.Currency ?? "").Select(c => new { currency = c.Key, amount = c.Sum(x => x.Amount!.Value) }).ToList()
                    }).OrderByDescending(x => x.count).Take(8).ToList()
            };
        }

        // ---- environments that are not reported Healthy (manual condition reports) ----
        var envQ = db.Environments.AsNoTracking().Where(e => e.Condition != Condition.Healthy && db.Clients.Any(c => c.Id == e.ClientId));
        if (p.ClientId is not null) envQ = envQ.Where(e => e.ClientId == p.ClientId);
        if (p.ProductId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == p.ProductId));
        if (!string.IsNullOrWhiteSpace(p.Country)) envQ = p.Country == "Unknown" ? envQ.Where(e => e.Client!.CountryUnknown) : envQ.Where(e => e.Client!.Country == p.Country);
        if (p.OwnerId is not null) envQ = envQ.Where(e => e.OwnerUserId == p.OwnerId || e.BackupOwnerUserId == p.OwnerId);
        var envRows = await envQ
            .OrderBy(e => e.Condition == Condition.Unavailable ? 0 : e.Condition == Condition.Degraded ? 1 : 2).ThenBy(e => e.Client!.Code).ThenBy(e => e.Name).Take(12)
            .Select(e => new
            {
                e.Id, e.Name, e.ClientId, client = e.Client!.Code, condition = e.Condition.ToString(), e.ConditionReason, e.ConditionObservedAt,
                owner = e.Owner == null ? null : e.Owner.DisplayName,
                products = db.Installations.Where(i => i.EnvironmentId == e.Id).Select(i => i.Product!.Code).Distinct().ToList()
            }).ToListAsync(ct);

        return new
        {
            evaluatedAt = now,
            period = new { from = pf, to = pt, unit, name = period is not null && Periods.Contains(period) ? period : "30d" },
            cases = new
            {
                openCount = open.Count,
                criticalHigh = open.Count(c => c.Priority is Priority.Critical or Priority.High),
                risk,
                openedInPeriod = opened.Count,
                closedInPeriod = closed.Count,
                // Due-date adherence of cases closed in the period that had a due date; the contractual SLA is not measured per case.
                adherence = new { measured = withDue.Count, onTime = withDue.Count(c => c.At <= c.DueAt) },
                trend = caseTrend,
                slaMeasurement = (string?)null
            },
            escalations,
            contracts,
            payments,
            environments = envRows,
            note = "Current figures are evaluated now; opened, closed, received, adherence and target figures use the selected period. Environment condition is manually reported, not monitored."
        };
    }
}
