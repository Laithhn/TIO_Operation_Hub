using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Modules.Jira;

/// <summary>
/// A93: a Jira space can be linked to several contracts, such as yearly renewals, and each of its tickets belongs to the one contract valid
/// when the ticket was created in Jira. The date decides, so a renewal or a later link never moves a ticket to another contract.
/// A ticket no linked contract covers has no contract and is Not measurable.
/// </summary>
public static class JiraSpaceContracts
{
    /// <summary>The validity of a linked contract. An empty end date means it has no end yet.</summary>
    public sealed record Term(long Id, string Ref, DateOnly Start, DateOnly? End, string? Zone);

    /// <summary>The linked contracts that can cover a ticket: not drafts, not deleted, and with a start date. Ended and terminated ones still cover the tickets of their time.</summary>
    public static async Task<List<Term>> TermsAsync(HubDbContext db, long spaceId, CancellationToken ct)
    {
        var rows = await db.ClientJiraSpaceContracts.AsNoTracking().Where(l => l.ClientJiraSpaceId == spaceId)
            .Join(db.Contracts.IgnoreQueryFilters().AsNoTracking().Where(k => k.ArchivedAt == null && k.Status != ContractStatus.Draft && k.StartDate != null), l => l.ContractId, k => k.Id,
                (l, k) => new { k.Id, k.Ref, k.StartDate, k.EndDate, k.SupportTimeZone }).ToListAsync(ct);
        return rows.Select(k => new Term(k.Id, k.Ref, k.StartDate!.Value, k.EndDate, k.SupportTimeZone)).OrderBy(t => t.Start).ToList();
    }

    /// <summary>The contract valid on the ticket's creation date, read in that contract's support time zone.</summary>
    public static Term? Covering(IEnumerable<Term> terms, DateTimeOffset createdAt) => terms.FirstOrDefault(t =>
    {
        var day = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(createdAt, Zones.Find(t.Zone) ?? TimeZoneInfo.Utc).DateTime);
        return day >= t.Start && (t.End is null || day <= t.End);
    });

    public static bool Overlap(DateOnly startA, DateOnly? endA, DateOnly startB, DateOnly? endB) => startA <= (endB ?? DateOnly.MaxValue) && startB <= (endA ?? DateOnly.MaxValue);

    private static string Period(DateOnly start, DateOnly? end) => $"{start:yyyy-MM-dd} to {(end is { } e ? e.ToString("yyyy-MM-dd") : "no end date")}";

    /// <summary>Only contracts of the client, with a start date, not drafts, and never two valid on the same day.</summary>
    public static async Task CheckAsync(HubDbContext db, long clientId, IReadOnlyCollection<long> contractIds, CancellationToken ct)
    {
        if (contractIds.Count == 0) return;
        var rows = await db.Contracts.AsNoTracking().Where(k => contractIds.Contains(k.Id) && k.ClientId == clientId && k.Status != ContractStatus.Draft).Select(k => new { k.Id, k.Ref, k.StartDate, k.EndDate }).ToListAsync(ct);
        if (rows.Count != contractIds.Count) throw new ValidationException("contractIds", "Select contracts of this client that are not drafts.");
        var undated = rows.FirstOrDefault(k => k.StartDate is null);
        if (undated is not null) throw new ValidationException("contractIds", $"{undated.Ref} has no start date, so no ticket could be matched to it. Record its start date first.");
        var ordered = rows.OrderBy(k => k.StartDate).ToList();
        for (var i = 0; i < ordered.Count; i++)
            for (var j = i + 1; j < ordered.Count; j++)
                if (Overlap(ordered[i].StartDate!.Value, ordered[i].EndDate, ordered[j].StartDate!.Value, ordered[j].EndDate))
                    throw new ValidationException("contractIds", $"{ordered[i].Ref} ({Period(ordered[i].StartDate!.Value, ordered[i].EndDate)}) overlaps {ordered[j].Ref} ({Period(ordered[j].StartDate!.Value, ordered[j].EndDate)}), so a ticket could match both. Correct the dates first.");
    }

    /// <summary>Editing a linked contract cannot make it overlap another contract of the same space or lose its start date.</summary>
    public static async Task CheckEditedDatesAsync(HubDbContext db, long contractId, DateOnly? start, DateOnly? end, CancellationToken ct)
    {
        var spaces = await SpacesOfAsync(db, contractId, ct);
        if (spaces.Count == 0) return;
        if (start is null) throw new ValidationException("startDate", "This contract is linked to a Jira space, whose tickets are matched by date, so it needs a start date.");
        foreach (var spaceId in spaces)
            foreach (var other in (await TermsAsync(db, spaceId, ct)).Where(t => t.Id != contractId))
                if (Overlap(start.Value, end, other.Start, other.End))
                    throw new ValidationException("endDate", $"These dates overlap {other.Ref} ({Period(other.Start, other.End)}), linked to the same Jira space, so a ticket could match both.");
    }

    public static Task<List<long>> SpacesOfAsync(HubDbContext db, long contractId, CancellationToken ct) =>
        db.ClientJiraSpaceContracts.AsNoTracking().Where(l => l.ContractId == contractId).Select(l => l.ClientJiraSpaceId).ToListAsync(ct);

    /// <summary>On a case from a space with linked contracts, the date decides and a person cannot choose another.</summary>
    public static Task<bool> DecidesCaseAsync(HubDbContext db, long caseId, CancellationToken ct) =>
        db.JiraCaseMappings.IgnoreQueryFilters().AsNoTracking().Where(m => m.CaseId == caseId)
            .AnyAsync(m => db.ClientJiraSpaceContracts.Any(l => l.ClientJiraSpaceId == m.ClientJiraSpaceId), ct);

    /// <summary>Sets the contract of one ticket from its creation date. Returns true when the case changed. With no contract linked to the space nothing is decided here.</summary>
    public static bool Apply(HubDbContext db, Case c, DateTimeOffset? createdAt, IReadOnlyList<Term> terms, DateTimeOffset now)
    {
        if (terms.Count == 0)
        {
            if (!c.SlaNoCoveringContract) return false;
            c.SlaNoCoveringContract = false;
            return true;
        }
        var term = createdAt is { } at ? Covering(terms, at) : null;
        var changed = c.SlaNoCoveringContract != (term is null);
        c.SlaNoCoveringContract = term is null;
        if (c.ContractId == term?.Id) return changed;
        CaseEndpoints.AddEvent(db, c, CaseEventType.ContractChanged, c.SlaContractRef ?? "No contract", term?.Ref ?? "No contract",
            term is null ? "No contract linked to the Jira space covers the ticket's creation date" : "The contract linked to the Jira space that covers the ticket's creation date", db.CurrentUser, now);
        c.ContractId = term?.Id;
        // The due date of a synchronized case comes from its contract.
        if (term is null) { c.DueAt = null; c.DueTimeZone = null; }
        return true;
    }

    /// <summary>
    /// Applies the date rule to every ticket of the space, open or closed, after its links or a linked contract's dates changed.
    /// Cases of a contract no longer linked lose it, even when no other contract is linked. Returns how many changed.
    /// </summary>
    public static async Task<int> ReconcileAsync(HubDbContext db, long spaceId, IReadOnlyCollection<long> unlinked, DateTimeOffset now, CancellationToken ct)
    {
        var terms = await TermsAsync(db, spaceId, ct);
        var ids = await db.JiraCaseMappings.IgnoreQueryFilters().AsNoTracking().Where(m => m.ClientJiraSpaceId == spaceId && m.CaseId != null).Select(m => new { CaseId = m.CaseId!.Value, m.JiraCreatedAt }).ToListAsync(ct);
        var changed = 0;
        foreach (var batch in ids.Chunk(200))
        {
            var caseIds = batch.Select(x => x.CaseId).ToList();
            var cases = await db.Cases.IgnoreQueryFilters().Where(c => caseIds.Contains(c.Id)).ToListAsync(ct);
            foreach (var c in cases)
            {
                var created = batch.First(x => x.CaseId == c.Id).JiraCreatedAt ?? c.SlaClockStartAt;
                var any = Apply(db, c, created, terms, now);
                if (terms.Count == 0 && c.ContractId is { } old && unlinked.Contains(old))
                {
                    CaseEndpoints.AddEvent(db, c, CaseEventType.ContractChanged, c.SlaContractRef ?? "No contract", "No contract", "The contract was unlinked from the Jira space", db.CurrentUser, now);
                    c.ContractId = null;
                    c.DueAt = null;
                    c.DueTimeZone = null;
                    any = true;
                }
                if (any) changed++;
            }
            await db.SaveChangesAsync(ct);
            db.ChangeTracker.Clear();
        }
        return changed;
    }

    /// <summary>One time after the upgrade: brings existing tickets under the date rule. Safe to run again.</summary>
    public static async Task ReconcileOnceAsync(HubDbContext db, DateTimeOffset now, ILogger log, CancellationToken ct)
    {
        if (await db.Settings.AnyAsync(s => s.Key == SettingKeys.JiraContractsByDateFrom, ct)) return;
        var spaces = await db.ClientJiraSpaceContracts.AsNoTracking().Select(l => l.ClientJiraSpaceId).Distinct().ToListAsync(ct);
        var changed = 0;
        foreach (var space in spaces) changed += await ReconcileAsync(db, space, [], now, ct);
        db.Settings.Add(new AppSetting { Key = SettingKeys.JiraContractsByDateFrom, Value = now.ToString("O"), Description = "When tickets of Jira spaces began to take their contract from their creation date (A93)." });
        await db.SaveChangesAsync(ct);
        if (changed > 0) log.LogInformation("Jira contracts by date: {Changed} ticket(s) in {Spaces} space(s) changed", changed, spaces.Count);
    }
}
