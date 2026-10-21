using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// Chart data for the dashboard. Every breakdown uses the same scope filters and the same shared queries as the measures and
/// drilldown lists, at one evaluation time, so each bar equals the list it opens. Nothing here is a live measurement.
/// </summary>
public sealed class Insights(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public sealed record Bar(string Key, string Label, int Value, string? Link);
    public sealed record CountryRow(string Country, int Clients, int Environments, int OpenCases, int OverdueCases, int OpenCommitments, int OverdueCommitments, List<string> ClientCodes);
    public sealed record WeekPoint(DateOnly WeekStart, int Opened, int Closed);

    private static readonly CaseStatus[] OpenStatuses = [CaseStatus.New, CaseStatus.Triaged, CaseStatus.InProgress, CaseStatus.PendingValidation];

    public async Task<object> BuildAsync(DashboardQuery p, CancellationToken ct)
    {
        var now = p.AsOf ?? DateTimeOffset.UtcNow;
        var days = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var baseCase = new CaseFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios);
        var baseCom = new CommitmentFilter(ClientId: p.ClientId, TeamId: p.TeamId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country);
        string L(string path, string extra) => Link(p, now, path, extra);

        // ---- cases ----
        var open = await Cases(baseCase).Select(c => new { c.Status, c.Priority, c.CreatedAt }).ToListAsync(ct);
        var byStatus = OpenStatuses.Select(s => new Bar(s.ToString(), Label(s.ToString()), open.Count(c => c.Status == s), L("/cases", $"status={s}"))).ToList();
        var byPriority = Enum.GetValues<Priority>().Select(pr => new Bar(pr.ToString(), pr.ToString(), open.Count(c => c.Priority == pr), L("/cases", $"priority={pr}"))).ToList();
        // Age buckets by creation time; links use the same created-at window so the list matches the bar.
        (string Key, string Label, int From, int? To)[] buckets = [("0-2", "0–2 days", 0, 3), ("3-7", "3–7 days", 3, 8), ("8-30", "8–30 days", 8, 31), ("31+", "Over 30 days", 31, null)];
        var age = buckets.Select(b =>
        {
            var newest = now.AddDays(-b.From);
            DateTimeOffset? oldest = b.To is { } t ? now.AddDays(-t) : null;
            var n = open.Count(c => c.CreatedAt <= newest && (oldest == null || c.CreatedAt > oldest));
            var link = L("/cases", $"createdTo={Uri.EscapeDataString(newest.AddTicks(1).ToString("O"))}" + (oldest is null ? "" : $"&createdFrom={Uri.EscapeDataString(oldest.Value.AddTicks(1).ToString("O"))}"));
            return new Bar(b.Key, b.Label, n, link);
        }).ToList();

        // Weekly opened vs closed for the last 8 complete-or-current weeks (Monday start, UTC).
        var weekStart = now.UtcDateTime.Date.AddDays(-(((int)now.UtcDateTime.DayOfWeek + 6) % 7));
        var from = new DateTimeOffset(weekStart.AddDays(-7 * 7), TimeSpan.Zero);
        var all = CaseQuery.Apply(db.Cases.AsNoTracking(), baseCase with { Status = "all" }, now, days, policy, db, prios);
        var opened = await all.Where(c => c.CreatedAt >= from && c.CreatedAt <= now).Select(c => c.CreatedAt).ToListAsync(ct);
        var closed = await all.Where(c => c.ClosedAt != null && c.ClosedAt >= from && c.ClosedAt <= now).Select(c => c.ClosedAt!.Value).ToListAsync(ct);
        var trend = Enumerable.Range(0, 8).Select(i =>
        {
            var ws = from.AddDays(7 * i);
            var we = ws.AddDays(7);
            return new WeekPoint(DateOnly.FromDateTime(ws.UtcDateTime), opened.Count(x => x >= ws && x < we), closed.Count(x => x >= ws && x < we));
        }).ToList();

        // ---- commitments (open, by deadline window) ----
        var openCom = await CommitmentQuery.Apply(db.Commitments.AsNoTracking(), baseCom, now, days, db).Select(c => c.CurrentDueAt).ToListAsync(ct);
        var commitments = new List<Bar>
        {
            new("overdue", "Overdue", openCom.Count(d => d < now), L("/commitments", "due=overdue")),
            new("upcoming", $"Due in {days} days", openCom.Count(d => d >= now && d <= now.AddDays(days)), L("/commitments", "due=upcoming")),
            new("30", $"Due in {days + 1}–30 days", openCom.Count(d => d > now.AddDays(days) && d <= now.AddDays(30)), null),
            new("later", "Due later", openCom.Count(d => d > now.AddDays(30)), null)
        };

        // ---- environments: reported condition (manual, not live) ----
        // Environments of archived clients are not counted (same as the environment list the bars link to).
        var envQ = db.Environments.AsNoTracking().Where(e => db.Clients.Any(c => c.Id == e.ClientId));
        if (p.ClientId is not null) envQ = envQ.Where(e => e.ClientId == p.ClientId);
        if (p.ProductId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == p.ProductId));
        if (!string.IsNullOrWhiteSpace(p.Country)) envQ = p.Country == "Unknown" ? envQ.Where(e => e.Client!.CountryUnknown) : envQ.Where(e => e.Client!.Country == p.Country);
        if (p.OwnerId is not null) envQ = envQ.Where(e => e.OwnerUserId == p.OwnerId || e.BackupOwnerUserId == p.OwnerId);
        var envs = await envQ.Select(e => new { e.Condition, e.ConditionObservedAt }).ToListAsync(ct);
        var condPolicy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition));
        var views = envs.Select(e => EnvironmentEndpoints.ConditionView(e.Condition, e.ConditionObservedAt, condPolicy, now)).ToList();
        string EnvLink(string extra) => "/environments?" + string.Join("&", new[] { extra, p.ClientId is null ? "" : $"clientId={p.ClientId}", p.ProductId is null ? "" : $"productId={p.ProductId}",
            p.OwnerId is null ? "" : $"ownerId={p.OwnerId}", string.IsNullOrWhiteSpace(p.Country) ? "" : $"country={Uri.EscapeDataString(p.Country)}" }.Where(x => x.Length > 0));
        var condition = new List<Bar>
        {
            new("Healthy", "Healthy", views.Count(v => v.Reported == Condition.Healthy), EnvLink("condition=Healthy")),
            new("Degraded", "Degraded", views.Count(v => v.Reported == Condition.Degraded), EnvLink("condition=Degraded")),
            new("Unavailable", "Unavailable", views.Count(v => v.Reported == Condition.Unavailable), EnvLink("condition=Unavailable")),
            new("Unknown", "Unknown (no report)", views.Count(v => v.Reported == Condition.Unknown), EnvLink("condition=Unknown"))
        };
        var needsVerification = views.Count(v => v.NeedsVerification);

        // ---- data quality (open items) ----
        var dq = new List<Bar>();
        if (p.TeamId is null && p.ProductId is null)
        {
            var dqQ = QualityEndpoints.Filter(db.DataQualityItems.AsNoTracking(), null, p.ClientId, p.OwnerId, "Open", null);
            if (!string.IsNullOrWhiteSpace(p.Country)) dqQ = dqQ.Where(i => i.ClientId != null && db.Clients.Any(c => c.Id == i.ClientId && (p.Country == "Unknown" ? c.CountryUnknown : c.Country == p.Country)));
            dq = (await dqQ.GroupBy(i => i.Rule).Select(g => new { g.Key, n = g.Count() }).ToListAsync(ct))
                .OrderByDescending(x => x.n).Select(x => new Bar(x.Key, DataQualityEngine.Rule.Labels.GetValueOrDefault(x.Key, x.Key), x.n, $"/data-quality?rule={x.Key}" + (p.ClientId is null ? "" : $"&clientId={p.ClientId}"))).ToList();
        }

        // ---- contracts: renewal visibility (contracts have no team, so a team filter leaves this empty) ----
        var contractBars = new List<Bar>();
        var onSiteRequired = 0;
        object? contractMore = null;
        if (p.TeamId is null && p.OwnerId is null)
        {
            var baseContract = new ContractFilter(ClientId: p.ClientId, ProductId: p.ProductId, Country: p.Country);
            async Task<int> Count(ContractFilter f) => await ContractQuery.Apply(db.Contracts.AsNoTracking(), f, now, db).CountAsync(ct);
            contractBars =
            [
                new("expired", "Expired, still Active", await Count(baseContract with { Renewal = "expired" }), L("/contracts", "renewal=expired")),
                new("due", $"Renewal due (≤ {ContractQuery.RenewalWindowDays} days)", await Count(baseContract with { Renewal = "due" }), L("/contracts", "renewal=due")),
                new("unknownEnd", "End date unknown", await Count(baseContract with { Renewal = "unknownEnd" }), L("/contracts", "renewal=unknownEnd")),
                new("current", "Current", await Count(baseContract with { Renewal = "current" }), L("/contracts", "renewal=current")),
                new("draft", "Draft / not signed", await Count(baseContract with { Status = ContractStatus.Draft }), L("/contracts", "status=Draft"))
            ];
            onSiteRequired = await ContractQuery.Apply(db.Contracts.AsNoTracking(), baseContract with { Status = ContractStatus.Active }, now, db).SumAsync(c => c.OnSiteEngineersRequired ?? 0, ct);

            // A39: contracts and SLA charts — type, status, expiries per month, support model, on-site staffing and recorded SLA targets.
            var ks = await ContractQuery.Apply(db.Contracts.AsNoTracking(), baseContract, now, db)
                .Select(c => new { c.Id, c.Type, c.Status, c.EndDate, c.SupportModel, onSite = c.OnSiteEngineersRequired ?? 0, client = c.Client!.Code, c.ClientId,
                    targets = c.SlaTargets.Select(t => new { t.Priority, t.ResponseMinutes, t.ResolutionMinutes }).ToList() }).ToListAsync(ct);
            var typeLabels = await db.LookupValues.AsNoTracking().Where(l => l.ListName == "ContractType").ToDictionaryAsync(l => l.Code, l => l.Label, ct);
            var byType = ks.GroupBy(c => c.Type).OrderByDescending(g => g.Count())
                .Select(g => new Bar(g.Key, typeLabels.GetValueOrDefault(g.Key, Label(g.Key)), g.Count(), L("/contracts", $"type={Uri.EscapeDataString(g.Key)}"))).ToList();
            var kStatus = Enum.GetValues<ContractStatus>().Select(st => new Bar(st.ToString(), st.ToString(), ks.Count(c => c.Status == st), L("/contracts", $"status={st}"))).ToList();
            var monthStart = new DateOnly(now.UtcDateTime.Year, now.UtcDateTime.Month, 1);
            var expiries = Enumerable.Range(0, 12).Select(i =>
            {
                var m = monthStart.AddMonths(i);
                return new Bar(m.ToString("yyyy-MM"), m.ToString("MMM yy"), ks.Count(c => c.Status == ContractStatus.Active && c.EndDate >= m && c.EndDate < m.AddMonths(1)), null);
            }).ToList();
            var support = Enum.GetValues<SupportModel>().Select(sm => new Bar(sm.ToString(), sm == SupportModel.OnSite ? "On site" : sm.ToString(), ks.Count(c => c.Status == ContractStatus.Active && c.SupportModel == sm), null))
                .Where(b => b.Value > 0).ToList();
            var onSiteByClient = ks.Where(c => c.Status == ContractStatus.Active && c.onSite > 0).GroupBy(c => new { c.ClientId, c.client })
                .Select(g => new Bar(g.Key.ClientId.ToString(), g.Key.client, g.Sum(x => x.onSite), $"/clients/{g.Key.ClientId}")).OrderByDescending(b => b.Value).Take(10).ToList();
            var activeTargets = ks.Where(c => c.Status == ContractStatus.Active).SelectMany(c => c.targets).ToList();
            static int? Median(List<int> v) { if (v.Count == 0) return null; v.Sort(); return v[v.Count / 2]; }
            var sla = Enum.GetValues<Priority>().Select(pr =>
            {
                var t = activeTargets.Where(x => x.Priority == pr).ToList();
                return new
                {
                    priority = pr.ToString(), contracts = t.Count,
                    responseMedian = Median(t.Where(x => x.ResponseMinutes != null).Select(x => x.ResponseMinutes!.Value).ToList()),
                    responseFastest = t.Where(x => x.ResponseMinutes != null).Select(x => x.ResponseMinutes).Min(),
                    resolutionMedian = Median(t.Where(x => x.ResolutionMinutes != null).Select(x => x.ResolutionMinutes!.Value).ToList()),
                    resolutionFastest = t.Where(x => x.ResolutionMinutes != null).Select(x => x.ResolutionMinutes).Min()
                };
            }).ToList();
            var withSla = ks.Count(c => c.Status == ContractStatus.Active && c.targets.Count > 0);
            contractMore = new { byType, byStatus = kStatus, expiries, support, onSiteByClient, sla, active = ks.Count(c => c.Status == ContractStatus.Active), withSla, total = ks.Count };
        }

        // ---- payments (A50): open contract payments by state and by month due, amounts per currency ----
        object? paymentMore = null;
        if (p.TeamId is null)
        {
            var reminderDays = await PaymentQuery.ReminderDaysAsync(db, ct);
            var pf = new PaymentFilter(p.ClientId, p.OwnerId, p.ProductId, p.Country);
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var openPay = await PaymentQuery.Rows(db.Contracts.AsNoTracking(), pf with { State = "open" }, now, db, reminderDays).Select(x => new { x.DueDate, x.Amount, x.Currency }).ToListAsync(ct);
            var month = new DateOnly(today.Year, today.Month, 1);
            var byMonth = new List<Bar> { new("overdue", "Overdue", openPay.Count(x => x.DueDate < today), "/notifications?show=payments&state=overdue") };
            byMonth.AddRange(Enumerable.Range(0, 6).Select(i =>
            {
                var m = month.AddMonths(i);
                return new Bar(m.ToString("yyyy-MM"), m.ToString("MMM yy"), openPay.Count(x => x.DueDate >= today && x.DueDate >= m && x.DueDate < m.AddMonths(1)), null);
            }));
            var currencies = openPay.Where(x => x.Amount != null && x.DueDate != null && x.DueDate < month.AddMonths(6)).GroupBy(x => x.Currency ?? "").OrderByDescending(g => g.Sum(x => x.Amount!.Value)).Select(g => g.Key).ToList();
            var amountsByMonth = currencies.Select(cur => new
            {
                currency = cur,
                overdue = openPay.Where(x => x.Currency == cur && x.DueDate < today).Sum(x => x.Amount ?? 0),
                months = Enumerable.Range(0, 6).Select(i => { var m = month.AddMonths(i); return openPay.Where(x => x.Currency == cur && x.DueDate >= today && x.DueDate >= m && x.DueDate < m.AddMonths(1)).Sum(x => x.Amount ?? 0); }).ToList()
            }).ToList();
            var next = (await PaymentQuery.Rows(db.Contracts.AsNoTracking(), pf with { State = "open" }, now, db, reminderDays).Where(x => x.DueDate != null)
                .OrderBy(x => x.DueDate).ThenBy(x => x.Id).Take(8).ToListAsync(ct))
                .Select(x => new { x.Id, x.ContractId, x.ContractRef, x.ClientCode, x.Condition, x.Amount, x.Currency, x.DueDate, x.Status, state = PaymentQuery.StateOf(x, today, reminderDays) }).ToList();
            paymentMore = new { summary = await PaymentQuery.SummaryAsync(db.Contracts.AsNoTracking(), pf, now, db, reminderDays, ct), byMonth, amountsByMonth, next };
        }

        // ---- product coverage: distinct environments per product ----
        var instQ = db.Installations.AsNoTracking().AsQueryable();
        if (p.ClientId is not null) instQ = instQ.Where(i => i.ClientId == p.ClientId);
        if (p.ProductId is not null) instQ = instQ.Where(i => i.ProductId == p.ProductId);
        if (!string.IsNullOrWhiteSpace(p.Country)) instQ = p.Country == "Unknown" ? instQ.Where(i => i.Environment!.Client!.CountryUnknown) : instQ.Where(i => i.Environment!.Client!.Country == p.Country);
        var inst = await instQ.Select(i => new { i.ProductId, code = i.Product!.Code, i.EnvironmentId, unknown = i.ProductVersionId == null }).ToListAsync(ct);
        var products = inst.GroupBy(i => new { i.ProductId, i.code }).OrderByDescending(g => g.Select(x => x.EnvironmentId).Distinct().Count())
            .Select(g => new { productId = g.Key.ProductId, product = g.Key.code, environments = g.Select(x => x.EnvironmentId).Distinct().Count(), installations = g.Count(), unknownVersion = g.Count(x => x.unknown), link = $"/versions?productId={g.Key.ProductId}" + (p.ClientId is null ? "" : $"&clientId={p.ClientId}") })
            .ToList();

        // ---- escalations (A41) ----
        object? escalationMore = null;
        if (p.TeamId is null)
        {
            var esc = await EscalationQuery.Apply(db.Escalations.AsNoTracking(), new EscalationFilter(ClientId: p.ClientId, OwnerId: p.OwnerId, ProductId: p.ProductId, Country: p.Country, Status: "all"), now, db)
                .Select(e => new { e.Channel, e.Status, e.Level, e.ReceivedAt, e.ResolutionDueAt, e.ResponseDueAt }).ToListAsync(ct);
            var channelLabels = await db.LookupValues.AsNoTracking().Where(l => l.ListName == LookupLists.EscalationChannel).ToDictionaryAsync(l => l.Code, l => l.Label, ct);
            bool Act(EscalationStatus s) => Escalation.Active.Contains(s);
            var activeEsc = esc.Where(e => Act(e.Status)).ToList();
            var overdueEsc = activeEsc.Count(e => (e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now));
            var byChannel = esc.GroupBy(e => e.Channel).OrderByDescending(g => g.Count())
                .Select(g => new Bar(g.Key, channelLabels.GetValueOrDefault(g.Key, g.Key), g.Count(), L("/escalations", $"status=all&channel={Uri.EscapeDataString(g.Key)}"))).ToList();
            var escStatus = Enum.GetValues<EscalationStatus>().Select(s => new Bar(s.ToString(), s == EscalationStatus.InProgress ? "In progress" : s.ToString(), esc.Count(e => e.Status == s), L("/escalations", $"status={s}"))).ToList();
            var byLevel = Enumerable.Range(1, 3).Select(l => new Bar(l.ToString(), $"Level {l}", activeEsc.Count(e => e.Level == l), L("/escalations", $"level={l}"))).ToList();
            var monthStart = new DateTimeOffset(now.UtcDateTime.Year, now.UtcDateTime.Month, 1, 0, 0, 0, TimeSpan.Zero);
            var received = Enumerable.Range(0, 6).Select(k =>
            {
                var m = monthStart.AddMonths(k - 5);
                return new Bar(m.ToString("yyyy-MM"), m.ToString("MMM yy"), esc.Count(e => e.ReceivedAt >= m && e.ReceivedAt < m.AddMonths(1)), null);
            }).ToList();
            escalationMore = new { active = activeEsc.Count, overdue = overdueEsc, total = esc.Count, byChannel, byStatus = escStatus, byLevel, received };
        }

        return new
        {
            evaluatedAt = now,
            escalations = escalationMore,
            payments = paymentMore,
            countries = await CountriesAsync(p, now, ct),
            cases = new { byStatus, byPriority, age, trend, trendNote = "Weeks start Monday (UTC). Opened = created in the week; closed = closed in the week, regardless of current status." },
            commitments,
            environments = new { condition, needsVerification, note = "Manually reported condition, not live monitoring. Needs verification = last report older than the condition review period." },
            dataQuality = dq,
            contractDetail = contractMore,
            contracts = new { renewal = contractBars, onSiteRequired, note = $"Active contracts only; renewal due = notice deadline (or end date) within {ContractQuery.RenewalWindowDays} days. Recorded terms, not SLA compliance." },
            products
        };
    }

    /// <summary>Clients per country for the map. The country filter is not applied here, so the map always shows where the authorized portfolio is.</summary>
    private async Task<object> CountriesAsync(DashboardQuery p, DateTimeOffset now, CancellationToken ct)
    {
        var clients = db.Clients.AsNoTracking().AsQueryable();
        if (p.ClientId is not null) clients = clients.Where(c => c.Id == p.ClientId);
        if (p.OwnerId is not null) clients = clients.Where(c => c.OwnerUserId == p.OwnerId);
        if (p.ProductId is not null) clients = clients.Where(c => db.Installations.Any(i => i.ClientId == c.Id && i.ProductId == p.ProductId));
        var rows = await clients.Select(c => new
        {
            c.Code, c.Country, c.CountryUnknown,
            environments = db.Environments.Count(e => e.ClientId == c.Id),
            openCases = db.Cases.Count(x => x.ClientId == c.Id && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled && (p.TeamId == null || x.ResponsibleTeamId == p.TeamId)),
            overdueCases = db.Cases.Count(x => x.ClientId == c.Id && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled && x.DueAt != null && x.DueAt < now && (p.TeamId == null || x.ResponsibleTeamId == p.TeamId)),
            openCommitments = db.Commitments.Count(x => x.ClientId == c.Id && x.Status == CommitmentStatus.Open),
            overdueCommitments = db.Commitments.Count(x => x.ClientId == c.Id && x.Status == CommitmentStatus.Open && x.CurrentDueAt < now),
            // A39: per-client figures for the interactive map.
            c.Id, c.Name, c.ParentClientId,
            servers = db.Assets.Count(a => a.ClientId == c.Id && a.TypeCategory != AssetType.LogicalEndpoint),
            activeContracts = db.Contracts.Count(k => k.ClientId == c.Id && k.Status == ContractStatus.Active),
            renewalAttention = db.Contracts.Count(k => k.ClientId == c.Id && k.Status == ContractStatus.Active && (k.EndDate == null || k.EndDate.Value.AddDays(-(k.NoticeDays ?? 0)) <= DateOnly.FromDateTime(now.UtcDateTime).AddDays(ContractQuery.RenewalWindowDays)))
        }).ToListAsync(ct);
        var byCountry = rows.Where(r => !r.CountryUnknown && r.Country != null).GroupBy(r => r.Country!.Trim())
            .Select(g => new CountryRow(g.Key, g.Count(), g.Sum(x => x.environments), g.Sum(x => x.openCases), g.Sum(x => x.overdueCases), g.Sum(x => x.openCommitments), g.Sum(x => x.overdueCommitments), g.Select(x => x.Code).Order().ToList()))
            .OrderByDescending(c => c.Clients).ThenBy(c => c.Country).ToList();
        var unknown = rows.Where(r => r.CountryUnknown || r.Country == null).ToList();
        var clientRows = rows.OrderBy(r => r.Code).Select(r => new
        {
            r.Id, r.Code, r.Name, country = r.CountryUnknown ? null : r.Country, r.ParentClientId, r.environments, r.servers, r.openCases, r.overdueCases,
            r.openCommitments, r.overdueCommitments, r.activeContracts, r.renewalAttention
        }).ToList();
        return new { rows = byCountry, unknownCountryClients = unknown.Count, unknownCountryCodes = unknown.Select(u => u.Code).Order().ToList(), clients = clientRows };
    }

    private static string Label(string v) => System.Text.RegularExpressions.Regex.Replace(v, "([a-z])([A-Z])", "$1 $2") switch { var s => char.ToUpper(s[0]) + s[1..].ToLowerInvariant() };

    private static string Link(DashboardQuery p, DateTimeOffset now, string path, string extra)
    {
        var parts = new List<string> { extra };
        if (p.ClientId is not null) parts.Add($"clientId={p.ClientId}");
        if (p.TeamId is not null) parts.Add($"teamId={p.TeamId}");
        if (p.OwnerId is not null) parts.Add($"ownerId={p.OwnerId}");
        if (p.ProductId is not null) parts.Add($"productId={p.ProductId}");
        if (!string.IsNullOrWhiteSpace(p.Country)) parts.Add($"country={Uri.EscapeDataString(p.Country)}");
        if (p.AsOf is not null) parts.Add($"asOf={Uri.EscapeDataString(now.ToString("O"))}");
        return path + "?" + string.Join("&", parts.Where(x => x.Length > 0));
    }
}
