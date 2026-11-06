using System.Net;

namespace TioHub.Tests;

/// <summary>A104: a server's recorded IP address, VLAN and notes are technical detail, like its network zone.</summary>
[Collection("hub")]
public class AssetNetworkDetailsTests(HubFactory hub) : Scenario(hub)
{
    private static object Server(long env, long owner, string? ip, string? vlan = "13", string? notes = "Purpose: API") =>
        new { environmentId = env, name = "App server", type = "VM", ownerUserId = owner, ipAddress = ip, vlan, notes };

    [Fact]
    public async Task Ip_vlan_and_notes_are_saved_and_shown()
    {
        var m = await Hub.As(HubFactory.Manager);
        var env = await NewEnv(await NewClient(), "Production");
        var id = await m.Create("/assets", Server(env, m.UserId, "10.50.13.60"));

        var detail = (await m.Get($"/assets/{id}")).Body!;
        Assert.Equal("10.50.13.60", detail["ipAddress"]!.GetValue<string>());
        Assert.Equal("13", detail["vlan"]!.GetValue<string>());
        Assert.Equal("Purpose: API", detail["notes"]!.GetValue<string>());
        var row = (await m.Get($"/assets?environmentId={env}")).Body!["items"]!.AsArray().Single()!;
        Assert.Equal("10.50.13.60", row["ipAddress"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("13")]
    [InlineData("10.50.13")]
    [InlineData("not an address")]
    public async Task An_invalid_ip_address_is_refused(string ip)
    {
        var m = await Hub.As(HubFactory.Manager);
        var env = await NewEnv(await NewClient(), "Production");
        Assert.NotNull((await m.Post("/assets", Server(env, m.UserId, ip))).Error("ipAddress"));
    }

    [Fact]
    public async Task Without_technical_detail_they_are_hidden_kept_on_edit_and_cannot_be_set()
    {
        var m = await Hub.As(HubFactory.Manager);
        var env = await NewEnv(await NewClient(), "Production");
        var id = await m.Create("/assets", Server(env, m.UserId, "10.50.13.60"));
        var role = await m.Create("/admin/roles", new { name = U("ServersOnly"), rights = Fixture.Rights(["ClientStructure:View", "Environments:View", "Servers:View", "Servers:DetailsView", "Servers:Maintain"], Flag.None) });
        var account = $@"DEV\{U("plain")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "No technical detail", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId = role });
        var plain = await Hub.As(account);

        var seen = await plain.Get($"/assets/{id}");
        Assert.Equal(HttpStatusCode.OK, seen.Status);
        Assert.Null(seen.Body!["ipAddress"]);
        Assert.Null(seen.Body!["vlan"]);
        Assert.Null(seen.Body!["notes"]);
        Assert.Null((await plain.Get($"/assets?environmentId={env}")).Body!["items"]!.AsArray().Single()!["ipAddress"]);

        var refused = await plain.Put($"/assets/{id}", new { environmentId = env, name = "App server", type = "VM", ownerUserId = m.UserId, ipAddress = "10.0.0.1" }, seen.ETag);
        Assert.NotNull(refused.Error("ipAddress"));

        var saved = await plain.Put($"/assets/{id}", new { environmentId = env, name = "Renamed server", type = "VM", ownerUserId = m.UserId }, seen.ETag);
        Assert.Equal(HttpStatusCode.NoContent, saved.Status);
        var after = (await m.Get($"/assets/{id}")).Body!;
        Assert.Equal("Renamed server", after["name"]!.GetValue<string>());
        Assert.Equal("10.50.13.60", after["ipAddress"]!.GetValue<string>());
        Assert.Equal("13", after["vlan"]!.GetValue<string>());
        Assert.Equal("Purpose: API", after["notes"]!.GetValue<string>());
    }

    [Fact]
    public async Task Copying_a_server_keeps_its_notes_but_not_its_address()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var source = await NewEnv(client, "Production");
        var target = await NewEnv(client, "Staging");
        var id = await m.Create("/assets", Server(source, m.UserId, "10.50.13.60"));

        await m.Post($"/environments/{source}/clone", new { targetEnvironmentId = target, assetIds = new[] { id } });

        var copyId = (await m.Get($"/assets?environmentId={target}")).Body!["items"]!.AsArray().Single()!["id"]!.GetValue<long>();
        var copy = (await m.Get($"/assets/{copyId}")).Body!;
        Assert.Null(copy["ipAddress"]);
        Assert.Null(copy["vlan"]);
        Assert.Equal("Purpose: API", copy["notes"]!.GetValue<string>());
    }
}
