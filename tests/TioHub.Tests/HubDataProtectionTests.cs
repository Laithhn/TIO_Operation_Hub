using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Database-free. A88: a deployed hub synchronizes by default, while a development run must never reach a real Jira by accident.</summary>
public sealed class JiraDefaultSettingTests
{
    private static bool? EnabledIn(string file)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "Directory.Build.props"))) dir = dir.Parent;
        using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(Path.Combine(dir!.FullName, "src", "TioHub.Api", file)));
        return doc.RootElement.GetProperty("Jira").GetProperty("Enabled").GetBoolean();
    }

    [Fact]
    public void Jira_is_on_in_a_deployment_and_off_in_development()
    {
        Assert.True(EnabledIn("appsettings.json"));
        Assert.False(EnabledIn("appsettings.Development.json"));
    }
}

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

    private ServiceProvider DeployedHost(string defaultFolder, string contentRoot, string? keysFolder = null)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["DataProtection:KeysFolder"] = keysFolder }).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IHostEnvironment>(new HostingEnvironment { ContentRootPath = contentRoot, ApplicationName = "TioHub.Api" });
        services.AddHubDataProtection(config, defaultFolder);
        return services.BuildServiceProvider();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void A_deployed_application_needs_no_setting_to_keep_a_token_readable_in_a_new_package_folder(string? keysFolder)
    {
        var keys = Path.Combine(root, "default", "keys");
        string cipher;
        using (var before = DeployedHost(keys, @"C:\release\TioHub-2.48.0\app", keysFolder)) cipher = Protector(before).Protect("token");
        using var after = DeployedHost(keys, @"C:\release\TioHub-2.49.0\app", keysFolder);
        Assert.Equal("token", Protector(after).Unprotect(cipher));
        Assert.Single(Directory.GetFiles(keys, "key-*.xml"));
    }

    [Fact]
    public void The_setting_wins_over_the_default_folder()
    {
        var chosen = Path.Combine(root, "chosen");
        var unused = Path.Combine(root, "unused");
        using var host = DeployedHost(unused, @"C:\sites\app", chosen);
        Protector(host).Protect("token");
        Assert.Single(Directory.GetFiles(chosen, "key-*.xml"));
        Assert.False(Directory.Exists(unused));
    }

    [Fact]
    public void The_default_folder_is_only_for_this_identity_system_and_administrators()
    {
        if (!OperatingSystem.IsWindows()) return;
        var keys = Path.Combine(root, "restricted", "keys");
        using var host = DeployedHost(keys, @"C:\sites\app");
        var security = new DirectoryInfo(keys).GetAccessControl();
        Assert.True(security.AreAccessRulesProtected);
        var allowed = security.GetAccessRules(true, true, typeof(SecurityIdentifier)).Cast<FileSystemAccessRule>().Select(r => r.IdentityReference).ToHashSet();
        Assert.Equal(new HashSet<IdentityReference> { new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null), WindowsIdentity.GetCurrent().User! }, allowed);
    }

    [Fact]
    public void Without_a_folder_the_framework_keeps_the_location_but_not_the_path_as_the_name()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IHostEnvironment>(new HostingEnvironment { ContentRootPath = @"C:\sites\app", ApplicationName = "TioHub.Api" });
        services.AddHubDataProtection(config);
        using var host = services.BuildServiceProvider();
        Assert.Equal(HubDataProtection.ApplicationName, host.GetRequiredService<Microsoft.Extensions.Options.IOptions<DataProtectionOptions>>().Value.ApplicationDiscriminator);
    }

    public void Dispose()
    {
        if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
    }
}
