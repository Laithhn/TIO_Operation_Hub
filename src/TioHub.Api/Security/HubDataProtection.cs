using Microsoft.AspNetCore.DataProtection;

namespace TioHub.Api.Security;

public static class HubDataProtection
{
    // Fixed so the keys keep working when the application folder changes. The framework's default name is that folder's path.
    public const string ApplicationName = "TioHub";

    /// <summary>
    /// With DataProtection:KeysFolder set, keys live in that folder and survive a new server, app-pool identity or application path.
    /// Without it the framework's defaults stay: keys under the app-pool profile, tied to the application path.
    /// The folder's permissions protect the keys: they are not encrypted at rest, so a restored copy works on another server.
    /// </summary>
    public static IServiceCollection AddHubDataProtection(this IServiceCollection services, IConfiguration config)
    {
        var folder = config["DataProtection:KeysFolder"];
        if (string.IsNullOrWhiteSpace(folder)) return services;
        if (!Path.IsPathFullyQualified(folder))
            throw new InvalidOperationException("DataProtection:KeysFolder must be a full path outside the application folder, such as D:\\TioHubKeys or \\\\server\\share\\TioHubKeys.");
        EnsureWritable(folder);
        services.AddDataProtection().SetApplicationName(ApplicationName).PersistKeysToFileSystem(new DirectoryInfo(folder));
        return services;
    }

    // Keys are written on first use, which would otherwise turn a wrong folder permission into errors during sign-in.
    private static void EnsureWritable(string folder)
    {
        try
        {
            Directory.CreateDirectory(folder);
            var probe = Path.Combine(folder, $".write-check-{Guid.NewGuid():N}");
            File.WriteAllBytes(probe, []);
            File.Delete(probe);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException($"DataProtection:KeysFolder '{folder}' cannot be written by the application's identity.", e);
        }
    }
}
