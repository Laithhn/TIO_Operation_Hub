using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace TioHub.Api.Modules.Contracts;

public sealed record PenaltyBreach(string Identity, DateTimeOffset OccurredAt);
public sealed record PenaltyMonthResult(long ClauseId, DateOnly Month, decimal UncappedAmount, decimal Amount, int BreachCount, string Currency, string ReviewState, string[] BreachIdentities);
public sealed record PenaltyClauseSnapshot(long Id, string Name, PenaltyTrigger Trigger, PenaltyCalculation Calculation, decimal? FixedAmount,
    decimal? Percentage, decimal? ReferenceAmount, decimal? MonthlyCap, string? BillingTimeZone, string Currency);

/// <summary>Pure A63 calculation: one count per breach identity, local billing month, monthly cap, ISO currency precision.</summary>
public static class PenaltyRules
{
    /// <summary>Legacy assessments may have no usable terms snapshot. They remain readable and are superseded on recalculation.</summary>
    public static PenaltyClauseSnapshot? TryReadAssessmentTerms(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var terms = JsonSerializer.Deserialize<PenaltyClauseSnapshot>(json);
            return terms is { Id: > 0, Currency.Length: 3 } && Enum.IsDefined(terms.Trigger) && Enum.IsDefined(terms.Calculation) ? terms : null;
        }
        catch (JsonException) { return null; }
    }

    /// <summary>Only a clause's effective calculation terms identify its billing cohort; labels and other clauses do not.</summary>
    public static string TermsKey(PenaltyClauseSnapshot terms)
    {
        static string? Number(decimal? value) => value?.ToString("G29", CultureInfo.InvariantCulture);
        var canonical = JsonSerializer.Serialize(new
        {
            terms.Id, terms.Trigger, terms.Calculation,
            FixedAmount = terms.Calculation == PenaltyCalculation.FixedPerBreach ? Number(terms.FixedAmount) : null,
            Percentage = terms.Calculation == PenaltyCalculation.PercentagePerBreach ? Number(terms.Percentage) : null,
            ReferenceAmount = terms.Calculation == PenaltyCalculation.PercentagePerBreach ? Number(terms.ReferenceAmount) : null,
            MonthlyCap = Number(terms.MonthlyCap),
            BillingTimeZone = terms.MonthlyCap is null ? null : terms.BillingTimeZone,
            terms.Currency
        });
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }

    public static IReadOnlyList<PenaltyMonthResult> Calculate(ContractPenaltyClause clause, IEnumerable<PenaltyBreach> breaches, string currency)
    {
        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3 || currency.Any(c => !char.IsAsciiLetterUpper(c)))
            throw new ArgumentException("A three-letter contract currency is required.", nameof(currency));
        if (clause.MonthlyCap is not null && string.IsNullOrWhiteSpace(clause.BillingTimeZone))
            throw new ArgumentException("A billing time zone is required when a monthly cap is used.", nameof(clause));
        var zone = clause.MonthlyCap is null ? TimeZoneInfo.Utc : TimeZoneInfo.FindSystemTimeZoneById(clause.BillingTimeZone!);
        var perBreach = clause.Calculation switch
        {
            PenaltyCalculation.FixedPerBreach when clause.FixedAmount is >= 0 => clause.FixedAmount.Value,
            PenaltyCalculation.PercentagePerBreach when clause.Percentage is >= 0 and <= 100 && clause.ReferenceAmount is > 0 => clause.ReferenceAmount.Value * clause.Percentage.Value / 100m,
            _ => throw new ArgumentException("The penalty clause terms are incomplete or invalid.", nameof(clause))
        };
        var digits = CurrencyDigits(currency);
        return breaches.Where(b => !string.IsNullOrWhiteSpace(b.Identity))
            .GroupBy(b => b.Identity, StringComparer.Ordinal)
            .Select(g => g.OrderBy(x => x.OccurredAt).First())
            .GroupBy(b =>
            {
                var local = TimeZoneInfo.ConvertTime(b.OccurredAt, zone);
                return new DateOnly(local.Year, local.Month, 1);
            })
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var raw = perBreach * g.Count();
                var capped = clause.MonthlyCap is { } cap ? Math.Min(raw, cap) : raw;
                return new PenaltyMonthResult(clause.Id, g.Key, raw, decimal.Round(capped, digits, MidpointRounding.AwayFromZero), g.Count(), currency, "NeedsReview", g.Select(x => x.Identity).Order(StringComparer.Ordinal).ToArray());
            }).ToArray();
    }

    private static int CurrencyDigits(string currency)
    {
        foreach (var culture in CultureInfo.GetCultures(CultureTypes.SpecificCultures))
            try
            {
                var region = new RegionInfo(culture.Name);
                if (region.ISOCurrencySymbol == currency) return culture.NumberFormat.CurrencyDecimalDigits;
            }
            catch (ArgumentException) { }
        return 2;
    }
}
