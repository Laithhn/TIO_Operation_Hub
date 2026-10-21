using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Notifications;

/// <summary>
/// A38 (owner request, 20 Oct 2026): a notifications center for every user. Notifications are created when something is assigned to a
/// person (case, commitment, environment, server, client, contract, project, project team, handover) and by an hourly check for overdue or
/// soon-due work and contract renewals. Each person sees only their own; the key prevents the same notice twice.
/// </summary>
public class Notification
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string Kind { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Body { get; set; }
    public string? Link { get; set; }
    public string Key { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
}

public static class NotificationKinds
{
    public const string Assigned = "Assigned", Overdue = "Overdue", DueSoon = "DueSoon", Renewal = "Renewal", Team = "Team", Handover = "Handover", PaymentDue = "PaymentDue", PaymentOverdue = "PaymentOverdue";
}

/// <summary>Finds new assignments in a save, so the notices can be written once the records have their ids.</summary>
public static class AssignmentNotices
{
    public sealed record Intent(object Entity, long UserId, string Field);

    private static readonly (Type Type, string[] Fields)[] Watched =
    [
        (typeof(Case), ["OwnerUserId", "BackupOwnerUserId"]), (typeof(Commitment), ["OwnerUserId"]), (typeof(Escalations.Escalation), ["OwnerUserId"]),
        (typeof(ClientEnvironment), ["OwnerUserId", "BackupOwnerUserId", "CoordinatorUserId"]), (typeof(Asset), ["OwnerUserId"]),
        (typeof(Client), ["OwnerUserId"]), (typeof(Contract), ["OwnerUserId"]), (typeof(Project), ["OwnerUserId"]),
        (typeof(ClientTeamMember), ["UserId"]), (typeof(Handover), ["ReceivingOwnerId"])
    ];

    public static List<Intent> Collect(ChangeTracker tracker, long? actorId)
    {
        var list = new List<Intent>();
        foreach (var e in tracker.Entries().Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            var w = Watched.FirstOrDefault(x => x.Type == e.Entity.GetType());
            if (w.Type is null) continue;
            foreach (var f in w.Fields)
            {
                var p = e.Property(f);
                if (p.CurrentValue is not long uid || uid == actorId) continue;
                if (e.State == EntityState.Modified && (!p.IsModified || Equals(p.OriginalValue, p.CurrentValue))) continue;
                list.Add(new Intent(e.Entity, uid, f));
            }
        }
        return list;
    }

    public static Notification? Build(Intent i, DateTimeOffset now)
    {
        string role(string f) => f switch { "BackupOwnerUserId" => "backup owner", "CoordinatorUserId" => "operation engineer", _ => "owner" };
        (string Title, string Link, string Key)? x = i.Entity switch
        {
            Case c => ($"Case {c.Ref}: you are now the {role(i.Field)}", $"/cases/{c.Id}", $"case:{c.Id}:{i.Field}:{i.UserId}"),
            Commitment c => ($"Commitment {c.Ref}: you are now the owner", $"/commitments/{c.Id}", $"commitment:{c.Id}:owner:{i.UserId}"),
            Escalations.Escalation esc => ($"Escalation {esc.Ref}: you are now the owner", $"/escalations/{esc.Id}", $"escalation:{esc.Id}:owner:{i.UserId}"),
            ClientEnvironment e => ($"Environment {e.Name}: you are now the {role(i.Field)}", $"/environments/{e.Id}", $"env:{e.Id}:{i.Field}:{i.UserId}"),
            Asset a => ($"Server {a.Name}: you are now the technical owner", $"/assets/{a.Id}", $"asset:{a.Id}:owner:{i.UserId}"),
            Client c => ($"Client {c.Code}: you are now the project manager", $"/clients/{c.Id}", $"client:{c.Id}:pm:{i.UserId}"),
            Contract c => ($"Contract {c.Ref}: you are now the contract owner", $"/contracts/{c.Id}", $"contract:{c.Id}:owner:{i.UserId}"),
            Project p => ($"Project {p.Code}: you are now the project owner", $"/projects/{p.Id}", $"project:{p.Id}:owner:{i.UserId}"),
            ClientTeamMember t => ($"You were added to a client's project team as {t.Role}", $"/clients/{t.ClientId}", $"team:{t.ClientId}:{i.UserId}"),
            Handover h => ($"Handover {h.Ref} is waiting for you to acknowledge", "/handovers", $"handover:{h.Id}:{i.UserId}"),
            _ => null
        };
        if (x is null) return null;
        var kind = i.Entity switch { ClientTeamMember => NotificationKinds.Team, Handover => NotificationKinds.Handover, _ => NotificationKinds.Assigned };
        return new Notification { UserId = i.UserId, Kind = kind, Title = x.Value.Title, Link = x.Value.Link, Key = $"{x.Value.Key}:{now:yyyyMMddHHmm}", CreatedAt = now };
    }
}

/// <summary>The hourly check: overdue and soon-due cases and commitments for their owners; contract renewals for contract owners and managers.</summary>
public sealed class NotificationScanner(IServiceScopeFactory scopes, IConfiguration config, ILogger<NotificationScanner> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var minutes = config.GetValue("Notifications:ScanMinutes", 60);
        if (minutes <= 0) return;
        await Task.Delay(TimeSpan.FromSeconds(20), stop);
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                await ScanAsync(scope.ServiceProvider.GetRequiredService<HubDbContext>(), scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow(), stop);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "Notification scan failed"); }
            await Task.Delay(TimeSpan.FromMinutes(minutes), stop);
        }
    }

    public static async Task<int> ScanAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var soon = now.AddDays(2);
        var found = new List<Notification>();
        void Add(long userId, string kind, string title, string? body, string link, string key) =>
            found.Add(new Notification { UserId = userId, Kind = kind, Title = title, Body = body, Link = link, Key = key, CreatedAt = now });

        var cases = await db.Cases.IgnoreQueryFilters().AsNoTracking()
            .Where(c => c.OwnerUserId != null && c.DueAt != null && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.DueAt < soon)
            .Select(c => new { c.Id, c.Ref, c.Title, c.OwnerUserId, c.DueAt }).ToListAsync(ct);
        foreach (var c in cases)
        {
            var overdue = c.DueAt < now;
            Add(c.OwnerUserId!.Value, overdue ? NotificationKinds.Overdue : NotificationKinds.DueSoon, $"Case {c.Ref} is {(overdue ? "overdue" : "due soon")}", c.Title, $"/cases/{c.Id}",
                $"case-{(overdue ? "overdue" : "due")}:{c.Id}:{c.DueAt:yyyyMMddHHmm}");
        }
        var commitments = await db.Commitments.IgnoreQueryFilters().AsNoTracking()
            .Where(c => c.OwnerUserId != null && c.Status == CommitmentStatus.Open && c.CurrentDueAt < soon)
            .Select(c => new { c.Id, c.Ref, c.Description, c.OwnerUserId, c.CurrentDueAt }).ToListAsync(ct);
        foreach (var c in commitments)
        {
            var overdue = c.CurrentDueAt < now;
            Add(c.OwnerUserId!.Value, overdue ? NotificationKinds.Overdue : NotificationKinds.DueSoon, $"Commitment {c.Ref} is {(overdue ? "overdue" : "due soon")}", c.Description,
                $"/commitments/{c.Id}", $"commitment-{(overdue ? "overdue" : "due")}:{c.Id}:{c.CurrentDueAt:yyyyMMddHHmm}");
        }
        // A41: active escalations past (or within 2 days of) their resolution target, for their owners.
        var escalations = await db.Escalations.IgnoreQueryFilters().AsNoTracking()
            .Where(e => (e.Status == Escalations.EscalationStatus.Open || e.Status == Escalations.EscalationStatus.Acknowledged || e.Status == Escalations.EscalationStatus.InProgress)
                && e.ResolutionDueAt != null && e.ResolutionDueAt < soon)
            .Select(e => new { e.Id, e.Ref, e.Title, e.OwnerUserId, e.ResolutionDueAt }).ToListAsync(ct);
        foreach (var e in escalations)
        {
            var overdue = e.ResolutionDueAt < now;
            Add(e.OwnerUserId, overdue ? NotificationKinds.Overdue : NotificationKinds.DueSoon, $"Escalation {e.Ref} is {(overdue ? "overdue" : "due soon")}", e.Title,
                $"/escalations/{e.Id}", $"escalation-{(overdue ? "overdue" : "due")}:{e.Id}:{e.ResolutionDueAt:yyyyMMddHHmm}");
        }
        var managers = await db.Users.AsNoTracking().Where(u => u.IsActive && u.Roles.Any(r => r.AppRole!.Key == BuiltInRoles.ManagerKey || (r.AppRole.Rights & Right.Manage) == Right.Manage))
            .Select(u => u.Id).ToListAsync(ct);
        var contracts = await ContractQuery.Apply(db.Contracts.IgnoreQueryFilters().AsNoTracking().Where(c => c.ArchivedAt == null), new ContractFilter(Renewal: "attention"), now, db)
            .Select(c => new { c.Id, c.Ref, c.Title, c.OwnerUserId, c.Status, c.EndDate, c.NoticeDays }).ToListAsync(ct);
        foreach (var c in contracts)
        {
            var state = ContractQuery.State(new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays }, now);
            var title = state switch { "Expired" => $"Contract {c.Ref} has ended but is still Active", "EndDateUnknown" => $"Contract {c.Ref} has no end date", _ => $"Contract {c.Ref}: renewal due" };
            foreach (var u in managers.Append(c.OwnerUserId ?? 0).Where(u => u != 0).Distinct())
                Add(u, NotificationKinds.Renewal, title, c.Title, $"/contracts/{c.Id}", $"contract-{state}:{c.Id}:{c.EndDate:yyyyMMdd}");
        }

        // A49: contract payments that are open and due within the reminder window (setting), or overdue — for the contract owner and the managers.
        var reminderDays = await PaymentQuery.ReminderDaysAsync(db, ct);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var horizon = today.AddDays(reminderDays);
        var payments = await db.Contracts.IgnoreQueryFilters().AsNoTracking().Where(c => c.ArchivedAt == null && c.Status != ContractStatus.Terminated)
            .SelectMany(c => c.Payments.Where(p => p.DueDate != null && p.DueDate <= horizon && (p.Status == PaymentStatus.Pending || p.Status == PaymentStatus.Invoiced))
                .Select(p => new { p.Id, p.Condition, p.DueDate, p.Amount, c.Currency, contractId = c.Id, c.Ref, c.OwnerUserId }))
            .ToListAsync(ct);
        foreach (var p in payments)
        {
            var overdue = p.DueDate < today;
            var amount = p.Amount is { } a ? $" ({a:N2} {p.Currency})" : "";
            var title = overdue ? $"Payment overdue on contract {p.Ref}{amount}" : $"Payment due {p.DueDate:dd MMM yyyy} on contract {p.Ref}{amount}";
            foreach (var u in managers.Append(p.OwnerUserId ?? 0).Where(u => u != 0).Distinct())
                Add(u, overdue ? NotificationKinds.PaymentOverdue : NotificationKinds.PaymentDue, title, p.Condition, $"/contracts/{p.contractId}",
                    $"payment-{(overdue ? "overdue" : "due")}:{p.Id}:{p.DueDate:yyyyMMdd}");
        }

        if (found.Count == 0) return 0;
        var keys = found.Select(f => f.Key).Distinct().ToList();
        var existing = (await db.Notifications.Where(n => keys.Contains(n.Key)).Select(n => new { n.UserId, n.Key }).ToListAsync(ct)).Select(x => (x.UserId, x.Key)).ToHashSet();
        var fresh = found.Where(f => existing.Add((f.UserId, f.Key))).ToList();
        db.Notifications.AddRange(fresh);
        // Read notices older than 90 days are cleared.
        await db.Notifications.Where(n => n.ReadAt != null && n.ReadAt < now.AddDays(-90)).ExecuteDeleteAsync(ct);
        await db.SaveChangesAsync(ct);
        return fresh.Count;
    }
}

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/notifications").WithTags("Notifications");
        g.MapGet("", async (bool? unread, string? category, int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = me.UserId ?? throw new ForbiddenException("Sign in to see notifications.");
            var q = db.Notifications.AsNoTracking().Where(n => n.UserId == uid);
            if (unread == true) q = q.Where(n => n.ReadAt == null);
            // A50: the Payments tab — payment reminders by their key, so notices written before the PaymentOverdue kind are included.
            if (category == "payments") q = q.Where(n => n.Key.StartsWith("payment-"));
            else if (category is not null) throw new ValidationException("category", "Unknown notification category.");
            var paged = await q.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
                .Select(n => new { n.Id, n.Kind, n.Title, n.Body, n.Link, n.CreatedAt, n.ReadAt }).ToPagedAsync(PageQuery.From(page, pageSize ?? 20), ct);
            var unreadCount = await db.Notifications.CountAsync(n => n.UserId == uid && n.ReadAt == null, ct);
            var unreadPayments = await db.Notifications.CountAsync(n => n.UserId == uid && n.ReadAt == null && n.Key.StartsWith("payment-"), ct);
            return Results.Ok(new { paged.Items, paged.Page, paged.PageSize, paged.TotalCount, unreadCount, unreadPayments });
        });
        g.MapGet("/unread-count", async (HubDbContext db, UserContext me, CancellationToken ct) =>
            Results.Ok(new { count = me.UserId is { } uid ? await db.Notifications.CountAsync(n => n.UserId == uid && n.ReadAt == null, ct) : 0 }));
        g.MapPost("/{id:long}/read", async (long id, HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            await db.Notifications.Where(n => n.Id == id && n.UserId == me.UserId && n.ReadAt == null).ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, clock.GetUtcNow()), ct);
            return Results.NoContent();
        });
        g.MapPost("/read-all", async (HubDbContext db, UserContext me, TimeProvider clock, CancellationToken ct) =>
        {
            await db.Notifications.Where(n => n.UserId == me.UserId && n.ReadAt == null).ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, clock.GetUtcNow()), ct);
            return Results.NoContent();
        });
        g.MapDelete("/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            await db.Notifications.Where(n => n.Id == id && n.UserId == me.UserId).ExecuteDeleteAsync(ct);
            return Results.NoContent();
        });
    }
}
