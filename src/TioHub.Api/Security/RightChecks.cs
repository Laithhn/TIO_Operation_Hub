using TioHub.Api.Common;

namespace TioHub.Api.Security;

/// <summary>Checks that combine several rights: reports and archived rows. Mandatory client, project and team filters still apply after these succeed.</summary>
public static class RightChecks
{
    public static string[] BusinessResources => RightsCatalog.BusinessResources;
    public static string[] BusinessViewKeys => RightsCatalog.BusinessViewKeys;

    public static readonly string[] KnownReportKeys = ["cases", "commitments", "actions", "environments", "versions", "assets", "data-quality", "contracts", "sla-compliance", "commitment-performance", "case-aging", "team-workload", "team-kpis", "client-health"];

    public static string[] ReadableReports(UserContext me) => KnownReportKeys.Where(key =>
        me.HasRight(RightKeys.Reporting, RightKeys.View) && ReportResources(key).All(resource => me.HasRight(resource, RightKeys.View))).ToArray();

    public static void RequireViews(UserContext me, params string[] resources)
    {
        foreach (var resource in resources) me.RequireRight(resource, RightKeys.View);
    }

    /// <summary>Archived rows carry record details and must retain their resource and section boundaries.</summary>
    public static void RequireArchivedRead(UserContext me, string recordType)
    {
        RequireViews(me, string.IsNullOrEmpty(recordType) ? BusinessResources : [RightKeys.ForRecord(recordType)]);
        if (string.IsNullOrEmpty(recordType) || recordType is RecordTypes.Client or RecordTypes.Region)
            me.RequireRight(RightKeys.Tab(RightKeys.Structure, "structure"));
        if (string.IsNullOrEmpty(recordType) || recordType == RecordTypes.Contact)
            me.RequireRight(RightKeys.Tab(RightKeys.Structure, "contacts"));
    }

    /// <summary>Regions, contacts and organizations also have their own section rights.</summary>
    public static void RequireRecordSection(UserContext me, string recordType, string action)
    {
        var section = recordType switch { "Region" => "structure", "Contact" or "ResponsibilityBoundary" => "contacts", "Organization" or "OrganizationRelationship" => "organizations", _ => null };
        if (section != null) me.RequireRight(RightKeys.Tab(RightKeys.Structure, section, action));
    }

    public static string[] ReportResources(string report) => report.ToLowerInvariant() switch
    {
        "cases" or "cases-builder" or "case-aging" => [RightKeys.Cases],
        "commitments" or "commitment-performance" => [RightKeys.Commitments],
        "environments" => [RightKeys.Environments],
        "versions" => [RightKeys.Installations, RightKeys.Products],
        "assets" => [RightKeys.Servers],
        "contracts" => [RightKeys.Contracts],
        "sla-compliance" => [RightKeys.Cases, RightKeys.Contracts],
        "team-workload" => [RightKeys.Teams, RightKeys.Cases, RightKeys.Commitments],
        "team-kpis" => [RightKeys.Teams, RightKeys.Cases],
        "data-quality" or "actions" or "client-health" => BusinessResources,
        _ => throw new ForbiddenException("This report has no registered data access policy.")
    };

    public static void RequireReport(UserContext me, string report)
    {
        me.RequireRight(RightKeys.Reporting, RightKeys.View);
        RequireViews(me, ReportResources(report));
    }

    public static void RequireReportExport(UserContext me, string report)
    {
        RequireReport(me, report);
        foreach (var resource in ReportResources(report)) me.RequireRight(resource, RightKeys.Export);
    }

    public static string[] ClientTabViews(string tab) => tab.ToLowerInvariant() switch
    {
        "structure" => [RightKeys.Structure, RightKeys.Environments],
        "organizations" => [RightKeys.Structure],
        "projects" => [RightKeys.Projects],
        "contracts" => [RightKeys.Contracts],
        "cases" => [RightKeys.Cases],
        "commitments" => [RightKeys.Commitments],
        "escalations" or "contacts" => [RightKeys.Other],
        "infra" => [RightKeys.Servers],
        _ => throw new ValidationException("tab", "Choose a supported client tab.")
    };

    public static bool CanOpenClientPage(UserContext me) => me.HasRight(RightKeys.ClientsAccess) &&
        (RightsCatalog.Tabs.Where(t => t.Resource == RightKeys.Structure).Any(t => me.HasRight(RightKeys.Tab(t.Resource, t.Key)))
        || me.HasRight(RightKeys.Structure, RightKeys.AttachmentsView)
        || me.HasRight(RightKeys.Structure, RightKeys.HistoryView));
}
