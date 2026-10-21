using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Shared;

/// <summary>
/// A43 (owner request, 21 Oct 2026): delete a record together with everything that belongs to it, from the same dialog. What belongs to a
/// record is read from the database model: rows with a required reference to it (or to something that belongs to it), and rows whose scope
/// column (ClientId, EnvironmentId, RegionId) points at it. Rows that only refer to it through an optional link (a commitment linked to a
/// case, a sub-client of a client) are kept and unlinked. The audit trail, export log and notifications are never deleted. All in one
/// transaction; one audit entry lists what was removed.
/// </summary>
public static class Cascade
{
    public sealed record Item(long Id, string Label, string? Link, string? DeletePath);
    /// <summary><paramref name="Main"/>: a record people work with (shown as its own row); otherwise history entries and links, summarised.</summary>
    public sealed record Group(string Type, string Label, int Count, bool Unlinked, bool Main, List<Item> Items);
    public sealed record Preview(string Label, int Total, List<Group> Delete, List<Group> Unlink);

    private sealed record Kind(string Path, Type Entity, string RecordType, string? ScopeColumn);
    private static readonly Kind[] Kinds =
    [
        new("clients", typeof(Client), RecordTypes.Client, "ClientId"),
        new("regions", typeof(Region), RecordTypes.Region, "RegionId"),
        new("environments", typeof(ClientEnvironment), RecordTypes.Environment, "EnvironmentId"),
        new("projects", typeof(Project), RecordTypes.Project, null),
        new("contracts", typeof(Contract), RecordTypes.Contract, null),
        new("assets", typeof(Asset), RecordTypes.Asset, null),
        new("installations", typeof(Installation), RecordTypes.Installation, null),
        new("components", typeof(Component), RecordTypes.Component, null),
        new("cases", typeof(Case), RecordTypes.Case, null),
        new("commitments", typeof(Commitment), RecordTypes.Commitment, null),
        new("escalations", typeof(Escalation), RecordTypes.Escalation, null),
        new("teams", typeof(Team), "Team", null)
    ];

    /// <summary>Where each record type opens and how it is deleted on its own (for the per-row buttons).</summary>
    private static readonly Dictionary<Type, string> Routes = new()
    {
        [typeof(Client)] = "clients", [typeof(Region)] = "regions", [typeof(ClientEnvironment)] = "environments", [typeof(Asset)] = "assets", [typeof(Volume)] = "volumes",
        [typeof(Installation)] = "installations", [typeof(Component)] = "components", [typeof(Modules.Firewall.FirewallRule)] = "firewall-rules", [typeof(Project)] = "projects",
        [typeof(Contract)] = "contracts", [typeof(Case)] = "cases", [typeof(Commitment)] = "commitments", [typeof(Escalation)] = "escalations", [typeof(Contact)] = "contacts",
        [typeof(ResponsibilityBoundary)] = "boundaries", [typeof(Team)] = "teams"
    };
    private static readonly HashSet<string> NoOwnPage = ["contacts", "boundaries", "volumes", "firewall-rules"];

    /// <summary>Never deleted: the audit trail and logs.</summary>
    private static readonly HashSet<Type> Never = [typeof(AuditEntry), typeof(ExportLog), typeof(Notifications.Notification),
        // A47: private notes are never listed or counted for someone else; a deleted client or project only clears their link (database rule).
        typeof(Notes.Notebook), typeof(Notes.NoteSection), typeof(Notes.NotePage), typeof(Notes.NoteFile)];
    /// <summary>Tables that point at any record by type name and id.</summary>
    private static readonly Type[] Polymorphic = [typeof(Review), typeof(DocumentReference), typeof(DataQualityItem), typeof(HandoverItem), typeof(Attachments.Attachment)];

    private static readonly string[] LabelColumns = ["Ref", "Code", "Name", "Title", "InstanceName", "Label", "Area", "Purpose", "IssueKey", "Role"];

    private sealed record Edge(IEntityType Child, string Column, IEntityType Parent, string ParentKey);
    private sealed record Unlink(IEntityType Child, string Column, IEntityType Parent);
    private sealed class Plan
    {
        public required IEntityType Root;
        public List<IEntityType> Order = [];          // parents before children
        public List<Edge> Edges = [];
        public List<Unlink> Unlinks = [];
    }

    public static bool Supports(string path) => Kinds.Any(k => k.Path == path);

    private static string Table(IEntityType e) => $"[{e.GetSchema() ?? "dbo"}].[{e.GetTableName()}]";
    private static string Col(IEntityType e, IProperty p) => $"[{p.GetColumnName(StoreObjectIdentifier.Table(e.GetTableName()!, e.GetSchema()))}]";
    private static IProperty? SingleKey(IEntityType e) => e.FindPrimaryKey() is { Properties.Count: 1 } k && k.Properties[0].ClrType == typeof(long) ? k.Properties[0] : null;
    private static bool Mapped(IEntityType e) => e.GetTableName() is not null && !e.IsOwned() && e.FindPrimaryKey() is not null && !Never.Contains(e.ClrType) && e.GetViewName() is null;

    private static Plan Build(HubDbContext db, Kind kind)
    {
        var model = db.Model;
        var root = model.FindEntityType(kind.Entity)!;
        var plan = new Plan { Root = root };
        var owned = new HashSet<IEntityType> { root };
        plan.Order.Add(root);
        var types = model.GetEntityTypes().Where(Mapped).ToList();
        bool changed;
        do
        {
            changed = false;
            foreach (var t in types)
            {
                foreach (var fk in t.GetForeignKeys())
                {
                    if (fk.Properties.Count != 1 || !owned.Contains(fk.PrincipalEntityType) || fk.PrincipalEntityType == t) continue;
                    var prop = fk.Properties[0];
                    var scope = fk.PrincipalEntityType == root && kind.ScopeColumn == prop.Name;
                    if (!fk.IsRequired && !scope) continue;
                    var parentKey = fk.PrincipalKey.Properties[0];
                    var edge = new Edge(t, Col(t, prop), fk.PrincipalEntityType, Col(fk.PrincipalEntityType, parentKey));
                    if (plan.Edges.Any(x => x.Child == t && x.Column == edge.Column && x.Parent == edge.Parent)) continue;
                    plan.Edges.Add(edge);
                    if (owned.Add(t)) { plan.Order.Add(t); changed = true; }
                }
                // Scope columns without a declared reference (for example ComponentHost.ClientId).
                if (kind.ScopeColumn is { } sc && t != root && t.FindProperty(sc) is { } p && !t.GetForeignKeys().Any(f => f.Properties.Contains(p) && f.PrincipalEntityType == root))
                {
                    var edge = new Edge(t, Col(t, p), root, Col(root, SingleKey(root)!));
                    if (!plan.Edges.Any(x => x.Child == t && x.Column == edge.Column && x.Parent == root))
                    {
                        plan.Edges.Add(edge);
                        if (owned.Add(t)) { plan.Order.Add(t); changed = true; }
                    }
                }
            }
        } while (changed);
        // Parents first: a type comes after every owned type it hangs from.
        var sorted = new List<IEntityType>();
        var seen = new HashSet<IEntityType>();
        void Visit(IEntityType t, HashSet<IEntityType> path)
        {
            if (seen.Contains(t) || !path.Add(t)) return;
            foreach (var e in plan.Edges.Where(e => e.Child == t && e.Parent != t)) Visit(e.Parent, path);
            path.Remove(t);
            if (seen.Add(t)) sorted.Add(t);
        }
        foreach (var t in plan.Order) Visit(t, []);
        plan.Order = sorted;
        // Optional references to owned records that are not ownership: unlinked (set to empty) before deleting.
        foreach (var t in types)
            foreach (var fk in t.GetForeignKeys().Where(f => f.Properties.Count == 1 && !f.IsRequired && owned.Contains(f.PrincipalEntityType)))
            {
                var col = Col(t, fk.Properties[0]);
                if (!plan.Edges.Any(e => e.Child == t && e.Column == col)) plan.Unlinks.Add(new Unlink(t, col, fk.PrincipalEntityType));
            }
        return plan;
    }

    private static string Name(IEntityType t) => t.ClrType.Name;

    /// <summary>Fills #own with the ids of every owned row (single-key types); composite-key link rows are matched by their references.</summary>
    private static async Task CollectAsync(HubDbContext db, Plan plan, long id, CancellationToken ct)
    {
        await db.Database.ExecuteSqlRawAsync("IF OBJECT_ID('tempdb..#own') IS NOT NULL DROP TABLE #own; CREATE TABLE #own (t nvarchar(200) NOT NULL, id bigint NOT NULL, PRIMARY KEY (t, id));", ct);
        await db.Database.ExecuteSqlRawAsync($"INSERT #own (t, id) VALUES (N'{Name(plan.Root)}', {id});", ct);
        foreach (var t in plan.Order.Where(t => t != plan.Root && SingleKey(t) is not null))
            await db.Database.ExecuteSqlRawAsync($"INSERT #own (t, id) SELECT DISTINCT N'{Name(t)}', x.{Col(t, SingleKey(t)!)} FROM {Table(t)} x WHERE {Where(plan, t)} AND NOT EXISTS (SELECT 1 FROM #own o WHERE o.t = N'{Name(t)}' AND o.id = x.{Col(t, SingleKey(t)!)});", ct);
    }

    private static string Where(Plan plan, IEntityType t, string alias = "x") =>
        "(" + string.Join(" OR ", plan.Edges.Where(e => e.Child == t).Select(e => $"{alias}.{e.Column} IN (SELECT id FROM #own WHERE t = N'{Name(e.Parent)}')")) + ")";

    private static string Owned(Plan plan, IEntityType t, string alias = "x") =>
        SingleKey(t) is { } k ? $"{alias}.{Col(t, k)} IN (SELECT id FROM #own WHERE t = N'{Name(t)}')" : Where(plan, t, alias);

    private static string Friendly(IEntityType t)
    {
        var n = t.ClrType.Name switch
        {
            "ClientEnvironment" => "Environments", "Asset" => "Servers", "ComponentHost" => "Server–component links", "Client" => "Sub-clients", "ClientTeamMember" => "Project team members",
            "ResponsibilityBoundary" => "Responsibility boundaries", "FirewallRule" => "Firewall rules", "SlaTarget" => "SLA targets", "ContractEnvironment" => "Contract coverage",
            "ProjectProduct" => "Project products", "UserScope" => "User access scopes", "GroupMappingScope" => "Group mapping scopes", "JiraReference" => "Jira references",
            "CaseWaitingInterval" => "Case waiting periods", "InstallationVersionChange" => "Version changes", "ConditionReport" => "Condition reports", "DataQualityItem" => "Data-quality items",
            "DocumentReference" => "Document references", "Attachment" => "Attachments", "ContractMilestone" => "Delivery schedule rows", "ContractFee" => "Fee lines", "ContractPayment" => "Payment terms", "MicroserviceVersion" => "Microservice versions", "HandoverItem" => "Handover items", "CaseAsset" => "Case–server links",
            "CaseEnvironment" => "Case–environment links", "CaseComponent" => "Case–component links", "SharedStorage" => "Shared storage", "Volume" => "Volumes",
            "CaseEvent" => "Case history entries", "CommitmentEvent" => "Commitment history entries", "EscalationEvent" => "Escalation timeline entries", "Review" => "Reviews",
            "ProductDeveloper" => "Product developers", "TeamMember" => "Team members",
            _ => System.Text.RegularExpressions.Regex.Replace(t.ClrType.Name, "(?<!^)([A-Z])", " $1") + "s"
        };
        return n.Replace("Cases", "Cases").Replace("ys", "ies");
    }

    private sealed class Row { public long Id { get; set; } public string? Label { get; set; } }

    private static async Task<List<Group>> GroupsAsync(HubDbContext db, Plan plan, CancellationToken ct)
    {
        var groups = new List<Group>();
        foreach (var t in plan.Order.Where(t => t != plan.Root))
        {
            var n = await db.Database.SqlQueryRaw<int>($"SELECT COUNT(*) AS [Value] FROM {Table(t)} x WHERE {Owned(plan, t)}").SingleAsync(ct);
            if (n == 0) continue;
            var items = new List<Item>();
            if (Routes.TryGetValue(t.ClrType, out var route) && SingleKey(t) is { } k)
            {
                var labelCol = LabelColumns.Select(c => t.FindProperty(c)).FirstOrDefault(p => p is not null && p.ClrType == typeof(string));
                var label = labelCol is null ? "CAST(x." + Col(t, k) + " AS nvarchar(50))" : $"x.{Col(t, labelCol)}";
                var title = t.FindProperty("Title") is { } tp && labelCol?.Name is "Ref" or "Code" ? $" + N' · ' + ISNULL(x.{Col(t, tp)}, N'')" : t.FindProperty("Name") is { } np && labelCol?.Name is "Code" ? $" + N' · ' + ISNULL(x.{Col(t, np)}, N'')" : "";
                var rows = await db.Database.SqlQueryRaw<Row>($"SELECT TOP 50 x.{Col(t, k)} AS [Id], {label}{title} AS [Label] FROM {Table(t)} x WHERE {Owned(plan, t)} ORDER BY 2").ToListAsync(ct);
                items = rows.Select(r => new Item(r.Id, r.Label ?? $"#{r.Id}", NoOwnPage.Contains(route) ? null : $"/{route}/{r.Id}", $"/{route}/{r.Id}")).ToList();
            }
            groups.Add(new Group(Name(t), Friendly(t), n, false, Routes.ContainsKey(t.ClrType), items));
        }
        // Main records first, in the order people think of them; then history entries and links.
        var order = Routes.Keys.Select(k => k.Name).ToList();
        return groups.OrderBy(g => g.Main ? 0 : 1).ThenBy(g => g.Main ? order.IndexOf(g.Type) : 0).ThenBy(g => g.Label).ToList();
    }

    private static async Task<List<Group>> UnlinkGroupsAsync(HubDbContext db, Plan plan, CancellationToken ct)
    {
        var groups = new List<Group>();
        foreach (var g in plan.Unlinks.GroupBy(u => u.Child))
        {
            var t = g.Key;
            var refers = string.Join(" OR ", g.Select(u => $"x.{u.Column} IN (SELECT id FROM #own WHERE t = N'{Name(u.Parent)}')"));
            var notOwned = SingleKey(t) is { } k ? $" AND x.{Col(t, k)} NOT IN (SELECT id FROM #own WHERE t = N'{Name(t)}')" : plan.Edges.Any(e => e.Child == t) ? $" AND NOT {Where(plan, t)}" : "";
            var n = await db.Database.SqlQueryRaw<int>($"SELECT COUNT(*) AS [Value] FROM {Table(t)} x WHERE ({refers}){notOwned}").SingleAsync(ct);
            if (n > 0) groups.Add(new Group(Name(t), Friendly(t), n, true, Routes.ContainsKey(t.ClrType), []));
        }
        return groups;
    }

    private static Kind KindOf(string path) => Kinds.FirstOrDefault(k => k.Path == path) ?? throw new NotFoundException("The record type");

    /// <summary>Checks the record exists and is visible to the user (query filters apply) and returns its label and client.</summary>
    private static async Task<(string Label, long? ClientId)> LoadAsync(HubDbContext db, Kind kind, long id, CancellationToken ct)
    {
        var et = db.Model.FindEntityType(kind.Entity)!;
        var q = (IQueryable<object>)typeof(Cascade).GetMethod(nameof(SetOf), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
            .MakeGenericMethod(kind.Entity).Invoke(null, [db])!;
        if (!await q.AnyAsync(e => EF.Property<long>(e, "Id") == id, ct)) throw new NotFoundException("The record");
        var labelCol = LabelColumns.Select(c => et.FindProperty(c)).FirstOrDefault(p => p is not null && p.ClrType == typeof(string));
        var label = labelCol is null ? $"#{id}" : await db.Database.SqlQueryRaw<string>($"SELECT {Col(et, labelCol)} AS [Value] FROM {Table(et)} WHERE {Col(et, SingleKey(et)!)} = {id}").SingleAsync(ct);
        long? clientId = kind.Entity == typeof(Client) ? id
            : et.FindProperty("ClientId") is { } cp ? await db.Database.SqlQueryRaw<long?>($"SELECT {Col(et, cp)} AS [Value] FROM {Table(et)} WHERE {Col(et, SingleKey(et)!)} = {id}").SingleAsync(ct) : null;
        return (label, clientId);
    }

    private static IQueryable<object> SetOf<T>(HubDbContext db) where T : class => db.Set<T>().IgnoreQueryFilters([HubDbContext.ArchiveFilter]);

    public static async Task<Preview> PreviewAsync(HubDbContext db, UserContext me, string path, long id, CancellationToken ct)
    {
        me.RequireRight(Right.Delete);
        var kind = KindOf(path);
        var (label, _) = await LoadAsync(db, kind, id, ct);
        var plan = Build(db, kind);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await CollectAsync(db, plan, id, ct);
        var del = await GroupsAsync(db, plan, ct);
        var unlink = await UnlinkGroupsAsync(db, plan, ct);
        await tx.RollbackAsync(ct);
        return new Preview(label, del.Sum(g => g.Count), del, unlink);
    }

    public static async Task<IResult> DeleteAsync(HubDbContext db, Attachments.AttachmentStore files, UserContext me, string path, long id, CancellationToken ct)
    {
        me.RequireRight(Right.Delete);
        var kind = KindOf(path);
        var (label, clientId) = await LoadAsync(db, kind, id, ct);
        var plan = Build(db, kind);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await CollectAsync(db, plan, id, ct);
        var summary = (await GroupsAsync(db, plan, ct)).ToDictionary(g => g.Label, g => g.Count);
        var unlinked = (await UnlinkGroupsAsync(db, plan, ct)).ToDictionary(g => g.Label, g => g.Count);
        // Files of every attachment that goes (attached to a removed record, or owned through its client) — removed from disk after the commit.
        var att = db.Model.FindEntityType(typeof(Attachments.Attachment))!;
        var paths = new List<string>();
        foreach (var t in plan.Order.Where(t => SingleKey(t) is not null))
            paths.AddRange(await db.Database.SqlQueryRaw<string>($"SELECT {Col(att, att.FindProperty("StoredPath")!)} AS [Value] FROM {Table(att)} WHERE {Col(att, att.FindProperty("RecordType")!)} = N'{HubDbContext.EntityName(t.ClrType)}' AND {Col(att, att.FindProperty("RecordId")!)} IN (SELECT id FROM #own WHERE t = N'{Name(t)}')").ToListAsync(ct));
        if (plan.Order.Contains(att))
            paths.AddRange(await db.Database.SqlQueryRaw<string>($"SELECT x.{Col(att, att.FindProperty("StoredPath")!)} AS [Value] FROM {Table(att)} x WHERE {Owned(plan, att)}").ToListAsync(ct));
        // 1. Unlink optional references (from kept rows, and between rows about to go so no order problem remains).
        foreach (var u in plan.Unlinks)
            await db.Database.ExecuteSqlRawAsync($"UPDATE {Table(u.Child)} SET {u.Column} = NULL WHERE {u.Column} IN (SELECT id FROM #own WHERE t = N'{Name(u.Parent)}');", ct);
        // 2. Reviews, documents, data-quality and handover items that name a removed record.
        foreach (var t in plan.Order.Where(t => SingleKey(t) is not null))
            foreach (var p in Polymorphic.Select(x => db.Model.FindEntityType(x)!))
                await db.Database.ExecuteSqlRawAsync($"DELETE FROM {Table(p)} WHERE {Col(p, p.FindProperty("RecordType")!)} = N'{HubDbContext.EntityName(t.ClrType)}' AND {Col(p, p.FindProperty("RecordId")!)} IN (SELECT id FROM #own WHERE t = N'{Name(t)}');", ct);
        // 3. Children before parents.
        foreach (var t in Enumerable.Reverse(plan.Order))
            await db.Database.ExecuteSqlRawAsync($"DELETE x FROM {Table(t)} x WHERE {Owned(plan, t)};", ct);
        await db.Database.ExecuteSqlRawAsync("DROP TABLE #own;", ct);
        await db.AuditActionAsync("Remove", HubDbContext.EntityName(kind.Entity), id, label, clientId, $"{label} deleted with everything that belonged to it",
            new { deleted = summary, unlinked }, ct);
        await tx.CommitAsync(ct);
        files.Delete(paths.Distinct());
        return Results.Ok(new { deleted = summary.Values.Sum() + 1, unlinked = unlinked.Values.Sum() });
    }

    public static void MapCascadeEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/dependents").WithTags("Delete");
        g.MapGet("/{kind}/{id:long}", async (string kind, long id, HubDbContext db, UserContext me, CancellationToken ct) => Results.Ok(await PreviewAsync(db, me, kind, id, ct)));
        g.MapDelete("/{kind}/{id:long}", async (string kind, long id, HubDbContext db, UserContext me, Attachments.AttachmentStore files, CancellationToken ct) => await DeleteAsync(db, files, me, kind, id, ct));
    }
}
