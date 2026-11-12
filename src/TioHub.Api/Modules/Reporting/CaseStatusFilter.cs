using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// TIO-BUG-006: the Status filter of the catalog Tickets report offers the same configured statuses as the ticket list
/// (value <c>code:&lt;StatusCode&gt;</c>, filtering <see cref="Case.StatusCode"/> exactly), plus the three aggregate choices.
/// Preview, export, saved presets and schedules all validate through <see cref="ExportService.ValidateAsync"/>, which uses this.
/// <list type="bullet">
/// <item>Retired statuses are not offered, but a saved filter that names one keeps working (tickets keep retired statuses).</item>
/// <item>Stage names (New, Triaged, InProgress, PendingValidation, Closed, Cancelled) were the only choices before this change.
/// Saved presets and schedules may hold them, so they are still accepted with their old meaning (the internal stage), and
/// their summary says so. They are no longer offered.</item>
/// <item>Anything else is refused: an unknown value never widens to an unfiltered report.</item>
/// </list>
/// </summary>
public static class CaseStatusFilter
{
    public const string Open = "open", All = "all", Done = "done", CodePrefix = "code:";
    public static readonly string[] Aggregates = [Open, All, Done];

    /// <summary>Choices for the filter: the aggregates, then the active configured statuses in their configured order.</summary>
    public static async Task<string[]> OptionsAsync(HubDbContext db, CancellationToken ct) =>
        [.. Aggregates, .. (await db.LookupValues.AsNoTracking().Where(l => l.ListName == CaseStatuses.List && !l.IsRetired).OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
            .Select(l => l.Code).ToListAsync(ct)).Select(c => CodePrefix + c)];

    public sealed record Resolved(string Value, string Summary);

    /// <summary>The canonical value and its summary text, or null when the value is not a valid choice.</summary>
    public static async Task<Resolved?> ResolveAsync(HubDbContext db, string value, CancellationToken ct)
    {
        var v = value.Trim();
        if (string.Equals(v, Open, StringComparison.OrdinalIgnoreCase)) return new(Open, "All open tickets");
        if (string.Equals(v, All, StringComparison.OrdinalIgnoreCase)) return new(All, "All tickets");
        if (string.Equals(v, Done, StringComparison.OrdinalIgnoreCase)) return new(Done, "All closed or cancelled tickets");
        if (v.StartsWith(CodePrefix, StringComparison.OrdinalIgnoreCase))
        {
            var code = v[CodePrefix.Length..];
            if (code.Length == 0) return null;
            var l = await db.LookupValues.AsNoTracking().Where(x => x.ListName == CaseStatuses.List && x.Code == code).Select(x => new { x.Code, x.Label, x.IsRetired }).FirstOrDefaultAsync(ct);
            return l is null ? null : new(CodePrefix + l.Code, l.IsRetired ? $"{l.Label} (retired status)" : l.Label);
        }
        // Before TIO-BUG-006 the choices were stages; saved filters keep that meaning and are labelled as such.
        if (Enum.TryParse<CaseStatus>(v, true, out var stage) && Enum.IsDefined(stage) && !int.TryParse(v, out _))
            return new(stage.ToString(), $"Stage {stage} (older saved filter; filters the internal stage, not the configured status)");
        return null;
    }
}
