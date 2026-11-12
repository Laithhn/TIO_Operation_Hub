import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { del, get } from '../api';
import { CASCADE_KINDS, Dialog, errText, StateMessage, useToast, type DeletePreview, type DeleteTarget } from './kit';

/** Deletes several records one by one, each with the same rules and rights as deleting it alone. One that is refused does not stop the rest, and says why. */
export function BulkDelete({ items, onClose, onDone }: { items: DeleteTarget[]; onClose: () => void; onDone: () => void }) {
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const depOf = (path: string) => { const m = path.match(/^\/([a-z-]+)\/(\d+)$/); return m && CASCADE_KINDS.includes(m[1]) ? `/dependents/${m[1]}/${m[2]}` : null; };
  const previews = useQuery({ queryKey: ['bulk-dependents', items.map(i => i.path)], staleTime: 0, gcTime: 0, queryFn: async () =>
    Object.fromEntries(await Promise.all(items.map(async i => { const dep = depOf(i.path); return [i.path, dep ? await get<DeletePreview>(dep).catch(() => null) : null] as const; }))) });
  const related = (i: DeleteTarget) => previews.data?.[i.path]?.total ?? 0;
  const totalRelated = items.reduce((n, i) => n + related(i), 0);
  const go = async () => {
    setBusy(true);
    let deleted = 0;
    const out: Record<string, string> = {};
    for (const i of items) {
      const p = previews.data?.[i.path];
      try { await del(p && (p.total > 0 || p.unlink.length > 0) ? depOf(i.path)! : i.path); out[i.path] = ''; deleted++; }
      catch (e) { out[i.path] = errText(e); }
      setResults({ ...out });
    }
    setBusy(false);
    setFinished(true);
    await qc.invalidateQueries();
    toast(deleted === items.length ? `${deleted} record(s) deleted.` : `${deleted} of ${items.length} record(s) deleted.`, deleted < items.length);
    if (deleted === items.length) { onDone(); onClose(); }
  };
  return (
    <Dialog title={`Delete ${items.length} record(s)`} onClose={busy ? () => {} : onClose}>
      <div className="notice warn">This permanently deletes these records{totalRelated > 0 ? `, and ${totalRelated} related record(s) that belong to them` : ''}. It cannot be undone.</div>
      {previews.isLoading && <StateMessage kind="loading" />}
      <ul className="bulk-list">{items.map(i => <li key={i.path}>
        <span>{i.what}{related(i) > 0 && <span className="hint"> · {related(i)} related</span>}</span>
        {i.path in results && (results[i.path] ? <span className="err">{results[i.path]}</span> : <span className="hint">Deleted</span>)}
      </li>)}</ul>
      {!finished && <label className="check"><input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} /> I understand these records will be permanently deleted.</label>}
      <div className="form-actions">
        <button className="btn" disabled={busy} onClick={onClose}>{finished ? 'Close' : 'Cancel'}</button>
        {!finished && <button className="btn btn-danger" disabled={!understood || busy || previews.isLoading} onClick={go}>{busy ? 'Deleting…' : `Delete ${items.length} record(s)`}</button>}
      </div>
    </Dialog>
  );
}

