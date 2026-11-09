# TIO Operations Hub 2.40.0

Production package release, 29 October 2026. This release redesigns the Client Map as a dark, map-first geographic operations
view (decision A73; details in `docs/CLIENT-MAP-A73.md`). The Operations Command Center is unchanged.

## New and changed

- **Client Map** (Dashboard → Client map, or *Client map* on the Operations Command Center):
  - **Layout:** the page uses the full width with a dark theme. Its toolbar shows the client and country totals and the data time, and links back to the Command Center.
  - **Map layers:** Clients, Servers, Open cases, Overdue and Contracts, each with its total. The selected layer is highlighted in blue.
  - **Filters:** Client, **Region** (new: Western Asia / Middle East, Africa, Europe, other Asia, Americas, Oceania), Team and Product, with reset and refresh.
  - **Country explorer:** countries or clients, with search, sorting by the layer's figure or by name, an ISO country code, the client aliases, a proportional bar and an alert dot.
  - **Map:** a dark base map with blue country shading and numbered country badges. A country opens on click, and the legend for the selected layer is at the bottom. Zoom, world view, full screen and base-map switching work as before.
  - **Country details:**
    - The country's figures and four tabs: **Clients** (logo, project manager, products, status from the recorded figures, open the client), **Servers**, **Open cases** and **Active contracts**.
    - Each tab has a link to the full list filtered by the country.
    - Further links: *View all clients in …* and *Operations Command Center for …*.
    - The panel can be closed to widen the map.
  - **Smaller screens:** on laptops the panels are narrower and the countries panel can be hidden. On tablets and phones the panels become drawers over the map and the filters fold into a *Filters* button.
  - **Consistent figures:** every figure comes from the same authorized data, so the list, map, legend and details always agree. A country excluded by a filter is deselected.
- **Asset list:** accepts a country (the client's country), used by the map's *View all servers* link; a notice shows the filter with *Show every country*.

## Database and deployment

- **No database change** (no new migration). The `database/01-schema.sql` script is unchanged since 2.39.0; running it again is harmless.
- **No new settings.**
- Deploy the application files as usual; users may need a hard refresh (Ctrl+F5) the first time.

## API (additions only; existing calls unchanged)

- `GET /api/v1/dashboard/insights`: each map client also carries `products` (product codes) and `projectManager`.
- `GET /api/v1/assets`: optional `country`.

## Known limitations

- Countries show an ISO code badge instead of a flag: no flag images are bundled, and Windows does not draw emoji flags.
- The dark base map is the configured tile server's map darkened in the browser. Without a tile server only the country shapes are shown.
- Clients have no responsible team (A21), so the Client Map shows each client's project manager. The team filter narrows only the case counts, and the page says so.
- The Client Map no longer shows the Dashboard section menu. Its toolbar leads back to the Operations Command Center, where the menu is.

## Validation

- Release script `build/Build-Release.ps1`: front-end build, `dotnet test` (Release) **268 passed, 0 failed**, publish, `release/TioHub-2.40.0.zip`. Built from uncommitted changes on top of `930643a` (`BUILD-INFO.txt` says so). No migration: `database/01-schema.sql` is byte-identical to 2.39.0.
- Before packaging: typecheck and production build clean; Vitest **40/40** (new `clientMapModel.test.ts`: per-country sums, region filter, sorting, search, layers, client status, and an ISO code and region for every country in `Common/Countries.cs`); .NET **268/268** (new `A73_ClientMap`: products and project manager on map clients, `/assets?country=`); Playwright on the source build **125/125** (new `client-map.spec.ts` 6 tests; `frame-smoke`, `journeys` and `client-logos` adapted to the full-width map).
- Local UAT of the package (throwaway LocalDB database created with the 2.39.0 schema script, dropped afterwards; Development sign-in, fictional data):
  - **Package on the 2.39.0 schema** with `Database:ApplyMigrationsOnStartup=false`: the readiness gate accepted it, the API answered ready, no errors in the log.
  - **Acceptance suite against the running package** (`tests/e2e/playwright.uat.config.ts`): first package build **125/125**. After a CSS-only fix (the chevron of the details panel's bottom links wrapped), the rebuilt package ran **122 passed, 1 failed, 2 not run**: on the reused database the logo test's client sat below the fold of the details table and its lazily loaded logo had not loaded. The test now scrolls the row into view. The logo and map specs (10 tests) then passed against the package.
- Screenshots compared with the target design at 1600, 1280 and 820 px (dark toolbar and layers, country explorer, dark map with blue shading and numbered badges, country details tabs, drawers on tablets).
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a screen-reader session, and the actual UAT environment and its database.
