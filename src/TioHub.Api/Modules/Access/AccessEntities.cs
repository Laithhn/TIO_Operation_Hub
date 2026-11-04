using TioHub.Api.Common;

namespace TioHub.Api.Modules.Access;

/// <summary>Person signed in through the organization's identity (Section 6.6). No business-record password exists.</summary>
public class User : Entity
{
    public string AccountName { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Email { get; set; }
    public string WorkingTimeZone { get; set; } = "UTC";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? DeactivatedAt { get; set; }
    public string? DeactivationReason { get; set; }
    public DateTimeOffset? LastSignInAt { get; set; }
    /// <summary>Organization groups seen at the last sign-in that matched a mapping, so effective access can be evaluated for assignment checks.</summary>
    public string? MappedGroups { get; set; }
    /// <summary>Directly granted access; group mappings add to it.</summary>
    public bool AllClients { get; set; }
    public bool AllInternal { get; set; }
    public List<UserRole> Roles { get; set; } = [];
    public List<UserScope> Scopes { get; set; } = [];
}

/// <summary>A role assignment. Users may hold multiple active roles; their rights combine before prerequisites are evaluated.</summary>
public class UserRole
{
    public long UserId { get; set; }
    public long AppRoleId { get; set; }
    public AppRole? AppRole { get; set; }
}

/// <summary>A configurable role and the rights assigned to it. Built-in roles carry a key (Manager, Engineer); the Manager role always holds every right.</summary>
public class AppRole : Entity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Key { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLocked => Key == "Manager";
    public List<RoleRight> Rights { get; set; } = [];
}

/// <summary>A right assigned to a role.</summary>
public class RoleRight
{
    public long AppRoleId { get; set; }
    public AppRole? AppRole { get; set; }
    public string RightKey { get; set; } = "";
}

/// <summary>An explicit, optionally temporary exception to role-based access.</summary>
public class UserRightException
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string RightKey { get; set; } = "";
    public string Effect { get; set; } = "";
    public DateTimeOffset? ExpiresAt { get; set; }
    /// <summary>At most one of these is set; all empty means the exception applies throughout the person's data scope.</summary>
    public long? ClientId { get; set; }
    public long? ProjectId { get; set; }
    public long? TeamId { get; set; }
    public bool IsGlobal => ClientId is null && ProjectId is null && TeamId is null;
}

/// <summary>The stored copy of one catalog entry. Code owns the catalog; this row gives role grants and exceptions referential integrity.</summary>
public class RightDefinition : Entity
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public string Description { get; set; } = "";
    public string Module { get; set; } = "";
    public string Feature { get; set; } = "";
    public string Kind { get; set; } = "Action";
    public string RiskLevel { get; set; } = "Normal";
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>One client, project or internal-team scope grant.</summary>
public class UserScope
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public ScopeKind Kind { get; set; }
    public long? ClientId { get; set; }
    public long? ProjectId { get; set; }
    public long? TeamId { get; set; }
}

/// <summary>Maps an organization (AD) group to roles and scope. Sign-in needs a mapping or a direct role.</summary>
public class GroupMapping : Entity
{
    public string GroupName { get; set; } = "";
    public bool AllClients { get; set; }
    public bool AllInternal { get; set; }
    public List<GroupMappingRole> Roles { get; set; } = [];
    public List<GroupMappingScope> Scopes { get; set; } = [];
}

/// <summary>A role that members of a directory group inherit.</summary>
public class GroupMappingRole
{
    public long GroupMappingId { get; set; }
    public long AppRoleId { get; set; }
    public AppRole? AppRole { get; set; }
}

public class GroupMappingScope
{
    public long Id { get; set; }
    public long GroupMappingId { get; set; }
    public ScopeKind Kind { get; set; }
    public long? ClientId { get; set; }
    public long? ProjectId { get; set; }
    public long? TeamId { get; set; }
}
