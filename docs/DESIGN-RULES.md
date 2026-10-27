> **Superseded for the look (2.34, DECISIONS A68):** the frontend now follows VtWebGuiFramework 3.6.1. Tokens, frame, controls and icons are described in [FRONTEND-ARCHITECTURE.md](FRONTEND-ARCHITECTURE.md). The rules below for empty states, validation messages, status text labels and chart semantics still apply; the colours and geometry below are historical.

# Design rules derived from the reference screenshot

Reference: VITS "Wanted Plate Management" screen, captured at about 2000 × 722 px (desktop, 1:1 CSS pixels assumed).
The screenshot governs look and feel only; none of its business content (plates, ANPR menus) is carried over.

## Observed layout

| Area | Observation | Token / rule |
|---|---|---|
| Top bar | Full-width dark navy bar, ~34 px high. Logo mark + bold white "VITRONIC" word mark at left. Section tabs centred-left, white 13 px regular, ~29 px horizontal spacing. Active tab: full-height light grey (#f2f3f5) block with navy text. Right side: language select with white underline + chevron, user icon, sign-out icon (outline, white). | `--navy`, `--hdr: 34px` |
| Left sidebar | ~130 px wide, very light grey surface (lighter than the canvas), thin right border. Product title centred, bold, 2 lines, ~10.5 px. Items: 16 px outline icon (muted grey) + label 11–11.5 px regular, wraps to two lines. Nested items: indented under the parent with a thin vertical guide line, no icons. Active item: darker label and a solid navy dot that sits on the sidebar's right edge. A small square chevron button pinned at the bottom right collapses the menu. | `--side-w: 136px`, `--strip` |
| Page title strip | Same light surface as sidebar, ~44 px high, title bold ~17 px navy at left; primary action button at right. | `.page-head` |
| Canvas | Flat mid-light grey (#e8e9eb) behind white panels. Panels have no radius, no visible shadow. | `--bg` |
| Data table | White panel. Header row: bold 11.5 px dark navy text, left aligned, generous ~200 px columns, header bottom border. A filter row under the header holds a bordered search input ("Search by Plate"). Body rows ~23 px, 10.5–11 px text, thin light separators, cell values centred in the reference. | `.grid`, `--row-h: 24px` |
| Pagination | Separate white strip under the table: "Records :- 3 OF 3" left (muted); right: "Items per page:" + bordered select, "Prev", "1 - 3 OF 3", "Next" in muted grey text buttons. | `.pager` |
| Status bar | Navy bar fixed at bottom, ~36 px: "© Vitronic  <product> <version>" left, "User : <account>" centred, icons + "Server Online" right. | `--status: 34px` |
| Buttons | Primary: navy fill, white 11–12 px text, square corners (≤2 px), ~22–24 px high, leading "+" icon. | `.btn-primary` |
| Typography | Humanist sans matching Open Sans (letterforms of "g", "a", "R" and the VITS product). | Open Sans (OFL, self-hosted via @fontsource) |

## Colours (estimated; the screenshot could not be pixel-sampled from a file, values are visual matches)

| Token | Value | Use |
|---|---|---|
| `--navy` | `#0c1b37` | top bar, status bar, primary button, active dot, titles |
| `--navy-2` | `#1d2e52` | hover on navy |
| `--bg` | `#e8e9eb` | canvas |
| `--strip` | `#f5f5f6` | sidebar, title strip, active tab |
| `--surface` | `#ffffff` | panels, tables |
| `--line` | `#e2e4e8` | row separators |
| `--line-strong` | `#c8ccd3` | input borders, header rule |
| `--fg` | `#14223f` | body text |
| `--fg-2` | `#3e495d` | secondary text, side labels |
| `--muted` | `#6b7487` | pager text, hints (darkened from the reference's light grey for 4.5:1 contrast) |

Status colours (not visible in the reference; extended consistently): good `#16794a`, warn `#8a5a00`, bad `#b4232f`, info = navy on `#e5e9f1`.
Every status badge carries a text label and a dot, so meaning never depends on colour alone.

## Extensions of the visual language (states the screenshot does not show)

- Hover: rows `#f6f8fb`; nav items darken one step; buttons one step darker.
- Focus: 2 px `#2563c9` outline, 2 px offset, on every interactive element.
- Disabled: 45 % opacity, `not-allowed` cursor, with a tooltip or hint explaining why.
- Loading: inline spinner + "Loading…" text in the table body; skeleton not used.
- Empty states (UX-02), always distinct text: **No records entered**, **No matching records**, **Unknown**, **Access restricted**.
- Validation: red border + message under the field; summary notice at the top of the form; values kept.
- Tablet (< 900 px): sidebar becomes an off-canvas drawer opened from a menu button; tabs scroll horizontally; tables scroll horizontally inside their panel.

## Deviations, deliberately

- Body text is 12.5–13 px instead of the reference's ~10.5 px rows for readability on 1366–1920 px screens; proportions kept.
- Table text is left-aligned (numbers right-aligned) instead of centred, for scanability of long names; header styling kept.
- Muted grey darkened for contrast (WCAG AA).
- Executive overview only (A51, owner request for a modern dashboard): cards have an 8 px radius and a soft shadow, pill-shaped section tabs and attention chips, icon tiles on KPI cards and section headings. Colours, type and the rest of the application keep the flat reference style.

## Implementation

- Tokens: `src/web/src/styles/tokens.css` (colours, type scale, header/status/sidebar/row geometry).
- Shared components: `src/web/src/styles/app.css` and `src/web/src/ui/` — `Shell` (top bar, sectioned sidebar with nested items, status bar, search palette), `kit.tsx` (`PageHead`, `Panel`, `DataTable` with optional filter row, `Pager`, form fields, `Dialog`, badges, `StateMessage`, `Tabs`, `DL`), `pickers.tsx` (`UserPicker`, `ActionDialog` with explicit confirmation, `ArchiveDialog`), `Icon.tsx` (outline icons drawn for this app; no third-party icon set or logo copied).

## Visual verification (rendered, 1600 × 900, Microsoft Edge via Playwright)

Screenshots: `tests/e2e/test-results/visual-clients-1600.png`, `visual-dashboard-1600.png`, `visual-environment-1600.png`, `visual-cases-tablet.png` (regenerated by every e2e run).

| Element | Reference | Rendered | Result |
|---|---|---|---|
| Top bar | Navy, ~34 px, white word mark left, centred white tabs, light active tab | Same; computed `rgb(12,27,55)` bar and `rgb(245,245,246)` active tab asserted in e2e | Match |
| Right header controls | Language select with underline, user and sign-out icons | Dev-user select (development only) with underline, search and user icons | Match in style; sign-out not applicable to Windows sign-in |
| Sidebar | Light strip, centred bold product title, outline icons, nested items with guide line, navy dot on the right edge for the active item, collapse chevron at bottom | Same | Match (width 168 px vs ~130 px in the reference, to fit longer labels) |
| Title strip | Bold navy title left, primary navy “+ New …” button right | Same | Match |
| Table | White panel, bold header row, filter row with bordered search input, thin row separators | Same | Match; rows slightly taller (12–12.5 px text instead of ~10.5 px) for readability; values left-aligned instead of centred |
| Pager | Separate white strip: “Records :- n OF n”, “Items per page: [15]”, Prev, “1 - n OF n”, Next | Same wording and layout | Match |
| Status bar | Navy, © + product + version left, “User : …” centred, icons + “Server Online” right | Same, plus environment badge and display time zone | Match |
| Tablet (< 900 px) | — | Sidebar becomes an off-canvas drawer; tabs scroll horizontally | Extension |

Known differences, deliberate: larger base font for readability (WCAG), muted grey darkened for contrast, left-aligned cells, wider sidebar. Colours are visual estimates because the screenshot was supplied as an image in chat, not as a file that could be pixel-sampled.

## Dashboard charts and country map (added 19 Oct 2026)

Components: `src/web/src/ui/charts.tsx` (`HBars`, `Columns`, `TrendLines`, `CountryMap`, `VizPanel`), styles under “Charts” in `app.css`.

| Rule | Applied as |
|---|---|
| Colour by job | Magnitude (status, age, deadlines, data quality, coverage) = one blue `#2a78d6`; priority (ordinal) = blue ramp `#86b6ef → #0d366b`; trend = categorical slots 1–2 (blue `#2a78d6`, orange `#eb6834`) with legend + direct end labels; reported condition = reserved status colours (good `#0ca30c`, warning `#fab219`, critical `#d03b3b`, neutral gray) with a glyph and text label; overdue commitments = critical colour beside its text label. |
| Validated | Trend pair on the white panel: all checks pass (CVD ΔE 24.7, normal-vision ΔE 33.6, ≥ 3:1). Map/priority ramp (`--ordinal`): monotone, single hue, light end 2.1:1. |
| Marks | Bars ≤ 24 px with 4 px rounded data end, square at the baseline; 2 px lines; 8 px end markers with a 2 px white ring; 1 px solid recessive gridlines; values in text colour, never series colour. |
| Interaction | Hover/focus tooltip on every bar, column, map country and the trend crosshair; bars and columns are keyboard links to the same filtered list (counts equal their drilldowns — tested); every chart has a “Table view” toggle. |
| Map (superseded 19 Oct, see below) | Choropleth of clients per country (Natural Earth 1:50m via `world-atlas`, public domain; `d3-geo`, `topojson-client`, ISC) bundled as a lazy chunk — no tile server or internet access needed. Count badge on each client country; names only where they cannot collide (tooltip and the adjacent country table carry them). Clicking a country filters the whole dashboard. Clients with country Unknown are listed under the map, never placed. Free-text country values are mapped through an alias list (UAE, KSA, …); unrecognized names are listed under the map. |

## Executive overview (19 Oct 2026)

| Element | Rule |
|---|---|
| KPI band | Six stat tiles: Clients (hero, navy, 48 px) and Open cases / Overdue cases / Open commitments / Overdue commitments / Environments needing attention (34 px). A meter (same track, blue; critical red or warning amber with a ▲/● glyph and text) shows the part of the whole stated beneath it. Every tile opens the list whose total equals its number. |
| Map | OpenStreetMap base (Leaflet 1.9.4, BSD-2) with client countries as a blue ordinal choropleth plus white count badges; a red dot on the badge marks overdue work (legend + tooltip + ranking text carry it too). Badges are keyboard buttons with full names; Enter/click filters the overview. Attribution always visible. Falls back to the vector map when no tile URL is configured. |
| Countries ranking | Replaces the country table: bar = clients per country, count, and an overdue badge or open-case count; doubles as the map's text alternative. |
| Charts | Grouped in two labelled bands (Cases; Commitments and environments). Part-to-whole bars (≤ 6 segments, 2 px gaps, labelled legend with counts and %) for priority and reported condition; bars/columns/lines as before. Every chart keeps its Table view. |
| Action list | Not on the overview; separate page with tabs, export and the same filters. |
| Contract renewals | Columns: expired = critical red, renewal due = warning amber, end date unknown = neutral gray, current = blue, draft = lightest ramp step; every column labelled and linked to the matching contract list. Badges on contract pages use the same words. |

Fixed 19 Oct: the column chart's `.cols` class collided with the two-column page layout `.cols` (Client 360, detail pages); the chart now uses `.colchart`.
