using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Tests;

[Collection("hub")]
public class Stage2InventoryTests(HubFactory hub) : Scenario(hub)
{
    [Theory]
    [InlineData("single")]
    [InlineData("many")]
    [InlineData("environment")]
    public async Task Every_copy_route_preserves_categories_totals_and_logical_endpoint_hosting_rules(string mode)
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var source = await NewEnv(client, "Category source");
        var target = await NewEnv(client, "Category target");
        var otherTarget = await NewEnv(client, "Category target 2");
        var physical = await m.Create("/assets", new
        {
            environmentId = source, name = "physical-source", type = "Physical", lifecycle = "Active", ownerUserId = m.UserId,
            cpuQuantity = 6, cpuUnit = "PhysicalCore", ramQuantity = 16, ramUnit = "GB"
        });
        var endpoint = await m.Create("/assets", new { environmentId = source, name = "endpoint-source", type = "LogicalEndpoint", ownerUserId = m.UserId });
        var targets = new List<long>();
        if (mode == "single")
        {
            await m.Ok($"/environments/{source}/clone", new { targetEnvironmentId = target, assetIds = new[] { physical, endpoint }, includeDeployment = false });
            targets.Add(target);
        }
        else if (mode == "many")
        {
            await m.Ok($"/environments/{source}/clone-to-many", new
            {
                targets = new[] { new { environmentId = target }, new { environmentId = otherTarget } },
                assetIds = new[] { physical, endpoint }, includeDeployment = false
            });
            targets.AddRange([target, otherTarget]);
        }
        else
        {
            var copied = await m.Post($"/environments/{source}/clone-environment", new { name = "Whole category copy", includeDeployment = false });
            Assert.Equal(HttpStatusCode.OK, copied.Status);
            targets.Add(copied.Body!["environmentId"]!.GetValue<long>());
        }
        var product = await m.Create("/products", new { code = U("HOST"), name = "Hosting rules", isActive = true });
        var microservice = await m.Create($"/products/{product}/microservices", new { name = U("Service") });
        foreach (var copiedEnvironment in targets)
        {
            using var scope = Hub.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var copies = await db.Assets.AsNoTracking().Where(x => x.EnvironmentId == copiedEnvironment).ToListAsync();
            Assert.Equal(2, copies.Count);
            Assert.Equal(AssetType.Physical, copies.Single(x => x.Type == "Physical").TypeCategory);
            var logical = copies.Single(x => x.Type == "LogicalEndpoint");
            Assert.Equal(AssetType.LogicalEndpoint, logical.TypeCategory);
            var summary = (await m.Get($"/infrastructure/summary?environmentId={copiedEnvironment}")).Body!;
            Assert.Equal(0, summary["assets"]!["vm"]!.GetValue<int>());
            Assert.Equal(1, summary["assets"]!["physical"]!.GetValue<int>());
            Assert.Equal(1, summary["assets"]!["logicalEndpoints"]!.GetValue<int>());
            Assert.Equal(6m, summary["cpu"]!["physicalCores"]!.GetValue<decimal>());
            var installation = await m.Create("/installations", new { environmentId = copiedEnvironment, productId = product, instanceName = "Endpoint guard" });
            var rejected = await m.Put($"/assets/{logical.Id}/microservices", new
            {
                microservices = new[] { new { installationId = installation, microserviceIds = new[] { microservice } } }
            });
            Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
            Assert.NotNull(rejected.Error("assetId"));
        }
    }

    [Fact]
    public async Task A_configured_asset_type_keeps_both_its_code_and_behavior_category_after_copy()
    {
        var m = await Hub.As(HubFactory.Manager);
        var code = U("Appliance");
        await m.Create("/admin/lookups", new { listName = "AssetType", code, label = "Physical appliance", category = "Physical", sortOrder = 100, isRetired = false });
        var client = await NewClient();
        var source = await NewEnv(client, "Custom type source");
        var target = await NewEnv(client, "Custom type target");
        var asset = await m.Create("/assets", new { environmentId = source, name = "Configured appliance", type = code, ownerUserId = m.UserId });
        await m.Ok($"/environments/{source}/clone", new { targetEnvironmentId = target, assetIds = new[] { asset }, includeDeployment = false });
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var copy = await db.Assets.AsNoTracking().SingleAsync(x => x.EnvironmentId == target);
        Assert.Equal(code, copy.Type);
        Assert.Equal(AssetType.Physical, copy.TypeCategory);
        Assert.Equal(1, (await m.Get($"/infrastructure/summary?environmentId={target}")).Body!["assets"]!["physical"]!.GetValue<int>());
    }
}
