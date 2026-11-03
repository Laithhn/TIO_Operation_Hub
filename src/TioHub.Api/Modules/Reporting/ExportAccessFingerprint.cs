using System.Security.Cryptography;
using System.Text.Json;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>Records access at the start of an export, without persisting the permissions themselves.</summary>
public static class ExportAccessFingerprint
{
    public static string For(UserContext user)
    {
        var data = JsonSerializer.SerializeToUtf8Bytes(new
        {
            user.UserId, user.IsActive, user.AllClients, user.AllInternal,
            Clients = user.ClientIds.Order().ToArray(), Projects = user.ProjectIds.Order().ToArray(),
            ProjectClients = user.ProjectClientIds.Order().ToArray(), Environments = user.ProjectEnvironmentIds.Order().ToArray(),
            Teams = user.TeamIds.Order().ToArray(), user.Grants,
            Permissions = user.PermissionKeys.Select(p => p.ToUpperInvariant()).Order(StringComparer.Ordinal).ToArray()
        });
        // Scoped exceptions are hashed only when present, so a person without any keeps files generated before this release.
        if (user.ScopedExceptions.Length > 0)
            data = [.. data, .. JsonSerializer.SerializeToUtf8Bytes(user.ScopedExceptions
                .Select(s => new { Key = s.Key.ToUpperInvariant(), s.Allow, s.ClientId, s.ProjectId, s.TeamId, s.ExpiresAt })
                .OrderBy(s => s.Key, StringComparer.Ordinal).ThenBy(s => s.ClientId).ThenBy(s => s.ProjectId).ThenBy(s => s.TeamId))];
        return Convert.ToHexString(SHA256.HashData(data));
    }

    public static bool IsCurrent(string? saved, UserContext user) => saved is not null &&
        string.Equals(saved, For(user), StringComparison.Ordinal);
}
