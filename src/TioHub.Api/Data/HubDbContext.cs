using System.Diagnostics;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using TioHub.Api.Common;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Firewall;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Data;

public sealed class HubDbContext(DbContextOptions<HubDbContext> options, UserContext user, TimeProvider clock) : DbContext(options)
{
    public const string ScopeFilter = "Scope";
    public const string ArchiveFilter = "Archive";

    // Read by the global query filters; EF parameterizes them per query.
    public bool Sys => user.IsSystem;
    public bool All => user.AllClients;
    public List<long> ClientIds => user.ClientIds;
    public List<long> ProjectIds => user.ProjectIds;
    public List<long> ProjectClientIds => user.ProjectClientIds;
    public List<long> PEnv => user.ProjectEnvironmentIds;
    public bool AllInternal => user.AllInternal;
    public List<long> TeamIds => user.TeamIds;
    public long Me => user.UserId ?? -1;
    public bool IsLead => user.IsLead;
    public bool AnyInternal => user.AllInternal || user.TeamIds.Count > 0;
    public bool Biz => user.HasBusinessRole;

    public UserContext CurrentUser => user;

    /// <summary>Reason recorded on audit entries written by the next SaveChanges (archive, correction, exception…).</summary>
    public string? AuditReason { get; set; }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserCredential> UserCredentials => Set<UserCredential>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<AppRole> AppRoles => Set<AppRole>();
    public DbSet<UserScope> UserScopes => Set<UserScope>();
    public DbSet<GroupMapping> GroupMappings => Set<GroupMapping>();
    public DbSet<GroupMappingScope> GroupMappingScopes => Set<GroupMappingScope>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<ClientTeamMember> ClientTeamMembers => Set<ClientTeamMember>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectProduct> ProjectProducts => Set<ProjectProduct>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<ResponsibilityBoundary> Boundaries => Set<ResponsibilityBoundary>();
    public DbSet<ClientEnvironment> Environments => Set<ClientEnvironment>();
    public DbSet<ConditionReport> ConditionReports => Set<ConditionReport>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductModule> ProductModules => Set<ProductModule>();
    public DbSet<ProductFeature> ProductFeatures => Set<ProductFeature>();
    public DbSet<ProductMicroservice> ProductMicroservices => Set<ProductMicroservice>();
    public DbSet<MicroserviceVersion> MicroserviceVersions => Set<MicroserviceVersion>();
    public DbSet<ProductDeveloper> ProductDevelopers => Set<ProductDeveloper>();
    public DbSet<ProductVersion> ProductVersions => Set<ProductVersion>();
    public DbSet<Installation> Installations => Set<Installation>();
    public DbSet<InstallationVersionChange> InstallationVersionChanges => Set<InstallationVersionChange>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Component> Components => Set<Component>();
    public DbSet<ComponentHost> ComponentHosts => Set<ComponentHost>();
    public DbSet<SharedStorage> SharedStorages => Set<SharedStorage>();
    public DbSet<Volume> Volumes => Set<Volume>();
    public DbSet<Modules.Firewall.FirewallRule> FirewallRules => Set<Modules.Firewall.FirewallRule>();
    public DbSet<Modules.Notifications.Notification> Notifications => Set<Modules.Notifications.Notification>();
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<CaseEnvironment> CaseEnvironments => Set<CaseEnvironment>();
    public DbSet<CaseAsset> CaseAssets => Set<CaseAsset>();
    public DbSet<CaseComponent> CaseComponents => Set<CaseComponent>();
    public DbSet<CaseWaitingInterval> CaseWaitingIntervals => Set<CaseWaitingInterval>();
    public DbSet<CaseEvent> CaseEvents => Set<CaseEvent>();
    public DbSet<JiraInstance> JiraInstances => Set<JiraInstance>();
    public DbSet<JiraReference> JiraReferences => Set<JiraReference>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractEnvironment> ContractEnvironments => Set<ContractEnvironment>();
    public DbSet<SlaTarget> SlaTargets => Set<SlaTarget>();
    public DbSet<Commitment> Commitments => Set<Commitment>();
    public DbSet<CommitmentEvent> CommitmentEvents => Set<CommitmentEvent>();
    public DbSet<Escalation> Escalations => Set<Escalation>();
    public DbSet<EscalationEvent> EscalationEvents => Set<EscalationEvent>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<Handover> Handovers => Set<Handover>();
    public DbSet<HandoverItem> HandoverItems => Set<HandoverItem>();
    public DbSet<ReviewPolicy> ReviewPolicies => Set<ReviewPolicy>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DataQualityItem> DataQualityItems => Set<DataQualityItem>();
    public DbSet<DocumentReference> DocumentReferences => Set<DocumentReference>();
    public DbSet<Modules.Attachments.Attachment> Attachments => Set<Modules.Attachments.Attachment>();
    public DbSet<Modules.Notes.Notebook> Notebooks => Set<Modules.Notes.Notebook>();
    public DbSet<Modules.Notes.NoteSection> NoteSections => Set<Modules.Notes.NoteSection>();
    public DbSet<Modules.Notes.NotePage> NotePages => Set<Modules.Notes.NotePage>();
    public DbSet<Modules.Notes.NoteFile> NoteFiles => Set<Modules.Notes.NoteFile>();
    public DbSet<LookupValue> LookupValues => Set<LookupValue>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<ExportLog> ExportLogs => Set<ExportLog>();
    // A62: Reporting Center
    public DbSet<Modules.Reporting.ExportJob> ExportJobs => Set<Modules.Reporting.ExportJob>();
    public DbSet<Modules.Reporting.ReportSchedule> ReportSchedules => Set<Modules.Reporting.ReportSchedule>();
    public DbSet<Modules.Reporting.ReportScheduleRecipient> ReportScheduleRecipients => Set<Modules.Reporting.ReportScheduleRecipient>();
    public DbSet<Modules.Reporting.ReportPreset> ReportPresets => Set<Modules.Reporting.ReportPreset>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        foreach (var enumType in typeof(Role).Assembly.GetTypes().Where(t => t.IsEnum && t.Namespace?.StartsWith("TioHub.Api") == true && t != typeof(Grant)))
            b.Properties(enumType).HaveConversion<string>().HaveMaxLength(40);
        b.Properties<string>().HaveMaxLength(400);
        b.Properties<decimal>().HavePrecision(12, 2);
    }

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.HasSequence<int>("CaseNumbers", "work").StartsAt(1001);
        m.HasSequence<int>("CommitmentNumbers", "work").StartsAt(1001);
        m.HasSequence<int>("EscalationNumbers", "work").StartsAt(1001);
        m.HasSequence<int>("HandoverNumbers", "teams").StartsAt(101);
        m.HasSequence<int>("ContractNumbers", "contracts").StartsAt(1001);

        // ---- iam ----
        m.Entity<User>(e =>
        {
            e.ToTable("User", "iam");
            e.Property(x => x.AccountName).HasMaxLength(200);
            e.HasIndex(x => x.AccountName).IsUnique();
            e.Property(x => x.DisplayName).HasMaxLength(150);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.WorkingTimeZone).HasMaxLength(64);
            e.Property(x => x.DeactivationReason).HasMaxLength(1000);
            e.Property(x => x.Grants).HasConversion<int>();
            e.HasMany(x => x.Roles).WithOne().HasForeignKey(x => x.UserId);
            e.HasMany(x => x.Scopes).WithOne().HasForeignKey(x => x.UserId);
        });
        m.Entity<UserRole>(e =>
        {
            e.ToTable("UserRole", "iam");
            e.HasKey(x => new { x.UserId, x.AppRoleId });
            e.HasOne(x => x.AppRole).WithMany().HasForeignKey(x => x.AppRoleId).OnDelete(DeleteBehavior.Restrict);
        });
        m.Entity<AppRole>(e =>
        {
            e.ToTable("AppRole", "iam");
            e.Property(x => x.Name).HasMaxLength(60);
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Description).HasMaxLength(300);
            e.Property(x => x.Key).HasMaxLength(20);
            e.HasIndex(x => x.Key).IsUnique().HasFilter("[Key] IS NOT NULL");
            e.Property(x => x.Rights).HasConversion<int>();
            e.Ignore(x => x.IsLocked);
        });
        // Forms sign-in only: one credential per user, never audited automatically and never projected by any endpoint.
        m.Entity<UserCredential>(e =>
        {
            e.ToTable("UserCredential", "iam");
            e.HasKey(x => x.UserId);
            e.Property(x => x.UserId).ValueGeneratedNever();
            e.Property(x => x.PasswordHash).HasMaxLength(200);
            e.Property(x => x.RowVersion).IsRowVersion();
            e.HasOne<User>().WithOne().HasForeignKey<UserCredential>(x => x.UserId);
        });
        m.Entity<UserScope>(e =>
        {
            e.ToTable("UserScope", "iam");
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.TeamId);
        });
        m.Entity<GroupMapping>(e =>
        {
            e.ToTable("GroupMapping", "iam");
            e.Property(x => x.GroupName).HasMaxLength(256);
            e.HasIndex(x => x.GroupName).IsUnique();
            e.Property(x => x.Grants).HasConversion<int>();
            e.HasMany(x => x.Scopes).WithOne().HasForeignKey(x => x.GroupMappingId);
        });
        m.Entity<GroupMappingScope>(e =>
        {
            e.ToTable("GroupMappingScope", "iam");
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.TeamId);
        });

        // ---- clients ----
        m.Entity<Client>(e =>
        {
            e.ToTable("Client", "clients");
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Country).HasMaxLength(100);
            e.Property(x => x.ParentOrganization).HasMaxLength(150);
            e.Property(x => x.Partner).HasMaxLength(150);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne(x => x.CountryFollowUpOwner).WithMany().HasForeignKey(x => x.CountryFollowUpOwnerId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasMany(x => x.Regions).WithOne(x => x.Client).HasForeignKey(x => x.ClientId);
            e.HasMany(x => x.Projects).WithOne(x => x.Client).HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.ParentClient).WithMany().HasForeignKey(x => x.ParentClientId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.Id) || ProjectClientIds.Contains(x.Id));
        });
        m.Entity<ClientTeamMember>(e =>
        {
            e.ToTable("ClientTeamMember", "clients");
            e.Property(x => x.Role).HasMaxLength(100);
            e.HasIndex(x => new { x.ClientId, x.UserId }).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });
        m.Entity<Region>(e =>
        {
            e.ToTable("Region", "clients");
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasIndex(x => new { x.ClientId, x.Code }).IsUnique();
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || ProjectClientIds.Contains(x.ClientId));
        });
        m.Entity<Project>(e =>
        {
            e.ToTable("Project", "clients");
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.ScopeSummary).HasMaxLength(2000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasMany(x => x.Products).WithOne().HasForeignKey(x => x.ProjectId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || ProjectIds.Contains(x.Id));
        });
        m.Entity<ProjectProduct>(e =>
        {
            e.ToTable("ProjectProduct", "clients");
            e.HasKey(x => new { x.ProjectId, x.ProductId });
            e.HasOne<Product>().WithMany().HasForeignKey(x => x.ProductId);
        });
        m.Entity<Contact>(e =>
        {
            e.ToTable("Contact", "clients");
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Role).HasMaxLength(150);
            e.Property(x => x.Organization).HasMaxLength(150);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Phone).HasMaxLength(50);
            e.Property(x => x.Responsibility).HasMaxLength(1000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || (x.ProjectId != null && ProjectIds.Contains(x.ProjectId.Value)));
        });
        m.Entity<ResponsibilityBoundary>(e =>
        {
            e.ToTable("ResponsibilityBoundary", "clients");
            e.Property(x => x.Area).HasMaxLength(100);
            e.Property(x => x.Organization).HasMaxLength(150);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.Property(x => x.Evidence).HasMaxLength(1000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne<Contact>().WithMany().HasForeignKey(x => x.ContactId);
            e.HasOne(x => x.Coordinator).WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || (x.EnvironmentId != null && PEnv.Contains(x.EnvironmentId.Value)));
            e.HasOne(x => x.ResponsibleUser).WithMany().HasForeignKey(x => x.ResponsibleUserId);
            e.Property(x => x.PersonName).HasMaxLength(150);
            e.Property(x => x.PersonTitle).HasMaxLength(100);
            e.Property(x => x.PersonPhone).HasMaxLength(30);
            e.Property(x => x.PersonMobile).HasMaxLength(30);
            e.Property(x => x.PersonEmail).HasMaxLength(254);
        });

        // ---- env ----
        m.Entity<ClientEnvironment>(e =>
        {
            e.ToTable("Environment", "env");
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.NormalizedName).HasMaxLength(100);
            e.Property(x => x.RegionScope).HasComputedColumnSql("ISNULL([RegionId], 0)", stored: true);
            e.HasIndex(x => new { x.ClientId, x.RegionScope, x.NormalizedName }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.TypeDescription).HasMaxLength(150);
            e.Property(x => x.Location).HasMaxLength(150);
            e.Property(x => x.BackupGapReason).HasMaxLength(1000);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.ConditionReason).HasMaxLength(1000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.Region).WithMany().HasForeignKey(x => x.RegionId);
            e.HasOne(x => x.Project).WithMany().HasForeignKey(x => x.ProjectId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne(x => x.BackupOwner).WithMany().HasForeignKey(x => x.BackupOwnerUserId);
            e.HasOne(x => x.Coordinator).WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.Id));
        });
        m.Entity<ConditionReport>(e =>
        {
            e.ToTable("ConditionReport", "env");
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.Evidence).HasMaxLength(1000);
            e.HasIndex(x => new { x.EnvironmentId, x.ObservedAt });
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne(x => x.RecordedBy).WithMany().HasForeignKey(x => x.RecordedById);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });

        // ---- catalogue ----
        m.Entity<Product>(e =>
        {
            e.ToTable("Product", "catalogue");
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Aliases).HasMaxLength(400);
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.Category).HasMaxLength(100);
            e.Property(x => x.Technology).HasMaxLength(1000);
            e.HasOne(x => x.OwningTeam).WithMany().HasForeignKey(x => x.OwningTeamId);
            e.Property(x => x.ProductOwner).HasMaxLength(150);
            e.HasMany(x => x.Modules).WithOne().HasForeignKey(x => x.ProductId);
            e.HasMany(x => x.Versions).WithOne(x => x.Product).HasForeignKey(x => x.ProductId);
            e.HasMany(x => x.Features).WithOne().HasForeignKey(x => x.ProductId);
            e.HasMany(x => x.Microservices).WithOne().HasForeignKey(x => x.ProductId);
            e.HasMany(x => x.Developers).WithOne().HasForeignKey(x => x.ProductId);
        });
        m.Entity<ProductDeveloper>(e =>
        {
            e.ToTable("ProductDeveloper", "catalogue");
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Role).HasMaxLength(40);
            e.Property(x => x.Email).HasMaxLength(254);
        });
        m.Entity<MicroserviceVersion>(e =>
        {
            e.ToTable("MicroserviceVersion", "catalogue");
            e.Property(x => x.Version).HasMaxLength(50);
            e.Property(x => x.SortKey).HasMaxLength(100);
            e.Property(x => x.ReleaseNotes).HasMaxLength(8000);
            e.HasIndex(x => new { x.MicroserviceId, x.Version }).IsUnique();
        });
        m.Entity<ProductMicroservice>(e =>
        {
            e.ToTable("ProductMicroservice", "catalogue");
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Role).HasMaxLength(100);
            e.HasOne(x => x.Module).WithMany().HasForeignKey(x => x.ModuleId);
            e.HasIndex(x => new { x.ProductId, x.Name }).IsUnique();
            e.HasMany(x => x.Versions).WithOne().HasForeignKey(x => x.MicroserviceId);
        });
        m.Entity<ProductFeature>(e =>
        {
            e.ToTable("ProductFeature", "catalogue");
            e.HasOne(x => x.IntroducedInVersion).WithMany().HasForeignKey(x => x.IntroducedInVersionId);
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasOne(x => x.Module).WithMany().HasForeignKey(x => x.ModuleId);
            e.HasIndex(x => new { x.ProductId, x.Name }).IsUnique();
        });
        m.Entity<ProductModule>(e =>
        {
            e.ToTable("ProductModule", "catalogue");
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasIndex(x => new { x.ProductId, x.Code }).IsUnique();
        });
        m.Entity<ProductVersion>(e =>
        {
            e.ToTable("ProductVersion", "catalogue");
            e.Property(x => x.Version).HasMaxLength(50);
            e.Property(x => x.SortKey).HasMaxLength(100);
            e.Property(x => x.ReleaseNotes).HasMaxLength(8000);
            e.HasIndex(x => new { x.ProductId, x.Version }).IsUnique();
        });
        m.Entity<Installation>(e =>
        {
            e.ToTable("Installation", "catalogue");
            e.Property(x => x.InstanceName).HasMaxLength(100);
            e.Property(x => x.NormalizedInstanceName).HasMaxLength(100);
            e.HasIndex(x => new { x.EnvironmentId, x.ProductId, x.NormalizedInstanceName }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.SupportNotes).HasMaxLength(2000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Environment).WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.Product).WithMany().HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.Module).WithMany().HasForeignKey(x => x.ModuleId);
            e.HasOne(x => x.ProductVersion).WithMany().HasForeignKey(x => x.ProductVersionId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });
        m.Entity<InstallationVersionChange>(e =>
        {
            e.ToTable("InstallationVersionChange", "catalogue");
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.Evidence).HasMaxLength(1000);
            e.HasOne<Installation>().WithMany().HasForeignKey(x => x.InstallationId);
            e.HasOne(x => x.FromVersion).WithMany().HasForeignKey(x => x.FromVersionId);
            e.HasOne(x => x.ToVersion).WithMany().HasForeignKey(x => x.ToVersionId);
            e.HasOne(x => x.ChangedBy).WithMany().HasForeignKey(x => x.ChangedById);
        });

        // ---- inventory ----
        m.Entity<Asset>(e =>
        {
            e.ToTable("Asset", "inventory");
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.NormalizedName).HasMaxLength(150);
            e.HasIndex(x => new { x.EnvironmentId, x.NormalizedName }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.Role).HasMaxLength(100);
            e.Property(x => x.NetworkZone).HasMaxLength(100);
            e.Property(x => x.TechnicalOwnerName).HasMaxLength(150);
            e.Property(x => x.TechnicalOwnerContact).HasMaxLength(300);
            e.Property(x => x.TechnicalOwnerTitle).HasMaxLength(100);
            e.Property(x => x.TechnicalOwnerOrganization).HasMaxLength(150);
            e.Property(x => x.TechnicalOwnerPhone).HasMaxLength(30);
            e.Property(x => x.TechnicalOwnerMobile).HasMaxLength(30);
            e.Property(x => x.TechnicalOwnerEmail).HasMaxLength(254);
            e.Property(x => x.ProjectPhase).HasMaxLength(100);
            e.Property(x => x.OsFamily).HasMaxLength(100);
            e.Property(x => x.OsVersion).HasMaxLength(100);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Environment).WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasMany(x => x.Volumes).WithOne().HasForeignKey(x => x.AssetId);
            e.HasMany(x => x.Hosts).WithOne(x => x.Asset).HasForeignKey(x => x.AssetId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });
        m.Entity<Component>(e =>
        {
            e.ToTable("Component", "inventory");
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.NormalizedName).HasMaxLength(150);
            e.HasIndex(x => new { x.InstallationId, x.NormalizedName }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.Role).HasMaxLength(100);
            e.Property(x => x.ComponentVersion).HasMaxLength(50);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.Installation).WithMany().HasForeignKey(x => x.InstallationId);
            e.HasOne(x => x.Microservice).WithMany().HasForeignKey(x => x.MicroserviceId);
            e.HasIndex(x => new { x.InstallationId, x.MicroserviceId }).IsUnique().HasFilter("[MicroserviceId] IS NOT NULL AND [ArchivedAt] IS NULL");
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<Team>().WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasMany(x => x.Hosts).WithOne(x => x.Component).HasForeignKey(x => x.ComponentId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });
        m.Entity<ComponentHost>(e =>
        {
            e.ToTable("ComponentHost", "inventory");
            e.HasKey(x => new { x.ComponentId, x.AssetId });
            e.HasOne(x => x.MicroserviceVersion).WithMany().HasForeignKey(x => x.MicroserviceVersionId);
        });
        m.Entity<SharedStorage>(e =>
        {
            e.ToTable("SharedStorage", "inventory");
            e.Property(x => x.Name).HasMaxLength(150);
            e.HasIndex(x => new { x.ClientId, x.Name }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || (x.EnvironmentId != null && PEnv.Contains(x.EnvironmentId.Value)));
        });
        m.Entity<Volume>(e =>
        {
            e.ToTable("Volume", "inventory");
            e.Property(x => x.Label).HasMaxLength(100);
            e.HasIndex(x => new { x.AssetId, x.Label }).IsUnique().HasFilter("[ArchivedAt] IS NULL");
            e.Property(x => x.Purpose).HasMaxLength(200);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne(x => x.SharedStorage).WithMany().HasForeignKey(x => x.SharedStorageId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });

        // ---- notifications (A38): one row per person and notice ----
        m.Entity<Modules.Notifications.Notification>(e =>
        {
            e.ToTable("Notification", "notify");
            e.Property(x => x.Kind).HasMaxLength(20);
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Body).HasMaxLength(500);
            e.Property(x => x.Link).HasMaxLength(300);
            e.Property(x => x.Key).HasMaxLength(200);
            e.HasIndex(x => new { x.UserId, x.Key }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.ReadAt });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---- firewall rules (A35; replaces network endpoints and dependencies) ----
        m.Entity<Modules.Firewall.FirewallRule>(e =>
        {
            e.ToTable("FirewallRule", "network");
            e.Property(x => x.Ports).HasMaxLength(200);
            e.Property(x => x.Purpose).HasMaxLength(500);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne(x => x.SourceAsset).WithMany().HasForeignKey(x => x.SourceAssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.DestinationAsset).WithMany().HasForeignKey(x => x.DestinationAssetId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.SourceAssetId);
            e.HasIndex(x => x.DestinationAssetId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || PEnv.Contains(x.EnvironmentId));
        });

        // ---- work ----
        m.Entity<Case>(e =>
        {
            e.ToTable("Case", "work");
            e.Property(x => x.Ref).HasMaxLength(20).HasDefaultValueSql("CONCAT('CS-', NEXT VALUE FOR [work].[CaseNumbers])").ValueGeneratedOnAdd();
            e.Property(x => x.Ref).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            e.HasIndex(x => x.Ref).IsUnique();
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.ImpactSummary).HasMaxLength(2000);
            e.Property(x => x.ProgressSummary).HasMaxLength(2000);
            e.Property(x => x.NextAction).HasMaxLength(1000);
            e.Property(x => x.DueTimeZone).HasMaxLength(64);
            e.Property(x => x.UnknownEnvironmentReason).HasMaxLength(1000);
            e.Property(x => x.ValidationRequest).HasMaxLength(1000);
            e.Property(x => x.Outcome).HasMaxLength(2000);
            e.Property(x => x.ValidationEvidence).HasMaxLength(1000);
            e.Property(x => x.EvidenceExceptionReason).HasMaxLength(1000);
            e.Property(x => x.CancelReason).HasMaxLength(1000);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.Status, x.DueAt });
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId);
            // A61: contractual SLA
            e.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
            e.HasIndex(x => new { x.ContractId, x.CreatedAt });
            e.HasIndex(x => new { x.ResponseSlaStatus, x.ResponseDueAt });
            e.HasIndex(x => new { x.ResolutionSlaStatus, x.ResolutionDueAt });
            e.Property(x => x.SlaTimeZone).HasMaxLength(64);
            e.Property(x => x.SlaContractRef).HasMaxLength(20);
            e.Property(x => x.SlaNote).HasMaxLength(300);
            e.Property(x => x.SlaSupportDays).HasConversion<int>();
            e.HasOne(x => x.ResponsibleTeam).WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne(x => x.BackupOwner).WithMany().HasForeignKey(x => x.BackupOwnerUserId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.EvidenceExceptionApprovedById);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.EvidenceExceptionFollowUpOwnerId);
            e.HasMany(x => x.Environments).WithOne().HasForeignKey(x => x.CaseId);
            e.HasMany(x => x.Assets).WithOne().HasForeignKey(x => x.CaseId);
            e.HasMany(x => x.Components).WithOne().HasForeignKey(x => x.CaseId);
            e.HasMany(x => x.JiraReferences).WithOne().HasForeignKey(x => x.CaseId);
            e.HasMany(x => x.WaitingIntervals).WithOne().HasForeignKey(x => x.CaseId);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || x.Environments.Any(ce => PEnv.Contains(ce.EnvironmentId))))
                || (x.ClientId == null && (AllInternal || (x.ResponsibleTeamId != null && TeamIds.Contains(x.ResponsibleTeamId.Value)))));
        });
        m.Entity<CaseEnvironment>(e => { e.ToTable("CaseEnvironment", "work"); e.HasKey(x => new { x.CaseId, x.EnvironmentId }); e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId); });
        m.Entity<CaseAsset>(e => { e.ToTable("CaseAsset", "work"); e.HasKey(x => new { x.CaseId, x.AssetId }); e.HasOne<Asset>().WithMany().HasForeignKey(x => x.AssetId); });
        m.Entity<CaseComponent>(e => { e.ToTable("CaseComponent", "work"); e.HasKey(x => new { x.CaseId, x.ComponentId }); e.HasOne<Component>().WithMany().HasForeignKey(x => x.ComponentId); });
        m.Entity<CaseWaitingInterval>(e =>
        {
            e.ToTable("CaseWaitingInterval", "work");
            e.Property(x => x.Note).HasMaxLength(1000);
        });
        m.Entity<CaseEvent>(e =>
        {
            e.ToTable("CaseEvent", "work");
            e.Property(x => x.FromValue).HasMaxLength(400);
            e.Property(x => x.ToValue).HasMaxLength(400);
            e.Property(x => x.Note).HasMaxLength(2000);
            e.HasIndex(x => new { x.CaseId, x.At });
            e.HasOne<Case>().WithMany().HasForeignKey(x => x.CaseId);
            e.HasOne(x => x.By).WithMany().HasForeignKey(x => x.ById);
        });
        m.Entity<JiraInstance>(e =>
        {
            e.ToTable("JiraInstance", "work");
            e.Property(x => x.Name).HasMaxLength(100);
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.ApprovedHost).HasMaxLength(253);
        });
        m.Entity<JiraReference>(e =>
        {
            e.ToTable("JiraReference", "work");
            e.Property(x => x.IssueKey).HasMaxLength(40);
            e.Property(x => x.Url).HasMaxLength(500);
            e.Property(x => x.ReuseReason).HasMaxLength(1000);
            e.HasIndex(x => new { x.CaseId, x.JiraInstanceId, x.IssueKey }).IsUnique().HasFilter("[RemovedAt] IS NULL");
            e.HasIndex(x => new { x.JiraInstanceId, x.IssueKey });
            e.HasOne(x => x.JiraInstance).WithMany().HasForeignKey(x => x.JiraInstanceId);
        });

        // ---- contracts and recorded SLA terms (CLI-04) ----
        m.Entity<Contract>(e =>
        {
            e.ToTable("Contract", "contracts");
            e.Property(x => x.Currency).HasMaxLength(3);
            e.Property(x => x.SupportDays).HasConversion<int>();
            e.Property(x => x.Ref).HasMaxLength(20).HasDefaultValueSql("CONCAT('CT-', NEXT VALUE FOR [contracts].[ContractNumbers])").ValueGeneratedOnAdd();
            e.Property(x => x.Ref).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            e.HasIndex(x => x.Ref).IsUnique();
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.ContractReference).HasMaxLength(100);
            e.Property(x => x.SupportHours).HasMaxLength(200);
            e.Property(x => x.SupportTimeZone).HasMaxLength(64);
            e.Property(x => x.Coverage).HasMaxLength(2000);
            e.Property(x => x.Obligations).HasMaxLength(4000);
            e.Ignore(x => x.ScopeClientId);
            e.Ignore(x => x.NoticeDeadline);
            e.HasIndex(x => new { x.Status, x.EndDate });
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne(x => x.Project).WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || ProjectIds.Contains(x.ProjectId));
        });
        m.Entity<ContractEnvironment>(e =>
        {
            e.ToTable("ContractEnvironment", "contracts");
            e.HasKey(x => new { x.ContractId, x.EnvironmentId });
            e.HasOne<ClientEnvironment>().WithMany().HasForeignKey(x => x.EnvironmentId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
        });
        // A49: delivery schedule, fees and costs, payment terms.
        m.Entity<ContractMilestone>(e =>
        {
            e.ToTable("ContractMilestone", "contracts");
            e.Property(x => x.Phase).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(1000);
        });
        m.Entity<ContractFee>(e =>
        {
            e.ToTable("ContractFee", "contracts");
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.Unit).HasMaxLength(50);
            e.Property(x => x.Quantity).HasPrecision(18, 2);
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
        });
        m.Entity<ContractPayment>(e =>
        {
            e.ToTable("ContractPayment", "contracts");
            e.Property(x => x.Condition).HasMaxLength(500);
            e.Property(x => x.Percentage).HasPrecision(5, 2);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.HasIndex(x => new { x.Status, x.DueDate });
        });
        m.Entity<SlaTarget>(e =>
        {
            e.ToTable("SlaTarget", "contracts");
            e.Property(x => x.Notes).HasMaxLength(500);
            e.HasIndex(x => new { x.ContractId, x.Priority }).IsUnique();
        });

        // ---- commitments ----
        m.Entity<Commitment>(e =>
        {
            e.ToTable("Commitment", "work");
            e.Property(x => x.Ref).HasMaxLength(20).HasDefaultValueSql("CONCAT('CM-', NEXT VALUE FOR [work].[CommitmentNumbers])").ValueGeneratedOnAdd();
            e.Property(x => x.Ref).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            e.HasIndex(x => x.Ref).IsUnique();
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.TimeZone).HasMaxLength(64);
            e.Property(x => x.CompletionEvidence).HasMaxLength(1000);
            e.Property(x => x.CancelReason).HasMaxLength(1000);
            e.Property(x => x.ResponsibleOrganization).HasMaxLength(150);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.Status, x.CurrentDueAt });
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.ResponsibleTeam).WithMany().HasForeignKey(x => x.ResponsibleTeamId);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasOne<Case>().WithMany().HasForeignKey(x => x.CaseId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId);
            e.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.CommitmentId);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || (x.ProjectId != null && ProjectIds.Contains(x.ProjectId.Value))))
                || (x.ClientId == null && (AllInternal || (x.ResponsibleTeamId != null && TeamIds.Contains(x.ResponsibleTeamId.Value)))));
        });
        m.Entity<CommitmentEvent>(e =>
        {
            e.ToTable("CommitmentEvent", "work");
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.Evidence).HasMaxLength(1000);
            e.HasOne(x => x.By).WithMany().HasForeignKey(x => x.ById);
        });

        // ---- escalations (A41) ----
        m.Entity<Escalation>(e =>
        {
            e.ToTable("Escalation", "work");
            e.Property(x => x.Ref).HasMaxLength(20).HasDefaultValueSql("CONCAT('ESC-', NEXT VALUE FOR [work].[EscalationNumbers])").ValueGeneratedOnAdd();
            e.Property(x => x.Ref).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            e.HasIndex(x => x.Ref).IsUnique();
            e.Property(x => x.Title).HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(4000);
            e.Property(x => x.Channel).HasMaxLength(100);
            e.Property(x => x.ChannelReference).HasMaxLength(300);
            e.Property(x => x.CounterpartName).HasMaxLength(150);
            e.Property(x => x.CounterpartTitle).HasMaxLength(100);
            e.Property(x => x.CounterpartOrganization).HasMaxLength(150);
            e.Property(x => x.CounterpartPhone).HasMaxLength(30);
            e.Property(x => x.CounterpartMobile).HasMaxLength(30);
            e.Property(x => x.CounterpartEmail).HasMaxLength(254);
            e.Property(x => x.ResolutionSummary).HasMaxLength(2000);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.Status, x.ResolutionDueAt });
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Contract>().WithMany().HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Case>().WithMany().HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.EscalationId);
            e.HasQueryFilter(ScopeFilter, x => Sys || All || ClientIds.Contains(x.ClientId) || (x.ProjectId != null && ProjectIds.Contains(x.ProjectId.Value)));
        });
        m.Entity<EscalationEvent>(e =>
        {
            e.ToTable("EscalationEvent", "work");
            e.Property(x => x.Channel).HasMaxLength(100);
            e.Property(x => x.Note).HasMaxLength(4000);
            e.HasOne(x => x.By).WithMany().HasForeignKey(x => x.ById).OnDelete(DeleteBehavior.Restrict);
        });

        // ---- teams ----
        m.Entity<Team>(e =>
        {
            e.ToTable("Team", "teams");
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasOne(x => x.Lead).WithMany().HasForeignKey(x => x.LeadUserId);
            e.HasOne(x => x.Manager).WithMany().HasForeignKey(x => x.ManagerUserId);
            e.HasMany(x => x.Members).WithOne().HasForeignKey(x => x.TeamId);
        });
        m.Entity<TeamMember>(e =>
        {
            e.ToTable("TeamMember", "teams");
            e.HasIndex(x => new { x.TeamId, x.UserId }).IsUnique();
            e.Property(x => x.TeamRole).HasMaxLength(100);
            e.Property(x => x.Skills).HasMaxLength(1000);
            e.Property(x => x.ProductFamiliarity).HasMaxLength(1000);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });
        m.Entity<Handover>(e =>
        {
            e.ToTable("Handover", "teams");
            e.Property(x => x.Ref).HasMaxLength(20).HasDefaultValueSql("CONCAT('HO-', NEXT VALUE FOR [teams].[HandoverNumbers])").ValueGeneratedOnAdd();
            e.Property(x => x.Ref).Metadata.SetAfterSaveBehavior(Microsoft.EntityFrameworkCore.Metadata.PropertySaveBehavior.Ignore);
            e.HasIndex(x => x.Ref).IsUnique();
            e.Property(x => x.Summary).HasMaxLength(2000);
            e.Property(x => x.OutstandingActions).HasMaxLength(2000);
            e.Property(x => x.DocumentationNotes).HasMaxLength(2000);
            e.Property(x => x.AcknowledgmentNote).HasMaxLength(1000);
            e.Property(x => x.ExceptionReason).HasMaxLength(1000);
            e.Property(x => x.CancelReason).HasMaxLength(1000);
            e.Ignore(x => x.ScopeClientId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne(x => x.OutgoingOwner).WithMany().HasForeignKey(x => x.OutgoingOwnerId);
            e.HasOne(x => x.ReceivingOwner).WithMany().HasForeignKey(x => x.ReceivingOwnerId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ExceptionApprovedById);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ExceptionFollowUpOwnerId);
            e.HasMany(x => x.Items).WithOne().HasForeignKey(x => x.HandoverId);
            e.HasQueryFilter(ScopeFilter, x => Sys || x.OutgoingOwnerId == Me || x.ReceivingOwnerId == Me
                || (IsLead && ((x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value))) || (x.ClientId == null && AnyInternal))));
        });
        m.Entity<HandoverItem>(e =>
        {
            e.ToTable("HandoverItem", "teams");
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.Label).HasMaxLength(300);
            e.Property(x => x.NotAppliedReason).HasMaxLength(500);
        });

        // ---- quality ----
        m.Entity<ReviewPolicy>(e =>
        {
            e.ToTable("ReviewPolicy", "quality");
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.Notes).HasMaxLength(1000);
            e.HasIndex(x => new { x.RecordType, x.Scope }).IsUnique().HasFilter("[IsActive] = 1");
            e.HasOne<User>().WithMany().HasForeignKey(x => x.PolicyOwnerId);
        });
        m.Entity<Review>(e =>
        {
            e.ToTable("Review", "quality");
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.Note).HasMaxLength(1000);
            e.Property(x => x.Evidence).HasMaxLength(1000);
            e.HasIndex(x => new { x.RecordType, x.RecordId, x.Scope, x.ReviewedAt });
            e.HasOne(x => x.Reviewer).WithMany().HasForeignKey(x => x.ReviewerId);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || (x.EnvironmentId != null && PEnv.Contains(x.EnvironmentId.Value))))
                || (x.ClientId == null && (AllInternal || (x.TeamId != null && TeamIds.Contains(x.TeamId.Value)))));
        });
        // ---- personal notes (A47): every row is its owner's only; no system bypass ----
        m.Entity<Modules.Notes.Notebook>(e =>
        {
            e.ToTable("Notebook", "notes");
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Color).HasMaxLength(20);
            e.HasIndex(x => new { x.OwnerUserId, x.SortOrder });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => x.OwnerUserId == Me);
        });
        m.Entity<Modules.Notes.NoteSection>(e =>
        {
            e.ToTable("NoteSection", "notes");
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Color).HasMaxLength(20);
            e.HasIndex(x => new { x.OwnerUserId, x.NotebookId, x.SortOrder });
            e.HasOne(x => x.Notebook).WithMany().HasForeignKey(x => x.NotebookId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => x.OwnerUserId == Me);
        });
        m.Entity<Modules.Notes.NotePage>(e =>
        {
            e.ToTable("NotePage", "notes");
            e.Property(x => x.Title).HasMaxLength(300);
            e.Property(x => x.ContentHtml).HasMaxLength(-1);
            e.Property(x => x.ContentText).HasMaxLength(-1);
            e.Property(x => x.LinkLabel).HasMaxLength(300);
            e.HasIndex(x => new { x.OwnerUserId, x.SectionId, x.SortOrder });
            e.HasIndex(x => new { x.OwnerUserId, x.ClientId });
            e.HasIndex(x => new { x.OwnerUserId, x.ProjectId });
            e.HasOne(x => x.Section).WithMany().HasForeignKey(x => x.SectionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            // A deleted client or project only clears the link on someone's private page (the page itself is not touched).
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(ScopeFilter, x => x.OwnerUserId == Me);
        });
        m.Entity<Modules.Notes.NoteFile>(e =>
        {
            e.ToTable("NoteFile", "notes");
            e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.StoredPath).HasMaxLength(100);
            e.Property(x => x.ContentType).HasMaxLength(150);
            e.Property(x => x.Sha256).HasMaxLength(64);
            e.HasIndex(x => new { x.OwnerUserId, x.PageId });
            e.HasOne<Modules.Notes.NotePage>().WithMany().HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => x.OwnerUserId == Me);
        });

        // ---- attachments (A46): metadata only; the files are on disk ----
        m.Entity<Modules.Attachments.Attachment>(e =>
        {
            e.ToTable("Attachment", "files");
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.StoredPath).HasMaxLength(100);
            e.Property(x => x.ContentType).HasMaxLength(150);
            e.Property(x => x.Sha256).HasMaxLength(64);
            e.Property(x => x.Description).HasMaxLength(500);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.RecordType, x.RecordId });
            e.HasOne(x => x.UploadedBy).WithMany().HasForeignKey(x => x.UploadedById).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || ProjectClientIds.Contains(x.ClientId.Value)))
                || (x.ClientId == null && x.TeamId == null && Biz)
                || (x.ClientId == null && x.TeamId != null && (AllInternal || TeamIds.Contains(x.TeamId.Value))));
        });
        m.Entity<DataQualityItem>(e =>
        {
            e.ToTable("DataQualityItem", "quality");
            e.Property(x => x.Rule).HasMaxLength(60);
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.RecordLabel).HasMaxLength(300);
            e.Property(x => x.Detail).HasMaxLength(1000);
            e.Property(x => x.NextAction).HasMaxLength(1000);
            e.Property(x => x.ResolutionEvidence).HasMaxLength(1000);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.Rule, x.RecordType, x.RecordId }).IsUnique().HasFilter("[Status] = 'Open'");
            e.HasIndex(x => new { x.Status, x.ClientId });
            e.HasOne(x => x.Coordinator).WithMany().HasForeignKey(x => x.CoordinatorUserId);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || (x.EnvironmentId != null && PEnv.Contains(x.EnvironmentId.Value))))
                || (x.ClientId == null && x.TeamId == null && Biz)
                || (x.ClientId == null && x.TeamId != null && (AllInternal || TeamIds.Contains(x.TeamId.Value))));
        });
        m.Entity<DocumentReference>(e =>
        {
            e.ToTable("DocumentReference", "quality");
            e.Property(x => x.RecordType).HasMaxLength(40);
            e.Property(x => x.Title).HasMaxLength(150);
            e.Property(x => x.Reference).HasMaxLength(500);
            e.Ignore(x => x.ScopeClientId);
            e.HasIndex(x => new { x.RecordType, x.RecordId });
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasQueryFilter(ScopeFilter, x => Sys
                || (x.ClientId != null && (All || ClientIds.Contains(x.ClientId.Value) || (x.EnvironmentId != null && PEnv.Contains(x.EnvironmentId.Value))))
                || (x.ClientId == null && (AllInternal || (x.TeamId != null && TeamIds.Contains(x.TeamId.Value)))));
        });

        // ---- admin, audit ----
        // A34: configured types keep the 40-character column they had as enums.
        m.Entity<ClientEnvironment>().Property(x => x.Type).HasMaxLength(40);
        m.Entity<Asset>().Property(x => x.Type).HasMaxLength(40);
        m.Entity<Contract>().Property(x => x.Type).HasMaxLength(40);
        m.Entity<Case>().Property(x => x.Type).HasMaxLength(40);
        m.Entity<LookupValue>(e =>
        {
            e.ToTable("LookupValue", "admin");
            e.Property(x => x.ListName).HasMaxLength(50);
            e.Property(x => x.Code).HasMaxLength(100);
            e.Property(x => x.Label).HasMaxLength(150);
            e.Property(x => x.Description).HasMaxLength(1000);
            e.HasIndex(x => new { x.ListName, x.Code }).IsUnique();
            e.Property(x => x.Category).HasMaxLength(40);
            e.Property(x => x.Category).HasMaxLength(40);
        });
        m.Entity<AppSetting>(e =>
        {
            e.ToTable("Setting", "admin");
            e.Property(x => x.Key).HasMaxLength(100);
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Value).HasMaxLength(2000);
            e.Property(x => x.Description).HasMaxLength(1000);
        });
        m.Entity<AuditEntry>(e =>
        {
            e.ToTable("AuditEntry", "audit");
            e.Property(x => x.At).HasPrecision(3);
            e.Property(x => x.UserName).HasMaxLength(200);
            e.Property(x => x.Action).HasMaxLength(40);
            e.Property(x => x.Category).HasMaxLength(20);
            e.Property(x => x.EntityType).HasMaxLength(60);
            e.Property(x => x.EntityLabel).HasMaxLength(300);
            e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.Changes).HasMaxLength(-1);
            e.Property(x => x.CorrelationId).HasMaxLength(100);
            e.HasIndex(x => new { x.EntityType, x.EntityId });
            e.HasIndex(x => x.At);
            e.HasIndex(x => x.ClientId);
        });
        m.Entity<ExportLog>(e =>
        {
            e.ToTable("ExportLog", "audit");
            e.Property(x => x.Report).HasMaxLength(100);
            e.Property(x => x.Filters).HasMaxLength(2000);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId);
        });
        // ---- A62: Reporting Center ----
        m.Entity<Modules.Reporting.ExportJob>(e =>
        {
            e.ToTable("ExportJob", "reporting");
            e.HasIndex(x => x.AuditId).IsUnique();
            e.HasIndex(x => new { x.UserId, x.RequestedAt });
            e.HasIndex(x => new { x.Status, x.ExpiresAt });
            e.HasIndex(x => x.ScheduleId);
            e.Property(x => x.Report).HasMaxLength(60);
            e.Property(x => x.ReportName).HasMaxLength(120);
            e.Property(x => x.FiltersJson).HasMaxLength(4000);
            e.Property(x => x.FilterSummary).HasMaxLength(2000);
            e.Property(x => x.ColumnsJson).HasMaxLength(2000);
            e.Property(x => x.TimeZone).HasMaxLength(64);
            e.Property(x => x.FileName).HasMaxLength(200);
            e.Property(x => x.StoredPath).HasMaxLength(300);
            e.Property(x => x.Error).HasMaxLength(1000);
            e.Property(x => x.Source).HasMaxLength(40);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });
        m.Entity<Modules.Reporting.ReportSchedule>(e =>
        {
            e.ToTable("ReportSchedule", "reporting");
            e.HasIndex(x => new { x.IsActive, x.NextRunAt });
            e.HasIndex(x => x.OwnerUserId);
            e.Property(x => x.Name).HasMaxLength(120);
            e.Property(x => x.Report).HasMaxLength(60);
            e.Property(x => x.FiltersJson).HasMaxLength(4000);
            e.Property(x => x.FilterSummary).HasMaxLength(2000);
            e.Property(x => x.TimeZone).HasMaxLength(64);
            e.Property(x => x.LastOutcome).HasMaxLength(200);
            e.HasOne(x => x.Owner).WithMany().HasForeignKey(x => x.OwnerUserId);
            e.HasMany(x => x.Recipients).WithOne().HasForeignKey(r => r.ScheduleId);
        });
        m.Entity<Modules.Reporting.ReportScheduleRecipient>(e =>
        {
            e.ToTable("ReportScheduleRecipient", "reporting");
            e.HasIndex(x => new { x.ScheduleId, x.UserId }).IsUnique();
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
        });
        m.Entity<Modules.Reporting.ReportPreset>(e =>
        {
            e.ToTable("ReportPreset", "reporting");
            e.HasIndex(x => new { x.UserId, x.Report, x.Name }).IsUnique();
            e.Property(x => x.Report).HasMaxLength(60);
            e.Property(x => x.Name).HasMaxLength(80);
            e.Property(x => x.FiltersJson).HasMaxLength(4000);
        });

        // ---- shared conventions ----
        foreach (var et in m.Model.GetEntityTypes().ToList())
        {
            var clr = et.ClrType;
            if (typeof(Entity).IsAssignableFrom(clr))
            {
                m.Entity(clr).Property(nameof(Entity.RowVersion)).IsRowVersion();
                m.Entity(clr).HasOne(typeof(User)).WithMany().HasForeignKey(nameof(Entity.CreatedById));
                m.Entity(clr).HasOne(typeof(User)).WithMany().HasForeignKey(nameof(Entity.UpdatedById));
            }
            if (typeof(IArchivable).IsAssignableFrom(clr))
            {
                m.Entity(clr).Property(nameof(IArchivable.ArchiveReason)).HasMaxLength(1000);
                m.Entity(clr).HasOne(typeof(User)).WithMany().HasForeignKey(nameof(IArchivable.ArchivedById));
            }
        }
        m.Entity<Client>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Region>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Project>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Contract>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Contact>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<ResponsibilityBoundary>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<ClientEnvironment>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Installation>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Asset>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Component>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<SharedStorage>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Volume>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<Team>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);
        m.Entity<DocumentReference>().HasQueryFilter(ArchiveFilter, x => x.ArchivedAt == null);

        // Nothing is deleted through cascades except link rows owned by their parent.
        foreach (var fk in m.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.NoAction;
        // Link rows owned by their parent are removed by EF when detached from the parent's collection (the database keeps NO ACTION).
        m.Entity<UserRole>().HasOne<User>().WithMany(u => u.Roles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<UserScope>().HasOne<User>().WithMany(u => u.Scopes).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<GroupMappingScope>().HasOne<GroupMapping>().WithMany(g => g.Scopes).HasForeignKey(x => x.GroupMappingId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ProjectProduct>().HasOne<Project>().WithMany(p => p.Products).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ClientTeamMember>().HasOne<Client>().WithMany(c => c.Team).HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ProductDeveloper>().HasOne<Product>().WithMany(p => p.Developers).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.ClientCascade);
        // A47: deleting a client or project clears the link on private note pages in the database itself (the pages are never loaded or counted).
        foreach (var fk in m.Model.FindEntityType(typeof(Modules.Notes.NotePage))!.GetForeignKeys().Where(f => f.PrincipalEntityType.ClrType == typeof(Client) || f.PrincipalEntityType.ClrType == typeof(Project)))
            fk.DeleteBehavior = DeleteBehavior.SetNull;
        m.Entity<ContractEnvironment>().HasOne<Contract>().WithMany(c => c.Environments).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<SlaTarget>().HasOne<Contract>().WithMany(c => c.SlaTargets).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ContractMilestone>().HasOne<Contract>().WithMany(c => c.Milestones).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ContractFee>().HasOne<Contract>().WithMany(c => c.Fees).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ContractPayment>().HasOne<Contract>().WithMany(c => c.Payments).HasForeignKey(x => x.ContractId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<ComponentHost>().HasOne(x => x.Component).WithMany(c => c.Hosts).HasForeignKey(x => x.ComponentId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<CaseEnvironment>().HasOne<Case>().WithMany(c => c.Environments).HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<CaseAsset>().HasOne<Case>().WithMany(c => c.Assets).HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.ClientCascade);
        m.Entity<CaseComponent>().HasOne<Case>().WithMany(c => c.Components).HasForeignKey(x => x.CaseId).OnDelete(DeleteBehavior.ClientCascade);
    }


    // ---------- Save: stamps and audit in the same transaction (NFR-03, atomic business changes) ----------

    private static readonly HashSet<Type> NotAudited =
        [typeof(AuditEntry), typeof(UserCredential), typeof(Modules.Notes.Notebook), typeof(Modules.Notes.NoteSection), typeof(Modules.Notes.NotePage), typeof(Modules.Notes.NoteFile), typeof(Modules.Notifications.Notification), typeof(CaseEvent), typeof(CommitmentEvent), typeof(ExportLog), typeof(Modules.Reporting.ExportJob), typeof(DataQualityItem), typeof(Review), typeof(ConditionReport), typeof(InstallationVersionChange), typeof(CaseWaitingInterval)];
    private static readonly HashSet<Type> AccessTypes = [typeof(User), typeof(UserRole), typeof(AppRole), typeof(UserScope), typeof(GroupMapping), typeof(GroupMappingScope), typeof(AppSetting), typeof(LookupValue), typeof(ReviewPolicy), typeof(JiraInstance)];
    private static readonly HashSet<string> QuietProperties =
        [nameof(Entity.RowVersion), nameof(Entity.UpdatedAt), nameof(Entity.UpdatedById), nameof(Entity.CreatedAt), nameof(Entity.CreatedById), nameof(User.LastSignInAt), "NormalizedName", "NormalizedInstanceName", "RegionScope"];
    private static readonly JsonSerializerOptions AuditJson = new(JsonSerializerDefaults.Web);

    /// <summary>"Entity.Property" names whose values are restricted technical detail (IAM-04); masked when audit is read without the grant.</summary>
    public static readonly HashSet<string> TechnicalProperties = typeof(HubDbContext).Assembly.GetTypes()
        .SelectMany(t => t.GetProperties().Where(p => p.GetCustomAttribute<TechnicalDetailAttribute>() is not null).Select(p => $"{EntityName(t)}.{p.Name}"))
        .ToHashSet();

    /// <summary>
    /// A52: the separate "Meaningful reviews" records were removed from the application, so a person saving a record now confirms it:
    /// a changed client, contact, region, project, installation or server is reviewed now, a changed environment has its record,
    /// inventory and dependency reviews refreshed, and adding, changing or removing a server, installation or component refreshes
    /// its environment's inventory review. Cases, commitments and contracts keep their own progress and update rules.
    /// </summary>
    private async Task MarkReviewedOnEditAsync(DateTimeOffset now, CancellationToken ct)
    {
        // A condition report is not an inventory review, and creation is already the baseline, so only real edits count.
        static bool Changed(EntityEntry e) => e.State == EntityState.Modified && e.Properties.Any(p => p.IsModified
            && p.Metadata.Name is not (nameof(Entity.UpdatedAt) or nameof(Entity.UpdatedById)) && !p.Metadata.Name.StartsWith("Condition", StringComparison.Ordinal));
        var envIds = new HashSet<long>();
        foreach (var e in ChangeTracker.Entries().ToList())
        {
            if (e.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;
            var edited = Changed(e);
            switch (e.Entity)
            {
                case Client x when edited: x.LastReviewedAt = now; if (x.NextReviewAt < now) x.NextReviewAt = null; break;
                case Contact x when edited: x.LastReviewedAt = now; break;
                case Region x when edited: x.LastReviewedAt = now; break;
                case Project x when edited: x.LastReviewedAt = now; break;
                case ClientEnvironment x when edited:
                    x.LastReviewedAt = x.InventoryReviewedAt = x.DependenciesReviewedAt = now;
                    if (x.NextReviewAt < now) x.NextReviewAt = null;
                    break;
                case Installation x: if (edited) x.LastReviewedAt = now; envIds.Add(x.EnvironmentId); break;
                case Asset x: if (edited) x.VerifiedAt = now; if (x.EnvironmentId is { } ae) envIds.Add(ae); break;
                case Component x: if (x.EnvironmentId is { } ce) envIds.Add(ce); break;
            }
        }
        if (envIds.Count == 0) return;
        foreach (var env in await Environments.IgnoreQueryFilters().Where(x => envIds.Contains(x.Id)).ToListAsync(ct))
            env.InventoryReviewedAt = now;
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess) => SaveChangesAsync(acceptAllChangesOnSuccess).GetAwaiter().GetResult();

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var userId = user.UserId;
        // A38: new assignments become notifications for the people concerned (written once the records have their ids).
        var notices = Modules.Notifications.AssignmentNotices.Collect(ChangeTracker, userId);
        if (userId is not null) await MarkReviewedOnEditAsync(now, ct);
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.CreatedById ??= userId;
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedById = userId;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Entity.UpdatedById = userId;
            }
        }

        // A61: contractual SLA of every case touched by this save (after creation times are set).
        await Modules.Work.CaseSla.EvaluateTrackedAsync(this, now, ct);

        var pending = ChangeTracker.Entries()
            .Where(e => (e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted) && !NotAudited.Contains(e.Entity.GetType()))
            .Select(e => new PendingAudit(e, e.State, e.State == EntityState.Modified ? ModifiedChanges(e) : e.State == EntityState.Deleted ? KeyValues(e) : null))
            .Where(p => p.State != EntityState.Modified || p.Changes!.Count > 0)
            .ToList();

        if (pending.Count == 0) return await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);

        var ownTx = Database.CurrentTransaction is null && Database.IsRelational() ? await Database.BeginTransactionAsync(ct) : null;
        try
        {
            var n = await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
            var correlation = Activity.Current?.TraceId.ToString();
            foreach (var p in pending)
            {
                var changes = p.State == EntityState.Added ? AddedValues(p.Entry) : p.Changes!;
                AuditEntries.Add(new AuditEntry
                {
                    At = now,
                    UserId = userId,
                    UserName = user.IsResolved ? user.AccountName : "system",
                    Action = ActionFor(p),
                    Category = AccessTypes.Contains(p.Entry.Entity.GetType()) ? "Access" : "Business",
                    EntityType = EntityName(p.Entry.Entity.GetType()),
                    EntityId = KeyOf(p.Entry),
                    EntityLabel = LabelOf(p.Entry.Entity),
                    ClientId = ClientOf(p.Entry.Entity),
                    TeamId = TeamOf(p.Entry.Entity),
                    Reason = AuditReason,
                    Changes = changes.Count == 0 ? null : JsonSerializer.Serialize(changes, AuditJson),
                    CorrelationId = correlation
                });
            }
            foreach (var notice in notices.Select(i => Modules.Notifications.AssignmentNotices.Build(i, now)).OfType<Modules.Notifications.Notification>())
                Notifications.Add(notice);
            await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
            if (ownTx is not null) await ownTx.CommitAsync(ct);
            AuditReason = null;
            return n;
        }
        finally
        {
            if (ownTx is not null) await ownTx.DisposeAsync();
        }
    }

    /// <summary>Writes an explicit audit entry for actions that change no row (exports, sign-in refusals) in its own save.</summary>
    public async Task AuditActionAsync(string action, string entityType, long? entityId, string? label, long? clientId, string? reason, object? details, CancellationToken ct, string category = "Business")
    {
        AuditEntries.Add(new AuditEntry
        {
            At = clock.GetUtcNow(), UserId = user.UserId, UserName = user.IsResolved ? user.AccountName : "system", Action = action, Category = category,
            EntityType = entityType, EntityId = entityId, EntityLabel = label, ClientId = clientId, Reason = reason,
            Changes = details is null ? null : JsonSerializer.Serialize(details, AuditJson), CorrelationId = Activity.Current?.TraceId.ToString()
        });
        await base.SaveChangesAsync(true, ct);
    }

    private sealed record PendingAudit(EntityEntry Entry, EntityState State, Dictionary<string, object?[]>? Changes);

    private static Dictionary<string, object?[]> ModifiedChanges(EntityEntry e)
    {
        var d = new Dictionary<string, object?[]>();
        foreach (var p in e.Properties)
        {
            if (!p.IsModified || QuietProperties.Contains(p.Metadata.Name)) continue;
            if (Equals(p.OriginalValue, p.CurrentValue)) continue;
            d[p.Metadata.Name] = [Plain(p.OriginalValue), Plain(p.CurrentValue)];
        }
        return d;
    }

    private static Dictionary<string, object?[]> AddedValues(EntityEntry e)
    {
        var d = new Dictionary<string, object?[]>();
        foreach (var p in e.Properties)
        {
            if (QuietProperties.Contains(p.Metadata.Name) || (p.Metadata.IsPrimaryKey() && p.Metadata.ValueGenerated != Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never) || p.CurrentValue is null) continue;
            d[p.Metadata.Name] = [null, Plain(p.CurrentValue)];
        }
        return d;
    }

    private static Dictionary<string, object?[]> KeyValues(EntityEntry e) =>
        e.Properties.Where(p => !QuietProperties.Contains(p.Metadata.Name) && p.OriginalValue is not null)
            .ToDictionary(p => p.Metadata.Name, p => new[] { Plain(p.OriginalValue), null });

    private static object? Plain(object? v) => v switch
    {
        null => null,
        Enum en => en.ToString(),
        byte[] => "(binary)",
        _ => v
    };

    private static string ActionFor(PendingAudit p)
    {
        if (p.State == EntityState.Added) return p.Entry.Entity is UserRole or UserScope or GroupMappingScope ? "AccessGranted" : "Create";
        if (p.State == EntityState.Deleted) return p.Entry.Entity is UserRole or UserScope or GroupMappingScope ? "AccessRevoked" : "Remove";
        var c = p.Changes!;
        if (c.TryGetValue(nameof(IArchivable.ArchivedAt), out var a)) return a[1] is null ? "Restore" : "Archive";
        if (p.Entry.Entity is User && (c.ContainsKey(nameof(User.IsActive)) || c.ContainsKey(nameof(User.Grants)) || c.ContainsKey(nameof(User.AllClients)) || c.ContainsKey(nameof(User.AllInternal)))) return "AccessChange";
        if (c.ContainsKey("OwnerUserId")) return "OwnerChange";
        if (c.ContainsKey("Status")) return "StatusChange";
        return "Update";
    }

    private static long? KeyOf(EntityEntry e)
    {
        var key = e.Metadata.FindPrimaryKey();
        if (key is null) return null;
        // Link rows: use the first key part (the parent) so their history appears with the parent.
        return e.Property(key.Properties[0].Name).CurrentValue is long id ? id : null;
    }

    public static string EntityName(Type t) => t == typeof(ClientEnvironment) ? "Environment" : t.Name;

    private static long? ClientOf(object entity) => entity switch
    {
        IClientOwned o => o.ScopeClientId,
        ComponentHost h => h.ClientId,
        CaseEnvironment c => c.ClientId,
        CaseAsset c => c.ClientId,
        CaseComponent c => c.ClientId,
        JiraReference j => j.ClientId,
        HandoverItem h => h.ClientId,
        ContractEnvironment c => c.ClientId,
        _ => null
    };

    private static long? TeamOf(object entity) => entity switch
    {
        Case c when c.ClientId is null => c.ResponsibleTeamId,
        Commitment c when c.ClientId is null => c.ResponsibleTeamId,
        DocumentReference d when d.ClientId is null => d.TeamId,
        _ => null
    };

    private static string? LabelOf(object entity) => entity switch
    {
        Client c => $"{c.Code} · {c.Name}",
        Region r => $"{r.Code} · {r.Name}",
        Project p => $"{p.Code} · {p.Name}",
        Contact c => c.Name,
        ClientEnvironment env => env.Name,
        Installation i => i.InstanceName,
        Asset a => a.Name,
        Component c => c.Name,
        Volume v => v.Label,
        Case c => c.Ref is null ? c.Title : $"{c.Ref} · {c.Title}",
        Commitment c => c.Ref is null ? null : c.Ref,
        Escalation x => x.Ref is null ? x.Title : $"{x.Ref} · {x.Title}",
        Contract c => c.Ref is null ? c.Title : $"{c.Ref} · {c.Title}",
        JiraReference j => j.IssueKey,
        User u => u.AccountName,
        GroupMapping g => g.GroupName,
        LookupValue l => $"{l.ListName}: {l.Label}",
        Product p => p.Code,
        ProductFeature f => f.Name,
        ProductMicroservice ms => ms.Name,
        MicroserviceVersion mv => mv.Version,
        ProductDeveloper pd => pd.Name,
        ProductVersion v => v.Version,
        JiraInstance j => j.Name,
        ReviewPolicy rp => $"{rp.RecordType} / {rp.Scope}",
        Team t => t.Code,
        Handover h => h.Ref,
        AppSetting s => s.Key,
        DocumentReference d => d.Title,
        Modules.Attachments.Attachment a => a.FileName,
        _ => null
    };
}
