import { hasPermission, hasAnyPermission } from '../permissions';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { get } from '../api';
import { useMe, type Me } from '../hooks';
import { signOut } from '../pages/SignIn';
import { Menu } from './kit';
import { ConfigNav } from './ConfigNav';
import { configAt } from '../configRegistry';
import { NotificationBell } from '../pages/Notifications';
import { Icon, Logo } from './Icon';
import { cx, frameCss, PrimaryLinksMarker, SidebarMarker, SidebarTitle } from '../vt/frame';
import { ClientLogo } from './ClientLogo';

/** tree 'config': the entry carries the Configuration tree (ConfigNav) instead of fixed children. */
type Item = { to: string; label: string; icon?: string; end?: boolean; show?: (m: Me) => boolean; children?: Item[]; tree?: 'config' };
/** bare: the page uses the whole width (no section menu), for full-screen workspaces such as Notes. */
type Section = { key: string; label: string; to: string; match: RegExp; show?: (m: Me) => boolean; side: Item[]; bare?: boolean };

const biz = (m: Me) => !!m.businessRole;
const action = (resource: string, operation: string) => (m: Me) => hasPermission(m, resource, operation);
const tech = (m: Me) => biz(m) && m.grants.technicalDetail;
const admin = (m: Me) => m.isAdministrator;

// MVP navigation only: deferred (Next/Later) modules have no entries.
const SECTIONS: Section[] = [
  { key: 'dash', label: 'Dashboard', to: '/', match: /^\/($|map|actions|notifications|data-quality)/, show: biz, side: [
    { to: '/', label: 'Executive overview', icon: 'dashboard', end: true },
    { to: '/map', label: 'Client map', icon: 'region' },
    { to: '/actions', label: 'Action list', icon: 'list' },
    { to: '/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/data-quality', label: 'Data quality', icon: 'quality' },
    // Engineers read the change history here; the TIO Manager has it under Administration.
    { to: '/admin/audit', label: 'Change history', icon: 'history', show: m => !m.isAdministrator && m.grants.audit }
  ] },
  // Environments and everything installed in them belong to a client, so they live only under Clients.
  { key: 'clients', label: 'Clients', to: '/clients', match: /^\/(clients|regions|projects|contracts|environments|installations|versions|assets|components|firewall-rules|infrastructure|admin\/archived)/, show: biz, side: [
    { to: '/clients', label: 'All clients', icon: 'clients', end: true },
    // A27: contracts and their SLA terms belong to a project.
    { to: '/projects', label: 'Projects & contracts', icon: 'project', children: [
      { to: '/projects', label: 'All projects', end: true },
      { to: '/contracts', label: 'Contract register' }
    ] },
    { to: '/environments', label: 'Environments', icon: 'server', children: [
      { to: '/environments', label: 'All environments', end: true },
      { to: '/versions', label: 'Version matrix' },
      { to: '/assets', label: 'Assets & totals' },
      { to: '/firewall-rules', label: 'Firewall rules', show: tech }
    ] },
    { to: '/clients/new', label: 'New client', icon: 'plus', show: action('ClientStructure', 'Create') },
    { to: '/admin/archived', label: 'Archived records', icon: 'archive', show: m => hasAnyPermission(m, 'ArchiveRestore') }
  ] },
  { key: 'products', label: 'Products', to: '/products', match: /^\/(products|microservices)/, show: biz, side: [
    { to: '/products', label: 'All products', icon: 'app', end: true },
    { to: '/products/new', label: 'New product', icon: 'plus', show: action('Products', 'Create') }
  ] },
  { key: 'cases', label: 'Cases', to: '/cases', match: /^\/cases/, show: biz, side: [
    { to: '/cases', label: 'All cases', icon: 'case', end: true },
    { to: '/cases/new', label: 'New case', icon: 'plus', show: action('Cases', 'Create') }
  ] },
  { key: 'commitments', label: 'Commitments', to: '/commitments', match: /^\/commitments/, show: biz, side: [
    { to: '/commitments', label: 'All commitments', icon: 'commitment', end: true },
    { to: '/commitments/new', label: 'New commitment', icon: 'plus', show: action('Commitments', 'Create') }
  ] },
  // A47: personal notes, for every signed-in user.
  { key: 'notes', label: 'Notes', to: '/notes', match: /^\/notes/, show: () => true, bare: true, side: [
    { to: '/notes', label: 'My notes', icon: 'note', end: true }
  ] },
  // A41: escalation management.
  { key: 'escalations', label: 'Escalations', to: '/escalations', match: /^\/escalations/, show: biz, side: [
    { to: '/escalations', label: 'All escalations', icon: 'escalation', end: true },
    { to: '/escalations/new', label: 'New escalation', icon: 'plus', show: action('OtherOperations', 'Create') },
    { to: '/admin/config/escalation-channels', label: 'Escalation channels', icon: 'list', show: m => m.isAdministrator }
  ] },
  { key: 'teams', label: 'Teams', to: '/teams', match: /^\/(teams|handovers|reassignment)/, show: biz, side: [
    { to: '/teams', label: 'Teams & coverage', icon: 'team' },
    { to: '/handovers', label: 'Handovers', icon: 'handover' },
    { to: '/reassignment', label: 'Reassignment queue', icon: 'users' }
  ] },
  // A70: the Reporting Center is a first-level section (no longer under Dashboard); its own menu holds the center's areas.
  { key: 'reporting', label: 'Reporting Center', to: '/reporting-center', match: /^\/(reporting-center|reports)(\/|$)/, show: m => biz(m) && m.grants.export, side: [
    { to: '/reporting-center', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/reporting-center/library', label: 'Report library', icon: 'report' },
    { to: '/reporting-center/builder/cases', label: 'Cases report builder', icon: 'filter' },
    { to: '/reporting-center/my-reports', label: 'My reports', icon: 'list' },
    { to: '/reporting-center/schedules', label: 'Scheduled reports', icon: 'calendar' },
    { to: '/reporting-center/history', label: 'Export history', icon: 'history' },
    { to: '/reporting-center/templates', label: 'Templates', icon: 'copy' }
  ] },
  { key: 'admin', label: 'Administration', to: '/admin', match: /^\/admin/, show: admin, side: [
    { to: '/admin/users', label: 'Users & access', icon: 'users', show: admin },
    { to: '/admin/roles', label: 'Roles', icon: 'users', show: admin },
    { to: '/admin/rights', label: 'Rights', icon: 'lock', show: admin },
    { to: '/admin/groups', label: 'Group mappings', icon: 'key', show: m => admin(m) && m.app.authMode.toLowerCase() !== 'forms' },
    // A34: each configurable list has its own page. The Configuration tree (categories, search, System pages) comes from the
    // configuration registry and is drawn by ConfigNav; review policies, Jira instances and settings sit in its System category.
    { to: '/admin/config', label: 'Configuration', icon: 'list', show: admin, tree: 'config' },
    { to: '/admin/audit', label: 'Change history', icon: 'history', show: m => m.grants.audit || m.isAdministrator },
    { to: '/admin/archived', label: 'Archived records', icon: 'archive', show: m => hasAnyPermission(m, 'ArchiveRestore') }
  ] }
];

/** True while the media query matches (for example the drawer layout of tablets and phones). */
function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setOn(m.matches);
    h();
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [query]);
  return on;
}

/**
 * GUI-10, header from 901 px: the section links that fit stay in the header, the others move into "More". The active section always keeps
 * its place in the header. Widths come from an invisible copy of the links, so the decision does not depend on what is shown.
 */
function useFittingSections(sections: Section[], activeKey: string | undefined, enabled: boolean) {
  const box = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<string[] | null>(null);
  const keys = sections.map(s => s.key).join('|');
  const compute = useCallback(() => {
    const b = box.current, m = measure.current;
    if (!b || !m) return;
    const widths = new Map([...m.querySelectorAll<HTMLElement>('[data-key]')].map(e => [e.dataset.key!, e.offsetWidth]));
    const more = m.querySelector<HTMLElement>('[data-more]')?.offsetWidth ?? 90;
    const avail = b.clientWidth;
    const all = sections.map(s => s.key);
    const w = (k: string) => widths.get(k) ?? 0;
    if (all.reduce((a, k) => a + w(k), 0) <= avail) { setShown(all); return; }
    let used = more + (activeKey ? w(activeKey) : 0);
    const fit: string[] = [];
    for (const k of all) {
      if (k === activeKey) continue;
      if (used + w(k) > avail) break;
      used += w(k); fit.push(k);
    }
    setShown(all.filter(k => k === activeKey || fit.includes(k)));
  }, [keys, activeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!enabled) return;
    compute();
    const ro = new ResizeObserver(compute);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [compute, enabled]);
  return { box, measure, shown };
}

/** The sections that do not fit in the header: a disclosure button with a list of links (Escape closes and returns focus). */
function MoreSections({ sections, className }: { sections: Section[]; className: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    root.current?.querySelector<HTMLElement>('.nav-more-list a')?.focus();
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (sections.length === 0) return null;
  return (
    <div className="nav-more" ref={root}>
      <button ref={btn} type="button" className={className} aria-expanded={open} aria-controls="nav-more-list" onClick={() => setOpen(o => !o)}>
        More <span aria-hidden="true" className="caret">▾</span><span className="sr"> sections ({sections.length})</span>
      </button>
      {open && <ul className="nav-more-list" id="nav-more-list">{sections.map(s => <li key={s.key}><Link to={s.to}>{s.label}</Link></li>)}</ul>}
    </div>
  );
}

const DEV_USERS = ['DEV\\manager', 'DEV\\lead', 'DEV\\engineer', 'DEV\\engineer2', 'DEV\\viewer', 'DEV\\admin'];
// The application frame follows VtWebGuiFramework (src/vt/frame.tsx): header with logo, primary links and secondary links;
// first sidebar with title, entries and the active marker; main toolbar slot (#viMainToolbar, filled by PageHead); main scope; footer.
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe().data;
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  // Tablets and phones (up to 900 px): the header links give way to a drawer with every section (GUI-10).
  const drawer = useMedia('(max-width: 900px)');
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('tiohub.side-mini') === '1'; } catch { return false; } });
  const [palette, setPalette] = useState(false);
  // MainToolbar portals into #viMainToolbar, so pages render once the frame is in the DOM.
  const [framed, setFramed] = useState(false);
  useLayoutEffect(() => setFramed(true), []);
  const primaryLinks = useRef<HTMLElement>(null);
  const submenu = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => me ? SECTIONS.filter(s => (s.show?.(me) ?? true) && s.side.some(i => i.show?.(me) ?? true)) : [], [me]);
  const section = visible.find(s => s.match.test(loc.pathname)) ?? visible[0];
  const withSidebar = !section?.bare;
  const fitting = useFittingSections(visible, section?.key, !drawer);
  const inHeader = fitting.shown ? visible.filter(s => fitting.shown!.includes(s.key)) : visible;
  const overflow = fitting.shown ? visible.filter(s => !fitting.shown!.includes(s.key)) : [];

  // Leaving a page from the drawer moves focus to the new page; closing it otherwise returns focus to the menu button.
  const closeDrawer = useCallback((refocus: boolean) => { setNavOpen(false); if (refocus) menuButton.current?.focus(); }, []);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current) document.getElementById('main')?.focus();
    setNavOpen(false);
  }, [loc.pathname]);
  useEffect(() => { wasOpen.current = navOpen; }, [navOpen]);
  useEffect(() => { if (!drawer) setNavOpen(false); }, [drawer]);
  // The current section starts expanded in the drawer.
  useEffect(() => { if (navOpen && section) setExpanded(e => ({ ...e, [section.key]: true })); }, [navOpen, section?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!navOpen) return;
    const el = drawerRef.current;
    const first = () => (el?.querySelector<HTMLElement>('.drawer-section.current a') ?? el?.querySelector<HTMLElement>('a[href]'))?.focus();
    first();
    // A second try once the drawer has painted, in case the browser refused focus during the slide-in.
    const f0 = requestAnimationFrame(() => { if (!el?.contains(document.activeElement)) first(); });
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(true); return; }
      if (e.key !== 'Tab' || !el) return;
      // Focus stays inside the open drawer.
      const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', keys);
    return () => { cancelAnimationFrame(f0); document.removeEventListener('keydown', keys); };
  }, [navOpen, closeDrawer]);
  useEffect(() => { document.body.classList.toggle('nav-open', navOpen); document.body.classList.toggle('side-mini', mini); }, [navOpen, mini]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable);
      // Ctrl+K (some browsers reserve it) or "/" outside text fields opens search.
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); setPalette(true); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const toggleMini = () => { const n = !mini; setMini(n); try { localStorage.setItem('tiohub.side-mini', n ? '1' : '0'); } catch { /* storage blocked */ } };
  const switchDev = (acct: string) => { document.cookie = `tiohub-dev-user=${encodeURIComponent(acct)}; path=/; SameSite=Strict`; window.location.href = '/'; };
  const currentDev = decodeURIComponent(document.cookie.match(/tiohub-dev-user=([^;]+)/)?.[1] ?? '') || me?.account;
  const forms = me?.app.authMode.toLowerCase() === 'forms';
  const f = frameCss;

  const entry = (i: Item) => (
    <div key={i.to + i.label} className={f.sidebarNode.menuNode}>
      <NavLink to={i.to} end={i.end ?? !(i.children || i.tree)} title={mini ? i.label : undefined}
        className={({ isActive }) => cx(f.sidebarNode.link, i.icon && f.sidebarNode.hasIcon, (isActive || (i.tree === 'config' && !!configAt(loc.pathname).page)) && f.sidebarNode.active)}>
        {i.icon && <Icon name={i.icon} size={20} />}
        <span className={f.sidebarNode.caption}>{i.label}</span>
      </NavLink>
      {i.children && me && i.children.filter(c => c.show?.(me) ?? true).map(c => (
        <div key={c.to} className={f.sidebarNode.menuNode}>
          <NavLink to={c.to} end={c.end} className={({ isActive }) => cx(f.sidebarNode.link, f.sidebarNode.isSubmenuNode, isActive && f.sidebarNode.active)}>
            <span className={f.sidebarNode.line} />
            <span className={f.sidebarNode.caption}>{c.label}</span>
          </NavLink>
        </div>
      ))}
      {i.tree === 'config' && !(mini && !drawer) && <ConfigNav />}
    </div>
  );

  return (
    <div className={cx(f.app.app, f.app.withFooter, 'hub-app', withSidebar ? 'with-sidebar' : 'bare')}>
      <a className="skip" href="#main">Skip to content</a>
      <header className={cx(f.header.header, 'hdr')}>
        <button ref={menuButton} className={cx(f.secondaryNode.menuNode, 'menu-btn')} onClick={() => setNavOpen(o => !o)} aria-expanded={navOpen} aria-controls="hub-drawer"
          aria-label={`Menu${section ? `, current section ${section.label}` : ''}`}>
          <Icon name="menu" size={24} />{section && <span className="menu-btn-label" aria-hidden="true">{section.label}</span>}
        </button>
        <Link className={f.logo.headerLogo} to="/" aria-label="TIO Operations Hub home"><Logo /></Link>
        <div className={cx(f.primaryHeader.primaryHeader, 'hdr-primary')} ref={fitting.box}>
          <nav ref={primaryLinks} className={f.menuNodes.menuNodes} aria-label="Main">
            <PrimaryLinksMarker container={primaryLinks} activeKey={section?.key} />
            {inHeader.map(s => (
              <Link key={s.key} to={s.to} aria-current={s.key === section?.key ? 'page' : undefined}
                className={cx(f.primaryNode.menuNode, s.key === section?.key && f.primaryNode.active)}>{s.label}</Link>
            ))}
            <MoreSections sections={overflow} className={f.primaryNode.menuNode} />
          </nav>
          <div className={cx(f.menuNodes.menuNodes, 'nav-measure')} ref={fitting.measure} aria-hidden="true" inert>
            {visible.map(s => <span key={s.key} data-key={s.key} className={f.primaryNode.menuNode}>{s.label}</span>)}
            <span data-more className={f.primaryNode.menuNode}>More <span className="caret">▾</span></span>
          </div>
        </div>
        <div className={cx(f.secondaryHeader.secondaryHeader, 'hdr-right')}>
          {me?.app.devSignIn && (
            <div className={f.secondaryHeader.secondaryHeaderContr}>
              <select className="hdr-select" aria-label="Development sign-in: switch demo user" value={currentDev} onChange={e => switchDev(e.target.value)} title="Development only — fictional demo users">
                {DEV_USERS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          {me && <div className={f.secondaryHeader.secondaryHeaderContr}><Menu label="+ New" title="Create a record" items={[
            { label: 'Client', to: '/clients/new', hidden: !hasPermission(me, 'ClientStructure', 'Create') },
            { label: 'Environment', to: '/environments/new', hidden: !hasPermission(me, 'Environments', 'Create') },
            { label: 'Case', to: '/cases/new', hidden: !hasPermission(me, 'Cases', 'Create') },
            { label: 'Commitment', to: '/commitments/new', hidden: !hasPermission(me, 'Commitments', 'Create') },
            { label: 'Escalation', to: '/escalations/new', hidden: !hasPermission(me, 'OtherOperations', 'Create') },
            { label: 'Note', to: '/notes' },
            { label: 'Product', to: '/products/new', hidden: !hasPermission(me, 'Products', 'Create') }
          ]} /></div>}
          <button className={f.secondaryNode.menuNode} onClick={() => setPalette(true)} aria-label="Search (/ or Ctrl+K)" title="Search clients, environments, servers, cases… (/ or Ctrl+K)">
            <Icon name="search" size={24} />
          </button>
          {me && <NotificationBell />}
          {forms
            ? <Link className={f.secondaryNode.menuNode} to="/account/password" title={`${me!.displayName} · ${me!.roleLabels.join(', ')} · Change password`} aria-label={`Signed in as ${me!.displayName}. Change password`}><Icon name="user" size={24} /></Link>
            : <span className={f.secondaryNode.menuNode} title={me ? `${me.displayName} · ${me.roleLabels.join(', ')}` : ''}><Icon name="user" size={24} title={me ? `Signed in as ${me.displayName}` : undefined} /></span>}
          {forms && <button className={f.secondaryNode.menuNode} onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="signout" size={24} /></button>}
        </div>
      </header>
      <div id="viMainToolbar" className={'hub-main-toolbar'} />
      {drawer ? (
        // GUI-10: on tablets and phones the drawer holds every section the user may open, each with its pages.
        <aside id="hub-drawer" ref={drawerRef} className={cx(f.firstSidebar.firstSidebar, f.firstSidebar.withTitle, 'side', 'drawer')}
          aria-label="Navigation" inert={!navOpen} {...(navOpen && { role: 'dialog', 'aria-modal': true })}>
          <div className="drawer-head">
            <SidebarTitle>TIO Operations Hub</SidebarTitle>
            <button type="button" className="drawer-close" onClick={() => closeDrawer(true)} aria-label="Close menu"><Icon name="close" size={20} /></button>
          </div>
          <div className={f.sidebarMenu.menuWrapper}>
            <nav className={cx(f.sidebarMenu.menu, 'side-nav', 'drawer-nav')} aria-label="All sections">
              {me && visible.map(s => {
                const open = !!expanded[s.key];
                const items = s.side.filter(i => i.show?.(me) ?? true);
                const current = s.key === section?.key;
                return (
                  <div key={s.key} className={cx('drawer-section', current && 'current')}>
                    <div className="drawer-section-head">
                      <Link to={s.to} className="drawer-section-link">{s.label}{current && <span className="sr"> (current section)</span>}</Link>
                      {items.length > 0 && <button type="button" className="drawer-toggle" aria-expanded={open} aria-controls={`drawer-${s.key}`}
                        aria-label={`${s.label} pages`} onClick={() => setExpanded(e => ({ ...e, [s.key]: !open }))}><Icon name="chevron" size={16} /></button>}
                    </div>
                    {open && <div id={`drawer-${s.key}`} className="drawer-items">{items.map(entry)}</div>}
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>
      ) : withSidebar && (
        <aside className={cx(f.firstSidebar.firstSidebar, f.firstSidebar.withTitle, 'side')} aria-label="Section menu">
          <SidebarTitle>TIO Operations Hub</SidebarTitle>
          <div className={f.sidebarMenu.menuWrapper}>
            <nav ref={submenu} className={cx(f.sidebarMenu.menu, 'side-nav')}>
              {section && me && section.side.filter(i => i.show?.(me) ?? true).map(entry)}
              <SidebarMarker container={submenu} path={loc.pathname} />
            </nav>
          </div>
          <button className="side-collapse" onClick={toggleMini} aria-label={mini ? 'Expand menu' : 'Collapse menu'}><Icon name="chevron" size={16} /></button>
        </aside>
      )}
      <div className="scrim-nav" onClick={() => closeDrawer(false)} />
      <main className={cx(f.mainScope.mainScope, 'content')} id="main" tabIndex={-1}>{framed && children}</main>
      <footer className={cx(f.footer.footer, 'status')}>
        <span>© VITRONIC</span>
        <span className="app">TIO Operations Hub&nbsp;&nbsp;{me?.app.version}</span>
        <span className="center">User : {me?.account}{me ? ` · ${me.roleLabels.join(', ')}` : ''}</span>
        <span className="right">
          {me?.app.environmentName && me.app.environmentName !== 'Production' && <span className="env-badge">{me.app.environmentName}</span>}
          <span>Times: {me?.timeZone}</span>
          <span className="online"><Icon name="online" size={16} />Server Online</span>
        </span>
      </footer>
      {palette && <SearchPalette onClose={() => setPalette(false)} />}
    </div>
  );
}

type Hit = { group: string; title: string; subtitle: string; link: string };

function SearchPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setHits([]); return; }
    setBusy(true);
    const h = setTimeout(() => get<Hit[]>(`/search?q=${encodeURIComponent(t)}`).then(r => { setHits(r); setSel(0); }).catch(() => setHits([])).finally(() => setBusy(false)), 200);
    return () => clearTimeout(h);
  }, [q]);
  const go = (h: Hit) => { onClose(); nav(h.link); };
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog palette" role="dialog" aria-modal="true" aria-label="Search">
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients, environments, contracts, cases, Jira keys, commitments…" aria-label="Search"
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
          }} />
        <ul role="listbox" aria-label="Results">
          {busy && <li className="g">Searching…</li>}
          {!busy && q.trim().length >= 2 && hits.length === 0 && <li className="g">No matching records in your scope.</li>}
          {hits.map((h, i) => (
            <li key={h.link + i}>
              {(i === 0 || hits[i - 1].group !== h.group) && <div className="g">{h.group}</div>}
              <a href={h.link} role="option" aria-selected={i === sel} onClick={e => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}>
                {/^\/clients\/\d+$/.test(h.link) && <><ClientLogo clientId={Number(h.link.slice(9))} code={h.title.split(' · ')[0]} name={h.title.split(' · ')[1]} size="xs" decorative />{' '}</>}
                <b>{h.title}</b> <span className="muted">· {h.subtitle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
