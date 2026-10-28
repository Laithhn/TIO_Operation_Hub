using System.Globalization;
using TioHub.Api.Common;
using TioHub.Api.Modules.Clients;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A70: options of one builder export. PdfMode "summary" = management summary only; "detailed" adds the paginated case table.</summary>
public sealed record BuilderExportOptions(string? FileName = null, bool IncludeSummary = true, bool IncludeFilters = true, bool IncludeMetadata = true, string? PdfMode = "summary");

/// <summary>What a file is about: shown in its header block, Applied Filters and Metadata sheets.</summary>
public sealed record BuilderFileContext(string ReportName, string GeneratedBy, DateTimeOffset GeneratedAt, DateTimeOffset Cutoff, TimeZoneInfo Zone, Guid ExportId, int RetentionDays);

/// <summary>A70: the Excel and PDF files of the Cases Report Builder.</summary>
public static class CasesExportFiles
{
    private static readonly string[] PriorityOrder = ["Critical", "High", "Normal", "Low"];
    private static readonly string[] StatusOrder = ["New", "Triaged", "InProgress", "PendingValidation", "Closed", "Cancelled"];

    public static string SafeFileName(string? requested, string fallback)
    {
        var name = new string((requested ?? "").Trim().Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or ' ' or '.' ? ch : '-').ToArray()).Trim(' ', '.', '-');
        if (name.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase) || name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)) name = name[..name.LastIndexOf('.')];
        if (name.Length > 100) name = name[..100];
        return name.Length == 0 ? fallback : name;
    }

    private static object? Cell(CaseField f, object? v, TimeZoneInfo zone, Func<CaseField, object?, object?> label) => label(f, v) switch
    {
        null => null,
        // Real Excel dates in the report's zone (the zone is stated in the header and on the Metadata sheet).
        DateTimeOffset d => TimeZoneInfo.ConvertTime(d, zone).DateTime,
        Enum e => e.ToString(),
        var x => x
    };

    private static string Text(CaseField f, object? v, TimeZoneInfo zone, Func<CaseField, object?, object?> label) => label(f, v) switch
    {
        null => "",
        DateTimeOffset d => TimeZoneInfo.ConvertTime(d, zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        bool b => b ? "Yes" : "No",
        var x => Convert.ToString(x, CultureInfo.InvariantCulture) ?? ""
    };

    private static IEnumerable<(string Key, int Count)> Ordered(Dictionary<string, int> counts, string[] order) =>
        order.Where(counts.ContainsKey).Select(k => (k, counts[k])).Concat(counts.Where(c => !order.Contains(c.Key)).OrderByDescending(c => c.Value).Select(c => (c.Key, c.Value)));

    /// <summary>A71: the one client every client-related row belongs to (internal rows are ignored); null when the file covers several or none.</summary>
    private static long? SingleClient(CasesPage page)
    {
        var ids = page.Rows.Where(r => r.ClientId is not null).Select(r => r.ClientId!.Value).Distinct().Take(2).ToList();
        return ids.Count == 1 ? ids[0] : null;
    }

    /// <summary>A71: logos as PDF images (PNG and JPEG; WebP has no PDF form here and is left out).</summary>
    private static Dictionary<long, PdfImage> PdfLogos(IReadOnlyDictionary<long, LogoFile>? logos) =>
        (logos ?? new Dictionary<long, LogoFile>()).Select(l => (l.Key, Img: PdfImage.From(l.Value.Data, l.Value.ContentType))).Where(x => x.Img is not null).ToDictionary(x => x.Key, x => x.Img!);

    private static string Pct(int n, int total) => total == 0 ? "0 %" : $"{Math.Round(100.0 * n / total, 1).ToString(CultureInfo.InvariantCulture)} %";

    public static byte[] Xlsx(ValidCases v, CasesPage page, BuilderExportOptions o, BuilderFileContext x, Func<CaseField, object?, object?> label, IReadOnlyDictionary<long, LogoFile>? logos = null)
    {
        // A71: a report about one client shows that client's logo (PNG or JPEG) on its Summary or Metadata sheet; the data sheet stays plain.
        XlsxImage[]? logo = null;
        if (SingleClient(page) is { } only && logos?.GetValueOrDefault(only) is { } lf && PdfImage.From(lf.Data, lf.ContentType) is { } dims)
        {
            var scale = Math.Min(1.0, Math.Min(140.0 / dims.Width, 56.0 / dims.Height));
            var name = page.Rows.First(r => r.ClientId == only).ClientName;
            logo = [new XlsxImage(4, 0, lf.Data, lf.ContentType == "image/png" ? "png" : "jpeg", Math.Max(1, (int)(dims.Width * scale)), Math.Max(1, (int)(dims.Height * scale)), $"Logo of {name}")];
        }
        var sheets = new List<XlsxSheet>
        {
            new("Cases Data", v.Columns.Select(c => c.Label).ToList(), page.Rows.Select(r => (IReadOnlyList<object?>)v.Columns.Select(c => Cell(c, CasesFields.Value(r, c), x.Zone, label)).ToList()))
        };
        if (o.IncludeSummary)
        {
            var lines = new List<IReadOnlyList<object?>> { new object?[] { "Total cases", page.Total, "" }, Array.Empty<object?>() };
            void Block(string title, IEnumerable<(string Key, int Count)> rows, Func<string, string>? name = null)
            {
                lines.Add([title, "Cases", "Share"]);
                lines.AddRange(rows.Select(r => (IReadOnlyList<object?>)new object?[] { name?.Invoke(r.Key) ?? (r.Key.Length == 0 ? "(none)" : r.Key), r.Count, Pct(r.Count, page.Total) }));
                lines.Add([]);
            }
            Block("By status", Ordered(page.ByStatus, StatusOrder), k => Convert.ToString(label(CasesFields.ByKey["status"], Enum.TryParse<CaseStatus>(k, out var s) ? s : k)) ?? k);
            Block("By priority", Ordered(page.ByPriority, PriorityOrder));
            Block("By SLA status", Ordered(page.BySla, CasesFields.SlaStatuses));
            if (page.Groups is { } g && v.GroupBy is { } gf) Block($"By {gf.Label.ToLowerInvariant()}", g, k => k.Length == 0 ? "(none)" : k);
            sheets.Add(new XlsxSheet("Summary", ["Measure", "Value", "Definition"], lines, logo));
            logo = null;
        }
        if (o.IncludeFilters)
        {
            var rows = v.Summary.Select(s => (IReadOnlyList<object?>)new object?[] { s.Label, s.Value }).ToList();
            if (rows.Count == 0) rows.Add(["Filters", "None: every case you are authorized to see"]);
            rows.Add([]);
            rows.Add(["Sort", v.Sort.Count == 0 ? "Case ID" : string.Join(", ", v.Sort.Select(s => $"{s.Field.Label} {(s.Desc ? "descending" : "ascending")}"))]);
            rows.Add(["Group by", v.GroupBy?.Label ?? "None"]);
            sheets.Add(new XlsxSheet("Applied Filters", ["Filter", "Value"], rows));
        }
        if (o.IncludeMetadata)
        {
            var meta = new List<IReadOnlyList<object?>>
            {
                new object?[] { "Report", x.ReportName }, new object?[] { "Generated", Csv.Format(x.GeneratedAt, x.Zone) }, new object?[] { "Data as of (cutoff)", Csv.Format(x.Cutoff, x.Zone) },
                new object?[] { "Time zone", x.Zone.Id }, new object?[] { "Generated by", x.GeneratedBy }, new object?[] { "Rows", page.Rows.Count },
                new object?[] { "Export reference", x.ExportId.ToString() }, new object?[] { "Kept for download", $"{x.RetentionDays} days" },
                new object?[] { "Access", "Only rows the requester was authorized to see at generation time." }, Array.Empty<object?>()
            };
            meta.AddRange(v.Columns.Select(c => (IReadOnlyList<object?>)new object?[] { c.Label, c.Description }));
            sheets.Add(new XlsxSheet("Metadata", ["Item", "Value"], meta, logo));
        }
        return Common.Xlsx.Build(sheets);
    }

    private const string Navy = "#0C1B37", Blue = "#007DB3", Grey = "#5A6670", Light = "#EEF3F7", Line = "#C8D1D8";
    private static readonly Dictionary<string, string> SlaColor = new()
    {
        ["Breached"] = "#B00020", ["AtRisk"] = "#E6932B", ["OnTrack"] = "#007DB3", ["Met"] = "#5DAE95", ["NotMeasurable"] = "#A4ABB0", ["NotApplicable"] = "#D5DADE"
    };
    private static readonly Dictionary<string, string> PriorityColor = new() { ["Critical"] = "#B00020", ["High"] = "#E6932B", ["Normal"] = "#007DB3", ["Low"] = "#A4ABB0" };

    /// <summary>Management PDF: branded summary page (counts, status, priority and SLA visuals, filters) and, in detailed mode, the case table.</summary>
    public static byte[] Pdf(ValidCases v, CasesPage page, BuilderExportOptions o, BuilderFileContext x, Func<CaseField, object?, object?> label, IReadOnlyDictionary<long, LogoFile>? logos = null)
    {
        var pdf = new PdfDocument();
        const double M = 36, W = PdfDocument.Width - 2 * M;
        // A71: client logos — the report's client in the page header (one-client reports) and beside the client in the detailed table.
        var images = PdfLogos(logos);
        var headerLogo = SingleClient(page) is { } only ? images.GetValueOrDefault(only) : null;
        void Header(string sub)
        {
            pdf.NewPage();
            pdf.Rect(0, 0, PdfDocument.Width, 54, Navy);
            pdf.Text(M, 33, "VITRONIC", 16, true, "#FFFFFF");
            var tx = M + 110;
            if (headerLogo is not null)
            {
                pdf.Rect(tx, 7, 40, 40, "#FFFFFF").Image(tx + 3, 10, 34, 34, headerLogo);   // white tile: logos are drawn for light backgrounds
                tx += 50;
            }
            pdf.Text(tx, 26, PdfDocument.Fit(x.ReportName, 530 - tx, 12, true), 12, true, "#FFFFFF");
            pdf.Text(tx, 42, sub, 8.5, false, "#C8D7E6");
            pdf.TextRight(PdfDocument.Width - M, 26, $"Generated {Csv.Format(x.GeneratedAt, x.Zone)}", 8.5, false, "#FFFFFF");
            pdf.TextRight(PdfDocument.Width - M, 42, $"by {x.GeneratedBy} · data as of {Csv.Format(x.Cutoff, x.Zone)}", 8.5, false, "#C8D7E6");
        }

        Header("TIO Operations Hub · Cases report · Management summary");
        var total = page.Total;
        int Sum(Dictionary<string, int> d, params string[] keys) => keys.Sum(k => d.GetValueOrDefault(k));
        var open = Sum(page.ByStatus, "New", "Triaged", "InProgress", "PendingValidation");
        var tiles = new (string Label, string Value, string Note)[]
        {
            ("Total cases", total.ToString("N0", CultureInfo.InvariantCulture), "matching the filters"),
            ("Open", open.ToString("N0", CultureInfo.InvariantCulture), "not closed or cancelled"),
            ("In progress", Sum(page.ByStatus, "InProgress").ToString("N0", CultureInfo.InvariantCulture), "status In progress"),
            ("Closed", Sum(page.ByStatus, "Closed").ToString("N0", CultureInfo.InvariantCulture), "status Closed"),
            ("SLA breached", Sum(page.BySla, "Breached").ToString("N0", CultureInfo.InvariantCulture), "contractual response or resolution")
        };
        var tw = (W - 4 * 10) / 5;
        for (var i = 0; i < tiles.Length; i++)
        {
            var tx = M + i * (tw + 10);
            pdf.Rect(tx, 72, tw, 62, Light).Rect(tx, 72, 3, 62, Blue);
            pdf.Text(tx + 12, 90, tiles[i].Label, 8.5, false, Grey).Text(tx + 12, 115, tiles[i].Value, 20, true, Navy).Text(tx + 12, 128, tiles[i].Note, 7, false, Grey);
        }

        // Three panels: by priority (columns), SLA status and status (labelled horizontal bars; never colour alone).
        double py = 152, ph = 190, pw = (W - 20) / 3;
        void Panel(int i, string title) { var px = M + i * (pw + 10); pdf.Rect(px, py, pw, ph, "#FFFFFF").Line(px, py, px + pw, py, Line).Line(px, py + ph, px + pw, py + ph, Line); pdf.Text(px, py + 16, title, 10, true, Navy); }
        Panel(0, "Cases by priority");
        var pri = PriorityOrder.Select(k => (k, page.ByPriority.GetValueOrDefault(k))).ToList();
        var maxP = Math.Max(1, pri.Max(p => p.Item2));
        var bw = (pw - 40) / pri.Count;
        for (var i = 0; i < pri.Count; i++)
        {
            var h = 120.0 * pri[i].Item2 / maxP;
            var bx = M + 10 + i * bw;
            pdf.Rect(bx + 8, py + 160 - h, bw - 16, Math.Max(h, 0.5), PriorityColor[pri[i].k]);
            pdf.Text(bx + 8, py + 154 - h, pri[i].Item2.ToString("N0", CultureInfo.InvariantCulture), 8, true, Navy);
            pdf.Text(bx + 8, py + 174, pri[i].k, 8, false, Grey);
        }
        void Bars(int i, IEnumerable<(string Key, int Count)> rows, Func<string, string> name, Func<string, string> color)
        {
            var px = M + i * (pw + 10);
            var y = py + 36;
            foreach (var (key, count) in rows.Take(7))
            {
                pdf.Text(px, y, PdfDocument.Fit(name(key), 92, 8), 8, false, "#1A1A1A");
                var len = (pw - 180) * count / Math.Max(1, total);
                pdf.Rect(px + 96, y - 8, pw - 180, 9, "#EEF0F2").Rect(px + 96, y - 8, Math.Max(len, 0.5), 9, color(key));
                pdf.TextRight(px + pw, y, $"{count.ToString("N0", CultureInfo.InvariantCulture)} ({Pct(count, total)})", 8, false, Grey);
                y += 20;
            }
        }
        Panel(1, "SLA status");
        Bars(1, Ordered(page.BySla, CasesFields.SlaStatuses), k => k switch { "AtRisk" => "At risk", "OnTrack" => "On track", "NotMeasurable" => "Not measurable", "NotApplicable" => "No SLA", _ => k }, k => SlaColor.GetValueOrDefault(k, Blue));
        Panel(2, "Cases by status");
        Bars(2, Ordered(page.ByStatus, StatusOrder), k => Convert.ToString(label(CasesFields.ByKey["status"], Enum.TryParse<CaseStatus>(k, out var s) ? s : k)) ?? k, _ => Blue);

        // Applied filters.
        var fy = py + ph + 22;
        pdf.Text(M, fy, "Applied filters", 10, true, Navy);
        fy += 14;
        List<(string Label, string Value)> filters = v.Summary.Count == 0 ? [("Filters", "None: every case the requester is authorized to see")] : [.. v.Summary];
        foreach (var (l, val) in filters.Take(8))
        {
            pdf.Text(M, fy, l, 8, true, Grey).Text(M + 110, fy, PdfDocument.Fit(val, W - 110, 8), 8);
            fy += 12;
        }
        if (filters.Count > 8) { pdf.Text(M, fy, $"... {filters.Count - 8} more: see the Excel export's Applied Filters sheet.", 8, false, Grey); fy += 12; }
        pdf.Text(M, PdfDocument.Height - 22, $"Contains only cases the requester was authorized to see · export reference {x.ExportId} · times in {x.Zone.Id}", 7, false, Grey);

        if (o.PdfMode == "detailed")
        {
            // Paginated table; every row is included (the export is refused beforehand when it exceeds the PDF row limit).
            var cols = v.Columns;
            var weights = cols.Select(c => c.Key switch { "title" or "nextAction" or "clientName" => 3.0, "caseId" or "priority" or "status" or "overdue" or "waiting" or "ageDays" or "reopenCount" => 1.0, _ => 1.6 }).ToArray();
            var scale = W / weights.Sum();
            var widths = weights.Select(w => w * scale).ToArray();
            const double rowH = 15, top = 84;
            var perPage = (int)((PdfDocument.Height - top - 40) / rowH);
            var pages = Math.Max(1, (int)Math.Ceiling(page.Rows.Count / (double)perPage));
            for (var p = 0; p < pages; p++)
            {
                Header($"TIO Operations Hub · Cases report · Details, page {p + 1} of {pages}");
                pdf.Rect(M, top - 14, W, rowH + 2, Light);
                var cx = M;
                for (var c = 0; c < cols.Count; c++) { pdf.Text(cx + 3, top - 2, PdfDocument.Fit(cols[c].Label, widths[c] - 6, 7.5, true), 7.5, true, Navy); cx += widths[c]; }
                var y = top + rowH;
                foreach (var r in page.Rows.Skip(p * perPage).Take(perPage))
                {
                    cx = M;
                    for (var c = 0; c < cols.Count; c++)
                    {
                        var pad = 3.0;
                        if (cols[c].Key is "clientCode" or "clientName" && r.ClientId is { } rc && images.TryGetValue(rc, out var li))
                        {
                            pdf.Image(cx + 3, y - 11, 11, 11, li);
                            pad = 17;
                        }
                        pdf.Text(cx + pad, y - 2, PdfDocument.Fit(Text(cols[c], CasesFields.Value(r, cols[c]), x.Zone, label), widths[c] - pad - 3, 7.5), 7.5);
                        cx += widths[c];
                    }
                    pdf.Line(M, y + 3, M + W, y + 3, "#E3E7EA", 0.4);
                    y += rowH;
                }
                pdf.Text(M, PdfDocument.Height - 22, $"Rows {p * perPage + 1}–{Math.Min(page.Rows.Count, (p + 1) * perPage)} of {page.Rows.Count:N0} · long values are shortened on paper; the Excel export has them in full.", 7, false, Grey);
            }
        }
        return pdf.Build(x.ReportName);
    }
}
