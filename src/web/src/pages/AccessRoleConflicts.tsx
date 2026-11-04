import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError, get } from '../api';
import { useRight } from '../hooks';
import { ErrorBox, StateMessage } from '../ui/kit';

type AccessRole = { id: number; name: string; isActive: boolean; isLocked: boolean };

type Pair = { firstRoleId: number; secondRoleId: number };
type Policy = { pairs: Pair[]; version: string | null };
const canonical = (pairs: Pair[]) => JSON.stringify(pairs.map(p => [Math.min(p.firstRoleId, p.secondRoleId), Math.max(p.firstRoleId, p.secondRoleId)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]));

export function AccessRoleConflicts({ roles, onDirty }: { roles: AccessRole[]; onDirty: (dirty: boolean) => void }) {
  const editable = useRight('AdminRoles', 'Maintain');
  const query = useQuery({ queryKey: ['admin-role-conflicts'], queryFn: async () => {
    const response = await get<Policy>('/admin/roles/conflicts');
    if (!response || !Array.isArray(response.pairs) || (response.version !== null && typeof response.version !== 'string') ||
      response.pairs.some(pair => !pair || !Number.isInteger(pair.firstRoleId) || !Number.isInteger(pair.secondRoleId)))
      throw new Error('The server returned an invalid incompatible-role policy.');
    return response;
  }, retry: false });
  const [base, setBase] = useState<Policy | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [first, setFirst] = useState(''); const [second, setSecond] = useState('');
  const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false); const [review, setReview] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!base && query.data) { setBase(query.data); setPairs(query.data.pairs); } }, [base, query.data]);
  const dirty = !!base && canonical(pairs) !== canonical(base.pairs);
  useEffect(() => { onDirty(dirty && !saved); }, [dirty, saved, onDirty]);
  const latestChanged = !!base && !!query.data && query.data.version !== base.version;
  const stale = saved || latestChanged;
  const name = (id: number) => roles.find(r => r.id === id)?.name ?? `Role ${id}`;
  const loadLatest = () => { if (!query.data) return; setBase(query.data); setPairs(query.data.pairs); setSaved(false); setReview(false); setError(null); onDirty(false); };
  const add = () => {
    const a = Number(first), b = Number(second);
    if (!a || !b || a === b || pairs.some(p => (p.firstRoleId === a && p.secondRoleId === b) || (p.firstRoleId === b && p.secondRoleId === a))) return;
    setPairs([...pairs, { firstRoleId: Math.min(a, b), secondRoleId: Math.max(a, b) }]); setFirst(''); setSecond(''); setReview(false);
  };
  const save = async () => {
    if (!base) return;
    setBusy(true); setError(null);
    try {
      await api('/admin/roles/conflicts', { method: 'PUT', body: { pairs }, ...(base.version ? { version: base.version } : { headers: { 'If-None-Match': '*' } }) });
      setSaved(true); setReview(false); onDirty(false); await query.refetch();
    } catch (e) { setError(e); } finally { setBusy(false); }
  };
  return <section className="access-panel" id="access-conflicts" aria-labelledby="access-conflicts-title">
    <h2 id="access-conflicts-title">Incompatible roles</h2>
    <p className="hint">Prevent a user from holding both roles in a pair. The server checks existing assignments, directory groups and the recovery administrator before accepting a policy.</p>
    {query.isLoading ? <StateMessage kind="loading" /> : query.error ? <ErrorBox error={query.error} /> : base && <>
      {!!error && <ErrorBox error={error} />}
      {error instanceof ApiError && error.isConflict && <p role="alert">The policy changed on the server; your draft has been retained. Fetch the latest policy before replacing your draft. <button className="linkbtn" onClick={() => void query.refetch()}>Fetch latest policy</button></p>}
      {stale && <div className="notice warn">{saved ? 'Policy saved. ' : 'The policy changed on the server. '}{latestChanged ? <button className="linkbtn" onClick={() => { if (!saved && dirty && !window.confirm('Discard the staged policy changes?')) return; loadLatest(); }}>Load latest policy</button> : <button className="linkbtn" onClick={() => void query.refetch()}>Fetch latest policy</button>}</div>}
      <ul>{pairs.map(pair => <li key={`${pair.firstRoleId}-${pair.secondRoleId}`}>{name(pair.firstRoleId)} + {name(pair.secondRoleId)} {editable && <button className="linkbtn" disabled={busy || stale} onClick={() => { setPairs(pairs.filter(p => p !== pair)); setReview(false); }}>Remove pair {name(pair.firstRoleId)} and {name(pair.secondRoleId)}</button>}</li>)}</ul>
      {pairs.length === 0 && <p>No incompatible role pairs are configured.</p>}
      {editable && <><div className="access-role-fields"><label>First role<select disabled={busy || stale} value={first} onChange={e => setFirst(e.target.value)}><option value="">Select a role</option>{roles.filter(r => !r.isLocked).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <label>Second role<select disabled={busy || stale} value={second} onChange={e => setSecond(e.target.value)}><option value="">Select a role</option>{roles.filter(r => !r.isLocked).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <button className="btn" disabled={busy || stale || !first || !second || first === second || pairs.some(p => [p.firstRoleId, p.secondRoleId].includes(Number(first)) && [p.firstRoleId, p.secondRoleId].includes(Number(second)))} onClick={add}>Add incompatible pair</button></div>
        <div className="access-role-actions"><button className="btn btn-primary" disabled={busy || stale || !dirty} onClick={() => setReview(true)}>Review policy</button><button className="btn" disabled={busy || stale || !dirty} onClick={() => { if (window.confirm('Discard policy changes?')) loadLatest(); }}>Discard policy changes</button></div>
        {review && <div className="override-review" role="region" aria-label="Review incompatible roles"><h3>Review policy</h3><p>The saved policy will contain {pairs.length} incompatible pair{pairs.length === 1 ? '' : 's'}.</p>
          <ul>{pairs.map(p => <li key={`${p.firstRoleId}-${p.secondRoleId}`}>{name(p.firstRoleId)} + {name(p.secondRoleId)}</li>)}</ul>
          <button className="btn" disabled={busy} onClick={() => setReview(false)}>Back to policy</button> <button className="btn btn-primary" disabled={busy || stale} onClick={save}>Confirm and save policy</button></div>}</>}
    </>}
  </section>;
}
