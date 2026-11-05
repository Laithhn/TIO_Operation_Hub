import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { get } from '../api';
import { ClientLogo } from './ClientLogo';

type Hit = { group: string; title: string; subtitle: string; link: string };

/** onClose dismisses it, and the shell returns focus to where it was; onNavigate leaves for a result, and focus moves to the new page. */
export function SearchPalette({ onClose, onNavigate }: { onClose: () => void; onNavigate: () => void }) {
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
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;
  useEffect(() => { document.getElementById(optionId(sel))?.scrollIntoView({ block: 'nearest' }); }, [sel, hits]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (h: Hit) => { onNavigate(); nav(h.link); };
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(); } }}>
      <div className="dialog palette" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients, environments, contracts, tickets, Jira keys, commitments…" aria-label="Search"
          role="combobox" aria-autocomplete="list" aria-expanded={hits.length > 0} aria-controls={listId} aria-activedescendant={hits[sel] ? optionId(sel) : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.max(0, Math.min(s + 1, hits.length - 1))); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
          }} />
        <ul id={listId} role="listbox" aria-label="Results">
          {busy && <li className="g">Searching…</li>}
          {!busy && q.trim().length >= 2 && hits.length === 0 && <li className="g">No matching records in your scope.</li>}
          {hits.map((h, i) => (
            <li key={h.link + i}>
              {(i === 0 || hits[i - 1].group !== h.group) && <div className="g">{h.group}</div>}
              <a id={optionId(i)} href={h.link} role="option" aria-selected={i === sel} onClick={e => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}>
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
