using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Shorthand for the broad grants test roles are given. The application has no such flags; these only choose rights.</summary>
[Flags]
public enum Flag { None = 0, Edit = 1, Manage = 2, Archive = 4, Delete = 8, Export = 16, TechnicalDetail = 32, Audit = 64, Administer = 128 }

/// <summary>Builds the rights a test role needs, so a test states what it is about instead of listing every supporting right.</summary>
public static class Fixture
{
    /// <summary>Exactly the named rights that exist, plus the clients page where they need it and the platform rights they name implicitly. Other prerequisites stay the test's choice.</summary>
    public static string[] Rights(IEnumerable<string> keys)
    {
        var named = keys.Where(k => RightsCatalog.Find(k) is not null).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var key in named.ToArray())
        {
            if (key.StartsWith("ClientStructure:", StringComparison.OrdinalIgnoreCase) || key.StartsWith("tab.ClientStructure.", StringComparison.OrdinalIgnoreCase)) named.Add(RightKeys.ClientsAccess);
            if (key.EndsWith(":HistoryView", StringComparison.OrdinalIgnoreCase)) named.Add(RightKeys.Audit);
            if (key.EndsWith(":Export", StringComparison.OrdinalIgnoreCase)) named.Add(RightKeys.PlatformExport);
        }
        return named.ToArray();
    }

    /// <summary>
    /// The named rights, the rights of the broad flags, and the tab and feature rights that belong to them. Not their prerequisites, so that a
    /// test can still leave one out: only the platform rights of the named rights are added, because a test role that names <c>Cases:Export</c> means it.
    /// </summary>
    public static string[] Rights(IEnumerable<string> keys, Flag flags)
    {
        var named = keys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var result = new HashSet<string>(named.Where(k => RightsCatalog.Find(k) is not null), StringComparer.OrdinalIgnoreCase);
        // Every area of a named client right opens through the clients page.
        if (named.Any(k => k.StartsWith("ClientStructure:", StringComparison.OrdinalIgnoreCase) || k.StartsWith("tab.ClientStructure.", StringComparison.OrdinalIgnoreCase)
            || RightsCatalog.Tabs.Any(t => t.Resource == RightKeys.Structure && t.Sources.Contains(k, StringComparer.OrdinalIgnoreCase))))
            result.Add(RightKeys.ClientsAccess);
        foreach (var key in named)
        {
            if (key.EndsWith(":HistoryView", StringComparison.OrdinalIgnoreCase)) result.Add(RightKeys.Audit);
            if (key.EndsWith(":Export", StringComparison.OrdinalIgnoreCase)) result.Add(RightKeys.PlatformExport);
        }
        foreach (var tab in RightsCatalog.Tabs)
        {
            var source = tab.Resource == RightKeys.Structure ? tab.Sources : [$"{tab.Resource}:DetailsView"];
            if (source.Any(named.Contains)) result.Add(RightKeys.Tab(tab.Resource, tab.Key));
        }
        foreach (var right in RightsCatalog.All.Where(r => r.Key.StartsWith("tab.", StringComparison.Ordinal) && r.Action != RightKeys.View))
        {
            var tab = RightsCatalog.Tabs.First(t => right.Key.StartsWith($"tab.{t.Resource}.{t.Key}:", StringComparison.Ordinal));
            var source = tab.Key == "contacts" ? RightKeys.Other : tab.Resource;
            var action = tab.Key is "jira" or "conditions" ? RightKeys.Maintain : right.Action;
            if (named.Contains($"{source}:{action}")) result.Add(right.Key);
        }
        foreach (var right in RightsCatalog.All.Where(r => r.Module is "Dashboard" or "Teams" or "Reporting Center" && !RightsCatalog.BusinessResources.Contains(r.Feature)
            && r.Feature is not (RightKeys.Dashboard or RightKeys.Notifications or RightKeys.Reporting)))
        {
            var owner = right.Module == "Dashboard" ? "Dashboard:View" : right.Module == "Teams" ? $"Teams:{right.Action}" : "Reporting:View";
            if (right.Action == RightKeys.View ? named.Contains(owner) : right.Module == "Teams" && named.Contains(owner)) result.Add(right.Key);
        }
        if (named.Contains("Teams:Coordinate")) result.Add("Handovers:Maintain");
        if (flags.HasFlag(Flag.Export))
        {
            result.Add(RightKeys.PlatformExport);
            result.UnionWith(RightsCatalog.All.Where(r => r.Module == "Reporting Center" && r.Action != RightKeys.View).Select(r => r.Key));
        }
        if (flags.HasFlag(Flag.TechnicalDetail)) result.Add(RightKeys.TechnicalDetail);
        if (flags.HasFlag(Flag.Audit)) { result.Add(RightKeys.Audit); result.Add("AdminAudit:View"); }
        if (flags.HasFlag(Flag.Administer))
        {
            result.Add(RightKeys.Administration);
            result.UnionWith(RightsCatalog.All.Where(r => r.Feature is "AdminUsers" or "AdminRoles" or "AdminGroups" or "AdminConfig" or "AdminSettings" or "AdminIntegrations").Select(r => r.Key));
        }
        if (flags.HasFlag(Flag.Edit))
        {
            result.UnionWith(RightsCatalog.All.Where(r => r.Feature is RightKeys.PersonalNotes or RightKeys.Notifications && r.Action != RightKeys.View).Select(r => r.Key));
            result.Add("DataQuality:Maintain");
        }
        return result.ToArray();
    }

    public static string[] Engineer => RightsCatalog.EngineerDefault;

    /// <summary>The record rights a broad flag stood for.</summary>
    public static string[] ExpandBroad(Flag flags)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var record = RightsCatalog.All.Where(r => RightsCatalog.BusinessResources.Contains(r.Feature) && !r.Key.StartsWith("tab.", StringComparison.Ordinal)).ToArray();
        if (flags != Flag.None) result.UnionWith(record.Where(r => r.Action is RightKeys.View or RightKeys.DetailsView or RightKeys.HistoryView or RightKeys.AttachmentsView).Select(r => r.Key));
        if (flags.HasFlag(Flag.Edit)) result.UnionWith(RightsCatalog.EngineerDefault);
        if (flags.HasFlag(Flag.Manage)) result.UnionWith(record.Where(r => r.Action == RightKeys.Coordinate).Select(r => r.Key).Append("ClientStructure:Create").Append("Teams:Create"));
        if (flags.HasFlag(Flag.Archive)) result.UnionWith(record.Where(r => r.Action == RightKeys.ArchiveRestore).Select(r => r.Key));
        if (flags.HasFlag(Flag.Delete)) result.UnionWith(record.Where(r => r.Action is RightKeys.Delete or RightKeys.AttachmentsDelete).Select(r => r.Key));
        if (flags.HasFlag(Flag.Export)) result.UnionWith(record.Where(r => r.Action == RightKeys.Export).Select(r => r.Key));
        return Rights(result, flags);
    }

    /// <summary>The rights named by a flag list, as test role payloads wrote them.</summary>
    public static string[] With(IEnumerable<string> keys, params string[] flags) =>
        [.. keys, .. Rights([], flags.Aggregate(Flag.None, (all, name) => all | Enum.Parse<Flag>(name)))];
}
