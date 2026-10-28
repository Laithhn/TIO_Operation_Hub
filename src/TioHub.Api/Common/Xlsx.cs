using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;

namespace TioHub.Api.Common;

/// <summary>One worksheet: a name, an optional bold header row and the rows (strings, numbers, booleans, local DateTime values; everything else as text).</summary>
public sealed record XlsxSheet(string Name, IReadOnlyList<string>? Header, IEnumerable<IReadOnlyList<object?>> Rows);

/// <summary>
/// A62: minimal Office Open XML workbook writer (no third-party package). Text is written as inline strings, so a cell is never
/// evaluated as a formula; numbers stay numeric; the header row is bold, frozen and filterable.
/// </summary>
public static class Xlsx
{
    public static byte[] Build(IReadOnlyList<XlsxSheet> sheets)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            Entry(zip, "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
                string.Concat(sheets.Select((_, i) => $"<Override PartName=\"/xl/worksheets/sheet{i + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>")) +
                "</Types>");
            Entry(zip, "_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            Entry(zip, "xl/workbook.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>" +
                string.Concat(sheets.Select((s, i) => $"<sheet name=\"{Esc(SheetName(s.Name, i))}\" sheetId=\"{i + 1}\" r:id=\"rId{i + 1}\"/>")) + "</sheets></workbook>");
            Entry(zip, "xl/_rels/workbook.xml.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                string.Concat(sheets.Select((_, i) => $"<Relationship Id=\"rId{i + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{i + 1}.xml\"/>")) +
                $"<Relationship Id=\"rId{sheets.Count + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
            Entry(zip, "xl/styles.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
                "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"yyyy-mm-dd hh:mm\"/></numFmts>" +
                "<fonts count=\"2\"><font><sz val=\"10\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"10\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/></font></fonts>" +
                "<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF0C1B37\"/></patternFill></fill></fills>" +
                "<borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf/></cellStyleXfs>" +
                // Style 2 (A70): local date and time cells, stored as real Excel dates so they sort and filter as dates.
                "<cellXfs count=\"3\"><xf fontId=\"0\" fillId=\"0\"/><xf fontId=\"1\" fillId=\"2\" applyFont=\"1\" applyFill=\"1\"/><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" applyNumberFormat=\"1\"/></cellXfs></styleSheet>");
            for (var i = 0; i < sheets.Count; i++) Entry(zip, $"xl/worksheets/sheet{i + 1}.xml", Sheet(sheets[i]));
        }
        return ms.ToArray();
    }

    private static string Sheet(XlsxSheet s)
    {
        var rows = new List<IReadOnlyList<object?>>();
        if (s.Header is not null) rows.Add(s.Header.Cast<object?>().ToList());
        rows.AddRange(s.Rows);
        var cols = rows.Count == 0 ? 0 : rows.Max(r => r.Count);
        var widths = new double[cols];
        foreach (var r in rows.Take(500))
            for (var c = 0; c < r.Count; c++) widths[c] = Math.Max(widths[c], Math.Min(60, Text(r[c]).Length + 2));
        var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
        if (s.Header is not null) sb.Append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>");
        if (cols > 0) sb.Append("<cols>").Append(string.Concat(widths.Select((w, i) => $"<col min=\"{i + 1}\" max=\"{i + 1}\" width=\"{Math.Max(8, w).ToString(CultureInfo.InvariantCulture)}\" customWidth=\"1\"/>"))).Append("</cols>");
        sb.Append("<sheetData>");
        for (var r = 0; r < rows.Count; r++)
        {
            sb.Append($"<row r=\"{r + 1}\">");
            var header = s.Header is not null && r == 0;
            for (var c = 0; c < rows[r].Count; c++)
            {
                var v = rows[r][c];
                var at = $"{Column(c)}{r + 1}";
                var style = header ? " s=\"1\"" : "";
                switch (v)
                {
                    case null: break;
                    case int or long or decimal or double or float:
                        sb.Append($"<c r=\"{at}\"{style}><v>{Convert.ToString(v, CultureInfo.InvariantCulture)}</v></c>"); break;
                    case DateTime dt:
                        sb.Append($"<c r=\"{at}\" s=\"{(header ? 1 : 2)}\"><v>{dt.ToOADate().ToString(CultureInfo.InvariantCulture)}</v></c>"); break;
                    case bool b:
                        sb.Append($"<c r=\"{at}\"{style} t=\"inlineStr\"><is><t>{(b ? "Yes" : "No")}</t></is></c>"); break;
                    default:
                        sb.Append($"<c r=\"{at}\"{style} t=\"inlineStr\"><is><t xml:space=\"preserve\">{Esc(Text(v))}</t></is></c>"); break;
                }
            }
            sb.Append("</row>");
        }
        sb.Append("</sheetData>");
        if (s.Header is not null && cols > 0 && rows.Count > 1) sb.Append($"<autoFilter ref=\"A1:{Column(cols - 1)}{rows.Count}\"/>");
        sb.Append("</worksheet>");
        return sb.ToString();
    }

    private static string Text(object? v) => v switch
    {
        null => "",
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime dt => dt.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        bool b => b ? "Yes" : "No",
        _ => Convert.ToString(v, CultureInfo.InvariantCulture) ?? ""
    };

    public static string Column(int index)
    {
        var s = "";
        for (var n = index + 1; n > 0; n = (n - 1) / 26) s = (char)('A' + (n - 1) % 26) + s;
        return s;
    }

    private static string SheetName(string name, int i)
    {
        var clean = new string(name.Where(ch => !"[]:*?/\\".Contains(ch)).ToArray()).Trim();
        if (clean.Length == 0) clean = $"Sheet{i + 1}";
        return clean.Length > 31 ? clean[..31] : clean;
    }

    // XML 1.0 forbids most control characters; they are dropped rather than written.
    private static string Esc(string s) => SecurityElement.Escape(new string(s.Where(ch => ch is '\t' or '\n' or '\r' || ch >= ' ').ToArray())) ?? "";

    private static void Entry(ZipArchive zip, string name, string content)
    {
        var e = zip.CreateEntry(name, CompressionLevel.Optimal);
        using var w = new StreamWriter(e.Open(), new UTF8Encoding(false));
        w.Write(content);
    }
}
