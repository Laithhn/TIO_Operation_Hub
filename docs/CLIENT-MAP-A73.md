# Client Map redesign (A73, 29 Oct 2026)

The Client Map (`/map`) is a dark, map-first geographic operations view: where the authorized clients are, and per country their
servers, open cases, overdue work and active contracts, leading to the records. It is not a second executive dashboard; the
Operations Command Center (`/`) is unchanged.

## Layout

| Area | Content |
|---|---|
| Header | The hub's navigation bar and footer, unchanged. The page uses the full width (no section menu); its toolbar links to the Operations Command Center. |
| Toolbar | Title, client and country totals, data time; **map layers** Clients · Servers · Open cases · Overdue · Contracts (each with its total; the active one in electric blue); filters **Client**, **Region**, **Team**, **Product**; reset and refresh. On tablets the filters fold into a *Filters* button. |
| Country explorer (left) | Tabs *Countries* / *Clients*; search (country, ISO code or client alias); sort by the layer's figure or by name; each country with its ISO code, client aliases, the figure, a proportional bar and a red dot when the layer's alert applies; a note for clients without a country. |
| Map (centre) | The existing Leaflet map in a dark variant: darkened base tiles from the configured tile server, country shading in a dark-to-electric blue ramp, numbered country badges, client markers when a country is opened, hover tooltips, zoom, fit, world view, full screen, base-map and overlay switch, scale. Legend at the bottom for the selected layer ("0 recorded" for countries with clients but nothing of that kind; countries without authorized clients are not coloured). |
| Country details (right) | ISO code, name and the country's figures; tabs **Clients** (logo, alias and name, project manager, products, status from the recorded figures, open link), **Servers**, **Cases** (open), **Contracts** (active), each from the existing list API filtered by the country, with *View all …* links to the full lists; *View all clients in …* and *Operations Command Center for …*. Close restores the wider map. Without a selection: "Select a country". |

Below 1440 px the side panels are narrower and the countries panel can be hidden; below 1024 px both panels become drawers over the map.

## Data and rules

- One data source for the whole page: the authorized per-client rows of `GET /dashboard/insights` (client, team and product filters applied by the server). Region, search and sort are applied in the browser to the same rows, so the toolbar totals, country list, map, legend and details always agree.
- A country excluded by a filter is deselected. The team filter narrows open and overdue case counts only (clients, servers and contracts have no team), and the page says so.
- **Region** is the UN M49 region of the client's country (Africa, Americas, Europe, Western Asia / Middle East, other Asia, Oceania; `ui/countryInfo.ts`, covering every country in `Common/Countries.cs`).
- **Client status** uses the rule of the map markers since A39: overdue cases or commitments → *n overdue*; a renewal decision due → *n renewal due*; open cases → *n open cases*; otherwise *Nothing overdue*. No other status is invented.
- **Team** per client is not shown: clients have no responsible team (owner decision A21, always the TIO team). The project manager is shown instead.

## API (additions only)

- `GET /dashboard/insights`: each map client also has `products` (product codes of its installations) and `projectManager`.
- `GET /assets`: optional `country` (the client's country), as the case, commitment, contract and environment lists already had; the asset list page shows a notice with *Show every country* when it is set.

## Not done

- **Flags:** no flag images are bundled, and Windows does not draw emoji flags, so countries show their ISO code in a small badge instead.
- The base map's darkness comes from a CSS filter on the configured tile server's tiles; without a tile server the map shows only the country shapes on the dark background.
- The page's dark theme is scoped to the Client Map; the rest of the hub keeps its light theme.
