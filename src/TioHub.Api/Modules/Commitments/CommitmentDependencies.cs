using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Commitments;

/// <summary>One dependency as the forecast sees it: the commitment waited for and the lead time after its delivery.</summary>
public sealed record DependencyFact(long DependencyId, long CommitmentId, string Ref, string Title, CommitmentDirection Direction, string? Party, CommitmentStatus Status,
    DateTimeOffset CurrentDueAt, DateTimeOffset? CompletedAt, string TimeZone, int LeadTimeDays, string? Note);

/// <summary>A dependency with its derived dates: when it is expected, when we can deliver after it, and the buffer it leaves.</summary>
public sealed record DependencyView(long DependencyId, long CommitmentId, string Ref, string Title, CommitmentDirection Direction, string? Party, CommitmentStatus Status,
    DateTimeOffset CurrentDueAt, DateTimeOffset? CompletedAt, string TimeZone, int LeadTimeDays, string? Note,
    string State, DateTimeOffset? ExpectedAt, DateTimeOffset? ReadyAt, DateTimeOffset NeededBy, int? BufferDays);

/// <summary>
/// A114: the forecast of a commitment from its dependencies. <see cref="Health"/> is null when the commitment is no longer open.
/// Lead times are calendar days (owner default, 13 Nov 2026); instants are compared, so the commitments may be in different time zones.
/// </summary>
public sealed record DependencyForecast(DependencyHealth? Health, DateTimeOffset? ForecastAt, int? BufferDays, DateTimeOffset? NeededBy, int WarningDays, string Message,
    long? CauseCommitmentId, IReadOnlyList<DependencyView> Dependencies);

public static class DependencyRules
{
    public const int MaxDependencies = 20;
    public const int MaxLeadTimeDays = 365;

    /// <summary>Whole calendar days, rounded to the nearest day (a buffer of 1 day 22 hours is 2 days).</summary>
    public static int Days(TimeSpan span) => (int)Math.Round(span.TotalDays, MidpointRounding.AwayFromZero);

    public static string Date(DateTimeOffset at, string zone) =>
        TimeZoneInfo.ConvertTime(at, Zones.Find(zone) ?? TimeZoneInfo.Utc).ToString("d MMM yyyy", CultureInfo.InvariantCulture);

    private static string DaysText(int n) => n == 1 || n == -1 ? $"{n} day" : $"{n} days";
    private static string Name(DependencyView d) => d.Party is null ? d.Ref : $"{d.Ref} ({d.Party})";

    /// <summary>
    /// Expected delivery of a dependency: its completion time; the deadline while open and not yet due; and now once it is overdue
    /// (it can no longer arrive earlier than now). Cancelled dependencies have none and block the commitment.
    /// </summary>
    public static DependencyForecast? Compute(CommitmentStatus status, DateTimeOffset dueAt, string zone, IReadOnlyList<DependencyFact> facts, DateTimeOffset now, int warningDays)
    {
        if (facts.Count == 0) return null;
        var views = facts.Select(f =>
        {
            var neededBy = dueAt.AddDays(-f.LeadTimeDays);
            if (f.Status == CommitmentStatus.Cancelled)
                return new DependencyView(f.DependencyId, f.CommitmentId, f.Ref, f.Title, f.Direction, f.Party, f.Status, f.CurrentDueAt, f.CompletedAt, f.TimeZone, f.LeadTimeDays, f.Note,
                    "Cancelled", null, null, neededBy, null);
            var overdue = f.Status == CommitmentStatus.Open && f.CurrentDueAt < now;
            var expected = f.Status == CommitmentStatus.Completed ? f.CompletedAt ?? f.CurrentDueAt : overdue ? now : f.CurrentDueAt;
            return new DependencyView(f.DependencyId, f.CommitmentId, f.Ref, f.Title, f.Direction, f.Party, f.Status, f.CurrentDueAt, f.CompletedAt, f.TimeZone, f.LeadTimeDays, f.Note,
                f.Status == CommitmentStatus.Completed ? "Delivered" : overdue ? "Overdue" : "Open", expected, expected.AddDays(f.LeadTimeDays), neededBy, Days(neededBy - expected));
        }).OrderBy(v => v.NeededBy).ThenBy(v => v.Ref, StringComparer.Ordinal).ToList();

        var live = views.Where(v => v.ReadyAt is not null).ToList();
        var worst = live.OrderByDescending(v => v.ReadyAt).ThenBy(v => v.BufferDays).FirstOrDefault();
        var forecast = worst?.ReadyAt;
        var buffer = live.Count == 0 ? (int?)null : live.Min(v => v.BufferDays);
        var neededByFirst = views.Min(v => v.NeededBy);
        if (status != CommitmentStatus.Open)
            return new DependencyForecast(null, forecast, buffer, neededByFirst, warningDays, "", null, views);

        var cancelled = views.FirstOrDefault(v => v.State == "Cancelled");
        var overdueDep = live.Where(v => v.State == "Overdue").OrderBy(v => v.BufferDays).FirstOrDefault();
        var tight = live.Where(v => v.State != "Delivered").OrderBy(v => v.BufferDays).FirstOrDefault();
        DependencyHealth health;
        string message;
        long? cause;
        if (cancelled is not null)
        {
            health = DependencyHealth.Blocked;
            cause = cancelled.CommitmentId;
            message = $"{Name(cancelled)} was cancelled. Link a replacement, remove the dependency with a reason, or revise this deadline.";
        }
        else if (forecast > dueAt)
        {
            health = DependencyHealth.WillBeLate;
            cause = worst!.CommitmentId;
            var late = Math.Max(1, Days(forecast.Value - dueAt));
            var expected = worst.State == "Overdue" ? "is overdue and not yet delivered" : worst.State == "Delivered" ? $"was delivered {Date(worst.ExpectedAt!.Value, zone)}" : $"is due {Date(worst.ExpectedAt!.Value, zone)}";
            message = $"{Name(worst)} {expected}. With {DaysText(worst.LeadTimeDays)} after it, delivery is forecast {Date(forecast.Value, zone)}, {DaysText(late)} after the deadline.";
        }
        else if (overdueDep is not null)
        {
            health = DependencyHealth.AtRisk;
            cause = overdueDep.CommitmentId;
            message = $"{Name(overdueDep)} is overdue and not yet delivered. {DaysText(Math.Max(0, overdueDep.BufferDays ?? 0))} of buffer remain before this deadline is affected.";
        }
        else if (tight is not null && tight.BufferDays < warningDays)
        {
            health = DependencyHealth.AtRisk;
            cause = tight.CommitmentId;
            message = $"Only {DaysText(Math.Max(0, tight.BufferDays ?? 0))} of buffer after {Name(tight)}. Any further slip moves this delivery past its deadline.";
        }
        else
        {
            health = DependencyHealth.OnTrack;
            cause = null;
            message = tight is null
                ? $"All dependencies are delivered. Delivery can be ready by {Date(forecast!.Value, zone)}."
                : $"Dependencies can slip up to {DaysText(tight.BufferDays ?? 0)} before this deadline is affected.";
        }
        return new DependencyForecast(health, forecast, buffer, neededByFirst, warningDays, message, cause, views);
    }

    /// <summary>The dependencies of the given commitments, read across scopes (the downstream commitment was already authorized).</summary>
    public static async Task<Dictionary<long, List<DependencyFact>>> FactsAsync(HubDbContext db, IReadOnlyCollection<long> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return [];
        var rows = await db.CommitmentDependencies.IgnoreQueryFilters().AsNoTracking().Where(d => ids.Contains(d.CommitmentId))
            .Select(d => new
            {
                d.CommitmentId,
                fact = new DependencyFact(d.Id, d.DependsOnCommitmentId, d.DependsOn!.Ref, d.DependsOn.Title, d.DependsOn.Direction,
                    d.DependsOn.Direction == CommitmentDirection.External ? d.DependsOn.ResponsibleOrganization : null, d.DependsOn.Status, d.DependsOn.CurrentDueAt,
                    d.DependsOn.CompletedAt, d.DependsOn.TimeZone, d.LeadTimeDays, d.Note)
            }).ToListAsync(ct);
        return rows.GroupBy(r => r.CommitmentId).ToDictionary(g => g.Key, g => g.Select(x => x.fact).ToList());
    }

    /// <summary>Forecasts of the given commitments (only those with dependencies appear).</summary>
    public static async Task<Dictionary<long, DependencyForecast>> ForecastsAsync(HubDbContext db, IReadOnlyCollection<(long Id, CommitmentStatus Status, DateTimeOffset DueAt, string Zone)> items,
        DateTimeOffset now, int warningDays, CancellationToken ct)
    {
        var facts = await FactsAsync(db, items.Select(i => i.Id).ToList(), ct);
        var result = new Dictionary<long, DependencyForecast>();
        foreach (var i in items)
            if (facts.TryGetValue(i.Id, out var f) && Compute(i.Status, i.DueAt, i.Zone, f, now, warningDays) is { } fc) result[i.Id] = fc;
        return result;
    }

    /// <summary>Open commitments that have dependencies, with their forecast (for filters, notifications and dashboards).</summary>
    public static async Task<Dictionary<long, DependencyForecast>> OpenForecastsAsync(HubDbContext db, IQueryable<Commitment> scope, DateTimeOffset now, int warningDays, CancellationToken ct)
    {
        var items = await scope.Where(c => c.Status == CommitmentStatus.Open && c.Dependencies.Any())
            .Select(c => new { c.Id, c.Status, c.CurrentDueAt, c.TimeZone }).ToListAsync(ct);
        return await ForecastsAsync(db, items.Select(i => (i.Id, i.Status, i.CurrentDueAt, i.TimeZone)).ToList(), now, warningDays, ct);
    }

    /// <summary>Whether <paramref name="from"/> already waits, directly or through others, for <paramref name="target"/>.</summary>
    public static async Task<bool> ReachesAsync(HubDbContext db, long from, long target, CancellationToken ct)
    {
        var seen = new HashSet<long> { from };
        var frontier = new List<long> { from };
        while (frontier.Count > 0)
        {
            if (frontier.Contains(target)) return true;
            var next = await db.CommitmentDependencies.IgnoreQueryFilters().AsNoTracking().Where(d => frontier.Contains(d.CommitmentId)).Select(d => d.DependsOnCommitmentId).ToListAsync(ct);
            frontier = next.Where(seen.Add).ToList();
        }
        return false;
    }

    /// <summary>When a commitment is completed late, the dependency whose delivery (plus its lead time) went past the deadline in force.</summary>
    public static long? LateCause(DateTimeOffset dueAt, IReadOnlyList<DependencyFact> facts, DateTimeOffset completedAt) =>
        facts.Where(f => f.Status != CommitmentStatus.Cancelled)
            .Select(f => (f.CommitmentId, Ready: (f.Status == CommitmentStatus.Completed ? f.CompletedAt ?? f.CurrentDueAt : f.CurrentDueAt > completedAt ? f.CurrentDueAt : completedAt).AddDays(f.LeadTimeDays)))
            .Where(x => x.Ready > dueAt).OrderByDescending(x => x.Ready).Select(x => (long?)x.CommitmentId).FirstOrDefault();
}

public static class CommitmentDependencyEndpoints
{
    public sealed record DependencyInput(long? DependsOnCommitmentId, int? LeadTimeDays, string? Note);
    public sealed record DependencyUpdateInput(int? LeadTimeDays, string? Note);
    public sealed record RemoveInput(string? Reason);
    public sealed record ExternalPartyInput(string? Name);

    /// <summary>External parties are standalone organizations (no client), shared by every client (owner default, 13 Nov 2026).</summary>
    public const string ExternalPartyType = "External party";

    public static void MapCommitmentDependencyEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/commitments").WithTags("Commitments");

        // Names of standalone organizations only: a commitment's external party is shared across clients, so its name is not client data.
        g.MapGet("/external-parties", async (HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Commitments, RightKeys.View);
            var items = await db.Organizations.IgnoreQueryFilters().AsNoTracking().Where(o => o.ClientId == null && o.Name != null)
                .OrderBy(o => o.Name).Select(o => new { o.Id, name = o.Name!, o.Code, o.OrganizationType }).ToListAsync(ct);
            return Results.Ok(new { items, canCreate = access.Me.HasRight(RightKeys.Structure, RightKeys.Create) });
        });

        // Adding an organization is a Structure right; commitment creators without it pick from the existing list.
        g.MapPost("/external-parties", async (ExternalPartyInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Commitments, RightKeys.Create);
            access.Me.RequireRight(RightKeys.Structure, RightKeys.Create);
            var check = new Check().Text("name", input.Name, 150, "the name of the external party", true);
            check.ThrowIfAny();
            var name = input.Name!.Trim();
            var existing = await db.Organizations.IgnoreQueryFilters().AsNoTracking().Where(o => o.ClientId == null && o.Name == name).Select(o => (long?)o.Id).FirstOrDefaultAsync(ct);
            if (existing is not null) return Results.Ok(new { id = existing.Value, name });
            var o = new Organization { Name = name, OrganizationType = ExternalPartyType };
            db.Organizations.Add(o);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/organizations/{o.Id}", new { o.Id, name });
        });

        // Commitments this one could wait for: same client (or internal team), not itself, not already linked, and not waiting for this one.
        g.MapGet("/{id:long}/dependency-options", async (long id, string? q, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Commitments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            var linked = await db.CommitmentDependencies.IgnoreQueryFilters().Where(d => d.CommitmentId == id).Select(d => d.DependsOnCommitmentId).ToListAsync(ct);
            var query = db.Commitments.AsNoTracking().Where(x => x.Id != id && !linked.Contains(x.Id) && x.Status != CommitmentStatus.Cancelled && x.ClientId == c.ClientId
                && (c.ClientId != null || x.ResponsibleTeamId == c.ResponsibleTeamId));
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(x => x.Ref.Contains(q) || x.Title.Contains(q) || (x.ResponsibleOrganization != null && x.ResponsibleOrganization.Contains(q)));
            var rows = await query.OrderBy(x => x.Direction == CommitmentDirection.External ? 0 : 1).ThenBy(x => x.CurrentDueAt).Take(100)
                .Select(x => new { x.Id, x.Ref, x.Title, x.Direction, party = x.Direction == CommitmentDirection.External ? x.ResponsibleOrganization : null, x.Status, x.CurrentDueAt, x.TimeZone }).ToListAsync(ct);
            var items = new List<object>();
            foreach (var r in rows)
                if (!await DependencyRules.ReachesAsync(db, r.Id, id, ct)) items.Add(r);
            return Results.Ok(new { items });
        });

        g.MapPost("/{id:long}/dependencies", async (long id, DependencyInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).Include(x => x.Dependencies).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("dependsOnCommitmentId", "Only open commitments can get dependencies. Reopen it first.");
            var check = new Check().When(input.DependsOnCommitmentId is null, "dependsOnCommitmentId", "Select the commitment this one depends on.")
                .When(input.LeadTimeDays is null, "leadTimeDays", "Enter the lead time after delivery, in calendar days (0 if none).")
                .When(input.LeadTimeDays is < 0 or > DependencyRules.MaxLeadTimeDays, "leadTimeDays", $"Enter a lead time between 0 and {DependencyRules.MaxLeadTimeDays} days.")
                .Text("note", input.Note, 500, "What happens in that time");
            check.ThrowIfAny();
            // The commitment waited for must be visible and maintainable too: linking changes how both are read.
            var up = await db.Commitments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == input.DependsOnCommitmentId, ct) ?? throw new ValidationException("dependsOnCommitmentId", "Select an existing commitment you can access.");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, up, ct));
            if (up.Id == c.Id) check.Add("dependsOnCommitmentId", "A commitment cannot depend on itself.");
            else if (up.ClientId != c.ClientId || (c.ClientId is null && up.ResponsibleTeamId != c.ResponsibleTeamId)) check.Add("dependsOnCommitmentId", "Select a commitment of the same client (or the same internal team).");
            else if (up.Status == CommitmentStatus.Cancelled) check.Add("dependsOnCommitmentId", "A cancelled commitment cannot be a dependency.");
            else if (c.Dependencies.Any(d => d.DependsOnCommitmentId == up.Id)) check.Add("dependsOnCommitmentId", "This dependency already exists.");
            else if (c.Dependencies.Count >= DependencyRules.MaxDependencies) check.Add("dependsOnCommitmentId", $"A commitment can have at most {DependencyRules.MaxDependencies} dependencies.");
            else if (await DependencyRules.ReachesAsync(db, up.Id, c.Id, ct)) check.Add("dependsOnCommitmentId", $"{up.Ref} already depends on {c.Ref}, directly or through others. Dependencies cannot form a loop.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            c.Dependencies.Add(new CommitmentDependency { DependsOnCommitmentId = up.Id, LeadTimeDays = input.LeadTimeDays!.Value, Note = Text.Clean(input.Note), CreatedAt = now, CreatedById = access.Me.UserId });
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.DependencyAdded, CauseCommitmentId = up.Id, Reason = $"Depends on {up.Ref} · {up.Title} · lead time {input.LeadTimeDays} day(s)", ById = access.Me.UserId, At = now });
            c.LastReviewedAt = now;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPut("/{id:long}/dependencies/{dependencyId:long}", async (long id, long dependencyId, DependencyUpdateInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Dependencies).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            var d = c.Dependencies.FirstOrDefault(x => x.Id == dependencyId) ?? throw new NotFoundException("The dependency");
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("leadTimeDays", "Only dependencies of open commitments can be changed. Reopen it first.");
            new Check().When(input.LeadTimeDays is null or < 0 or > DependencyRules.MaxLeadTimeDays, "leadTimeDays", $"Enter a lead time between 0 and {DependencyRules.MaxLeadTimeDays} days.")
                .Text("note", input.Note, 500, "What happens in that time").ThrowIfAny();
            d.LeadTimeDays = input.LeadTimeDays!.Value;
            d.Note = Text.Clean(input.Note);
            c.LastReviewedAt = clock.GetUtcNow();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Removing a dependency changes the forecast, so it needs a reason and stays in the history.
        g.MapPost("/{id:long}/dependencies/{dependencyId:long}/remove", async (long id, long dependencyId, RemoveInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).Include(x => x.Dependencies).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            var d = c.Dependencies.FirstOrDefault(x => x.Id == dependencyId) ?? throw new NotFoundException("The dependency");
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("reason", "Only dependencies of open commitments can be removed. Reopen it first.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reason for removing the dependency");
            var upRef = await db.Commitments.IgnoreQueryFilters().Where(x => x.Id == d.DependsOnCommitmentId).Select(x => x.Ref).FirstOrDefaultAsync(ct);
            var now = clock.GetUtcNow();
            c.Dependencies.Remove(d);
            db.CommitmentDependencies.Remove(d);
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.DependencyRemoved, CauseCommitmentId = d.DependsOnCommitmentId, Reason = $"{upRef}: {reason}", ById = access.Me.UserId, At = now });
            c.LastReviewedAt = now;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A114: on-time record of each external party, from its completed External commitments in the reader's scope.
        g.MapGet("/external-reliability", async (DateTimeOffset? from, DateTimeOffset? to, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Commitments, RightKeys.View);
            var q = db.Commitments.AsNoTracking().Where(c => c.Direction == CommitmentDirection.External && c.Status != CommitmentStatus.Cancelled);
            if (from is not null) q = q.Where(c => c.CurrentDueAt >= from);
            if (to is not null) q = q.Where(c => c.CurrentDueAt < to);
            var now = DateTimeOffset.UtcNow;
            var rows = await q.Select(c => new { c.ExternalOrganizationId, party = c.ResponsibleOrganization, c.Status, c.CompletedAt, c.DueAtCompletion, c.OriginalDueAt, c.CurrentDueAt, c.RevisionCount, c.CompletedLate }).ToListAsync(ct);
            var items = rows.GroupBy(r => r.ExternalOrganizationId).Select(gr =>
            {
                var done = gr.Where(r => r.Status == CommitmentStatus.Completed && r.CompletedAt is not null).ToList();
                var late = done.Where(r => r.CompletedLate == true).ToList();
                return new
                {
                    organizationId = gr.Key, name = gr.OrderByDescending(r => r.CurrentDueAt).First().party ?? "—",
                    commitments = gr.Count(), completed = done.Count, onTime = done.Count - late.Count, late = late.Count,
                    onTimePercent = done.Count == 0 ? (int?)null : (int)Math.Round(100.0 * (done.Count - late.Count) / done.Count),
                    averageDelayDays = late.Count == 0 ? (double?)null : Math.Round(late.Average(r => (r.CompletedAt!.Value - r.DueAtCompletion!.Value).TotalDays), 1),
                    // Against the original promise: how far the external party moved its own dates.
                    averageSlipFromOriginalDays = done.Count == 0 ? (double?)null : Math.Round(done.Average(r => Math.Max(0, (r.CompletedAt!.Value - r.OriginalDueAt).TotalDays)), 1),
                    revisions = gr.Sum(r => r.RevisionCount),
                    openOverdue = gr.Count(r => r.Status == CommitmentStatus.Open && r.CurrentDueAt < now)
                };
            }).OrderBy(x => x.onTimePercent ?? 101).ThenBy(x => x.name).ToList();
            return Results.Ok(new { items });
        });
    }
}
