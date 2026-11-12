// A106: shared building blocks of a record page laid out as work area + details panel (first used by the ticket page).
// They hold layout and presentation only: data, rights and actions stay with the page that uses them. The stylesheet is
// imported here, so it ships with the (lazy) pages that use these pieces and never with the entry chunk.
import { useId, useState, type ReactNode } from 'react';
import { initialsOf, toneOf } from './ClientLogo';
import { Icon } from './Icon';
import { Unknown } from './kit';
import './recordView.css';

/** Main work area with a details panel beside it; the panel moves under the work area on narrow screens. */
export function RecordLayout({ main, aside, asideLabel }: { main: ReactNode; aside: ReactNode; asideLabel: string }) {
  return (
    <div className="rv-layout">
      <div className="rv-main">{main}</div>
      <aside className="rv-aside" aria-label={asideLabel}>{aside}</aside>
    </div>
  );
}

const storeKey = (id: string) => `tio.rv.${id}`;
function remembered(id: string, fallback: boolean) {
  try { const v = localStorage.getItem(storeKey(id)); return v === null ? fallback : v === '1'; } catch { return fallback; }
}

/**
 * A collapsible section of the details panel. Open or closed is remembered per section in this browser. The content stays
 * mounted while closed (hidden), so its data is ready when it opens and in-page search still finds it after opening.
 */
export function SideSection({ id, title, actions, defaultOpen = true, children, note }: { id: string; title: ReactNode; actions?: ReactNode; defaultOpen?: boolean; children: ReactNode; note?: ReactNode }) {
  const [open, setOpen] = useState(() => remembered(id, defaultOpen));
  const body = useId();
  const toggle = () => setOpen(o => { try { localStorage.setItem(storeKey(id), o ? '0' : '1'); } catch { /* private mode */ } return !o; });
  return (
    <section className={`panel rv-side${open ? ' open' : ''}`} id={`side-${id}`}>
      <div className="rv-side-head">
        <h2><button type="button" aria-expanded={open} aria-controls={body} onClick={toggle}><span className="rv-chev" aria-hidden="true" />{title}</button></h2>
        {!open && note && <span className="rv-side-note">{note}</span>}
        {open && actions && <div className="actions">{actions}</div>}
      </div>
      <div id={body} className="rv-side-body" hidden={!open}>{children}</div>
    </section>
  );
}

export type Fact = [ReactNode, ReactNode] | [ReactNode, ReactNode, { source?: 'Jira'; hint?: ReactNode }];

/** Label / value pairs for a narrow panel. An empty value reads "Unknown", as everywhere else (UX-02). */
export function FactList({ items }: { items: (Fact | false | null | undefined)[] }) {
  return (
    <dl className="rv-facts">
      {items.filter((x): x is Fact => !!x).map(([k, v, o], i) => (
        <div key={i} className="rv-fact">
          <dt>{k}{o?.source === 'Jira' && <span className="rv-src" title="Imported from Jira; change it in Jira">Jira</span>}</dt>
          <dd>{v === null || v === undefined || v === '' ? <Unknown /> : v}{o?.hint && <div className="hint">{o.hint}</div>}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Label / value pairs spread over up to three columns, filled top to bottom, for the wide work area. */
export function FactColumns({ items, columns = 3 }: { items: (Fact | false | null | undefined)[]; columns?: number }) {
  const shown = items.filter((x): x is Fact => !!x);
  const per = Math.ceil(shown.length / columns);
  const groups = Array.from({ length: columns }, (_, i) => shown.slice(i * per, (i + 1) * per)).filter(g => g.length > 0);
  return <div className="rv-fact-cols">{groups.map((g, i) => <FactList key={i} items={g} />)}</div>;
}

/** The few facts that matter first, in one band under the title. */
export function KeyFacts({ label, items }: { label: string; items: { label: string; value: ReactNode; meta?: ReactNode; tone?: 'bad' | 'warn' }[] }) {
  return (
    <section className="rv-keyfacts" aria-label={label}>
      {items.map(i => (
        <div key={i.label} className={`rv-keyfact${i.tone ? ` rv-tone-${i.tone}` : ''}`}>
          <span className="rv-keyfact-label">{i.label}</span>
          <div className="rv-keyfact-value">{i.value}</div>
          {i.meta && <div className="rv-keyfact-meta">{i.meta}</div>}
        </div>
      ))}
    </section>
  );
}

/** The content of one tab: a heading line with a count and actions, then the body. */
export function TabSection({ title, count, actions, intro, children, toolbar }: { title: ReactNode; count?: number; actions?: ReactNode; intro?: ReactNode; toolbar?: ReactNode; children: ReactNode }) {
  return (
    <section className="rv-tab">
      <header className="rv-tab-head">
        <h2>{title}{count !== undefined && <span className="rv-count" aria-label={`${count} records`}>{count}</span>}</h2>
        {actions && <div className="actions">{actions}</div>}
      </header>
      {intro && <p className="rv-intro">{intro}</p>}
      {toolbar && <div className="rv-toolbar">{toolbar}</div>}
      <div className="rv-tab-body">{children}</div>
    </section>
  );
}

/** Mutually exclusive filter buttons with counts (aria-pressed). */
export function FilterChips<K extends string>({ label, options, value, onChange }: { label: string; options: { key: K; label: string; count?: number; hidden?: boolean }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="rv-chips" role="group" aria-label={label}>
      {options.filter(o => !o.hidden).map(o => (
        <button key={o.key} type="button" className="rv-chip" aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}{o.count !== undefined && <span className="rv-chip-count"> ({o.count})</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="rv-search">
      <span className="sr">{label}</span>
      <Icon name="search" size={16} />
      <input type="search" className="input" value={value} placeholder={placeholder ?? label} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

/** A friendly empty state: what is missing and, when allowed, the action that adds it. */
export function EmptyState({ icon = 'list', title, children, action }: { icon?: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rv-empty" role="status">
      <span className="rv-empty-icon" aria-hidden="true"><Icon name={icon} size={22} /></span>
      <div><div className="rv-empty-title">{title}</div>{children && <div className="hint">{children}</div>}{action && <div className="rv-empty-action">{action}</div>}</div>
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name?: string | null; size?: number }) {
  const who = name || 'System';
  return <span className={`rv-avatar${name ? '' : ' system'}`} style={{ width: size, height: size, background: name ? toneOf(who) : undefined }} aria-hidden="true">{name ? initialsOf(who) : <Icon name="admin" size={Math.round(size * 0.55)} />}</span>;
}

/** Before → after, each value in its own chip; an empty side reads as a dash. Screen readers hear "from … to …". */
export function ChangePair({ from, to }: { from?: ReactNode; to?: ReactNode }) {
  const v = (x: ReactNode) => (x === null || x === undefined || x === '' ? '—' : x);
  return (
    <span className="rv-change">
      <span className="sr">from </span><span className="rv-val old">{v(from)}</span>
      <span className="rv-arrow" aria-hidden="true">→</span>
      <span className="sr"> to </span><span className="rv-val new">{v(to)}</span>
    </span>
  );
}

/** A vertical timeline; each item has a marker (icon or avatar), a title line, a meta line and optional content. */
export function Timeline({ children, label }: { children: ReactNode; label?: string }) {
  return <ol className="rv-timeline" aria-label={label}>{children}</ol>;
}

export function TimelineItem({ marker, title, meta, children, className }: { marker: ReactNode; title: ReactNode; meta?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <li className={`rv-tl-item${className ? ` ${className}` : ''}`}>
      <span className="rv-tl-marker">{marker}</span>
      <div className="rv-tl-body">
        <div className="rv-tl-title">{title}</div>
        {meta && <div className="rv-tl-meta">{meta}</div>}
        {children}
      </div>
    </li>
  );
}

export function IconMarker({ icon, tone }: { icon: string; tone?: 'jira' | 'tio' | 'good' | 'warn' | 'bad' }) {
  return <span className={`rv-icon-marker${tone ? ` rv-tone-${tone}` : ''}`} aria-hidden="true"><Icon name={icon} size={14} /></span>;
}

/** The origin of a value or event: Jira (imported, read-only here) or TIO (recorded in the hub). */
export function SourceTag({ source }: { source: 'Jira' | 'TIO' | string }) {
  return <span className={`rv-source ${source === 'Jira' ? 'jira' : 'tio'}`}>{source === 'Jira' ? 'Jira' : 'TIO'}</span>;
}
