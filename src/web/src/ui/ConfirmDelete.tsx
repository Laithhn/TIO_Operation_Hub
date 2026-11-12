import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { del, get } from '../api';
import { useMe } from '../hooks';
import { hasRight, resourceForRecord, canDeletePath } from '../rights';
import { CASCADE_KINDS, Dialog, errText, useToast, type DeletePreview } from './kit';

type DepItem = DeletePreview['delete'][number]['items'][number];
type DepGroup = DeletePreview['delete'][number];

export function ConfirmDelete({ path, what, onClose, onDone }: { path: string; what: string; onClose: () => void; onDone?: () => void }) {
  const me = useMe().data;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [itemError, setItemError] = useState<Record<string, string>>({});
  const toast = useToast();
  const qc = useQueryClient();
  const m = path.match(/^\/([a-z-]+)\/(\d+)$/);
  const cascade = !!m && CASCADE_KINDS.includes(m[1]);
  const depPath = cascade ? `/dependents/${m![1]}/${m![2]}` : null;
  const deps = useQuery({ queryKey: ['dependents', depPath], queryFn: () => get<DeletePreview>(depPath!), enabled: cascade, staleTime: 0, gcTime: 0 });
  const d = deps.data;
  const hasDeps = !!d && (d.total > 0 || d.unlink.length > 0);
  const canCascade = canDeletePath(me, path) && !!d &&
    d.delete.filter(g => g.main).every(g => hasRight(me, resourceForRecord(g.type), 'Delete')) &&
    d.unlink.filter(g => g.main).every(g => hasRight(me, resourceForRecord(g.type), 'Maintain'));
  const finish = async (msg: string) => { toast(msg); onClose(); onDone?.(); await qc.invalidateQueries(); };
  const go = async () => {
    setBusy(true); setError(null);
    try { await del(path); await finish(`${what} deleted.`); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  // A111: "expected" is the number of related records listed above; the server deletes only that reviewed set.
  const goAll = async () => {
    setBusy(true); setError(null);
    try { const r = await del<{ deleted: number }>(`${depPath!}?expected=${d!.total}`); await finish(`${what} deleted with ${(r?.deleted ?? 1) - 1} related record(s).`); }
    catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };
  const deleteItem = async (g: DepGroup, it: DepItem) => {
    const key = `${g.type}-${it.id}`;
    setItemBusy(key); setItemError(x => ({ ...x, [key]: '' }));
    try { await del(it.deletePath!); toast(`${it.label} deleted.`); await deps.refetch(); }
    catch (e) { setItemError(x => ({ ...x, [key]: errText(e) })); }
    finally { setItemBusy(null); }
  };
  return (
    <Dialog title={`Delete ${what}?`} onClose={onClose} wide={hasDeps}>
      {cascade && deps.isLoading && <div className="state-msg"><span className="spin" /> Checking what belongs to {what}…</div>}
      {cascade && !!deps.error && <div className="notice bad" role="alert">{errText(deps.error)}</div>}
      {(!cascade || (d && !hasDeps)) && <p style={{ marginTop: 0 }}>This permanently removes <b>{what}</b>. The change history keeps a record of the deletion.</p>}
      {d && hasDeps && (
        <>
          <p style={{ marginTop: 0 }}><b>{d.label}</b> still has related records. Delete them one by one below, or delete everything at once.</p>
          {d.total > 0 && <section className="dep-list" aria-label="Records that will be deleted">
            <h3>Will be deleted with it ({d.total})</h3>
            <ul>
              {d.delete.filter(g => g.main).map(g => (
                <li key={g.type}>
                  <button className="dep-head" aria-expanded={open === g.type} onClick={() => setOpen(open === g.type ? null : g.type)} disabled={g.items.length === 0}>
                    <span>{g.label}</span><b>{g.count}</b>{g.items.length > 0 && <span className="caret" aria-hidden="true">{open === g.type ? '▴' : '▾'}</span>}
                  </button>
                  {open === g.type && <ul className="dep-items">
                    {g.items.map(it => {
                      const key = `${g.type}-${it.id}`;
                      return (
                        <li key={key}>
                          {it.link ? <Link to={it.link} target="_blank" rel="noopener">{it.label}</Link> : <span>{it.label}</span>}
                          {it.deletePath && canDeletePath(me, it.deletePath) && <button className="linkbtn danger-link" disabled={itemBusy !== null} onClick={() => deleteItem(g, it)} aria-label={`Delete ${it.label}`}>{itemBusy === key ? 'Deleting…' : 'Delete'}</button>}
                          {itemError[key] && <div className="err">{itemError[key]}</div>}
                        </li>
                      );
                    })}
                    {g.count > g.items.length && <li className="muted">and {g.count - g.items.length} more</li>}
                  </ul>}
                </li>
              ))}
            </ul>
            {d.delete.some(g => !g.main) && <p className="hint dep-also">Also removed: {d.delete.filter(g => !g.main).map(g => `${g.label} (${g.count})`).join(', ')}.</p>}
          </section>}
          {d.unlink.length > 0 && <section className="dep-list" aria-label="Records that will be kept and unlinked">
            <h3>Kept, but no longer linked</h3>
            <ul>{d.unlink.map(g => <li key={g.type}><div className="dep-head static"><span>{g.label}</span><b>{g.count}</b></div></li>)}</ul>
          </section>}
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} /> I understand that {what} and the {d.total} record(s) listed above are deleted permanently.</label>
        </>
      )}
      {hasDeps && !canCascade && <p className="notice">Deleting this structure needs Delete permission for each affected record type and Edit permission for records that will be unlinked.</p>}
      {error && <div className="notice bad" role="alert">{error}</div>}
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        {d && hasDeps
          ? <button className="btn btn-danger" disabled={busy || !understood || !canCascade} onClick={goAll}>{busy ? 'Deleting…' : `Delete everything (${d.total + 1})`}</button>
          : <button className="btn btn-danger" disabled={busy || (cascade && deps.isLoading)} onClick={go}>{busy ? 'Deleting…' : 'Delete'}</button>}
      </div>
    </Dialog>
  );
}
