import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geoArea, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeCountry, RAMP, STATUS, type CountryDatum } from './charts';

// A51 (owner request, 21 Oct 2026): the dashboard map is a Leaflet map in every configuration.
// - Base maps (Leaflet layer control): *Muted* (default, greyed tiles so the data stands out), *Standard* and *No base map*.
//   Tiles come only from the configured App:MapTileUrl and are fetched by the browser; without a tile server only *No base map* exists.
// - Overlays: *Country shading* (choropleth + a value badge per country) and *Clients* (one marker per client, placed in a ring
//   around its country's centre so they never overlap; shown from zoom 4, i.e. when a country is opened or zoomed into).
// - Controls: zoom, fit to client countries, whole world, full screen (Esc leaves), scale. Wheel zoom only after a click.
// Country shapes come from the bundled Natural Earth atlas (public domain). Loaded lazily (own chunk).

type Geo = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;
let atlas: Promise<Geo[]> | null = null;
const loadAtlas = () => atlas ??= import('world-atlas/countries-50m.json').then(m => {
  const t = (m as { default?: unknown }).default ?? m;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (feature(t as any, (t as any).objects.countries) as unknown as { features: Geo[] }).features;
});

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
// Without an opened country, client markers appear only past the zoom the map opens at (at most 5), so they never cover the country badges there.
const CLIENT_ZOOM = 6;

// Badge anchor: centroid of the country's largest polygon (keeps overseas territories from pulling it into the sea).
function largest(f: Geo): GeoJSON.Geometry {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return g;
  const polys = g.coordinates.map(c => ({ type: 'Polygon', coordinates: c }) as GeoJSON.Polygon);
  return polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
}
function anchor(f: Geo): L.LatLngTuple {
  const [lon, lat] = geoCentroid(largest(f) as never);
  return [lat, lon];
}

// Pixel offset of client i of n around the country centre: a ring for up to 8 clients, a compact grid for more
// (a ring for 27 clients would be wider than the map).
function slot(i: number, n: number): [number, number] {
  if (n === 1) return [0, 0];
  if (n <= 8) {
    const r = Math.max(46, n * 14), a = (2 * Math.PI * i) / n - Math.PI / 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  const cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols), w = 96, h = 28;
  const col = i % cols, row = Math.floor(i / cols);
  return [(col - (cols - 1) / 2) * w, (row - (rows - 1) / 2) * h];
}

/** Runs fn now, or when a running zoom animation ends: layers added mid-animation keep the positions of the old zoom. */
function whenSettled(m: L.Map, fn: () => void): (() => void) | undefined {
  if (!(m as unknown as { _animatingZoom?: boolean })._animatingZoom) { fn(); return undefined; }
  m.once('zoomend', fn);
  return () => { m.off('zoomend', fn); };
}

export type MapMetric = { key: string; label: string; value: (d: CountryDatum) => number; alert?: (d: CountryDatum) => boolean };
export type MapClientPoint = {
  id: number; code: string; name: string; country?: string | null; parentClientId?: number | null; environments: number; servers: number;
  openCases: number; overdueCases: number; openCommitments: number; overdueCommitments: number; activeContracts: number; renewalAttention: number;
};

type CountryRow = CountryDatum & { servers?: number; activeContracts?: number };

function clientState(c: MapClientPoint): { tone: 'bad' | 'warn' | 'ok'; label: string } {
  if (c.overdueCases + c.overdueCommitments > 0) return { tone: 'bad', label: `${c.overdueCases + c.overdueCommitments} overdue` };
  if (c.renewalAttention > 0) return { tone: 'warn', label: `${c.renewalAttention} renewal due` };
  return { tone: 'ok', label: 'Nothing overdue' };
}

export default function LeafletMap({ data, clients, metric, selected, onSelect, onOpenClient, tileUrl, attribution }: {
  data: CountryRow[]; clients: MapClientPoint[]; metric: MapMetric; selected?: string; onSelect: (country: string | null) => void;
  onOpenClient: (id: number) => void; tileUrl?: string; attribution?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const shading = useRef<L.LayerGroup | null>(null);
  const clientLayer = useRef<L.LayerGroup | null>(null);
  const [features, setFeatures] = useState<Geo[] | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [wheel, setWheel] = useState(false);
  const [full, setFull] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [showClients, setShowClients] = useState(true);
  const byName = useMemo(() => new Map(data.map(d => [normalizeCountry(d.country), d])), [data]);
  const max = Math.max(1, ...data.map(metric.value));
  const step = (n: number) => (n <= 0 ? -1 : max <= RAMP.length ? n - 1 : Math.min(RAMP.length - 1, Math.floor(((n - 1) / max) * RAMP.length)));
  const sel = selected ? normalizeCountry(selected) : undefined;
  const fns = useRef({ onSelect, onOpenClient });
  fns.current = { onSelect, onOpenClient };

  useEffect(() => { let live = true; loadAtlas().then(f => live && setFeatures(f)); return () => { live = false; }; }, []);

  const mine = useMemo(() => (features ?? []).filter(f => byName.has(f.properties.name)), [features, byName]);
  const mineRef = useRef(mine);
  mineRef.current = mine;
  // True while a flight (flyTo/flyToBounds) is under way; it ends with moveend.
  const flying = useRef(false);
  const fly = (m: L.Map, go: () => void) => { flying.current = true; m.once('moveend', () => { flying.current = false; }); go(); };
  const fitClients = (animate = true) => {
    const m = map.current;
    if (!m) return;
    const list = mineRef.current;
    if (list.length === 0) { m.setView([20, 15], 1.5, { animate }); return; }
    const b = L.geoJSON({ type: 'FeatureCollection', features: list } as never).getBounds();
    // Without animate:false Leaflet still animates a zoom change of fewer than four levels.
    if (animate) fly(m, () => m.flyToBounds(b, { padding: [28, 28], maxZoom: 5, duration: 0.6 }));
    else m.fitBounds(b, { padding: [28, 28], maxZoom: 5, animate: false });
  };

  // Fit on first draw; fly to the selected country, or back to all client countries when cleared.
  // Declared before the drawing effects so that, after a selection, they already know a flight has started.
  const first = useRef(true);
  useEffect(() => {
    const m = map.current;
    if (!m || !features) return;
    const f = sel ? mine.find(x => x.properties.name === sel) : undefined;
    const bounds = f ? L.geoJSON(largest(f) as never).getBounds() : null;
    if (bounds && first.current) m.fitBounds(bounds, { padding: [40, 40], maxZoom: 6, animate: false });
    else if (bounds) fly(m, () => m.flyToBounds(bounds, { padding: [40, 40], maxZoom: 6, duration: 0.7 }));
    else fitClients(!first.current);
    first.current = false;
  }, [features, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create the map, base layers and controls once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { worldCopyJump: true, minZoom: 1, maxZoom: 9, zoomSnap: 0.25, scrollWheelZoom: false, zoomControl: false, attributionControl: true });
    m.attributionControl.setPrefix(false);
    const bases: Record<string, L.Layer> = {};
    if (tileUrl) {
      let errors = 0;
      const tiles = (className: string) => L.tileLayer(tileUrl, { attribution: esc(attribution ?? ''), maxZoom: 9, className, referrerPolicy: 'strict-origin-when-cross-origin' } as L.TileLayerOptions)
        .on('tileerror', () => { if (++errors >= 4) setTilesFailed(true); })
        .on('tileload', () => { errors = 0; setTilesFailed(false); });
      bases['Muted'] = tiles('tiles-muted');
      bases['Standard'] = tiles('');
    }
    bases['No base map'] = L.layerGroup();
    Object.values(bases)[0].addTo(m);
    shading.current = L.layerGroup().addTo(m);
    clientLayer.current = L.layerGroup().addTo(m);
    L.control.zoom({ position: 'topright' }).addTo(m);
    L.control.layers(bases, { 'Country shading': shading.current, 'Clients': clientLayer.current }, { position: 'topright', collapsed: true }).addTo(m);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(m);
    m.on('overlayadd', e => { if (e.layer === clientLayer.current) setShowClients(true); });
    m.on('overlayremove', e => { if (e.layer === clientLayer.current) setShowClients(false); });
    m.on('zoomend', () => setZoom(m.getZoom()));
    // Wheel zoom only after the map is clicked, so scrolling the page never zooms by accident.
    m.on('click', () => { m.scrollWheelZoom.enable(); setWheel(true); });
    m.on('mouseout', () => { m.scrollWheelZoom.disable(); setWheel(false); });
    // Links inside popups open in the app (no page reload).
    m.on('popupopen', e => {
      e.popup.getElement()?.querySelectorAll<HTMLAnchorElement>('a[data-client]').forEach(a => a.addEventListener('click', ev => {
        ev.preventDefault(); fns.current.onOpenClient(Number(a.dataset.client));
      }));
    });
    m.setView([20, 30], 2);
    map.current = m;
    // Leaflet does not notice when its box changes size (page layout settling, window resize).
    const ro = new ResizeObserver(() => m.invalidateSize({ pan: false }));
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, [tileUrl, attribution]);

  // Full screen: the frame covers the window; Esc leaves.
  useEffect(() => {
    map.current?.invalidateSize();
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [full]);

  // Country shading and value badges for the chosen figure.
  useEffect(() => {
    const m = map.current, g = shading.current;
    if (!m || !g || !features) return;
    const draw = () => {
      g.clearLayers();
      const tip = (name: string, d: CountryRow) =>
        `<b>${esc(name)}</b><div class="osm-tip-v"><b>${metric.value(d)}</b> ${esc(metric.label.toLowerCase())}</div>` +
        `<div>${d.clients} client(s): ${esc(d.clientCodes.join(', '))}</div><div>${d.environments} environment(s)${d.servers !== undefined ? `, ${d.servers} server(s)` : ''}</div>` +
        `<div>${d.openCases} open case(s)${d.overdueCases ? `, <b class="t-bad">${d.overdueCases} overdue</b>` : ''}</div>` +
        `<div>${d.openCommitments} open commitment(s)${d.overdueCommitments ? `, <b class="t-bad">${d.overdueCommitments} overdue</b>` : ''}</div>` +
        (d.activeContracts !== undefined ? `<div>${d.activeContracts} active contract(s)</div>` : '') + `<div class="muted">Click for the clients in ${esc(name)}</div>`;
      for (const f of mine) {
        const d = byName.get(f.properties.name)!;
        const v = metric.value(d);
        const isSel = f.properties.name === sel;
        const toggle = () => fns.current.onSelect(isSel ? null : d.country);
        const base = { color: isSel ? '#001e46' : '#fafbfc', weight: isSel ? 2.5 : 1, fillColor: v > 0 ? RAMP[step(v)] : '#c9ced6', fillOpacity: isSel ? 0.75 : 0.6 };
        L.geoJSON(f as never, { style: base })
          .bindTooltip(tip(f.properties.name, d), { sticky: true, className: 'osm-tip' }).on('click', toggle)
          .on('mouseover', e => (e.target as L.GeoJSON).setStyle({ fillOpacity: 0.85, weight: 2 }))
          .on('mouseout', e => (e.target as L.GeoJSON).setStyle(base))
          .addTo(g);
        const alert = metric.alert?.(d) ?? (d.overdueCases + d.overdueCommitments > 0);
        const name = `${f.properties.name}: ${v} ${metric.label.toLowerCase()}. Show its clients`;
        L.marker(anchor(f), {
          keyboard: true, title: name, riseOnHover: true,
          icon: L.divIcon({
            className: '', iconSize: [30, 30], iconAnchor: [15, 15],
            html: `<span class="osm-badge${isSel ? ' sel' : ''}">${v}${alert ? `<i style="background:${STATUS.critical}" aria-hidden="true"></i>` : ''}</span>`
          })
        }).bindTooltip(tip(f.properties.name, d), { direction: 'top', offset: [0, -14], className: 'osm-tip' }).on('click', toggle)
          // The badge text is only the value; give the keyboard button its full name.
          .on('add', e => {
            const btn = (e.target as L.Marker).getElement();
            btn?.setAttribute('aria-label', name);
            btn?.addEventListener('keydown', k => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); toggle(); } });
          }).addTo(g);
      }
    };
    return whenSettled(m, draw);
  }, [features, mine, byName, sel, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  // Client markers: a ring around the country's centre, laid out in screen pixels for the current zoom.
  // Redrawn once per finished zoom (Leaflet's zoomend), never in the middle of an animation, so an open popup is not
  // replaced right after it opens.
  useEffect(() => {
    const m = map.current, g = clientLayer.current;
    if (!m || !g || !features) return;
    const draw = () => {
      const zoom = m.getZoom();
      g.clearLayers();
      if (!sel && zoom < CLIENT_ZOOM) return;
      const groups = new Map<string, MapClientPoint[]>();
      for (const c of clients) {
        if (!c.country) continue;
        const k = normalizeCountry(c.country);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(c);
      }
      // With a country opened, only its clients (neighbouring grids would overlap); otherwise every client country in view.
      for (const f of sel ? mine.filter(x => x.properties.name === sel) : mine) {
        const list = groups.get(f.properties.name) ?? [];
        if (list.length === 0) continue;
        const centre = m.project(anchor(f), zoom);
        list.forEach((c, i) => {
          const pos = m.unproject(centre.add(slot(i, list.length)), zoom);
          const st = clientState(c);
          const popup = `<div class="osm-pop"><div class="osm-pop-h"><b>${esc(c.code)}</b> <span class="muted">${esc(c.name)}</span></div>` +
            (c.parentClientId ? '<div class="muted">Sub-client</div>' : '') +
            `<div class="osm-pop-grid"><span><b>${c.environments}</b> env.</span><span><b>${c.servers}</b> servers</span><span><b>${c.openCases}</b> open cases</span>` +
            `<span><b>${c.openCommitments}</b> commitments</span><span><b>${c.activeContracts}</b> contracts</span></div>` +
            `<div class="osm-pop-state t-${st.tone}">${esc(st.label)}</div><a href="/clients/${c.id}" data-client="${c.id}">Open ${esc(c.code)} →</a></div>`;
          L.marker(pos, {
            keyboard: true, title: `${c.code}: ${c.name}. ${st.label}`, riseOnHover: true, zIndexOffset: 500,
            icon: L.divIcon({ className: '', iconSize: null as unknown as L.PointExpression, html: `<span class="osm-client t-${st.tone}"><i aria-hidden="true"></i>${esc(c.code)}</span>` })
          }).bindPopup(popup, { className: 'osm-popup', offset: [0, -6], maxWidth: 280 }).addTo(g);
        });
      }
    };
    m.on('zoomend', draw);
    // While a flight is under way the markers are drawn when it lands (zoomend), not at the zoom it starts from.
    if (!flying.current && !(m as unknown as { _animatingZoom?: boolean })._animatingZoom) draw();
    return () => { m.off('zoomend', draw); };
  }, [features, mine, clients, showClients, sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const unmatched = features ? data.filter(d => !features.some(f => f.properties.name === normalizeCountry(d.country))) : [];
  const legend = max <= RAMP.length ? Array.from({ length: max }, (_, i) => ({ c: RAMP[i], t: String(i + 1) }))
    : RAMP.map((c, i) => ({ c, t: `${Math.floor((i * max) / RAMP.length) + 1}–${Math.floor(((i + 1) * max) / RAMP.length)}` }));

  return (
    <div className={`osm-wrap${full ? ' full' : ''}`} ref={wrap}>
      <div className="map-tools">
        <div className="legend" aria-label={`${metric.label} per country`}>
          <span className="muted">{metric.label}</span>
          <span><span className="key sq" style={{ background: '#c9ced6' }} />0</span>
          {legend.map(s => <span key={s.t}><span className="key sq" style={{ background: s.c }} />{s.t}</span>)}
          <span><span className="key dot" style={{ background: STATUS.critical }} />{metric.key === 'contracts' ? 'renewal decision due' : 'has overdue work'}</span>
        </div>
        {full && <button className="btn" onClick={() => setFull(false)}>Exit full screen</button>}
      </div>
      <div className="osm-frame">
        <div ref={el} className="osm" role="group" aria-label="OpenStreetMap of clients by country. The country list beside it has the same data." />
        <div className="map-zoom leaflet-bar" role="group" aria-label="Map view">
          <button onClick={() => { onSelect(null); fitClients(); }} aria-label="Show all client countries" title="Show all client countries">⤢</button>
          <button onClick={() => map.current?.flyTo([20, 15], 1.5, { duration: 0.6 })} aria-label="Show the world" title="Show the world">◯</button>
          <button onClick={() => setFull(v => !v)} aria-pressed={full} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen (Esc)' : 'Full screen'}>⛶</button>
        </div>
        <div className="map-hint">
          {!wheel ? 'Click the map to zoom with the mouse wheel; drag to move' : 'Mouse-wheel zoom on'}
          {showClients && !sel && zoom < CLIENT_ZOOM && ' · open a country (or zoom in) to see each client'}
        </div>
        {!features && <div className="osm-loading"><span className="spin" /> Loading map…</div>}
      </div>
      <div className="map-foot">
        {!tileUrl && <span>No map tile server is configured (App:MapTileUrl); country shapes and figures are shown without a base map.</span>}
        {tilesFailed && <span>Map tiles could not be loaded from the tile server; country shapes and figures are still shown.</span>}
        {unmatched.length > 0 && <span>Not placed on the map (country name not recognized): {unmatched.map(u => `${u.country} (${u.clientCodes.join(', ')})`).join('; ')}</span>}
      </div>
    </div>
  );
}
