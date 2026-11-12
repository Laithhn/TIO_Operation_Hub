using System.Security.AccessControl;
using System.Security.Principal;
using System.Runtime.Versioning;
using Microsoft.AspNetCore.DataProtection;

namespace TioHub.Api.Security;

public static class HubDataProtection
{
    // Fixed so the keys keep working when the application folder changes. The framework's default name is that folder's path.
    public const string ApplicationName = "TioHub";

    /// <summary>A85: where a deployed application keeps its keys unless DataProtection:KeysFolder says otherwise. Outside every application folder, so a new package never replaces it.</summary>
    public static string DefaultFolder => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "TioHub", "DataProtection-Keys");

    /// <summary>
    /// With DataProtection:KeysFolder set, keys live in that folder and survive a new server, app-pool identity or application path.
    /// Otherwise they live in <paramref name="defaultFolder"/>, created for this identity, SYSTEM and administrators only, and survive a new application path or restart.
    /// With neither, as in development and tests, the framework picks the folder. The keys are not encrypted at rest, so a restored copy works on another server: permissions protect them.
    /// </summary>
    public static IServiceCollection AddHubDataProtection(this IServiceCollection services, IConfiguration config, string? defaultFolder = null)
    {
        var builder = services.AddDataProtection().SetApplicationName(ApplicationName);
        var folder = config["DataProtection:KeysFolder"];
        if (string.IsNullOrWhiteSpace(folder))
        {
            if (defaultFolder is null) return services;
            folder = defaultFolder;
            CreateRestricted(folder);
        }
        if (!Path.IsPathFullyQualified(folder))
            throw new InvalidOperationException("DataProtection:KeysFolder must be a full path outside the application folder, such as D:\\TioHubKeys or \\\\server\\share\\TioHubKeys.");
        EnsureWritable(folder);
        builder.PersistKeysToFileSystem(new DirectoryInfo(folder));
        return services;
    }

    // A folder that already exists keeps its permissions: an administrator or the installation set them.
    private static void CreateRestricted(string folder)
    {
        if (Directory.Exists(folder)) return;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(folder)!);
            if (OperatingSystem.IsWindows()) CreateForThisIdentity(folder);
            else Directory.CreateDirectory(folder, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException($"The data-protection key folder '{folder}' cannot be written by the application's identity. Create it and grant this identity Modify, or set DataProtection:KeysFolder.", e);
        }
    }

    [SupportedOSPlatform("windows")]
    private static void CreateForThisIdentity(string folder)
    {
        var security = new DirectorySecurity();
        security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
        IdentityReference[] owners = [new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null), WindowsIdentity.GetCurrent().User!];
        foreach (var owner in owners)
            security.AddAccessRule(new FileSystemAccessRule(owner, FileSystemRights.FullControl, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, AccessControlType.Allow));
        new DirectoryInfo(folder).Create(security);
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
            throw new InvalidOperationException($"The data-protection key folder '{folder}' cannot be written by the application's identity. Grant this identity Modify on it, or set DataProtection:KeysFolder.", e);
        }
    }
}
