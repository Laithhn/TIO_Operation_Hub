using System.Net;
using System.Text.Json.Nodes;
using TioHub.Api.Common;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Security;

namespace TioHub.Tests;

public class A63PermissionTests
{
    [Fact]
    public void Maintain_does_not_grant_creation_coordination_archive_or_delete()
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(7, "engineer", "Engineer", "UTC", true, ["Custom"], Right.None,
            [ResourcePermissions.KeyOf(ResourcePermissions.Cases, ResourcePermissions.Maintain)], Grant.None,
            true, [], [], [], [], true, []));

        Assert.True(user.HasPermission(ResourcePermissions.Cases, ResourcePermissions.Maintain));
        Assert.False(user.HasPermission(ResourcePermissions.Cases, ResourcePermissions.Create));
        Assert.False(user.HasPermission(ResourcePermissions.Cases, ResourcePermissions.Coordinate));
        Assert.False(user.HasPermission(ResourcePermissions.Cases, ResourcePermissions.ArchiveRestore));
        Assert.False(user.HasPermission(ResourcePermissions.Cases, ResourcePermissions.Delete));
        Assert.True(user.HasBusinessRole);
    }
}

public class A63PenaltyRulesTests
{
    [Fact]
    public void Deduplicates_breaches_caps_by_billing_month_and_rounds_to_currency_precision()
    {
        var clause = new ContractPenaltyClause
        {
            Id = 12, Calculation = PenaltyCalculation.FixedPerBreach, FixedAmount = 2.555m,
            MonthlyCap = 4.123m, BillingTimeZone = "Asia/Dubai"
        };
        var breaches = new[]
        {
            new PenaltyBreach("case-0-response", new DateTimeOffset(2026, 1, 31, 19, 30, 0, TimeSpan.Zero)),
            new PenaltyBreach("case-1-response", new DateTimeOffset(2026, 1, 31, 20, 30, 0, TimeSpan.Zero)),
            new PenaltyBreach("case-1-response", new DateTimeOffset(2026, 1, 31, 20, 30, 0, TimeSpan.Zero)),
            new PenaltyBreach("case-2-response", new DateTimeOffset(2026, 1, 31, 20, 45, 0, TimeSpan.Zero)),
            new PenaltyBreach("case-3-response", new DateTimeOffset(2026, 2, 1, 0, 1, 0, TimeSpan.Zero))
        };

        var result = PenaltyRules.Calculate(clause, breaches, "AED");

        Assert.Equal(2, result.Count);
        Assert.Equal(new DateOnly(2026, 1, 1), result[0].Month);
        Assert.Equal(1, result[0].BreachCount);
        Assert.Equal(2.56m, result[0].Amount);
        Assert.Equal(new DateOnly(2026, 2, 1), result[1].Month); // Jan 31 20:30 UTC is already Feb in Dubai.
        Assert.Equal(3, result[1].BreachCount);
        Assert.Equal(4.12m, result[1].Amount);
        Assert.Equal("NeedsReview", result[1].ReviewState);
    }

    [Fact]
    public void Percentage_clauses_use_only_the_explicit_reference_amount()
    {
        var clause = new ContractPenaltyClause
        {
            Id = 2, Calculation = PenaltyCalculation.PercentagePerBreach, Percentage = 12.5m, ReferenceAmount = 1000m
        };

        var result = Assert.Single(PenaltyRules.Calculate(clause, [new PenaltyBreach("resolution-1", DateTimeOffset.UtcNow)], "USD"));

        Assert.Equal(125m, result.Amount);
        Assert.Equal(1, result.BreachCount);
    }
}

[Collection("hub")]
public class A63PermissionApiTests(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Role_permission_rows_grant_only_the_selected_resource_action()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var roleId = await manager.Create("/admin/roles", new
        {
            name = U("CasesMaintain"), rights = Array.Empty<string>(), permissions = new[] { "Cases:Maintain" }
        });
        var account = $@"DEV\{U("a63")}";
        await manager.Create("/admin/users", new { accountName = account, displayName = "A63 permission test", workingTimeZone = "UTC", roleId });

        var limited = await Hub.As(account);
        var permissionKeys = limited.Me["permissions"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray();
        Assert.Contains("Cases:Maintain", permissionKeys);
        Assert.DoesNotContain("Cases:Create", permissionKeys);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Post("/cases", new { })).Status);
    }
}

[Collection("hub")]
public class A63WorkflowLabelApiTests(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Workflow_codes_stay_fixed_while_display_labels_can_change()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var rows = (await manager.Get("/admin/lookups")).Body!.AsArray();
        var healthy = rows.First(x => x!["listName"]!.GetValue<string>() == "ConditionLabel" && x["code"]!.GetValue<string>() == "Healthy")!;
        var id = healthy["id"]!.GetValue<long>();
        var originalLabel = healthy["label"]!.GetValue<string>();
        var version = healthy["version"]!.GetValue<string>();
        try
        {
            Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/admin/lookups/{id}", new
            {
                listName = "ConditionLabel", code = "Healthy", label = "Operational", description = (string?)null,
                sortOrder = healthy["sortOrder"]!.GetValue<int>(), isRetired = false
            }, version)).Status);
            var reference = (await manager.Get("/reference")).Body!;
            Assert.Equal("Operational", reference["enumLabels"]!["Condition"]!["Healthy"]!.GetValue<string>());

            Assert.Equal(HttpStatusCode.UnprocessableEntity, (await manager.Post("/admin/lookups", new
            {
                listName = "ConditionLabel", code = "Custom", label = "Custom", sortOrder = 99, isRetired = false
            })).Status);
        }
        finally
        {
            var current = (await manager.Get("/admin/lookups")).Body!.AsArray().First(x => x!["id"]!.GetValue<long>() == id)!;
            Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/admin/lookups/{id}", new
            {
                listName = "ConditionLabel", code = "Healthy", label = originalLabel, description = (string?)null,
                sortOrder = current["sortOrder"]!.GetValue<int>(), isRetired = false
            }, current["version"]!.GetValue<string>())).Status);
        }
    }
}
