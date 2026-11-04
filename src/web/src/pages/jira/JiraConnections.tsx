import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { get, post, put, ApiError } from '../../api';
import { fmtDateTime } from '../../format';
import { useForm, useRight, useRefresh } from '../../hooks';
import { ActionDialog } from '../../ui/pickers';
import { Badge, DataTable, Dialog, FormError, PageHead, Panel, QueryState, SelectInput, StateMessage, TextInput, useToast, When } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { useClientOptions } from '../common';
import { JiraBadge, JiraCard, KV, SyncOffNotice } from './shared';
import './jira.css';

type TestStep = { name: string; passed: boolean; detail: string };
type Connection = {
  id: number; name: string; siteUrl: string; type: string; authMode: string; accountEmail?: string; cloudId?: string; isEnabled: boolean; jiraInstanceId: number; instance?: string; detailFieldNames: string;
  status: string; health: string; spaces: number; assignedSpaces: number; connectedClients: number; lastSync?: string; lastTestAt?: string; lastTestOk?: boolean; lastTestDurationMs?: number; lastSuccessfulTestAt?: string;
  lastDiscoveryAt?: string; lastDiscoveryError?: string; lastTest?: TestStep[];
  credential: { hasToken: boolean; provider: string; reference?: string; rotatedAt?: string; masked?: string }; version: string;
};
type Overview = { summary: { total: number; active: number; spacesDiscovered: number; lastGlobalSync?: string }; syncEnabled: boolean; instances: { id: number; name: string; approvedHost: string }[]; connections: Connection[] };
type SpaceRow = { id: number; jiraProjectId: string; projectKey: string; projectName: string; missing: boolean; assignedClientId?: number; assignedClient?: string; availability: string; state: string; lastSync?: string; health?: string; cases: number };
export type Health = { syncEnabled: boolean; issueSync: string; commentSync: string; activitySync: string; lastFullReconciliation?: string; lastSuccess?: string; last24h: { created: number; updated: number; comments: number; activities: number; failed: number; issues: number; runs: number }; averageDurationSeconds?: number; pendingConflicts: number };

const authLabel = (m: string) => m === 'ScopedApiToken' ? 'Scoped API token (gateway)' : 'API token (Basic / unscoped)';
const siteHost = (u: string) => u.replace(/^https:\/\//, '');

/** Administration → Integrations → Jira Connections (approved mockup 1). */
export function JiraConnections() {
  const q = useQuery({ queryKey: ['jira-connections'], queryFn: () => get<Overview>('/admin/jira-connections') });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'new' | 'edit' | 'rotate' | 'status' | null>(null);
  const [reassign, setReassign] = useState<SpaceRow | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const canCreate = useRight('AdminIntegrations', 'Create');
  const canMaintain = useRight('AdminIntegrations', 'Maintain');
  const refresh = useRefresh();
  const toast = useToast();
  const clients = useClientOptions();
  const d = q.data;
  const rows = (d?.connections ?? []).filter(c => !filter || `${c.name} ${c.siteUrl}`.toLowerCase().includes(filter.toLowerCase()));
  const c = d?.connections.find(x => x.id === selectedId) ?? d?.connections[0];
  const spaces = useQuery({ queryKey: ['jira-spaces', c?.id], queryFn: () => get<SpaceRow[]>(`/admin/jira-connections/${c!.id}/spaces`), enabled: !!c });
  const health = useQuery({ queryKey: ['jira-health', c?.id], queryFn: () => get<Health>(`/admin/jira-sync/health?connectionId=${c!.id}`), enabled: !!c });
  const usage = Object.entries((spaces.data ?? []).filter(s => s.assignedClient).reduce<Record<string, string[]>>((a, s) => { (a[s.assignedClient!] ??= []).push(s.projectKey); return a; }, {}));

  const act = async (name: string, path: string, done: (r: never) => string) => {
    setBusy(name); setMessage(null);
    try { const r = await post<never>(path); toast(done(r)); refresh(); }
    catch (e) { setMessage(e instanceof ApiError ? e.summary : 'The request failed.'); }
    finally { setBusy(''); }
  };
  const test = () => act('test', `/admin/jira-connections/${c!.id}/test`, (r: { ok: boolean }) => r.ok ? 'The connection test passed.' : 'The connection test found problems.');
  const discover = () => act('discover', `/admin/jira-connections/${c!.id}/discover`, (r: { discovered: number }) => `${r.discovered} space(s) discovered.`);

  return (
    <QueryState q={q}>{d && <>
      <PageHead title="Jira Connections" crumbs={[{ to: '/admin', label: 'Administration' }, { label: 'Integrations' }]} sub="Manage Jira sites, credentials, space discovery and synchronization health. The hub only reads from Jira."
        actions={<>
          <button className="btn" onClick={() => { q.refetch(); spaces.refetch(); health.refetch(); }}>Refresh</button>
          <Link className="btn" to="/admin/integrations/jira/review">Sync preview</Link>
          {canCreate && <button className="btn btn-primary" onClick={() => setDialog('new')}>+ New connection</button>}
        </>} />
      <SyncOffNotice on={d.syncEnabled} />
      {message && <div className="notice warn">{message}</div>}
      <div className="jira-cards">
            <JiraCard icon="online" title="Total connections" value={d.summary.total} hint="Configured Jira connections" />
            <JiraCard icon="ok" title="Active" value={d.summary.active} hint="Connections in use" />
            <JiraCard icon="list" title="Spaces discovered" value={d.summary.spacesDiscovered} hint="Across all connections" />
            <JiraCard icon="calendar" title="Last global sync" value={d.summary.lastGlobalSync ? fmtDateTime(d.summary.lastGlobalSync) : 'Never'} hint="Last completed synchronization" />
          </div>
          <Panel title="Configured connections" pad={false}>
            <div className="toolbar" style={{ margin: 8 }}><TextInput label="Filter connections" value={filter} onChange={setFilter} placeholder="Name or site" /></div>
            <DataTable<Connection> caption="Configured Jira connections" tools={false} rows={rows} rowKey={x => x.id} empty={filter ? 'nomatch' : 'none'} columns={[
              { key: 'n', header: 'Connection name', render: x => <button className={`linkbtn ${x.id === c?.id ? 'jira-row-selected' : ''}`} aria-pressed={x.id === c?.id} onClick={() => setSelectedId(x.id)}>{x.name}</button> },
              { key: 't', header: 'Type', render: () => 'Jira Cloud' },
              { key: 's', header: 'Jira site', render: x => siteHost(x.siteUrl) },
              { key: 'a', header: 'Auth mode', render: x => x.authMode === 'ScopedApiToken' ? 'Scoped API token' : 'API token' },
              { key: 'c', header: 'Spaces', className: 'num', render: x => x.spaces },
              { key: 'h', header: 'Sync health', render: x => <JiraBadge value={x.health} /> },
              { key: 'l', header: 'Last test', render: x => <When v={x.lastTestAt} /> },
              { key: 'st', header: 'Status', render: x => <JiraBadge value={x.status} /> },
              { key: 'x', header: 'Actions', render: x => <button className="linkbtn" onClick={() => setSelectedId(x.id)}>View</button> }
            ]} />
          </Panel>
      <div className="jira-admin-grid">
        {c && <div className="jira-col">
          <Panel title="Connection details" actions={canMaintain && <>
            <button className="btn" onClick={() => setDialog('edit')}>Edit</button>
            <button className={`btn ${c.isEnabled ? 'btn-danger' : ''}`} onClick={() => setDialog('status')}>{c.isEnabled ? 'Disable' : 'Enable'}</button></>}>
            <p style={{ marginTop: 0 }}><b>{c.name}</b> <JiraBadge value={c.status} /></p>
            <KV items={[
              ['Jira site URL', <a href={c.siteUrl} target="_blank" rel="noopener noreferrer">{c.siteUrl}</a>], ['Connection type', 'Jira Cloud'], ['Cloud ID', c.cloudId && <span className="mono">{c.cloudId}</span>], ['Auth mode', authLabel(c.authMode)],
              ['Reference list', c.instance], ['Connected clients', c.connectedClients], ['Assigned spaces', c.assignedSpaces], ['Last sync', c.lastSync ? fmtDateTime(c.lastSync) : 'Never'],
              ['Last successful test', c.lastSuccessfulTestAt ? fmtDateTime(c.lastSuccessfulTestAt) : 'Never'], ['Last credential rotation', c.credential.rotatedAt ? fmtDateTime(c.credential.rotatedAt) : 'Never']
            ]} />
          </Panel>
          <Panel title="Credentials & security" actions={canMaintain && <>
            <button className="btn" onClick={() => setDialog('rotate')}>Rotate credentials</button>
            <button className="btn" disabled={busy === 'test'} onClick={test}>Test credentials</button></>}>
            <KV items={[
              ['Username / e-mail', c.accountEmail], ['API token', c.credential.hasToken ? <span aria-label="Stored, not shown">{c.credential.masked}</span> : <Badge tone="bad">Not available</Badge>],
              ['Secret store', c.credential.provider === 'EnvironmentVariable' ? 'Server environment variable' : 'Encrypted on the server (data protection)'], ['Secret reference', c.credential.reference && <span className="mono">{c.credential.reference}</span>]
            ]} />
            <div className="notice" style={{ marginTop: 8, marginBottom: 0 }}>Credentials are masked and never returned in API responses.</div>
          </Panel>
        </div>}
        {c && <div className="jira-col">
          <Panel title="Connection test results" actions={canMaintain && <button className="btn" disabled={busy === 'test'} onClick={test}>{busy === 'test' ? 'Testing…' : 'Run test'}</button>}>
            {!c.lastTestAt ? <StateMessage kind="none">Not tested yet.</StateMessage> : <>
              <div className={`notice ${c.lastTestOk ? '' : 'warn'}`} style={{ marginBottom: 0 }}>{c.lastTestOk ? 'Last test successful' : 'Last test found problems'} in {c.lastTestDurationMs} ms · {fmtDateTime(c.lastTestAt)}</div>
              <ul className="jira-steps">{(c.lastTest ?? []).map(s => <li key={s.name}><Icon name={s.passed ? 'ok' : 'error'} size={16} /><span>{s.name}: <b>{s.passed ? 'Passed' : 'Failed'}</b></span><span className="detail">{s.detail}</span></li>)}</ul>
            </>}
          </Panel>
          <Panel title="Discovery configuration" actions={canMaintain && <button className="btn" disabled={busy === 'discover'} onClick={discover}>Discover now</button>}>
            <KV items={[
              ['Discovery mode', 'On demand'], ['Sync interval', 'Set per client (default every 15 minutes)'], ['Initial import', 'First run of each space'], ['Incremental sync', <JiraBadge value={d.syncEnabled ? 'Enabled' : 'Disabled'} />], ['Full reconciliation', 'Set per client (default weekly)'],
              ['Last discovery', c.lastDiscoveryAt ? fmtDateTime(c.lastDiscoveryAt) : 'Never'], ...(c.lastDiscoveryError ? [['Discovery error', <span className="err">{c.lastDiscoveryError}</span>] as [string, React.ReactNode]] : [])
            ]} />
          </Panel>
        </div>}
        {c && <div className="jira-col">
          <Panel title="Sync health">
            {health.data ? <>
              <KV items={[
                ['Issue sync', <JiraBadge value={health.data.issueSync} />], ['Comment sync', <JiraBadge value={health.data.commentSync} />], ['Activity sync', <JiraBadge value={health.data.activitySync} />],
                ['Last full reconciliation', health.data.lastFullReconciliation ? fmtDateTime(health.data.lastFullReconciliation) : 'Never'], ['Issues read (24h)', health.data.last24h.issues], ['Cases created (24h)', health.data.last24h.created], ['Cases updated (24h)', health.data.last24h.updated],
                ['Comments synced (24h)', health.data.last24h.comments], ['Failed records (24h)', <span className={health.data.last24h.failed ? 'err' : ''}>{health.data.last24h.failed}</span>], ['Average duration', health.data.averageDurationSeconds != null ? `${health.data.averageDurationSeconds} s` : '—']
              ]} />
              {health.data.pendingConflicts > 0 && <div className="notice warn" style={{ marginTop: 8 }}>{health.data.pendingConflicts} item(s) need review.</div>}
              <div className="form-actions" style={{ marginTop: 8 }}><Link className="btn" to="/admin/integrations/jira/conflicts">View failures</Link><Link className="btn" to={`/admin/integrations/jira/monitoring?connectionId=${c.id}`}>Open sync history</Link></div>
            </> : <StateMessage kind="loading" />}
          </Panel>
          <Panel title="Client usage">
            {usage.length === 0 ? <StateMessage kind="none">No client uses this connection yet.</StateMessage> : <table className="sla-table" style={{ width: '100%' }}><thead><tr><th style={{ textAlign: 'left' }}>Client</th><th style={{ textAlign: 'left' }}>Used spaces</th></tr></thead>
              <tbody>{usage.map(([client, keys]) => <tr key={client}><td>{client}</td><td>{keys.map(k => <span key={k} className="chip mono">{k}</span>)}</td></tr>)}</tbody></table>}
            <p className="hint" style={{ marginBottom: 0 }}>Manage space ownership on each client's Jira integration tab.</p>
          </Panel>
        </div>}
      </div>
      {c && <Panel title="Discovered spaces and sync health" pad={false} actions={<>
        {canMaintain && <button className="btn" disabled={busy === 'discover'} onClick={discover}>{busy === 'discover' ? 'Discovering…' : 'Discover spaces'}</button>}
        <Link className="btn" to={`/admin/integrations/jira/monitoring?connectionId=${c.id}`}>View sync history</Link></>}>
        <div className="hint" style={{ margin: '8px 10px 0' }}>Connection: <b>{c.name}</b>. Discovery never assigns a space; assign spaces from the client's Jira integration tab.</div>
        <DataTable<SpaceRow> caption="Discovered Jira spaces" exportName="jira-spaces" rows={spaces.data} loading={spaces.isLoading} error={spaces.error} rowKey={s => s.id} columns={[
          { key: 'k', header: 'Space key', render: s => <a href={`${c.siteUrl}/browse/${encodeURIComponent(s.projectKey)}`} target="_blank" rel="noopener noreferrer" className="mono">{s.projectKey}</a> },
          { key: 'n', header: 'Space name', render: s => s.projectName },
          { key: 'i', header: 'Space ID', render: s => <span className="mono">{s.jiraProjectId}</span> },
          { key: 'c', header: 'Assigned client', render: s => s.assignedClientId ? <Link to={`/clients/${s.assignedClientId}?tab=jira`}>{s.assignedClient}</Link> : s.assignedClient ?? <span className="muted">Not assigned</span> },
          { key: 'l', header: 'Last sync', render: s => s.lastSync ? fmtDateTime(s.lastSync) : <span className="muted">Never</span> },
          { key: 'u', header: 'Cases', className: 'num', render: s => s.cases },
          { key: 'h', header: 'Health', render: s => <JiraBadge value={s.missing ? 'NotAccessible' : s.health === 'Success' ? 'Healthy' : s.health ?? 'NotConfigured'} /> },
          { key: 's', header: 'Status', render: s => <JiraBadge value={s.state} /> },
          { key: 'r', header: '', render: s => canMaintain && s.assignedClient && <button className="linkbtn" onClick={() => setReassign(s)}>Reassign</button> }
        ]} />
      </Panel>}
      {!c && <Panel><StateMessage kind="none">No Jira connection yet. Create one to discover spaces.</StateMessage></Panel>}
      {dialog === 'new' && <ConnectionDialog instances={d.instances} onClose={() => setDialog(null)} />}
      {dialog === 'edit' && c && <ConnectionDialog connection={c} instances={d.instances} onClose={() => setDialog(null)} />}
      {dialog === 'rotate' && c && <RotateDialog c={c} onClose={() => setDialog(null)} />}
      {dialog === 'status' && c && <ActionDialog title={`${c.isEnabled ? 'Disable' : 'Enable'} ${c.name}`} path={`/admin/jira-connections/${c.id}/enabled`} submitLabel={c.isEnabled ? 'Disable' : 'Enable'} danger={c.isEnabled} onClose={() => setDialog(null)}
        intro={c.isEnabled ? 'Synchronization stops for every space of this connection. Cases and their imported history stay.' : 'Enabled spaces of this connection synchronize again.'}
        fields={[{ name: 'reason', label: 'Reason', kind: 'textarea', required: true }]} transform={v => ({ enabled: !c.isEnabled, reason: v.reason })} />}
      {reassign && c && <ReassignDialog connectionId={c.id} space={reassign} clients={clients} onClose={() => setReassign(null)} />}
    </>}</QueryState>
  );
}

/** The contract list follows the chosen client: the earlier client's contract never moves with the space (A84). */
function ReassignDialog({ connectionId, space, clients, onClose }: { connectionId: number; space: SpaceRow; clients: { value: string; label: string }[]; onClose: () => void }) {
  const f = useForm({ toClientId: '', contractId: '', reason: '' });
  const [confirmed, setConfirmed] = useState(false);
  const refresh = useRefresh();
  const toast = useToast();
  const contracts = useQuery({ queryKey: ['client-jira', f.values.toClientId, 'contracts'], queryFn: () => get<{ contracts?: { id: number; ref: string; title: string }[] }>(`/clients/${f.values.toClientId}/jira`), enabled: !!f.values.toClientId, retry: false });
  const chooseClient = (v: string) => { f.set('toClientId', v); f.set('contractId', ''); };
  const run = async () => {
    const v = f.values;
    const ok = await f.submit(async () => { await post(`/admin/jira-connections/${connectionId}/spaces/${space.jiraProjectId}/reassign`, { toClientId: v.toClientId ? Number(v.toClientId) : null, contractId: v.contractId ? Number(v.contractId) : null, reason: v.reason }); return true; });
    if (ok) { toast(`Space ${space.projectKey} reassigned.`); await refresh(); onClose(); }
  };
  return (
    <Dialog title={`Reassign space ${space.projectKey}`} onClose={onClose}>
      <div className="notice">Future issues of this space go to the new client. Existing cases stay with their client and are never moved; a changed issue of an existing case appears for review.</div>
      <FormError error={f.error} fields={['toClientId', 'contractId', 'reason']} />
      <div className="form-grid">
        <SelectInput label="New client" required wide value={f.values.toClientId} onChange={chooseClient} options={clients} error={f.fieldError('toClientId')} />
        <SelectInput label="Contract for new cases" empty="No contract" wide value={f.values.contractId} onChange={v => f.set('contractId', v)} error={f.fieldError('contractId')}
          options={(contracts.data?.contracts ?? []).map(k => ({ value: String(k.id), label: `${k.ref} · ${k.title}` }))}
          hint={contracts.isError ? 'The contracts of this client could not be read. You can link one later on its Jira tab.' : "Only the new client's active contracts. New cases follow its SLA, pause and penalty rules."} />
        <TextInput label="Reason" required wide multiline value={f.values.reason} onChange={v => f.set('reason', v)} error={f.fieldError('reason')} />
      </div>
      <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I confirm this action.</label>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-danger" disabled={!confirmed || f.busy} onClick={run}>{f.busy ? 'Saving…' : 'Reassign'}</button>
      </div>
    </Dialog>
  );
}

function ConnectionDialog({ connection: c, instances, onClose }: { connection?: Connection; instances: Overview['instances']; onClose: () => void }) {
  const f = useForm({ name: c?.name ?? '', siteUrl: c?.siteUrl ?? 'https://', authMode: c?.authMode ?? 'ApiTokenBasic', accountEmail: c?.accountEmail ?? '', cloudId: c?.cloudId ?? '', jiraInstanceId: String(c?.jiraInstanceId ?? instances[0]?.id ?? ''), detailFieldNames: c?.detailFieldNames ?? 'Ticket Classification;Application Component;Program', secretProvider: 'DataProtected', apiToken: '', secretVariable: '' });
  const refresh = useRefresh();
  const toast = useToast();
  const v = f.values;
  const save = async () => {
    const body = { name: v.name, siteUrl: v.siteUrl, authMode: v.authMode, accountEmail: v.accountEmail, cloudId: v.cloudId || null, jiraInstanceId: Number(v.jiraInstanceId) || null, detailFieldNames: v.detailFieldNames };
    const ok = await f.submit(async () => { if (c) await put(`/admin/jira-connections/${c.id}`, body, c.version); else await post('/admin/jira-connections', { ...body, secretProvider: v.secretProvider, apiToken: v.apiToken || null, secretVariable: v.secretVariable || null }); return true; });
    if (ok) { toast(c ? 'Connection saved.' : 'Connection created. Run a test next.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={c ? `Edit ${c.name}` : 'New Jira connection'} onClose={onClose} wide>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Connection name" required value={v.name} onChange={x => f.set('name', x)} error={f.fieldError('name')} maxLength={100} placeholder="Poliscan Jira Cloud" />
        <TextInput label="Jira site" required value={v.siteUrl} onChange={x => f.set('siteUrl', x)} error={f.fieldError('siteUrl')} placeholder="https://poliscan.atlassian.net" />
        <SelectInput label="Authentication type" required value={v.authMode} onChange={x => f.set('authMode', x)} empty={null} options={[{ value: 'ApiTokenBasic', label: 'API token, unscoped (e-mail + token)' }, { value: 'ScopedApiToken', label: 'API token, scoped (Atlassian gateway + Cloud ID)' }]} error={f.fieldError('authMode')} />
        <TextInput label="Atlassian account e-mail" required value={v.accountEmail} onChange={x => f.set('accountEmail', x)} error={f.fieldError('accountEmail')} maxLength={254} />
        <TextInput label={`Cloud ID${v.authMode === 'ScopedApiToken' ? '' : ' (optional; a test fills it in)'}`} required={v.authMode === 'ScopedApiToken'} value={v.cloudId} onChange={x => f.set('cloudId', x)} error={f.fieldError('cloudId')} />
        <SelectInput label="Reference list" required value={v.jiraInstanceId} onChange={x => f.set('jiraInstanceId', x)} options={instances.map(i => ({ value: String(i.id), label: i.name }))} error={f.fieldError('jiraInstanceId')} hint="Existing references with the same key on this site are matched against imported issues." />
        <TextInput label="Jira detail fields (custom fields, separated by ;)" wide value={v.detailFieldNames} onChange={x => f.set('detailFieldNames', x)} error={f.fieldError('detailFieldNames')} />
        {!c && <CredentialFields f={f} />}
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save'}</button></div>
    </Dialog>
  );
}

function CredentialFields({ f }: { f: { values: { secretProvider: string; apiToken: string; secretVariable: string }; set: (k: never, v: never) => void; fieldError: (k: string) => string | undefined } }) {
  const set = f.set as unknown as (k: string, v: string) => void;
  return <>
    <SelectInput label="Secret store" required value={f.values.secretProvider} onChange={x => set('secretProvider', x)} empty={null} options={[{ value: 'DataProtected', label: 'Encrypted on the server' }, { value: 'EnvironmentVariable', label: 'Server environment variable' }]} />
    {f.values.secretProvider === 'EnvironmentVariable'
      ? <TextInput label="Environment variable name" required value={f.values.secretVariable} onChange={x => set('secretVariable', x)} error={f.fieldError('secretVariable')} placeholder="TIOHUB_JIRA_POLISCAN" hint="Only the name is stored." />
      : <TextInput label="API token" required type="password" value={f.values.apiToken} onChange={x => set('apiToken', x)} error={f.fieldError('apiToken')} hint="Encrypted when saved and never shown again." />}
  </>;
}

function RotateDialog({ c, onClose }: { c: Connection; onClose: () => void }) {
  const f = useForm({ accountEmail: c.accountEmail ?? '', secretProvider: c.credential.provider, apiToken: '', secretVariable: '' });
  const refresh = useRefresh();
  const toast = useToast();
  const save = async () => {
    const ok = await f.submit(async v => { await post(`/admin/jira-connections/${c.id}/credentials`, { accountEmail: v.accountEmail, secretProvider: v.secretProvider, apiToken: v.apiToken || null, secretVariable: v.secretVariable || null }); return true; });
    if (ok) { toast('Credentials replaced. Run a test to confirm them.'); refresh(); onClose(); }
  };
  return (
    <Dialog title={`Rotate credentials: ${c.name}`} onClose={onClose}>
      <div className="notice">The old token is replaced at once. The current token is not shown and cannot be read back.</div>
      <FormError error={f.error} />
      <div className="form-grid">
        <TextInput label="Atlassian account e-mail" wide value={f.values.accountEmail} onChange={x => f.set('accountEmail', x)} error={f.fieldError('accountEmail')} />
        <CredentialFields f={f as never} />
      </div>
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>Replace credentials</button></div>
    </Dialog>
  );
}

