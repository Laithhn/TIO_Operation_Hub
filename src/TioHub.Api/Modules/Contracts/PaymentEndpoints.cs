using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Contracts;

/// <summary>One contract payment with its contract, for the payment list, the dashboard and the action list (A50).</summary>
public sealed class PaymentRow
{
    public long Id { get; init; }
    public long ContractId { get; init; }
    public string ContractRef { get; init; } = "";
    public string ContractTitle { get; init; } = "";
    public ContractStatus ContractStatus { get; init; }
    public long ClientId { get; init; }
    public string ClientCode { get; init; } = "";
    public long? OwnerUserId { get; init; }
    public string? Owner { get; init; }
    public string Condition { get; init; } = "";
    public decimal? Percentage { get; init; }
    public decimal? Amount { get; init; }
    public string? Currency { get; init; }
    public DateOnly? DueDate { get; init; }
    public PaymentStatus Status { get; init; }
    public DateOnly? PaidOn { get; init; }
}

public sealed record PaymentFilter(long? ClientId = null, long? OwnerId = null, long? ProductId = null, string? Country = null, string? Q = null, string? State = null);

/// <summary>
/// Payment states (A50). Open = Pending or Invoiced on a contract that is not Terminated. Overdue = open and the due date has passed;
/// Due = open and due within the reminder window (setting Contracts.PaymentReminderDays); Upcoming = open and due later or with no date; Paid; Waived.
/// The same rule drives the notifications, the dashboard and the action list.
/// </summary>
public static class PaymentQuery
{
    public static readonly string[] States = ["overdue", "due", "attention", "upcoming", "open", "paid", "waived", "all"];

    public static async Task<int> ReminderDaysAsync(HubDbContext db, CancellationToken ct) =>
        int.TryParse(await db.Settings.AsNoTracking().Where(s => s.Key == SettingKeys.PaymentReminderDays).Select(s => s.Value).FirstOrDefaultAsync(ct), out var d) && d is > 0 and <= 90 ? d : 14;

    public static IQueryable<PaymentRow> Rows(IQueryable<Contract> contracts, PaymentFilter f, DateTimeOffset now, HubDbContext db, int reminderDays)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var horizon = today.AddDays(reminderDays);
        var q = ContractQuery.Apply(contracts, new ContractFilter(ClientId: f.ClientId, OwnerId: f.OwnerId, ProductId: f.ProductId, Country: f.Country), now, db)
            .SelectMany(c => c.Payments.Select(p => new PaymentRow
            {
                Id = p.Id, ContractId = c.Id, ContractRef = c.Ref, ContractTitle = c.Title, ContractStatus = c.Status, ClientId = c.ClientId, ClientCode = c.Client!.Code,
                OwnerUserId = c.OwnerUserId, Owner = c.Owner == null ? null : c.Owner.DisplayName,
                Condition = p.Condition, Percentage = p.Percentage, Amount = p.Amount, Currency = c.Currency, DueDate = p.DueDate, Status = p.Status, PaidOn = p.PaidOn
            }));
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(p => p.Condition.Contains(f.Q) || p.ContractRef.Contains(f.Q) || p.ContractTitle.Contains(f.Q) || p.ClientCode.Contains(f.Q));
        var open = q.Where(p => (p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.Invoiced) && p.ContractStatus != ContractStatus.Terminated);
        return (f.State ?? "attention") switch
        {
            "overdue" => open.Where(p => p.DueDate != null && p.DueDate < today),
            "due" => open.Where(p => p.DueDate != null && p.DueDate >= today && p.DueDate <= horizon),
            "attention" => open.Where(p => p.DueDate != null && p.DueDate <= horizon),
            "upcoming" => open.Where(p => p.DueDate == null || p.DueDate > horizon),
            "open" => open,
            "paid" => q.Where(p => p.Status == PaymentStatus.Paid),
            "waived" => q.Where(p => p.Status == PaymentStatus.Waived),
            _ => q
        };
    }

    public static string StateOf(PaymentRow p, DateOnly today, int reminderDays) =>
        p.Status == PaymentStatus.Paid ? "paid" : p.Status == PaymentStatus.Waived ? "waived" : p.ContractStatus == ContractStatus.Terminated ? "closed"
        : p.DueDate is not { } d ? "upcoming" : d < today ? "overdue" : d <= today.AddDays(reminderDays) ? "due" : "upcoming";

    /// <summary>Count and amounts per currency for overdue, due within the window and later open payments.</summary>
    public static async Task<object> SummaryAsync(IQueryable<Contract> contracts, PaymentFilter f, DateTimeOffset now, HubDbContext db, int reminderDays, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var open = await Rows(contracts, f with { State = "open" }, now, db, reminderDays).Select(p => new { p.Amount, p.Currency, p.DueDate }).ToListAsync(ct);
        object Part(IEnumerable<(decimal? Amount, string? Currency)> rows)
        {
            var list = rows.ToList();
            return new
            {
                count = list.Count,
                amounts = list.Where(r => r.Amount != null).GroupBy(r => r.Currency ?? "").OrderByDescending(g => g.Sum(r => r.Amount!.Value))
                    .Select(g => new { currency = g.Key, amount = g.Sum(r => r.Amount!.Value) }).ToList()
            };
        }
        var horizon = today.AddDays(reminderDays);
        return new
        {
            reminderDays,
            overdue = Part(open.Where(p => p.DueDate < today).Select(p => (p.Amount, p.Currency))),
            due = Part(open.Where(p => p.DueDate >= today && p.DueDate <= horizon).Select(p => (p.Amount, p.Currency))),
            upcoming = Part(open.Where(p => p.DueDate == null || p.DueDate > horizon).Select(p => (p.Amount, p.Currency)))
        };
    }

    public static void MapPaymentEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/payments", async (long? clientId, long? ownerId, long? productId, string? country, string? q, string? state, bool? mine, DateTimeOffset? asOf,
            string? sort, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (state is not null && !States.Contains(state)) throw new ValidationException("state", "Unknown payment state.");
            var now = asOf ?? DateTimeOffset.UtcNow;
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var days = await ReminderDaysAsync(db, ct);
            var f = new PaymentFilter(clientId, mine == true ? access.Me.UserId : ownerId, productId, country, q, state);
            var keys = new Dictionary<string, Expression<Func<PaymentRow, object?>>>
            {
                ["due"] = p => p.DueDate, ["amount"] = p => p.Amount, ["contract"] = p => p.ContractRef, ["client"] = p => p.ClientCode, ["status"] = p => p.Status, ["condition"] = p => p.Condition
            };
            var paged = await Rows(db.Contracts.AsNoTracking(), f, now, db, days).SortBy(sort, keys, "due").ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(new
            {
                items = paged.Items.Select(p => new
                {
                    p.Id, p.ContractId, p.ContractRef, p.ContractTitle, p.ClientId, p.ClientCode, p.Owner, p.Condition, p.Percentage, p.Amount, p.Currency, p.DueDate, p.Status, p.PaidOn,
                    state = StateOf(p, today, days), daysToDue = p.DueDate is { } d ? d.DayNumber - today.DayNumber : (int?)null
                }),
                paged.Page, paged.PageSize, paged.TotalCount,
                summary = await SummaryAsync(db.Contracts.AsNoTracking(), f with { State = null }, now, db, days, ct)
            });
        }).WithTags("Contracts");
    }
}
