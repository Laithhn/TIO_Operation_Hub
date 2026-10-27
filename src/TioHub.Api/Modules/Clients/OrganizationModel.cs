using Microsoft.EntityFrameworkCore;
using TioHub.Api.Data;

namespace TioHub.Api.Modules.Clients;

public static class OrganizationModel
{
    public static void ConfigureOrganizations(this ModelBuilder model, HubDbContext db)
    {
        model.Entity<Organization>(e =>
        {
            e.ToTable("Organization", "clients", t => t.HasCheckConstraint("CK_Organization_Identity", "[ClientId] IS NOT NULL OR (LEN(LTRIM(RTRIM([Name]))) > 0 AND [Name] IS NOT NULL)"));
            e.Property(x => x.Name).HasMaxLength(150);
            e.Property(x => x.Code).HasMaxLength(50);
            e.Property(x => x.OrganizationType).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Phone).HasMaxLength(100);
            e.Property(x => x.Address).HasMaxLength(1000);
            e.Property(x => x.Status).HasMaxLength(100);
            e.HasIndex(x => x.ClientId).IsUnique().HasFilter("[ClientId] IS NOT NULL");
            e.HasIndex(x => x.Code).IsUnique().HasFilter("[Code] IS NOT NULL");
            e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId);
            e.Ignore(x => x.ScopeClientId);
            // Client identities never gain visibility merely by being linked into another client's graph.
            e.HasQueryFilter(HubDbContext.ScopeFilter, x => db.Sys || db.All ||
                (x.ClientId != null
                    ? db.ClientIds.Contains(x.ClientId.Value) || db.ProjectClientIds.Contains(x.ClientId.Value)
                    : x.CreatedById == db.Me || db.OrganizationRelationships.Any(r =>
                        (r.ParentOrganizationId == x.Id || r.ChildOrganizationId == x.Id) &&
                        (db.ClientIds.Contains(r.ClientId) || (r.ProjectId != null && db.ProjectIds.Contains(r.ProjectId.Value))))));
            e.HasQueryFilter(HubDbContext.ArchiveFilter, x => x.ClientId == null ||
                db.Clients.Any(c => c.Id == x.ClientId && c.ArchivedAt == null));
        });
        model.Entity<OrganizationRelationship>(e =>
        {
            e.ToTable("OrganizationRelationship", "clients", t =>
            {
                t.HasCheckConstraint("CK_OrganizationRelationship_NotSelf", "[ParentOrganizationId] <> [ChildOrganizationId]");
                t.HasCheckConstraint("CK_OrganizationRelationship_Dates", "[StartDate] IS NULL OR [EndDate] IS NULL OR [EndDate] >= [StartDate]");
            });
            e.Ignore(x => x.ScopeClientId);
            e.Property(x => x.ProjectScope).HasComputedColumnSql("ISNULL([ProjectId], CONVERT(bigint, 0))", stored: true);
            e.HasIndex(x => new { x.ClientId, x.ProjectScope, x.ParentOrganizationId, x.ChildOrganizationId }).IsUnique();
            e.HasIndex(x => new { x.ClientId, x.ProjectId, x.ChildOrganizationId });
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId);
            e.HasOne<Organization>().WithMany().HasForeignKey(x => x.ParentOrganizationId);
            e.HasOne<Organization>().WithMany().HasForeignKey(x => x.ChildOrganizationId);
            e.Property(x => x.RelationshipType).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.HasQueryFilter(HubDbContext.ScopeFilter, x => db.Sys || db.All || db.ClientIds.Contains(x.ClientId) ||
                (x.ProjectId != null && db.ProjectIds.Contains(x.ProjectId.Value)));
        });
    }
}
