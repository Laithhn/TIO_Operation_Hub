using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Contracts;

public sealed record ContractFilter(long? ClientId = null, ContractStatus? Status = null, string? Type = null, string? Renewal = null, long? OwnerId = null,
    long? ProductId = null, string? Country = null, string? Q = null, long? ProjectId = null);

/// <summary>
/// Renewal visibility (AC-20 "contract dates create appropriate visibility"). Only Active contracts are evaluated:
/// Expired = end date passed while still Active; RenewalDue = notice deadline (or end date when no notice period is recorded)
/// within the renewal window; EndDateUnknown = no end date recorded. One shared query for list, dashboard and action list.
/// </summary>
public static class ContractQuery
{
    public const int RenewalWindowDays = 90;

    public static IQueryable<Contract> Apply(IQueryable<Contract> q, ContractFilter f, DateTimeOffset now, HubDbContext db)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var horizon = today.AddDays(RenewalWindowDays);
        if (f.ClientId is not null) q = q.Where(c => c.ClientId == f.ClientId);
        if (f.ProjectId is not null) q = q.Where(c => c.ProjectId == f.ProjectId);
        if (!string.IsNullOrWhiteSpace(f.Country)) q = f.Country == "Unknown" ? q.Where(c => c.Client!.CountryUnknown) : q.Where(c => c.Client!.Country == f.Country);
        if (f.Status is not null) q = q.Where(c => c.Status == f.Status);
        if (f.Type is not null) q = q.Where(c => c.Type == f.Type);
        if (f.OwnerId is not null) q = q.Where(c => c.OwnerUserId == f.OwnerId);
        if (f.ProductId is not null) q = q.Where(c => db.ProjectProducts.Any(p => p.ProjectId == c.ProjectId && p.ProductId == f.ProductId));
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(c => c.Title.Contains(f.Q) || c.Ref.Contains(f.Q) || (c.ContractReference != null && c.ContractReference.Contains(f.Q))
            || c.Project!.Code.Contains(f.Q) || c.Project.Name.Contains(f.Q));
        q = f.Renewal switch
        {
            "expired" => q.Where(c => c.Status == ContractStatus.Active && c.EndDate != null && c.EndDate < today),
            "due" => q.Where(c => c.Status == ContractStatus.Active && c.EndDate != null && c.EndDate >= today && c.EndDate.Value.AddDays(-(c.NoticeDays ?? 0)) <= horizon),
            "unknownEnd" => q.Where(c => c.Status == ContractStatus.Active && c.EndDate == null),
            "attention" => q.Where(c => c.Status == ContractStatus.Active && (c.EndDate == null || c.EndDate.Value.AddDays(-(c.NoticeDays ?? 0)) <= horizon)),
            "current" => q.Where(c => c.Status == ContractStatus.Active && c.EndDate != null && c.EndDate.Value.AddDays(-(c.NoticeDays ?? 0)) > horizon),
            _ => q
        };
        return q;
    }

    public static string State(Contract c, DateTimeOffset now)
    {
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        if (c.Status != ContractStatus.Active) return c.Status.ToString();
        if (c.EndDate is null) return "EndDateUnknown";
        if (c.EndDate < today) return "Expired";
        return (c.NoticeDeadline ?? c.EndDate) <= today.AddDays(RenewalWindowDays) ? "RenewalDue" : "Current";
    }

    public static string Reason(string state, DateOnly? end, DateOnly? notice, DateTimeOffset? now = null) => state switch
    {
        "Expired" => $"Ended {end:yyyy-MM-dd} but still marked Active",
        "RenewalDue" when notice is not null && notice < DateOnly.FromDateTime((now ?? DateTimeOffset.UtcNow).UtcDateTime) => $"Notice deadline {notice:yyyy-MM-dd} has passed (ends {end:yyyy-MM-dd})",
        "RenewalDue" => notice is not null ? $"Notice deadline {notice:yyyy-MM-dd} (ends {end:yyyy-MM-dd})" : $"Ends {end:yyyy-MM-dd}",
        "EndDateUnknown" => "Active contract without a recorded end date",
        _ => state
    };
}

public static class ContractEndpoints
{
    public sealed record SlaTargetInput(Priority? Priority, int? ResponseMinutes, int? ResolutionMinutes, SlaBasis? Basis, string? Notes);
    /// <summary>The client comes from the project (ClientId, when sent, must match it); covered products are the project's products.</summary>
    public sealed record MilestoneInput(long? Id, string? Phase, string? Description, int? CompletionPercent, DateOnly? Date);
    public sealed record FeeInput(long? Id, string? Description, string? Unit, decimal? Quantity, decimal? UnitPrice);
    public sealed record PaymentInput(long? Id, string? Condition, decimal? Percentage, decimal? Amount, DateOnly? DueDate, PaymentStatus? Status, DateOnly? PaidOn, string? Notes);
    public sealed record ContractInput(long? ClientId, long? ProjectId, string? Title, string? ContractReference, string? Type, ContractStatus? Status, long? OwnerUserId,
        DateOnly? StartDate, DateOnly? EndDate, RenewalTerms? RenewalTerms, int? NoticeDays, SupportModel? SupportModel, string? SupportHours, string? SupportTimeZone,
        int? OnSiteEngineersRequired, string? Coverage, string? Obligations, List<long>? EnvironmentIds, List<SlaTargetInput>? SlaTargets,
        bool? Support24x7 = null, List<string>? SupportDays = null, TimeOnly? SupportFrom = null, TimeOnly? SupportTo = null, string? Currency = null,
        List<MilestoneInput>? Milestones = null, List<FeeInput>? Fees = null, List<PaymentInput>? Payments = null, bool? SlaPauseWhileWaitingOnCustomer = null);

    public static void MapContractEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/contracts").WithTags("Contracts");

        g.MapGet("", async (long? clientId, ContractStatus? status, string? type, string? renewal, long? ownerId, long? productId, string? country, string? q, long? projectId, DateTimeOffset? asOf,
            string? sort, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var now = asOf ?? DateTimeOffset.UtcNow;
            var query = ContractQuery.Apply(db.Contracts.AsNoTracking(), new ContractFilter(clientId, status, type, renewal, ownerId, productId, country, q, projectId), now, db);
            var keys = new Dictionary<string, Expression<Func<Contract, object?>>>
            {
                ["end"] = c => c.EndDate, ["ref"] = c => c.Id, ["client"] = c => c.Client!.Code, ["title"] = c => c.Title, ["status"] = c => c.Status, ["owner"] = c => c.Owner!.DisplayName,
                ["project"] = c => c.Project!.Code
            };
            var paged = await query.SortBy(sort, keys, "end").Select(c => new
            {
                c.Id, c.Ref, c.Title, c.ContractReference, c.Type, c.Status, c.ClientId, clientCode = c.Client!.Code, clientName = c.Client.Name,
                c.ProjectId, projectCode = c.Project!.Code, projectName = c.Project.Name,
                c.StartDate, c.EndDate, c.NoticeDays, c.RenewalTerms, c.SupportModel, c.OnSiteEngineersRequired,
                owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
                slaTargets = c.SlaTargets.Count
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(new
            {
                items = paged.Items.Select(c =>
                {
                    var notice = c.EndDate is { } e && c.NoticeDays is { } n ? e.AddDays(-n) : (DateOnly?)null;
                    var state = ContractQuery.State(new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays }, now);
                    return new { c.Id, c.Ref, c.Title, c.ContractReference, c.Type, c.Status, c.ClientId, c.clientCode, c.clientName, c.ProjectId, c.projectCode, c.projectName, c.StartDate, c.EndDate, noticeDeadline = notice,
                        c.RenewalTerms, c.SupportModel, c.OnSiteEngineersRequired, c.owner, c.slaTargets, renewalState = state };
                }),
                paged.Page, paged.PageSize, paged.TotalCount
            });
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = await db.Contracts.AsNoTracking().Include(x => x.Client).Include(x => x.Owner).Include(x => x.Environments).Include(x => x.SlaTargets)
                .Include(x => x.Milestones).Include(x => x.Fees).Include(x => x.Payments).AsSplitQuery()
                .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contract");
            var now = DateTimeOffset.UtcNow;
            var envIds = c.Environments.Select(e => e.EnvironmentId).ToList();
            // An archived project still names its contracts.
            var project = await db.Projects.IgnoreQueryFilters(["Archive"]).AsNoTracking().Where(x => x.Id == c.ProjectId)
                .Select(x => new { x.Id, x.Code, x.Name, x.Status }).FirstOrDefaultAsync(ct);
            var productIds = await db.ProjectProducts.AsNoTracking().Where(pp => pp.ProjectId == c.ProjectId).Select(pp => pp.ProductId).ToListAsync(ct);
            var maintain = access.Me.SeesClient(c.ClientId) && access.Me.Can(Role.Engineer);
            var state = ContractQuery.State(c, now);
            return ctx.WithETag(c, new
            {
                c.Id, c.Ref, c.Title, c.ContractReference, c.Type, c.Status, c.ClientId,
                client = new { c.Client!.Id, c.Client.Code, c.Client.Name, c.Client.Country },
                project,
                owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
                c.StartDate, c.EndDate, c.RenewalTerms, c.NoticeDays, noticeDeadline = c.NoticeDeadline,
                renewalState = state, renewalNote = state is "Expired" or "RenewalDue" or "EndDateUnknown" ? ContractQuery.Reason(state, c.EndDate, c.NoticeDeadline, now) : null,
                c.SupportModel, c.SupportHours, c.SupportTimeZone, c.OnSiteEngineersRequired, c.Coverage, c.Obligations,
                c.Support24x7, c.SlaPauseWhileWaitingOnCustomer, supportDays = DaysOf(c.SupportDays), supportFrom = c.SupportFrom?.ToString("HH:mm"), supportTo = c.SupportTo?.ToString("HH:mm"), supportSummary = SupportSummary(c),
                c.Currency,
                milestones = c.Milestones.OrderBy(m => m.SortOrder).Select(m => new { m.Id, m.Phase, m.Description, m.CompletionPercent, m.Date }),
                fees = c.Fees.OrderBy(f => f.SortOrder).Select(f => new { f.Id, f.Description, f.Unit, f.Quantity, f.UnitPrice, total = f.UnitPrice * (f.Quantity ?? 1) }),
                feesTotal = c.Fees.Any(f => f.UnitPrice != null) ? c.Fees.Sum(f => (f.UnitPrice ?? 0) * (f.Quantity ?? 1)) : (decimal?)null,
                payments = c.Payments.OrderBy(x => x.SortOrder).Select(x => new
                {
                    x.Id, x.Condition, x.Percentage, x.Amount, x.DueDate, x.Status, x.PaidOn, x.Notes,
                    overdue = x.DueDate != null && x.DueDate < DateOnly.FromDateTime(now.UtcDateTime) && (x.Status == PaymentStatus.Pending || x.Status == PaymentStatus.Invoiced)
                }),
                products = await db.Products.AsNoTracking().Where(p => productIds.Contains(p.Id)).OrderBy(p => p.Code).Select(p => new { p.Id, p.Code, p.Name }).ToListAsync(ct),
                environments = await db.Environments.AsNoTracking().Where(e => envIds.Contains(e.Id))
                    .Select(e => new { e.Id, e.Name, e.Type, region = e.Region == null ? null : e.Region.Code }).ToListAsync(ct),
                slaTargets = c.SlaTargets.OrderBy(t => t.Priority).Select(t => new { t.Id, t.Priority, t.ResponseMinutes, t.ResolutionMinutes, t.Basis, t.Notes }),
                slaNote = "Targets as the contract states them. Cases linked to this contract are measured against the target for their priority, copied when the contract is linked (A61); editing the targets affects cases linked afterwards.",
                c.LastReviewedAt, c.CreatedAt, c.UpdatedAt,
                permissions = new { canEdit = maintain, canArchive = access.Me.HasRight(Right.Archive) && access.Me.SeesClient(c.ClientId) }
            });
        });

        g.MapPost("", async (ContractInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            if (input.ProjectId is null) throw new ValidationException("projectId", "Select the project this contract belongs to.");
            var project = await db.Projects.FirstOrDefaultAsync(x => x.Id == input.ProjectId, ct) ?? throw new ValidationException("projectId", "Select an existing project.");
            if (input.ClientId is not null && input.ClientId != project.ClientId) throw new ValidationException("projectId", "Select a project of the contract's client.");
            access.RequireEngineerFor(project.ClientId);
            var c = new Contract { ClientId = project.ClientId, ProjectId = project.Id };
            await ApplyAsync(c, input, db, access, ct);
            c.LastReviewedAt = clock.GetUtcNow();
            db.Contracts.Add(c);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/contracts/{c.Id}", new { c.Id, c.Ref });
        });

        g.MapPut("/{id:long}", async (long id, ContractInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Contracts.Include(x => x.Environments).Include(x => x.SlaTargets).Include(x => x.Milestones).Include(x => x.Fees).Include(x => x.Payments).AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new NotFoundException("The contract");
            access.RequireMaintain(c.ClientId, null, c.OwnerUserId);
            db.ExpectVersion(ctx, c);
            await ApplyAsync(c, input, db, access, ct);
            // Saving the contract after checking it against the document counts as a review.
            c.LastReviewedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contract");
            access.RequireArchiveFor(c.ClientId);
            db.ExpectVersion(ctx, c);
            if (c.Status == ContractStatus.Active) throw new ValidationException("reason", "An Active contract cannot be archived. Record it as Ended or Terminated first.");
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(c, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    public sealed record ContractExport(string Ref, string Title, string? ContractReference, string ClientCode, string ProjectCode, string Type, ContractStatus Status, string? Owner,
        DateOnly? StartDate, DateOnly? EndDate, int? NoticeDays, RenewalTerms RenewalTerms, SupportModel SupportModel, string? SupportHours, string? SupportTimeZone, int? OnSiteEngineersRequired,
        string? RenewalState = null);

    public static readonly Expression<Func<Contract, ContractExport>> ExportRow = c => new ContractExport(c.Ref, c.Title, c.ContractReference, c.Client!.Code, c.Project!.Code, c.Type, c.Status,
        c.Owner == null ? null : c.Owner.DisplayName, c.StartDate, c.EndDate, c.NoticeDays, c.RenewalTerms, c.SupportModel, c.SupportHours, c.SupportTimeZone, c.OnSiteEngineersRequired, null);

    private static async Task ApplyAsync(Contract c, ContractInput i, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        var check = new Check()
            .Text("title", i.Title, 200, "the contract title", required: true)
            .Text("contractReference", i.ContractReference, 100, "Contract reference")
            .When(i.Status is null, "status", "Select the status.")
            .When(i.OwnerUserId is null, "ownerUserId", "Select the contract owner.")
            .When(i.StartDate is not null && i.EndDate is not null && i.EndDate < i.StartDate, "endDate", "The end date is before the start date.")
            .When(i.NoticeDays is < 0 or > 730, "noticeDays", "Enter a notice period between 0 and 730 days, or leave it empty if unknown.")
            .When(i.OnSiteEngineersRequired is < 0 or > 500, "onSiteEngineersRequired", "Enter a number between 0 and 500, or leave it empty if unknown.")
            .Text("supportHours", i.SupportHours, 200, "Support hours")
            .Text("coverage", i.Coverage, 2000, "Service coverage")
            .Text("obligations", i.Obligations, 4000, "Service obligations");
        // A34: configured contract type with its built-in category.
        var (typeCode, typeCategory) = await new LookupService(db).TypeAsync<ContractType>(check, "type", LookupLists.ContractType, i.Type, "the contract type", c.Id == 0 ? null : c.Type, ct);
        if (!string.IsNullOrWhiteSpace(i.SupportTimeZone) && Zones.Find(i.SupportTimeZone) is null) check.Add("supportTimeZone", "Select a valid time zone (for example Asia/Riyadh).");
        if (i.ClientId is not null && c.Id != 0 && i.ClientId != c.ClientId) check.Add("clientId", "A contract cannot move to another client.");
        // A contract always belongs to a project of its client; it may move between that client's projects.
        if (i.ProjectId is null) check.Add("projectId", "Select the project this contract belongs to.");
        else if (!await db.Projects.AnyAsync(p => p.Id == i.ProjectId && p.ClientId == c.ClientId, ct)) check.Add("projectId", "Select a project of the contract's client.");
        access.CheckOwnerChange(check, "ownerUserId", c.Id == 0 ? i.OwnerUserId : c.OwnerUserId, i.OwnerUserId);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, c.ClientId, null, "the owner", ct);
        var envIds = (i.EnvironmentIds ?? []).Distinct().ToList();
        if (envIds.Count > 0 && await db.Environments.CountAsync(e => envIds.Contains(e.Id) && e.ClientId == c.ClientId, ct) != envIds.Count) check.Add("environmentIds", "Select environments of the same client.");
        var targets = i.SlaTargets ?? [];
        for (var n = 0; n < targets.Count; n++)
        {
            var t = targets[n];
            var f = $"slaTargets[{n}]";
            check.When(t.Priority is null, f, $"Row {n + 1}: select the priority.")
                 .When(t.ResponseMinutes is <= 0 or > 525_600, f, $"Row {n + 1}: the response target must be between 1 minute and 365 days.")
                 .When(t.ResolutionMinutes is <= 0 or > 525_600, f, $"Row {n + 1}: the resolution target must be between 1 minute and 365 days.")
                 .When(t.ResponseMinutes is not null && t.ResolutionMinutes is not null && t.ResolutionMinutes < t.ResponseMinutes, f, $"Row {n + 1}: resolution cannot be shorter than response.")
                 .When(t.ResponseMinutes is null && t.ResolutionMinutes is null, f, $"Row {n + 1}: enter a response or resolution target, or remove the row.")
                 .Text(f, t.Notes, 500, $"Row {n + 1} notes");
        }
        if (targets.Where(t => t.Priority is not null).GroupBy(t => t.Priority).Any(g => g.Count() > 1)) check.Add("slaTargets", "Enter one target row per priority.");
        // A49: support days and hours, or round the clock.
        var days = SupportDays.None;
        foreach (var d in i.SupportDays ?? [])
            if (Enum.TryParse<SupportDays>(d, true, out var day) && day != SupportDays.None) days |= day; else check.Add("supportDays", $"{d} is not a day of the week.");
        if (i.Support24x7 != true && (i.SupportFrom is null) != (i.SupportTo is null)) check.Add("supportTo", "Enter both the start and the end of the support hours, or neither.");
        if (i.Support24x7 != true && i.SupportFrom is not null && i.SupportFrom == i.SupportTo) check.Add("supportTo", "The support hours cannot start and end at the same time; use 24 × 7 for round-the-clock support.");
        var milestones = i.Milestones ?? [];
        for (var n = 0; n < milestones.Count; n++)
        {
            var m = milestones[n]; var f = $"milestones[{n}]";
            check.Text(f, m.Phase, 150, $"the phase of row {n + 1}", required: true).Text(f, m.Description, 1000, $"Row {n + 1} description")
                 .When(m.CompletionPercent is < 0 or > 100, f, $"Delivery row {n + 1}: the completion is between 0 and 100 %.");
        }
        var fees = i.Fees ?? [];
        for (var n = 0; n < fees.Count; n++)
        {
            var x = fees[n]; var f = $"fees[{n}]";
            check.Text(f, x.Description, 500, $"the description of fee row {n + 1}", required: true).Text(f, x.Unit, 50, $"Fee row {n + 1} unit")
                 .When(x.UnitPrice is < 0, f, $"Fee row {n + 1}: the unit price cannot be negative.")
                 .When(x.Quantity is <= 0, f, $"Fee row {n + 1}: the quantity must be more than zero.");
        }
        var payments = i.Payments ?? [];
        for (var n = 0; n < payments.Count; n++)
        {
            var x = payments[n]; var f = $"payments[{n}]";
            check.Text(f, x.Condition, 500, $"the condition of payment row {n + 1}", required: true).Text(f, x.Notes, 1000, $"Payment row {n + 1} notes")
                 .When(x.Percentage is < 0 or > 100, f, $"Payment row {n + 1}: the percentage is between 0 and 100.")
                 .When(x.Amount is < 0, f, $"Payment row {n + 1}: the amount cannot be negative.")
                 .When(x.Status == PaymentStatus.Paid && x.PaidOn is null, f, $"Payment row {n + 1}: enter the date it was paid.");
        }
        if (payments.Sum(x => x.Percentage ?? 0) > 100) check.Add("payments", "The payment percentages add up to more than 100 %.");
        var currency = Text.Clean(i.Currency)?.ToUpperInvariant();
        if (currency is not null && !System.Text.RegularExpressions.Regex.IsMatch(currency, "^[A-Z]{3}$")) check.Add("currency", "Select the currency (a three-letter code such as AED or USD).");
        if (currency is null && (fees.Any(x => x.UnitPrice is not null) || payments.Any(x => x.Amount is not null))) check.Add("currency", "Select the currency of the amounts.");
        check.ThrowIfAny();

        c.Title = i.Title!.Trim();
        c.ContractReference = Text.Clean(i.ContractReference);
        c.Type = typeCode;
        c.TypeCategory = typeCategory;
        c.Status = i.Status!.Value;
        c.OwnerUserId = i.OwnerUserId;
        c.ProjectId = i.ProjectId!.Value;
        c.StartDate = i.StartDate;
        c.EndDate = i.EndDate;
        c.RenewalTerms = i.RenewalTerms ?? RenewalTerms.Unknown;
        c.NoticeDays = i.NoticeDays;
        c.SupportModel = i.SupportModel ?? SupportModel.Unknown;
        c.SupportHours = Text.Clean(i.SupportHours);
        c.SupportTimeZone = Text.Clean(i.SupportTimeZone);
        c.Support24x7 = i.Support24x7 == true;
        if (i.SlaPauseWhileWaitingOnCustomer is not null) c.SlaPauseWhileWaitingOnCustomer = i.SlaPauseWhileWaitingOnCustomer.Value;
        c.SupportDays = c.Support24x7 ? SupportDays.None : days;
        c.SupportFrom = c.Support24x7 ? null : i.SupportFrom;
        c.SupportTo = c.Support24x7 ? null : i.SupportTo;
        c.Currency = currency;
        // Rows keep their id when sent back; new rows are added; rows not sent are removed. The order is the order sent.
        Sync(c.Milestones, milestones, m => m.Id, x => x.Id, (row, x, n) => { row.SortOrder = n; row.Phase = x.Phase!.Trim(); row.Description = Text.Clean(x.Description); row.CompletionPercent = x.CompletionPercent; row.Date = x.Date; });
        Sync(c.Fees, fees, m => m.Id, x => x.Id, (row, x, n) => { row.SortOrder = n; row.Description = x.Description!.Trim(); row.Unit = Text.Clean(x.Unit); row.Quantity = x.Quantity; row.UnitPrice = x.UnitPrice; });
        Sync(c.Payments, payments, m => m.Id, x => x.Id, (row, x, n) =>
        {
            row.SortOrder = n; row.Condition = x.Condition!.Trim(); row.Percentage = x.Percentage; row.Amount = x.Amount; row.DueDate = x.DueDate;
            row.Status = x.Status ?? PaymentStatus.Pending; row.PaidOn = row.Status == PaymentStatus.Paid ? x.PaidOn : null; row.Notes = Text.Clean(x.Notes);
        });
        c.OnSiteEngineersRequired = i.OnSiteEngineersRequired;
        c.Coverage = Text.Clean(i.Coverage);
        c.Obligations = Text.Clean(i.Obligations);
        c.Environments.RemoveAll(e => !envIds.Contains(e.EnvironmentId));
        foreach (var eid in envIds.Where(eid => c.Environments.All(e => e.EnvironmentId != eid))) c.Environments.Add(new ContractEnvironment { EnvironmentId = eid, ClientId = c.ClientId });
        // SLA rows are keyed by priority: update in place, add new ones, remove the rest.
        c.SlaTargets.RemoveAll(t => targets.All(x => x.Priority != t.Priority));
        foreach (var t in targets)
        {
            var row = c.SlaTargets.FirstOrDefault(x => x.Priority == t.Priority);
            if (row is null) c.SlaTargets.Add(row = new SlaTarget { Priority = t.Priority!.Value });
            row.ResponseMinutes = t.ResponseMinutes;
            row.ResolutionMinutes = t.ResolutionMinutes;
            row.Basis = t.Basis ?? SlaBasis.Unknown;
            row.Notes = Text.Clean(t.Notes);
        }
    }

    private static void Sync<TRow, TIn>(List<TRow> rows, List<TIn> input, Func<TRow, long> rowId, Func<TIn, long?> inId, Action<TRow, TIn, int> apply) where TRow : new()
    {
        var keep = input.Select(inId).Where(x => x is > 0).Select(x => x!.Value).ToHashSet();
        rows.RemoveAll(r => !keep.Contains(rowId(r)));
        for (var n = 0; n < input.Count; n++)
        {
            var x = input[n];
            var row = inId(x) is > 0 and var id ? rows.FirstOrDefault(r => rowId(r) == id) : default;
            if (row is null) { row = new TRow(); rows.Add(row); }
            apply(row, x, n);
        }
    }

    private static readonly SupportDays[] Week = [SupportDays.Sunday, SupportDays.Monday, SupportDays.Tuesday, SupportDays.Wednesday, SupportDays.Thursday, SupportDays.Friday, SupportDays.Saturday];
    public static IEnumerable<string> DaysOf(SupportDays d) => Week.Where(w => d.HasFlag(w)).Select(w => w.ToString());

    /// <summary>"24 × 7", or "Sun–Thu 08:00–17:00 (Asia/Dubai)"; consecutive days are shown as a range.</summary>
    public static string? SupportSummary(Contract c)
    {
        if (c.Support24x7) return "24 × 7";
        var picked = Week.Select((w, n) => (w, n)).Where(x => c.SupportDays.HasFlag(x.w)).Select(x => x.n).ToList();
        string Short(int n) => Week[n].ToString()[..3];
        var parts = new List<string>();
        for (var k = 0; k < picked.Count;)
        {
            var start = k;
            while (k + 1 < picked.Count && picked[k + 1] == picked[k] + 1) k++;
            parts.Add(k > start ? $"{Short(picked[start])}–{Short(picked[k])}" : Short(picked[start]));
            k++;
        }
        var days = parts.Count == 0 ? null : string.Join(", ", parts);
        var hours = c.SupportFrom is { } f && c.SupportTo is { } t ? $"{f:HH\\:mm}–{t:HH\\:mm}" : null;
        var text = string.Join(" ", new[] { days, hours }.Where(x => x is not null));
        if (text.Length == 0) return null;
        return c.SupportTimeZone is { } tz && hours is not null ? $"{text} ({tz})" : text;
    }
}
