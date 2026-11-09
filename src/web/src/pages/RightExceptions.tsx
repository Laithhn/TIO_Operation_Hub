import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, get, put } from '../api';
import { ErrorBox, StateMessage } from '../ui/kit';
import { hasDuplicateExceptions, exceptionChanges, scopeDescription, scopeId, scopeKind, toRequest, withScope, type RightException, type ScopeKind, type ScopeTargets } from './exceptionScope';

type ExceptionSet = { version: string; exceptions: RightException[]; scopableRights?: string[] };
type CatalogRight = { key: string; label: string; module: string; isActive: boolean };

export function RightExceptions({ userId, catalog, onDirty }: { userId: number; catalog: CatalogRight[]; onDirty: (dirty: boolean) => void }) {
  // Lives above the draft: a successful save reloads a new version, which remounts the draft and would lose its confirmation.
  const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['right-exceptions', userId], queryFn: () => get<ExceptionSet>(`/admin/users/${userId}/right-exceptions`), retry: false, refetchOnWindowFocus: false });
  if (query.isLoading) return <StateMessage kind="loading" />;
  if (query.error) return <ErrorBox error={query.error} />;
  if (!query.data) return null;
  return <ExceptionDraft key={`${userId}:${query.data.version}`} userId={userId} saved={query.data} catalog={catalog} onDirty={onDirty} reload={() => query.refetch()} message={message} setMessage={setMessage} />;
}

function ExceptionDraft({ userId, saved, catalog, onDirty, reload, message, setMessage }: { userId: number; saved: ExceptionSet; catalog: CatalogRight[]; onDirty: (dirty: boolean) => void; reload: () => Promise<unknown>; message: string; setMessage: (message: string) => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<RightException[]>(() => saved.exceptions.map(o => ({ ...o })));
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const active = catalog.filter(p => p.isActive && p.module.toLowerCase() !== 'administration');
  const scopable = useMemo(() => new Set((saved.scopableRights ?? []).map(k => k.toLowerCase())), [saved.scopableRights]);
  const targets = useQuery({ queryKey: ['scope-targets'], queryFn: () => get<ScopeTargets>('/admin/scope-targets'), enabled: scopable.size > 0, retry: false });
  const [pendingKind, setPendingKind] = useState<Record<number, ScopeKind>>({});
  const kindOf = (row: RightException, index: number): ScopeKind => pendingKind[index] ?? scopeKind(row);
  const incomplete = draft.some((o, i) => kindOf(o, i) !== 'global' && scopeId(o) === null);
  const invalid = draft.some(o => !o.key || (o.expiresAt !== null && Number.isNaN(Date.parse(o.expiresAt)))) || hasDuplicateExceptions(draft) || incomplete;
  const changes = exceptionChanges(saved.exceptions, draft);
  const dirty = changes.length > 0 || hasDuplicateExceptions(draft);
  const change = (next: RightException[]) => { setDraft(next); onDirty(exceptionChanges(saved.exceptions, next).length > 0 || hasDuplicateExceptions(next)); setReview(false); setError(null); setMessage(''); };
  const update = (index: number, patch: Partial<RightException>) => change(draft.map((row, i) => i === index ? { ...row, ...patch } : row));
  const save = async () => {
    setSaving(true); setError(null);
    try {
      await put(`/admin/users/${userId}/right-exceptions`, { exceptions: toRequest(draft) }, saved.version);
      onDirty(false);
      setMessage('Exceptions saved.');
      await Promise.all([client.invalidateQueries({ queryKey: ['right-exceptions', userId] }), client.invalidateQueries({ queryKey: ['admin-user-access', userId] }), client.invalidateQueries({ queryKey: ['me'] })]);
    } catch (e) { setError(e); }
    finally { setSaving(false); }
  };
  const reloadLatest = async () => {
    if (dirty && !window.confirm('Discard your unsaved exceptions and reload the latest version?')) return;
    onDirty(false); setError(null); await reload();
  };
  return <div className="access-overrides">
    <h3>Individual exceptions</h3>
    <p>Allow or deny a right from the catalog for this user. A deny takes precedence over role access. An expiry uses your device’s local time; the server enforces the saved instant. Removing an exception restores role-based evaluation. Administration permissions are assigned through roles.</p>
    <p className="hint">Self changes and exceptions for protected administrative accounts are rejected by the server. Mandatory restrictions and prerequisite rights continue to apply.</p>
    {scopable.size > 0 && <p className="hint">Only some rights can be limited to one client, project or team; the “Applies to” field appears for those. A limited allow applies only when the whole record lies in that scope and never adds data access. A limited deny applies when any part of the record touches it.</p>}
    {targets.error != null && <ErrorBox error={targets.error} />}
    {message && <p role="status">{message}</p>}
    {error != null && <><ErrorBox error={error} />{error instanceof ApiError && error.isConflict && <button type="button" className="btn" onClick={reloadLatest}>Reload latest</button>}</>}
    {draft.length === 0 && <p className="hint">No direct exceptions. Roles alone decide this person's rights.</p>}
    {draft.map((row, index) => <div className="override-row" key={index}>
      <label>Right<select value={row.key} onChange={e => { const key = e.target.value; setPendingKind(({ [index]: _, ...rest }) => rest); change(draft.map((r, i) => i !== index ? r : scopable.has(key.toLowerCase()) ? { ...r, key } : { ...withScope(r, 'global', null), key })); }} disabled={saving}>
        <option value="">Select a right</option>
        {row.key && !active.some(p => p.key === row.key) && <option value={row.key}>{row.key} (not in active catalog)</option>}
        {[...new Set(active.map(p => p.module))].sort().map(module => <optgroup key={module} label={module}>{active.filter(p => p.module === module).map(p => <option key={p.key} value={p.key}>{p.label} — {p.key}</option>)}</optgroup>)}
      </select></label>
      <label>Effect<select value={row.effect} onChange={e => update(index, { effect: e.target.value as RightException['effect'] })} disabled={saving}><option value="Allow">Allow</option><option value="Deny">Deny</option></select></label>
      {scopable.has(row.key.toLowerCase()) && <div className="override-scope">
        <label>Applies to<select value={kindOf(row, index)} disabled={saving} onChange={e => { const kind = e.target.value as ScopeKind; setPendingKind(p => ({ ...p, [index]: kind })); update(index, withScope(row, kind, null)); }}>
          <option value="global">Everywhere in their data scope</option><option value="client">One client</option><option value="project">One project</option><option value="team">One internal team</option></select></label>
        {kindOf(row, index) !== 'global' && <label>{kindOf(row, index) === 'client' ? 'Client' : kindOf(row, index) === 'project' ? 'Project' : 'Team'}<select value={scopeId(row) ?? ''} disabled={saving} onChange={e => update(index, withScope(row, kindOf(row, index), e.target.value ? Number(e.target.value) : null))}>
          <option value="">Select…</option>
          {scopeId(row) !== null && !(kindOf(row, index) === 'client' ? targets.data?.clients : kindOf(row, index) === 'project' ? targets.data?.projects : targets.data?.teams)?.some(t => t.id === scopeId(row)) && <option value={scopeId(row)!}>{scopeDescription(row)}</option>}
          {(kindOf(row, index) === 'client' ? targets.data?.clients : kindOf(row, index) === 'project' ? targets.data?.projects : targets.data?.teams)?.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
        </select></label>}
      </div>}
      <label>Expires at (optional)<input type="datetime-local" step="1" value={localTime(row.expiresAt)} onChange={e => { const value = e.target.value; const date = new Date(value); update(index, { expiresAt: !value ? null : Number.isNaN(date.getTime()) ? value : date.toISOString() }); }} disabled={saving} /></label>
      <button type="button" className="btn" onClick={() => { setPendingKind({}); change(draft.filter((_, i) => i !== index)); }} disabled={saving} aria-label={`Remove exception ${row.key || index + 1}`}>Remove</button>
    </div>)}
    <div className="override-actions"><button type="button" className="btn" onClick={() => change([...draft, { key: '', effect: 'Allow', expiresAt: null }])} disabled={saving}>Add exception</button>
      {draft.length > 0 && <button type="button" className="btn" onClick={() => change([])} disabled={saving}>Restore role defaults</button>}
      <button type="button" className="btn btn-primary" disabled={!dirty || invalid || saving} onClick={() => setReview(true)}>Review changes</button></div>
    {invalid && <p role="alert">Choose each right once per scope, select the client, project or team where one is required, and provide valid expiry times.</p>}
    {review && <div className="override-review" role="region" aria-label="Review exceptions"><h4>Review exception changes</h4><p>Saving replaces this user’s complete direct exception list. Role assignments are unchanged. Removing a deny can restore access through a role; server policies and scope still apply.</p>
      <ul className="override-changes">{changes.map(({ id, key, before, after }) => <li key={id}>
        <strong>{before ? after ? 'Change' : 'Remove' : 'Add'}: {catalog.find(p => p.key.toLowerCase() === key.toLowerCase())?.label ?? key}</strong> <code>{key}</code>
        <div><span>Current: {exceptionDescription(before, targets.data)}</span><span>After saving: {exceptionDescription(after, targets.data)}</span></div>
      </li>)}</ul>
      <div className="override-actions"><button type="button" className="btn" onClick={() => setReview(false)} disabled={saving}>Back to editing</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm and save'}</button></div>
    </div>}
  </div>;
}

function exceptionDescription(value?: RightException, targets?: ScopeTargets) {
  if (!value) return 'No direct exception';
  return `${value.effect} · ${scopeDescription(value, targets)} · ${value.expiresAt ? `expires ${new Date(value.expiresAt).toLocaleString()}` : 'no expiry'}`;
}

function localTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}
