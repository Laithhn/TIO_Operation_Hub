using TioHub.Api.Common;

namespace TioHub.Api.Security;

/// <summary>Effective rights snapshot for one user, built at sign-in and cached briefly (Section 3).</summary>
public sealed record ResolvedUser(
    long UserId, string AccountName, string DisplayName, string TimeZone, bool IsActive,
    string[] Roles, string[] Rights,
    bool AllClients, long[] ClientIds, long[] ProjectIds, long[] ProjectClientIds, long[] ProjectEnvironmentIds,
    bool AllInternal, long[] TeamIds, DateTimeOffset? NextRightExpiry = null, string? AccessRestriction = null,
    string[]? AssignedRights = null, ScopedException[]? ScopedExceptions = null)
{
    /// <summary>Admission uses only effective rights, after expiration, denies, and prerequisites.</summary>
    public bool HasAccess => IsActive && (Roles.Length > 0 || Rights.Length > 0);

    public bool Holds(string key) => Rights.Contains(key, StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// The signed-in user for the current request, and the only place a right is checked. Active role rights are combined by union,
/// exceptions are applied, and prerequisites are resolved. Data scope is an independent mandatory boundary.
/// </summary>
public sealed class UserContext
{
    public bool IsResolved { get; private set; }
    public bool IsActive { get; private set; }
    public long? UserId { get; private set; }
    public string AccountName { get; private set; } = "system";
    public string DisplayName { get; private set; } = "System";
    public string TimeZone { get; private set; } = "UTC";
    /// <summary>Names of the roles held.</summary>
    public string[] Roles { get; private set; } = [];
    public string[] EffectiveRights { get; private set; } = [];
    private HashSet<string> RightSet { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    /// <summary>Role and global exception keys before prerequisites; the input of contextual decisions.</summary>
    private string[] AssignedKeys { get; set; } = [];
    public ScopedException[] ScopedExceptions { get; private set; } = [];

    public bool AllClients { get; private set; }
    public List<long> ClientIds { get; private set; } = [];
    public List<long> ProjectIds { get; private set; } = [];
    public List<long> ProjectClientIds { get; private set; } = [];
    public List<long> ProjectEnvironmentIds { get; private set; } = [];
    public bool AllInternal { get; private set; }
    public List<long> TeamIds { get; private set; } = [];

    /// <summary>System context (startup seeding, background evaluation): sees everything.</summary>
    public bool IsSystem { get; private set; } = true;

    private bool _hasAccess;

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
        EffectiveRights = u.IsActive ? RightsCatalog.Resolve(u.Rights) : [];
        RightSet = EffectiveRights.ToHashSet(StringComparer.OrdinalIgnoreCase);
        AssignedKeys = u.IsActive ? u.AssignedRights ?? u.Rights : [];
        ScopedExceptions = u.IsActive ? u.ScopedExceptions ?? [] : [];
        _hasAccess = u.IsActive && (u.Roles.Length > 0 || RightSet.Count > 0);
        // No effective access, no business data, whatever scopes were stored.
        AllClients = _hasAccess && u.AllClients;
        ClientIds = _hasAccess ? [.. u.ClientIds] : [];
        ProjectIds = _hasAccess ? [.. u.ProjectIds] : [];
        ProjectClientIds = _hasAccess ? [.. u.ProjectClientIds] : [];
        ProjectEnvironmentIds = _hasAccess ? [.. u.ProjectEnvironmentIds] : [];
        AllInternal = _hasAccess && u.AllInternal;
        TeamIds = _hasAccess ? [.. u.TeamIds] : [];
    }

    public bool HasAccess => IsSystem || _hasAccess;

    public bool HasRight(string resource, string action) => HasRight(RightKeys.KeyOf(resource, action));

    public bool HasRight(string key) => IsSystem || (RightsCatalog.Find(key) is not null && RightSet.Contains(key));

    public void RequireRight(string key)
    {
        if (HasRight(key)) return;
        var info = RightsCatalog.Find(key);
        var missing = RightsCatalog.Dependencies(key).FirstOrDefault(required => !HasRight(required));
        throw new ForbiddenException(missing is not null
            ? $"This also needs {RightsCatalog.Find(missing)?.Label ?? missing} ({missing}). Ask the System Administrator."
            : $"This needs {info?.Label ?? key} for {info?.FeatureLabel ?? key}. Ask the System Administrator.");
    }

    public void RequireRight(string resource, string action) => RequireRight(RightKeys.KeyOf(resource, action));

    /// <summary>The decision for one record. Data scope stays a separate check: a scoped allow never adds visibility.</summary>
    public AuthorizationDecision Decide(string key, ResourceContext context, DateTimeOffset? at = null) =>
        IsSystem ? new(true, "System execution context.")
        : !HasAccess ? new(false, "The account has no effective access.")
        : AuthorizationDecisions.Decide(AssignedKeys, ScopedExceptions, key, context, at ?? DateTimeOffset.UtcNow);

    public bool HasRightIn(string resource, string action, ResourceContext context) =>
        Decide(RightKeys.KeyOf(resource, action), context).Allowed;

    public void RequireRightIn(string resource, string action, ResourceContext context)
    {
        var decision = Decide(RightKeys.KeyOf(resource, action), context);
        if (decision.Allowed) return;
        if (ScopedExceptions.Length > 0 && HasRight(resource, action)) throw new ForbiddenException(decision.Reason);
        RequireRight(resource, action);
        throw new ForbiddenException(decision.Reason);
    }

    /// <summary>Every part of the operation must lie inside the caller's data scope.</summary>
    public bool SeesContext(ResourceContext context) =>
        context.ClientIds.Length > 0 ? context.ClientIds.All(HasClient) && context.TeamIds.All(t => SeesInternal(t))
        : context.TeamIds.Length > 0 ? context.TeamIds.All(t => SeesInternal(t))
        : SeesInternal(null);

    public bool IsAdministrator => !IsSystem && HasRight(RightKeys.Administration);

    public void RequireAdministrator()
    {
        if (!IsSystem && !IsAdministrator) throw new ForbiddenException("This action needs the Administration right.");
    }

    /// <summary>Technical detail (IAM-04).</summary>
    public bool SeesTechnical => HasRight(RightKeys.TechnicalDetail);

    /// <summary>Full access to a client's records (client scope).</summary>
    public bool HasClient(long clientId) => IsSystem || AllClients || ClientIds.Contains(clientId);

    /// <summary>Can at least see the client's summary (client scope or a project scope inside it).</summary>
    public bool SeesClient(long clientId) => HasClient(clientId) || ProjectClientIds.Contains(clientId);

    public bool SeesEnvironment(long clientId, long environmentId) => HasClient(clientId) || ProjectEnvironmentIds.Contains(environmentId);

    public bool SeesInternal(long? teamId) => IsSystem || AllInternal || (teamId is { } t && TeamIds.Contains(t));

    /// <summary>Scope check for a client-or-internal record.</summary>
    public bool SeesScope(long? clientId, long? teamId) => clientId is { } c ? HasClient(c) : SeesInternal(teamId);
}
