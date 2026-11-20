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
    // A124: payment milestone template.
    public DateOnly? InvoiceDate { get; init; }
    public string? InvoiceNumber { get; init; }
    public string? WorkStatus { get; init; }
    public MilestoneWorkState? WorkState { get; init; }
    public string? ClientApproval { get; init; }
    public ClientApprovalState? ApprovalState { get; init; }
    public decimal? AmountReceived { get; init; }
    public decimal? Received => ContractPayment.Received(Status, Amount, AmountReceived);
    public decimal? Outstanding => ContractPayment.Outstanding(Status, Amount, AmountReceived);
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
                Condition = p.Condition, Percentage = p.Percentage, Amount = p.Amount, Currency = c.Currency, DueDate = p.DueDate, Status = p.Status, PaidOn = p.PaidOn,
                InvoiceDate = p.InvoiceDate, InvoiceNumber = p.InvoiceNumber, WorkStatus = p.WorkStatus, WorkState = p.WorkState, ClientApproval = p.ClientApproval,
                ApprovalState = p.ApprovalState, AmountReceived = p.AmountReceived
            }));
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(p => p.InvoiceNumber != null && p.InvoiceNumber.Contains(f.Q) || p.Condition.Contains(f.Q) || p.ContractRef.Contains(f.Q) || p.ContractTitle.Contains(f.Q) || p.ClientCode.Contains(f.Q));
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
            access.RequireAccess();
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
                    p.InvoiceDate, p.InvoiceNumber, p.WorkStatus, p.WorkState, p.ClientApproval, p.ApprovalState, p.AmountReceived, p.Received, p.Outstanding,
                    state =StateOf(p, today, days), daysToDue = p.DueDate is { } d ? d.DayNumber - today.DayNumber : (int?)null
                }),
                paged.Page, paged.PageSize, paged.TotalCount,
                summary = await SummaryAsync(db.Contracts.AsNoTracking(), f with { State = null }, now, db, days, ct)
            });
        }).WithTags("Contracts");

        // A110 (owner request, 10 Nov 2026): change one payment's status without editing the contract. Same right as editing the
        // contract's payment terms (Contracts:Maintain where the contract is). The contract's version changes too, so a contract
        // form opened before this change cannot save the old status back over it.
        api.MapPost("/contracts/{id:long}/payments/{paymentId:long}/status", async (long id, long paymentId, PaymentStatusInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Contracts.Include(x => x.Payments).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contract");
            access.RequireIn(RightKeys.Contracts, RightKeys.Maintain, ResourceContext.ForRecord(c.ClientId, null, [c.ProjectId]));
            var p = c.Payments.FirstOrDefault(x => x.Id == paymentId) ?? throw new NotFoundException("The payment");
            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            new Check()
                .When(input.Status is null, "status", "Select the payment status.")
                .When(input.Status == PaymentStatus.Paid && input.PaidOn is null, "paidOn", "Enter the date it was paid.")
                .When(input.PaidOn is { } d && d > today.AddDays(1), "paidOn", "The payment date cannot be in the future.")
                .Text("notes", input.Notes, 1000, "Notes")
                .ThrowIfAny();
            p.Status = input.Status!.Value;
            p.PaidOn = p.Status == PaymentStatus.Paid ? input.PaidOn : null;
            if (input.Notes is not null) p.Notes = Text.Clean(input.Notes);
            c.UpdatedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { p.Id, status = p.Status.ToString(), p.PaidOn, p.Notes });
        }).WithTags("Contracts");
    }

    public sealed record PaymentStatusInput(PaymentStatus? Status, DateOnly? PaidOn, string? Notes);
}

/// <summary>
/// A124 (owner request, 19 Nov 2026): every contract payment term follows the payment milestone template — milestone, planned invoice date,
/// invoice amount, %, actual invoice date, invoice number, work status, client approval, payment status, amount received, outstanding, notes.
/// The same checks serve the contract form and the one-row edit, so a milestone's values can change without editing the contract.
/// </summary>
public static class PaymentMilestones
{
    public sealed record Resolved(string? WorkStatus, MilestoneWorkState? WorkState, string? ClientApproval, ClientApprovalState? ApprovalState);

    public static async Task<Resolved> CheckAsync(Check check, string f, string row, ContractEndpoints.PaymentInput x, ContractPayment? existing, LookupService lookups, CancellationToken ct)
    {
        check.Text(f, x.Condition, 500, $"the milestone of {row.ToLowerInvariant()}", required: true).Text(f, x.Notes, 1000, $"{row} notes")
             .Text(f, x.InvoiceNumber, 50, $"{row} invoice number")
             .When(x.Percentage is < 0 or > 100, f, $"{row}: the percentage is between 0 and 100.")
             .When(x.Amount is < 0, f, $"{row}: the amount cannot be negative.")
             .When(x.AmountReceived is < 0, f, $"{row}: the amount received cannot be negative.")
             .When(x.Status == PaymentStatus.Paid && x.PaidOn is null, f, $"{row}: enter the date it was paid.");
        var (work, workState) = await OptionalTypeAsync<MilestoneWorkState>(check, f, LookupLists.PaymentWorkStatus, x.WorkStatus, $"{row}: select the work status", existing?.WorkStatus, lookups, ct);
        var (approval, approvalState) = await OptionalTypeAsync<ClientApprovalState>(check, f, LookupLists.PaymentClientApproval, x.ClientApproval, $"{row}: select the client approval", existing?.ClientApproval, lookups, ct);
        return new Resolved(work, workState, approval, approvalState);
    }

    private static async Task<(string?, T?)> OptionalTypeAsync<T>(Check check, string f, string list, string? code, string message, string? unchanged, LookupService lookups, CancellationToken ct) where T : struct, Enum
    {
        if (Text.Clean(code) is null) return (null, null);
        var probe = new Check();
        var (value, category) = await lookups.TypeAsync<T>(probe, f, list, code, "", unchanged, ct);
        if (probe.HasErrors) { check.Add(f, $"{message} from the list."); return (null, null); }
        return (value, category);
    }

    public static void Apply(ContractPayment row, ContractEndpoints.PaymentInput x, Resolved r)
    {
        row.Condition = x.Condition!.Trim(); row.Percentage = x.Percentage; row.Amount = x.Amount; row.DueDate = x.DueDate;
        row.Status = x.Status ?? PaymentStatus.Pending; row.PaidOn = row.Status == PaymentStatus.Paid ? x.PaidOn : null; row.Notes = Text.Clean(x.Notes);
        row.InvoiceDate = x.InvoiceDate; row.InvoiceNumber = Text.Clean(x.InvoiceNumber);
        row.WorkStatus = r.WorkStatus; row.WorkState = r.WorkState; row.ClientApproval = r.ClientApproval; row.ApprovalState = r.ApprovalState;
        row.AmountReceived = x.AmountReceived;
    }

    public static void MapPaymentMilestoneEndpoints(this RouteGroupBuilder api)
    {
        // Edit one payment milestone without opening the contract form. Same right as the contract's payment terms (Contracts:Maintain
        // where the contract is), like the A110 status change. The contract's version changes too, so an older contract form cannot save over it.
        api.MapPut("/contracts/{id:long}/payments/{paymentId:long}", async (long id, long paymentId, ContractEndpoints.PaymentInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Contracts.Include(x => x.Payments).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contract");
            access.RequireIn(RightKeys.Contracts, RightKeys.Maintain, ResourceContext.ForRecord(c.ClientId, null, [c.ProjectId]));
            var p = c.Payments.FirstOrDefault(x => x.Id == paymentId) ?? throw new NotFoundException("The payment");
            var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
            var check = new Check();
            var r = await CheckAsync(check, "payment", "This milestone", input, p, new LookupService(db), ct);
            check.When(input.PaidOn is { } paid && paid > today.AddDays(1), "paidOn", "The payment date cannot be in the future.")
                 .When(input.InvoiceDate is { } inv && inv > today.AddDays(1), "invoiceDate", "The actual invoice date cannot be in the future.")
                 .When(c.Payments.Where(x => x.Id != p.Id).Sum(x => x.Percentage ?? 0) + (input.Percentage ?? 0) > 100, "percentage", "The payment percentages of this contract would add up to more than 100 %.")
                 .When(c.Currency is null && (input.Amount is not null || input.AmountReceived is not null), "amount", "Set the contract currency before recording amounts.");
            check.ThrowIfAny();
            Apply(p, input, r);
            c.UpdatedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.Ok(new
            {
                p.Id, p.Condition, p.Percentage, p.Amount, p.DueDate, status = p.Status.ToString(), p.PaidOn, p.Notes, p.InvoiceDate, p.InvoiceNumber, p.WorkStatus, p.ClientApproval, p.AmountReceived,
                outstanding = ContractPayment.Outstanding(p.Status, p.Amount, p.AmountReceived)
            });
        }).WithTags("Contracts");
    }
}
