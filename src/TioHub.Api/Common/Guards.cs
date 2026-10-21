using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace TioHub.Api.Common;

/// <summary>
/// Refuses free text that looks like a password, key, token or connection string with a secret (IAM-03, NFR-02).
/// The matched value is never logged or echoed back.
/// </summary>
public static partial class CredentialGuard
{
    public const string Message = "This looks like a password, key or token. Remove it, keep the secret in the approved vault and enter only the vault reference.";

    [GeneratedRegex(@"(?i)\b(password|passwd|pwd|passphrase|secret|api[_-]?key|access[_-]?key|client[_-]?secret|token|kennwort)\s*[:=]\s*\S{3,}")]
    private static partial Regex Assignment();

    [GeneratedRegex(@"-----BEGIN [A-Z ]*PRIVATE KEY-----")]
    private static partial Regex PrivateKey();

    [GeneratedRegex(@"(?i)\b(user id|uid)\s*=\s*[^;]+;\s*(password|pwd)\s*=")]
    private static partial Regex ConnectionString();

    [GeneratedRegex(@"\b(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b")]
    private static partial Regex KnownTokens();

    [GeneratedRegex(@"[A-Za-z0-9+/=_\-]{32,}")]
    private static partial Regex LongRun();

    [GeneratedRegex(@"(?i)\b(https?|file)://\S+")]
    private static partial Regex Url();

    [GeneratedRegex(@"(?i)\b[a-z][a-z0-9+.-]*://[^/\s:@]+:[^/\s@]+@")]
    private static partial Regex UrlWithCredentials();

    public static bool LooksLikeSecret(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        if (Assignment().IsMatch(text) || PrivateKey().IsMatch(text) || ConnectionString().IsMatch(text) || KnownTokens().IsMatch(text) || UrlWithCredentials().IsMatch(text)) return true;
        // Long random-looking strings (keys, tokens). Ordinary links are allowed; hyphenated words have far lower entropy.
        foreach (Match m in LongRun().Matches(Url().Replace(text, " ")))
            if (Entropy(m.Value) >= 4.2) return true;
        return false;
    }

    private static double Entropy(string s)
    {
        var counts = new Dictionary<char, int>();
        foreach (var c in s) counts[c] = counts.GetValueOrDefault(c) + 1;
        double h = 0;
        foreach (var n in counts.Values)
        {
            var p = (double)n / s.Length;
            h -= p * Math.Log2(p);
        }
        return h;
    }
}

/// <summary>Approved-link validation (Section 6.1 Links): HTTPS only, approved host, no embedded credentials.</summary>
public static class LinkGuard
{
    public static string? Problem(string? url, IReadOnlyCollection<string> approvedHosts)
    {
        if (string.IsNullOrWhiteSpace(url)) return "Enter the link.";
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u)) return "Enter a complete link starting with https://.";
        if (u.Scheme != Uri.UriSchemeHttps) return "Only HTTPS links are allowed.";
        if (!string.IsNullOrEmpty(u.UserInfo)) return "Links must not contain a user name or password.";
        if (CredentialGuard.LooksLikeSecret(u.Query)) return "The link contains what looks like a token. Remove it.";
        if (!IsApprovedHost(u.Host, approvedHosts)) return $"{u.Host} is not an approved link host. Ask an administrator to approve it.";
        return null;
    }

    public static bool IsApprovedHost(string host, IEnumerable<string> approved) =>
        approved.Any(a =>
        {
            var h = a.Trim().ToLowerInvariant();
            if (h.Length == 0) return false;
            return h.StartsWith("*.") ? host.EndsWith(h[1..], StringComparison.OrdinalIgnoreCase) : string.Equals(host, h, StringComparison.OrdinalIgnoreCase);
        });

    /// <summary>Vault references are identifiers in an approved format, never the secret (IAM-03).</summary>
    public static string? VaultProblem(string? reference, string prefix)
    {
        if (string.IsNullOrWhiteSpace(reference)) return "Enter the vault reference.";
        var r = reference.Trim();
        if (string.IsNullOrWhiteSpace(prefix) || !r.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return $"Vault references must start with {prefix}.";
        if (r.Contains(' ') || CredentialGuard.LooksLikeSecret(r[prefix.Length..])) return "Enter only the vault path, not the secret.";
        return null;
    }
}

/// <summary>Jira reference rules (WRK-03, DAT-03): instance + normalized key; URL must be the approved HTTPS host and name the same key.</summary>
public static partial class JiraKeys
{
    [GeneratedRegex(@"^[A-Z][A-Z0-9_]{0,19}-[1-9][0-9]{0,8}$")]
    private static partial Regex KeyPattern();

    public static string Normalize(string? key) => (key ?? "").Trim().ToUpperInvariant();

    public static bool IsValid(string key) => KeyPattern().IsMatch(key);

    public static string? UrlProblem(string url, string key, string approvedHost)
    {
        var problem = LinkGuard.Problem(url, [approvedHost]);
        if (problem is not null) return problem;
        var u = new Uri(url.Trim());
        var segments = u.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var last = segments.Length > 0 ? Uri.UnescapeDataString(segments[^1]) : "";
        var selected = System.Web.HttpUtility.ParseQueryString(u.Query)["selectedIssue"];
        if (!string.Equals(last, key, StringComparison.OrdinalIgnoreCase) && !string.Equals(selected, key, StringComparison.OrdinalIgnoreCase))
            return $"The link must point to {key}.";
        return null;
    }
}

/// <summary>
/// Local time + IANA zone → UTC (DAT-04, Section 5.4). Invalid local times (DST gap) are refused; ambiguous ones (DST overlap) need an explicit offset.
/// </summary>
public static class Zones
{
    public static TimeZoneInfo? Find(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return null;
        var s = id.Trim();
        // Only IANA identifiers are stored, so data reads the same on any server.
        if (s != "UTC" && !s.Contains('/')) return null;
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(s);
        }
        catch (TimeZoneNotFoundException) { return null; }
        catch (InvalidTimeZoneException) { return null; }
    }

    /// <summary>Converts a local wall-clock time (with optional explicit offset) in a zone to UTC, or adds an error.</summary>
    public static DateTimeOffset? ToUtc(Check check, string field, string? local, string? zoneId, string zoneField = "timeZone")
    {
        var zone = Find(zoneId);
        if (zone is null) { check.Add(zoneField, "Select a valid time zone (for example Asia/Riyadh)."); return null; }
        if (string.IsNullOrWhiteSpace(local)) { check.Add(field, "Enter the date and time."); return null; }
        var text = local.Trim();
        // An explicit offset resolves ambiguity; it must be a real offset of that zone at that instant.
        if (DateTimeOffset.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var withOffset) && HasExplicitOffset(text))
        {
            var actual = zone.GetUtcOffset(withOffset.UtcDateTime);
            if (actual != withOffset.Offset) { check.Add(field, $"The offset {withOffset:zzz} does not apply in {zone.Id} at that time (it is {Fmt(actual)})."); return null; }
            return withOffset.ToUniversalTime();
        }
        if (!DateTime.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var wall)) { check.Add(field, "Enter a valid date and time."); return null; }
        wall = DateTime.SpecifyKind(wall, DateTimeKind.Unspecified);
        if (zone.IsInvalidTime(wall)) { check.Add(field, $"{wall:yyyy-MM-dd HH:mm} does not exist in {zone.Id} (clocks change). Enter a different time."); return null; }
        if (zone.IsAmbiguousTime(wall))
        {
            var offsets = zone.GetAmbiguousTimeOffsets(wall).Select(Fmt);
            check.Add(field, $"{wall:yyyy-MM-dd HH:mm} occurs twice in {zone.Id}. Add the offset ({string.Join(" or ", offsets)}).");
            return null;
        }
        return new DateTimeOffset(wall, zone.GetUtcOffset(wall)).ToUniversalTime();
    }

    private static bool HasExplicitOffset(string s) => s.EndsWith('Z') || Regex.IsMatch(s, @"[+-]\d\d:?\d\d$");

    private static string Fmt(TimeSpan t) => (t < TimeSpan.Zero ? "-" : "+") + t.ToString(@"hh\:mm");

    public static string Local(DateTimeOffset utc, string zoneId)
    {
        var z = Find(zoneId) ?? TimeZoneInfo.Utc;
        return TimeZoneInfo.ConvertTime(utc, z).ToString("yyyy-MM-dd HH:mm zzz", CultureInfo.InvariantCulture);
    }
}

/// <summary>Network field validation (NET-05): addresses, subnets and ports.</summary>
public static class NetCheck
{
    /// <summary>Returns the canonical form of an IPv4/IPv6 address or CIDR subnet, or null if invalid.</summary>
    public static string? Canonical(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return null;
        var s = input.Trim();
        var slash = s.IndexOf('/');
        if (slash >= 0)
        {
            if (!IPAddress.TryParse(s[..slash], out var net) || !int.TryParse(s[(slash + 1)..], NumberStyles.None, CultureInfo.InvariantCulture, out var prefix)) return null;
            var max = net.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;
            if (prefix < 0 || prefix > max || !IsStrictIp(s[..slash], net)) return null;
            return $"{net}/{prefix}";
        }
        return IPAddress.TryParse(s, out var ip) && IsStrictIp(s, ip) ? ip.ToString() : null;
    }

    // IPAddress.TryParse accepts "10" or "10.1" as IPv4; require four dotted parts.
    private static bool IsStrictIp(string text, IPAddress ip) =>
        ip.AddressFamily != AddressFamily.InterNetwork || text.Split('.').Length == 4;

    /// <summary>Parses "443", "8080-8090", "80,443" into ranges 1–65535; null with an error message when invalid.</summary>
    public static (List<(int From, int To)>? Ranges, string? Error) Ports(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return (null, "Enter the destination port or range (1–65535).");
        var list = new List<(int, int)>();
        foreach (var part in input.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var bits = part.Split('-', StringSplitOptions.TrimEntries);
            if (bits.Length > 2 || !int.TryParse(bits[0], NumberStyles.None, CultureInfo.InvariantCulture, out var a)) return (null, $"“{part}” is not a port or range.");
            var b = a;
            if (bits.Length == 2 && !int.TryParse(bits[1], NumberStyles.None, CultureInfo.InvariantCulture, out b)) return (null, $"“{part}” is not a port or range.");
            if (a < 1 || b > 65535 || a > 65535 || b < 1) return (null, "Ports must be between 1 and 65535.");
            if (b < a) return (null, $"In “{part}” the range end is before its start.");
            list.Add((a, b));
        }
        return list.Count == 0 ? (null, "Enter the destination port or range (1–65535).") : (list, null);
    }

    public static string FormatPorts(IEnumerable<(int From, int To)> ranges) =>
        string.Join(",", ranges.OrderBy(r => r.From).Select(r => r.From == r.To ? r.From.ToString(CultureInfo.InvariantCulture) : $"{r.From}-{r.To}"));
}

/// <summary>Source-notation flags for transcribed values (RDY-04): placeholders and malformed capacities.</summary>
public static partial class SourceNotation
{
    [GeneratedRegex(@"\?{2,}|\bTBD\b|\bTBC\b|\bN/?A\b|\bxx+\b", RegexOptions.IgnoreCase)]
    private static partial Regex Placeholder();

    public static bool HasPlaceholder(string? notation) => !string.IsNullOrWhiteSpace(notation) && Placeholder().IsMatch(notation);
}
