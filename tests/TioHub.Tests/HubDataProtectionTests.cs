using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Database-free: stored Jira tokens must stay readable when the application moves, as long as the key folder is the same.</summary>
public sealed class HubDataProtectionTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), $"tiohub-keys-{Guid.NewGuid():N}");

    private ServiceProvider Host(string? keysFolder, string contentRoot)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:KeysFolder"] = keysFolder }).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IHostEnvironment>(new HostingEnvironment { ContentRootPath = contentRoot, ApplicationName = "TioHub.Api" });
        services.AddHubDataProtection(config);
        services.AddDataProtection();
        return services.BuildServiceProvider();
    }

    private static IDataProtector Protector(ServiceProvider host) => host.GetRequiredService<IDataProtectionProvider>().CreateProtector("test");

    [Fact]
    public void A_token_stays_readable_from_another_application_path_with_the_same_folder()
    {
        var keys = Path.Combine(root, "keys");
        using var before = Host(keys, @"C:\sites\old");
        using var after = Host(keys, @"D:\sites\new");
        Assert.Equal("token", Protector(after).Unprotect(Protector(before).Protect("token")));
    }

    [Fact]
    public void A_token_is_unreadable_with_a_different_folder()
    {
        using var first = Host(Path.Combine(root, "a"), @"C:\sites\app");
        using var second = Host(Path.Combine(root, "b"), @"C:\sites\app");
        var cipher = Protector(first).Protect("token");
        Assert.ThrowsAny<CryptographicException>(() => Protector(second).Unprotect(cipher));
    }

    [Fact]
    public void Keys_are_written_to_the_configured_folder()
    {
        var keys = Path.Combine(root, "keys");
        using var host = Host(keys, @"C:\sites\app");
        Protector(host).Protect("token");
        Assert.Single(Directory.GetFiles(keys, "key-*.xml"));
        Assert.Empty(Directory.GetFiles(keys, ".write-check-*"));
    }

    [Theory]
    [InlineData("keys")]
    [InlineData(@"App_Data\keys")]
    public void A_relative_folder_is_refused(string folder)
    {
        var e = Assert.Throws<InvalidOperationException>(() => Host(folder, @"C:\sites\app"));
        Assert.Contains("DataProtection:KeysFolder", e.Message);
    }

    [Fact]
    public void A_folder_that_cannot_be_created_is_refused_at_startup()
    {
        Directory.CreateDirectory(root);
        var file = Path.Combine(root, "not-a-folder");
        File.WriteAllText(file, "");
        var e = Assert.Throws<InvalidOperationException>(() => Host(Path.Combine(file, "keys"), @"C:\sites\app"));
        Assert.Contains("cannot be written", e.Message);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Without_a_folder_nothing_is_configured(string? folder)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:KeysFolder"] = folder }).Build();
        Assert.Empty(new ServiceCollection().AddHubDataProtection(config));
    }

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }
}
