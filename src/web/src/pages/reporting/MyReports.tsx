import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, get, post } from '../../api';
import { fmtDateTime } from '../../format';
import { useDebounced } from '../../hooks';
import { Icon } from '../../ui/Icon';
import { Badge, DataTable, Dialog, useToast } from '../../ui/kit';
import { TEMPLATES } from './CasesBuilder';
import { apiError } from './shared';

/* A70: saved Cases Report Builder configurations (private, team, shared) with favorites, duplicate, run and delete. */

type Row = { id: number; name: string; description?: string | null; visibility: string; team?: string | null; owner: string; isOwner: boolean; isFavorite: boolean; revision: number;
  updatedAt: string; lastRunAt?: string | null; schedules: number; shares: number };

export function MyReports() {
  const toast = useToast();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [scope, setScope] = useState('');
  const [q, setQ] = useState('');
  const term = useDebounced(q, 300);
  const [remove, setRemove] = useState<Row | null>(null);
  const list = useQuery({ queryKey: ['rc-saved', scope, term], queryFn: () => get<Row[]>(`/reporting/report-definitions?scope=${scope}&q=${encodeURIComponent(term)}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['rc-saved'] });
  const act = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); await refresh(); } catch (e) { toast(apiError(e)?.summary ?? 'The change could not be saved.', true); } };
  return (
    <>
      <div className="rc-catalog-bar">
        <label className="rc-search"><Icon name="search" size={16} /><span className="sr">Search saved reports</span>
          <input className="input" type="search" placeholder="Search saved reports" value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="seg" role="group" aria-label="Show">
          {[['', 'All I can see'], ['mine', 'Mine'], ['shared', 'Shared with me'], ['favorites', 'Favorites']].map(([k, l]) => <button key={k} aria-pressed={scope === k} onClick={() => setScope(k)}>{l}</button>)}
        </div>
        <Link className="btn btn-primary" to="/reporting-center/builder/cases">+ New cases report</Link>
      </div>
      <DataTable<Row> caption="Saved reports" rows={list.data} loading={list.isLoading} error={list.error} rowKey={r => r.id} tools={false} empty={term || scope ? 'nomatch' : 'none'}
        columns={[
          { key: 'fav', header: <span className="sr">Favorite</span>, render: r => <button className="rc-fav" aria-pressed={r.isFavorite} aria-label={r.isFavorite ? `Remove ${r.name} from favorites` : `Add ${r.name} to favorites`}
            onClick={() => act(() => api(`/reporting/report-definitions/${r.id}/favorite`, { method: r.isFavorite ? 'DELETE' : 'PUT' }), r.isFavorite ? 'Removed from favorites.' : 'Added to favorites.')}>{r.isFavorite ? '★' : '☆'}</button> },
          { key: 'name', header: 'Report', priority: 'primary', render: r => <><Link to={`/reporting-center/builder/cases?report=${r.id}`}><b>{r.name}</b></Link>{r.description && <div className="hint">{r.description}</div>}</> },
          { key: 'vis', header: 'Visibility', render: r => <Badge tone={r.visibility === 'Private' ? 'neutral' : 'info'}>{r.visibility === 'Team' ? `Team · ${r.team}` : r.visibility === 'Shared' ? `Shared · ${r.shares}` : 'Private'}</Badge> },
          { key: 'owner', header: 'Owner', render: r => r.isOwner ? 'Me' : r.owner },
          { key: 'updated', header: 'Updated', render: r => <>{fmtDateTime(r.updatedAt)}<div className="hint">revision {r.revision}</div></> },
          { key: 'run', header: 'Last export', render: r => r.lastRunAt ? fmtDateTime(r.lastRunAt) : <span className="muted">Never</span> },
          { key: 'sched', header: 'Schedules', className: 'num', render: r => r.schedules },
          { key: 'actions', header: 'Actions', className: 'row-actions', render: r => <span className="rc-row-actions">
            <Link className="linkbtn" to={`/reporting-center/builder/cases?report=${r.id}`}>Open</Link>
            <button className="linkbtn" onClick={() => act(async () => { const c = await post<{ id: number }>(`/reporting/report-definitions/${r.id}/duplicate`, {}); nav(`/reporting-center/builder/cases?report=${c.id}`); }, 'Report duplicated (private copy).')}>Duplicate</button>
            {r.isOwner && <button className="linkbtn err" onClick={() => setRemove(r)}>Delete</button>}
          </span> }
        ]} />
      <p className="hint">Opening a shared report runs it with your own access: you see only the cases you may see. Only the owner can change or delete a report.</p>
      {remove && <Dialog title="Delete saved report" onClose={() => setRemove(null)}>
        <p>Delete <b>{remove.name}</b>?{remove.schedules > 0 && <> Its <b>{remove.schedules}</b> schedule(s) are deleted as well and make no further runs.</>} Files already generated stay in the export history until they expire.</p>
        <div className="form-actions"><button className="btn" onClick={() => setRemove(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={async () => { await act(() => api(`/reporting/report-definitions/${remove.id}`, { method: 'DELETE' }), 'Report deleted.'); setRemove(null); }}>Delete report</button></div>
      </Dialog>}
    </>
  );
}

export function Templates() {
  return (
    <>
      <p className="hint">Ready-made starting points for the Cases Report Builder. A template opens as a new, unsaved report on your authorized data; adjust it and save it as your own.</p>
      <div className="rc-cards">
        {TEMPLATES.map(t => (
          <article key={t.key} className="rc-card">
            <div className="rc-card-head"><span className="rc-ic" aria-hidden="true"><Icon name="case" size={18} /></span><h3>{t.name}</h3></div>
            <p>{t.description}</p>
            <div className="rc-card-foot"><span className="rc-formats"><span className="chip">Cases</span><span className="chip">Excel</span><span className="chip">PDF</span></span>
              <Link className="btn btn-primary" to={`/reporting-center/builder/cases?template=${t.key}`} aria-label={`Use template ${t.name}`}>Use template</Link></div>
          </article>
        ))}
      </div>
      <p className="hint rc-foot">Templates for the other twelve catalog reports are a later stage: those reports keep their own filters and CSV/Excel export in the library.</p>
    </>
  );
}
