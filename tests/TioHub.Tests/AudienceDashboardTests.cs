using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json.Nodes;
using TioHub.Api.Common;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Reporting;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A108/A109: the rules behind the client signals, the SLA clocks and the period arithmetic (no database).</summary>
public class AudienceDashboardRules
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = new(2026, 11, 10);
    private static readonly SignalSettings S = new(90, 14, null);
    private static string State(List<Signal> s, string key) => s.Single(x => x.Key == key).State;
    private static ContractFact K(ContractStatus st = ContractStatus.Active, DateOnly? end = null) => new(1, "CT-1", "Contract", "Support", st, new DateOnly(2026, 1, 1), end ?? new DateOnly(2028, 1, 1), 30, "AED");
    private static MilestoneFact M(int daysFromToday, int? percent) => new(1, "CT-1", ContractStatus.Active, 0, "Phase", null, Today.AddDays(daysFromToday), percent);
    private static StatusFact St(ReportedStatus s, int ageDays = 1, DateOnly? next = null) => new(1, s, "Because", next, Now.AddDays(-ageDays), "PM");

    [Fact]
    public void Client_360_years_are_any_set_of_calendar_years_or_all()
    {
        // Empty = this year, in the reader's time zone: 31 Dec 22:00 UTC is already 2027 in Dubai.
        var dubai = Zones.Find("Asia/Dubai")!;
        var eve = new DateTimeOffset(2026, 12, 31, 22, 0, 0, TimeSpan.Zero);
        Assert.Equal([2026], YearSelection.Parse(null, Now, dubai).Years);
        Assert.Equal([2027], YearSelection.Parse("", eve, dubai).Years);

        // Several years ticked together, in any order, need not be adjacent.
        var gap = YearSelection.Parse("2026, 2024,2026", Now, dubai);
        Assert.Equal([2024, 2026], gap.Years);
        Assert.False(gap.Contiguous);
        Assert.Equal("2024, 2026", gap.Label);
        Assert.True(gap.Contains(new DateOnly(2024, 3, 1)));
        Assert.False(gap.Contains(new DateOnly(2025, 3, 1)));
        // Year boundaries follow the reader's time zone: 31 Dec 2025 21:00 UTC is 1 Jan 2026 in Dubai, 19:00 UTC is still 2025 there.
        Assert.True(gap.Contains(new DateTimeOffset(2025, 12, 31, 21, 0, 0, TimeSpan.Zero)));
        Assert.False(gap.Contains(new DateTimeOffset(2025, 12, 31, 19, 0, 0, TimeSpan.Zero)));
        Assert.True(gap.Contains(new DateTimeOffset(2023, 12, 31, 20, 0, 0, TimeSpan.Zero)));
        Assert.Equal(new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.FromHours(4)), gap.Bounds!.Value.From);
        Assert.Equal(new DateTimeOffset(2027, 1, 1, 0, 0, 0, TimeSpan.FromHours(4)), gap.Bounds!.Value.To);

        // A period overlaps when any selected year falls inside it; an unknown end is open-ended.
        Assert.True(gap.Overlaps(new DateOnly(2025, 6, 1), new DateOnly(2026, 2, 1)));
        Assert.False(gap.Overlaps(new DateOnly(2025, 1, 1), new DateOnly(2025, 12, 31)));
        Assert.True(gap.Overlaps(new DateOnly(2020, 1, 1), null));
        Assert.True(gap.Overlaps(null, null));

        var range = YearSelection.Parse("2025,2026", Now, TimeZoneInfo.Utc);
        Assert.True(range.Contiguous);
        Assert.Equal("2025–2026", range.Label);
        var all = YearSelection.Parse("ALL", Now, TimeZoneInfo.Utc);
        Assert.True(all.All);
        Assert.Null(all.Bounds);
        Assert.True(all.Contains(new DateOnly(2001, 1, 1)));

        // Anything else is refused, not guessed.
        foreach (var bad in new[] { "abc", "1999", "2040", "2026;2025", "-2026", ",", "2026.5" })
            Assert.Equal("years", Assert.Throws<ValidationException>(() => YearSelection.Parse(bad, Now, TimeZoneInfo.Utc)).Errors.Keys.Single());
    }

    [Fact]
    public void Payments_dashboard_buckets_years_and_client_selection()
    {
        PaymentRow R(PaymentStatus s, DateOnly? due, DateOnly? paid = null, ContractStatus k = ContractStatus.Active, decimal? amount = 100m, string currency = "AED") =>
            new() { Status = s, DueDate = due, PaidOn = paid, ContractStatus = k, Amount = amount, Currency = currency };
        // Paid / Upcoming (due soon or later) / Overdue; waived, terminated and undated open terms are in no bucket.
        Assert.Equal("paid", PaymentsDashboard.BucketOf(R(PaymentStatus.Paid, Today.AddDays(-3), Today), Today, 14));
        Assert.Equal("overdue", PaymentsDashboard.BucketOf(R(PaymentStatus.Invoiced, Today.AddDays(-1)), Today, 14));
        Assert.Equal("upcoming", PaymentsDashboard.BucketOf(R(PaymentStatus.Pending, Today), Today, 14));
        Assert.Equal("upcoming", PaymentsDashboard.BucketOf(R(PaymentStatus.Pending, Today.AddDays(300)), Today, 14));
        Assert.Null(PaymentsDashboard.BucketOf(R(PaymentStatus.Pending, null), Today, 14));
        Assert.Null(PaymentsDashboard.BucketOf(R(PaymentStatus.Waived, Today.AddDays(-9)), Today, 14));
        Assert.Null(PaymentsDashboard.BucketOf(R(PaymentStatus.Pending, Today.AddDays(-9), k: ContractStatus.Terminated), Today, 14));
        // A paid term counts in the year it was paid, else its due year (A113 rule).
        Assert.Equal(new DateOnly(2026, 1, 4), PaymentsDashboard.YearDate(R(PaymentStatus.Paid, new DateOnly(2025, 12, 20), new DateOnly(2026, 1, 4))));
        Assert.Equal(new DateOnly(2025, 12, 20), PaymentsDashboard.YearDate(R(PaymentStatus.Paid, new DateOnly(2025, 12, 20))));
        Assert.Equal(new DateOnly(2025, 12, 20), PaymentsDashboard.YearDate(R(PaymentStatus.Invoiced, new DateOnly(2025, 12, 20))));
        // Amounts per currency, never added together; terms without an amount are counted only.
        var part = PaymentsDashboard.PartOf([R(PaymentStatus.Paid, Today, amount: 50m), R(PaymentStatus.Paid, Today, amount: 25m), R(PaymentStatus.Paid, Today, amount: 70m, currency: "USD"), R(PaymentStatus.Paid, Today, amount: null)]);
        Assert.Equal(4, part.Count);
        Assert.Equal([new PaymentsDashboard.Amount("AED", 75m), new PaymentsDashboard.Amount("USD", 70m)], part.Amounts);
        // Client selection: empty = all clients; IDs in any order, repeated once; anything else is refused.
        Assert.Empty(PaymentsDashboard.ParseClients(null));
        Assert.Equal([3L, 7L], PaymentsDashboard.ParseClients(" 7,3,7 "));
        foreach (var bad in new[] { "x", "-1", "0", "1;2", "1.5" })
            Assert.Equal("clientIds", Assert.Throws<ValidationException>(() => PaymentsDashboard.ParseClients(bad)).Errors.Keys.Single());
        Assert.Throws<ValidationException>(() => PaymentsDashboard.ParseClients(string.Join(",", Enumerable.Range(1, PaymentsDashboard.MaxClients + 1))));
        // Owners and products the same way; currencies are codes, compared without case.
        Assert.Equal([5L], PaymentsDashboard.Filters.Parse(null, null, "5", null, null).OwnerIds);
        Assert.Equal("ownerIds", Assert.Throws<ValidationException>(() => PaymentsDashboard.Filters.Parse(null, null, "me", null, null)).Errors.Keys.Single());
        Assert.Equal("productIds", Assert.Throws<ValidationException>(() => PaymentsDashboard.Filters.Parse(null, null, null, "x", null)).Errors.Keys.Single());
        Assert.Equal(["AED", "USD"], PaymentsDashboard.ParseCurrencies("usd, AED,Usd"));
        foreach (var bad in new[] { "US D", "€", "TOOLONGCODE1", "A;B" })
            Assert.Equal("currencies", Assert.Throws<ValidationException>(() => PaymentsDashboard.ParseCurrencies(bad)).Errors.Keys.Single());
    }

    [Fact]
    public void A_client_without_records_is_unknown_never_on_track()
    {
        var signals = ClientSignals.Evaluate(new ClientFacts(), Now, S);
        Assert.Equal(ClientSignals.Keys, signals.Select(x => x.Key));
        foreach (var key in new[] { "delivery", "sla", "commercial", "environments", "review" }) Assert.Equal(SignalState.Unknown, State(signals, key));
        // No escalation and no commitment are known facts, not missing data.
        Assert.Equal(SignalState.OnTrack, State(signals, "escalations"));
        Assert.Equal(SignalState.OnTrack, State(signals, "commitments"));
        Assert.Equal("NoStatus", ClientSignals.Compare(null, signals, Now, 14).Agreement);
        Assert.All(signals, x => Assert.False(string.IsNullOrWhiteSpace(x.Rule)));
    }

    [Fact]
    public void Delivery_follows_late_milestones_of_active_contracts()
    {
        string Delivery(params MilestoneFact[] ms) => State(ClientSignals.Evaluate(new ClientFacts { Contracts = [K()], Milestones = [.. ms] }, Now, S), "delivery");
        Assert.Equal(SignalState.OnTrack, Delivery(M(-40, 100), M(20, 0)));
        Assert.Equal(SignalState.Watch, Delivery(M(-9, 70), M(20, 0)));
        Assert.Equal(SignalState.OffTrack, Delivery(M(-31, 70)));
        Assert.Equal(SignalState.OffTrack, Delivery(M(-3, 10), M(-2, null)));
        // A milestone of a contract that is not Active is not judged.
        Assert.Equal(SignalState.Unknown, Delivery(M(-9, 0) with { ContractStatus = ContractStatus.Draft }));
        Assert.Equal("Late", ClientSignals.MilestoneState(M(-1, 99), Today));
        Assert.Equal("Done", ClientSignals.MilestoneState(M(-1, 100), Today));
        Assert.Equal("Planned", ClientSignals.MilestoneState(M(1, 0), Today));
    }

    [Fact]
    public void Sla_commercial_escalation_commitment_and_environment_rules()
    {
        CaseFact C(SlaState response, SlaState resolution, CaseStatus st = CaseStatus.Closed) => new(1, "CS-1", "Case", Priority.High, st, Now.AddDays(-10), null, 1, null, response, Now.AddDays(-9), resolution, Now.AddDays(-8));
        string Sla(params CaseFact[] cs) => State(ClientSignals.Evaluate(new ClientFacts { Cases = [.. cs] }, Now, S), "sla");
        Assert.Equal(SignalState.OnTrack, Sla(C(SlaState.Met, SlaState.Met)));
        // 9 of 10 resolutions met = 90 % (on the objective); 8 of 10 = 80 % (under); 7 of 10 = 70 % (more than 10 points under).
        Assert.Equal(SignalState.OnTrack, Sla([.. Enumerable.Repeat(C(SlaState.Met, SlaState.Met), 9), C(SlaState.Met, SlaState.Breached)]));
        Assert.Equal(SignalState.Watch, Sla([.. Enumerable.Repeat(C(SlaState.Met, SlaState.Met), 8), .. Enumerable.Repeat(C(SlaState.Met, SlaState.Breached), 2)]));
        Assert.Equal(SignalState.OffTrack, Sla([.. Enumerable.Repeat(C(SlaState.Met, SlaState.Met), 7), .. Enumerable.Repeat(C(SlaState.Met, SlaState.Breached), 3)]));
        // A pending obligation past its deadline counts as breached; not measurable is never counted as met.
        Assert.Equal(SignalState.OffTrack, Sla(C(SlaState.Pending, SlaState.Pending, CaseStatus.InProgress)));
        Assert.Equal(SignalState.Unknown, Sla(C(SlaState.NotMeasurable, SlaState.NotMeasurable)));

        var overdue = new PaymentFact(1, 1, "CT-1", ContractStatus.Active, 0, "Milestone 3", 100m, "AED", Today.AddDays(-21), PaymentStatus.Invoiced, null);
        string Commercial(ClientFacts f) => State(ClientSignals.Evaluate(f, Now, S), "commercial");
        Assert.Equal(SignalState.OnTrack, Commercial(new ClientFacts { Contracts = [K()] }));
        Assert.Equal(SignalState.OffTrack, Commercial(new ClientFacts { Contracts = [K()], Payments = [overdue] }));
        Assert.Equal(SignalState.OnTrack, Commercial(new ClientFacts { Contracts = [K()], Payments = [overdue with { Status = PaymentStatus.Paid }] }));
        Assert.Equal(SignalState.Watch, Commercial(new ClientFacts { Contracts = [K(end: Today.AddDays(40))] }));
        Assert.Equal(SignalState.OffTrack, Commercial(new ClientFacts { Contracts = [K(end: Today.AddDays(-2))] }));

        EscFact E(int level, DateTimeOffset? resolutionDue = null) => new(1, "ESC-1", "Escalation", level, TioHub.Api.Modules.Escalations.EscalationStatus.Acknowledged, Now.AddDays(-2), null, resolutionDue, "PM");
        string Esc(params EscFact[] es) => State(ClientSignals.Evaluate(new ClientFacts { Escalations = [.. es] }, Now, S), "escalations");
        Assert.Equal(SignalState.Watch, Esc(E(2)));
        Assert.Equal(SignalState.OffTrack, Esc(E(3)));
        Assert.Equal(SignalState.OffTrack, Esc(E(1, Now.AddHours(-1))));

        string Com(params double[] dueInHours) => State(ClientSignals.Evaluate(new ClientFacts { Commitments = [.. dueInHours.Select(h => new CommitFact(1, "CM-1", "x", Now.AddHours(h), null))] }, Now, S), "commitments");
        Assert.Equal(SignalState.OnTrack, Com(72));
        Assert.Equal(SignalState.Watch, Com(20));
        Assert.Equal(SignalState.OffTrack, Com(-1, 72));

        EnvFact Env(Condition c, int observedDaysAgo = 1) => new(1, "Production", "Production", EnvironmentType.Production, c, c == Condition.Unknown ? null : Now.AddDays(-observedDaysAgo), null);
        string Envs(params EnvFact[] es) => State(ClientSignals.Evaluate(new ClientFacts { Environments = [.. es] }, Now, S), "environments");
        Assert.Equal(SignalState.OnTrack, Envs(Env(Condition.Healthy)));
        Assert.Equal(SignalState.Watch, Envs(Env(Condition.Healthy), Env(Condition.Degraded)));
        Assert.Equal(SignalState.Watch, Envs(Env(Condition.Healthy), Env(Condition.Unknown)));
        Assert.Equal(SignalState.OffTrack, Envs(Env(Condition.Unavailable)));
        Assert.Equal(SignalState.Unknown, Envs(Env(Condition.Unknown)));
    }

    [Fact]
    public void The_recorded_status_is_compared_with_the_signals_and_goes_stale()
    {
        var overdue = new PaymentFact(1, 1, "CT-1", ContractStatus.Active, 0, "Milestone 3", 100m, "AED", Today.AddDays(-21), PaymentStatus.Pending, null);
        Verdict V(ClientFacts f) => ClientSignals.Compare(f.Status, ClientSignals.Evaluate(f, Now, S), Now, 14);
        Assert.Equal("Agree", V(new ClientFacts { Contracts = [K()], Status = St(ReportedStatus.OnTrack) }).Agreement);
        var disagree = V(new ClientFacts { Contracts = [K()], Payments = [overdue], Status = St(ReportedStatus.OnTrack) });
        Assert.Equal("Disagree", disagree.Agreement);
        Assert.Contains("Commercial", disagree.Text);
        Assert.Equal("Agree", V(new ClientFacts { Contracts = [K()], Payments = [overdue], Status = St(ReportedStatus.AtRisk) }).Agreement);
        Assert.Equal("Disagree", V(new ClientFacts { Contracts = [K()], Status = St(ReportedStatus.OffTrack) }).Agreement);
        Assert.Equal("Stale", V(new ClientFacts { Contracts = [K()], Status = St(ReportedStatus.OnTrack, ageDays: 15) }).Agreement);
        Assert.Equal("Stale", V(new ClientFacts { Contracts = [K()], Status = St(ReportedStatus.OnTrack, next: Today.AddDays(-1)) }).Agreement);
        Assert.Equal(SignalState.Watch, State(ClientSignals.Evaluate(new ClientFacts { Status = St(ReportedStatus.OnTrack, ageDays: 15) }, Now, S), "review"));
    }

    [Fact]
    public void Sla_clocks_show_the_share_of_the_target_used()
    {
        Case C(double minutesAgo) => new()
        {
            ContractId = 1, Status = CaseStatus.InProgress, CreatedAt = Now.AddMinutes(-minutesAgo), SlaBasis = SlaBasis.CalendarHours, SlaResponseMinutes = 60, SlaResolutionMinutes = 480,
            ResponseSlaStatus = SlaState.Pending, ResponseDueAt = Now.AddMinutes(60 - minutesAgo), ResolutionSlaStatus = SlaState.Pending, ResolutionDueAt = Now.AddMinutes(480 - minutesAgo)
        };
        var early = SlaClocks.Of(C(30), [], Now, 25);
        Assert.Equal(["Response", "Resolution"], early.Select(x => x.Kind));
        Assert.Equal((50, 30, false, false), (early[0].UsedPercent, early[0].RemainingMinutes, early[0].AtRisk, early[0].Breached));
        var risk = SlaClocks.Of(C(50), [], Now, 25)[0];
        Assert.True(risk.AtRisk && !risk.Breached);
        var late = SlaClocks.Of(C(70), [], Now, 25)[0];
        Assert.True(late.Breached && !late.AtRisk);
        // A recorded response leaves only the resolution clock; no contract, an unknown basis or a closed case has none.
        var responded = C(30); responded.ResponseSlaStatus = SlaState.Met;
        Assert.Equal("Resolution", Assert.Single(SlaClocks.Of(responded, [], Now, 25)).Kind);
        var unknown = C(30); unknown.SlaBasis = SlaBasis.Unknown;
        Assert.Empty(SlaClocks.Of(unknown, [], Now, 25));
        var closed = C(30); closed.Status = CaseStatus.Closed;
        Assert.Empty(SlaClocks.Of(closed, [], Now, 25));
        // Waiting on the customer pauses the clock only when the contract says so.
        var paused = C(50); paused.SlaPauseOnCustomerWaiting = true;
        var wait = new CaseWaitingInterval { Reason = WaitingReason.Customer, StartedAt = Now.AddMinutes(-40), EndedAt = null };
        Assert.Equal(10, SlaClocks.Of(paused, [wait], Now, 25)[0].UsedMinutes);
    }

    [Fact]
    public void Periods_medians_and_not_measurable_reasons()
    {
        Assert.Null(ManagementDashboard.Median([]));
        Assert.Equal(2, ManagementDashboard.Median([3, 1, 2]));
        Assert.Equal(2.5, ManagementDashboard.Median([1, 2, 3, 4]));
        var (from, to, prevFrom, prevTo) = ManagementDashboard.Range("quarter", Now, TimeZoneInfo.Utc);
        Assert.Equal(new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero), from);
        Assert.Equal(Now, to);
        Assert.Equal(new DateTimeOffset(2026, 7, 1, 0, 0, 0, TimeSpan.Zero), prevFrom);
        Assert.Equal(to - from, prevTo - prevFrom);
        Assert.Equal(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero), ManagementDashboard.Range("ytd", Now, TimeZoneInfo.Utc).From);
        var (a, b) = SlaContractsDashboard.Range(null, null, null, Now, TimeZoneInfo.Utc);
        Assert.Equal(TimeSpan.FromDays(90), b - a);
        Assert.Equal("No target recorded for the priority", SlaContractsDashboard.ReasonOf("CT-1 has no response target for High priority."));
        Assert.Equal("Opened before responses were recorded", SlaContractsDashboard.ReasonOf("The case was opened before responses were recorded, and none was recorded since."));
        Assert.Equal("Support calendar incomplete", SlaContractsDashboard.ReasonOf("The contract has no support time zone."));
        Assert.Equal("Clock basis unknown", SlaContractsDashboard.ReasonOf("The SLA target does not say whether it counts calendar or support hours."));
    }
}

/// <summary>A108/A109: the four audience dashboards and the client status reports, end to end against SQL Server.</summary>
[Collection("hub")]
public class AC108_AudienceDashboards(HubFactory hub) : Scenario(hub)
{
    private static JsonNode Sig(JsonNode body, string key) => body["signals"]!.AsArray().Single(x => x!["key"]!.GetValue<string>() == key)!;
    private static int Total(Res r) => r.Body!["totalCount"]!.GetValue<int>();

    private async Task Backdate(long caseId, double minutes)
    {
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
        var at = DateTimeOffset.UtcNow.AddMinutes(-minutes);
        await db.Cases.IgnoreQueryFilters().Where(c => c.Id == caseId).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, at).SetProperty(c => c.ResponseDueAt, at.AddMinutes(60)));
    }

    [Fact]
    public async Task Client_status_is_recorded_by_people_and_checked_against_signals_across_its_projects()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var c = await NewClient();
        var empty = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional rollout", status = "Active", ownerUserId = m.UserId });
        var second = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional extension", status = "Active", ownerUserId = m.UserId });
        var k = await m.Create("/contracts", new
        {
            projectId = project, title = "Fictional implementation", contractReference = "FIC-A108", type = "SlaSupport", status = "Active", ownerUserId = m.UserId,
            startDate = "2026-01-01", endDate = "2028-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, currency = "AED",
            slaTargets = new[] { new { priority = "High", responseMinutes = 60, resolutionMinutes = 480, basis = "CalendarHours" } },
            milestones = new[]
            {
                new { phase = "Design", description = "Approved design", completionPercent = (int?)100, date = (DateOnly?)today.AddDays(-60) },
                new { phase = "UAT sign-off", description = "Client acceptance", completionPercent = (int?)70, date = (DateOnly?)today.AddDays(-9) },
                new { phase = "Go-live", description = "Production", completionPercent = (int?)0, date = (DateOnly?)today.AddDays(40) }
            },
            payments = new[] { new { condition = "Milestone 3", percentage = (decimal?)15, amount = (decimal?)180000m, dueDate = (DateOnly?)today.AddDays(-21), status = "Invoiced", paidOn = (DateOnly?)null } }
        });
        var env = await m.Create("/environments", new { clientId = c, projectId = project, name = "Production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "Test gap" });
        var onEnv = await NewCase(c, env);
        var onContract = await m.Create("/cases", new
        {
            title = "Queue stalled", type = "Incident", scope = "Client", clientId = c, contractId = k, responsibleTeamId = await Team(), impactSummary = "Delayed", priority = "High",
            nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        var direct = await NewCase(c);

        // Before anyone records a status: signals from the records, the status itself is absent — never assumed.
        var d = (await m.Get($"/dashboard/clients/{c}")).Body!;
        Assert.Null(d["status"]!["recorded"]);
        Assert.Equal("NoStatus", d["status"]!["agreement"]!.GetValue<string>());
        Assert.True(d["status"]!["canRecord"]!.GetValue<bool>());
        Assert.Equal("Watch", Sig(d, "delivery")["state"]!.GetValue<string>());
        Assert.Contains("UAT sign-off", Sig(d, "delivery")["text"]!.GetValue<string>());
        Assert.Equal($"/contracts?clientId={c}", Sig(d, "delivery")["link"]!.GetValue<string>());
        Assert.Equal("OffTrack", Sig(d, "commercial")["state"]!.GetValue<string>());
        Assert.Equal("Unknown", Sig(d, "review")["state"]!.GetValue<string>());
        Assert.Equal("Unknown", Sig(d, "environments")["state"]!.GetValue<string>());
        Assert.Equal(["Done", "Late", "Planned"], d["milestones"]!.AsArray().Select(x => x!["state"]!.GetValue<string>()));
        Assert.Equal("overdue", d["payments"]![0]!["state"]!.GetValue<string>());
        Assert.Equal(2, d["projects"]!.AsArray().Count);

        // The client's tickets: all of them, whatever project they touch — and the count equals the list it opens.
        Assert.Equal(3, d["cases"]!["open"]!.GetValue<int>());
        var list = await m.Get(d["cases"]!["link"]!.GetValue<string>() + "&pageSize=50");
        Assert.Equal(3, Total(list));
        var ids = list.Body!["items"]!.AsArray().Select(x => Id(x)).ToList();
        Assert.Contains(onEnv, ids);
        Assert.Contains(onContract, ids);
        Assert.Contains(direct, ids);

        // A113 Client 360: all years covers every record; a year without records shows none, and still says what is open elsewhere.
        var all = (await m.Get($"/dashboard/clients/{c}?years=all")).Body!;
        Assert.True(all["period"]!["all"]!.GetValue<bool>());
        Assert.Equal(3, all["tickets"]!["opened"]!.GetValue<int>());
        Assert.Equal(3, all["tickets"]!["open"]!.GetValue<int>());
        Assert.Equal(1, all["slaYears"]!["tickets"]!.GetValue<int>());
        Assert.All(all["projects"]!.AsArray(), x => Assert.True(x!["inYears"]!.GetValue<bool>()));
        Assert.True(all["payments"]![0]!["inYears"]!.GetValue<bool>());
        Assert.Equal(0, all["paymentsOverdueOtherYears"]!.GetValue<int>());
        Assert.Equal(3, (await m.Get(all["tickets"]!["link"]!.GetValue<string>() + "&pageSize=50")).Body!["totalCount"]!.GetValue<int>());
        var old = (await m.Get($"/dashboard/clients/{c}?years=2020,2022")).Body!;
        Assert.Equal([2020, 2022], old["period"]!["years"]!.AsArray().Select(x => x!.GetValue<int>()));
        Assert.False(old["period"]!["contiguous"]!.GetValue<bool>());
        Assert.Equal(0, old["tickets"]!["opened"]!.GetValue<int>());
        Assert.Equal(3, old["tickets"]!["openOtherYears"]!.GetValue<int>());
        Assert.Equal(0, old["slaYears"]!["tickets"]!.GetValue<int>());
        Assert.False(old["payments"]![0]!["inYears"]!.GetValue<bool>());
        Assert.Equal(1, old["paymentsOverdueOtherYears"]!.GetValue<int>());
        Assert.All(old["contracts"]!.AsArray(), x => Assert.False(x!["inYears"]!.GetValue<bool>()));
        // The contiguous range opens the ticket list with the same dates; this one does not, so its list is the client's.
        Assert.DoesNotContain("createdFrom", old["tickets"]!["link"]!.GetValue<string>());
        Assert.Contains("createdFrom", (await m.Get($"/dashboard/clients/{c}?years=2020,2021")).Body!["tickets"]!["link"]!.GetValue<string>());
        Assert.NotNull((await m.Get($"/dashboard/clients/{c}?years=twenty")).Error("years"));

        // A second project's late milestone counts for the same client: two late milestones are Off track.
        await m.Create("/contracts", new
        {
            projectId = second, title = "Fictional extension", contractReference = "FIC-A109", type = "SlaSupport", status = "Active", ownerUserId = m.UserId,
            startDate = "2026-01-01", endDate = "2028-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, currency = "AED",
            milestones = new[] { new { phase = "Interface build", description = "Second project", completionPercent = (int?)40, date = (DateOnly?)today.AddDays(-5) } }
        });
        d = (await m.Get($"/dashboard/clients/{c}")).Body!;
        Assert.Equal("OffTrack", Sig(d, "delivery")["state"]!.GetValue<string>());
        Assert.Contains("2 milestone(s) late", Sig(d, "delivery")["text"]!.GetValue<string>());

        // A client with no records is Unknown where data is missing.
        var e = (await m.Get($"/dashboard/clients/{empty}")).Body!;
        Assert.Equal("Unknown", Sig(e, "delivery")["state"]!.GetValue<string>());
        Assert.Equal("Unknown", Sig(e, "commercial")["state"]!.GetValue<string>());
        Assert.Equal(0, e["cases"]!["open"]!.GetValue<int>());
        Assert.Empty(e["projects"]!.AsArray());

        // Recording a status: a status and a reason are required; people without a role cannot record or read.
        Assert.NotNull((await m.Post($"/clients/{c}/status-reports", new { summary = "x" })).Error("status"));
        Assert.NotNull((await m.Post($"/clients/{c}/status-reports", new { status = "OnTrack" })).Error("summary"));
        Assert.NotNull((await m.Post($"/clients/{c}/status-reports", new { status = "OnTrack", summary = "x", nextReviewOn = today.AddDays(-5) })).Error("nextReviewOn"));
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Post($"/clients/{c}/status-reports", new { status = "OnTrack", summary = "x" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get($"/dashboard/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get("/dashboard/clients/999999999")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post("/clients/999999999/status-reports", new { status = "OnTrack", summary = "x" })).Status);

        // "On track" while a payment is overdue: the status stays as recorded and the page says the signals disagree.
        await m.Create($"/clients/{c}/status-reports", new { status = "OnTrack", summary = "Delivery is proceeding as planned.", nextReviewOn = today.AddDays(7) });
        d = (await m.Get($"/dashboard/clients/{c}")).Body!;
        Assert.Equal("OnTrack", d["status"]!["recorded"]!["status"]!.GetValue<string>());
        Assert.Equal("Disagree", d["status"]!["agreement"]!.GetValue<string>());
        Assert.Contains("Commercial", d["status"]!["agreementText"]!.GetValue<string>());
        Assert.Equal("OnTrack", Sig(d, "review")["state"]!.GetValue<string>());

        // A later report replaces it; history is kept, newest first. Another client's status is its own.
        await m.Create($"/clients/{c}/status-reports", new { status = "AtRisk", summary = "UAT sign-off is late; the milestone invoice is unpaid." });
        d = (await m.Get($"/dashboard/clients/{c}")).Body!;
        Assert.Equal("AtRisk", d["status"]!["recorded"]!["status"]!.GetValue<string>());
        Assert.Equal("Agree", d["status"]!["agreement"]!.GetValue<string>());
        var history = (await m.Get($"/clients/{c}/status-reports")).Body!.AsArray();
        Assert.Equal(["AtRisk", "OnTrack"], history.Select(x => x!["status"]!.GetValue<string>()));
        Assert.All(history, x => Assert.False(string.IsNullOrEmpty(x!["recordedBy"]?.GetValue<string>())));
        Assert.Null((await m.Get($"/dashboard/clients/{empty}")).Body!["status"]!["recorded"]);

        // The portfolio: one row per client, with the same status and signals, and its running projects counted.
        var row = (await m.Get($"/dashboard/clients?clientId={c}")).Body!["items"]!.AsArray().Single(x => Id(x) == c)!;
        Assert.Equal("AtRisk", row["status"]!.GetValue<string>());
        Assert.Equal(2, row["runningProjects"]!.GetValue<int>());
        Assert.Equal("UAT sign-off", row["nextMilestone"]!.GetValue<string>());
        Assert.True(row["nextMilestoneLate"]!.GetValue<bool>());
        Assert.Equal(7, row["signals"]!.AsArray().Count);
        // An Active client is in the portfolio even without a project.
        Assert.Contains((await m.Get($"/dashboard/clients?clientId={empty}")).Body!["items"]!.AsArray(), x => Id(x) == empty);
    }

    /// <summary>A role with every View right except the given ones, for testing one right alone.</summary>
    private async Task<Api> ViewerWithout(params string[] excluded)
    {
        var m = await Hub.As(HubFactory.Manager);
        // Fixture.Rights adds every dashboard feature right with Dashboard:View, so the excluded ones are taken out afterwards.
        var rights = Fixture.Rights(RightsCatalog.All.Where(p => p.Action.EndsWith("View", StringComparison.Ordinal)).Select(p => p.Key), Flag.None).Except(excluded).ToArray();
        var roleId = await m.Create("/admin/roles", new { name = U("A109"), rights });
        var account = $@"DEV\{U("a109")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "A109 test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId });
        return await Hub.As(account);
    }

    [Fact]
    public async Task Client_dashboard_right_allows_and_denies_access()
    {
        var c = await NewClient();
        var allowed = await ViewerWithout();
        var denied = await ViewerWithout("ClientDashboard:View");
        Assert.Equal(HttpStatusCode.OK, (await allowed.Get("/dashboard/clients")).Status);
        Assert.Equal(HttpStatusCode.OK, (await allowed.Get($"/dashboard/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await allowed.Get($"/clients/{c}/status-reports")).Status);
        // Reading is not recording: without Projects:Maintain the page offers no Update status, and the API refuses.
        Assert.False((await allowed.Get($"/dashboard/clients/{c}")).Body!["status"]!["canRecord"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Forbidden, (await allowed.Post($"/clients/{c}/status-reports", new { status = "OnTrack", summary = "x" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await denied.Get("/dashboard/clients")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await denied.Get($"/dashboard/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await denied.Get($"/clients/{c}/status-reports")).Status);
        // The other dashboards do not depend on it.
        Assert.Equal(HttpStatusCode.OK, (await denied.Get("/dashboard/management")).Status);
    }

    [Fact]
    public async Task Payments_dashboard_right_allows_and_denies_access()
    {
        var allowed = await ViewerWithout();
        var denied = await ViewerWithout("PaymentsDashboard:View");
        var noContracts = await ViewerWithout("Contracts:View");
        Assert.Equal(HttpStatusCode.OK, (await allowed.Get("/dashboard/payments")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await denied.Get("/dashboard/payments")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await noContracts.Get("/dashboard/payments")).Status);
        // The other dashboards do not depend on it.
        Assert.Equal(HttpStatusCode.OK, (await denied.Get("/dashboard/management")).Status);
        // The dashboard area needs every business View right (Dashboard:View), Products:View included, so nobody without it opens the page;
        // the handler still checks Products:View before filtering by product, as the contract register does.
        Assert.Equal(HttpStatusCode.Forbidden, (await (await ViewerWithout("Products:View")).Get("/dashboard/payments?productIds=1")).Status);

        // The Excel export needs its own right, contract export and the platform's export right; viewing alone is not enough.
        Assert.Equal(HttpStatusCode.Forbidden, (await allowed.Get("/dashboard/payments/export")).Status);
        Assert.Equal(HttpStatusCode.OK, (await (await Exporter()).Get("/dashboard/payments/export")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await Exporter("PaymentsDashboard:Export")).Get("/dashboard/payments/export")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await Exporter("Contracts:Export")).Get("/dashboard/payments/export")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await Exporter("Platform:Export")).Get("/dashboard/payments/export")).Status);
    }

    /// <summary>A role with every View and Export right except the given ones.</summary>
    private async Task<Api> Exporter(params string[] excluded)
    {
        var m = await Hub.As(HubFactory.Manager);
        var keys = RightsCatalog.All.Where(p => p.Action.EndsWith("View", StringComparison.Ordinal) || p.Action == RightKeys.Export).Select(p => p.Key);
        var rights = Fixture.Rights(keys, Flag.Export).Concat(["PaymentsDashboard:Export"]).Distinct().Except(excluded).ToArray();
        var roleId = await m.Create("/admin/roles", new { name = U("A115"), rights });
        var account = $@"DEV\{U("a115")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "A115 test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId });
        return await Hub.As(account);
    }

    [Fact]
    public async Task Payments_dashboard_shows_paid_upcoming_and_overdue_for_the_chosen_years_and_clients()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        async Task<long> Contract(long client, string currency, object[] payments)
        {
            var project = await m.Create("/projects", new { clientId = client, code = U("PRJ"), name = "Fictional payments", status = "Active", ownerUserId = m.UserId });
            return await m.Create("/contracts", new
            {
                projectId = project, title = "Fictional delivery", contractReference = U("FIC-PAY"), type = "SlaSupport", status = "Active", ownerUserId = m.UserId,
                startDate = "2025-01-01", endDate = "2028-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, currency,
                payments
            });
        }
        object Pay(string condition, decimal? amount, DateOnly? due, string status = "Pending", DateOnly? paidOn = null) =>
            new { condition, percentage = (decimal?)null, amount, dueDate = due, status, paidOn };
        var a = await NewClient();
        var b = await NewClient();
        await Contract(a, "AED", [
            Pay("Advance", 1000m, new DateOnly(2025, 3, 1), "Paid", new DateOnly(2025, 3, 10)),
            Pay("Delivery", 400m, today.AddDays(-10), "Invoiced"),
            Pay("Go-live", 300m, today.AddDays(5)),
            Pay("Retention", null, today.AddDays(200)),
            Pay("Waived fee", 50m, today.AddDays(-5), "Waived"),
            Pay("Open-ended", 10m, null)
        ]);
        await Contract(b, "USD", [Pay("Licence", 700m, today.AddDays(-40))]);

        var d = (await m.Get($"/dashboard/payments?years=all&clientIds={b},{a}")).Body!;
        var t = d["totals"]!;
        static int N(JsonNode part) => part["count"]!.GetValue<int>();
        static decimal Amt(JsonNode part, string cur) => part["amounts"]!.AsArray().Single(x => x!["currency"]!.GetValue<string>() == cur)!["value"]!.GetValue<decimal>();
        Assert.Equal(1, N(t["paid"]!));
        Assert.Equal(1000m, Amt(t["paid"]!, "AED"));
        Assert.Equal(2, N(t["overdue"]!));
        Assert.Equal(400m, Amt(t["overdue"]!, "AED"));
        Assert.Equal(700m, Amt(t["overdue"]!, "USD"));
        Assert.Equal(2, N(t["upcoming"]!));
        Assert.Single(t["upcoming"]!["amounts"]!.AsArray()); // the retention has no amount: counted, not summed
        Assert.Equal(1, N(t["dueSoon"]!));
        Assert.Equal(1, t["waived"]!.GetValue<int>());
        Assert.Equal(1, t["undated"]!.GetValue<int>());
        var items = d["items"]!.AsArray();
        Assert.Equal(5, items.Count); // waived and undated terms are counted, not listed
        Assert.Equal(5, items.Count(x => x!["bucket"] is not null));
        Assert.Equal("overdue", items[0]!["bucket"]!.GetValue<string>());
        Assert.Equal(40, items[0]!["daysOverdue"]!.GetValue<int>());
        Assert.Equal([a, b], d["clientIds"]!.AsArray().Select(x => x!.GetValue<long>()).Order());
        Assert.Equal(2, d["byClient"]!.AsArray().Count);
        Assert.Equal(1, N(d["aging"]!.AsArray().Single(x => x!["key"]!.GetValue<string>() == "31-60")!["part"]!));
        // The picker offers every client with a payment term in view.
        Assert.Contains(d["options"]!["clients"]!.AsArray(), c => c!["id"]!.GetValue<long>() == a);
        Assert.Contains("USD", d["options"]!["currencies"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.Contains(d["options"]!["owners"]!.AsArray(), x => x!["id"]!.GetValue<long>() == m.UserId);

        // Contract owner and currency, also multi-select.
        var usd = (await m.Get($"/dashboard/payments?years=all&clientIds={a},{b}&currencies=usd")).Body!["totals"]!;
        Assert.Equal(1, N(usd["overdue"]!));
        Assert.Equal(0, N(usd["paid"]!));
        Assert.Equal(2, N((await m.Get($"/dashboard/payments?years=all&clientIds={a},{b}&currencies=AED,USD")).Body!["totals"]!["overdue"]!));
        Assert.Equal(2, N((await m.Get($"/dashboard/payments?years=all&clientIds={a},{b}&ownerIds={m.UserId}")).Body!["totals"]!["overdue"]!));
        Assert.Equal(0, N((await m.Get($"/dashboard/payments?years=all&clientIds={a},{b}&ownerIds=999999999")).Body!["totals"]!["all"]!));

        // The Excel file is the same view, and the export is audited.
        var file = await m.Http.GetAsync($"/api/v1/dashboard/payments/export?years=all&clientIds={a},{b}&currencies=USD");
        Assert.Equal(HttpStatusCode.OK, file.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.Content.Headers.ContentType!.MediaType);
        Assert.EndsWith(".xlsx", file.Content.Headers.ContentDisposition!.FileNameStar ?? file.Content.Headers.ContentDisposition.FileName!.Trim('"'));
        using (var zip = new System.IO.Compression.ZipArchive(new MemoryStream(await file.Content.ReadAsByteArrayAsync())))
        {
            string Sheet(int n) { using var r = new StreamReader(zip.GetEntry($"xl/worksheets/sheet{n}.xml")!.Open()); return r.ReadToEnd(); }
            Assert.Contains("Licence", Sheet(2));
            Assert.DoesNotContain("Delivery", Sheet(2)); // AED terms are filtered out, as on the page
            Assert.Contains("USD", Sheet(1));
        }
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
            Assert.True(await db.AuditEntries.IgnoreQueryFilters().AnyAsync(e => e.Action == "Export" && e.EntityType == "PaymentsDashboard" && e.UserId == m.UserId));
        }

        // One client only.
        var onlyA = (await m.Get($"/dashboard/payments?years=all&clientIds={a}")).Body!["totals"]!;
        Assert.Equal(1, N(onlyA["overdue"]!));
        Assert.Equal(1, N(onlyA["paid"]!));

        // One year: the 2025 term was paid in 2025; what is overdue now from another year is reported apart.
        var y2025 = (await m.Get($"/dashboard/payments?years=2025&clientIds={a},{b}")).Body!;
        Assert.Equal(1, N(y2025["totals"]!["paid"]!));
        Assert.Equal("month", y2025["timeline"]!["unit"]!.GetValue<string>());
        Assert.Equal(12, y2025["timeline"]!["rows"]!.AsArray().Count);
        var overdueNotIn2025 = new[] { today.AddDays(-10), today.AddDays(-40) }.Count(x => x.Year != 2025);
        Assert.Equal(overdueNotIn2025, N(y2025["overdueOtherYears"]!));
        // Several years: by year.
        var two = (await m.Get($"/dashboard/payments?years=2025,{today.Year}&clientIds={a}")).Body!;
        Assert.Equal("year", two["timeline"]!["unit"]!.GetValue<string>());

        Assert.NotNull((await m.Get("/dashboard/payments?clientIds=abc")).Error("clientIds"));
        Assert.NotNull((await m.Get("/dashboard/payments?years=1999")).Error("years"));
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/dashboard/payments")).Status);
    }

    [Fact]
    public async Task Operational_dashboard_shows_running_clocks_and_counts_that_equal_their_lists()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional support", status = "Active", ownerUserId = m.UserId });
        var k = await m.Create("/contracts", new
        {
            projectId = project, title = "Fictional support", contractReference = "FIC-OPS", type = "SlaSupport", status = "Active", ownerUserId = m.UserId, startDate = "2026-01-01", endDate = "2028-12-31",
            renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true,
            slaTargets = new[] { new { priority = "High", responseMinutes = 60, resolutionMinutes = 480, basis = "CalendarHours" } }
        });
        async Task<long> Case(long? owner) => await m.Create("/cases", new
        {
            title = "Interface down " + U("X"), type = "Incident", scope = "Client", clientId = c, contractId = k, responsibleTeamId = await Team(), impactSummary = "Down", priority = "High",
            ownerUserId = owner, nextAction = "Restart the interface", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        var risky = await Case(m.UserId);
        var fresh = await Case(m.UserId);
        var unowned = await Case(null);
        await Backdate(risky, 50);

        var d = (await m.Get($"/dashboard/operational?view=all&clientId={c}")).Body!;
        Assert.Equal(25, d["atRiskPercent"]!.GetValue<int>());
        var kpis = d["kpis"]!;
        Assert.Equal(3, kpis["openCases"]!["value"]!.GetValue<int>());
        Assert.Equal(1, kpis["slaAtRisk"]!["value"]!.GetValue<int>());
        Assert.Equal(3, kpis["slaAtRisk"]!["running"]!.GetValue<int>());
        Assert.Equal(1, kpis["unassigned"]!["value"]!.GetValue<int>());
        Assert.Equal(1, Total(await m.Get(kpis["unassigned"]!["link"]!.GetValue<string>().Replace("/cases?", "/cases?priority=High&"))));
        Assert.Equal(Total(await m.Get(kpis["openCases"]!["link"]!.GetValue<string>())), kpis["openCases"]!["value"]!.GetValue<int>());

        // The queue: every case with a clock ending within 24 hours, the one that runs out first in front, with the share of the target used.
        var queue = d["queue"]!["items"]!.AsArray();
        Assert.Equal(risky, Id(queue[0]));
        var clock = queue[0]!["clock"]!;
        Assert.Equal("Response", clock["kind"]!.GetValue<string>());
        Assert.True(clock["atRisk"]!.GetValue<bool>());
        Assert.InRange(clock["usedPercent"]!.GetValue<int>(), 80, 90);
        Assert.Equal("Restart the interface", queue[0]!["nextAction"]!.GetValue<string>());
        Assert.Contains(queue, x => Id(x) == unowned && x!["unassigned"]!.GetValue<bool>());
        Assert.False(queue.Single(x => Id(x) == fresh)!["clock"]!["atRisk"]!.GetValue<bool>());

        // My work narrows to the caller's cases; unassigned critical/high work stays visible.
        var mine = (await m.Get($"/dashboard/operational?view=mine&clientId={c}")).Body!;
        Assert.Equal(2, mine["kpis"]!["openCases"]!["value"]!.GetValue<int>());
        Assert.Equal(1, mine["kpis"]!["unassigned"]!["value"]!.GetValue<int>());
        Assert.DoesNotContain(mine["queue"]!["items"]!.AsArray(), x => Id(x) == unowned);
        Assert.Contains(mine["workload"]!.AsArray(), x => x!["owner"]!.GetValue<string>() == "Unassigned" && x["total"]!.GetValue<int>() == 1);
        Assert.Equal(6, mine["hygiene"]!.AsArray().Count);

        // A recorded first response stops the response clock: the resolution clock is then the one shown.
        await m.Ok($"/cases/{risky}/first-response", new { channel = "Email", note = "Acknowledged" }, await m.Version($"/cases/{risky}"));
        d = (await m.Get($"/dashboard/operational?view=all&clientId={c}")).Body!;
        Assert.Equal(0, d["kpis"]!["slaAtRisk"]!["value"]!.GetValue<int>());
        Assert.Equal("Resolution", d["queue"]!["items"]!.AsArray().Single(x => Id(x) == risky)!["clock"]!["kind"]!.GetValue<string>());

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Get("/dashboard/operational?view=everyone")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/dashboard/operational")).Status);

        // The at-risk threshold and the other dashboard settings are validated.
        var settings = (await m.Get("/admin/settings")).Body!.AsArray();
        JsonNode Setting(string key) => settings.Single(s => s!["key"]!.GetValue<string>() == key)!;
        Assert.Equal("25", Setting("Dashboard.SlaAtRiskPercent")["value"]!.GetValue<string>());
        Assert.Equal("90", Setting("Dashboard.SlaComplianceTargetPercent")["value"]!.GetValue<string>());
        Assert.Equal("14", Setting("Dashboard.ClientStatusMaxAgeDays")["value"]!.GetValue<string>());
        foreach (var (key, bad) in new[] { ("Dashboard.SlaAtRiskPercent", "80"), ("Dashboard.SlaComplianceTargetPercent", "20"), ("Dashboard.ClientStatusMaxAgeDays", "0") })
            Assert.NotNull((await m.Put($"/admin/settings/{Id(Setting(key))}", new { value = bad }, Setting(key)["version"]!.GetValue<string>())).Error("value"));
    }

    [Fact]
    public async Task Sla_and_management_dashboards_report_measured_figures_with_their_denominators()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional managed service", status = "Active", ownerUserId = m.UserId });
        var k = await m.Create("/contracts", new
        {
            projectId = project, title = "Fictional managed service", contractReference = "FIC-MGT", type = "SlaSupport", status = "Active", ownerUserId = m.UserId, startDate = "2026-01-01",
            endDate = today.AddDays(50).ToString("yyyy-MM-dd"), renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, currency = "AED",
            slaTargets = new[] { new { priority = "High", responseMinutes = 60, resolutionMinutes = 480, basis = "CalendarHours" } },
            payments = new[]
            {
                new { condition = "Q3 fee", percentage = (decimal?)null, amount = (decimal?)1000m, dueDate = (DateOnly?)today.AddDays(-5), status = "Pending", paidOn = (DateOnly?)null },
                new { condition = "Q4 fee", percentage = (decimal?)null, amount = (decimal?)2500m, dueDate = (DateOnly?)today.AddDays(10), status = "Pending", paidOn = (DateOnly?)null }
            }
        });
        async Task<long> Case(string priority) => await m.Create("/cases", new
        {
            title = "Reports slow " + U("X"), type = "Incident", scope = "Client", clientId = c, contractId = k, responsibleTeamId = await Team(), impactSummary = "Slow", priority,
            ownerUserId = m.UserId, nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        var met = await Case("High");
        var breached = await Case("High");
        var noTarget = await Case("Low");
        await m.Ok($"/cases/{met}/first-response", new { channel = "Email", note = "Acknowledged" }, await m.Version($"/cases/{met}"));
        await Backdate(breached, 90);

        var d = (await m.Get($"/dashboard/sla-contracts?clientId={c}&period=30d")).Body!;
        var comp = d["compliance"]!;
        Assert.Equal(90, d["target"]!.GetValue<int>());
        Assert.Equal(3, comp["cases"]!.GetValue<int>());
        Assert.Equal((1, 1, 50.0), (comp["response"]!["met"]!.GetValue<int>(), comp["response"]!["breached"]!.GetValue<int>(), comp["response"]!["rate"]!.GetValue<double>()));
        // Nothing resolved yet: the resolution rate is "not available", never 0 % or 100 %.
        Assert.Null(comp["resolution"]!["rate"]);
        Assert.Equal(1, comp["notMeasurable"]!.GetValue<int>());
        Assert.Equal("No target recorded for the priority", comp["reasons"]![0]!["label"]!.GetValue<string>());
        Assert.Equal(1, Total(await m.Get(comp["links"]!["responseBreached"]!.GetValue<string>())));
        Assert.Equal(1, d["byPriority"]!.AsArray().Single(x => x!["priority"]!.GetValue<string>() == "High")!["responseBreached"]!.GetValue<int>());
        Assert.Equal(12, d["trend"]!.AsArray().Count);
        Assert.Equal(3, d["trend"]!.AsArray().Last()!["cases"]!.GetValue<int>());
        var row = d["contracts"]!["rows"]!.AsArray().Single(x => Id(x) == k)!;
        Assert.Equal((3, 1, "High", "RenewalDue", "24 × 7"), (row["cases"]!.GetValue<int>(), row["breached"]!.GetValue<int>(), row["worstPriority"]!.GetValue<string>(), row["state"]!.GetValue<string>(), row["support"]!.GetValue<string>()));
        var watch = d["contracts"]!["watch"]!.AsArray().Single(x => Id(x) == k)!;
        Assert.Equal(20, watch["daysLeft"]!.GetValue<int>());
        // Payments per currency: overdue and due within 30 days, never summed together.
        var pay = Assert.Single(d["payments"]!.AsArray())!;
        Assert.Equal(("AED", 1000m, 2500m), (pay["currency"]!.GetValue<string>(), pay["overdue"]!.GetValue<decimal>(), pay["due30"]!.GetValue<decimal>()));
        // The priority filter narrows the measured cases.
        Assert.Equal(1, (await m.Get($"/dashboard/sla-contracts?clientId={c}&period=30d&priority=Low")).Body!["compliance"]!["cases"]!.GetValue<int>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Get("/dashboard/sla-contracts?period=week")).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Get("/dashboard/sla-contracts?period=custom")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/dashboard/sla-contracts")).Status);

        // A ticket that is Closed but has no recorded closing time (older or imported data) cannot be dated: it must not make the latest trend point differ from the backlog now.
        // Status and configured status code are set together, as the application keeps them: a Closed status with an open code would break other tests' counts in the shared database.
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
            await db.Cases.IgnoreQueryFilters().Where(x => x.Id == noTarget).ExecuteUpdateAsync(u => u.SetProperty(x => x.Status, CaseStatus.Closed).SetProperty(x => x.StatusCode, CaseStatuses.ClosedCode).SetProperty(x => x.ClosedAt, (DateTimeOffset?)null));
        }
        // Management: the backlog equals the open-case list; the portfolio carries the client; period names are validated.
        // Other work in the shared database can add or close tickets between two calls: compare only when the list is the same before and after.
        JsonNode g;
        int listed;
        var attempts = 0;
        while (true)
        {
            var before = Total(await m.Get("/cases?status=open"));
            g = (await m.Get("/dashboard/management?period=quarter")).Body!;
            listed = Total(await m.Get("/cases?status=open"));
            if (before == listed || ++attempts >= 5) break;
        }
        Assert.Equal(listed, g["kpis"]!["backlog"]!["value"]!.GetValue<int>());
        Assert.Equal(12, g["trend"]!.AsArray().Count);
        Assert.True(g["trend"]!.AsArray().Last()!["opened"]!.GetValue<int>() >= 3);
        Assert.Equal(g["kpis"]!["backlog"]!["value"]!.GetValue<int>(), g["trend"]!.AsArray().Last()!["backlog"]!.GetValue<int>());
        var p = g["portfolio"]!.AsArray().Single(x => Id(x) == c)!;
        Assert.Null(p["status"]);
        Assert.Equal("NoStatus", p["agreement"]!.GetValue<string>());
        Assert.True(g["kpis"]!["clients"]!["noStatus"]!.GetValue<int>() >= 1);
        Assert.True(g["kpis"]!["clients"]!["runningProjects"]!.GetValue<int>() >= 1);
        Assert.True(g["dataTrust"]!["clients"]!["noStatus"]!.GetValue<int>() >= 1);
        Assert.Contains(g["decisions"]!.AsArray().Concat((await m.Get("/dashboard/sla-contracts")).Body!["contracts"]!["watch"]!.AsArray()), x => Id(x) == k);
        Assert.Contains(g["kpis"]!["payments"]!["amounts"]!.AsArray(), x => x!["currency"]!.GetValue<string>() == "AED" && x["amount"]!.GetValue<decimal>() >= 1000m);
        Assert.NotEmpty(g["teams"]!.AsArray());
        // A team filter hides figures that no team owns instead of showing zeros.
        var byTeam = (await m.Get($"/dashboard/management?teamId={await Team()}")).Body!;
        Assert.Null(byTeam["kpis"]!["escalations"]);
        Assert.Null(byTeam["kpis"]!["payments"]);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Get("/dashboard/management?period=decade")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/dashboard/management")).Status);
    }
}
