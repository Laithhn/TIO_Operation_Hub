using TioHub.Api.Common;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>A61: the contractual SLA calculator — calendars, deadlines, pauses and outcome states (no database).</summary>
public class SlaClockTests
{
    private static readonly TimeZoneInfo Dubai = TimeZoneInfo.FindSystemTimeZoneById("Asia/Dubai");
    private static readonly TimeZoneInfo Berlin = TimeZoneInfo.FindSystemTimeZoneById("Europe/Berlin");
    private static readonly SupportDays SunThu = SupportDays.Sunday | SupportDays.Monday | SupportDays.Tuesday | SupportDays.Wednesday | SupportDays.Thursday;
    private static readonly SupportDays MonFri = SupportDays.Monday | SupportDays.Tuesday | SupportDays.Wednesday | SupportDays.Thursday | SupportDays.Friday;
    private static SlaCalendar Office(TimeZoneInfo z, SupportDays d) => new(false, d, new TimeOnly(8, 0), new TimeOnly(17, 0), z);
    private static DateTimeOffset Local(int y, int m, int d, int h, int min, TimeZoneInfo z) => new(new DateTime(y, m, d, h, min, 0), z.GetUtcOffset(new DateTime(y, m, d, h, min, 0)));

    [Fact]
    public void Round_the_clock_adds_plain_minutes()
    {
        var start = new DateTimeOffset(2026, 10, 22, 22, 30, 0, TimeSpan.Zero);
        Assert.Equal(start.AddMinutes(240), SlaClock.Deadline(start, 240, SlaCalendar.AllDay, []));
        Assert.Equal(TimeSpan.FromMinutes(90), SlaClock.Counted(start, start.AddMinutes(90), SlaCalendar.AllDay, []));
    }

    [Fact]
    public void Support_hours_skip_the_weekend_and_the_night()
    {
        // Thursday 16:00 Dubai + 2 support hours = Sunday 09:00 (Friday and Saturday are not support days).
        var start = Local(2026, 10, 22, 16, 0, Dubai);
        Assert.Equal(Local(2026, 10, 25, 9, 0, Dubai), SlaClock.Deadline(start, 120, Office(Dubai, SunThu), []));
        // Opened on Friday: the clock starts on Sunday 08:00.
        Assert.Equal(Local(2026, 10, 25, 8, 30, Dubai), SlaClock.Deadline(Local(2026, 10, 23, 10, 0, Dubai), 30, Office(Dubai, SunThu), []));
        // Counted time between Thursday 16:00 and Sunday 09:00 is the two support hours.
        Assert.Equal(TimeSpan.FromMinutes(120), SlaClock.Counted(start, Local(2026, 10, 25, 9, 0, Dubai), Office(Dubai, SunThu), []));
    }

    [Fact]
    public void Daylight_saving_change_keeps_local_support_hours()
    {
        // Berlin switches to summer time on Sunday 29 March 2026. Friday 16:00 + 2 support hours = Monday 09:00 summer time (07:00 UTC).
        var deadline = SlaClock.Deadline(Local(2026, 3, 27, 16, 0, Berlin), 120, Office(Berlin, MonFri), [])!.Value;
        Assert.Equal(new DateTimeOffset(2026, 3, 30, 7, 0, 0, TimeSpan.Zero), deadline.ToUniversalTime());
    }

    [Fact]
    public void Pauses_move_the_deadline_and_overlaps_count_once()
    {
        var start = new DateTimeOffset(2026, 10, 22, 8, 0, 0, TimeSpan.Zero);
        var pauses = SlaClock.Merge([new(start.AddMinutes(30), start.AddMinutes(90)), new(start.AddMinutes(60), start.AddMinutes(120))]);
        Assert.Single(pauses);
        Assert.Equal(start.AddMinutes(150), SlaClock.Deadline(start, 60, SlaCalendar.AllDay, pauses));
        Assert.Equal(TimeSpan.FromMinutes(60), SlaClock.Counted(start, start.AddMinutes(150), SlaCalendar.AllDay, pauses));
    }

    [Fact]
    public void An_incomplete_calendar_has_no_deadline()
    {
        Assert.False(new SlaCalendar(false, SupportDays.None, new TimeOnly(8, 0), new TimeOnly(17, 0), Dubai).Complete);
        Assert.Null(SlaClock.Deadline(DateTimeOffset.UtcNow, 60, new SlaCalendar(false, SunThu, null, null, Dubai), []));
    }
}

public class CaseSlaTests
{
    private static readonly DateTimeOffset Opened = new(2026, 10, 22, 6, 0, 0, TimeSpan.Zero);

    private static Case Measured(int response = 60, int resolution = 480, SlaBasis basis = SlaBasis.CalendarHours) => new()
    {
        Scope = WorkScope.Client, ClientId = 1, ContractId = 1, Status = CaseStatus.InProgress, Priority = Priority.High, CreatedAt = Opened,
        SlaPriority = Priority.High, SlaResponseMinutes = response, SlaResolutionMinutes = resolution, SlaBasis = basis, SlaContractRef = "CT-1", SlaAppliedAt = Opened
    };

    [Theory]
    [InlineData(59, SlaState.Met)]
    [InlineData(60, SlaState.Met)]      // exactly at the deadline counts as met
    [InlineData(61, SlaState.Breached)]
    public void First_response_before_at_and_after_the_deadline(int minutes, SlaState expected)
    {
        var c = Measured();
        c.FirstResponseAt = Opened.AddMinutes(minutes);
        CaseSla.Evaluate(c, [], Opened.AddHours(3), null);
        Assert.Equal(expected, c.ResponseSlaStatus);
        Assert.Equal(Opened.AddMinutes(60), c.ResponseDueAt);
        Assert.Equal(minutes, c.ResponseElapsedMinutes);
    }

    [Fact]
    public void Without_a_response_it_is_pending_until_the_deadline_then_breached()
    {
        var c = Measured();
        CaseSla.Evaluate(c, [], Opened.AddMinutes(30), null);
        Assert.Equal(SlaState.Pending, c.ResponseSlaStatus);
        CaseSla.Evaluate(c, [], Opened.AddMinutes(61), null);
        Assert.Equal(SlaState.Breached, c.ResponseSlaStatus);
        Assert.Equal(SlaState.Breached, CaseSla.Now(SlaState.Pending, Opened.AddMinutes(60), Opened.AddMinutes(61)));
    }

    [Theory]
    [InlineData(479, SlaState.Met)]
    [InlineData(480, SlaState.Met)]
    [InlineData(481, SlaState.Breached)]
    public void Resolution_before_at_and_after_the_deadline(int minutes, SlaState expected)
    {
        var c = Measured();
        c.ResolvedAt = Opened.AddMinutes(minutes);
        c.Status = CaseStatus.PendingValidation;
        CaseSla.Evaluate(c, [], Opened.AddDays(1), null);
        Assert.Equal(expected, c.ResolutionSlaStatus);
    }

    [Fact]
    public void Missing_contract_target_basis_or_calendar_is_never_counted_as_met()
    {
        var none = Measured(); none.ContractId = null;
        CaseSla.Evaluate(none, [], Opened.AddHours(1), null);
        Assert.Equal(SlaState.NotApplicable, none.ResponseSlaStatus);
        Assert.Contains("No contract", none.SlaNote);

        var noTarget = Measured(); noTarget.SlaResponseMinutes = null;
        CaseSla.Evaluate(noTarget, [], Opened.AddHours(1), null);
        Assert.Equal(SlaState.NotMeasurable, noTarget.ResponseSlaStatus);
        Assert.Equal(SlaState.Pending, noTarget.ResolutionSlaStatus);

        var noBasis = Measured(basis: SlaBasis.Unknown);
        CaseSla.Evaluate(noBasis, [], Opened.AddHours(1), null);
        Assert.Equal(SlaState.NotMeasurable, noBasis.ResponseSlaStatus);

        var noHours = Measured(basis: SlaBasis.SupportHours); noHours.SlaTimeZone = "Asia/Dubai";
        CaseSla.Evaluate(noHours, [], Opened.AddHours(1), null);
        Assert.Equal(SlaState.NotMeasurable, noHours.ResolutionSlaStatus);
        Assert.Contains("support days and hours", noHours.SlaNote);
    }

    [Fact]
    public void Internal_and_cancelled_cases_are_not_applicable()
    {
        var internalCase = Measured(); internalCase.Scope = WorkScope.Internal; internalCase.ClientId = null;
        var cancelled = Measured(); cancelled.Status = CaseStatus.Cancelled;
        CaseSla.Evaluate(internalCase, [], Opened.AddHours(1), null);
        CaseSla.Evaluate(cancelled, [], Opened.AddHours(1), null);
        Assert.Equal(SlaState.NotApplicable, internalCase.ResponseSlaStatus);
        Assert.Equal(SlaState.NotApplicable, cancelled.ResolutionSlaStatus);
    }

    [Fact]
    public void Waiting_on_the_customer_pauses_only_when_the_contract_says_so()
    {
        var waits = new[]
        {
            new CaseWaitingInterval { Reason = WaitingReason.Customer, StartedAt = Opened.AddMinutes(10), EndedAt = Opened.AddMinutes(70) },
            new CaseWaitingInterval { Reason = WaitingReason.Vendor, StartedAt = Opened.AddMinutes(100), EndedAt = Opened.AddMinutes(200) }
        };
        var paused = Measured(); paused.SlaPauseOnCustomerWaiting = true;
        CaseSla.Evaluate(paused, waits, Opened.AddMinutes(30), null);
        Assert.Equal(Opened.AddMinutes(120), paused.ResponseDueAt);   // 60 minutes of customer waiting added; vendor waiting is not a pause
        Assert.Equal(SlaState.Pending, paused.ResponseSlaStatus);

        var notPaused = Measured();
        CaseSla.Evaluate(notPaused, waits, Opened.AddMinutes(30), null);
        Assert.Equal(Opened.AddMinutes(60), notPaused.ResponseDueAt);

        // An open wait runs until now: the deadline keeps moving while the case waits.
        var open = Measured(); open.SlaPauseOnCustomerWaiting = true;
        CaseSla.Evaluate(open, [new CaseWaitingInterval { Reason = WaitingReason.Customer, StartedAt = Opened.AddMinutes(10) }], Opened.AddHours(5), null);
        Assert.Equal(SlaState.Pending, open.ResponseSlaStatus);
        Assert.Equal(Opened.AddHours(5).AddMinutes(50), open.ResponseDueAt);
    }

    [Fact]
    public void Cases_opened_before_first_response_tracking_are_not_measured_unless_a_response_is_recorded()
    {
        var c = Measured();
        CaseSla.Evaluate(c, [], Opened.AddHours(5), trackingFrom: Opened.AddDays(1));
        Assert.Equal(SlaState.NotMeasurable, c.ResponseSlaStatus);
        Assert.Equal(SlaState.Pending, c.ResolutionSlaStatus); // resolution is measured from the lifecycle regardless of tracking
        c.FirstResponseAt = Opened.AddMinutes(20);
        CaseSla.Evaluate(c, [], Opened.AddHours(5), trackingFrom: Opened.AddDays(1));
        Assert.Equal(SlaState.Met, c.ResponseSlaStatus);

        // Closed before resolution times were recorded: no reliable resolution instant.
        var old = Measured(); old.Status = CaseStatus.Closed;
        CaseSla.Evaluate(old, [], Opened.AddDays(2), trackingFrom: Opened.AddDays(1));
        Assert.Equal(SlaState.NotMeasurable, old.ResolutionSlaStatus);
    }

    [Fact]
    public void Business_hours_from_the_contract_snapshot_decide_the_deadline()
    {
        var c = Measured(basis: SlaBasis.SupportHours);
        c.SlaSupportDays = SupportDays.Sunday | SupportDays.Monday | SupportDays.Tuesday | SupportDays.Wednesday | SupportDays.Thursday;
        c.SlaSupportFrom = new TimeOnly(8, 0); c.SlaSupportTo = new TimeOnly(17, 0); c.SlaTimeZone = "Asia/Dubai";
        c.CreatedAt = new DateTimeOffset(2026, 10, 22, 12, 0, 0, TimeSpan.Zero); // Thursday 16:00 in Dubai
        CaseSla.Evaluate(c, [], c.CreatedAt.AddMinutes(5), null);
        Assert.Equal(new DateTimeOffset(2026, 10, 22, 13, 0, 0, TimeSpan.Zero), c.ResponseDueAt);   // 16:00-17:00 Thursday = the 60 response minutes
        // 480 resolution minutes: 60 on Thursday, then 420 from Sunday 08:00 = Sunday 15:00 Dubai = 11:00 UTC.
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 11, 0, 0, TimeSpan.Zero), c.ResolutionDueAt);
    }

    [Fact]
    public void Evaluation_is_idempotent()
    {
        var c = Measured();
        c.FirstResponseAt = Opened.AddMinutes(10);
        Assert.True(CaseSla.Evaluate(c, [], Opened.AddHours(1), null));
        Assert.False(CaseSla.Evaluate(c, [], Opened.AddHours(1), null));
    }
}
