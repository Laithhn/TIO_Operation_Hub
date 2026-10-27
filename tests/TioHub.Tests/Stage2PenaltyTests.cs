using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

public class Stage2PenaltyTermsTests
{
    [Fact]
    public void Billing_identity_ignores_labels_decimal_scale_and_unused_calculation_fields()
    {
        var original = new PenaltyClauseSnapshot(10, "Response", PenaltyTrigger.ResponseSlaBreached, PenaltyCalculation.FixedPerBreach, 80m, null, null, 100m, "Asia/Dubai", "AED");
        var renamed = original with { Name = "Acknowledgement", FixedAmount = 80.0000m, MonthlyCap = 100.0000m, Percentage = 15m, ReferenceAmount = 300m };
        Assert.Equal(PenaltyRules.TermsKey(original), PenaltyRules.TermsKey(renamed));
        Assert.NotEqual(PenaltyRules.TermsKey(original), PenaltyRules.TermsKey(original with { FixedAmount = 90m }));
        Assert.NotEqual(PenaltyRules.TermsKey(original), PenaltyRules.TermsKey(original with { Currency = "USD" }));
        Assert.NotEqual(PenaltyRules.TermsKey(original), PenaltyRules.TermsKey(original with { Trigger = PenaltyTrigger.ResolutionSlaBreached }));
        var percentage = original with { Calculation = PenaltyCalculation.PercentagePerBreach, Percentage = 5m, ReferenceAmount = 1000m, MonthlyCap = null };
        Assert.Equal(PenaltyRules.TermsKey(percentage), PenaltyRules.TermsKey(percentage with { FixedAmount = null, BillingTimeZone = null }));
    }
}

[Collection("hub")]
public class Stage2PenaltyTests(HubFactory hub) : Scenario(hub)
{
    private static readonly DateTimeOffset Opened = new(2026, 1, 12, 8, 0, 0, TimeSpan.Zero);

    private async Task<(Api Api, long Client, long Contract, long Clause)> Agreement()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var project = await m.Create("/projects", new { clientId = client, code = U("PSLA"), name = "Penalty regression", ownerUserId = m.UserId, status = "Active" });
        var contract = await m.Create("/contracts", new
        {
            clientId = client, projectId = project, title = "Penalty regression", type = "SlaSupport", status = "Active", ownerUserId = m.UserId,
            currency = "AED", support24x7 = true,
            slaTargets = new[]
            {
                new { priority = "High", responseMinutes = 60, resolutionMinutes = 480, basis = "CalendarHours" },
                new { priority = "Normal", responseMinutes = 120, resolutionMinutes = 960, basis = "CalendarHours" }
            },
            penaltyClauses = new[] { new { name = "Response", trigger = "ResponseSlaBreached", calculation = "FixedPerBreach", fixedAmount = 80m, monthlyCap = 100m, billingTimeZone = "UTC" } }
        });
        var clause = (await m.Get($"/contracts/{contract}")).Body!["penaltyClauses"]![0]!["id"]!.GetValue<long>();
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        await db.Settings.Where(x => x.Key == SettingKeys.SlaTrackingFrom).ExecuteUpdateAsync(s => s.SetProperty(x => x.Value, "2020-01-01T00:00:00Z"));
        return (m, client, contract, clause);
    }

    private async Task<long> LinkedCase(Api m, long client, long contract)
    {
        var id = await m.Create("/cases", new
        {
            title = U("PenaltyCase"), type = "Incident", scope = "Client", clientId = client, contractId = contract,
            responsibleTeamId = await Team(), impactSummary = "Regression", priority = "High", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        await SetBreach(id, Opened.AddHours(1));
        return id;
    }

    private async Task SetBreach(long id, DateTimeOffset due)
    {
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        await db.Cases.IgnoreQueryFilters().Where(x => x.Id == id).ExecuteUpdateAsync(s => s
            .SetProperty(x => x.CreatedAt, due.AddMinutes(-60)).SetProperty(x => x.FirstResponseAt, (DateTimeOffset?)null)
            .SetProperty(x => x.ResponseDueAt, due).SetProperty(x => x.ResponseSlaStatus, SlaState.Breached)
            .SetProperty(x => x.ResolvedAt, due.AddHours(1)).SetProperty(x => x.ResolutionSlaStatus, SlaState.Met));
    }

    private async Task<JsonArray> Rows(Api m, long contract) => (await m.Get($"/contracts/{contract}/penalty-assessments")).Body!.AsArray();
    private static JsonNode Active(JsonArray rows) => Assert.Single(rows, x => x!["breachCount"]!.GetValue<int>() > 0)!;
    private static decimal Amount(JsonNode row) => row["amount"]!.GetValue<decimal>();
    private static async Task Recalculate(Api m, long contract) => await m.Ok($"/contracts/{contract}/penalty-assessments/recalculate", new { reason = "Regression recalculation" });
    private static async Task Confirm(Api m, long contract, JsonNode row) => await m.Ok($"/contracts/{contract}/penalty-assessments/{row["id"]!.GetValue<long>()}/confirm",
        new { reason = "Reviewed regression" }, row["version"]!.GetValue<string>());

    [Fact]
    public async Task Unrelated_clause_changes_share_the_cap_and_legacy_rows_are_reconciled_without_double_charging()
    {
        var (m, client, contract, clause) = await Agreement();
        var first = await LinkedCase(m, client, contract);
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var k = await db.Contracts.Include(x => x.PenaltyClauses).SingleAsync(x => x.Id == contract);
            k.PenaltyClauses.Single().Name = "Renamed response";
            k.PenaltyClauses.Add(new ContractPenaltyClause { Name = "Resolution", Trigger = PenaltyTrigger.ResolutionSlaBreached, Calculation = PenaltyCalculation.FixedPerBreach, FixedAmount = 20m });
            await db.SaveChangesAsync();
        }
        var second = await LinkedCase(m, client, contract);
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            foreach (var id in new[] { first, second })
            {
                var snapshot = (await db.Cases.AsNoTracking().SingleAsync(x => x.Id == id)).PenaltyTermsSnapshotJson!;
                var term = JsonSerializer.Deserialize<PenaltyClauseSnapshot[]>(snapshot)!.Single(x => x.Id == clause);
                db.PenaltyAssessments.Add(new PenaltyAssessment
                {
                    ContractId = contract, ClauseId = clause, BillingMonth = new DateOnly(2026, 1, 1),
                    TermsKey = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(snapshot))), TermsSnapshotJson = JsonSerializer.Serialize(term),
                    Amount = 80m, UncappedAmount = 80m, Currency = "AED", BreachCount = 1, BreachIdentitiesJson = JsonSerializer.Serialize(new[] { $"{id}:ResponseSlaBreached" }),
                    CalculatedAt = DateTimeOffset.UtcNow, ReviewedAt = DateTimeOffset.UtcNow, ReviewedById = m.UserId, ReviewReason = "Legacy confirmation"
                });
            }
            await db.SaveChangesAsync();
        }

        await Recalculate(m, contract);
        var rows = await Rows(m, contract);
        Assert.Equal(2, rows.Count); // Reuse one legacy identity, retain the other as superseded history.
        var current = Active(rows);
        Assert.Equal(100m, Amount(current));
        Assert.Equal(160m, current["uncappedAmount"]!.GetValue<decimal>());
        Assert.Equal(80m, current["terms"]!["fixedAmount"]!.GetValue<decimal>());
        Assert.Equal(100m, current["terms"]!["monthlyCap"]!.GetValue<decimal>());
        Assert.Equal(2, current["breachCount"]!.GetValue<int>());
        Assert.Equal(100m, rows.Sum(x => Amount(x!)));
        Assert.Equal("NeedsReview", current["reviewState"]!.GetValue<string>());
        foreach (var id in new[] { first, second })
        {
            var preview = (await m.Get($"/cases/{id}/penalty-preview")).Body!["items"]!.AsArray().Single(x => x!["id"]!.GetValue<long>() == clause)!;
            Assert.Equal(Amount(current), preview["amount"]!.GetValue<decimal>());
            Assert.Equal(2, preview["breachCount"]!.GetValue<int>());
        }
        var old = rows.Single(x => x!["id"]!.GetValue<long>() != current["id"]!.GetValue<long>())!;
        Assert.Equal("Superseded", old["reviewState"]!.GetValue<string>());
        Assert.Null(old["reviewedAt"]);
        Assert.Equal(0m, Amount(old));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post($"/contracts/{contract}/penalty-assessments/{old["id"]}/confirm", new { reason = "Cannot confirm withdrawn charge" }, old["version"]!.GetValue<string>())).Status);

        await Confirm(m, contract, current);
        await Recalculate(m, contract);
        Assert.Equal("Confirmed", Active(await Rows(m, contract))["reviewState"]!.GetValue<string>()); // A no-op must preserve review.
    }

    [Theory]
    [InlineData("corrected")]
    [InlineData("cancelled")]
    [InlineData("unlinked")]
    public async Task Recalculation_withdraws_confirmed_charges_when_the_obligation_no_longer_qualifies(string correction)
    {
        var (m, client, contract, _) = await Agreement();
        var id = await LinkedCase(m, client, contract);
        await Recalculate(m, contract);
        await Confirm(m, contract, Active(await Rows(m, contract)));
        var version = await m.Version($"/cases/{id}");
        if (correction == "corrected")
            await m.Ok($"/cases/{id}/first-response", new { respondedAt = Opened.AddMinutes(30), channel = "Email", note = "Previously omitted timely response" }, version);
        else if (correction == "cancelled")
            await m.Ok($"/cases/{id}/cancel", new { reason = "Case opened in error" }, version);
        else
            await m.Ok($"/cases/{id}/contract", new { contractId = (long?)null, reason = "Contract linked in error" }, version);
        await Recalculate(m, contract);
        var old = Assert.Single(await Rows(m, contract))!;
        Assert.Equal("Superseded", old["reviewState"]!.GetValue<string>());
        Assert.Equal(0m, Amount(old));
        Assert.Equal(0, old["breachCount"]!.GetValue<int>());
        Assert.Equal("[]", old["breachIdentitiesJson"]!.GetValue<string>());
        Assert.Null(old["reviewedAt"]);
        Assert.Null(old["reviewedById"]);
        Assert.Null(old["reviewReason"]);
    }

    [Fact]
    public async Task A_changed_breach_population_clears_confirmation_even_when_the_capped_amount_is_unchanged()
    {
        var (m, client, contract, _) = await Agreement();
        var first = await LinkedCase(m, client, contract);
        await LinkedCase(m, client, contract);
        await Recalculate(m, contract);
        var before = Active(await Rows(m, contract));
        await Confirm(m, contract, before);
        await m.Ok($"/cases/{first}/cancel", new { reason = "Duplicate case" }, await m.Version($"/cases/{first}"));
        await LinkedCase(m, client, contract);
        await Recalculate(m, contract);
        var after = Active(await Rows(m, contract));
        Assert.Equal(before["id"]!.GetValue<long>(), after["id"]!.GetValue<long>());
        Assert.Equal(100m, Amount(after));
        Assert.Equal(2, after["breachCount"]!.GetValue<int>());
        Assert.NotEqual(before["breachIdentitiesJson"]!.GetValue<string>(), after["breachIdentitiesJson"]!.GetValue<string>());
        Assert.Equal("NeedsReview", after["reviewState"]!.GetValue<string>());
    }

    [Fact]
    public async Task A_billing_period_correction_supersedes_the_old_month_and_concurrent_recalculation_is_idempotent()
    {
        var (m, client, contract, _) = await Agreement();
        var id = await LinkedCase(m, client, contract);
        await Recalculate(m, contract);
        await Confirm(m, contract, Active(await Rows(m, contract)));
        await SetBreach(id, Opened.AddMonths(1).AddHours(1));
        await Task.WhenAll(Recalculate(m, contract), Recalculate(m, contract));
        var rows = await Rows(m, contract);
        Assert.Equal(2, rows.Count);
        var old = rows.Single(x => x!["billingMonth"]!.GetValue<string>() == "2026-01-01")!;
        Assert.Equal("Superseded", old["reviewState"]!.GetValue<string>());
        Assert.Null(old["reviewedAt"]);
        var current = Active(rows);
        Assert.Equal("2026-02-01", current["billingMonth"]!.GetValue<string>());
        Assert.Equal(80m, rows.Sum(x => Amount(x!)));
    }

    [Fact]
    public async Task Priority_refreshes_sla_targets_but_only_unlinking_and_relinking_refreshes_penalty_terms()
    {
        var (m, client, contract, clause) = await Agreement();
        var id = await LinkedCase(m, client, contract);
        string original;
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            original = (await db.Cases.AsNoTracking().SingleAsync(x => x.Id == id)).PenaltyTermsSnapshotJson!;
            (await db.Set<ContractPenaltyClause>().SingleAsync(x => x.Id == clause)).FixedAmount = 500m;
            await db.SaveChangesAsync();
            var c = await db.Cases.SingleAsync(x => x.Id == id);
            c.Priority = Priority.Normal;
            await db.SaveChangesAsync();
            Assert.Equal(120, c.SlaResponseMinutes);
            Assert.Equal(original, c.PenaltyTermsSnapshotJson);
        }
        await m.Ok($"/cases/{id}/contract", new { contractId = (long?)null, reason = "Relink test" }, await m.Version($"/cases/{id}"));
        await m.Ok($"/cases/{id}/contract", new { contractId = contract, reason = "Reapply amended agreement" }, await m.Version($"/cases/{id}"));
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var current = (await db.Cases.AsNoTracking().SingleAsync(x => x.Id == id)).PenaltyTermsSnapshotJson!;
            Assert.NotEqual(original, current);
            Assert.Equal(500m, Assert.Single(JsonSerializer.Deserialize<PenaltyClauseSnapshot[]>(current)!).FixedAmount);
        }
    }

    [Fact]
    public async Task Oversized_breach_population_is_rejected_without_changing_confirmed_assessments()
    {
        var (m, client, contract, _) = await Agreement();
        await LinkedCase(m, client, contract);
        await Recalculate(m, contract);
        await Confirm(m, contract, Active(await Rows(m, contract)));
        var before = Active(await Rows(m, contract));
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            db.Cases.AddRange(Enumerable.Range(0, 220).Select(i => new Case
            {
                Title = $"Capacity {i}", Type = "Incident", TypeCategory = CaseType.Incident, Scope = WorkScope.Client,
                ClientId = client, ContractId = contract, Priority = Priority.High, ImpactSummary = "Capacity regression", NextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
            }));
            await db.SaveChangesAsync();
            await db.Cases.Where(x => x.ContractId == contract).ExecuteUpdateAsync(s => s.SetProperty(x => x.ResponseSlaStatus, SlaState.Breached).SetProperty(x => x.ResponseDueAt, Opened.AddHours(1)));
        }
        var result = await m.Post($"/contracts/{contract}/penalty-assessments/recalculate", new { reason = "Capacity check" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Contains("capacity", result.Error("penaltyAssessments"));
        var after = Active(await Rows(m, contract));
        Assert.Equal(before.ToJsonString(), after.ToJsonString()); // No partial calculation, withdrawn charge or lost confirmation.
    }

    [Fact]
    public async Task Unknown_legacy_terms_remain_readable_and_are_superseded_instead_of_duplicating_charges()
    {
        var (m, client, contract, clause) = await Agreement();
        await LinkedCase(m, client, contract);
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            foreach (var json in new[] { "", "{invalid", "{}" })
                db.PenaltyAssessments.Add(new PenaltyAssessment
                {
                    ContractId = contract, ClauseId = clause, TermsKey = U("Legacy"), TermsSnapshotJson = json,
                    BillingMonth = new DateOnly(2026, 1, 1), Amount = 40m, UncappedAmount = 40m, Currency = "AED", BreachCount = 1,
                    ReviewedAt = DateTimeOffset.UtcNow, ReviewedById = m.UserId, ReviewReason = "Old review", CalculatedAt = DateTimeOffset.UtcNow
                });
            await db.SaveChangesAsync();
        }
        var legacy = await Rows(m, contract);
        Assert.Equal(3, legacy.Count);
        Assert.All(legacy, row => Assert.Null(row!["terms"]));
        await Recalculate(m, contract);
        var current = await Rows(m, contract);
        Assert.Equal(4, current.Count);
        Assert.Equal(80m, current.Sum(x => Amount(x!)));
        Assert.All(current.Where(x => x!["breachCount"]!.GetValue<int>() == 0), row =>
        {
            Assert.Equal("Superseded", row!["reviewState"]!.GetValue<string>());
            Assert.Null(row["reviewedAt"]);
        });
    }
}
