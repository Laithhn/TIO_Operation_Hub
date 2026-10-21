using TioHub.Api.Common;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Modules.Clients;

/// <summary>CLI-01: the primary operational and access boundary.</summary>
public class Client : Entity, IArchivable, IAccountable, IClientOwned
{
    /// <summary>Unique and reserved across archive/restore (Section 5.8).</summary>
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>Null with <see cref="CountryUnknown"/> = explicit onboarding Unknown.</summary>
    public string? Country { get; set; }
    public bool CountryUnknown { get; set; }
    public long? CountryFollowUpOwnerId { get; set; }
    public User? CountryFollowUpOwner { get; set; }
    public ClientStatus Status { get; set; } = ClientStatus.Opportunity;
    public string? ParentOrganization { get; set; }
    /// <summary>A29: a sub-client (for example Traffic Department under Dubai Police) names its main client. One level only.</summary>
    public long? ParentClientId { get; set; }
    public Client? ParentClient { get; set; }
    public string? Partner { get; set; }
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    public string? ResponsibleOrganization { get; set; }
    public long? ResponsibleTeamId { get; set; }
    public long? CoordinatorUserId { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? NextReviewAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => Id;
    public List<Region> Regions { get; set; } = [];
    public List<Project> Projects { get; set; } = [];
    public List<ClientTeamMember> Team { get; set; } = [];
}

/// <summary>A29: the project team of a client or sub-client: hub users with their role on this client.</summary>
public class ClientTeamMember
{
    public long Id { get; set; }
    public long ClientId { get; set; }
    public long UserId { get; set; }
    public User? User { get; set; }
    public string Role { get; set; } = "";
    public int SortOrder { get; set; }
}

/// <summary>REG-01: optional client-owned grouping. Zero regions is valid; never a placeholder.</summary>
public class Region : Entity, IArchivable, IClientOwned
{
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>CLI-02: optional engagement link, not a hierarchy container.</summary>
public class Project : Entity, IArchivable, IClientOwned
{
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Planned;
    public string? ScopeSummary { get; set; }
    public DateOnly? ServiceStart { get; set; }
    public DateOnly? ServiceEnd { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
    public List<ProjectProduct> Products { get; set; } = [];
}

public class ProjectProduct
{
    public long ProjectId { get; set; }
    public long ProductId { get; set; }
}

/// <summary>Customer or vendor contact. Personal data is restricted to the client's scope (Section 6.2).</summary>
public class Contact : Entity, IArchivable, IClientOwned
{
    public long ClientId { get; set; }
    public string Name { get; set; } = "";
    public string? Role { get; set; }
    public string? Organization { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool AuthorizedSupport { get; set; }
    public long? ProjectId { get; set; }
    public string? Responsibility { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>Who performs an area of work (application, database, OS, network, backup, monitoring…) for a client or one environment.</summary>
public class ResponsibilityBoundary : Entity, IArchivable, IClientOwned
{
    public long ClientId { get; set; }
    public long? EnvironmentId { get; set; }
    public string Area { get; set; } = "";
    public ResponsibleParty Party { get; set; }
    public string? Organization { get; set; }
    public long? ContactId { get; set; }
    public long? CoordinatorUserId { get; set; }
    public User? Coordinator { get; set; }
    /// <summary>A36: the responsible person — a team member, or anyone typed with contact details (not limited to hub users).</summary>
    public long? ResponsibleUserId { get; set; }
    public User? ResponsibleUser { get; set; }
    public string? PersonName { get; set; }
    public string? PersonTitle { get; set; }
    public string? PersonPhone { get; set; }
    public string? PersonMobile { get; set; }
    public string? PersonEmail { get; set; }
    public string? Notes { get; set; }
    public string? Evidence { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}
