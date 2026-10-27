using TioHub.Api.Common;

namespace TioHub.Api.Security;

/// <summary>Effective permission snapshot for one user, built at sign-in and cached briefly (Section 3).</summary>
public sealed record ResolvedUser(
    long UserId, string AccountName, string DisplayName, string TimeZone, bool IsActive,
    string[] Roles, Right Rights, string[] Permissions, Grant Grants,
    bool AllClients, long[] ClientIds, long[] ProjectIds, long[] ProjectClientIds, long[] ProjectEnvironmentIds,
    bool AllInternal, long[] TeamIds);

/// <summary>
/// The signed-in user for the current request. Two roles (owner decision, 19 Oct 2026): Operation Engineer and TIO Manager. Both see
/// all clients and internal teams, technical detail and change history, and can export; the TIO Manager also administers users and settings.
/// The scope and grant machinery is kept (query filters, Has/SeesScope) but every active user with a role holds full scope and all grants.
/// </summary>
public sealed class UserContext
{
    public bool IsResolved { get; private set; }
    public long? UserId { get; private set; }
    public string AccountName { get; private set; } = "system";
    public string DisplayName { get; private set; } = "System";
    public string TimeZone { get; private set; } = "UTC";
    /// <summary>Names of the roles held (A31: configurable roles).</summary>
    public string[] Roles { get; private set; } = [];
    public Right Rights { get; private set; }
    public string[] PermissionKeys { get; private set; } = [];
    private HashSet<string> PermissionSet { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Grant Grants { get; private set; }

    /// <summary>Highest business role, or null for users with only the administrator role.</summary>
    public Role? BusinessRole { get; private set; }
    public bool IsAdministrator { get; private set; }

    public bool AllClients { get; private set; }
    public List<long> ClientIds { get; private set; } = [];
    public List<long> ProjectIds { get; private set; } = [];
    public List<long> ProjectClientIds { get; private set; } = [];
    public List<long> ProjectEnvironmentIds { get; private set; } = [];
    public bool AllInternal { get; private set; }
    public List<long> TeamIds { get; private set; } = [];

    /// <summary>System context (startup seeding, background evaluation): sees everything.</summary>
    public bool IsSystem { get; private set; } = true;

    public void Set(ResolvedUser u)
    {
        IsResolved = true;
        IsSystem = false;
        UserId = u.UserId;
        AccountName = u.AccountName;
        DisplayName = u.DisplayName;
        TimeZone = u.TimeZone;
        Roles = u.Roles;
        Rights = u.Rights;
        PermissionKeys = u.Permissions;
        PermissionSet = u.Permissions.ToHashSet(StringComparer.OrdinalIgnoreCase);
        Grants = u.Grants;
        // Role identity determines business visibility; resource permissions determine each action.
        BusinessRole = u.Roles.Length == 0 ? null : PermissionSet.Contains(ResourcePermissions.KeyOf(ResourcePermissions.Structure, ResourcePermissions.Coordinate)) ? Role.Manager : Role.Engineer;
        IsAdministrator = u.Rights.HasFlag(Right.Administer);
        // No business role, no business access, whatever scopes were granted.
        var hasBusiness = BusinessRole is not null;
        AllClients = hasBusiness && u.AllClients;
        ClientIds = hasBusiness ? [.. u.ClientIds] : [];
        ProjectIds = hasBusiness ? [.. u.ProjectIds] : [];
        ProjectClientIds = hasBusiness ? [.. u.ProjectClientIds] : [];
        ProjectEnvironmentIds = hasBusiness ? [.. u.ProjectEnvironmentIds] : [];
        AllInternal = hasBusiness && u.AllInternal;
        TeamIds = hasBusiness ? [.. u.TeamIds] : [];
    }

    public bool HasBusinessRole => IsSystem || BusinessRole is not null;

    /// <summary>Compatibility helper. New handlers should check the specific resource and action.</summary>
    public bool Can(Role minimum) => minimum == Role.Manager
        ? HasPermission(ResourcePermissions.Structure, ResourcePermissions.Coordinate)
        : HasBusinessRole && PermissionSet.Any(p => p.EndsWith($":{ResourcePermissions.Maintain}", StringComparison.OrdinalIgnoreCase));

    public bool HasRight(Right right) => IsSystem || (right switch
    {
        Right.Edit => Can(Role.Engineer),
        Right.Manage => HasPermission(ResourcePermissions.Structure, ResourcePermissions.Coordinate),
        Right.Archive => HasAny(ResourcePermissions.ArchiveRestore),
        Right.Delete => HasAny(ResourcePermissions.Delete),
        _ => HasBusinessRole && (Rights & right) == right
    });

    public bool HasPermission(string resource, string action) => IsSystem ||
        (HasBusinessRole && PermissionSet.Contains(ResourcePermissions.KeyOf(resource, action)));

    public bool HasAny(string action) => IsSystem || (HasBusinessRole && PermissionSet.Any(p =>
        p.EndsWith($":{action}", StringComparison.OrdinalIgnoreCase)));

    public void RequirePermission(string resource, string action)
    {
        if (HasPermission(resource, action)) return;
        var row = ResourcePermissions.Catalog.FirstOrDefault(x => x.Resource == resource && x.Action == action);
        throw new ForbiddenException($"This needs {row?.ActionLabel ?? action} for {row?.ResourceLabel ?? resource}. Ask the TIO Manager.");
    }

    public void RequireRight(Right right)
    {
        if (!HasRight(right))
            throw new ForbiddenException($"This needs the \"{BuiltInRoles.Catalog.FirstOrDefault(r => r.Key == right)?.Label ?? right.ToString()}\" right. Ask the TIO Manager.");
    }

    /// <summary>Structure coordination authority. Other resource coordination is checked independently.</summary>
    public bool IsLead => Can(Role.Manager);
    public bool IsManager => Can(Role.Manager);

    public bool Has(Grant grant) => IsSystem || (HasBusinessRole && (Grants & grant) == grant);

    /// <summary>The grant itself, without a business role: lets an administrator holding Audit read access-administration history only.</summary>
    public bool HoldsGrant(Grant grant) => IsSystem || (Grants & grant) == grant;

    /// <summary>Technical detail (IAM-04) needs the grant and a business role.</summary>
    public bool SeesTechnical => Has(Grant.TechnicalDetail);

    public void Require(Role minimum)
    {
        if (!Can(minimum)) RequireRight(minimum == Role.Manager ? Right.Manage : Right.Edit);
    }

    public void RequireGrant(Grant grant)
    {
        if (!Has(grant)) throw new ForbiddenException(grant switch
        {
            Grant.Export => "Exporting needs the separate Export permission.",
            Grant.TechnicalDetail => "This needs the Technical detail permission.",
            Grant.Audit => "Viewing change history needs the Audit permission.",
            _ => "You do not have permission for this action."
        });
    }

    public void RequireAdministrator()
    {
        if (!IsSystem && !IsAdministrator) throw new ForbiddenException("This action needs the Administration right.");
    }

    /// <summary>Full access to a client's records (client scope).</summary>
    public bool HasClient(long clientId) => IsSystem || AllClients || ClientIds.Contains(clientId);

    /// <summary>Can at least see the client's summary (client scope or a project scope inside it).</summary>
    public bool SeesClient(long clientId) => HasClient(clientId) || ProjectClientIds.Contains(clientId);

    public bool SeesEnvironment(long clientId, long environmentId) => HasClient(clientId) || ProjectEnvironmentIds.Contains(environmentId);

    public bool SeesInternal(long? teamId) => IsSystem || AllInternal || (teamId is { } t && TeamIds.Contains(t));

    /// <summary>Scope check for a client-or-internal record.</summary>
    public bool SeesScope(long? clientId, long? teamId) => clientId is { } c ? HasClient(c) : SeesInternal(teamId);
}

public static class RoleNames
{
    public static string Label(Role role) => role switch
    {
        Role.Engineer => "Operation Engineer",
        Role.Manager => "TIO Manager",
        _ => role.ToString()
    };
}
