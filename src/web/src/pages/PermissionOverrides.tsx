import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, get, put } from '../api';
import { ErrorBox, StateMessage } from '../ui/kit';

type Override = { key: string; effect: 'Allow' | 'Deny'; expiresAt: string | null };
type OverrideSet = { version: string; overrides: Override[] };
type Permission = { key: string; displayName: string; module: string; isActive: boolean };

export function PermissionOverrides({ userId, permissions, onDirty }: { userId: number; permissions: Permission[]; onDirty: (dirty: boolean) => void }) {
  const query = useQuery({ queryKey: ['permission-overrides', userId], queryFn: () => get<OverrideSet>(`/admin/users/${userId}/permission-overrides`), retry: false, refetchOnWindowFocus: false });
  if (query.isLoading) return <StateMessage kind="loading" />;
  if (query.error) return <ErrorBox error={query.error} />;
  if (!query.data) return null;
  return <OverrideDraft key={`${userId}:${query.data.version}`} userId={userId} saved={query.data} permissions={permissions} onDirty={onDirty} reload={() => query.refetch()} />;
}

function OverrideDraft({ userId, saved, permissions, onDirty, reload }: { userId: number; saved: OverrideSet; permissions: Permission[]; onDirty: (dirty: boolean) => void; reload: () => Promise<unknown> }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Override[]>(() => saved.overrides.map(o => ({ ...o })));
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const active = permissions.filter(p => p.isActive && !['admin', 'administration'].includes(p.module.toLowerCase()));
  const invalid = draft.some(o => !o.key || (o.expiresAt !== null && Number.isNaN(Date.parse(o.expiresAt)))) || new Set(draft.map(o => o.key.toLowerCase())).size !== draft.length;
  const changes = overrideChanges(saved.overrides, draft);
  const dirty = changes.length > 0 || hasDuplicateKeys(draft);
  const change = (next: Override[]) => { setDraft(next); onDirty(overrideChanges(saved.overrides, next).length > 0 || hasDuplicateKeys(next)); setReview(false); setError(null); setMessage(''); };
  const update = (index: number, patch: Partial<Override>) => change(draft.map((row, i) => i === index ? { ...row, ...patch } : row));
  const save = async () => {
    setSaving(true); setError(null);
    try {
      await put(`/admin/users/${userId}/permission-overrides`, { overrides: draft }, saved.version);
      onDirty(false);
      setMessage('Permission exceptions saved.');
      await Promise.all([client.invalidateQueries({ queryKey: ['permission-overrides', userId] }), client.invalidateQueries({ queryKey: ['admin-user-access', userId] }), client.invalidateQueries({ queryKey: ['me'] })]);
    } catch (e) { setError(e); }
    finally { setSaving(false); }
  };
  const reloadLatest = async () => {
    if (dirty && !window.confirm('Discard your unsaved exceptions and reload the latest version?')) return;
    onDirty(false); setError(null); await reload();
  };
  return <div className="access-overrides">
    <h3>Direct permission exceptions</h3>
    <p>Allow or deny a registered permission for this user. A deny takes precedence over role access. An expiry uses your device’s local time; the server enforces the saved instant. Removing an exception restores role-based evaluation. Administration permissions are assigned through roles.</p>
    <p className="hint">Self changes and exceptions for protected administrative accounts are rejected by the server. Mandatory restrictions and prerequisite permissions continue to apply.</p>
    {message && <p role="status">{message}</p>}
    {error != null && <><ErrorBox error={error} />{error instanceof ApiError && error.isConflict && <button type="button" className="btn" onClick={reloadLatest}>Reload latest</button>}</>}
    {draft.length === 0 && <p className="hint">No direct exceptions. Role assignments determine the permission snapshot.</p>}
    {draft.map((row, index) => <div className="override-row" key={index}>
      <label>Permission<select value={row.key} onChange={e => update(index, { key: e.target.value })} disabled={saving}>
        <option value="">Select a permission</option>
        {row.key && !active.some(p => p.key === row.key) && <option value={row.key}>{row.key} (not in active catalog)</option>}
        {[...new Set(active.map(p => p.module))].sort().map(module => <optgroup key={module} label={module}>{active.filter(p => p.module === module).map(p => <option key={p.key} value={p.key}>{p.displayName} — {p.key}</option>)}</optgroup>)}
      </select></label>
      <label>Effect<select value={row.effect} onChange={e => update(index, { effect: e.target.value as Override['effect'] })} disabled={saving}><option value="Allow">Allow</option><option value="Deny">Deny</option></select></label>
      <label>Expires at (optional)<input type="datetime-local" step="1" value={localTime(row.expiresAt)} onChange={e => { const value = e.target.value; const date = new Date(value); update(index, { expiresAt: !value ? null : Number.isNaN(date.getTime()) ? value : date.toISOString() }); }} disabled={saving} /></label>
      <button type="button" className="btn" onClick={() => change(draft.filter((_, i) => i !== index))} disabled={saving} aria-label={`Remove exception ${row.key || index + 1}`}>Remove</button>
    </div>)}
    <div className="override-actions"><button type="button" className="btn" onClick={() => change([...draft, { key: '', effect: 'Allow', expiresAt: null }])} disabled={saving}>Add exception</button>
      {draft.length > 0 && <button type="button" className="btn" onClick={() => change([])} disabled={saving}>Restore role defaults</button>}
      <button type="button" className="btn btn-primary" disabled={!dirty || invalid || saving} onClick={() => setReview(true)}>Review changes</button></div>
    {invalid && <p role="alert">Choose a different permission for each exception and provide valid expiry times.</p>}
    {review && <div className="override-review" role="region" aria-label="Review permission exceptions"><h4>Review permission changes</h4><p>Saving replaces this user’s complete direct exception list. Role assignments are unchanged. Removing a deny can restore access through a role; server policies and scope still apply.</p>
      <ul className="override-changes">{changes.map(({ key, before, after }) => <li key={key}>
        <strong>{before ? after ? 'Change' : 'Remove' : 'Add'}: {permissions.find(p => p.key.toLowerCase() === key.toLowerCase())?.displayName ?? key}</strong> <code>{key}</code>
        <div><span>Current: {exceptionDescription(before)}</span><span>After saving: {exceptionDescription(after)}</span></div>
      </li>)}</ul>
      <div className="override-actions"><button type="button" className="btn" onClick={() => setReview(false)} disabled={saving}>Back to editing</button><button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Confirm and save'}</button></div>
    </div>}
  </div>;
}

function hasDuplicateKeys(rows: Override[]) {
  return new Set(rows.map(row => row.key.toLowerCase())).size !== rows.length;
}

function overrideChanges(before: Override[], after: Override[]) {
  const previous = new Map(before.map(row => [row.key.toLowerCase(), row]));
  const next = new Map(after.map(row => [row.key.toLowerCase(), row]));
  return [...new Set([...previous.keys(), ...next.keys()])].flatMap(key => {
    const oldValue = previous.get(key);
    const newValue = next.get(key);
    const sameExpiry = oldValue?.expiresAt === newValue?.expiresAt || (!!oldValue?.expiresAt && !!newValue?.expiresAt && Date.parse(oldValue.expiresAt) === Date.parse(newValue.expiresAt));
    return oldValue && newValue && oldValue.effect === newValue.effect && sameExpiry ? [] : [{ key: newValue?.key ?? oldValue!.key, before: oldValue, after: newValue }];
  });
}

function exceptionDescription(value?: Override) {
  if (!value) return 'No direct exception';
  return `${value.effect} · ${value.expiresAt ? `expires ${new Date(value.expiresAt).toLocaleString()}` : 'no expiry'}`;
}

function localTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}
