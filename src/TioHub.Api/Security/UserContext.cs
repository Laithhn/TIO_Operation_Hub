using TioHub.Api.Common;

namespace TioHub.Api.Security;

/// <summary>Effective permission snapshot for one user, built at sign-in and cached briefly (Section 3).</summary>
public sealed record ResolvedUser(
    long UserId, string AccountName, string DisplayName, string TimeZone, bool IsActive,
    string[] Roles, Right Rights, string[] Permissions, Grant Grants,
    bool AllClients, long[] ClientIds, long[] ProjectIds, long[] ProjectClientIds, long[] ProjectEnvironmentIds,
    bool AllInternal, long[] TeamIds, DateTimeOffset? NextPermissionExpiry = null, string? AccessRestriction = null,
    string[]? AssignedPermissions = null, ScopedException[]? ScopedExceptions = null)
{
    /// <summary>Admission uses only effective permissions, after expiration, denies, and prerequisites.</summary>
    public bool HasAccess => IsActive && (Roles.Length > 0 || Permissions.Length > 0);
}

/// <summary>
/// The signed-in user for the current request. Active role permissions are combined by union; module View is
/// a prerequisite for that module's mutations. Scope and grant checks remain independent mandatory boundaries.
/// </summary>
public sealed class UserContext
{
    public bool IsResolved { get; private set; }
    public bool IsActive { get; private set; }
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
    /// <summary>Role and global exception keys before prerequisites; the input of contextual decisions.</summary>
    private string[] AssignedKeys { get; set; } = [];
    public ScopedException[] ScopedExceptions { get; private set; } = [];

    /// <summary>Legacy business-access indicator, derived from effective permissions for roleless users.</summary>
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
        IsActive = u.IsActive;
        UserId = u.UserId;
        AccountName = u.AccountName;
        DisplayName = u.DisplayName;
        TimeZone = u.TimeZone;
        Roles = u.Roles;
        Rights = u.Rights;
        PermissionKeys = u.IsActive ? PermissionHierarchy.Resolve(u.Permissions) : [];
        PermissionSet = PermissionKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        AssignedKeys = u.IsActive ? u.AssignedPermissions ?? u.Permissions : [];
        ScopedExceptions = u.IsActive ? u.ScopedExceptions ?? [] : [];
        Grants = u.Grants;
        // Preserve the legacy role indicator for existing role holders, while allowing explicitly
        // granted capabilities to work without a role. Scope remains a separate mandatory boundary.
        BusinessRole = !u.IsActive || (u.Roles.Length == 0 && PermissionSet.Count == 0) ? null : PermissionSet.Contains(ResourcePermissions.KeyOf(ResourcePermissions.Structure, ResourcePermissions.Coordinate)) ? Role.Manager : Role.Engineer;
        IsAdministrator = u.IsActive && u.Rights.HasFlag(Right.Administer);
        // No effective access, no business data, whatever scopes were stored.
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
        : HasAny(ResourcePermissions.Maintain);

    public bool HasRight(Right right) => IsSystem || (right switch
    {
        Right.Edit => Can(Role.Engineer),
        Right.Manage => HasPermission(ResourcePermissions.Structure, ResourcePermissions.Coordinate),
        Right.Archive => HasAny(ResourcePermissions.ArchiveRestore),
        Right.Delete => HasAny(ResourcePermissions.Delete),
        _ => HasBusinessRole && (Rights & right) == right
    });

    public bool HasPermission(string resource, string action) => IsSystem ||
        (HasBusinessRole && ResourcePermissions.TryParse(ResourcePermissions.KeyOf(resource, action), out _, out _)
            && PermissionSet.Contains(ResourcePermissions.KeyOf(resource, action))
            && CapabilityPermissions.Dependencies(ResourcePermissions.KeyOf(resource, action)).All(PermissionSet.Contains));

    public bool HasPermission(string key) => ResourcePermissions.TryParse(key, out var resource, out var action) && HasPermission(resource, action);

    public void RequirePermission(string key)
    {
        if (!HasPermission(key)) throw new ForbiddenException($"This needs {PermissionHierarchy.Find(key)?.DisplayName ?? key} ({key}) and its parent access grants.");
    }

    /// <summary>The decision for one record. Data scope stays a separate check: a scoped allow never adds visibility.</summary>
    public AuthorizationDecision Decide(string key, ResourceContext context, DateTimeOffset? at = null) =>
        IsSystem ? new(true, "System execution context.")
        : !HasBusinessRole ? new(false, "The account has no effective access.")
        : AuthorizationDecisions.Decide(AssignedKeys, ScopedExceptions, key, context, at ?? DateTimeOffset.UtcNow);

    public bool HasPermissionIn(string resource, string action, ResourceContext context) =>
        Decide(ResourcePermissions.KeyOf(resource, action), context).Allowed;

    public void RequirePermissionIn(string resource, string action, ResourceContext context)
    {
        var decision = Decide(ResourcePermissions.KeyOf(resource, action), context);
        if (decision.Allowed) return;
        if (ScopedExceptions.Length > 0 && HasPermission(resource, action)) throw new ForbiddenException(decision.Reason);
        RequirePermission(resource, action);
        throw new ForbiddenException(decision.Reason);
    }

    /// <summary>Every part of the operation must lie inside the caller's data scope.</summary>
    public bool SeesContext(ResourceContext context) =>
        context.ClientIds.Length > 0 ? context.ClientIds.All(HasClient) && context.TeamIds.All(t => SeesInternal(t))
        : context.TeamIds.Length > 0 ? context.TeamIds.All(t => SeesInternal(t))
        : SeesInternal(null);

    public bool HasAny(string action) => IsSystem || (HasBusinessRole && PermissionSet.Any(p =>
        ResourcePermissions.TryParse(p, out var resource, out var candidate) && candidate == action && HasPermission(resource, candidate)));

    public void RequirePermission(string resource, string action)
    {
        if (HasPermission(resource, action)) return;
        var missingDependency = CapabilityPermissions.Dependencies(ResourcePermissions.KeyOf(resource, action)).FirstOrDefault(key => !HasPermission(key));
        if (missingDependency is not null)
            throw new ForbiddenException($"This also needs {missingDependency} before an action in this module can run.");
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
    public bool HoldsGrant(Grant grant) => IsSystem || IsActive && (Grants & grant) == grant;

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
