using TioHub.Api.Common;

namespace TioHub.Api.Modules.Clients;

/// <summary>Reusable business identity. Client-backed identities derive their name/alias from the existing client.</summary>
public class Organization : Entity, IClientOwned
{
    public long? ClientId { get; set; }
    public Client? Client { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? OrganizationType { get; set; }
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Status { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>An optional directed edge, scoped to a client and optionally one of its projects. Depth has no stored limit.</summary>
public class OrganizationRelationship : Entity, IClientOwned
{
    public long ClientId { get; set; }
    public long? ProjectId { get; set; }
    public long ProjectScope { get; private set; }
    public long ParentOrganizationId { get; set; }
    public long ChildOrganizationId { get; set; }
    public string? RelationshipType { get; set; }
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public long? ScopeClientId => ClientId;
}
