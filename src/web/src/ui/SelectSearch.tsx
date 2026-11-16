// A118: every dropdown in the hub is searchable. Mounted once (main.tsx), this replaces the browser's own option list of any
// single-choice native <select> with a list that has a filter box: click the dropdown, or focus it and press Enter, Space,
// Alt+Down or F4, or just start typing. The <select> stays the real control, so its label, value, form behaviour, React
// onChange and Playwright selectOption are unchanged; choosing an option sets its value and fires the usual change event.
// A <select> with the data-native-select attribute (or multiple / size > 1) keeps the browser's own list.
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { filterItems, listItem, stepActive, type ListItem } from './selectFilter';

const searchable = (t: EventTarget | null): t is HTMLSelectElement =>
  t instanceof HTMLSelectElement && !t.multiple && t.size <= 1 && !t.disabled && !t.hasAttribute('data-native-select');

const readItems = (s: HTMLSelectElement): ListItem[] => Array.from(s.options).filter(o => !o.hidden).map(o => {
  const g = o.parentElement instanceof HTMLOptGroupElement ? o.parentElement : null;
  return listItem(o.index, o.value, o.label || o.text, o.disabled || !!g?.disabled, g?.label);
});

/** Under the dropdown, or above it when there is clearly more room there; at least 240 px wide and inside the window. */
function place(s: HTMLSelectElement): CSSProperties | null {
  const r = s.getBoundingClientRect();
  if (!s.isConnected || (!r.width && !r.height)) return null;
  const width = Math.min(Math.max(r.width, 240), 480, innerWidth - 16);
  const left = Math.max(8, Math.min(r.left, innerWidth - width - 8));
  const below = innerHeight - r.bottom - 10, above = r.top - 10;
  const up = below < 220 && above > below;
  const maxHeight = Math.max(140, Math.min(380, up ? above : below));
  return up ? { left, width, maxHeight, bottom: innerHeight - r.top + 2 } : { left, width, maxHeight, top: r.bottom + 2 };
}

export function SelectSearch() {
  const [sel, setSel] = useState<HTMLSelectElement | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = useRef<HTMLSelectElement | null>(null);
  const id = useId();

  const open = useCallback((s: HTMLSelectElement, q = '') => { current.current = s; setSel(s); setQuery(q); }, []);
  const close = useCallback((refocus: boolean) => {
    const s = current.current;
    current.current = null; setSel(null); setQuery('');
    if (refocus && s?.isConnected) s.focus();
  }, []);

  // Document-wide: open on a click or key on any dropdown, close on a click or focus elsewhere, follow scrolling.
  useEffect(() => {
    const inside = (t: EventTarget | null) => t instanceof Node && !!popup.current?.contains(t);
    const down = (e: MouseEvent) => {
      if (inside(e.target)) return;
      if (e.button === 0 && searchable(e.target)) {
        e.preventDefault(); // no browser list; focus goes to the filter box instead
        if (current.current === e.target) close(true); else open(e.target);
      } else if (current.current) close(false);
    };
    const key = (e: KeyboardEvent) => {
      if (!searchable(e.target) || e.isComposing || current.current) return;
      const k = e.key;
      const typed = k.length === 1 && k !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey;
      if (!typed && k !== 'Enter' && k !== ' ' && k !== 'F4' && !(e.altKey && (k === 'ArrowDown' || k === 'ArrowUp'))) return;
      e.preventDefault();
      open(e.target, typed ? k : '');
    };
    const changed = (e: Event) => { if (e.target === current.current) close(false); }; // e.g. set by script or a test while open
    const focus = (e: FocusEvent) => { if (current.current && e.target !== current.current && !inside(e.target)) close(false); };
    const moved = (e: Event) => { if (current.current && !inside(e.target)) refresh(); };
    document.addEventListener('mousedown', down, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('change', changed, true);
    document.addEventListener('focusin', focus, true);
    document.addEventListener('scroll', moved, true);
    window.addEventListener('resize', moved);
    return () => {
      document.removeEventListener('mousedown', down, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('change', changed, true);
      document.removeEventListener('focusin', focus, true);
      document.removeEventListener('scroll', moved, true);
      window.removeEventListener('resize', moved);
    };
  }, [open, close]);

  // While open: focus the filter box, and follow options that load or change, or the dropdown being disabled or removed.
  useEffect(() => {
    if (!sel) return;
    input.current?.focus();
    const end = input.current?.value.length ?? 0;
    input.current?.setSelectionRange(end, end);
    const watch = new MutationObserver(() => { if (!sel.isConnected || sel.disabled) close(false); else refresh(); });
    watch.observe(sel, { childList: true, subtree: true, attributes: true, characterData: true });
    const gone = new MutationObserver(() => { if (!sel.isConnected) close(false); });
    gone.observe(document.body, { childList: true, subtree: true });
    return () => { watch.disconnect(); gone.disconnect(); };
  }, [sel, close]);

  // The chosen option is active when the list opens; the first match once the user types.
  useLayoutEffect(() => {
    if (!sel) return;
    const list = filterItems(readItems(sel), query);
    const chosen = query ? -1 : list.findIndex(it => it.index === sel.selectedIndex && !it.disabled);
    setActive(chosen >= 0 ? chosen : stepActive(list, -1, 1));
  }, [sel, query]);

  const optionId = (i: number) => `${id}-o${i}`;
  useEffect(() => { if (active >= 0) document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' }); }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sel) return null;
  const style = place(sel);
  if (!style) return null;
  const list = filterItems(readItems(sel), query);
  const listId = `${id}-list`;

  const choose = (it: ListItem | undefined) => {
    if (!it || it.disabled) return;
    const s = sel;
    close(true);
    if (s.selectedIndex === it.index) return;
    s.selectedIndex = it.index;
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  };

  return createPortal(
    <div ref={popup} className="select-search" style={style} onMouseDown={e => { if (e.target !== input.current) e.preventDefault(); }}>
      <input ref={input} className="select-search-input" type="text" value={query} placeholder="Type to filter…" autoComplete="off" spellCheck={false}
        role="combobox" aria-label="Filter the list" aria-expanded="true" aria-autocomplete="list" aria-controls={listId}
        aria-activedescendant={list[active] ? optionId(active) : undefined}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          const k = e.key;
          const step = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : k === 'PageDown' ? 10 : k === 'PageUp' ? -10 : 0;
          if (step && !(e.altKey && k === 'ArrowUp')) { e.preventDefault(); setActive(a => stepActive(list, a, step)); }
          else if (k === 'Enter' || (e.altKey && k === 'ArrowUp')) { e.preventDefault(); e.stopPropagation(); choose(list[active]); }
          else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
          else if (k === 'Tab') close(true); // focus is back on the dropdown, so the browser moves on from there
        }} />
      <ul id={listId} role="listbox" aria-label="Options">
        {list.map((it, i) => (
          <Fragment key={it.index}>
            {it.group !== undefined && (i === 0 || list[i - 1].group !== it.group) && <li role="presentation" className="g">{it.group}</li>}
            <li id={optionId(i)} role="option" aria-selected={i === active} aria-disabled={it.disabled || undefined}
              className={it.index === sel.selectedIndex ? 'current' : undefined}
              onClick={() => choose(it)} onMouseMove={() => { if (i !== active && !it.disabled) setActive(i); }}>{it.label || ' '}</li>
          </Fragment>
        ))}
        {list.length === 0 && <li role="presentation" className="none">No matching options</li>}
      </ul>
    </div>,
    document.body
  );
}
