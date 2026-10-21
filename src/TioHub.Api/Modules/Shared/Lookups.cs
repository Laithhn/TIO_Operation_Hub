using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Modules.Shared;

/// <summary>Validates codes against administrator-maintained reference lists. Retired values stay valid only where already used (NFR-09).</summary>
public sealed class LookupService(HubDbContext db)
{
    public async Task<string?> CheckAsync(Check check, string field, string list, string? code, string label, string? unchangedValue, CancellationToken ct, bool required = false)
    {
        var value = Text.Clean(code);
        if (value is null)
        {
            if (required) check.Add(field, $"Select {label}.");
            return null;
        }
        if (value == unchangedValue) return value;
        var ok = await db.LookupValues.AnyAsync(l => l.ListName == list && l.Code == value && !l.IsRetired, ct);
        if (!ok) check.Add(field, $"Select {label} from the list.");
        return value;
    }

    /// <summary>
    /// A34: validates a configured type and returns it with its built-in category. A retired type stays valid on a record that already has it.
    /// </summary>
    public async Task<(string Code, TEnum Category)> TypeAsync<TEnum>(Check check, string field, string list, string? code, string label, string? unchangedValue, CancellationToken ct)
        where TEnum : struct, Enum
    {
        var value = Text.Clean(code);
        if (value is null) { check.Add(field, $"Select {label}."); return ("", default); }
        var row = await db.LookupValues.AsNoTracking().Where(l => l.ListName == list && l.Code == value && (!l.IsRetired || l.Code == unchangedValue))
            .Select(l => new { l.Category }).FirstOrDefaultAsync(ct);
        if (row is null || !Enum.TryParse<TEnum>(row.Category, out var category)) { check.Add(field, $"Select {label} from the list."); return (value, default); }
        return (value, category);
    }
}
