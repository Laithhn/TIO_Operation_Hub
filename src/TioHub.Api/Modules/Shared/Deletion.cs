using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Shared;

/// <summary>
/// A37 (owner request, 20 Oct 2026): permanent deletion from the tables. A record is deleted together with what it owns (for example a
/// server's volumes, a contract's SLA rows, a case's events); if anything else still uses it, nothing is deleted and the answer names what
/// uses it. Needs the "Delete records" right. The change history keeps the deletion.
/// </summary>
public static partial class Deletion
{
    private static readonly Dictionary<string, string> TableNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Environment"] = "environments", ["Asset"] = "servers", ["Installation"] = "installations", ["Component"] = "components", ["ComponentHost"] = "server–component links",
        ["Volume"] = "volumes", ["FirewallRule"] = "firewall rules", ["Region"] = "regions", ["Project"] = "projects", ["Contract"] = "contracts", ["ContractEnvironment"] = "contract coverage",
        ["Contact"] = "contacts", ["ResponsibilityBoundary"] = "responsibility boundaries", ["Case"] = "cases", ["CaseEnvironment"] = "cases", ["CaseAsset"] = "cases",
        ["CaseComponent"] = "cases", ["Commitment"] = "commitments", ["Client"] = "clients (sub-clients)", ["ClientTeamMember"] = "project teams", ["Team"] = "teams",
        ["TeamMember"] = "team members", ["UserScope"] = "user access scopes", ["GroupMappingScope"] = "group mappings", ["Product"] = "products", ["Handover"] = "handovers",
        ["SharedStorage"] = "shared storage", ["ProjectProduct"] = "projects", ["JiraReference"] = "Jira links", ["User"] = "users",
        ["Organization"] = "organizations", ["OrganizationRelationship"] = "organization relationships"
    };

    [GeneratedRegex(@"table ""[a-z]+\.(?<t>[A-Za-z]+)""")]
    private static partial Regex ConflictTable();

    /// <summary>Removes the polymorphic children (reviews, document references, data-quality items), runs <paramref name="removeOwned"/>,
    /// deletes <paramref name="entity"/> and commits — or rolls everything back and explains what still uses the record.</summary>
    public static async Task<IResult> RunAsync(HubDbContext db, Attachments.AttachmentStore files, UserContext me, object entity, string recordType, long id, string label, Func<Task>? removeOwned, CancellationToken ct)
    {
        if (recordType == "LookupValue") me.RequireAdministrator();
        else me.RequirePermission(ResourcePermissions.ForRecord(recordType), ResourcePermissions.Delete);
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        if (entity is Client client)
            await OrganizationEndpoints.PreserveClientIdentityAsync(client.Id, db, ct);
        if (entity is Project project)
        {
            await OrganizationEndpoints.LockContextAsync(project.ClientId, project.Id, db, ct);
            await db.OrganizationRelationships.IgnoreQueryFilters().Where(x => x.ProjectId == project.Id).ExecuteDeleteAsync(ct);
        }
        if (entity is Modules.Catalogue.Installation && await db.Components.IgnoreQueryFilters().AnyAsync(x => x.InstallationId == id, ct))
            me.RequirePermission(ResourcePermissions.Servers, ResourcePermissions.Delete);
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
        static void Scope(HubAccess access, long clientId) { if (!access.Me.SeesClient(clientId)) throw new NotFoundException("The record"); }
        string[] archive = [HubDbContext.ArchiveFilter];

        api.MapDelete("/clients/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Clients.IgnoreQueryFilters(archive).Where(c => c.Id == id), "The client", ct);
            Scope(access, x.Id);
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
            Scope(access, x.ClientId);
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
            var x = await Load(db.Cases.Where(c => c.Id == id), "The case", ct);
            if (x.ClientId is { } cid) Scope(access, cid);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Case, id, $"Case {x.Ref}", async () =>
            {
                await db.CaseEnvironments.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseAssets.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseComponents.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseWaitingIntervals.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.CaseEvents.Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
                await db.JiraReferences.IgnoreQueryFilters().Where(r => r.CaseId == id).ExecuteDeleteAsync(ct);
            }, ct);
        }).WithTags("Delete");
        api.MapDelete("/commitments/{id:long}", async (long id, HubDbContext db, HubAccess access, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            var x = await Load(db.Commitments.Where(c => c.Id == id), "The commitment", ct);
            if (x.ClientId is { } cid) Scope(access, cid);
            return await RunAsync(db, files, access.Me, x, RecordTypes.Commitment, id, $"Commitment {x.Ref}", async () =>
                await db.CommitmentEvents.Where(r => r.CommitmentId == id).ExecuteDeleteAsync(ct), ct);
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
            var x = await Load(db.Teams.Where(t => t.Id == id), "The team", ct);
            return await RunAsync(db, files, access.Me, x, "Team", id, $"Team {x.Code}", async () =>
                await db.TeamMembers.Where(m => m.TeamId == id).ExecuteDeleteAsync(ct), ct);
        }).WithTags("Delete");
        // Configuration values: only when no record uses them (retire them otherwise).
        api.MapDelete("/admin/lookups/{id:long}", async (long id, HubDbContext db, UserContext me, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var x = await Load(db.LookupValues.Where(l => l.Id == id), "The value", ct);
            if (LookupLists.IsFixedWorkflowLabel(x.ListName))
                throw new ValidationException("record", "Condition and case-status values are fixed; only their display labels can be changed.");
            var used = (await LookupUsage.CountsAsync(db, x.ListName, ct)).GetValueOrDefault(x.Code);
            if (used > 0) throw new ConflictException($"{x.Label} is used by {used} record(s). Change those records first, or retire it so it is no longer offered.",
                new() { ["record"] = [$"Used by {used} record(s)."] });
            if (LookupLists.Categories.ContainsKey(x.ListName) && !await db.LookupValues.AnyAsync(l => l.ListName == x.ListName && l.Id != id && !l.IsRetired, ct))
                throw new ValidationException("record", "Keep at least one active value in this list.");
            return await RunAsync(db, files, me, x, "LookupValue", id, $"{x.Label}", null, ct);
        }).WithTags("Delete");
    }
}

/// <summary>How many records use each value of a configuration list (A34/A37).</summary>
public static class LookupUsage
{
    public static async Task<Dictionary<string, int>> CountsAsync(HubDbContext db, string list, CancellationToken ct)
    {
        var rows = list switch
        {
            LookupLists.OrganizationRelationshipType => await db.OrganizationRelationships.IgnoreQueryFilters().Where(x => x.RelationshipType != null).GroupBy(x => x.RelationshipType!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.EnvironmentType => await db.Environments.IgnoreQueryFilters().GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.AssetType => await db.Assets.IgnoreQueryFilters().GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ContractType => await db.Contracts.IgnoreQueryFilters().GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.CaseType => await db.Cases.IgnoreQueryFilters().GroupBy(x => x.Type).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.AssetRole => await db.Assets.IgnoreQueryFilters().Where(x => x.Role != null).GroupBy(x => x.Role!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.NetworkZone => await db.Assets.IgnoreQueryFilters().Where(x => x.NetworkZone != null).GroupBy(x => x.NetworkZone!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.OsFamily => await db.Assets.IgnoreQueryFilters().Where(x => x.OsFamily != null).GroupBy(x => x.OsFamily!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ProjectPhase => await db.Assets.IgnoreQueryFilters().Where(x => x.ProjectPhase != null).GroupBy(x => x.ProjectPhase!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.ComponentRole => await db.Components.IgnoreQueryFilters().GroupBy(x => x.Role).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.BoundaryArea => await db.Boundaries.IgnoreQueryFilters().GroupBy(x => x.Area).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.TeamRole => await db.ClientTeamMembers.GroupBy(x => x.Role).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            LookupLists.TeamMemberRole => await db.TeamMembers.Where(x => x.TeamRole != null).GroupBy(x => x.TeamRole!).Select(x => new { code = x.Key, n = x.Count() }).ToListAsync(ct),
            // An escalation channel counts where an escalation or a logged communication uses it.
            LookupLists.EscalationChannel => (await db.Escalations.IgnoreQueryFilters().Select(x => x.Channel)
                    .Concat(db.EscalationEvents.Where(x => x.Channel != null && x.Type == Escalations.EscalationEventType.Communication).Select(x => x.Channel!)).ToListAsync(ct))
                .GroupBy(x => x).Select(x => new { code = x.Key, n = x.Count() }).ToList(),
            _ => []
        };
        return rows.ToDictionary(x => x.code, x => x.n);
    }
}
