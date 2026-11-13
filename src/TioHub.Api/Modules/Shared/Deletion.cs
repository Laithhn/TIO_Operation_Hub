using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Shared;

/// <summary>
/// A37 (owner request, 20 Oct 2026): permanent deletion from the tables. A record is deleted together with what it owns (for example a
/// server's volumes, a contract's SLA rows, a case's events); if anything else still uses it, nothing is deleted and the answer names what
/// uses it. Needs the "Delete records" right. The change history keeps the deletion.
/// </summary>
public static partial class Deletion
{
    /// <summary>Deleting a client-wide record needs the entire client, not the summary visibility conferred by a project.</summary>
    public static void RequireWholeClientScope(UserContext me, long clientId)
    {
        if (!me.HasClient(clientId)) throw new NotFoundException("The record");
    }

    private static readonly Dictionary<string, string> TableNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Environment"] = "environments", ["Asset"] = "servers", ["Installation"] = "installations", ["Component"] = "components", ["ComponentHost"] = "server–component links",
        ["Volume"] = "volumes", ["FirewallRule"] = "firewall rules", ["Region"] = "regions", ["Project"] = "projects", ["Contract"] = "contracts", ["ContractEnvironment"] = "contract coverage",
        ["Contact"] = "contacts", ["ResponsibilityBoundary"] = "responsibility boundaries", ["Case"] = "tickets", ["CaseEnvironment"] = "tickets", ["CaseAsset"] = "tickets",
        ["CaseComponent"] = "tickets", ["Commitment"] = "commitments", ["Client"] = "clients (sub-clients)", ["ClientTeamMember"] = "project teams", ["Team"] = "teams",
        ["TeamMember"] = "team members", ["UserScope"] = "user access scopes", ["UserRightException"] = "individual permission exceptions", ["GroupMappingScope"] = "group mappings", ["Product"] = "products", ["Handover"] = "handovers",
        ["SharedStorage"] = "shared storage", ["ProjectProduct"] = "projects", ["JiraReference"] = "Jira links", ["User"] = "users",
        ["Organization"] = "organizations", ["OrganizationRelationship"] = "organization relationships"
    };

    [GeneratedRegex(@"table ""[a-z]+\.(?<t>[A-Za-z]+)""")]
    private static partial Regex ConflictTable();

    /// <summary>Removes the polymorphic children (reviews, document references, data-quality items), runs <paramref name="removeOwned"/>,
    /// deletes <paramref name="entity"/> and commits — or rolls everything back and explains what still uses the record.</summary>
    public static async Task<IResult> RunAsync(HubDbContext db, Attachments.AttachmentStore files, UserContext me, object entity, string recordType, long id, string label, Func<Task>? removeOwned, CancellationToken ct)
    {
        RightChecks.RequireRecordSection(me, recordType, "Delete");
        if (recordType == "LookupValue") me.RequireAdministrator();
        else me.RequireRight(RightKeys.ForRecord(recordType), RightKeys.Delete);
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        if (entity is Client client)
            await OrganizationEndpoints.PreserveClientIdentityAsync(client.Id, db, ct);
        if (entity is Project project)
        {
            await OrganizationEndpoints.LockContextAsync(project.ClientId, project.Id, db, ct);
            await db.OrganizationRelationships.IgnoreQueryFilters().Where(x => x.ProjectId == project.Id).ExecuteDeleteAsync(ct);
        }
        if (entity is Modules.Catalogue.Installation && await db.Components.IgnoreQueryFilters().AnyAsync(x => x.InstallationId == id, ct))
            me.RequireRight(RightKeys.Servers, RightKeys.Delete);
        var attached = await db.Attachments.IgnoreQueryFilters().Where(a => a.RecordType == recordType && a.RecordId == id).Select(a => a.StoredPath).ToListAsync(ct);
        if (entity is Client { LogoPath: { } logo }) attached.Add(logo);   // A71: the client's logo file goes with it
        await db.Attachments.IgnoreQueryFilters().Where(a => a.RecordType == recordType && a.RecordId == id).ExecuteDeleteAsync(ct);
        if (removeOwned is not null) await removeOwned();
        await db.Reviews.IgnoreQueryFilters().Where(r => r.RecordType == recordType && r.RecordId == id).ExecuteDeleteAsync(ct);
        await db.DocumentReferences.IgnoreQueryFilters().Where(r => r.RecordType == recordType && r.RecordId == id).ExecuteDeleteAsync(ct);
        await db.DataQualityItems.IgnoreQueryFilters().Where(r => r.RecordType == recordType && r.RecordId == id).ExecuteDeleteAsync(ct);
        db.Remove(entity);
        db.AuditReason = $"{label} deleted";
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 547 } sql)
        {
            var t = ConflictTable().Match(sql.Message).Groups["t"].Value;
            var what = TableNames.GetValueOrDefault(t, "other records");
            throw new ConflictException($"{label} is still used by {what}. Remove or move those first, or archive it instead.",
                new() { ["record"] = [$"Still used by {what}."] });
        }
        await tx.CommitAsync(ct);
        files.Delete(attached);
        return Results.NoContent();
    }

    public static void MapDeleteEndpoints(this RouteGroupBuilder api)
    {
        static async Task<T> Load<T>(IQueryable<T> q, string what, CancellationToken ct) where T : class =>
            await q.FirstOrDefaultAsync(ct) ?? throw new NotFoundException(what);
        // The same boundary as editing and archiving: project-only summary visibility never authorizes removing a client's records.
        static void Scope(HubAccess access, long clientId) => RequireWholeClientScope(access.Me, clientId);
        string[] archive = [HubDbContext.ArchiveFilter];

        api.MapDelete("/clients/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Clients.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The client", ct);
            RequireWholeClientScope(access.Me, x.Id);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Client, id, $"Client {x.Code}", async () =>
                await db.ClientTeamMembers.Where(t => t.ClientId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        api.MapDelete("/regions/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Regions.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The region", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Region, id, $"Region {x.Code}", null, ct);
        }).WithTags("Delete");
        api.MapDelete("/projects/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Projects.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The project", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Project, id, $"Project {x.Code}", async () =>
                await db.ProjectProducts.Where(p => p.ProjectId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        api.MapDelete("/contracts/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Contracts.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The contract", ct);
            // Contract coverage can include environments belonging to other projects of this client.
            RequireWholeClientScope(access.Me, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Contract, id, $"Contract {x.Ref}", async () =>
            {
                await db.SlaTargets.Where(t => t.ContractId == id).ExecuteDeleteAsync(ct);
                await db.ContractEnvironments.IgnoreQueryFilters().Where(t => t.ContractId == id).ExecuteDeleteAsync(ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/contacts/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Contacts.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The contact", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Contact, id, $"Contact {x.Name}", null, ct);
        }).WithTags("Delete");
        api.MapDelete("/boundaries/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Boundaries.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The responsibility boundary", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Boundary, id, $"Responsibility {x.Area}", null, ct);
        }).WithTags("Delete");
        api.MapDelete("/environments/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Environments.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The environment", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Environment, id, $"Environment {x.Name}", async () =>
                await db.ConditionReports.Where(r => r.EnvironmentId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        api.MapDelete("/assets/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Assets.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The server", ct);
            Scope(access, x.ClientId);
            // A server owns its volumes and its hosting links; firewall rules and cases that name it must be changed first.
            return await RunAsync(db, files, access.Me, x, RecordTypes.Asset, id, $"Server {x.Name}", async () =>
            {
                await db.Volumes.IgnoreQueryFilters().Where(v => v.AssetId == id).ExecuteDeleteAsync(ct);
                await db.ComponentHosts.IgnoreQueryFilters().Where(h => h.AssetId == id).ExecuteDeleteAsync(ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/installations/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Installations.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The installation", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Installation, id, $"Installation {x.InstanceName}", async () =>
            {
                await db.ComponentHosts.IgnoreQueryFilters().Where(h => db.Components.IgnoreQueryFilters().Any(c => c.Id == h.ComponentId && c.InstallationId == id)).ExecuteDeleteAsync(ct);
                await db.Components.IgnoreQueryFilters().Where(c => c.InstallationId == id).ExecuteDeleteAsync(ct);
                await db.InstallationVersionChanges.Where(v => v.InstallationId == id).ExecuteDeleteAsync(ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/components/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Components.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The component", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Component, id, $"Component {x.Name}", async () =>
                await db.ComponentHosts.IgnoreQueryFilters().Where(h => h.ComponentId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        api.MapDelete("/volumes/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Volumes.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The volume", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Volume, id, $"Volume {x.Label}", null, ct);
        }).WithTags("Delete");
        api.MapDelete("/cases/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Cases.Where(c => c.Id == id), "The ticket", ct);
            // A visible case may link to environments outside the caller's project. Deletion
            // removes the whole case and its links, not just the visible portion.
            if (x.ClientId is { } cid) RequireWholeClientScope(access.Me, cid);
            // A111: a ticket with an SLA result is evidence and is not deleted.
            if (Work.CaseSla.HasResult(x, DateTimeOffset.UtcNow))
                throw new ConflictException($"Ticket {x.Ref} {Work.CaseSla.DeleteRefusal}", new() { ["record"] = ["Has an SLA result under its contract."] });
            return await RunAsync(db, files, access.Me, x, RecordTypes.Case, id, $"Ticket {x.Ref}", async () =>
            {
                await db.CaseEnvironments.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseAssets.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseComponents.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseWaitingIntervals.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseEvents.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.JiraReferences.IgnoreQueryFilters().Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseComments.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.JiraComments.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.JiraActivities.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                // A76: the mapping stays without its case, so the next synchronization does not import the deleted case again.
                await db.JiraCaseMappings.IgnoreQueryFilters().Where(r => r.CaseId == id).ExecuteUpdateAsync(u => u.SetProperty(r => r.CaseId, (long?)null), ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/commitments/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Commitments.Where(c => c.Id == id), "The commitment", ct);
            if (x.ClientId is { } cid) Scope(access, cid);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Commitment, id, $"Commitment {x.Ref}", async () =>
            {
                // A114: links to and from other commitments go with it; those that waited for it keep their history, without the link.
                await db.CommitmentDependencies.IgnoreQueryFilters().Where(r => r.CommitmentId == id || r.DependsOnCommitmentId == id).ExecuteDeleteAsync(ct);
                await db.CommitmentEvents.IgnoreQueryFilters().Where(r => r.CauseCommitmentId == id && r.CommitmentId != id).ExecuteUpdateAsync(u => u.SetProperty(r => r.CauseCommitmentId, (long?)null), ct);
                await db.Commitments.IgnoreQueryFilters().Where(r => r.LateCauseCommitmentId == id).ExecuteUpdateAsync(u => u.SetProperty(r => r.LateCauseCommitmentId, (long?)null), ct);
                await db.CommitmentEvents.Where(r => r.CommitmentId == id).ExecuteDeleteAsync(ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/escalations/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Escalations.Where(e => e.Id == id), "The escalation", ct);
            Scope(access, x.ClientId);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Escalation, id, $"Escalation {x.Ref}", async () =>
                await db.EscalationEvents.Where(r => r.EscalationId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        // Owner request (20 Oct 2026): teams can be deleted; their member list goes with them.
        api.MapDelete("/teams/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(TeamEndpoints.VisibleTeams(db.Teams, access.Me).Where(t => t.Id == id), "The team", ct);
            return await RunAsync(db, files, access.Me, x, "Team", id, $"Team {x.Code}", async () =>
                await db.TeamMembers.Where(m => m.TeamId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        // Configuration values: only when no record uses them (retire them otherwise).
        api.MapDelete("/admin/lookups/{id:long}", async (long id, HubDbContext db, UserContext me, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var x = await Load(db.LookupValues.Where(l => l.Id == id), "The value", ct);
            if (LookupLists.IsFixedWorkflowLabel(x.ListName))
                throw new ValidationException("record", "Condition values are fixed; only their display labels can be changed.");
            await Work.CaseStatuses.CheckNotLastRequiredAsync(db, x, "record", ct);
            var used = (await LookupUsage.CountsAsync(db, x.ListName, ct, scoped: false)).GetValueOrDefault(x.Code);
            if (x.ListName == LookupLists.CaseStatusLabel) used += await db.JiraWorkflowStatusMappings.CountAsync(s => s.TargetStatusCode == x.Code, ct);
            if (used > 0) throw new ConflictException($"{x.Label} is used by existing records. Change those records first, or retire it so it is no longer offered.",
                new() { ["record"] = ["This value is in use."] });
            if (LookupLists.Categories.ContainsKey(x.ListName) && !await db.LookupValues.AnyAsync(l => l.ListName == x.ListName && l.Id != id && !l.IsRetired, ct))
                throw new ValidationException("record", "Keep at least one active value in this list.");
            return await RunAsync(db, files, me, x, "LookupValue", id, $"{x.Label}", null, ct);
        }).WithTags("Delete");
    }
}

/// <summary>How many records use each value of a configuration list (A34/A37).</summary>
public static class LookupUsage
{
    /// <summary>Include archived rows while retaining data scope for usage shown to an administrator.</summary>
    public static IQueryable<T> Records<T>(DbSet<T> source, bool scoped) where T : class => scoped
        ? source.IgnoreQueryFilters([HubDbContext.ArchiveFilter]) : source.IgnoreQueryFilters();

    /// <summary>Use the current user's scope for visible usage; unscoped counts are reserved for deletion safety checks.</summary>
    public static async Task<Dictionary<string, int>> CountsAsync(HubDbContext db, string list, CancellationToken ct, bool scoped = true)
    {
        var me = db.CurrentUser;
        var allClients = !scoped || me.IsSystem || me.AllClients;
        var allTeams = !scoped || me.IsSystem || me.AllInternal;
        var clientIds = me.ClientIds;
        var teamIds = me.TeamIds;
        var escalations = Records(db.Escalations, scoped);
        var rows = list switch
        {
            LookupLists.OrganizationRelationshipType => await Records(db.OrganizationRelationships, scoped).Where(x => x.RelationshipType != null).GroupBy(x => x.RelationshipType!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.EnvironmentType => await Records(db.Environments, scoped).GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.AssetType => await Records(db.Assets, scoped).GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ContractType => await Records(db.Contracts, scoped).GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.CaseType => await Records(db.Cases, scoped).GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.CaseStatusLabel => await Records(db.Cases, scoped).GroupBy(x => x.StatusCode).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.AssetRole => await Records(db.Assets, scoped).Where(x => x.Role != null).GroupBy(x => x.Role!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.NetworkZone => await Records(db.Assets, scoped).Where(x => x.NetworkZone != null).GroupBy(x => x.NetworkZone!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.OsFamily => await Records(db.Assets, scoped).Where(x => x.OsFamily != null).GroupBy(x => x.OsFamily!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ProjectPhase => await Records(db.Assets, scoped).Where(x => x.ProjectPhase != null).GroupBy(x => x.ProjectPhase!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ComponentRole => await Records(db.Components, scoped).GroupBy(x => x.Role).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.BoundaryArea => await Records(db.Boundaries, scoped).GroupBy(x => x.Area).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.TeamRole => await db.ClientTeamMembers.Where(x => allClients || clientIds.Contains(x.ClientId)).GroupBy(x => x.Role).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.TeamMemberRole => await db.TeamMembers.Where(x => (allTeams || teamIds.Contains(x.TeamId)) && x.TeamRole != null).GroupBy(x => x.TeamRole!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            // An escalation channel counts where an escalation or a logged communication uses it.
            LookupLists.EscalationChannel => (await escalations.Select(x => x.Channel)
                    .Concat(db.EscalationEvents.Where(x => x.Channel != null && x.Type == Escalations.EscalationEventType.Communication && escalations.Any(e => e.Id == x.EscalationId)).Select(x => x.Channel!)).ToListAsync(ct))
                .GroupBy(x => x).Select(x => new { code = x.Key, n = x.Count() }).ToList(),
            _ => []
        };
        return rows.ToDictionary(x => x.code, x => x.n);
    }
}
