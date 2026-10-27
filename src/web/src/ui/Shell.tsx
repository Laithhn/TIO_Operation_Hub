import { hasPermission, hasAnyPermission } from '../permissions';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { get } from '../api';
import { useMe, type Me } from '../hooks';
import { signOut } from '../pages/SignIn';
import { Menu } from './kit';
import { NotificationBell } from '../pages/Notifications';
import { Icon, Logo } from './Icon';
import { cx, frameCss, PrimaryLinksMarker, SidebarMarker, SidebarTitle } from '../vt/frame';

type Item = { to: string; label: string; icon?: string; end?: boolean; show?: (m: Me) => boolean; children?: Item[] };
/** bare: the page uses the whole width (no section menu), for full-screen workspaces such as Notes. */
type Section = { key: string; label: string; to: string; match: RegExp; show?: (m: Me) => boolean; side: Item[]; bare?: boolean };

const biz = (m: Me) => !!m.businessRole;
const action = (resource: string, operation: string) => (m: Me) => hasPermission(m, resource, operation);
const tech = (m: Me) => biz(m) && m.grants.technicalDetail;
const admin = (m: Me) => m.isAdministrator;

// MVP navigation only: deferred (Next/Later) modules have no entries.
const SECTIONS: Section[] = [
  { key: 'dash', label: 'Dashboard', to: '/', match: /^\/($|map|actions|notifications|data-quality|reports)/, show: biz, side: [
    { to: '/', label: 'Executive overview', icon: 'dashboard', end: true },
    { to: '/map', label: 'Client map', icon: 'region' },
    { to: '/actions', label: 'Action list', icon: 'list' },
    { to: '/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/data-quality', label: 'Data quality', icon: 'quality' },
    { to: '/reports', label: 'Reporting Center', icon: 'report', show: m => m.grants.export },
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
  { key: 'admin', label: 'Administration', to: '/admin', match: /^\/admin/, show: admin, side: [
    { to: '/admin/users', label: 'Users & access', icon: 'users', show: admin },
    { to: '/admin/roles', label: 'Roles', icon: 'users', show: admin },
    { to: '/admin/rights', label: 'Rights', icon: 'lock', show: admin },
    { to: '/admin/groups', label: 'Group mappings', icon: 'key', show: m => admin(m) && m.app.authMode.toLowerCase() !== 'forms' },
    // A34: each configurable list has its own page.
    { to: '/admin/config', label: 'Configuration', icon: 'list', show: admin, children: [
      { to: '/admin/config', label: 'Overview', end: true },
      { to: '/admin/config/environment-types', label: 'Environment types' },
      { to: '/admin/config/reported-conditions', label: 'Reported conditions' },
      { to: '/admin/config/responsibility-areas', label: 'Responsibility areas' },
      { to: '/admin/config/team-roles', label: 'Project team roles' },
      { to: '/admin/config/organization-relationship-types', label: 'Organization relationship types' },
      { to: '/admin/config/server-types', label: 'Server types' },
      { to: '/admin/config/server-roles', label: 'Server roles' },
      { to: '/admin/config/network-zones', label: 'Network zones' },
      { to: '/admin/config/operating-systems', label: 'Operating systems' },
      { to: '/admin/config/project-phases', label: 'Project phases' },
      { to: '/admin/config/component-roles', label: 'Component roles' },
      { to: '/admin/config/contract-types', label: 'Contract types' },
      { to: '/admin/config/case-types', label: 'Case types' },
      { to: '/admin/config/case-statuses', label: 'Case statuses' },
      { to: '/admin/config/escalation-channels', label: 'Escalation channels' },
      { to: '/admin/config/priority-guidance', label: 'Priority guidance' }
    ] },
    { to: '/admin/settings', label: 'System', icon: 'key', show: admin, children: [
      { to: '/admin/settings', label: 'Settings', end: true },
      { to: '/admin/policies', label: 'Review policies' },
      { to: '/admin/jira', label: 'Jira instances' }
    ] },
    { to: '/admin/audit', label: 'Change history', icon: 'history', show: m => m.grants.audit || m.isAdministrator },
    { to: '/admin/archived', label: 'Archived records', icon: 'archive', show: m => hasAnyPermission(m, 'ArchiveRestore') }
  ] }
];

const DEV_USERS = ['DEV\\manager', 'DEV\\lead', 'DEV\\engineer', 'DEV\\engineer2', 'DEV\\viewer', 'DEV\\admin'];
// The application frame follows VtWebGuiFramework (src/vt/frame.tsx): header with logo, primary links and secondary links;
// first sidebar with title, entries and the active marker; main toolbar slot (#viMainToolbar, filled by PageHead); main scope; footer.
export function Shell({ children }: { children: ReactNode }) {
  const me = useMe().data;
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);
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

  useEffect(() => { setNavOpen(false); }, [loc.pathname]);
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
      <NavLink to={i.to} end={i.end ?? !i.children} title={mini ? i.label : undefined}
        className={({ isActive }) => cx(f.sidebarNode.link, i.icon && f.sidebarNode.hasIcon, isActive && f.sidebarNode.active)}>
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
    </div>
  );

  return (
    <div className={cx(f.app.app, f.app.withFooter, 'hub-app', withSidebar ? 'with-sidebar' : 'bare')}>
      <a className="skip" href="#main">Skip to content</a>
      <header className={cx(f.header.header, 'hdr')}>
        <button className={cx(f.secondaryNode.menuNode, 'menu-btn')} onClick={() => setNavOpen(true)} aria-label="Open section menu"><Icon name="menu" size={24} /></button>
        <Link className={f.logo.headerLogo} to="/" aria-label="TIO Operations Hub home"><Logo /></Link>
        <div className={f.primaryHeader.primaryHeader}>
          <nav ref={primaryLinks} className={f.menuNodes.menuNodes} aria-label="Main">
            <PrimaryLinksMarker container={primaryLinks} activeKey={section?.key} />
            {visible.map(s => (
              <Link key={s.key} to={s.to} aria-current={s.key === section?.key ? 'page' : undefined}
                className={cx(f.primaryNode.menuNode, s.key === section?.key && f.primaryNode.active)}>{s.label}</Link>
            ))}
          </nav>
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
      {withSidebar && (
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
      <div className="scrim-nav" onClick={() => setNavOpen(false)} />
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
                <b>{h.title}</b> <span className="muted">· {h.subtitle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
