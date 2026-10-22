using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;

namespace TioHub.Api.Modules.Work;

/// <summary>A61: the support calendar an SLA is counted in — round the clock, or support days and hours in a time zone.</summary>
public sealed record SlaCalendar(bool RoundTheClock, SupportDays Days, TimeOnly? From, TimeOnly? To, TimeZoneInfo Zone)
{
    public static readonly SlaCalendar AllDay = new(true, SupportDays.None, null, null, TimeZoneInfo.Utc);
    public bool Complete => RoundTheClock || (Days != SupportDays.None && From is not null && To is not null && From < To);
}

/// <summary>
/// A61: counts SLA time. Deadlines add counted minutes to the start; elapsed time counts minutes between two instants.
/// Only time inside the calendar's support windows counts, minus pauses. Support windows are built per local day in the
/// calendar's time zone, so daylight-saving changes move them correctly. Public holidays are not modelled (see DECISIONS A61).
/// </summary>
public static class SlaClock
{
    public sealed record Span(DateTimeOffset Start, DateTimeOffset End);
    private const int MaxDays = 1500;

    private static SupportDays Flag(DayOfWeek d) => (SupportDays)(1 << (int)d);

    private static DateTimeOffset Utc(DateTime local, TimeZoneInfo zone)
    {
        // A local time skipped by a daylight-saving change starts at the first valid instant after it.
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(30);
        return new DateTimeOffset(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), zone.GetUtcOffset(local)).ToUniversalTime();
    }

    /// <summary>Support windows from <paramref name="from"/> onwards, in order.</summary>
    public static IEnumerable<Span> Windows(DateTimeOffset from, SlaCalendar cal)
    {
        if (cal.RoundTheClock) { yield return new Span(from, DateTimeOffset.MaxValue); yield break; }
        if (!cal.Complete) yield break;
        var day = TimeZoneInfo.ConvertTime(from, cal.Zone).Date;
        for (var i = -1; i < MaxDays; i++)
        {
            var d = day.AddDays(i);
            if ((cal.Days & Flag(d.DayOfWeek)) == 0) continue;
            var s = Utc(d + cal.From!.Value.ToTimeSpan(), cal.Zone);
            var e = Utc(d + cal.To!.Value.ToTimeSpan(), cal.Zone);
            if (e <= from) continue;
            yield return new Span(s < from ? from : s, e);
        }
    }

    /// <summary>Pauses sorted and merged (overlapping waiting periods count once).</summary>
    public static List<Span> Merge(IEnumerable<Span> pauses)
    {
        var list = new List<Span>();
        foreach (var p in pauses.Where(p => p.End > p.Start).OrderBy(p => p.Start))
        {
            if (list.Count > 0 && p.Start <= list[^1].End) list[^1] = list[^1] with { End = p.End > list[^1].End ? p.End : list[^1].End };
            else list.Add(p);
        }
        return list;
    }

    private static IEnumerable<Span> Minus(Span w, List<Span> pauses)
    {
        var cur = w.Start;
        foreach (var p in pauses)
        {
            if (p.End <= cur) continue;
            if (p.Start >= w.End) break;
            if (p.Start > cur) yield return new Span(cur, p.Start);
            cur = p.End > cur ? p.End : cur;
            if (cur >= w.End) yield break;
        }
        if (cur < w.End) yield return new Span(cur, w.End);
    }

    /// <summary>The instant at which <paramref name="minutes"/> of counted time have passed since <paramref name="start"/>; null when the calendar has no support time.</summary>
    public static DateTimeOffset? Deadline(DateTimeOffset start, int minutes, SlaCalendar cal, List<Span> pauses)
    {
        var left = TimeSpan.FromMinutes(minutes);
        foreach (var w in Windows(start, cal))
            foreach (var part in Minus(w, pauses))
            {
                var length = part.End - part.Start;
                if (length >= left) return part.Start + left;
                left -= length;
            }
        return null;
    }

    /// <summary>Counted time between two instants.</summary>
    public static TimeSpan Counted(DateTimeOffset start, DateTimeOffset end, SlaCalendar cal, List<Span> pauses)
    {
        if (end <= start) return TimeSpan.Zero;
        var total = TimeSpan.Zero;
        foreach (var w in Windows(start, cal))
        {
            if (w.Start >= end) break;
            foreach (var part in Minus(new Span(w.Start, w.End < end ? w.End : end), pauses)) total += part.End - part.Start;
            if (w.End >= end) break;
        }
        return total;
    }
}

/// <summary>
/// A61: contractual SLA measurement of a case.
/// Start = case creation. Response = first qualifying response to the customer (recorded explicitly, never derived from internal notes
/// or system events). Resolution = the first move into Pending validation or Closed; a rejected validation (resume) clears it, a later
/// reopen does not (first-resolution policy). Targets, basis and calendar are copied from the contract when the contract is set or the
/// priority changes, so later contract edits never rewrite earlier results. Met = at or before the deadline.
/// </summary>
public static class CaseSla
{
    public static TimeZoneInfo? Zone(string? id) => Zones.Find(id);

    /// <summary>Copies the contract's target for the case priority, the basis and the support calendar onto the case.</summary>
    public static void Snapshot(Case c, Contract? k, IEnumerable<SlaTarget> targets, DateTimeOffset now)
    {
        if (k is null)
        {
            c.SlaPriority = null; c.SlaResponseMinutes = null; c.SlaResolutionMinutes = null; c.SlaBasis = SlaBasis.Unknown; c.SlaSupport24x7 = false;
            c.SlaSupportDays = SupportDays.None; c.SlaSupportFrom = null; c.SlaSupportTo = null; c.SlaTimeZone = null; c.SlaPauseOnCustomerWaiting = false;
            c.SlaContractRef = null; c.SlaAppliedAt = null;
            return;
        }
        var t = targets.FirstOrDefault(x => x.Priority == c.Priority);
        c.SlaPriority = c.Priority;
        c.SlaResponseMinutes = t?.ResponseMinutes;
        c.SlaResolutionMinutes = t?.ResolutionMinutes;
        c.SlaBasis = t?.Basis ?? SlaBasis.Unknown;
        c.SlaSupport24x7 = k.Support24x7;
        c.SlaSupportDays = k.SupportDays;
        c.SlaSupportFrom = k.SupportFrom;
        c.SlaSupportTo = k.SupportTo;
        c.SlaTimeZone = k.SupportTimeZone;
        c.SlaPauseOnCustomerWaiting = k.SlaPauseWhileWaitingOnCustomer;
        c.SlaContractRef = k.Ref;
        c.SlaAppliedAt = now;
    }

    /// <summary>The calendar of the snapshot, or the reason it cannot be used.</summary>
    public static (SlaCalendar? Calendar, string? Problem) Calendar(Case c)
    {
        switch (c.SlaBasis)
        {
            case SlaBasis.CalendarHours: return (SlaCalendar.AllDay, null);
            case SlaBasis.SupportHours:
                if (c.SlaSupport24x7) return (SlaCalendar.AllDay, null);
                var zone = Zone(c.SlaTimeZone);
                if (zone is null) return (null, "The contract has no support time zone.");
                var cal = new SlaCalendar(false, c.SlaSupportDays, c.SlaSupportFrom, c.SlaSupportTo, zone);
                return cal.Complete ? (cal, null) : (null, "The contract has no complete support days and hours.");
            default: return (null, "The SLA target does not say whether it counts calendar or support hours.");
        }
    }

    /// <summary>Pauses: waiting on the customer, when the contract pauses the SLA for it; an open wait runs until now.</summary>
    public static List<SlaClock.Span> Pauses(Case c, IEnumerable<CaseWaitingInterval> waits, DateTimeOffset now) =>
        c.SlaPauseOnCustomerWaiting
            ? SlaClock.Merge(waits.Where(w => w.Reason == WaitingReason.Customer).Select(w => new SlaClock.Span(w.StartedAt, w.EndedAt ?? now)))
            : [];

    /// <summary>Recomputes the deadlines, counted times and states. Returns true when anything changed.</summary>
    public static bool Evaluate(Case c, IEnumerable<CaseWaitingInterval> waits, DateTimeOffset now, DateTimeOffset? trackingFrom)
    {
        var before = (c.ResponseDueAt, c.ResolutionDueAt, c.ResponseSlaStatus, c.ResolutionSlaStatus, c.ResponseElapsedMinutes, c.ResolutionElapsedMinutes, c.SlaPausedMinutes, c.SlaNote);
        DateTimeOffset? rDue = null, xDue = null;
        int? rElapsed = null, xElapsed = null, paused = null;
        SlaState rState, xState;
        string? note = null;

        if (c.Scope == WorkScope.Internal || c.ClientId is null) { rState = xState = SlaState.NotApplicable; note = "Internal work has no contractual SLA."; }
        else if (c.ContractId is null) { rState = xState = SlaState.NotApplicable; note = "No contract is linked to this case."; }
        else if (c.Status == CaseStatus.Cancelled) { rState = xState = SlaState.NotApplicable; note = "The case was cancelled."; }
        else
        {
            var (cal, problem) = Calendar(c);
            var pauses = Pauses(c, waits, now);
            var start = c.CreatedAt;
            (SlaState, DateTimeOffset?, int?) Measure(int? minutes, DateTimeOffset? actual, string what, bool untracked)
            {
                if (minutes is null) { note ??= $"{c.SlaContractRef} has no {what} target for {c.SlaPriority} priority."; return (SlaState.NotMeasurable, null, null); }
                if (cal is null) { note ??= problem; return (SlaState.NotMeasurable, null, null); }
                var due = SlaClock.Deadline(start, minutes.Value, cal, pauses);
                if (due is null) { note ??= "No support time falls within the next four years of the calendar."; return (SlaState.NotMeasurable, null, null); }
                if (actual is { } a) return (a <= due ? SlaState.Met : SlaState.Breached, due, (int)SlaClock.Counted(start, a, cal, pauses).TotalMinutes);
                if (untracked) { note ??= $"The case was opened before {what}s were recorded, and none was recorded since."; return (SlaState.NotMeasurable, due, null); }
                return (now > due ? SlaState.Breached : SlaState.Pending, due, (int)SlaClock.Counted(start, now, cal, pauses).TotalMinutes);
            }
            (rState, rDue, rElapsed) = Measure(c.SlaResponseMinutes, c.FirstResponseAt, "response", trackingFrom is { } tf && c.CreatedAt < tf);
            // A case closed before resolution times were recorded has no reliable resolution instant.
            (xState, xDue, xElapsed) = Measure(c.SlaResolutionMinutes, c.ResolvedAt, "resolution", c.ResolvedAt is null && c.Status is CaseStatus.Closed or CaseStatus.PendingValidation);
            var end = c.ResolvedAt ?? now;
            paused = (int)pauses.Select(p => (p.End < end ? p.End : end) - (p.Start > start ? p.Start : start)).Where(d => d > TimeSpan.Zero).Sum(d => d.TotalMinutes);
        }

        c.ResponseDueAt = rDue; c.ResolutionDueAt = xDue;
        c.ResponseSlaStatus = rState; c.ResolutionSlaStatus = xState;
        c.ResponseElapsedMinutes = rElapsed; c.ResolutionElapsedMinutes = xElapsed;
        c.SlaPausedMinutes = paused; c.SlaNote = note;
        var changed = before != (c.ResponseDueAt, c.ResolutionDueAt, c.ResponseSlaStatus, c.ResolutionSlaStatus, c.ResponseElapsedMinutes, c.ResolutionElapsedMinutes, c.SlaPausedMinutes, c.SlaNote);
        if (changed || c.SlaCalculatedAt is null) c.SlaCalculatedAt = now;
        return changed;
    }

    /// <summary>The state a stored result has now: a pending obligation whose deadline passed counts as breached even before the next sweep.</summary>
    public static SlaState Now(SlaState stored, DateTimeOffset? due, DateTimeOffset now) => stored == SlaState.Pending && due < now ? SlaState.Breached : stored;

    public static async Task<DateTimeOffset?> TrackingFromAsync(HubDbContext db, CancellationToken ct) =>
        DateTimeOffset.TryParse(await db.Settings.AsNoTracking().Where(s => s.Key == SettingKeys.SlaTrackingFrom).Select(s => s.Value).FirstOrDefaultAsync(ct), out var t) ? t : null;

    /// <summary>
    /// Called from SaveChanges: re-applies the contract snapshot when the contract or the priority changed, and re-evaluates every
    /// case touched by the save (case rows and their waiting periods). One code path for the API, the sweep and the backfill.
    /// </summary>
    public static async Task EvaluateTrackedAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var entries = db.ChangeTracker.Entries<Case>().Where(e => e.State is EntityState.Added or EntityState.Modified).ToList();
        var waitIds = db.ChangeTracker.Entries<CaseWaitingInterval>().Where(e => e.State is EntityState.Added or EntityState.Modified).Select(e => e.Entity.CaseId).Distinct().ToList();
        foreach (var id in waitIds.Where(id => entries.All(e => e.Entity.Id != id)))
            if (await db.Cases.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == id, ct) is { } extra) entries.Add(db.Entry(extra));
        if (entries.Count == 0) return;

        var trackingFrom = await TrackingFromAsync(db, ct);
        var resnap = entries.Where(e => e.State == EntityState.Added ? e.Entity.ContractId is not null
            : e.Property(nameof(Case.ContractId)).IsModified || (e.Property(nameof(Case.Priority)).IsModified && e.Entity.ContractId is not null)).Select(e => e.Entity).ToList();
        if (resnap.Count > 0)
        {
            var ids = resnap.Where(c => c.ContractId is not null).Select(c => c.ContractId!.Value).Distinct().ToList();
            var contracts = await db.Contracts.IgnoreQueryFilters().AsNoTracking().Include(k => k.SlaTargets).Where(k => ids.Contains(k.Id)).ToListAsync(ct);
            foreach (var c in resnap)
            {
                var k = contracts.FirstOrDefault(x => x.Id == c.ContractId);
                Snapshot(c, k, k?.SlaTargets ?? [], now);
            }
        }
        var caseIds = entries.Select(e => e.Entity.Id).Where(id => id != 0).ToList();
        var stored = caseIds.Count == 0 ? [] : await db.CaseWaitingIntervals.AsNoTracking().Where(w => caseIds.Contains(w.CaseId)).ToListAsync(ct);
        var tracked = db.ChangeTracker.Entries<CaseWaitingInterval>().Select(e => e.Entity).ToList();
        foreach (var e in entries)
        {
            var c = e.Entity;
            var waits = stored.Where(w => w.CaseId == c.Id && tracked.All(t => t.Id != w.Id)).Concat(tracked.Where(t => t.CaseId == c.Id && (c.Id != 0 || c.WaitingIntervals.Contains(t)))).ToList();
            Evaluate(c, waits, now, trackingFrom);
        }
    }

    /// <summary>A61: clears the snapshot and results of cases whose contract link was removed outside the case endpoints (cascade delete).</summary>
    public static async Task<int> ClearUnlinkedAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cases = await db.Cases.IgnoreQueryFilters().Where(c => c.ContractId == null && c.SlaAppliedAt != null).Take(500).ToListAsync(ct);
        foreach (var c in cases) Snapshot(c, null, [], now); // SaveChanges evaluates them as not applicable
        if (cases.Count > 0) await db.SaveChangesAsync(ct);
        return cases.Count;
    }

    /// <summary>
    /// A61 one-time (and safely re-runnable) backfill: records when first-response tracking began, derives resolution times from the
    /// status history where the timeline shows them, and evaluates every case. Nothing is invented: a case opened earlier has no
    /// response measurement unless a response is recorded later, and a case without a linked contract stays Not applicable.
    /// </summary>
    public static async Task BackfillAsync(HubDbContext db, DateTimeOffset now, ILogger log, CancellationToken ct)
    {
        if (!await db.Settings.AnyAsync(s => s.Key == SettingKeys.SlaTrackingFrom, ct))
        {
            db.Settings.Add(new AppSetting { Key = SettingKeys.SlaTrackingFrom, Value = now.ToString("O"), Description = "When first responses to customers began to be recorded (A61). Cases opened earlier have no response measurement unless one is recorded." });
            await db.SaveChangesAsync(ct);
        }
        var pending = await db.Cases.IgnoreQueryFilters().Where(c => c.SlaCalculatedAt == null).Select(c => c.Id).ToListAsync(ct);
        int processed = 0, resolvedFromHistory = 0, failed = 0;
        foreach (var batch in pending.Chunk(200))
        {
            var cases = await db.Cases.IgnoreQueryFilters().Where(c => batch.Contains(c.Id)).ToListAsync(ct);
            var events = await db.CaseEvents.AsNoTracking().Where(e => batch.Contains(e.CaseId)
                && (e.Type == CaseEventType.ValidationRequested || e.Type == CaseEventType.Closed || e.Type == CaseEventType.Started)).OrderBy(e => e.At).ThenBy(e => e.Id).ToListAsync(ct);
            foreach (var c in cases)
            {
                try
                {
                    if (c.ResolvedAt is null && c.Status is CaseStatus.PendingValidation or CaseStatus.Closed)
                    {
                        DateTimeOffset? r = null;
                        foreach (var e in events.Where(e => e.CaseId == c.Id))
                        {
                            if (e.Type is CaseEventType.ValidationRequested or CaseEventType.Closed) r ??= e.At;
                            else if (e.Type == CaseEventType.Started && e.FromValue == nameof(CaseStatus.PendingValidation)) r = null; // validation rejected
                        }
                        if (r is not null) { c.ResolvedAt = r; resolvedFromHistory++; }
                    }
                    if (c.SlaCalculatedAt is null) c.SlaCalculatedAt = now; // marks the case as processed; SaveChanges evaluates it
                    processed++;
                }
                catch (Exception ex) { failed++; log.LogWarning(ex, "SLA backfill skipped case {CaseId}", c.Id); }
            }
            await db.SaveChangesAsync(ct);
        }
        if (pending.Count > 0)
            log.LogInformation("SLA backfill: {Processed} case(s) processed, {Resolved} resolution time(s) taken from the status history, {Skipped} skipped, {Failed} failed",
                processed, resolvedFromHistory, pending.Count - processed - failed, failed);
    }
}

/// <summary>A61: re-evaluates pending SLA obligations whose deadline passed, and those paused while waiting on the customer, every few minutes.</summary>
public sealed class SlaSweep(IServiceScopeFactory scopes, IConfiguration config, ILogger<SlaSweep> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        var minutes = config.GetValue("Sla:SweepMinutes", 5);
        if (minutes <= 0) return;
        await Task.Delay(TimeSpan.FromSeconds(30), stop);
        while (!stop.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
                var n = await SweepAsync(db, scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow(), stop);
                if (n > 0) log.LogInformation("SLA sweep updated {Count} case(s)", n);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogError(ex, "SLA sweep failed; it is retried at the next interval"); }
            await Task.Delay(TimeSpan.FromMinutes(minutes), stop);
        }
    }

    public static async Task<int> SweepAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cleared = await CaseSla.ClearUnlinkedAsync(db, now, ct);
        var cases = await db.Cases.IgnoreQueryFilters()
            .Where(c => (c.ResponseSlaStatus == SlaState.Pending && c.ResponseDueAt < now) || (c.ResolutionSlaStatus == SlaState.Pending && c.ResolutionDueAt < now)
                || ((c.ResponseSlaStatus == SlaState.Pending || c.ResolutionSlaStatus == SlaState.Pending) && c.SlaPauseOnCustomerWaiting && c.WaitingReason == WaitingReason.Customer))
            .Take(500).ToListAsync(ct);
        if (cases.Count == 0) return cleared;
        var ids = cases.Select(c => c.Id).ToList();
        var waits = await db.CaseWaitingIntervals.AsNoTracking().Where(w => ids.Contains(w.CaseId)).ToListAsync(ct);
        var trackingFrom = await CaseSla.TrackingFromAsync(db, ct);
        var changed = cases.Count(c => CaseSla.Evaluate(c, waits.Where(w => w.CaseId == c.Id), now, trackingFrom));
        await db.SaveChangesAsync(ct);
        return changed + cleared;
    }
}
