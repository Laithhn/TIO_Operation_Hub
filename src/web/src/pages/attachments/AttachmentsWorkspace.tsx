import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError, del, get, qs } from '../../api';
import { fmtDate, fmtDateTime } from '../../format';
import { useMe, usePermission, useRefresh } from '../../hooks';
import { Icon } from '../../ui/Icon';
import { Dialog, ErrorBox, Person, StateMessage, useToast } from '../../ui/kit';
import { AttachmentPreview, downloadUrl } from './AttachmentPreview';
import { AttachmentUpload } from './AttachmentUpload';
import './attachments.css';
import { applyView, canRemove, categoryOf, DEFAULT_VIEW, facets, fmtSize, SORTS, summarize, typeOf, type Attachment, type Limits, type SortKey, type View } from './model';

const PAGE_SIZES = [8, 15, 25, 50];

/** The workspace's own width (it sits in pages of different widths) is wide enough for the list and the preview side by side;
 *  a narrower one opens the preview as a drawer. */
function useWide(ref: React.RefObject<HTMLElement | null>, min = 1000) {
  const [on, setOn] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOn(el.clientWidth >= min);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, min]);
  return on;
}

/** How the empty state and labels name the record ("this server", "this contract"). */
const RECORD_LABEL: Record<string, string> = { Asset: 'server', Installation: 'application installation' };

function Summary({ rows }: { rows: Attachment[] }) {
  const s = summarize(rows);
  const cards: [string, string, React.ReactNode, React.ReactNode?][] = [
    ['attachment', 'Total files', s.total],
    ['FOLDER', 'Document categories', s.categories, 'by file type'],
    ['users', 'Uploaders', s.uploaders, s.unknownUploader ? 'some uploaders unknown' : undefined],
    ['calendar', 'Latest upload', s.latest ? fmtDate(s.latest.createdAt) : '—', s.latest?.uploadedBy?.name]
  ];
  return (
    <ul className="att-summary" aria-label="Attachment summary">
      {cards.map(([icon, name, value, hint]) => (
        <li key={name}>
          <span className="att-summary-icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
          <div><div className="att-summary-label">{name}</div><div className="att-summary-value">{value}</div>{hint && <div className="hint">{hint}</div>}</div>
        </li>
      ))}
    </ul>
  );
}

type Action = { label: string; icon: string; onClick: () => void; danger?: boolean; hidden?: boolean };

/**
 * The row's ⋮ menu. The list is placed on the page (fixed position from the button) so the table's scroll area never cuts it off.
 * Keyboard: Enter/Space opens, arrows move, Escape closes and returns to the button.
 */
function RowActions({ name, actions }: { name: string; actions: Action[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const shown = actions.filter(a => !a.hidden);
  // Follows the button while the page or the table scrolls (the focus on the button may itself scroll the table).
  const place = useCallback(() => {
    if (!btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 150;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, left: Math.max(8, r.right - 180), up });
  }, []);
  useLayoutEffect(() => { if (open) place(); else setPos(null); }, [open, place]);
  const placed = open && pos !== null;
  useEffect(() => { if (placed) list.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true }); }, [placed]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { document.removeEventListener('mousedown', away); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open, place]);
  const keys = (e: React.KeyboardEvent) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    if (e.key === 'Tab') setOpen(false);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(at + 1) % items.length]?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(at - 1 + items.length) % items.length]?.focus(); }
  };
  if (shown.length === 0) return null;
  return (
    <>
      <button ref={btn} type="button" className="btn btn-ghost att-icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${name}`} onClick={() => setOpen(o => !o)}>
        <Icon name="MOREV" size={18} />
      </button>
      {open && pos && createPortal(
        <div ref={list} className="menu-list att-menu" role="menu" aria-label={`Actions for ${name}`} onKeyDown={keys}
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: pos.up ? 'translateY(-100%)' : undefined }}>
          {shown.map(a => (
            <button key={a.label} type="button" role="menuitem" className={a.danger ? 'danger' : undefined} onClick={() => { setOpen(false); a.onClick(); }}>
              <Icon name={a.icon} size={16} /> {a.label}
            </button>
          ))}
        </div>, document.body)}
    </>
  );
}

/** Confirmation before files leave the server (one from the row menu or the preview, several from the selection). */
function ConfirmRemove({ files, onClose, onDone }: { files: Attachment[]; onClose: () => void; onDone: (removed: number[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const toast = useToast();
  const refresh = useRefresh();
  const one = files.length === 1;
  const go = async () => {
    setBusy(true); setError([]);
    const removed: number[] = [];
    const failed: string[] = [];
    for (const a of files) {
      try { await del(`/attachments/${a.id}`); removed.push(a.id); }
      catch (e) { failed.push(`${a.fileName}: ${e instanceof ApiError ? (e.detail ?? e.title) : (e as Error).message}`); }
    }
    await refresh();
    setBusy(false);
    if (removed.length) toast(one ? `${files[0].fileName} deleted.` : `${removed.length} file(s) deleted.`);
    onDone(removed);
    if (failed.length) setError(failed); else onClose();
  };
  return (
    <Dialog title={one ? `Delete ${files[0].fileName}?` : `Delete ${files.length} files?`} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{one ? <>This permanently removes <b className="att-wrap">{files[0].fileName}</b> from the server.</> : 'This permanently removes these files from the server:'} The change history keeps a record of the deletion.</p>
      {!one && <ul className="att-confirm-list">{files.map(a => <li key={a.id} className="att-wrap">{a.fileName}</li>)}</ul>}
      {error.length > 0 && <ul className="notice bad att-upload-err" role="alert">{error.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>{error.length ? 'Close' : 'Cancel'}</button>
        {!error.length && <button className="btn btn-danger" disabled={busy} onClick={go}>{busy ? 'Deleting…' : one ? 'Delete' : `Delete ${files.length} files`}</button>}
      </div>
    </Dialog>
  );
}

function Pages({ page, size, total, onPage, onSize }: { page: number; size: number; total: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const last = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  // The current page with two neighbours each side, and the first and last.
  const near = [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), last])].filter(p => p >= 1 && p <= last).sort((a, b) => a - b);
  return (
    <nav className="pager att-pager" aria-label="Attachment pages">
      <span aria-live="polite">{from}–{Math.min(total, page * size)} of {total} file{total === 1 ? '' : 's'}</span>
      <span className="right">
        <label>Rows per page: <select value={size} onChange={e => onSize(Number(e.target.value))}>{PAGE_SIZES.map(n => <option key={n}>{n}</option>)}</select></label>
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
        {near.map((p, i) => (
          <span key={p} style={{ display: 'contents' }}>
            {i > 0 && p - near[i - 1] > 1 && <span aria-hidden="true">…</span>}
            <button type="button" className={p === page ? 'att-page on' : 'att-page'} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}>{p}</button>
          </span>
        ))}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= last}>Next</button>
      </span>
    </nav>
  );
}

/**
 * A46 files of any record (A74 layout, on every page that takes attachments): summary, search / filters / sort, a selectable list with a
 * ⋮ menu per file, pages, and the document preview beside the list. Edit records (and, for clients, client scope) uploads; the uploader
 * or a holder of Delete records deletes, as the server checks. The server stores neither a category nor versions; the category is the
 * file's kind. The files themselves are on the server's disk (configured folder); only their details are in the database.
 */
export function AttachmentsWorkspace({ recordType, recordId, scopeAllowed = true, title = 'Attachments', what = RECORD_LABEL[recordType] ?? recordType.toLowerCase() }: {
  recordType: string; recordId: number; scopeAllowed?: boolean; title?: string; what?: string;
}) {
  const me = useMe().data!;
  const root = useRef<HTMLDivElement>(null);
  const titleId = 'att-title-' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const canEdit = usePermission('OtherOperations', 'Maintain') && scopeAllowed;
  const canDeleteAny = usePermission('OtherOperations', 'Delete') && scopeAllowed;
  const q = useQuery({ queryKey: ['attachments', recordType, recordId], queryFn: () => get<Attachment[]>(`/attachments${qs({ recordType, recordId })}`) });
  const limits = useQuery({ queryKey: ['attachment-limits'], queryFn: () => get<Limits>('/attachments/limits'), staleTime: 10 * 60_000, enabled: canEdit });
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openId, setOpenId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<Attachment[] | null>(null);
  const wide = useWide(root);
  const closeUpload = useCallback(() => setUploading(false), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  const rows = useMemo(() => q.data ?? [], [q.data]);
  const shown = useMemo(() => applyView(rows, view), [rows, view]);
  const { categories, types } = useMemo(() => facets(rows), [rows]);
  const last = Math.max(1, Math.ceil(shown.length / size));
  const cur = Math.min(page, last);
  const pageRows = shown.slice((cur - 1) * size, cur * size);
  const open = rows.find(a => a.id === openId) ?? null;
  const removable = (a: Attachment) => canRemove(a, me.id, canEdit, canDeleteAny);
  const filtered = view.q.trim() !== '' || view.category !== '' || view.type !== '';

  // Files that left the list (deleted here or elsewhere) leave the selection and the preview.
  useEffect(() => {
    const ids = new Set(rows.map(a => a.id));
    setSelected(s => (Array.from(s).every(id => ids.has(id)) ? s : new Set(Array.from(s).filter(id => ids.has(id)))));
    if (openId !== null && q.data && !ids.has(openId)) setOpenId(null);
  }, [rows, openId, q.data]);
  const patch = (p: Partial<View>) => { setView(v => ({ ...v, ...p })); setPage(1); };
  const closePreview = useCallback(() => {
    const id = openId;
    setOpenId(null);
    // Back to the file name that opened it.
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-att-open="${id}"]`)?.focus());
  }, [openId]);

  const pageIds = pageRows.map(a => a.id);
  const allOnPage = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someOnPage = pageIds.some(id => selected.has(id));
  const toggle = (id: number) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected(s => { const n = new Set(s); pageIds.forEach(id => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const selectedRows = rows.filter(a => selected.has(a.id));
  const selectedRemovable = selectedRows.filter(removable);
  const headCheck = useRef<HTMLInputElement>(null);
  useEffect(() => { if (headCheck.current) headCheck.current.indeterminate = someOnPage && !allOnPage; }, [someOnPage, allOnPage]);

  const download = (a: Attachment) => {
    const link = document.createElement('a');
    link.href = downloadUrl(a); link.download = a.fileName;
    document.body.appendChild(link); link.click(); link.remove();
  };

  return (
    <div ref={root} className={`att-ws${open && wide ? ' with-preview' : ''}`}>
      <section className="panel att-main" aria-labelledby={titleId}>
        <div className="panel-head att-head">
          <h2 id={titleId} tabIndex={-1}>{title}{q.data ? ` (${rows.length})` : ''}</h2>
          {canEdit && <div className="actions"><button type="button" className="btn btn-primary" onClick={() => setUploading(true)}><Icon name="IMPORT" size={16} /> Upload files</button></div>}
        </div>
        {q.isLoading ? <StateMessage kind="loading" /> : q.error ? <div className="panel-body"><ErrorBox error={q.error} /></div> : (
          <>
            <Summary rows={rows} />
            {rows.length === 0 ? (
              <div className="att-empty">
                <Icon name="attachment" size={32} />
                <p><b>No files attached to this {what} yet.</b></p>
                <p className="muted">{canEdit ? 'Upload contracts, reports, diagrams, e-mails and other documents to keep them with the record.' : 'Files appear here once someone with the Edit records right uploads them.'}</p>
                {canEdit && <button type="button" className="btn btn-primary" onClick={() => setUploading(true)}><Icon name="IMPORT" size={16} /> Upload files</button>}
              </div>
            ) : (
              <>
                <div className="att-toolbar" role="search" aria-label="Find attachments">
                  <span className="att-search">
                    <Icon name="search" size={16} />
                    <input className="input" type="search" placeholder="Search by file name…" aria-label="Search by file name" value={view.q} onChange={e => patch({ q: e.target.value })} />
                  </span>
                  <select className="input" aria-label="Category" value={view.category} onChange={e => patch({ category: e.target.value })}>
                    <option value="">All categories</option>{categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                  <select className="input" aria-label="File type" value={view.type} onChange={e => patch({ type: e.target.value })}>
                    <option value="">All file types</option>{types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="att-sort"><span className="muted">Sort</span>
                    <select className="input" value={view.sort} onChange={e => patch({ sort: e.target.value as SortKey })}>{SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
                  </label>
                  <button type="button" className="btn" onClick={() => { setView(DEFAULT_VIEW); setPage(1); }} disabled={!filtered && view.sort === DEFAULT_VIEW.sort}><Icon name="RESET" size={16} /> Reset</button>
                  <span className="muted att-count" aria-live="polite">{filtered ? `${shown.length} of ${rows.length} files` : ''}</span>
                </div>
                {selected.size > 0 && (
                  <div className="att-selbar" role="status">
                    <b>{selected.size} selected</b>
                    {selectedRemovable.length > 0 && <button type="button" className="btn btn-danger-outline" onClick={() => setRemoving(selectedRemovable)}>
                      <Icon name="delete" size={16} /> Delete{selectedRemovable.length < selected.size ? ` ${selectedRemovable.length} you may delete` : ' selected'}</button>}
                    <button type="button" className="linkbtn" onClick={() => setSelected(new Set())}>Clear selection</button>
                  </div>
                )}
                {shown.length === 0 ? (
                  <div className="att-empty small">
                    <p><b>No files match the search or filters.</b></p>
                    <button type="button" className="btn" onClick={() => { setView(v => ({ ...DEFAULT_VIEW, sort: v.sort })); setPage(1); }}>Clear search and filters</button>
                  </div>
                ) : (
                  <div className="att-table-wrap">
                    <table className="grid att-table">
                      <caption className="sr">Attachments of this {what}{filtered ? `, ${shown.length} matching` : ''}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="att-col-check"><input ref={headCheck} type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all files on this page" /></th>
                          <th scope="col">File name</th>
                          <th scope="col" className="att-col-cat">Category</th>
                          <th scope="col" className="att-col-type">Type</th>
                          <th scope="col" className="num">Size</th>
                          <th scope="col" className="att-col-date">Uploaded on</th>
                          <th scope="col" className="att-col-by">Uploaded by</th>
                          <th scope="col" className="att-col-act"><span className="sr">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map(a => {
                          const cat = categoryOf(a.fileName);
                          return (
                            <tr key={a.id} className={`${selected.has(a.id) ? 'is-selected' : ''}${a.id === openId ? ' is-open' : ''}`}>
                              <td className="att-col-check"><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${a.fileName}`} /></td>
                              <td className="att-col-name"><div className="att-name-cell">
                                <span className={`att-ficon cat-${cat.key}`} aria-hidden="true"><Icon name={cat.icon} size={18} /></span>
                                <span className="att-name-wrap">
                                  <button type="button" className="linkbtn att-name" data-att-open={a.id} title={a.fileName} aria-label={`Preview ${a.fileName}`} onClick={() => setOpenId(a.id)}>{a.fileName}</button>
                                  {a.description && <span className="hint att-desc-line" title={a.description}>{a.description}</span>}
                                </span>
                              </div></td>
                              <td className="att-col-cat"><span className={`att-cat cat-${cat.key}`}>{cat.label}</span></td>
                              <td className="att-col-type mono">{typeOf(a.fileName)}</td>
                              <td className="num nowrap">{fmtSize(a.sizeBytes)}</td>
                              <td className="att-col-date nowrap">{fmtDateTime(a.createdAt)}</td>
                              <td className="att-col-by"><Person u={a.uploadedBy} gap="Unknown" /></td>
                              <td className="att-col-act">
                                <RowActions name={a.fileName} actions={[
                                  { label: 'Preview', icon: 'VISIBLE', onClick: () => setOpenId(a.id) },
                                  { label: 'Download', icon: 'download', onClick: () => download(a) },
                                  { label: 'Delete', icon: 'delete', danger: true, hidden: !removable(a), onClick: () => setRemoving([a]) }
                                ]} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {shown.length > 0 && <Pages page={cur} size={size} total={shown.length} onPage={setPage} onSize={s => { setSize(s); setPage(1); }} />}
              </>
            )}
          </>
        )}
      </section>
      {open && <AttachmentPreview a={open} drawer={!wide} canDelete={removable(open)} onDelete={() => setRemoving([open])} onClose={closePreview} />}
      {uploading && <AttachmentUpload recordType={recordType} recordId={recordId} what={what} limits={limits.data} onClose={closeUpload} />}
      {removing && <ConfirmRemove files={removing} onClose={closeRemove}
        onDone={ids => {
          setSelected(s => new Set(Array.from(s).filter(id => !ids.includes(id))));
          // The button that opened the dialog may have left with the file: the focus goes to the list's heading.
          if (ids.length) requestAnimationFrame(() => document.getElementById(titleId)?.focus());
        }} />}
    </div>
  );
}
