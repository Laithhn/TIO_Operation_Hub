using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

public class Stage2SlaTests
{
    private static readonly TimeZoneInfo Berlin = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");
    private static SlaCalendar Calendar(SupportDays days, int fromHour, int fromMinute, int toHour, int toMinute, TimeZoneInfo? zone = null) =>
        new(false, days, new TimeOnly(fromHour, fromMinute), new TimeOnly(toHour, toMinute), zone ?? TimeZoneInfo.Utc);
    private static DateTimeOffset Utc(int month, int day, int hour, int minute = 0) => new(2026, month, day, hour, minute, 0, TimeSpan.Zero);

    [Fact]
    public void Overnight_support_belongs_to_the_selected_start_day_including_the_weekend_tail()
    {
        var cal = Calendar(SupportDays.Friday, 22, 0, 6, 0);
        Assert.True(cal.Complete);
        Assert.Equal(Utc(10, 24, 2), SlaClock.Deadline(Utc(10, 23, 23), 180, cal, []));
        // Saturday is not selected, but its early hours belong to Friday's window.
        Assert.Equal(Utc(10, 24, 5), SlaClock.Deadline(Utc(10, 24, 3), 120, cal, []));
        Assert.Equal(TimeSpan.FromHours(7), SlaClock.Counted(Utc(10, 23, 23), Utc(10, 25, 12), cal, []));
        Assert.Equal(Utc(10, 30, 23), SlaClock.Deadline(Utc(10, 24, 6), 60, cal, []));
    }

    [Theory]
    [InlineData(3, 28, 21, 29, 4, 7)] // Saturday22:00 CET -> Sunday06:00 CEST loses an hour.
    [InlineData(10, 24, 20, 25, 5, 9)] // Saturday22:00 CEST -> Sunday06:00 CET gains an hour.
    public void Overnight_calendars_count_real_minutes_across_daylight_saving(int month, int startDay, int startHour, int endDay, int endHour, int hours)
    {
        var cal = Calendar(SupportDays.Saturday, 22, 0, 6, 0, Berlin);
        var start = Utc(month, startDay, startHour);
        var end = Utc(month, endDay, endHour);
        Assert.Equal(TimeSpan.FromHours(hours), SlaClock.Counted(start, end, cal, []));
        Assert.Equal(end, SlaClock.Deadline(start, hours * 60, cal, []));
    }

    [Theory]
    [InlineData(3, 29, 2, 2)]
    [InlineData(10, 25, 3, 4)]
    public void Daytime_windows_also_count_daylight_saving_elapsed_time(int month, int day, int endHour, int hours)
    {
        var cal = Calendar(SupportDays.Sunday, 1, 0, 4, 0, Berlin);
        var start = month == 3 ? Utc(3, 29, 0) : Utc(10, 24, 23);
        var end = Utc(month, day, endHour);
        Assert.Equal(TimeSpan.FromHours(hours), SlaClock.Counted(start, end, cal, []));
        Assert.Equal(end, SlaClock.Deadline(start, hours * 60, cal, []));
    }

    [Fact]
    public void Skipped_boundary_advances_to_the_first_valid_instant_and_empty_gap_window_adds_nothing()
    {
        var cal = Calendar(SupportDays.Sunday, 2, 10, 4, 0, Berlin);
        Assert.Equal(Utc(3, 29, 1, 30), SlaClock.Deadline(Utc(3, 29, 0), 30, cal, [])); // 03:00 local start.
        Assert.Equal(TimeSpan.FromHours(1), SlaClock.Counted(Utc(3, 29, 0), Utc(3, 29, 2), cal, []));
        var skipped = Calendar(SupportDays.Sunday, 2, 10, 2, 50, Berlin);
        Assert.Equal(TimeSpan.Zero, SlaClock.Counted(Utc(3, 29, 0), Utc(3, 29, 4), skipped, []));
    }

    [Fact]
    public void Repeated_boundaries_include_both_occurrences_without_double_counting_overlapping_windows()
    {
        var repeated = Calendar(SupportDays.Sunday, 2, 10, 2, 50, Berlin);
        Assert.Equal(TimeSpan.FromMinutes(100), SlaClock.Counted(Utc(10, 25, 0), Utc(10, 25, 3), repeated, []));
        Assert.Equal(Utc(10, 25, 1, 50), SlaClock.Deadline(Utc(10, 25, 0), 100, repeated, []));

        // Saturday's overnight end is the later02:10; Sunday's start is the earlier02:20, so UTC windows overlap.
        var overlapping = Calendar(SupportDays.Saturday | SupportDays.Sunday, 2, 20, 2, 10, Berlin);
        var start = Utc(10, 24, 0, 20);
        var end = Utc(10, 26, 1, 10);
        Assert.Equal(end - start, SlaClock.Counted(start, end, overlapping, []));
        Assert.Equal(end, SlaClock.Deadline(start, (int)(end - start).TotalMinutes, overlapping, []));
    }

    [Fact]
    public void Overnight_pauses_are_subtracted_once_and_equal_hours_are_not_inferred_as_all_day()
    {
        var cal = Calendar(SupportDays.Friday, 22, 0, 6, 0);
        var pauses = SlaClock.Merge([new(Utc(10, 23, 23), Utc(10, 24, 1)), new(Utc(10, 24, 0), Utc(10, 24, 2))]);
        Assert.Equal(Utc(10, 24, 4), SlaClock.Deadline(Utc(10, 23, 22), 180, cal, pauses));
        Assert.Equal(TimeSpan.FromHours(5), SlaClock.Counted(Utc(10, 23, 22), Utc(10, 24, 6), cal, pauses));
        var equal = Calendar(SupportDays.Friday, 22, 0, 22, 0);
        Assert.False(equal.Complete);
        Assert.Null(SlaClock.Deadline(Utc(10, 23, 22), 1, equal, []));
    }

    [Fact]
    public void Overnight_case_snapshot_produces_measurable_met_and_breached_results()
    {
        var c = new Case
        {
            Scope = WorkScope.Client, ClientId = 1, ContractId = 1, Status = CaseStatus.InProgress, Priority = Priority.High,
            CreatedAt = Utc(10, 23, 23), SlaPriority = Priority.High, SlaBasis = SlaBasis.SupportHours,
            SlaResponseMinutes = 120, SlaResolutionMinutes = 180, SlaSupportDays = SupportDays.Friday,
            SlaSupportFrom = new TimeOnly(22, 0), SlaSupportTo = new TimeOnly(6, 0), SlaTimeZone = "UTC",
            FirstResponseAt = Utc(10, 24, 1), ResolvedAt = Utc(10, 24, 2, 1)
        };
        CaseSla.Evaluate(c, [], Utc(10, 24, 3), null);
        Assert.Equal(SlaState.Met, c.ResponseSlaStatus);
        Assert.Equal(SlaState.Breached, c.ResolutionSlaStatus);
        Assert.Equal(Utc(10, 24, 1), c.ResponseDueAt);
        Assert.Equal(Utc(10, 24, 2), c.ResolutionDueAt);
    }
}

[Collection("hub")]
public class Stage2SlaRecoveryTests(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Sweep_repairs_recorded_overnight_calendars_past_invalid_rows_without_resnapshotting_or_repeating_unmeasurable_history()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var project = await m.Create("/projects", new { clientId = client, code = U("NIGHT"), name = "Overnight recovery", ownerUserId = m.UserId, status = "Active" });
        var contract = await m.Create("/contracts", new
        {
            clientId = client, projectId = project, title = "Night support", type = "SlaSupport", status = "Active", ownerUserId = m.UserId,
            currency = "AED", supportDays = new[] { "Friday" }, supportFrom = "22:00:00", supportTo = "06:00:00", supportTimeZone = "UTC",
            slaTargets = new[] { new { priority = "High", responseMinutes = 60, resolutionMinutes = 180, basis = "SupportHours" } },
            penaltyClauses = new[] { new { name = "Response", trigger = "ResponseSlaBreached", calculation = "FixedPerBreach", fixedAmount = 80m } }
        });
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        // More bad zones than a repair batch must not prevent a later valid snapshot from being repaired.
        db.Cases.AddRange(Enumerable.Range(0, 501).Select(i => new Case
        {
            Title = $"Invalid legacy zone {i}", Type = "Incident", Scope = WorkScope.Client, ClientId = client, ContractId = contract,
            Priority = Priority.High, NextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        }));
        await db.SaveChangesAsync();
        await db.Cases.Where(c => c.ContractId == contract).ExecuteUpdateAsync(s => s
            .SetProperty(c => c.SlaTimeZone, "Invalid/LegacyZone").SetProperty(c => c.ResponseDueAt, (DateTimeOffset?)null).SetProperty(c => c.ResolutionDueAt, (DateTimeOffset?)null)
            .SetProperty(c => c.ResponseSlaStatus, SlaState.NotMeasurable).SetProperty(c => c.ResolutionSlaStatus, SlaState.NotMeasurable));
        db.ChangeTracker.Clear();
        db.Cases.AddRange(Enumerable.Range(0, 501).Select(i => new Case
        {
            Title = $"Unreachable legacy target {i}", Type = "Incident", Scope = WorkScope.Client, ClientId = client, ContractId = contract,
            Priority = Priority.High, NextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        }));
        await db.SaveChangesAsync();
        await db.Cases.Where(c => c.ContractId == contract && c.Title.StartsWith("Unreachable legacy target")).ExecuteUpdateAsync(s => s
            .SetProperty(c => c.SlaSupportFrom, new TimeOnly(23, 59)).SetProperty(c => c.SlaSupportTo, new TimeOnly(0, 0))
            .SetProperty(c => c.SlaResponseMinutes, 525600).SetProperty(c => c.SlaResolutionMinutes, 525600)
            .SetProperty(c => c.ResponseDueAt, (DateTimeOffset?)null).SetProperty(c => c.ResolutionDueAt, (DateTimeOffset?)null)
            .SetProperty(c => c.ResponseSlaStatus, SlaState.NotMeasurable).SetProperty(c => c.ResolutionSlaStatus, SlaState.NotMeasurable));
        db.ChangeTracker.Clear();
        var opened = new DateTimeOffset(2026, 10, 16, 23, 0, 0, TimeSpan.Zero); // Friday23:00 UTC.
        var valid = new Case { Title = "Repair valid overnight", Type = "Incident", Scope = WorkScope.Client, ClientId = client, ContractId = contract, Priority = Priority.High, NextReviewAt = DateTimeOffset.UtcNow.AddDays(1) };
        var historical = new Case { Title = "No recorded actuals", Type = "Incident", Scope = WorkScope.Client, ClientId = client, ContractId = contract, Priority = Priority.High, NextReviewAt = DateTimeOffset.UtcNow.AddDays(1) };
        db.Cases.AddRange(valid, historical);
        await db.SaveChangesAsync();
        var snapshot = valid.PenaltyTermsSnapshotJson;
        var validId = valid.Id;
        var historicalId = historical.Id;
        await db.Cases.Where(c => c.Id == validId || c.Id == historicalId).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, opened)
            .SetProperty(c => c.ResponseDueAt, (DateTimeOffset?)null).SetProperty(c => c.ResolutionDueAt, (DateTimeOffset?)null)
            .SetProperty(c => c.ResponseSlaStatus, SlaState.NotMeasurable).SetProperty(c => c.ResolutionSlaStatus, SlaState.NotMeasurable)
            .SetProperty(c => c.Status, CaseStatus.Closed).SetProperty(c => c.SlaCalculatedAt, opened.AddDays(1)));
        await db.Cases.Where(c => c.Id == validId).ExecuteUpdateAsync(s => s.SetProperty(c => c.FirstResponseAt, opened.AddMinutes(61)).SetProperty(c => c.ResolvedAt, opened.AddHours(3)));
        await db.Cases.Where(c => c.Id == historicalId).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, opened.AddYears(-10)));
        await db.Set<ContractPenaltyClause>().Where(c => c.ContractId == contract).ExecuteUpdateAsync(s => s.SetProperty(c => c.FixedAmount, 500m));
        db.ChangeTracker.Clear();

        await SlaSweep.SweepAsync(db, DateTimeOffset.UtcNow, CancellationToken.None);
        db.ChangeTracker.Clear();
        var repaired = await db.Cases.SingleAsync(c => c.Id == validId);
        Assert.Equal(SlaState.Breached, repaired.ResponseSlaStatus);
        Assert.Equal(SlaState.Met, repaired.ResolutionSlaStatus);
        Assert.Equal(opened.AddHours(1), repaired.ResponseDueAt);
        Assert.Equal(opened.AddHours(3), repaired.ResolutionDueAt);
        Assert.Equal(snapshot, repaired.PenaltyTermsSnapshotJson);
        var old = await db.Cases.SingleAsync(c => c.Id == historicalId);
        Assert.Equal(SlaState.NotMeasurable, old.ResponseSlaStatus);
        Assert.Equal(SlaState.NotMeasurable, old.ResolutionSlaStatus);
        Assert.NotNull(old.ResponseDueAt);
        Assert.NotNull(old.ResolutionDueAt);
        var calculated = old.SlaCalculatedAt;
        db.ChangeTracker.Clear();
        await SlaSweep.SweepAsync(db, DateTimeOffset.UtcNow.AddMinutes(1), CancellationToken.None);
        db.ChangeTracker.Clear();
        Assert.Equal(calculated, (await db.Cases.SingleAsync(c => c.Id == historicalId)).SlaCalculatedAt);
    }
}
