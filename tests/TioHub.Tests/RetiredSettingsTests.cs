using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;

namespace TioHub.Tests;

/// <summary>A126: the vault reference feature was removed; its setting is not seeded and is deleted from existing databases.</summary>
[Collection("hub")]
public class RetiredSettingsTests(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task The_vault_reference_prefix_setting_is_gone_after_startup()
    {
        var m = await Hub.As(HubFactory.Manager);
        Assert.DoesNotContain((await m.Get("/admin/settings")).Body!.AsArray(), s => s!["key"]!.GetValue<string>() == "VaultReferencePrefix");

        // An upgraded database still holding the row loses it at the next start; other settings stay.
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        db.Settings.Add(new AppSetting { Key = "VaultReferencePrefix", Value = "vault://", Description = "Old" });
        await db.SaveChangesAsync();
        await ReferenceData.SeedAsync(db);

        var keys = (await m.Get("/admin/settings")).Body!.AsArray().Select(s => s!["key"]!.GetValue<string>()).ToList();
        Assert.DoesNotContain("VaultReferencePrefix", keys);
        Assert.Contains(SettingKeys.ApprovedLinkHosts, keys);
    }
}
