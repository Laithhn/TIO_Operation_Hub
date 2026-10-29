import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { get, post, put } from '../api';
import { useForm, useMe, useRefresh } from '../hooks';
import { Badge, Checkbox, DataTable, Dialog, FormError, PageHead, Restricted, SelectInput, StateMessage, TextInput, useToast, DeleteAction } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { CONFIG_CATEGORIES, CONFIG_HOME, CONFIG_LISTS, categoryRoute, configCrumbs, configTree, type ConfigKind, type ConfigList } from '../configRegistry';

// A34: system configuration, one page per list (owner request, 20 Oct 2026: no single "reference lists" page).
// Navigation (categories, sidebar tree, search, breadcrumbs) comes from the configuration registry, configRegistry.ts.

function AdminOnly({ children }: { children: React.ReactNode }) {
  const me = useMe().data!;
  if (!me.isAdministrator) return <Restricted need="This page needs the Administration right." />;
  return <>{children}</>;
}

type Row = { id: number; listName: string; code: string; label: string; description?: string; sortOrder: number; isRetired: boolean; category?: string; version: string };
const useValues = () => useQuery({ queryKey: ['admin-lookups'], queryFn: () => get<Row[]>('/admin/lookups') });

/** Administration → Configuration: one compact card per category; each opens the category's page list. */
export function ConfigHome() {
  const me = useMe().data;
  const groups = configTree(me);
  return (
    <AdminOnly>
      <PageHead title="Configuration" crumbs={[{ to: '/admin', label: 'Administration' }, { label: 'Configuration' }]}
        sub="What the forms offer and how the hub behaves. Changes apply at once; retired values stay on the records that use them." />
      <ul className="cfg-cards" aria-label="Configuration categories">
        {groups.map(g => (
          <li key={g.id} className="cfg-card">
            <span className="cfg-card-icon"><Icon name={g.icon} size={24} /></span>
            <h2 className="cfg-card-title"><Link to={categoryRoute(g.id)} className="cfg-card-link">{g.name}</Link></h2>
            <span className="cfg-card-count">{g.pages.length} {g.pages.length === 1 ? 'page' : 'pages'}</span>
            <p className="cfg-card-desc">{g.description}</p>
            <span className="cfg-card-open" aria-hidden="true">Open <Icon name="chevron" size={14} /></span>
          </li>
        ))}
      </ul>
    </AdminOnly>
  );
}

const KIND: Record<ConfigKind, string> = { editable: 'Editable list', labels: 'Fixed values, labels only', system: 'System setting' };

/** One configuration category: its pages, each with a short description and, for lists, how many values are active. */
export function ConfigCategoryPage() {
  const { category } = useParams();
  const me = useMe().data;
  const group = configTree(me).find(g => g.id === category);
  const q = useValues();
  if (!CONFIG_CATEGORIES.some(c => c.id === category)) return <Navigate to={CONFIG_HOME} replace />;
  const count = (list: string) => (q.data ?? []).filter(r => r.listName === list && !r.isRetired).length;
  return (
    <AdminOnly>
      <PageHead title={group?.name ?? 'Configuration'} crumbs={[{ to: '/admin', label: 'Administration' }, { to: CONFIG_HOME, label: 'Configuration' }, { label: group?.name ?? '' }]} sub={group?.description} />
      {group ? (
        <ul className="cfg-pages" aria-label={`${group.name} pages`}>
          {group.pages.map(p => (
            <li key={p.id} className="cfg-page-row">
              <Link to={p.route} className="cfg-page-link">{p.name}</Link>
              <span className="cfg-page-desc">{p.description}</span>
              <span className="cfg-page-meta">
                {p.list && <span className="muted">{q.data ? `${count(p.list)} ${p.kind === 'labels' ? 'fixed values' : 'active'}` : '…'}</span>}
                <Badge tone={p.kind === 'system' ? 'info' : 'neutral'}>{KIND[p.kind]}</Badge>
              </span>
            </li>
          ))}
        </ul>
      ) : <StateMessage kind="restricted">No configuration pages in this category are available to you.</StateMessage>}
    </AdminOnly>
  );
}

/** One configuration list: add, rename, describe, order, retire; shows how many records use each value. */
export function ConfigListPage() {
  const { slug } = useParams();
  const cfg = CONFIG_LISTS.find(c => c.slug === slug);
  const q = useValues();
  const usage = useQuery({ queryKey: ['admin-lookup-usage', cfg?.list], queryFn: () => get<Record<string, number>>(`/admin/lookups/${cfg!.list}/usage`), enabled: !!cfg && !cfg.labelOnly });
  const [edit, setEdit] = useState<Row | 'new' | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const toast = useToast();
  const refresh = useRefresh();
  if (!cfg) return <Navigate to="/admin/config" replace />;
  const all = (q.data ?? []).filter(r => r.listName === cfg.list).sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = all.filter(r => showRetired || !r.isRetired);
  const catLabel = (v?: string) => cfg.categories?.find(c => c.value === v)?.label ?? v;
  const move = async (r: Row, by: number) => {
    const ids = all.map(x => x.id);
    const i = ids.indexOf(r.id), j = i + by;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try { await post(`/admin/lookups/${cfg.list}/order`, { ids }); refresh(); } catch (e) { toast((e as Error).message); }
  };
  return (
    <AdminOnly>
      <PageHead title={cfg.title} crumbs={configCrumbs(cfg.slug)} sub={cfg.about}
        actions={!cfg.labelOnly && <button className="btn btn-primary" onClick={() => setEdit('new')}>+ Add</button>} />
      {!cfg.labelOnly && <div className="toolbar"><Checkbox label={`Show retired (${all.filter(r => r.isRetired).length})`} checked={showRetired} onChange={setShowRetired} /></div>}
      <DataTable<Row> rowKey={r => r.id} rows={rows} loading={q.isLoading} error={q.error} caption={cfg.title} columns={[
        ...(cfg.labelOnly ? [{ key: 'code', header: 'Workflow code', render: (r: Row) => <span className="mono">{r.code}</span> }] : [{ key: 'o', header: 'Order', render: (r: Row) => <span className="nowrap order-btns">
          <button className="linkbtn" aria-label={`Move ${r.label} up`} onClick={() => move(r, -1)} disabled={all.indexOf(r) === 0}>▲</button>
          <button className="linkbtn" aria-label={`Move ${r.label} down`} onClick={() => move(r, 1)} disabled={all.indexOf(r) === all.length - 1}>▼</button></span> }]),
        { key: 'n', header: cfg.labelOnly ? 'Display label' : 'Name', render: r => <button className="linkbtn" onClick={() => setEdit(r)}>{r.label}</button> },
        ...(!cfg.labelOnly ? [{ key: 'd', header: 'Description', render: (r: Row) => r.description ?? <span className="muted">—</span> }] : []),
        ...(cfg.categories ? [{ key: 'c', header: 'Behaves as', render: (r: Row) => <span className="chip">{catLabel(r.category)}</span> }] : []),
        ...(!cfg.labelOnly ? [{ key: 'u', header: `In use (${cfg.usedBy})`, className: 'num', render: (r: Row) => usage.data ? (usage.data[r.code] ?? 0) : '…' }] : []),
        { key: 's', header: 'Status', render: r => cfg.labelOnly ? <Badge>Fixed workflow value</Badge> : r.isRetired ? <Badge>Retired</Badge> : <Badge tone="good">Active</Badge> },
        ...(!cfg.labelOnly ? [{ key: 'del', header: '', className: 'row-actions', render: (r: Row) => <DeleteAction path={`/admin/lookups/${r.id}`} what={`${r.label}`} /> }] : [])
      ]} />
      <p className="hint" style={{ marginTop: 8 }}>{cfg.labelOnly ? 'Only display labels can be changed. All built-in values remain available and keep their workflow meaning.' : 'Retiring a value stops offering it on forms; records that use it keep it. Names can be changed at any time; the change shows everywhere.'}</p>
      {edit && (!cfg.labelOnly || edit !== 'new') && <ValueDialog cfg={cfg} row={edit === 'new' ? null : edit} inUse={edit !== 'new' && !!usage.data?.[edit.code]} onClose={() => setEdit(null)} />}
    </AdminOnly>
  );
}

function ValueDialog({ cfg, row, inUse, onClose }: { cfg: ConfigList; row: Row | null; inUse: boolean; onClose: () => void }) {
  const f = useForm({ label: row?.label ?? '', description: row?.description ?? '', category: row?.category ?? '', active: !row?.isRetired });
  const toast = useToast();
  const refresh = useRefresh();
  const save = async () => {
    const v = f.values;
    const body = cfg.labelOnly && row
      ? { listName: row.listName, code: row.code, label: v.label, description: row.description ?? null, sortOrder: row.sortOrder, isRetired: row.isRetired, category: row.category ?? null }
      : { listName: cfg.list, code: row?.code ?? null, label: v.label, description: v.description || null, sortOrder: row?.sortOrder ?? 0, isRetired: !v.active, category: v.category || null };
    const ok = await f.submit(() => (row ? put(`/admin/lookups/${row.id}`, body, row.version) : post('/admin/lookups', body)).then(() => true));
    if (ok) { toast(row ? 'Saved; the new name shows everywhere.' : `${v.label} added.`); refresh(); onClose(); }
  };
  return (
    <Dialog title={row ? `Edit ${row.label}` : `Add to ${cfg.title.toLowerCase()}`} onClose={onClose}>
      <FormError error={f.error} fields={cfg.labelOnly ? ['label'] : ['label', 'description', 'category', 'isRetired']} />
      <div className="form-grid">
        {cfg.labelOnly && row && <TextInput label="Workflow code" wide value={row.code} onChange={() => {}} disabled hint="The code and its workflow meaning remain fixed." />}
        <TextInput label={cfg.labelOnly ? 'Display label' : 'Name'} required wide value={f.values.label} onChange={v => f.set('label', v)} error={f.fieldError('label')} maxLength={150} />
        {!cfg.labelOnly && <TextInput label="Description" wide multiline value={f.values.description} onChange={v => f.set('description', v)} error={f.fieldError('description')} />}
        {cfg.categories && (row
          ? <TextInput label="Behaves as" wide value={cfg.categories.find(c => c.value === row.category)?.label ?? row.category ?? ''} onChange={() => {}} disabled hint="Fixed once created, so totals and reports stay consistent." />
          : <SelectInput label="Behaves as" required wide value={f.values.category} onChange={v => f.set('category', v)} error={f.fieldError('category')}
              options={cfg.categories.map(c => ({ value: c.value, label: `${c.label} — ${c.hint}` }))} empty="— Select —" />)}
        {!cfg.labelOnly && row && <Checkbox label="Active (offered on forms)" checked={f.values.active} onChange={v => f.set('active', v)}
          hint={inUse && !f.values.active ? 'Records that use it keep it; it is no longer offered for new records.' : undefined} />}
      </div>
      {f.fieldError('isRetired') && <div className="err">{f.fieldError('isRetired')}</div>}
      <div className="form-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={f.busy} onClick={save}>{row ? 'Save' : 'Add'}</button></div>
    </Dialog>
  );
}
