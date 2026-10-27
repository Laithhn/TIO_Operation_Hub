using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>A right a role can hold (A31). Viewing clients and records needs no right: every role can view.</summary>
public sealed record RightInfo(Right Key, string Label, string Description);

/// <summary>
/// A31 (owner request, 20 Oct 2026): roles and rights are configurable. The TIO Manager role (key "Manager") always holds every right,
/// so administration can never be lost; Operation Engineer (key "Engineer") starts with its 2.x rights and can be changed like any other role.
/// </summary>
public static class BuiltInRoles
{
    public const string ManagerKey = "Manager";
    public const string EngineerKey = "Engineer";
    public const Right All = Right.Edit | Right.Manage | Right.Archive | Right.Delete | Right.Export | Right.TechnicalDetail | Right.Audit | Right.Administer;
    public const Right EngineerDefault = Right.Edit | Right.Export | Right.TechnicalDetail | Right.Audit;

    public static readonly RightInfo[] Catalog =
    [
        new(Right.Edit, "Edit records", "Environments, servers, installations, products, contracts, cases and commitments."),
        new(Right.Manage, "Manage clients & structure", "Create clients, sub-clients, regions and projects; assign project managers and owners."),
        new(Right.Archive, "Archive & restore", "Archive records and restore archived ones."),
        new(Right.Delete, "Delete records", "Permanently delete records that nothing else uses: configuration values, products, environments, servers, contracts, teams and more."),
        new(Right.Export, "Export CSV", "Download lists as CSV files."),
        new(Right.TechnicalDetail, "Technical detail", "See and edit network zones and firewall rules."),
        new(Right.Audit, "Change history", "Read who changed what and when."),
        new(Right.Administer, "Administration", "Users, roles, rights, configuration lists and settings.")
    ];

    public static string[] Names(Right rights) => Catalog.Where(r => rights.HasFlag(r.Key)).Select(r => r.Key.ToString()).ToArray();

    /// <summary>Creates the two built-in roles when missing; returns their ids by the old role enum (seeds, bootstrap, group mappings).</summary>
    public static async Task<Dictionary<Role, long>> EnsureAsync(HubDbContext db, CancellationToken ct)
    {
        var roles = await db.AppRoles.Where(r => r.Key != null).ToListAsync(ct);
        var created = new HashSet<string>(StringComparer.Ordinal);
        AppRole Get(string key, string name, Right rights, string description)
        {
            var r = roles.FirstOrDefault(x => x.Key == key);
            if (r is null) { r = new AppRole { Key = key, Name = name, Rights = rights, Description = description }; db.AppRoles.Add(r); roles.Add(r); created.Add(key); }
            return r;
        }
        var manager = Get(ManagerKey, "TIO Manager", All, "Runs the TIO team; administers the hub. Always holds every right.");
        var engineer = Get(EngineerKey, "Operation Engineer", EngineerDefault, "Day-to-day operations work on every client.");
        foreach (var role in new[] { manager, engineer }.Where(r => created.Contains(r.Key!)))
        {
            var permissions = role.Key == ManagerKey ? ResourcePermissions.All : ResourcePermissions.EngineerDefault;
            foreach (var key in permissions)
                if (ResourcePermissions.TryParse(key, out var resource, out var action))
                    role.Permissions.Add(new RolePermission { Resource = resource, Action = action });
        }
        if (manager.Id == 0 || engineer.Id == 0) await db.SaveChangesAsync(ct);
        return new() { [Role.Manager] = manager.Id, [Role.Engineer] = engineer.Id };
    }
}
