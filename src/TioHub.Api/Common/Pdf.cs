using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace TioHub.Api.Common;

/// <summary>
/// A70: minimal PDF 1.4 writer (no third-party package) for management reports: A4 landscape pages, the built-in Helvetica fonts
/// (WinAnsi; characters outside it are written as "?"), text, filled rectangles and lines. Coordinates are points from the top-left
/// corner. Content streams are deflate-compressed. It is deliberately small: no images, no embedded fonts, no links.
/// </summary>
public sealed class PdfDocument
{
    public const double Width = 842, Height = 595;
    private readonly List<StringBuilder> _pages = [];
    private StringBuilder Page => _pages[^1];
    public int PageCount => _pages.Count;

    public PdfDocument NewPage() { _pages.Add(new StringBuilder()); return this; }

    private static string N(double v) => Math.Round(v, 2).ToString("0.##", CultureInfo.InvariantCulture);
    private static string Rgb(string hex) => $"{N(Convert.ToInt32(hex[1..3], 16) / 255.0)} {N(Convert.ToInt32(hex[3..5], 16) / 255.0)} {N(Convert.ToInt32(hex[5..7], 16) / 255.0)}";

    public PdfDocument Rect(double x, double y, double w, double h, string fill)
    {
        Page.Append($"{Rgb(fill)} rg {N(x)} {N(Height - y - h)} {N(w)} {N(h)} re f\n");
        return this;
    }

    public PdfDocument Line(double x1, double y1, double x2, double y2, string color, double width = 0.5)
    {
        Page.Append($"{Rgb(color)} RG {N(width)} w {N(x1)} {N(Height - y1)} m {N(x2)} {N(Height - y2)} l S\n");
        return this;
    }

    /// <summary>Text with its baseline at y.</summary>
    public PdfDocument Text(double x, double y, string text, double size = 9, bool bold = false, string color = "#1A1A1A")
    {
        Page.Append($"BT {Rgb(color)} rg /{(bold ? "F2" : "F1")} {N(size)} Tf {N(x)} {N(Height - y)} Td ({Escape(text)}) Tj ET\n");
        return this;
    }

    public PdfDocument TextRight(double right, double y, string text, double size = 9, bool bold = false, string color = "#1A1A1A") =>
        Text(right - Measure(text, size, bold), y, text, size, bold, color);

    /// <summary>Shortens text with an ellipsis to fit the width (visual only: the full value is in the Excel export).</summary>
    public static string Fit(string text, double width, double size, bool bold = false)
    {
        if (Measure(text, size, bold) <= width) return text;
        var s = text;
        while (s.Length > 0 && Measure(s + "...", size, bold) > width) s = s[..^1];
        return s.Length == 0 ? "" : s.TrimEnd() + "...";
    }

    // Helvetica advance widths (1/1000 em) for ASCII 32–126; other characters use an average width.
    private static readonly int[] Widths =
    [
        278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
        1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
        333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
    ];

    public static double Measure(string text, double size, bool bold = false) =>
        text.Sum(ch => ch is >= ' ' and <= '~' ? Widths[ch - 32] : 556) * size / 1000.0 * (bold ? 1.06 : 1.0);

    private static string Escape(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s)
        {
            var c = ch is >= ' ' and <= '~' || ch is >= ' ' and <= 'ÿ' ? ch : ch == '–' || ch == '—' ? '-' : ch == '…' ? '.' : '?';
            if (c is '(' or ')' or '\\') sb.Append('\\');
            if (c > '~') sb.Append('\\').Append(Convert.ToString(c, 8).PadLeft(3, '0'));
            else sb.Append(c);
        }
        return sb.ToString();
    }

    public byte[] Build(string title)
    {
        if (_pages.Count == 0) NewPage();
        var objects = new List<byte[]>();
        byte[] Ascii(string s) => Encoding.ASCII.GetBytes(s);
        // 1 catalog, 2 pages, 3 font, 4 bold font, 5 info, then (page, content) pairs.
        var kids = string.Join(" ", _pages.Select((_, i) => $"{6 + i * 2} 0 R"));
        objects.Add(Ascii("<< /Type /Catalog /Pages 2 0 R >>"));
        objects.Add(Ascii($"<< /Type /Pages /Kids [{kids}] /Count {_pages.Count} >>"));
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
        objects.Add(Ascii($"<< /Title ({Escape(title)}) /Producer (TIO Operations Hub) /CreationDate (D:{DateTime.UtcNow:yyyyMMddHHmmss}Z) >>"));
        for (var i = 0; i < _pages.Count; i++)
        {
            objects.Add(Ascii($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {N(Width)} {N(Height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {7 + i * 2} 0 R >>"));
            using var ms = new MemoryStream();
            using (var z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(Encoding.Latin1.GetBytes(_pages[i].ToString()));
            var data = ms.ToArray();
            objects.Add([.. Ascii($"<< /Length {data.Length} /Filter /FlateDecode >>\nstream\n"), .. data, .. Ascii("\nendstream")]);
        }
        using var pdf = new MemoryStream();
        void W(byte[] b) => pdf.Write(b);
        W(Encoding.Latin1.GetBytes("%PDF-1.4\n%âãÏÓ\n"));
        var offsets = new List<long>();
        for (var i = 0; i < objects.Count; i++)
        {
            offsets.Add(pdf.Position);
            W(Ascii($"{i + 1} 0 obj\n")); W(objects[i]); W(Ascii("\nendobj\n"));
        }
        var xref = pdf.Position;
        var sb = new StringBuilder($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var o in offsets) sb.Append(o.ToString("D10", CultureInfo.InvariantCulture)).Append(" 00000 n \n");
        sb.Append($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n{xref}\n%%EOF\n");
        W(Ascii(sb.ToString()));
        return pdf.ToArray();
    }
}
