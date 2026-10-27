using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Data;

/// <summary>
/// Insert-only reference data for every environment: reference lists, the two disconnected Jira instances (no host until an
/// administrator approves one), policy settings without unsafe defaults, and the BRD's pilot review intervals (OPS-04).
/// Values administrators changed or retired are left alone.
/// </summary>
public static class ReferenceData
{
    private static readonly Dictionary<string, (string Code, string? Description)[]> Lookups = new()
    {
        [LookupLists.OrganizationRelationshipType] = [("Client", null), ("Contractor", null), ("Subcontractor", null), ("Sub-subcontractor", null), ("Supplier", null), ("Partner", null), ("Consultant", null), ("Vendor", null), ("Service Provider", null), ("Other", null)],
        [LookupLists.ComponentRole] = [("Web", null), ("Application", null), ("Database", null), ("Import", null), ("Workflow", null), ("ANPR", null), ("Media", null), ("Reporting", null), ("Monitoring", null), ("Other", null)],
        [LookupLists.AssetRole] = [("Application server", null), ("Web server", null), ("Database server", null), ("Listener", null), ("Load balancer", null), ("Storage", null), ("Other", null)],
        [LookupLists.NetworkZone] = [("DMZ", null), ("Internal", null), ("Management", null), ("Client LAN", null)],
        [LookupLists.ProjectPhase] = [("Requested", null), ("Approved", null), ("Deployed", null)],
        [LookupLists.BoundaryArea] = [("Application", null), ("Database", null), ("Operating system", null), ("Network", null), ("Backup", null), ("Monitoring", null)],
        [LookupLists.OsFamily] = [("Windows Server", null), ("Linux", null), ("Other", null)],
        [LookupLists.TeamMemberRole] = [("Team lead", null), ("Senior engineer", null), ("Engineer", null), ("Support engineer", null), ("Developer", null), ("Analyst", null)],
        [LookupLists.PriorityGuidance] = [
            ("Critical", "Proposed: service down for a client; criteria to be agreed before the pilot."),
            ("High", "Proposed: significant degradation; criteria to be agreed before the pilot."),
            ("Normal", "Proposed: limited impact; criteria to be agreed before the pilot."),
            ("Low", "Proposed: no customer impact; criteria to be agreed before the pilot.")],
        [LookupLists.ConditionLabel] = [("Unknown", null), ("Healthy", null), ("Degraded", null), ("Unavailable", null)],
        [LookupLists.CaseStatusLabel] = [("New", null), ("Triaged", null), ("InProgress", null), ("PendingValidation", null), ("Closed", null), ("Cancelled", null)]
    };

    private static readonly (string Key, string Value, string Description)[] Settings =
    [
        (SettingKeys.ApprovedLinkHosts, "", "Comma-separated HTTPS hosts approved for document links (open decision; empty = no links accepted)."),
        (SettingKeys.VaultReferencePrefix, "vault://", "Required prefix of approved vault references. The hub stores references only, never secrets."),
        (SettingKeys.CoverageCriticalities, "Critical,High", "Environment criticalities that require an active backup owner (coverage policy)."),
        (SettingKeys.CoveragePriorities, "Critical", "Case priorities that require an active backup owner (coverage policy)."),
        (SettingKeys.UpcomingDays, "7", "Upcoming window for commitments, in calendar days (Section 7 proposed default)."),
        (SettingKeys.DefaultTimeZone, "UTC", "Default display time zone for new users."),
        (SettingKeys.PaymentReminderDays, "14", "Days before a contract payment is due that its owner and the managers are reminded (1–90).")
    ];

    // OPS-04 pilot defaults; condition evidence interval is an implementation assumption (BRD gives no figure).
    private static readonly (string Type, ReviewScope Scope, int? Days, bool Next, string Notes)[] Policies =
    [
        (RecordTypes.Case, ReviewScope.Record, 2, true, "Active cases every 2 calendar days and by the explicit next-review time (pilot default)."),
        (RecordTypes.Client, ReviewScope.Record, 90, true, "Client records every 90 days and after material change (pilot default)."),
        (RecordTypes.Contact, ReviewScope.Record, 90, false, "Contact records every 90 days (pilot default)."),
        (RecordTypes.Environment, ReviewScope.Inventory, 30, true, "Environment inventory every 30 days and after material change (pilot default)."),
        (RecordTypes.Environment, ReviewScope.Condition, 7, false, "Condition evidence older than 7 days shows Needs verification (assumption; confirm with owners)."),
        (RecordTypes.Commitment, ReviewScope.Record, null, true, "Commitments are reviewed on material change and by their next-review date.")
    ];

    public static async Task SeedAsync(HubDbContext db, CancellationToken ct = default)
    {
        var have = (await db.LookupValues.Select(l => new { l.ListName, l.Code }).ToListAsync(ct)).Select(x => (x.ListName, x.Code)).ToHashSet();
        foreach (var (list, values) in Lookups)
            for (var i = 0; i < values.Length; i++)
                if (!have.Contains((list, values[i].Code)))
                    db.LookupValues.Add(new LookupValue { ListName = list, Code = values[i].Code, Label = values[i].Code, Description = values[i].Description, SortOrder = (i + 1) * 10 });
        // A53: team roles typed before the list existed become list values, so they can still be chosen.
        var typed = await db.TeamMembers.Where(m => m.TeamRole != null).Select(m => m.TeamRole!).Distinct().ToListAsync(ct);
        foreach (var (role, i) in typed.Where(r => !have.Contains((LookupLists.TeamMemberRole, r)) && !Lookups[LookupLists.TeamMemberRole].Any(v => v.Code == r)).Select((r, i) => (r, i)))
            db.LookupValues.Add(new LookupValue { ListName = LookupLists.TeamMemberRole, Code = role, Label = role, SortOrder = 100 + i * 10 });

        if (!await db.JiraInstances.AnyAsync(ct))
        {
            db.JiraInstances.Add(new JiraInstance { Name = "Customer Cloud Jira", Kind = JiraInstanceKind.CustomerCloud, ApprovedHost = "" });
            db.JiraInstances.Add(new JiraInstance { Name = "Internal On-prem Jira", Kind = JiraInstanceKind.InternalOnPrem, ApprovedHost = "" });
        }

        var keys = await db.Settings.Select(s => s.Key).ToListAsync(ct);
        foreach (var s in Settings.Where(s => !keys.Contains(s.Key)))
            db.Settings.Add(new AppSetting { Key = s.Key, Value = s.Value, Description = s.Description });

        if (!await db.ReviewPolicies.AnyAsync(ct))
            foreach (var p in Policies)
                db.ReviewPolicies.Add(new ReviewPolicy { RecordType = p.Type, Scope = p.Scope, MaxAgeDays = p.Days, UsesNextReviewDate = p.Next, Notes = p.Notes, EffectiveFrom = new DateOnly(2026, 10, 16) });

        await db.SaveChangesAsync(ct);
    }
}
