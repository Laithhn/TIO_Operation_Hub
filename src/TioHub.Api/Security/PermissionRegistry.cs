using Microsoft.EntityFrameworkCore;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>Synchronizes the explicit permission manifest without deleting role assignments.</summary>
public static class PermissionRegistry
{
    public static async Task SynchronizeAsync(HubDbContext db, CancellationToken ct = default)
    {
        // All instances share this database mutex. Acquire it before reading the registry so simultaneous
        // application starts cannot both attempt to insert the same immutable permission key.
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var locked = await db.Database.ExecuteSqlRawAsync("UPDATE [iam].[AuthorizationVersion] WITH (UPDLOCK,HOLDLOCK) SET [Version] = [Version] WHERE [Id] = 1", ct);
        if (locked != 1) throw new InvalidOperationException("The authorization version record is missing; apply the reviewed database migration.");
        var manifest = ResourcePermissions.Registry;
        var keys = manifest.Select(x => x.Key).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var stored = await db.PermissionDefinitions.ToListAsync(ct);
        var byKey = stored.ToDictionary(x => x.Key, StringComparer.OrdinalIgnoreCase);
        foreach (var definition in manifest)
        {
            if (!byKey.TryGetValue(definition.Key, out var row))
            {
                row = new PermissionDefinition { Key = definition.Key };
                db.PermissionDefinitions.Add(row);
            }
            row.DisplayName = definition.DisplayName;
            row.Description = definition.Description;
            row.Module = definition.Module;
            row.ResourceType = definition.ResourceType;
            row.ParentKey = definition.ParentKey;
            row.Action = definition.Action;
            row.RiskLevel = definition.RiskLevel;
            row.NodeType = definition.NodeType;
            row.DisplayOrder = definition.DisplayOrder;
            row.IsSystemManaged = true;
            row.IsActive = true;
            row.SupportsScope = definition.SupportsScope;
        }

        // Removed keys are deprecated, never deleted. Assignments remain available for review/rollback.
        foreach (var stale in stored.Where(x => x.IsSystemManaged && !keys.Contains(x.Key)))
            stale.IsActive = false;

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
