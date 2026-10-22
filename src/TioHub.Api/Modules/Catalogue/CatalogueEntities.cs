using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Environments;

namespace TioHub.Api.Modules.Catalogue;

/// <summary>Catalogue definition such as PSOP or ViTIS (Section 6.3). Retiring keeps historical meaning (NFR-09).</summary>
/// <summary>A software product (the business also says "application") that TIO delivers and supports.</summary>
public class Product : Entity
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>Controlled aliases (other names the product is known by), separated by semicolons.</summary>
    public string? Aliases { get; set; }
    public string? Description { get; set; }
    /// <summary>Free grouping, e.g. "Back office", "ANPR", "Big data".</summary>
    public string? Category { get; set; }
    /// <summary>Technology stack and platform notes, e.g. ".NET 8, SQL Server, Docker".</summary>
    public string? Technology { get; set; }
    /// <summary>The internal team that develops or maintains the product.</summary>
    public long? OwningTeamId { get; set; }
    public Teams.Team? OwningTeam { get; set; }
    /// <summary>The person accountable for the product, as free text (owner decision, 20 Oct 2026: not limited to hub users).</summary>
    public string? ProductOwner { get; set; }
    public bool IsActive { get; set; } = true;
    public List<ProductModule> Modules { get; set; } = [];
    public List<ProductVersion> Versions { get; set; } = [];
    public List<ProductFeature> Features { get; set; } = [];
    public List<ProductMicroservice> Microservices { get; set; } = [];
    /// <summary>The people who develop the application (owner decision, 20 Oct 2026; replaces "owning team" on screen).</summary>
    public List<ProductDeveloper> Developers { get; set; } = [];
}

/// <summary>An application developer of a product. Not necessarily a hub user, so recorded by name (and optionally e-mail).</summary>
public class ProductDeveloper
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public string Name { get; set; } = "";
    /// <summary>"Lead" (lead / expert developer) or "Developer".</summary>
    public string Role { get; set; } = "Developer";
    public string? Email { get; set; }
    public int SortOrder { get; set; }
}

/// <summary>A released version of a microservice with its release notes.</summary>
public class MicroserviceVersion : Entity
{
    public long MicroserviceId { get; set; }
    public string Version { get; set; } = "";
    public string SortKey { get; set; } = "";
    public DateOnly? ReleasedOn { get; set; }
    public string? ReleaseNotes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// A deployable microservice of a product (products are built on a microservices architecture), e.g. PSOP.Importer.Microservice.
/// Installations record which microservice runs on which server as components linked to this definition.
/// </summary>
public class ProductMicroservice : Entity
{
    public long ProductId { get; set; }
    public long? ModuleId { get; set; }
    public ProductModule? Module { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    /// <summary>Component role code (reference list ComponentRole), e.g. Import or Workflow; used for the deployed component.</summary>
    public string? Role { get; set; }
    public bool IsActive { get; set; } = true;
    public List<MicroserviceVersion> Versions { get; set; } = [];
}

/// <summary>A capability of a product, optionally belonging to one of its modules.</summary>
public class ProductFeature : Entity
{
    public long ProductId { get; set; }
    public long? ModuleId { get; set; }
    public ProductModule? Module { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    /// <summary>A57: the product version that introduced the feature (its "new features" list).</summary>
    public long? IntroducedInVersionId { get; set; }
    public ProductVersion? IntroducedInVersion { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ProductModule : Entity
{
    public long ProductId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>Product-specific version. Versions of unrelated products are never compared as one sequence.</summary>
public class ProductVersion : Entity
{
    public long ProductId { get; set; }
    public Product? Product { get; set; }
    public string Version { get; set; } = "";
    public string SortKey { get; set; } = "";
    public DateOnly? ReleasedOn { get; set; }
    /// <summary>A57: what changed in this version (plain text).</summary>
    public string? ReleaseNotes { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>ENV-02: one named instance of a product in one environment. Several named instances of one product are allowed.</summary>
public class Installation : Entity, IArchivable, IClientOwned
{
    public long EnvironmentId { get; set; }
    public ClientEnvironment? Environment { get; set; }
    public long ClientId { get; set; }
    public long ProductId { get; set; }
    public Product? Product { get; set; }
    public long? ModuleId { get; set; }
    public ProductModule? Module { get; set; }
    public string InstanceName { get; set; } = "";
    public string NormalizedInstanceName { get; set; } = "";
    /// <summary>Null = explicit Unknown version.</summary>
    public long? ProductVersionId { get; set; }
    public ProductVersion? ProductVersion { get; set; }
    public DateOnly? DeployedOn { get; set; }
    public string? SupportNotes { get; set; }
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public DateTimeOffset? LastReviewedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}

/// <summary>Explicit version confirmation: old/new value, actor, time, reason and evidence (Section 6.3).</summary>
public class InstallationVersionChange
{
    public long Id { get; set; }
    public long InstallationId { get; set; }
    public long ClientId { get; set; }
    public long? FromVersionId { get; set; }
    public ProductVersion? FromVersion { get; set; }
    public long? ToVersionId { get; set; }
    public ProductVersion? ToVersion { get; set; }
    public string Reason { get; set; } = "";
    public string Evidence { get; set; } = "";
    public DateOnly? DeployedOn { get; set; }
    public long? ChangedById { get; set; }
    public User? ChangedBy { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
}
