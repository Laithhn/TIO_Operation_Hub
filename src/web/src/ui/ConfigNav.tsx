import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { CONFIG_HOME, configAt, configTree, searchConfig, searchWords, type ConfigCategoryId } from '../configRegistry';
import { useMe } from '../hooks';
import { cx, frameCss } from '../vt/frame';
import { Icon } from './Icon';

const STORE = 'tiohub.config-nav';
const readOpen = (): ConfigCategoryId[] => { try { return JSON.parse(sessionStorage.getItem(STORE) ?? '[]'); } catch { return []; } };

/** Marks every occurrence of the search words in a text. A page found by its description shows that line too. */
function Highlight({ text, words }: { text: string; words: string[] }): ReactNode {
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'));
  return parts.map((p, i) => i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>);
}

/**
 * Administration → Configuration in the section menu: a search over every configuration page, then the overview and one collapsible
 * group per category (from the configuration registry). Several groups may be open; the open set is kept for the browser session,
 * and the group of the current page always opens. While a search is typed the groups give way to the results; clearing it shows
 * the groups exactly as they were.
 */
export function ConfigNav() {
  const me = useMe().data;
  const loc = useLocation();
  const nav = useNavigate();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const groups = useMemo(() => configTree(me), [me]);
  const current = configAt(loc.pathname).category?.id;
  const [open, setOpen] = useState<ConfigCategoryId[]>(() => [...new Set([...readOpen(), ...(current ? [current] : [])])]);
  const [q, setQ] = useState('');
  const words = searchWords(q);
  const hits = useMemo(() => searchConfig(groups, q), [groups, q]);
  const hitCount = hits.reduce((n, g) => n + g.pages.length, 0);
  const f = frameCss.sidebarNode;

  // Opening a page (link, bookmark, refresh, back or forward) opens its group; the other open groups stay open.
  useEffect(() => { if (current) setOpen(o => o.includes(current) ? o : [...o, current]); }, [current]);
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(open)); } catch { /* storage blocked */ } }, [open]);

  const toggle = (c: ConfigCategoryId) => setOpen(o => o.includes(c) ? o.filter(x => x !== c) : [...o, c]);
  const clear = () => { setQ(''); input.current?.focus(); };
  const leaf = (to: string, label: ReactNode, end = false, title?: string) => (
    <NavLink to={to} end={end} title={title} className={({ isActive }) => cx(f.link, f.isSubmenuNode, 'cfg-leaf', isActive && f.active)}>
      <span className={f.line} />
      <span className={f.caption}>{label}</span>
    </NavLink>
  );

  if (!groups.length) return null;
  return (
    <div className="cfg-nav">
      <div className="cfg-search" role="search">
        <Icon name="search" size={16} />
        <input ref={input} type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
          aria-label="Search configuration" aria-controls={`${id}-results`} autoComplete="off" spellCheck={false}
          onKeyDown={e => {
            if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ(''); }
            else if (e.key === 'Enter' && words.length && hits[0]) { e.preventDefault(); setQ(''); nav(hits[0].pages[0].route); }
          }} />
        {q && <button type="button" className="cfg-search-clear" onClick={clear} aria-label="Clear configuration search" title="Clear search"><Icon name="close" size={14} /></button>}
      </div>
      <div className="sr" aria-live="polite">{words.length ? `${hitCount} configuration ${hitCount === 1 ? 'page' : 'pages'} found` : ''}</div>
      {words.length ? (
        <div id={`${id}-results`} className="cfg-results" aria-label="Configuration search results" role="group">
          {hits.length === 0 && <p className="cfg-empty">No configuration page matches “{q.trim()}”.</p>}
          {hits.map(g => (
            <div key={g.id} className="cfg-result-group">
              <div className="cfg-result-cat" aria-hidden="true">{g.name}</div>
              {g.pages.map(p => (
                <div key={p.id} className={f.menuNode} onClick={() => setQ('')}>
                  {leaf(p.route, <><Highlight text={p.name} words={words} />{!words.every(w => p.name.toLowerCase().includes(w)) &&
                    <span className="cfg-result-desc"><Highlight text={p.description} words={words} /></span>}</>, true, `${g.name} › ${p.name}: ${p.description}`)}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div id={`${id}-results`} className="cfg-tree">
          <div className={f.menuNode}>{leaf(CONFIG_HOME, 'Overview', true)}</div>
          {groups.map(g => {
            const isOpen = open.includes(g.id);
            return (
              <div key={g.id} className={cx('cfg-cat-node', g.id === current && 'current')}>
                <button type="button" className={cx(f.link, f.isSubmenuNode, 'cfg-cat')} aria-expanded={isOpen} aria-controls={`${id}-${g.id}`} onClick={() => toggle(g.id)}>
                  <Icon name="chevron" size={14} />
                  <span className={f.caption}>{g.name}</span>
                </button>
                {isOpen && (
                  <div id={`${id}-${g.id}`} className="cfg-cat-items" role="group" aria-label={g.name}>
                    {g.pages.map(p => <div key={p.id} className={f.menuNode}>{leaf(p.route, p.name, true)}</div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
