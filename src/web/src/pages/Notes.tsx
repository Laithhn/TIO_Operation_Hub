import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, del, get, post, put, qs, upload, type Paged } from '../api';
import { fmtDateTime } from '../format';
import { Icon } from '../ui/Icon';
import { Dialog, FormError, Panel, SelectInput, StateMessage, TextInput, useToast } from '../ui/kit';
import { useForm } from '../hooks';
import { useClientOptions } from './common';

/**
 * A47: personal notes, OneNote style — notebooks, coloured sections, pages with sub-pages, a rich page editor with autosave, pasted
 * images and files, links to a client or project, search, pinned pages and a recycle bin. Everything here is visible to its owner only.
 */
type SectionT = { id: number; name: string; color: string; sortOrder: number; pages: number; version: string };
type NotebookT = { id: number; name: string; color: string; sortOrder: number; version: string; sections: SectionT[] };
type Tree = { notebooks: NotebookT[]; deleted: number; pinned: number; colors: string[] };
type PageRow = {
  id: number; sectionId: number; title: string; snippet: string; level: number; isPinned: boolean; sortOrder: number; clientId?: number; projectId?: number;
  linkLabel?: string; linkGone: boolean; createdAt: string; updatedAt: string; deletedAt?: string; notebook: string; section: string; sectionColor: string;
};
type PageT = {
  id: number; sectionId: number; title: string; contentHtml: string; level: number; isPinned: boolean; clientId?: number; projectId?: number; linkLabel?: string;
  linkGone: boolean; createdAt: string; updatedAt: string; deletedAt?: string; section: string; sectionColor: string; notebookId: number; notebook: string; version: string;
};
type View = { kind: 'section'; id: number } | { kind: 'search'; q: string } | { kind: 'pinned' } | { kind: 'bin' } | { kind: 'link'; link: string; clientId?: string; projectId?: string };

const COLOR: Record<string, string> = { blue: '#2a78d6', orange: '#eb6834', green: '#1baf7a', purple: '#6250d6', red: '#e34948', teal: '#0f8b8d', yellow: '#eda100', gray: '#7d8494' };
const cssColor = (c: string) => COLOR[c] ?? COLOR.blue;
const errText = (e: unknown) => (e instanceof ApiError ? e.summary : (e as Error).message);

export function NotesWorkspace() {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();
  const toast = useToast();
  const tree = useQuery({ queryKey: ['notes', 'tree'], queryFn: () => get<Tree>('/notes/tree') });
  const notebooks = tree.data?.notebooks ?? [];
  const allSections = notebooks.flatMap(n => n.sections.map(s => ({ ...s, notebook: n })));
  const [view, setView] = useState<View | null>(null);
  const [openBooks, setOpenBooks] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<null | { kind: 'notebook' | 'section'; item?: NotebookT | SectionT; notebookId?: number }>(null);
  const pageId = sp.get('page') ? Number(sp.get('page')) : null;
  useEffect(() => { document.title = 'Notes · TIO Operations Hub'; }, []);
  const openPage = useCallback((id: number | null) => { const n = new URLSearchParams(sp); if (id) n.set('page', String(id)); else n.delete('page'); setSp(n, { replace: true }); }, [sp, setSp]);

  // Start in the section of the requested page, or the first section.
  const current = useQuery({ queryKey: ['notes', 'page', pageId], queryFn: () => get<PageT>(`/notes/pages/${pageId}`), enabled: !!pageId, retry: false });
  useEffect(() => {
    if (view || !tree.data) return;
    const sid = current.data?.sectionId ?? allSections[0]?.id;
    if (current.isLoading) return;
    if (sid) { setView({ kind: 'section', id: sid }); const nb = allSections.find(s => s.id === sid)?.notebook.id; if (nb) setOpenBooks(o => ({ ...o, [nb]: true })); }
  }, [tree.data, current.data, current.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const listParams = view?.kind === 'section' ? { sectionId: view.id } : view?.kind === 'search' ? { q: view.q } : view?.kind === 'pinned' ? { pinned: true }
    : view?.kind === 'bin' ? { deleted: true } : view?.kind === 'link' ? { link: view.link, clientId: view.clientId, projectId: view.projectId } : null;
  const pages = useQuery({ queryKey: ['notes', 'pages', listParams], queryFn: () => get<PageRow[]>(`/notes/pages${qs(listParams ?? {})}`), enabled: !!listParams });
  const refresh = () => qc.invalidateQueries({ queryKey: ['notes'] });

  const newPage = async (level = 0, after?: number) => {
    const sectionId = view?.kind === 'section' ? view.id : current.data?.sectionId ?? allSections[0]?.id;
    if (!sectionId) return;
    try {
      const r = await post<{ id: number }>('/notes/pages', { sectionId, title: '', contentHtml: '', level, afterPageId: after ?? null });
      if (view?.kind !== 'section') setView({ kind: 'section', id: sectionId });
      await refresh();
      openPage(r.id);
    } catch (e) { toast(errText(e)); }
  };

  const sectionName = view?.kind === 'section' ? allSections.find(s => s.id === view.id) : undefined;
  const listTitle = view?.kind === 'section' ? sectionName?.name ?? 'Section' : view?.kind === 'search' ? `Search: “${view.q}”` : view?.kind === 'pinned' ? 'Pinned pages'
    : view?.kind === 'bin' ? 'Recycle bin' : view?.kind === 'link' ? (view.link === 'personal' ? 'Personal pages' : view.link === 'linked' ? 'Pages linked to clients or projects' : 'Linked pages') : '';

  return (
    <div className="notes">
      <aside className="notes-nav" aria-label="Notebooks">
        <form className="notes-search" onSubmit={e => { e.preventDefault(); if (search.trim()) setView({ kind: 'search', q: search.trim() }); }} role="search">
          <Icon name="search" size={14} />
          <input className="input" type="search" placeholder="Search all notes" aria-label="Search all notes" value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <div className="notes-quick">
          <button className={view?.kind === 'pinned' ? 'on' : ''} onClick={() => setView({ kind: 'pinned' })}>★ Pinned <span>{tree.data?.pinned ?? 0}</span></button>
          <button className={view?.kind === 'link' && view.link === 'personal' ? 'on' : ''} onClick={() => setView({ kind: 'link', link: 'personal' })}>Personal</button>
          <button className={view?.kind === 'link' && view.link === 'linked' ? 'on' : ''} onClick={() => setView({ kind: 'link', link: 'linked' })}>Clients &amp; projects</button>
          <button className={view?.kind === 'bin' ? 'on' : ''} onClick={() => setView({ kind: 'bin' })}>🗑 Recycle bin <span>{tree.data?.deleted ?? 0}</span></button>
        </div>
        <div className="notes-books">
          {tree.isLoading && <StateMessage kind="loading" />}
          {notebooks.map(nb => (
            <div key={nb.id} className="notes-book">
              <div className="notes-book-head">
                <button className="notes-book-toggle" aria-expanded={!!openBooks[nb.id]} onClick={() => setOpenBooks(o => ({ ...o, [nb.id]: !o[nb.id] }))}>
                  <span className="nb-icon" style={{ background: cssColor(nb.color) }} aria-hidden="true" /> <span className="nb-name">{nb.name}</span>
                </button>
                <ItemMenu label={`Notebook ${nb.name}`} items={[
                  { label: 'New section', onClick: () => setDialog({ kind: 'section', notebookId: nb.id }) },
                  { label: 'Rename or colour…', onClick: () => setDialog({ kind: 'notebook', item: nb }) },
                  { label: 'Delete notebook…', danger: true, onClick: async () => {
                    const n = nb.sections.reduce((a, s) => a + s.pages, 0);
                    if (!window.confirm(`Delete notebook “${nb.name}” with ${nb.sections.length} section(s) and ${n} page(s)? This cannot be undone.`)) return;
                    try { await del(`/notes/notebooks/${nb.id}`); await refresh(); setView(null); } catch (e) { toast(errText(e)); }
                  } }
                ]} />
              </div>
              {openBooks[nb.id] && (
                <ul className="notes-sections">
                  {nb.sections.map(s => (
                    <li key={s.id} className={view?.kind === 'section' && view.id === s.id ? 'on' : ''}>
                      <button className="notes-section" onClick={() => setView({ kind: 'section', id: s.id })} aria-current={view?.kind === 'section' && view.id === s.id ? 'true' : undefined}>
                        <span className="sec-tab" style={{ background: cssColor(s.color) }} aria-hidden="true" />{s.name}<span className="count">{s.pages}</span>
                      </button>
                      <ItemMenu label={`Section ${s.name}`} items={[
                        { label: 'Rename, colour or move…', onClick: () => setDialog({ kind: 'section', item: s, notebookId: nb.id }) },
                        { label: 'Delete section…', danger: true, onClick: async () => {
                          if (!window.confirm(`Delete section “${s.name}” and its ${s.pages} page(s)? This cannot be undone.`)) return;
                          try { await del(`/notes/sections/${s.id}`); await refresh(); setView(null); } catch (e) { toast(errText(e)); }
                        } }
                      ]} />
                    </li>
                  ))}
                  <li><button className="linkbtn notes-add" onClick={() => setDialog({ kind: 'section', notebookId: nb.id })}>+ Section</button></li>
                </ul>
              )}
            </div>
          ))}
          <button className="linkbtn notes-add" onClick={() => setDialog({ kind: 'notebook' })}>+ Notebook</button>
        </div>
        <p className="hint notes-private"><Icon name="lock" size={12} /> Only you can see your notes.</p>
      </aside>

      <section className="notes-pages" aria-label="Pages">
        <div className="notes-pages-head">
          {sectionName && <span className="sec-tab" style={{ background: cssColor(sectionName.color) }} aria-hidden="true" />}
          <h2>{listTitle}</h2>
          {view?.kind === 'section' && <button className="btn btn-sm btn-primary" onClick={() => newPage()}>+ Page</button>}
          {view?.kind === 'bin' && (pages.data?.length ?? 0) > 0 && <button className="btn btn-sm" onClick={async () => {
            if (!window.confirm('Delete every page in the recycle bin permanently?')) return;
            await post('/notes/recycle-bin/empty'); await refresh(); openPage(null);
          }}>Empty</button>}
        </div>
        <PageList rows={pages.data} loading={pages.isLoading} view={view} selected={pageId} onOpen={openPage} onRefresh={refresh}
          sections={allSections.map(s => ({ id: s.id, label: `${s.notebook.name} › ${s.name}` }))} onSubPage={id => newPage(1, id)} />
      </section>

      <main className="notes-editor-pane" aria-label="Page">
        {!pageId ? (
          <div className="notes-empty">
            <p>Select a page or create one.</p>
            {allSections.length > 0 && <button className="btn btn-primary" onClick={() => newPage()}>+ New page</button>}
          </div>
        ) : current.error ? <div className="notes-empty"><StateMessage kind="error">This page does not exist or is not yours.</StateMessage></div>
          : current.data ? <Editor key={current.data.id} page={current.data} onSaved={() => qc.invalidateQueries({ queryKey: ['notes', 'pages'] })} onChanged={refresh} />
          : <StateMessage kind="loading" />}
      </main>

      {dialog?.kind === 'notebook' && <NameDialog title={dialog.item ? 'Notebook' : 'New notebook'} colors={tree.data?.colors ?? []} item={dialog.item}
        onSave={async v => { if (dialog.item) await put(`/notes/notebooks/${dialog.item.id}`, v); else { const r = await post<{ id: number }>('/notes/notebooks', v); setOpenBooks(o => ({ ...o, [r.id]: true })); } await refresh(); }}
        onClose={() => setDialog(null)} />}
      {dialog?.kind === 'section' && <NameDialog title={dialog.item ? 'Section' : 'New section'} colors={tree.data?.colors ?? []} item={dialog.item}
        notebooks={dialog.item ? notebooks.map(n => ({ value: String(n.id), label: n.name })) : undefined} notebookId={dialog.notebookId}
        onSave={async v => {
          if (dialog.item) await put(`/notes/sections/${dialog.item.id}`, { ...v, notebookId: v.notebookId ?? dialog.notebookId });
          else { const r = await post<{ id: number }>('/notes/sections', { ...v, notebookId: dialog.notebookId }); setView({ kind: 'section', id: r.id }); }
          await refresh();
        }} onClose={() => setDialog(null)} />}
    </div>
  );
}

function PageList({ rows, loading, view, selected, onOpen, onRefresh, sections, onSubPage }: {
  rows?: PageRow[]; loading: boolean; view: View | null; selected: number | null; onOpen: (id: number | null) => void; onRefresh: () => Promise<unknown>;
  sections: { id: number; label: string }[]; onSubPage: (afterId: number) => void;
}) {
  const toast = useToast();
  const [dragId, setDragId] = useState<number | null>(null);
  const [moving, setMoving] = useState<PageRow | null>(null);
  const inBin = view?.kind === 'bin';
  const reorder = view?.kind === 'section';
  if (loading) return <StateMessage kind="loading" />;
  if (!rows || rows.length === 0) return <p className="notes-none">{inBin ? 'The recycle bin is empty.' : view?.kind === 'section' ? 'No pages yet. Use + Page.' : 'No pages found.'}</p>;
  const drop = async (target: PageRow) => {
    if (!dragId || dragId === target.id) return;
    const ids = rows.map(r => r.id).filter(id => id !== dragId);
    ids.splice(ids.indexOf(target.id), 0, dragId);
    setDragId(null);
    try { await post('/notes/pages/reorder', { ids }); await onRefresh(); } catch (e) { toast(errText(e)); }
  };
  const save = async (r: PageRow, body: object) => {
    try { const p = await get<PageT>(`/notes/pages/${r.id}`); await put(`/notes/pages/${r.id}`, body, p.version); await onRefresh(); } catch (e) { toast(errText(e)); }
  };
  return (
    <>
      <ul className="notes-page-list">
        {rows.map(r => (
          <li key={r.id} className={`${selected === r.id ? 'on' : ''}${r.level ? ' sub' : ''}`} draggable={reorder} onDragStart={() => setDragId(r.id)}
            onDragOver={e => { if (reorder) e.preventDefault(); }} onDrop={() => drop(r)}>
            <button className="notes-page" onClick={() => onOpen(r.id)} aria-current={selected === r.id ? 'true' : undefined}>
              <span className="t">{r.isPinned && <span className="pin" aria-label="Pinned">★ </span>}{r.title || 'Untitled page'}</span>
              <span className="d">{fmtDateTime(r.updatedAt)}{view?.kind !== 'section' && <> · <span className="sec-dot" style={{ background: cssColor(r.sectionColor) }} />{r.section}</>}</span>
              {r.snippet && <span className="s">{r.snippet}</span>}
              {r.linkLabel && <span className={`link-chip${r.linkGone ? ' gone' : ''}`}>{r.projectId ? '▣ ' : '◆ '}{r.linkLabel}{r.linkGone ? ' (deleted)' : ''}</span>}
            </button>
            {inBin ? (
              <span className="notes-row-actions">
                <button className="linkbtn" onClick={async () => { await post(`/notes/pages/${r.id}/restore`); await onRefresh(); }}>Restore</button>
                <button className="linkbtn danger-link" onClick={async () => { if (!window.confirm('Delete this page permanently?')) return; await del(`/notes/pages/${r.id}/permanent`); onOpen(null); await onRefresh(); }}>Delete</button>
              </span>
            ) : (
              <ItemMenu label={`Page ${r.title || 'Untitled page'}`} items={[
                { label: r.isPinned ? 'Unpin' : 'Pin', onClick: () => save(r, { isPinned: !r.isPinned }) },
                ...(r.level === 0 ? [{ label: 'Add sub-page', onClick: () => onSubPage(r.id) }, { label: 'Make sub-page', onClick: () => save(r, { level: 1 }) }] : [{ label: 'Promote to page', onClick: () => save(r, { level: 0 }) }]),
                { label: 'Move to section…', onClick: () => setMoving(r) },
                { label: 'Delete (to recycle bin)', danger: true, onClick: async () => { await del(`/notes/pages/${r.id}`); if (selected === r.id) onOpen(null); await onRefresh(); } }
              ]} />
            )}
          </li>
        ))}
      </ul>
      {moving && <MoveDialog page={moving} sections={sections} onClose={() => setMoving(null)} onMove={async sectionId => { await save(moving, { sectionId }); setMoving(null); }} />}
    </>
  );
}

function MoveDialog({ page, sections, onClose, onMove }: { page: PageRow; sections: { id: number; label: string }[]; onClose: () => void; onMove: (id: number) => Promise<void> }) {
  const [to, setTo] = useState(String(page.sectionId));
  return (
    <Dialog title={`Move “${page.title || 'Untitled page'}”`} onClose={onClose}>
      <div className="form-grid"><SelectInput label="To section" wide value={to} onChange={setTo} options={sections.map(s => ({ value: String(s.id), label: s.label }))} empty={null} /></div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={to === String(page.sectionId)} onClick={() => onMove(Number(to))}>Move</button></div>
    </Dialog>
  );
}

function NameDialog({ title, item, colors, notebooks, notebookId, onSave, onClose }: {
  title: string; item?: { name: string; color: string }; colors: string[]; notebooks?: { value: string; label: string }[]; notebookId?: number;
  onSave: (v: { name: string; color: string; notebookId?: number }) => Promise<void>; onClose: () => void;
}) {
  const f = useForm({ name: item?.name ?? '', color: item?.color ?? 'blue', notebookId: notebookId ? String(notebookId) : '' });
  const save = async () => { const ok = await f.submit(async v => { await onSave({ name: v.name, color: v.color, notebookId: v.notebookId ? Number(v.notebookId) : undefined }); return true; }); if (ok) onClose(); };
  return (
    <Dialog title={title} onClose={onClose}>
      <FormError error={f.error} fields={['name', 'color', 'notebookId']} />
      <div className="form-grid">
        <TextInput label="Name" required wide value={f.values.name} onChange={v => f.set('name', v)} error={f.fieldError('name')} maxLength={100} />
        <div className="field wide"><span className="flabel">Colour</span>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {colors.map(c => <button key={c} type="button" role="radio" aria-checked={f.values.color === c} aria-label={c} className="swatch" style={{ background: cssColor(c) }} onClick={() => f.set('color', c)} />)}
          </div>
        </div>
        {notebooks && <SelectInput label="Notebook" wide value={f.values.notebookId} onChange={v => f.set('notebookId', v)} options={notebooks} empty={null} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy || !f.values.name.trim()} onClick={save}>Save</button></div>
    </Dialog>
  );
}

type MenuItemT = { label: string; onClick: () => void; danger?: boolean };
function ItemMenu({ label, items }: { label: string; items: MenuItemT[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  return (
    <div className="item-menu" ref={ref}>
      <button className="item-menu-btn" aria-label={`Actions for ${label}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>⋯</button>
      {open && <div className="menu-pop" role="menu">{items.map(i => <button key={i.label} role="menuitem" className={i.danger ? 'danger' : ''} onClick={() => { setOpen(false); i.onClick(); }}>{i.label}</button>)}</div>}
    </div>
  );
}

// ---------------- the page editor ----------------
type SaveState = 'saved' | 'saving' | 'dirty' | 'conflict' | 'error';

function Editor({ page, onSaved, onChanged }: { page: PageT; onSaved: () => void; onChanged: () => Promise<unknown> }) {
  const [title, setTitle] = useState(page.title);
  const [state, setState] = useState<SaveState>('saved');
  const [savedAt, setSavedAt] = useState(page.updatedAt);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState({ label: page.linkLabel, gone: page.linkGone, clientId: page.clientId, projectId: page.projectId });
  const body = useRef<HTMLDivElement>(null);
  const version = useRef(page.version);
  const timer = useRef<number | null>(null);
  const pending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const readOnly = !!page.deletedAt;

  useEffect(() => {
    if (body.current) body.current.innerHTML = page.contentHtml;
    // Colours as inline styles (kept by the server), not <font> tags.
    try { document.execCommand('styleWithCSS', false, 'true'); } catch { /* older browsers */ }
    if (!page.title && !readOnly) document.getElementById('note-title')?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async () => {
    if (readOnly || !body.current) return;
    if (pending.current) { schedule(); return; }
    pending.current = true;
    setState('saving');
    try {
      const r = await put<{ version: string; updatedAt: string }>(`/notes/pages/${page.id}`, { title: (document.getElementById('note-title') as HTMLInputElement)?.value ?? title, contentHtml: body.current.innerHTML }, version.current);
      version.current = r.version;
      setSavedAt(r.updatedAt);
      setState(s => (s === 'saving' ? 'saved' : s));
      onSaved();
    } catch (e) {
      setState(e instanceof ApiError && e.status === 412 ? 'conflict' : 'error');
      if (!(e instanceof ApiError && e.status === 412)) toast(errText(e));
    } finally { pending.current = false; }
  }, [page.id, title, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const schedule = useCallback(() => {
    setState('dirty');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; void save(); }, 800);
  }, [save]);
  // Save what is pending when leaving the page.
  useEffect(() => () => { if (timer.current) { window.clearTimeout(timer.current); void save(); } }, [save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (timer.current || pending.current) { e.preventDefault(); } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const exec = (cmd: string, value?: string) => { body.current?.focus(); document.execCommand(cmd, false, value); schedule(); };
  const block = (tag: string) => exec('formatBlock', tag);
  const insertHtml = (html: string) => exec('insertHTML', html);
  const checklist = () => {
    insertHtml('<ul data-checklist="true"><li data-checked="false">To do</li></ul><p><br></p>');
  };
  const table = () => insertHtml('<table><tbody>' + '<tr><td><br></td><td><br></td><td><br></td></tr>'.repeat(3) + '</tbody></table><p><br></p>');
  const addLink = () => { const url = window.prompt('Link address (https://…)'); if (url && /^(https?:|mailto:)/i.test(url.trim())) exec('createLink', url.trim()); };

  const uploadFiles = async (files: File[]) => {
    for (const f of files) {
      const form = new FormData();
      form.append('file', f, f.name || 'pasted-image.png');
      try {
        const r = await upload<{ id: number; fileName: string; url: string; isImage: boolean }>(`/notes/pages/${page.id}/files`, form);
        insertHtml(r.isImage ? `<img src="${r.url}" alt="${r.fileName.replace(/"/g, '')}">` : `<a href="${r.url}" data-file="true">📎 ${r.fileName.replace(/</g, '&lt;')}</a>&nbsp;`);
      } catch (e) { toast(`${f.name}: ${errText(e)}`); }
    }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length) { e.preventDefault(); void uploadFiles(files); }
  };
  const onDrop = (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length) { e.preventDefault(); void uploadFiles(files); }
  };
  // Ticking a checklist item.
  const onClick = (e: React.MouseEvent) => {
    const li = (e.target as HTMLElement).closest('ul[data-checklist] > li') as HTMLElement | null;
    if (li && !readOnly && e.nativeEvent.offsetX < 22) { li.dataset.checked = li.dataset.checked === 'true' ? 'false' : 'true'; schedule(); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (timer.current) window.clearTimeout(timer.current); timer.current = null; void save(); }
    if (e.key === 'Tab') { e.preventDefault(); exec(e.shiftKey ? 'outdent' : 'indent'); }
  };

  const status = { saved: `Saved ${fmtDateTime(savedAt)}`, saving: 'Saving…', dirty: 'Unsaved changes', conflict: 'Changed in another window', error: 'Not saved' }[state];
  return (
    <article className="note">
      <div className="note-crumb">
        <span className="sec-dot" style={{ background: cssColor(page.sectionColor) }} /> {page.notebook} › {page.section}
        <span className={`note-status ${state}`} role="status">{readOnly ? 'In the recycle bin (read-only)' : status}</span>
      </div>
      {state === 'conflict' && <div className="notice warn">This page was changed in another window or tab. <button className="linkbtn" onClick={() => window.location.reload()}>Reload the latest version</button> (copy your recent text first if you need it).</div>}
      <input id="note-title" className="note-title" placeholder="Page title" aria-label="Page title" value={title} readOnly={readOnly} maxLength={300}
        onChange={e => { setTitle(e.target.value); schedule(); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); body.current?.focus(); } }} />
      <div className="note-meta">
        <span>{fmtDateTime(page.createdAt)}</span>
        <span className="note-link">
          {link.label ? <span className={`link-chip${link.gone ? ' gone' : ''}`}>{link.projectId ? '▣ Project ' : link.clientId ? '◆ Client ' : ''}{link.label}{link.gone ? ' (deleted)' : ''}</span> : <span className="link-chip personal">Personal</span>}
          {link.clientId && !link.gone && <Link to={link.projectId ? `/projects/${link.projectId}` : `/clients/${link.clientId}`}>Open</Link>}
          {!readOnly && <button className="linkbtn" onClick={() => setLinkOpen(true)}>Change link</button>}
        </span>
      </div>
      {!readOnly && (
        <div className="note-toolbar" role="toolbar" aria-label="Formatting">
          <button onClick={() => exec('undo')} title="Undo (Ctrl+Z)" aria-label="Undo">↶</button>
          <button onClick={() => exec('redo')} title="Redo (Ctrl+Y)" aria-label="Redo">↷</button>
          <span className="sep" />
          <select aria-label="Paragraph style" onChange={e => { block(e.target.value); e.target.value = ''; }} defaultValue="">
            <option value="" disabled>Style</option><option value="P">Normal text</option><option value="H1">Heading 1</option><option value="H2">Heading 2</option><option value="H3">Heading 3</option><option value="PRE">Code block</option><option value="BLOCKQUOTE">Quote</option>
          </select>
          <button onClick={() => exec('bold')} title="Bold (Ctrl+B)" aria-label="Bold"><b>B</b></button>
          <button onClick={() => exec('italic')} title="Italic (Ctrl+I)" aria-label="Italic"><i>I</i></button>
          <button onClick={() => exec('underline')} title="Underline (Ctrl+U)" aria-label="Underline"><u>U</u></button>
          <button onClick={() => exec('strikeThrough')} title="Strikethrough" aria-label="Strikethrough"><s>S</s></button>
          <button onClick={() => exec('hiliteColor', '#fff1a6')} title="Highlight" aria-label="Highlight"><span className="hl">ab</span></button>
          <label className="color-pick" title="Text colour"><span style={{ color: '#d03b3b' }}>A</span>
            <input type="color" aria-label="Text colour" onChange={e => exec('foreColor', e.target.value)} defaultValue="#d03b3b" /></label>
          <span className="sep" />
          <button onClick={() => exec('insertUnorderedList')} title="Bulleted list" aria-label="Bulleted list">• ≡</button>
          <button onClick={() => exec('insertOrderedList')} title="Numbered list" aria-label="Numbered list">1. ≡</button>
          <button onClick={checklist} title="To-do list" aria-label="To-do list">☑</button>
          <button onClick={() => exec('outdent')} title="Decrease indent (Shift+Tab)" aria-label="Decrease indent">⇤</button>
          <button onClick={() => exec('indent')} title="Increase indent (Tab)" aria-label="Increase indent">⇥</button>
          <span className="sep" />
          <button onClick={addLink} title="Link" aria-label="Insert link">🔗</button>
          <button onClick={table} title="Table" aria-label="Insert table">▦</button>
          <button onClick={() => exec('insertHorizontalRule')} title="Line" aria-label="Insert line">―</button>
          <button onClick={() => fileInput.current?.click()} title="Insert picture or file (or paste / drop it on the page)" aria-label="Insert picture or file">📎</button>
          <input ref={fileInput} type="file" multiple hidden aria-label="Choose a picture or file to insert" onChange={e => { if (e.target.files) void uploadFiles(Array.from(e.target.files)); e.target.value = ''; }} />
          <button onClick={() => exec('removeFormat')} title="Clear formatting" aria-label="Clear formatting">⌫ A</button>
        </div>
      )}
      <div ref={body} className="note-body" contentEditable={!readOnly} suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Page content"
        data-placeholder="Start typing. Paste or drop pictures and files here." onInput={schedule} onPaste={onPaste} onDrop={onDrop} onClick={onClick} onKeyDown={onKey} />
      {linkOpen && <LinkDialog page={page} current={link} onClose={() => setLinkOpen(false)}
        onSaved={async l => { setLink({ label: l.linkLabel ?? undefined, gone: false, clientId: l.clientId ?? undefined, projectId: l.projectId ?? undefined }); version.current = l.version; await onChanged(); }} />}
    </article>
  );
}

function LinkDialog({ page, current, onClose, onSaved }: {
  page: PageT; current: { clientId?: number; projectId?: number }; onClose: () => void;
  onSaved: (l: { clientId?: number | null; projectId?: number | null; linkLabel?: string | null; version: string }) => Promise<void>;
}) {
  const clients = useClientOptions();
  const f = useForm({ kind: current.projectId ? 'project' : current.clientId ? 'client' : 'personal', clientId: current.clientId ? String(current.clientId) : '', projectId: current.projectId ? String(current.projectId) : '' });
  const v = f.values;
  const projects = useQuery({ queryKey: ['projects-of', v.clientId], queryFn: () => get<Paged<{ id: number; code: string; name: string }>>(`/projects?clientId=${v.clientId}&pageSize=100`), enabled: !!v.clientId });
  const save = async () => {
    const ok = await f.submit(async () => {
      const body = v.kind === 'personal' ? {} : v.kind === 'client' ? { clientId: Number(v.clientId) || null } : { clientId: Number(v.clientId) || null, projectId: Number(v.projectId) || null };
      const r = await put<{ clientId?: number; projectId?: number; linkLabel?: string; version: string }>(`/notes/pages/${page.id}/link`, body);
      await onSaved(r);
      return true;
    });
    if (ok) onClose();
  };
  return (
    <Dialog title="Link this page" onClose={onClose}>
      <FormError error={f.error} fields={['clientId', 'projectId']} />
      <div className="radio-row" role="radiogroup" aria-label="Link">
        {[['personal', 'Personal (no link)'], ['client', 'A client'], ['project', 'A project']].map(([k, l]) => (
          <label key={k} className="check"><input type="radio" name="note-link" checked={v.kind === k} onChange={() => f.set('kind', k)} /> {l}</label>
        ))}
      </div>
      {v.kind !== 'personal' && (
        <div className="form-grid">
          <SelectInput label="Client" required wide value={v.clientId} onChange={x => { f.set('clientId', x); f.set('projectId', ''); }} options={clients} error={f.fieldError('clientId')} />
          {v.kind === 'project' && <SelectInput label="Project" required wide value={v.projectId} onChange={x => f.set('projectId', x)} error={f.fieldError('projectId')}
            options={(projects.data?.items ?? []).map(p => ({ value: String(p.id), label: `${p.code} · ${p.name}` }))} />}
        </div>
      )}
      <p className="hint">Linking only helps you find the page from the client or project. It stays private: nobody else sees it.</p>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={f.busy || (v.kind !== 'personal' && !v.clientId) || (v.kind === 'project' && !v.projectId)} onClick={save}>Save link</button></div>
    </Dialog>
  );
}

/** "My notes" on a client or project page: the signed-in user's own pages linked to it, and a quick new page. */
export function MyNotesPanel({ clientId, projectId }: { clientId?: number; projectId?: number }) {
  const nav = useNavigate();
  const toast = useToast();
  const params = projectId ? { projectId } : { clientId };
  const q = useQuery({ queryKey: ['notes', 'pages', params], queryFn: () => get<PageRow[]>(`/notes/pages${qs(params)}`) });
  const create = async () => {
    try { const r = await post<{ id: number }>('/notes/pages', { title: '', contentHtml: '', clientId: clientId ?? null, projectId: projectId ?? null }); nav(`/notes?page=${r.id}`); }
    catch (e) { toast(errText(e)); }
  };
  const rows = useMemo(() => q.data ?? [], [q.data]);
  return (
    <Panel title={`My notes${rows.length ? ` (${rows.length})` : ''}`} actions={<button className="btn" onClick={create}>+ New note</button>} pad={false}>
      <p className="hint" style={{ padding: '8px 12px 0', margin: 0 }}><Icon name="lock" size={12} /> Private: only you see your notes.</p>
      {q.isLoading ? <StateMessage kind="loading" /> : rows.length === 0 ? <div className="panel-body"><StateMessage kind="none">You have no notes linked here.</StateMessage></div> : (
        <ul className="my-notes">{rows.map(r => (
          <li key={r.id}><Link to={`/notes?page=${r.id}`}><b>{r.title || 'Untitled page'}</b></Link> <span className="muted">· {r.notebook} › {r.section} · {fmtDateTime(r.updatedAt)}</span>
            {r.snippet && <div className="hint">{r.snippet}</div>}</li>))}
        </ul>
      )}
    </Panel>
  );
}
