using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A115 (owner request, 13 Nov 2026): the Payments dashboard — every contract payment term in view as Paid, Upcoming or Overdue,
/// for any set of calendar years, clients, contract owners, products and currencies (all multi-select), with an Excel export of the same view.
/// The states are those of A50 (<see cref="PaymentQuery"/>): Upcoming includes the terms due within the reminder window ("due soon").
/// The year rule is that of A113: a paid term counts in the year it was paid (its due date when no paid date is recorded), any other
/// term in the year it is due; a term without a date is in no year. Calendar years only (owner decision, 13 Nov 2026).
/// Waived terms and open terms of terminated contracts are counted apart. Amounts are never added across currencies.
/// </summary>
public sealed class PaymentsDashboard(HubDbContext db)
{
    public const int MaxClients = 200, MaxOwners = 100, MaxProducts = 100, MaxCurrencies = 20;
    public static readonly string[] Buckets = ["paid", "upcoming", "overdue"];

    public sealed record Amount(string Currency, decimal Value);
    public sealed record Part(int Count, IReadOnlyList<Amount> Amounts);

    /// <summary>The filters of one request. Empty lists mean "all in view".</summary>
    public sealed record Filters(string? Years, IReadOnlyList<long> ClientIds, IReadOnlyList<long> OwnerIds, IReadOnlyList<long> ProductIds, IReadOnlyList<string> Currencies)
    {
        public static Filters Parse(string? years, string? clientIds, string? ownerIds, string? productIds, string? currencies) =>
            new(years, ParseIds(clientIds, "clientIds", MaxClients, "clients"), ParseIds(ownerIds, "ownerIds", MaxOwners, "contract owners"),
                ParseIds(productIds, "productIds", MaxProducts, "products"), ParseCurrencies(currencies));
    }

    /// <summary>Count and amount per currency (largest first). Terms without an amount are counted, not summed.</summary>
    public static Part PartOf(IEnumerable<PaymentRow> rows)
    {
        var list = rows.ToList();
        return new Part(list.Count, list.Where(r => r.Amount != null).GroupBy(r => r.Currency ?? "")
            .Select(g => new Amount(g.Key, g.Sum(r => r.Amount!.Value))).OrderByDescending(a => a.Value).ThenBy(a => a.Currency, StringComparer.Ordinal).ToList());
    }

    /// <summary>The date a term counts in (A113): paid → paid date, else due date; null = in no year.</summary>
    public static DateOnly? YearDate(PaymentRow p) => p.Status == PaymentStatus.Paid ? p.PaidOn ?? p.DueDate : p.DueDate;

    /// <summary>The dashboard bucket of a term: paid, upcoming (due soon or later), overdue; null for waived, terminated or undated open terms.</summary>
    public static string? BucketOf(PaymentRow p, DateOnly today, int reminderDays) => PaymentQuery.StateOf(p, today, reminderDays) switch
    {
        "paid" => "paid",
        "overdue" => "overdue",
        "due" or "upcoming" when p.DueDate != null => "upcoming",
        _ => null
    };

    /// <summary>Query value: empty = all clients in view; otherwise client IDs separated by commas.</summary>
    public static IReadOnlyList<long> ParseClients(string? value) => ParseIds(value, "clientIds", MaxClients, "clients");

    public static IReadOnlyList<long> ParseIds(string? value, string field, int max, string what)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        var ids = new SortedSet<long>();
        foreach (var part in value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            if (!long.TryParse(part, NumberStyles.None, CultureInfo.InvariantCulture, out var id) || id <= 0)
                throw new ValidationException(field, $"Choose {what} from the list.");
            ids.Add(id);
        }
        if (ids.Count > max) throw new ValidationException(field, $"Choose at most {max} {what}, or all {what}.");
        return [.. ids];
    }

    /// <summary>Currency codes separated by commas (letters and digits, up to 10 characters each), compared without case.</summary>
    public static IReadOnlyList<string> ParseCurrencies(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        var set = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var part in value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            if (part.Length > 10 || !part.All(char.IsAsciiLetterOrDigit)) throw new ValidationException("currencies", "Choose currencies from the list.");
            set.Add(part.ToUpperInvariant());
        }
        if (set.Count > MaxCurrencies) throw new ValidationException("currencies", $"Choose at most {MaxCurrencies} currencies, or all currencies.");
        return [.. set];
    }

    private sealed record Item(PaymentRow Row, string? Bucket, string State, IReadOnlyList<string> Products);
    private sealed record Option(long Id, string Code, string Name);

    private sealed class View
    {
        public required DateTimeOffset Now { get; init; }
        public required DateOnly Today { get; init; }
        public required int ReminderDays { get; init; }
        public required YearSelection Sel { get; init; }
        public required Filters F { get; init; }
        public required int Current { get; init; }
        public required int FirstYear { get; init; }
        public required int LastYear { get; init; }
        public required List<Option> Clients { get; init; }
        public required List<Option> Owners { get; init; }
        public required List<Option>? Products { get; init; }
        public required List<string> Currencies { get; init; }
        public required List<Item> InYears { get; init; }
        public required List<PaymentRow> Picked { get; init; }
        public required Dictionary<long, Option> ClientById { get; init; }
        public List<Item> In(string bucket) => InYears.Where(x => x.Bucket == bucket).ToList();
        public IEnumerable<Item> Listed => InYears.Where(x => x.Bucket != null);
    }

    private async Task<View> ComputeAsync(Filters f, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var sel = YearSelection.Parse(f.Years, now, Zones.Find(me.TimeZone) ?? TimeZoneInfo.Utc);
        // Filtering by a product also reveals whether a contract's project uses it, so it needs Products:View (as the contract register).
        var seesProducts = me.HasRight(RightKeys.Products, RightKeys.View);
        if (f.ProductIds.Count > 0) me.RequireRight(RightKeys.Products, RightKeys.View);
        var days = await PaymentQuery.ReminderDaysAsync(db, ct);

        // Every term the reader may see (contract scope applies through the query filters), then the selection.
        var all = await PaymentQuery.Rows(db.Contracts.AsNoTracking(), new PaymentFilter(State: "all"), now, db, days).ToListAsync(ct);
        var contractIds = all.Select(p => p.ContractId).Distinct().ToList();
        var productsOf = new Dictionary<long, List<Option>>();
        List<Option>? productOptions = null;
        if (seesProducts && contractIds.Count > 0)
        {
            var links = await db.Contracts.AsNoTracking().Where(c => contractIds.Contains(c.Id))
                .Join(db.ProjectProducts.AsNoTracking(), c => c.ProjectId, pp => pp.ProjectId, (c, pp) => new { ContractId = c.Id, pp.ProductId })
                .Join(db.Products.AsNoTracking(), x => x.ProductId, p => p.Id, (x, p) => new { x.ContractId, p.Id, p.Code, p.Name }).ToListAsync(ct);
            productsOf = links.GroupBy(x => x.ContractId).ToDictionary(g => g.Key, g => g.Select(x => new Option(x.Id, x.Code, x.Name)).DistinctBy(o => o.Id).OrderBy(o => o.Code, StringComparer.OrdinalIgnoreCase).ToList());
            productOptions = links.Select(x => new Option(x.Id, x.Code, x.Name)).DistinctBy(o => o.Id).OrderBy(o => o.Code, StringComparer.OrdinalIgnoreCase).ToList();
        }
        else if (seesProducts) productOptions = [];
        var clientIdsInView = all.Select(p => p.ClientId).Distinct().ToList();
        var clients = await db.Clients.AsNoTracking().Where(c => clientIdsInView.Contains(c.Id)).Select(c => new Option(c.Id, c.Code, c.Name)).ToListAsync(ct);
        var clientById = clients.ToDictionary(c => c.Id);

        var picked = all.Where(p =>
            (f.ClientIds.Count == 0 || f.ClientIds.Contains(p.ClientId))
            && (f.OwnerIds.Count == 0 || (p.OwnerUserId is { } o && f.OwnerIds.Contains(o)))
            && (f.Currencies.Count == 0 || f.Currencies.Contains((p.Currency ?? "").ToUpperInvariant()))
            && (f.ProductIds.Count == 0 || (productsOf.TryGetValue(p.ContractId, out var ps) && ps.Any(x => f.ProductIds.Contains(x.Id))))).ToList();
        var inYears = picked.Where(p => YearDate(p) is { } d && sel.Contains(d))
            .Select(p => new Item(p, BucketOf(p, today, days), PaymentQuery.StateOf(p, today, days), productsOf.TryGetValue(p.ContractId, out var ps) ? ps.Select(x => x.Code).ToList() : [])).ToList();

        // The years a reader can choose: the years of the terms in view, at least last year to next year.
        var current = TimeZoneInfo.ConvertTime(now, sel.Zone).Year;
        var known = all.Select(YearDate).Concat(all.Select(p => p.DueDate)).OfType<DateOnly>().Select(d => d.Year).Where(y => y >= 2000 && y <= current + 10).ToList();
        return new View
        {
            Now = now, Today = today, ReminderDays = days, Sel = sel, F = f, Current = current,
            FirstYear = Math.Min(current - 1, known.Count == 0 ? current : known.Min()),
            LastYear = Math.Max(current + 1, known.Count == 0 ? current : known.Max()),
            Clients = [.. clients.OrderBy(c => c.Code, StringComparer.OrdinalIgnoreCase)],
            Owners = [.. all.Where(p => p.OwnerUserId != null).GroupBy(p => p.OwnerUserId!.Value).Select(g => new Option(g.Key, g.First().Owner ?? "", g.First().Owner ?? "")).OrderBy(o => o.Name, StringComparer.OrdinalIgnoreCase)],
            Products = productOptions,
            Currencies = [.. all.Where(p => !string.IsNullOrWhiteSpace(p.Currency)).Select(p => p.Currency!.ToUpperInvariant()).Distinct().Order(StringComparer.Ordinal)],
            InYears = inYears, Picked = picked, ClientById = clientById
        };
    }

    private static int Order(string? b) => b switch { "overdue" => 0, "upcoming" => 1, "paid" => 2, _ => 3 };
    private static IEnumerable<Item> Sorted(IEnumerable<Item> items) => items.OrderBy(x => Order(x.Bucket))
        .ThenBy(x => x.Bucket == "paid" ? -YearDate(x.Row)!.Value.DayNumber : x.Row.DueDate?.DayNumber ?? int.MaxValue).ThenBy(x => x.Row.Id);

    private static IEnumerable<(Option Client, Part Paid, Part Upcoming, Part Overdue, int Terms)> ByClient(View v) =>
        v.Listed.GroupBy(x => x.Row.ClientId).Select(g =>
        {
            Part P(string b) => PartOf(g.Where(x => x.Bucket == b).Select(x => x.Row));
            var c = v.ClientById.GetValueOrDefault(g.Key) ?? new Option(g.Key, g.First().Row.ClientCode, "");
            return (c, P("paid"), P("upcoming"), P("overdue"), g.Count());
        }).OrderByDescending(c => c.Item4.Count).ThenByDescending(c => c.Item3.Count).ThenBy(c => c.c.Code, StringComparer.OrdinalIgnoreCase);

    private static List<PaymentRow> OverdueOtherYears(View v) =>
        v.Picked.Where(p => BucketOf(p, v.Today, v.ReminderDays) == "overdue" && !v.Sel.Contains(p.DueDate!.Value)).ToList();

    public async Task<object> BuildAsync(Filters f, UserContext me, CancellationToken ct)
    {
        var v = await ComputeAsync(f, me, ct);
        var sel = v.Sel;
        var today = v.Today;
        var paid = v.In("paid").Select(x => x.Row).ToList();
        var upcoming = v.In("upcoming").Select(x => x.Row).ToList();
        var overdue = v.In("overdue").Select(x => x.Row).ToList();

        // Over time: by month for a single year, otherwise by year (all years: every year with a term).
        var byMonth = !sel.All && sel.Years.Count == 1;
        var periods = byMonth
            ? Enumerable.Range(1, 12).Select(m => (Key: $"{sel.Years[0]}-{m:00}", Label: new DateOnly(sel.Years[0], m, 1).ToString("MMM", CultureInfo.InvariantCulture)))
            : (sel.All ? v.Listed.Select(x => YearDate(x.Row)!.Value.Year).Distinct().Order() : sel.Years.AsEnumerable())
                .Select(y => (Key: y.ToString(CultureInfo.InvariantCulture), Label: y.ToString(CultureInfo.InvariantCulture)));
        string PeriodOf(PaymentRow p) => YearDate(p)!.Value is var d && byMonth ? $"{d.Year}-{d.Month:00}" : d.Year.ToString(CultureInfo.InvariantCulture);
        var timeline = periods.Select(per =>
        {
            var rows = v.Listed.Where(x => PeriodOf(x.Row) == per.Key).ToList();
            Part P(string b) => PartOf(rows.Where(x => x.Bucket == b).Select(x => x.Row));
            return new { key = per.Key, label = per.Label, paid = P("paid"), upcoming = P("upcoming"), overdue = P("overdue") };
        }).ToList();

        // How late the overdue terms are (in the selected years).
        (string Key, string Label, int Min, int Max)[] ages = [("1-30", "1–30 days", 1, 30), ("31-60", "31–60 days", 31, 60), ("61-90", "61–90 days", 61, 90), ("90+", "Over 90 days", 91, int.MaxValue)];
        var aging = ages.Select(a => new { key = a.Key, label = a.Label, part = PartOf(overdue.Where(p => today.DayNumber - p.DueDate!.Value.DayNumber is var late && late >= a.Min && late <= a.Max)) }).ToList();

        return new
        {
            evaluatedAt = v.Now, today, reminderDays = v.ReminderDays,
            period = new { all = sel.All, years = sel.Years, label = sel.Label, contiguous = sel.Contiguous, current = v.Current, firstYear = v.FirstYear, lastYear = v.LastYear, timeZone = sel.Zone.Id },
            clientIds = f.ClientIds, ownerIds = f.OwnerIds, productIds = f.ProductIds, currencies = f.Currencies,
            options = new
            {
                clients = v.Clients.Select(c => new { c.Id, c.Code, c.Name }),
                owners = v.Owners.Select(o => new { o.Id, o.Name }),
                products = v.Products?.Select(p => new { p.Id, p.Code, p.Name }),
                currencies = v.Currencies
            },
            totals = new
            {
                paid = PartOf(paid), upcoming = PartOf(upcoming), overdue = PartOf(overdue),
                dueSoon = PartOf(upcoming.Where(p => p.DueDate <= today.AddDays(v.ReminderDays))),
                all = PartOf(paid.Concat(upcoming).Concat(overdue)),
                waived = v.InYears.Count(x => x.Row.Status == PaymentStatus.Waived),
                closed = v.InYears.Count(x => x.Bucket == null && x.Row.Status != PaymentStatus.Waived),
                undated = v.Picked.Count(p => YearDate(p) is null && p.Status is PaymentStatus.Pending or PaymentStatus.Invoiced && p.ContractStatus != ContractStatus.Terminated)
            },
            overdueOtherYears = PartOf(OverdueOtherYears(v)),
            timeline = new { unit = byMonth ? "month" : "year", rows = timeline },
            aging,
            byClient = ByClient(v).Select(c => new { clientId = c.Client.Id, code = c.Client.Code, name = c.Client.Name, paid = c.Paid, upcoming = c.Upcoming, overdue = c.Overdue, terms = c.Terms }).ToList(),
            items = Sorted(v.Listed).Select(x => new
            {
                x.Row.Id, x.Row.ContractId, x.Row.ContractRef, x.Row.ContractTitle, x.Row.ClientId, clientCode = x.Row.ClientCode, clientName = v.ClientById.GetValueOrDefault(x.Row.ClientId)?.Name,
                x.Row.Owner, x.Row.Condition, x.Row.Percentage, x.Row.Amount, x.Row.Currency, x.Row.DueDate, status = x.Row.Status.ToString(), x.Row.PaidOn,
                bucket = x.Bucket, state = x.State, products = x.Products,
                daysOverdue = x.Bucket == "overdue" ? today.DayNumber - x.Row.DueDate!.Value.DayNumber : (int?)null,
                daysToDue = x.Bucket == "upcoming" ? x.Row.DueDate!.Value.DayNumber - today.DayNumber : (int?)null
            }).ToList()
        };
    }

    private static readonly Dictionary<string, string> StateWords = new()
    {
        ["paid"] = "Paid", ["overdue"] = "Overdue", ["due"] = "Due soon", ["upcoming"] = "Upcoming", ["waived"] = "Waived", ["closed"] = "Contract terminated"
    };

    /// <summary>The same view as an Excel workbook: the filters and totals, the payment terms, and the terms per client.</summary>
    public async Task<(byte[] Bytes, string FileName, int Rows)> ExportAsync(Filters f, UserContext me, CancellationToken ct)
    {
        var v = await ComputeAsync(f, me, ct);
        var zone = v.Sel.Zone;
        var local = TimeZoneInfo.ConvertTime(v.Now, zone);
        static DateTime? D(DateOnly? d) => d?.ToDateTime(TimeOnly.MinValue);
        string Names<T>(IReadOnlyList<T> ids, Func<T, string?> name, string all) => ids.Count == 0 ? all : string.Join(", ", ids.Select(i => name(i) ?? i!.ToString()));
        string MoneyOf(Part p) => p.Amounts.Count == 0 ? (p.Count == 0 ? "0" : "No amount") : string.Join(" · ", p.Amounts.Select(a => $"{(a.Currency.Length > 0 ? a.Currency + " " : "")}{a.Value.ToString("#,0.##", CultureInfo.InvariantCulture)}"));

        var summary = new List<IReadOnlyList<object?>>
        {
            new object?[] { "Payments dashboard", null, null, null },
            new object?[] { "Generated", local.DateTime, $"{me.AccountName} · {zone.Id}", null },
            new object?[] { "Years", v.Sel.Label, "Calendar years. Paid terms count in the year paid, others in the year due.", null },
            new object?[] { "Clients", Names(f.ClientIds, id => v.ClientById.GetValueOrDefault(id)?.Code, "All clients in view"), null, null },
            new object?[] { "Contract owners", Names(f.OwnerIds, id => v.Owners.FirstOrDefault(o => o.Id == id)?.Name, "All owners"), null, null },
            new object?[] { "Products", Names(f.ProductIds, id => v.Products?.FirstOrDefault(p => p.Id == id)?.Code, "All products"), null, null },
            new object?[] { "Currencies", Names(f.Currencies, c => c, "All currencies"), null, null },
            new object?[] { null, null, null, null },
            new object?[] { "Bucket", "Payment terms", "Currency", "Amount" }
        };
        foreach (var b in Buckets)
        {
            var part = PartOf(v.In(b).Select(x => x.Row));
            var label = b == "paid" ? "Paid" : b == "upcoming" ? "Upcoming" : "Overdue";
            if (part.Amounts.Count == 0) summary.Add(new object?[] { label, part.Count, null, null });
            foreach (var (a, i) in part.Amounts.Select((a, i) => (a, i))) summary.Add(new object?[] { label, i == 0 ? part.Count : null, a.Currency, a.Value });
        }
        var other = PartOf(OverdueOtherYears(v));
        if (other.Count > 0) summary.Add(new object?[] { "Overdue from other years", other.Count, null, MoneyOf(other) });
        summary.Add(new object?[] { null, null, null, null });
        summary.Add(new object?[] { "Not in the totals", null, null, null });
        summary.Add(new object?[] { "Waived", v.InYears.Count(x => x.Row.Status == PaymentStatus.Waived), null, null });
        summary.Add(new object?[] { "Open, contract terminated", v.InYears.Count(x => x.Bucket == null && x.Row.Status != PaymentStatus.Waived), null, null });
        summary.Add(new object?[] { "Open, no due date", v.Picked.Count(p => YearDate(p) is null && p.Status is PaymentStatus.Pending or PaymentStatus.Invoiced && p.ContractStatus != ContractStatus.Terminated), null, null });
        summary.Add(new object?[] { "Amounts are never added across currencies. Recorded contract payment terms, not invoicing or accounting.", null, null, null });

        var listed = Sorted(v.Listed).ToList();
        var terms = listed.Select(x => (IReadOnlyList<object?>)new object?[]
        {
            x.Row.ClientCode, v.ClientById.GetValueOrDefault(x.Row.ClientId)?.Name, x.Row.ContractRef, x.Row.ContractTitle, x.Row.Owner, string.Join(", ", x.Products),
            x.Row.Condition, x.Row.Percentage, StateWords.GetValueOrDefault(x.State, x.State), x.Row.Status.ToString(), D(x.Row.DueDate), D(x.Row.PaidOn),
            x.Bucket == "overdue" ? v.Today.DayNumber - x.Row.DueDate!.Value.DayNumber : null, x.Row.Amount, x.Row.Currency, YearDate(x.Row)?.Year
        }).ToList();
        var byClient = ByClient(v).Select(c => (IReadOnlyList<object?>)new object?[]
        {
            c.Client.Code, c.Client.Name, c.Paid.Count, MoneyOf(c.Paid), c.Upcoming.Count, MoneyOf(c.Upcoming), c.Overdue.Count, MoneyOf(c.Overdue), c.Terms
        }).ToList();

        var bytes = Xlsx.Build([
            new XlsxSheet("Summary", null, summary),
            new XlsxSheet("Payment terms", ["Client", "Client name", "Contract", "Contract title", "Contract owner", "Products", "Payment", "Percentage", "State", "Recorded status", "Due date", "Paid on", "Days overdue", "Amount", "Currency", "Counts in year"], terms),
            new XlsxSheet("By client", ["Client", "Client name", "Paid terms", "Paid amount", "Upcoming terms", "Upcoming amount", "Overdue terms", "Overdue amount", "Terms"], byClient)
        ]);
        return (bytes, $"tio-hub-payments-dashboard-{v.Now.UtcDateTime:yyyyMMdd-HHmm}.xlsx", listed.Count);
    }
}
