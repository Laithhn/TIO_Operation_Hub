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
    public Grant Grants { get; set; }
    public List<UserRole> Roles { get; set; } = [];
    public List<UserScope> Scopes { get; set; } = [];
}

/// <summary>A31: the role a user holds (one per user, chosen in Administration).</summary>
public class UserRole
{
    public long UserId { get; set; }
    public long AppRoleId { get; set; }
    public AppRole? AppRole { get; set; }
}

/// <summary>A31: a configurable role with its rights. Built-in roles carry a key (Manager, Engineer); the Manager role always holds every right.</summary>
public class AppRole : Entity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public Right Rights { get; set; }
    public string? Key { get; set; }
    public bool IsLocked => Key == "Manager";
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

/// <summary>Maps an organization (AD) group to roles, scope and grants. Sign-in needs a mapping or a direct role.</summary>
public class GroupMapping : Entity
{
    public string GroupName { get; set; } = "";
    public Role? Role { get; set; }
    public bool AllClients { get; set; }
    public bool AllInternal { get; set; }
    public Grant Grants { get; set; }
    public List<GroupMappingScope> Scopes { get; set; } = [];
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
