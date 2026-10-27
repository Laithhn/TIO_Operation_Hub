import { hasPermission, hasAnyPermission } from '../permissions';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { get } from '../api';
import { useMe, type Me } from '../hooks';
import { signOut } from '../pages/SignIn';
import { Menu } from './kit';
import { NotificationBell } from '../pages/Notifications';
import { Icon, Logo } from './Icon';

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

export function Shell({ children }: { children: ReactNode }) {
  const me = useMe().data;
  const loc = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('tiohub.side-mini') === '1'; } catch { return false; } });
  const [palette, setPalette] = useState(false);
  const visible = useMemo(() => me ? SECTIONS.filter(s => (s.show?.(me) ?? true) && s.side.some(i => i.show?.(me) ?? true)) : [], [me]);
  const section = visible.find(s => s.match.test(loc.pathname)) ?? visible[0];

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

  const renderItem = (i: Item) => (
    <div key={i.to + i.label}>
      <NavLink to={i.to} end={i.end ?? !i.children}>{i.icon && <Icon name={i.icon} />}<span>{i.label}</span></NavLink>
      {i.children && me && <div className="subs">{i.children.filter(c => c.show?.(me) ?? true).map(c => <NavLink key={c.to} to={c.to} end={c.end}><span>{c.label}</span></NavLink>)}</div>}
    </div>
  );

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="hdr">
        <button className="hdr-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open section menu"><Icon name="menu" size={18} /></button>
        <Link className="logo" to="/" aria-label="TIO Operations Hub home"><Logo /><span>VITRONIC</span></Link>
        <nav className="topnav" aria-label="Main">
          {visible.map(s => <Link key={s.key} to={s.to} aria-current={s.key === section?.key ? 'page' : undefined}>{s.label}</Link>)}
        </nav>
        <div className="hdr-right">
          {me?.app.devSignIn && (
            <select className="hdr-select" aria-label="Development sign-in: switch demo user" value={currentDev} onChange={e => switchDev(e.target.value)} title="Development only — fictional demo users">
              {DEV_USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          )}
          {me && <Menu label="+ New" title="Create a record" items={[
            { label: 'Client', to: '/clients/new', hidden: !hasPermission(me, 'ClientStructure', 'Create') },
            { label: 'Environment', to: '/environments/new', hidden: !hasPermission(me, 'Environments', 'Create') },
            { label: 'Case', to: '/cases/new', hidden: !hasPermission(me, 'Cases', 'Create') },
            { label: 'Commitment', to: '/commitments/new', hidden: !hasPermission(me, 'Commitments', 'Create') },
            { label: 'Escalation', to: '/escalations/new', hidden: !hasPermission(me, 'OtherOperations', 'Create') },
            { label: 'Note', to: '/notes' },
            { label: 'Product', to: '/products/new', hidden: !hasPermission(me, 'Products', 'Create') }
          ]} />}
          {me && <NotificationBell />}
          <button className="hdr-search" onClick={() => setPalette(true)} aria-label="Search (/ or Ctrl+K)" title="Search clients, environments, servers, cases… (/ or Ctrl+K)">
            <Icon name="search" size={15} /><span>Search…</span><kbd>/</kbd>
          </button>
          {me?.app.authMode.toLowerCase() === 'forms'
            ? <Link className="hdr-btn" to="/account/password" title={`${me.displayName} · ${me.roleLabels.join(', ')} · Change password`} aria-label={`Signed in as ${me.displayName}. Change password`}><Icon name="user" size={18} /></Link>
            : <span className="hdr-btn" title={me ? `${me.displayName} · ${me.roleLabels.join(', ')}` : ''}><Icon name="user" size={18} title={me ? `Signed in as ${me.displayName}` : undefined} /></span>}
          {me?.app.authMode.toLowerCase() === 'forms' && <button className="hdr-btn" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="signout" size={18} /></button>}
        </div>
      </header>
      <div className="frame">
        {!section?.bare && <aside className="side" aria-label="Section menu">
          <div className="side-title">TIO Operations<br />Hub</div>
          <nav className="side-nav">{section && me && section.side.filter(i => i.show?.(me) ?? true).map(renderItem)}</nav>
          <button className="side-collapse" onClick={toggleMini} aria-label={mini ? 'Expand menu' : 'Collapse menu'}><Icon name="chevron" size={14} /></button>
        </aside>}
        <div className="scrim-nav" onClick={() => setNavOpen(false)} />
        <main className="content" id="main" tabIndex={-1}>{children}</main>
      </div>
      <footer className="status">
        <span>© Vitronic</span>
        <span className="app">TIO Operations Hub&nbsp;&nbsp;{me?.app.version}</span>
        <span className="center">User : {me?.account}{me ? ` · ${me.roleLabels.join(', ')}` : ''}</span>
        <span className="right">
          {me?.app.environmentName && me.app.environmentName !== 'Production' && <span className="env-badge">{me.app.environmentName}</span>}
          <span>Times: {me?.timeZone}</span>
          <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Icon name="online" size={14} />Server Online</span>
        </span>
      </footer>
      {palette && <SearchPalette onClose={() => setPalette(false)} />}
    </>
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
