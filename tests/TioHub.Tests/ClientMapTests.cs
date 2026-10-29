using System.Text.Json.Nodes;

namespace TioHub.Tests;

/// <summary>A73: what the Client Map reads — product codes and project manager per map client, and the asset list's country filter.</summary>
[Collection("hub")]
public class A73_ClientMap(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Map_clients_carry_products_and_project_manager_and_assets_filter_by_country()
    {
        var m = await Hub.As(HubFactory.Manager);
        var clients = (await m.Get("/dashboard/insights")).Body!["countries"]!["clients"]!.AsArray().Select(x => x!).ToList();
        Assert.NotEmpty(clients);
        Assert.All(clients, c => Assert.NotNull(c["products"]));
        // Product codes come from the client's installations; the project manager is the client's owner.
        var withServers = clients.First(c => c["servers"]!.GetValue<int>() > 0 && c["country"] is not null);
        var detail = (await m.Get($"/clients/{Id(withServers)}")).Body!;
        Assert.Equal(detail["owner"]?["name"]?.GetValue<string>(), withServers["projectManager"]?.GetValue<string>());
        Assert.True(withServers["products"]!.AsArray().Count > 0);

        // The asset list's country filter returns only servers of that country's clients (the client's country).
        var country = withServers["country"]!.GetValue<string>();
        var codes = clients.Where(c => c["country"]?.GetValue<string>() == country).Select(c => c["code"]!.GetValue<string>()).ToHashSet();
        var assets = (await m.Get($"/assets?country={Uri.EscapeDataString(country)}&pageSize=200")).Body!;
        var items = assets["items"]!.AsArray();
        Assert.NotEmpty(items);
        Assert.All(items, a => Assert.Contains(a!["clientCode"]!.GetValue<string>(), codes));
        var servers = clients.Where(c => c["country"]?.GetValue<string>() == country).Sum(c => c["servers"]!.GetValue<int>());
        Assert.True(assets["totalCount"]!.GetValue<int>() >= servers);   // the list also holds logical endpoints, which are not servers
        Assert.Equal(0, (await m.Get("/assets?country=Atlantis")).Total);
        var all = (await m.Get("/assets?pageSize=1")).Total;
        Assert.True(all >= assets["totalCount"]!.GetValue<int>());
    }
}
