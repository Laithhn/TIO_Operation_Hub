using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;

namespace TioHub.Api.Modules.Work;

/// <summary>
/// A77: the case statuses people see are configured values, each with a fixed behavior. <see cref="CaseStatus"/> stays as the case's stage:
/// SLA, penalties, open/closed counts and the case actions read the stage, and a status's behavior decides which stage it belongs to.
/// </summary>
public static class CaseStatuses
{
    public const string List = LookupLists.CaseStatusLabel;
    public const string NewCode = "New", OpenedCode = "Opened", InProgressCode = "InProgress", WaitingCode = "WaitingForCustomer", ClosedCode = "Closed", ReopenedCode = "Reopened", PendingValidationCode = "PendingValidation";

    /// <summary>The initial list. A Resolved status is optional: without one the resolution SLA stops at closing.</summary>
    public static readonly (string Code, string Label, CaseStatusBehavior Behavior)[] Initial =
    [
        (NewCode, "New", CaseStatusBehavior.Initial), (OpenedCode, "Opened", CaseStatusBehavior.Opened), (InProgressCode, "In-progress", CaseStatusBehavior.Active),
        (WaitingCode, "Waiting for customer", CaseStatusBehavior.WaitingForCustomer), (ClosedCode, "Closed", CaseStatusBehavior.Closed), (ReopenedCode, "Re-opened", CaseStatusBehavior.Reopened)
    ];

    /// <summary>Case actions move to these, so each needs an active status.</summary>
    public static readonly CaseStatusBehavior[] Required = [CaseStatusBehavior.Initial, CaseStatusBehavior.Opened, CaseStatusBehavior.Active, CaseStatusBehavior.Closed];

    /// <summary>Codes of stages that are not statuses themselves. Saved reports and links from before A77 can still name them.</summary>
    public static readonly string[] StageAliases = [nameof(CaseStatus.Triaged), nameof(CaseStatus.PendingValidation), nameof(CaseStatus.Cancelled)];

    /// <summary>Report filter value meaning every status of an open case.</summary>
    public const string AllOpen = "@open";

    /// <summary>The stage of a behavior; null for waiting, which does not change the stage.</summary>
    public static CaseStatus? StageOf(CaseStatusBehavior b) => b switch
    {
        CaseStatusBehavior.Initial => CaseStatus.New,
        CaseStatusBehavior.Opened or CaseStatusBehavior.Reopened => CaseStatus.Triaged,
        CaseStatusBehavior.Active => CaseStatus.InProgress,
        CaseStatusBehavior.Resolved => CaseStatus.PendingValidation,
        CaseStatusBehavior.Closed => CaseStatus.Closed,
        _ => null
    };

    public static CaseStatusBehavior BehaviorFor(CaseStatus stage) => stage switch
    {
        CaseStatus.New => CaseStatusBehavior.Initial,
        CaseStatus.Triaged => CaseStatusBehavior.Opened,
        CaseStatus.InProgress => CaseStatusBehavior.Active,
        CaseStatus.PendingValidation => CaseStatusBehavior.Resolved,
        _ => CaseStatusBehavior.Closed
    };

    /// <summary>For records written directly by seeders, before any status has been configured.</summary>
    public static string BuiltInCode(CaseStatus stage) => stage switch
    {
        CaseStatus.New => NewCode,
        CaseStatus.Triaged => OpenedCode,
        CaseStatus.InProgress => InProgressCode,
        CaseStatus.PendingValidation => PendingValidationCode,
        _ => ClosedCode
    };

    /// <summary>The first active status of a behavior; a reopened case without a Re-opened status counts as opened.</summary>
    public static async Task<string?> FirstActiveAsync(HubDbContext db, CaseStatusBehavior behavior, CancellationToken ct)
    {
        var name = behavior.ToString();
        var code = await db.LookupValues.AsNoTracking().Where(l => l.ListName == List && l.Category == name && !l.IsRetired)
            .OrderBy(l => l.SortOrder).Select(l => l.Code).FirstOrDefaultAsync(ct);
        return code is null && behavior == CaseStatusBehavior.Reopened ? await FirstActiveAsync(db, CaseStatusBehavior.Opened, ct) : code;
    }

    public static async Task<string> DefaultCodeAsync(HubDbContext db, CaseStatusBehavior behavior, CaseStatus stage, CancellationToken ct) =>
        await FirstActiveAsync(db, behavior, ct) ?? BuiltInCode(stage);

    public static Task<bool> HasActiveAsync(HubDbContext db, CaseStatusBehavior behavior, CancellationToken ct)
    {
        var name = behavior.ToString();
        return db.LookupValues.AnyAsync(l => l.ListName == List && l.Category == name && !l.IsRetired, ct);
    }

    public static async Task<CaseStatusBehavior?> BehaviorOfAsync(HubDbContext db, string? code, CancellationToken ct)
    {
        var category = await db.LookupValues.AsNoTracking().Where(l => l.ListName == List && l.Code == code).Select(l => l.Category).FirstOrDefaultAsync(ct);
        return Enum.TryParse<CaseStatusBehavior>(category, out var b) ? b : null;
    }

    /// <summary>Case actions need the required behaviors, so the last active status of one cannot be retired or deleted.</summary>
    public static async Task CheckNotLastRequiredAsync(HubDbContext db, LookupValue value, string field, CancellationToken ct)
    {
        if (value.ListName != List || value.IsRetired || !Enum.TryParse<CaseStatusBehavior>(value.Category, out var b) || !Required.Contains(b)) return;
        if (!await db.LookupValues.AnyAsync(l => l.ListName == List && l.Id != value.Id && l.Category == value.Category && !l.IsRetired, ct))
            throw new ValidationException(field, $"{value.Label} is the last active status that behaves as {b}. Ticket actions need one, so add another first.");
    }
}
