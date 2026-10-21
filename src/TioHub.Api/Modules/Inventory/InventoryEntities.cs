using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Environments;

namespace TioHub.Api.Modules.Inventory;

/// <summary>INF-01/03: VM, physical server or logical endpoint in one environment. Recorded provisioning, never live utilization.</summary>
public class Asset : Entity, IArchivable, IAccountable, IClientOwned
{
    public long EnvironmentId { get; set; }
    public ClientEnvironment? Environment { get; set; }
    public long ClientId { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    /// <summary>A34: the configured type (Administration → Configuration); <see cref="TypeCategory"/> keeps the built-in behaviour.</summary>
    public string Type { get; set; } = "";
    public AssetType TypeCategory { get; set; }
    public string? Role { get; set; }
    [TechnicalDetail] public string? NetworkZone { get; set; }
    public string? ProjectPhase { get; set; }
    public AssetLifecycle Lifecycle { get; set; } = AssetLifecycle.Unknown;
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    /// <summary>Owner request (20 Oct 2026): a technical owner who is not a hub user, by name, with contact details.</summary>
    public string? TechnicalOwnerName { get; set; }
    /// <summary>A36: contact details entered separately; <see cref="TechnicalOwnerContact"/> keeps any other notes.</summary>
    public string? TechnicalOwnerTitle { get; set; }
    public string? TechnicalOwnerOrganization { get; set; }
    public string? TechnicalOwnerPhone { get; set; }
    public string? TechnicalOwnerMobile { get; set; }
    public string? TechnicalOwnerEmail { get; set; }
    public string? TechnicalOwnerContact { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    public string? ResponsibleOrganization { get; set; }
    public long? ResponsibleTeamId { get; set; }
    public long? CoordinatorUserId { get; set; }
    /// <summary>Null = unknown. Positive only.</summary>
    public decimal? CpuQuantity { get; set; }
    public CpuUnit? CpuUnit { get; set; }
    public decimal? RamQuantity { get; set; }
    public MemoryUnit? RamUnit { get; set; }
    public string? OsFamily { get; set; }
    public string? OsVersion { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
    public List<Volume> Volumes { get; set; } = [];
    public List<ComponentHost> Hosts { get; set; } = [];
}

/// <summary>INF-02: a service role within an installation; separate from the assets that host it.</summary>
public class Component : Entity, IArchivable, IAccountable, IClientOwned
{
    public long InstallationId { get; set; }
    public Installation? Installation { get; set; }
    public long EnvironmentId { get; set; }
    public long ClientId { get; set; }
    /// <summary>The product microservice this deployed component is (null for components recorded without a catalogue microservice).</summary>
    public long? MicroserviceId { get; set; }
    public ProductMicroservice? Microservice { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public string Role { get; set; } = "";
    /// <summary>Optional; never silently copied from the product version.</summary>
    public string? ComponentVersion { get; set; }
    public long? OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public ResponsibleParty ResponsibleParty { get; set; } = ResponsibleParty.TIO;
    public string? ResponsibleOrganization { get; set; }
    public long? ResponsibleTeamId { get; set; }
    public long? CoordinatorUserId { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
    public List<ComponentHost> Hosts { get; set; } = [];
}

/// <summary>Many-to-many: one component on several assets, one asset hosting several components.</summary>
public class ComponentHost
{
    public long ComponentId { get; set; }
    public Component? Component { get; set; }
    public long AssetId { get; set; }
    public Asset? Asset { get; set; }
    public long ClientId { get; set; }
    /// <summary>For a product microservice: the version deployed on this server (versions can differ per server, e.g. during a rolling upgrade). Null = not recorded.</summary>
    public long? MicroserviceVersionId { get; set; }
    public MicroserviceVersion? MicroserviceVersion { get; set; }
}

/// <summary>A storage capacity shared by several volumes; its capacity is counted once (Section 7 Resource totals).</summary>
public class SharedStorage : Entity, IArchivable, IClientOwned
{
    public long ClientId { get; set; }
    public long? EnvironmentId { get; set; }
    public string Name { get; set; } = "";
    public decimal? Capacity { get; set; }
    public StorageUnit? Unit { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}

public class Volume : Entity, IArchivable, IClientOwned
{
    public long AssetId { get; set; }
    public long EnvironmentId { get; set; }
    public long ClientId { get; set; }
    public string Label { get; set; } = "";
    public decimal? Capacity { get; set; }
    public StorageUnit? Unit { get; set; }
    public string? Purpose { get; set; }
    public long? SharedStorageId { get; set; }
    public SharedStorage? SharedStorage { get; set; }
    public DateTimeOffset? ArchivedAt { get; set; }
    public long? ArchivedById { get; set; }
    public string? ArchiveReason { get; set; }
    public long? ScopeClientId => ClientId;
}
