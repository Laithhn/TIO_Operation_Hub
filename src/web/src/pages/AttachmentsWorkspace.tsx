import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ApiError, del, get, qs, uploadWithProgress } from '../api';
import { fmtDate, fmtDateTime } from '../format';
import { useCan, useMe } from '../hooks';
import { Icon } from '../ui/Icon';
import { ConfirmDelete, Dialog, DL, Person, StateMessage, Tabs, TextInput, useToast } from '../ui/kit';
import {
  checkFiles, DEFAULT_FILTER, fileCategory, fileType, fmtSize, pageList, previewKind, previewMime, SORTS, summarize, viewAttachments,
  type Attachment, type Limits, type SortKey, type Summary, type ViewFilter
} from './attachmentView';

/**
 * A63 (owner request, 29 Oct 2026): the client's Attachments tab as a document workspace — summary cards, search / category / type
 * filters, sorting, paging, row selection, an actions menu per file and a preview pane beside the list. Same endpoints and rules as A46:
 * uploading needs Edit records on the record, the uploader or a holder of Delete records removes a file, and every file is read through
 * the scope-checked download endpoint. Other records keep the compact AttachmentsPanel.
 */

const PAGE_SIZES = [8, 15, 25, 50];
/** Files above this size are not loaded for preview; the user downloads them instead. */
const PREVIEW_MAX = 30 * 1048576;
const TEXT_MAX = 512 * 1024;
const href = (a: Pick<Attachment, 'id'>) => `/api/v1/attachments/${a.id}/download`;
const errorList = (e: unknown) => {
  if (!(e instanceof ApiError)) return [(e as Error).message];
  const fields = Object.values(e.errors ?? {}).flat();
  return fields.length ? fields : [e.detail ?? e.title];
};

export function AttachmentsWorkspace({ recordType, recordId, canEdit, title = 'Attachments' }: { recordType: string; recordId: number; canEdit: boolean; title?: string }) {
  const me = useMe().data!;
  const canDeleteAny = useCan('Delete');
  const qc = useQueryClient();
  const queryKey = useMemo(() => ['attachments', recordType, recordId], [recordType, recordId]);
  const q = useQuery({ queryKey, queryFn: () => get<Attachment[]>(`/attachments${qs({ recordType, recordId })}`) });
  const limits = useQuery({ queryKey: ['attachment-limits'], queryFn: () => get<Limits>('/attachments/limits'), staleTime: 10 * 60_000, enabled: canEdit });
  const reload = useCallback(() => qc.invalidateQueries({ queryKey }), [qc, queryKey]);

  const [filter, setFilter] = useState<ViewFilter>(DEFAULT_FILTER);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(15);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [uploading, setUploading] = useState<File[] | null>(null);
  const [deleting, setDeleting] = useState<Attachment[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const headId = useId();

  const files = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => viewAttachments(files, filter), [files, filter]);
  const summary = useMemo(() => summarize(files), [files]);
  const categories = useMemo(() => [...new Set(files.map(a => fileCategory(a.fileName)))].sort(), [files]);
  const types = useMemo(() => [...new Set(files.map(a => fileType(a.fileName)).filter(Boolean))].sort(), [files]);
  const last = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(page, last);
  const shown = rows.slice((at - 1) * size, at * size);
  const current = files.find(a => a.id === previewId) ?? null;
  const canDelete = (a: Attachment) => (a.uploadedById === me.id && canEdit) || canDeleteAny;
  const picked = files.filter(a => selected.has(a.id));
  const pickedDeletable = picked.filter(canDelete);

  // Selection and preview follow the list: files removed elsewhere drop out.
  useEffect(() => {
    if (!q.data) return;
    const ids = new Set(q.data.map(a => a.id));
    setSelected(s => (Array.from(s).every(id => ids.has(id)) ? s : new Set(Array.from(s).filter(id => ids.has(id)))));
    setPreviewId(p => (p !== null && !ids.has(p) ? null : p));
  }, [q.data]);

  const patch = (p: Partial<ViewFilter>) => { setFilter(f => ({ ...f, ...p })); setPage(1); };
  const toggleSort = (a: SortKey, b: SortKey) => patch({ sort: filter.sort === a ? b : a });
  const ariaSort = (asc: SortKey, desc: SortKey) => (filter.sort === asc ? 'ascending' : filter.sort === desc ? 'descending' : undefined);
  const select = (ids: number[], on: boolean) => setSelected(s => { const n = new Set(s); ids.forEach(id => (on ? n.add(id) : n.delete(id))); return n; });
  const pageIds = shown.map(a => a.id);
  const allOn = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const someOn = pageIds.some(id => selected.has(id));
  const all = useRef<HTMLInputElement>(null);
  useEffect(() => { if (all.current) all.current.indeterminate = someOn && !allOn; }, [someOn, allOn]);

  const openPreview = (a: Attachment) => {
    returnFocus.current = document.querySelector<HTMLElement>(`[data-att-name="${a.id}"]`);
    setPreviewId(a.id);
  };
  const closePreview = useCallback(() => {
    setPreviewId(null);
    const el = returnFocus.current;
    if (el?.isConnected) el.focus();
  }, []);

  // Files downloaded one after the other through the normal download endpoint (there is no archive endpoint).
  const downloadMany = async (list: Attachment[]) => {
    for (let i = 0; i < list.length; i++) {
      const link = document.createElement('a');
      link.href = href(list[i]); link.download = list[i].fileName;
      document.body.appendChild(link); link.click(); link.remove();
      if (i < list.length - 1) await new Promise(r => setTimeout(r, 400));
    }
  };

  const dropProps = canEdit ? {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); },
    onDrop: (e: React.DragEvent) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragOver(false); setUploading(Array.from(e.dataTransfer.files)); } }
  } : {};
  const filtered = filter.search.trim() !== '' || filter.category !== '' || filter.type !== '';

  return (
    <div className={`att-ws${current ? ' with-preview' : ''}`}>
      <section className={`panel att-main${dragOver ? ' drop' : ''}`} aria-labelledby={headId} {...dropProps}>
        <div className="att-head">
          <h2 id={headId}>{title} <span className="att-count">({files.length})</span></h2>
          {canEdit && <button className="btn btn-primary att-upload" onClick={() => setUploading([])}><Icon name="upload" /> Upload files</button>}
        </div>
        {q.isLoading ? <StateMessage kind="loading" /> : q.error ? <div className="att-pad"><StateMessage kind="error">{errorList(q.error).join(' ')}</StateMessage></div> : (<>
          <AttachmentSummary s={summary} />
          {files.length === 0 ? (
            <div className="att-empty">
              <Icon name="file" size={28} />
              <p><b>No files attached to this {recordType.toLowerCase()} yet.</b></p>
              <p className="hint">{canEdit ? 'Upload contracts, scope documents, test reports or any other file the team needs.' : 'Files appear here once someone with Edit records uploads them.'}</p>
              {canEdit && <button className="btn btn-primary" onClick={() => setUploading([])}><Icon name="upload" /> Upload files</button>}
            </div>
          ) : (<>
            <AttachmentToolbar filter={filter} categories={categories} types={types} onChange={patch} onReset={() => { setFilter(DEFAULT_FILTER); setPage(1); }} />
            {selected.size > 0 && (
              <div className="att-bulk" role="region" aria-label="Selected files">
                <b>{selected.size} selected</b>
                <button className="btn btn-sm" onClick={() => downloadMany(picked)}><Icon name="download" size={14} /> Download</button>
                {pickedDeletable.length > 0 && <button className="btn btn-sm btn-danger-outline" onClick={() => setDeleting(pickedDeletable)}><Icon name="trash" size={14} /> Delete{pickedDeletable.length < picked.length ? ` ${pickedDeletable.length} of ${picked.length}` : ''}</button>}
                <button className="linkbtn" onClick={() => setSelected(new Set())}>Clear selection</button>
              </div>
            )}
            {rows.length === 0 ? (
              <div className="att-empty">
                <Icon name="search" size={24} />
                <p><b>No files match the search or filters.</b></p>
                <button className="btn" onClick={() => { setFilter(DEFAULT_FILTER); setPage(1); }}><Icon name="reset" size={14} /> Reset filters</button>
              </div>
            ) : (
              <div className="att-table-wrap">
                <table className="grid att-table">
                  <caption className="sr">{title}{filtered ? `, ${rows.length} of ${files.length} files match the filters` : ''}</caption>
                  <thead>
                    <tr>
                      <th className="att-col-sel"><input type="checkbox" ref={all} checked={allOn} onChange={e => select(pageIds, e.target.checked)} aria-label="Select all files on this page" /></th>
                      <th aria-sort={ariaSort('name-asc', 'name-desc')}><button onClick={() => toggleSort('name-asc', 'name-desc')}>File name <SortMark dir={ariaSort('name-asc', 'name-desc')} /></button></th>
                      <th className="att-col-cat">Category</th>
                      <th className="att-col-type">Type</th>
                      <th className="num" aria-sort={ariaSort('size-asc', 'size-desc')}><button onClick={() => toggleSort('size-desc', 'size-asc')}>Size <SortMark dir={ariaSort('size-asc', 'size-desc')} /></button></th>
                      <th aria-sort={ariaSort('oldest', 'newest')}><button onClick={() => toggleSort('newest', 'oldest')}>Uploaded on <SortMark dir={ariaSort('oldest', 'newest')} /></button></th>
                      <th className="att-col-by">Uploaded by</th>
                      <th className="att-col-act"><span className="sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(a => {
                      const cat = fileCategory(a.fileName);
                      return (
                        <tr key={a.id} className={a.id === previewId ? 'active' : selected.has(a.id) ? 'picked' : undefined}>
                          <td className="att-col-sel"><input type="checkbox" checked={selected.has(a.id)} onChange={e => select([a.id], e.target.checked)} aria-label={`Select ${a.fileName}`} /></td>
                          <td className="att-file">
                            <span className="att-file-in">
                              <FileGlyph name={a.fileName} />
                              <button className="att-name" data-att-name={a.id} title={a.fileName} aria-current={a.id === previewId ? 'true' : undefined} onClick={() => openPreview(a)}>{a.fileName}</button>
                            </span>
                            {a.description && <div className="hint att-desc" title={a.description}>{a.description}</div>}
                          </td>
                          <td className="att-col-cat"><span className="att-cat" data-cat={cat}>{cat}</span></td>
                          <td className="att-col-type">{fileType(a.fileName) || <span className="muted">—</span>}</td>
                          <td className="num nowrap">{fmtSize(a.sizeBytes)}</td>
                          <td className="nowrap">{fmtDateTime(a.createdAt)}</td>
                          <td className="att-col-by"><Person u={a.uploadedBy} gap="Unknown" /></td>
                          <td className="att-col-act"><AttachmentActions a={a} canDelete={canDelete(a)} onPreview={() => openPreview(a)} onDelete={() => setDeleting([a])} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && <AttachmentPager page={at} last={last} size={size} total={rows.length} of={files.length} onPage={setPage} onSize={s => { setSize(s); setPage(1); }} />}
          </>)}
        </>)}
        {dragOver && <div className="att-drop-hint" aria-hidden="true"><Icon name="upload" size={22} /> Drop the files to upload them</div>}
      </section>
      {current && <>
        <div className="att-scrim" onClick={closePreview} aria-hidden="true" />
        <AttachmentPreview key={current.id} a={current} canDelete={canDelete(current)} onClose={closePreview} onDelete={() => setDeleting([current])} />
      </>}
      {uploading && <UploadDialog recordType={recordType} recordId={recordId} limits={limits.data} initial={uploading} onClose={() => setUploading(null)} onDone={reload} />}
      {deleting && deleting.length === 1 && (
        <ConfirmDelete path={`/attachments/${deleting[0].id}`} what={deleting[0].fileName} onClose={() => setDeleting(null)} onDone={() => select([deleting[0].id], false)} />
      )}
      {deleting && deleting.length > 1 && <BulkDeleteDialog files={deleting} onClose={() => setDeleting(null)} onDone={() => setSelected(new Set())} />}
    </div>
  );
}

function SortMark({ dir }: { dir?: 'ascending' | 'descending' }) {
  return <span className={`att-sort${dir ? ' on' : ''}`} aria-hidden="true">{dir === 'ascending' ? '▲' : dir === 'descending' ? '▼' : '↕'}</span>;
}

function AttachmentSummary({ s }: { s: Summary }) {
  const cards = [
    { icon: 'file', value: s.total, label: s.total === 1 ? 'Total file' : 'Total files' },
    { icon: 'layers', value: s.categories, label: s.categories === 1 ? 'Document category' : 'Document categories', hint: 'Kinds of file (PDF, document, spreadsheet…), from the file type' },
    { icon: 'user', value: s.uploaders ?? '—', label: s.uploaders === 1 ? 'Uploader' : 'Uploaders', hint: s.uploaders === null ? 'No file records who uploaded it' : undefined },
    { icon: 'calendar', value: s.latest ? fmtDate(s.latest) : '—', label: 'Latest upload', hint: s.latest ? fmtDateTime(s.latest) : 'Nothing uploaded yet' }
  ];
  return (
    <ul className="att-cards" aria-label="Attachment summary">
      {cards.map(c => (
        <li key={c.icon} className="att-card" title={c.hint}>
          <span className="att-card-ic"><Icon name={c.icon} size={20} /></span>
          <span className="att-card-t"><b className="att-card-v">{c.value}</b><span className="att-card-l">{c.label}</span></span>
        </li>
      ))}
    </ul>
  );
}

function AttachmentToolbar({ filter, categories, types, onChange, onReset }: {
  filter: ViewFilter; categories: string[]; types: string[]; onChange: (p: Partial<ViewFilter>) => void; onReset: () => void;
}) {
  const changed = JSON.stringify(filter) !== JSON.stringify(DEFAULT_FILTER);
  return (
    <div className="att-toolbar" role="search" aria-label="Find attachments">
      <label className="att-search">
        <Icon name="search" />
        <span className="sr">Search by file name</span>
        <input type="search" className="input" placeholder="Search by file name…" value={filter.search} onChange={e => onChange({ search: e.target.value })} />
      </label>
      <select className="input" aria-label="Category" value={filter.category} onChange={e => onChange({ category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="input" aria-label="File type" value={filter.type} onChange={e => onChange({ type: e.target.value })}>
        <option value="">All file types</option>
        {types.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="input" aria-label="Sort by" value={filter.sort} onChange={e => onChange({ sort: e.target.value as SortKey })}>
        {SORTS.map(s => <option key={s.value} value={s.value}>Sort by: {s.label}</option>)}
      </select>
      <button className="btn att-reset" onClick={onReset} disabled={!changed}><Icon name="reset" size={14} /> Reset</button>
    </div>
  );
}

/** The ⋯ menu of a row. Drawn with fixed position so the table's scroll area never cuts it off. Keyboard: arrows move, Escape closes. */
function AttachmentActions({ a, canDelete, onPreview, onDelete }: { a: Attachment; canDelete: boolean; onPreview: () => void; onDelete: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useCallback((focus?: boolean) => { setPos(null); if (focus) btn.current?.focus(); }, []);
  useEffect(() => {
    if (!pos) return;
    list.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const away = (e: MouseEvent) => { if (!list.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    const gone = () => close();
    document.addEventListener('mousedown', away);
    window.addEventListener('resize', gone);
    window.addEventListener('scroll', gone, true);
    return () => { document.removeEventListener('mousedown', away); window.removeEventListener('resize', gone); window.removeEventListener('scroll', gone, true); };
  }, [pos, close]);
  const toggle = () => {
    if (pos) { close(); return; }
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 140;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, right: Math.max(8, window.innerWidth - r.right), up });
  };
  const keys = (e: React.KeyboardEvent) => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  };
  return (
    <>
      <button ref={btn} className="btn btn-ghost att-kebab" aria-haspopup="menu" aria-expanded={!!pos} aria-label={`Actions for ${a.fileName}`} onClick={toggle}><Icon name="more" /></button>
      {pos && (
        <div ref={list} role="menu" aria-label={`Actions for ${a.fileName}`} className="menu-list att-menu" onKeyDown={keys}
          style={{ position: 'fixed', right: pos.right, top: pos.up ? 'auto' : pos.top, bottom: pos.up ? window.innerHeight - pos.top : 'auto' }}>
          <button role="menuitem" onClick={() => { close(); onPreview(); }}><Icon name="eye" size={14} /> Preview</button>
          <a role="menuitem" href={href(a)} download={a.fileName} onClick={() => close(true)}><Icon name="download" size={14} /> Download</a>
          {canDelete && <button role="menuitem" className="danger" onClick={() => { close(); onDelete(); }}><Icon name="trash" size={14} /> Delete</button>}
        </div>
      )}
    </>
  );
}

function AttachmentPager({ page, last, size, total, of, onPage, onSize }: {
  page: number; last: number; size: number; total: number; of: number; onPage: (p: number) => void; onSize: (s: number) => void;
}) {
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <nav className="att-pager" aria-label="Attachment pages">
      <span className="muted">{from}–{to} of {total} attachment{total === 1 ? '' : 's'}{total < of ? ` (filtered from ${of})` : ''}</span>
      <span className="att-pages">
        <button className="btn att-pg" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><Icon name="chevron" size={14} /></button>
        {pageList(page, last).map((p, i) => p === null
          ? <span key={`gap${i}`} className="muted" aria-hidden="true">…</span>
          : <button key={p} className={`btn att-pg${p === page ? ' on' : ''}`} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`} onClick={() => onPage(p)}>{p}</button>)}
        <button className="btn att-pg att-next" onClick={() => onPage(page + 1)} disabled={page >= last} aria-label="Next page"><Icon name="chevron" size={14} /></button>
      </span>
      <label className="att-size">Rows per page:
        <select className="input" value={size} onChange={e => onSize(Number(e.target.value))}>{PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}</select>
      </label>
    </nav>
  );
}

const GLYPH: Record<string, [string, string]> = {
  PDF: ['#c4262e', 'PDF'], Document: ['#2b5797', 'W'], Spreadsheet: ['#1d6f42', 'X'], Presentation: ['#c43e1c', 'P'], Diagram: ['#3955a3', 'V'],
  Image: ['#6d4aa8', 'IMG'], 'E-mail': ['#0e6f8a', '@'], Text: ['#5b6474', 'TXT'], Data: ['#5b6474', '{}'], Archive: ['#8a6a12', 'ZIP'], Other: ['#5b6474', '']
};
/** Small coloured document mark per kind of file; decorative (the type is written in its own column). */
function FileGlyph({ name, size = 16 }: { name: string; size?: number }) {
  const [color, mark] = GLYPH[fileCategory(name)];
  return (
    <svg className="att-glyph" width={size} height={size * 1.2} viewBox="0 0 20 24" aria-hidden="true">
      <path d="M2 1h11l5 5v17H2z" fill={color} />
      <path d="M13 1v5h5" fill="#fff" fillOpacity=".5" />
      {mark && <text x="10" y="18.5" textAnchor="middle" fontSize={mark.length > 2 ? 6.2 : 9} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">{mark}</text>}
    </svg>
  );
}

type Loaded = { status: 'idle' | 'loading' | 'ready' | 'error'; src?: string; text?: string; truncated?: boolean; error?: string };

/** The file through the download endpoint (same session and scope check), typed by its extension so it can never be shown as a web page. */
async function fetchFile(id: number, fileName: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(href({ id }), { credentials: 'same-origin', signal });
  if (!res.ok) throw new Error(res.status === 404 ? 'The file could not be found. It may have been removed, or its content is missing from the storage folder.'
    : res.status === 403 ? 'You do not have access to this file.' : `The file could not be loaded (${res.status}).`);
  return new Blob([await res.arrayBuffer()], { type: previewMime(fileName) });
}
const dataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result as string);
  r.onerror = () => reject(r.error ?? new Error('The file could not be read.'));
  r.readAsDataURL(blob);
});

/**
 * The file beside the list. Images are shown inline as data: addresses (the CSP allows data: images) and text files as plain text.
 * PDF files are not embedded: the CSP has no frame source for them (frame-src falls back to 'self', downloads are attachments), so
 * they open in a new tab or download. Office files have no viewer in the hub and are offered for download.
 */
function AttachmentPreview({ a, canDelete, onClose, onDelete }: { a: Attachment; canDelete: boolean; onClose: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState('preview');
  const [loaded, setLoaded] = useState<Loaded>({ status: 'idle' });
  const head = useRef<HTMLHeadingElement>(null);
  const headId = useId();
  const kind = previewKind(a.fileName);
  const inline = kind === 'image' || kind === 'text';
  const tooLarge = inline && a.sizeBytes > PREVIEW_MAX;
  const type = fileType(a.fileName);
  const { id, fileName } = a;

  useEffect(() => { head.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.scrim')) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  useEffect(() => {
    if (!inline || tooLarge) return;
    const ctl = new AbortController();
    setLoaded({ status: 'loading' });
    (async () => {
      try {
        const blob = await fetchFile(id, fileName, ctl.signal);
        const loadedNow: Loaded = kind === 'text'
          ? { status: 'ready', text: await blob.slice(0, TEXT_MAX).text(), truncated: blob.size > TEXT_MAX }
          : { status: 'ready', src: await dataUrl(blob) };
        if (!ctl.signal.aborted) setLoaded(loadedNow);
      } catch (e) {
        if (!ctl.signal.aborted) setLoaded({ status: 'error', error: (e as Error).message });
      }
    })();
    return () => ctl.abort();
  }, [id, fileName, kind, inline, tooLarge]);

  // The tab is opened at once (inside the click, so pop-up blockers allow it), then shown the file from a short-lived blob: address.
  const [opening, setOpening] = useState<string | null>(null);
  const openInTab = async () => {
    const w = window.open('', '_blank');
    if (!w) { setOpening('The browser blocked the new tab. Allow pop-ups for the hub, or download the file.'); return; }
    w.opener = null;
    w.document.title = fileName;
    setOpening(null);
    try {
      const url = URL.createObjectURL(await fetchFile(id, fileName));
      w.location.replace(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { w.close(); setOpening((e as Error).message); }
  };

  return (
    <aside className="att-preview" aria-labelledby={headId}>
      <header className="att-pv-head">
        <FileGlyph name={a.fileName} size={26} />
        <div className="att-pv-title">
          <h3 id={headId} ref={head} tabIndex={-1}>{a.fileName}</h3>
          <div className="hint">
            {fmtSize(a.sizeBytes)} <span aria-hidden="true">|</span> {type || 'File'} <span aria-hidden="true">|</span> Uploaded {fmtDateTime(a.createdAt)}{a.uploadedBy && <> by {a.uploadedBy.name}</>}
          </div>
        </div>
        <button className="btn btn-ghost att-pv-close" onClick={onClose} aria-label="Close preview"><Icon name="close" /></button>
      </header>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'preview', label: 'Preview' }, { key: 'details', label: 'Details' }, { key: 'versions', label: 'Version history' }]} />
      <div className="att-pv-body" role="tabpanel" aria-label={tab === 'preview' ? 'Preview' : tab === 'details' ? 'Details' : 'Version history'}>
        {tab === 'preview' && (
          tooLarge ? <NoPreview a={a} onOpen={openInTab}>This file is larger than {PREVIEW_MAX / 1048576} MB and is not loaded into the pane. Open it in a new tab or download it.</NoPreview>
          : kind === 'none' ? <NoPreview a={a}><b>No preview for {type ? `${type} files` : 'this file'}.</b> The hub previews images and text files. Download the file to open it in its application.</NoPreview>
          : kind === 'pdf' ? <NoPreview a={a} onOpen={openInTab}><b>PDF files open in a new tab.</b> The hub's security policy does not allow documents to be embedded in the page.</NoPreview>
          : loaded.status === 'error' ? <NoPreview a={a} error>{loaded.error}</NoPreview>
          : loaded.status !== 'ready' ? <StateMessage kind="loading" />
          : kind === 'image' ? <div className="att-img"><img src={loaded.src} alt={`Preview of ${a.fileName}`} /></div>
          : <>
              {loaded.truncated && <div className="notice">Showing the first {TEXT_MAX / 1024} KB. Download the file to see all of it.</div>}
              <pre className="att-text" tabIndex={0} aria-label={`Text of ${a.fileName}`}>{loaded.text}</pre>
            </>
        )}
        {tab === 'details' && (
          <DL items={[
            ['File name', <span className="att-break">{a.fileName}</span>],
            ['File type', `${type || 'No extension'}${a.contentType ? ` (${a.contentType})` : ''}`],
            ['File size', `${fmtSize(a.sizeBytes)} (${a.sizeBytes.toLocaleString('en-GB')} bytes)`],
            ['Category', <>{fileCategory(a.fileName)} <span className="hint">from the file type</span></>],
            ['Uploaded on', fmtDateTime(a.createdAt)],
            ['Uploaded by', <Person u={a.uploadedBy} gap="Unknown" />],
            ['Description', a.description || <span className="muted">None</span>],
            ['SHA-256', <span className="mono att-break">{a.sha256}</span>]
          ]} />
        )}
        {tab === 'versions' && (
          <StateMessage kind="none">
            Version history is not kept for attachments: each upload is stored as its own file. To replace a document, upload the new version and delete the old one when it is no longer needed.
          </StateMessage>
        )}
      </div>
      {opening && <div className="notice bad att-pv-msg" role="alert">{opening}</div>}
      <footer className="att-pv-foot">
        <a className="btn btn-primary" href={href(a)} download={a.fileName}><Icon name="download" size={14} /> Download</a>
        {kind !== 'none' && <button className="btn" onClick={openInTab}><Icon name="external" size={14} /> Open in new tab</button>}
        {canDelete && <button className="btn btn-danger-outline" onClick={onDelete}><Icon name="trash" size={14} /> Delete</button>}
      </footer>
    </aside>
  );
}

function NoPreview({ a, error, onOpen, children }: { a: Attachment; error?: boolean; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <div className={`att-nopreview${error ? ' error' : ''}`} role={error ? 'alert' : undefined}>
      <FileGlyph name={a.fileName} size={36} />
      <p>{children}</p>
      <span className="att-nopreview-act">
        {onOpen && <button className="btn btn-primary" onClick={onOpen}><Icon name="external" size={14} /> Open in new tab</button>}
        <a className="btn" href={href(a)} download={a.fileName}><Icon name="download" size={14} /> Download {fileType(a.fileName) || 'file'}</a>
      </span>
    </div>
  );
}

/** Drag and drop or browse, several files at once, checked against the server's limits before sending; progress while the files are sent. */
function UploadDialog({ recordType, recordId, limits, initial, onClose, onDone }: {
  recordType: string; recordId: number; limits?: Limits; initial: File[]; onClose: () => void; onDone: () => void;
}) {
  const [picked, setPicked] = useState<File[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ctl = useRef<AbortController | null>(null);
  const toast = useToast();
  const busy = progress !== null;

  const choose = (list: File[]) => {
    const fresh = list.filter(f => !picked.some(p => p.name === f.name && p.size === f.size));
    const p = checkFiles(fresh, limits, picked.length);
    setProblems(p);
    if (p.length === 0) setPicked(x => [...x, ...fresh]);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initial.length) choose(initial); }, []);
  useEffect(() => () => ctl.current?.abort(), []);

  const close = useCallback(() => { ctl.current?.abort(); onClose(); }, [onClose]);
  const send = async () => {
    const c = new AbortController();
    ctl.current = c;
    setProblems([]); setProgress(0);
    const form = new FormData();
    form.append('recordType', recordType);
    form.append('recordId', String(recordId));
    if (description.trim()) form.append('description', description.trim());
    picked.forEach(f => form.append('files', f, f.name));
    try {
      await uploadWithProgress('/attachments', form, setProgress, c.signal);
      toast(`${picked.length} file${picked.length === 1 ? '' : 's'} uploaded.`);
      onDone();
      onClose();
    } catch (e) {
      if ((e as Error).name === 'AbortError') { onDone(); return; }
      setProblems(errorList(e));
      setProgress(null);
    } finally { ctl.current = null; }
  };
  const pct = Math.round((progress ?? 0) * 100);

  return (
    <Dialog title="Upload files" onClose={close}>
      <div className={`att-dropzone${drag ? ' over' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!busy) setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) choose(Array.from(e.dataTransfer.files)); }}>
        <Icon name="upload" size={24} />
        <b>Drag and drop files here</b>
        <span className="hint">or</span>
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>Browse files</button>
        <input ref={input} type="file" multiple hidden aria-label={`Choose files to attach to this ${recordType.toLowerCase()}`} accept={limits?.extensions.join(',')}
          onChange={e => { if (e.target.files) choose(Array.from(e.target.files)); e.target.value = ''; }} />
        {limits && <span className="hint att-limits">Up to {limits.maxFilesPerUpload} files per upload, {limits.maxFileMB} MB each. Accepted: {limits.extensions.join(' ')}</span>}
      </div>
      {picked.length > 0 && (
        <ul className="att-picked" aria-label="Files to upload">
          {picked.map((f, i) => (
            <li key={`${f.name}-${f.size}`}>
              <FileGlyph name={f.name} />
              <span className="att-picked-name" title={f.name}>{f.name}</span>
              <span className="muted nowrap">{fmtSize(f.size)}</span>
              <button className="btn btn-ghost att-x" disabled={busy} onClick={() => setPicked(p => p.filter((_, j) => j !== i))} aria-label={`Do not upload ${f.name}`}><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <TextInput label="Description (optional)" value={description} onChange={setDescription} maxLength={500} disabled={busy}
        placeholder="e.g. Signed SLA annex" hint="Saved with every file in this upload." />
      {problems.length > 0 && <ul className="err attach-err" role="alert">{problems.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      {busy && (
        <div className="att-progress-row" role="status">
          <div className="att-progress" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
          <span className="nowrap">{pct < 100 ? `Uploading… ${pct}%` : 'Saving on the server…'}</span>
        </div>
      )}
      <div className="form-actions">
        <button className="btn" onClick={close}>{busy ? 'Cancel upload' : 'Cancel'}</button>
        <button className="btn btn-primary" disabled={busy || picked.length === 0} onClick={send}>
          <Icon name="upload" size={14} /> {busy ? 'Uploading…' : picked.length ? `Upload ${picked.length} file${picked.length === 1 ? '' : 's'}` : 'Upload'}
        </button>
      </div>
    </Dialog>
  );
}

/** Deletes the selected files one by one (each through the normal endpoint and its rights check) and reports any that failed. */
function BulkDeleteDialog({ files, onClose, onDone }: { files: Attachment[]; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const toast = useToast();
  const qc = useQueryClient();
  const go = async () => {
    setBusy(true); setFailed([]);
    const errors: string[] = [];
    let ok = 0;
    for (const a of files) {
      try { await del(`/attachments/${a.id}`); ok++; }
      catch (e) { errors.push(`${a.fileName}: ${errorList(e).join(' ')}`); }
    }
    if (ok) toast(`${ok} file${ok === 1 ? '' : 's'} deleted.`);
    onDone();
    await qc.invalidateQueries();
    setBusy(false);
    if (errors.length) setFailed(errors); else onClose();
  };
  return (
    <Dialog title={`Delete ${files.length} files?`} onClose={onClose}>
      <p style={{ marginTop: 0 }}>This permanently removes these files from the server. The change history keeps a record of each deletion.</p>
      <ul className="att-del-list">{files.map(a => <li key={a.id}><FileGlyph name={a.fileName} /> <span>{a.fileName}</span></li>)}</ul>
      {failed.length > 0 && <ul className="err attach-err" role="alert">{failed.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>{failed.length ? 'Close' : 'Cancel'}</button>
        {!failed.length && <button className="btn btn-danger" disabled={busy} onClick={go}>{busy ? 'Deleting…' : `Delete ${files.length} files`}</button>}
      </div>
    </Dialog>
  );
}
