import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { get } from '../../api';
import { fmtDateTime } from '../../format';
import { CAT, Donut, Kpi, SERIES, STATUS, VizPanel } from '../../ui/charts';
import { Icon } from '../../ui/Icon';
import { Badge, DataTable, StateMessage, useToast } from '../../ui/kit';
import { apiError, download, scheduleWhen, STATUS_TONE, type ExportJob, type Schedule } from './shared';

/* A70: the Reporting Center overview — the caller's own report usage (exports and schedules). It is never presented as operational or SLA
 * performance: case figures live in the Cases Report Builder and on the dashboard. */

type Overview = {
  days: number; from: string; generatedAt: string; timeZone: string;
  exports: { total: number; completed: number; failed: number; previousCompleted: number; previousFailed: number; successRate: number | null; inProgress: number };
  schedules: { active: number; nextRunAt: string | null }; availableReports: number; savedReports: number;
  perDay: { day: string; completed: number; failed: number }[]; categories: { category: string; count: number }[]; topReports: { report: string; name: string; count: number }[];
  recent: ExportJob[]; upcoming: Schedule[]; retentionDays: number; maxRows: number;
};

const delta = (now: number, before: number) => before === 0 ? (now === 0 ? 'no change' : 'none in the previous period') : `${now >= before ? '+' : ''}${Math.round(((now - before) / before) * 100)} % vs previous period`;

/** Stacked daily columns: completed (blue) and failed (red, with a ▲ glyph in the tooltip and table — never colour alone). */
function ActivityChart({ data }: { data: Overview['perDay'] }) {
  const max = Math.max(1, ...data.map(d => d.completed + d.failed));
  if (data.every(d => d.completed + d.failed === 0)) return <div className="viz-empty">No exports in this period.</div>;
  return (
    <div className="rc-activity">
      <div className="rc-activity-plot" role="img" aria-label={`Exports per day: ${data.filter(d => d.completed + d.failed > 0).map(d => `${d.day} ${d.completed} completed, ${d.failed} failed`).join('; ')}`}>
        {data.map(d => (
          <div key={d.day} className="rc-activity-col" title={`${d.day}: ${d.completed} completed, ${d.failed} failed`}>
            <span style={{ height: `${(d.failed / max) * 100}%`, background: STATUS.critical }} />
            <span style={{ height: `${(d.completed / max) * 100}%`, background: SERIES.blue }} />
          </div>
        ))}
      </div>
      <div className="rc-activity-axis" aria-hidden="true">{data.map((d, i) => <span key={d.day}>{i % Math.ceil(data.length / 8) === 0 ? d.day.slice(5) : ''}</span>)}</div>
      <ul className="partbar-legend"><li><span className="key sq" style={{ background: SERIES.blue }} />Completed</li><li><span className="key sq" style={{ background: STATUS.critical }} />▲ Failed</li></ul>
    </div>
  );
}

export function ReportingOverview() {
  const toast = useToast();
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: ['rc-overview', days], queryFn: () => get<Overview>(`/reporting/overview?days=${days}`) });
  const o = q.data;
  if (q.error) return <StateMessage kind={apiError(q.error)?.status === 403 ? 'restricted' : 'error'}>{apiError(q.error)?.summary}</StateMessage>;
  const e = o?.exports;
  return (
    <div className="rc-overview">
      <div className="rc-period">
        <span className="hint">Your report usage{o ? ` since ${fmtDateTime(o.from)}` : ''} — exports and schedules, not case or SLA performance.</span>
        <div className="seg" role="group" aria-label="Period">
          {[7, 30, 90].map(d => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
        </div>
      </div>
      <div className="kpis rc-kpis" aria-label="Report usage">
        <Kpi icon={<Icon name="report" size={18} />} label="Reports generated" value={e?.completed} loading={!o} status="info"
          lines={e ? [{ text: delta(e.completed, e.previousCompleted) }, { text: `${e.total} export request(s) in ${days} days` }] : []} to="/reporting-center/history" />
        <Kpi icon={<Icon name="ok" size={18} />} label="Success rate" value={e?.successRate === null || e?.successRate === undefined ? undefined : `${e.successRate} %`} loading={!o} unavailable={!!o && e?.successRate === null}
          status={e?.successRate === null || e?.successRate === undefined ? 'neutral' : e.successRate >= 95 ? 'healthy' : 'warning'}
          lines={e ? [{ text: `${e.completed} completed, ${e.failed} failed` }, ...(e.inProgress ? [{ text: `${e.inProgress} queued or running`, status: 'info' as const }] : [])] : []} />
        <Kpi icon={<Icon name="warning" size={18} />} label="Failed exports" value={e?.failed} loading={!o} status={e?.failed ? 'warning' : o ? 'healthy' : 'neutral'}
          lines={e ? [{ text: delta(e.failed, e.previousFailed) }, { text: 'Open the history for reasons and retry' }] : []} to="/reporting-center/history" />
        <Kpi icon={<Icon name="calendar" size={18} />} label="Scheduled reports" value={o?.schedules.active} loading={!o}
          lines={o ? [{ text: o.schedules.nextRunAt ? `Next run ${fmtDateTime(o.schedules.nextRunAt)}` : 'No active schedule' }, { text: `${o.savedReports} saved report(s) you can open` }] : []} to="/reporting-center/schedules" />
      </div>

      <div className="rc-ov-grid">
        <VizPanel title="Report activity" sub="Your exports per day in the period (completed and failed)."
          table={{ columns: ['Day', 'Completed', 'Failed'], rows: (o?.perDay ?? []).map(d => [d.day, d.completed, d.failed]) }}>
          {o ? <ActivityChart data={o.perDay} /> : <StateMessage kind="loading" />}
        </VizPanel>
        <VizPanel title="Report types used" sub="Your exports in the period by report category."
          table={{ columns: ['Category', 'Exports'], rows: (o?.categories ?? []).map(c => [c.category, c.count]) }}>
          {o ? <Donut data={o.categories.map(c => ({ key: c.category, label: c.category, value: c.count }))} colorOf={(_, i) => CAT[i % CAT.length]} centerLabel="exports" /> : <StateMessage kind="loading" />}
        </VizPanel>
        <section className="panel rc-quick">
          <div className="panel-head"><h2>Quick actions</h2></div>
          <div className="panel-body">
            {[
              { to: '/reporting-center/builder/cases', icon: 'filter', t: 'Build a cases report', s: 'Filters, columns, live preview, Excel and PDF' },
              { to: '/reporting-center/templates', icon: 'copy', t: 'Start from a template', s: 'Ready-made cases report configurations' },
              { to: '/reporting-center/library', icon: 'report', t: 'Browse the report library', s: `${o?.availableReports ?? 13} reports in four categories` },
              { to: '/reporting-center/schedules', icon: 'calendar', t: 'Schedule a report', s: 'Recurring files for you and colleagues' }
            ].map(a => (
              <Link key={a.to} to={a.to} className="rc-quick-link"><span className="rc-ic" aria-hidden="true"><Icon name={a.icon} size={18} /></span><span><b>{a.t}</b><small>{a.s}</small></span><span aria-hidden="true">›</span></Link>
            ))}
          </div>
        </section>
      </div>

      <div className="rc-ov-grid rc-ov-grid-2">
        <section className="panel">
          <div className="panel-head"><h2>Recent exports</h2><div className="actions"><Link className="linkbtn" to="/reporting-center/history">View all</Link></div></div>
          <div className="panel-body">
            <DataTable<ExportJob> caption="Recent exports" rows={o?.recent} loading={!o} rowKey={r => r.id} tools={false} empty="none"
              columns={[
                { key: 'name', header: 'Report', render: r => <><b>{r.reportName}</b><div className="hint">{r.source}</div></> },
                { key: 'format', header: 'Format', render: r => <span className="chip">{r.format.toUpperCase()}</span> },
                { key: 'at', header: 'Requested', render: r => fmtDateTime(r.requestedAt) },
                { key: 'status', header: 'Status', render: r => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge> },
                { key: 'rows', header: 'Rows', className: 'num', render: r => r.rowCount?.toLocaleString() ?? '—' },
                { key: 'dl', header: '', render: r => r.canDownload ? <button className="linkbtn" onClick={() => download(r, toast)}>Download</button> : null }
              ]} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Scheduled reports</h2><div className="actions"><Link className="linkbtn" to="/reporting-center/schedules">View all</Link></div></div>
          <div className="panel-body">
            <DataTable<Schedule> caption="Upcoming scheduled reports" rows={o?.upcoming} loading={!o} rowKey={r => r.id} tools={false} empty="none"
              columns={[
                { key: 'name', header: 'Name', render: r => <><b>{r.name}</b><div className="hint">{r.reportName}</div></> },
                { key: 'when', header: 'Frequency', render: r => scheduleWhen(r) },
                { key: 'next', header: 'Next run', render: r => r.isActive ? fmtDateTime(r.nextRunAt) : <span className="muted">Paused</span> },
                { key: 'state', header: 'Status', render: r => <Badge tone={r.isActive ? 'good' : 'neutral'}>{r.isActive ? 'Active' : 'Paused'}</Badge> }
              ]} />
            {o && o.topReports.length > 0 && <>
              <h3 className="rc-sub">Your most used reports ({days} days)</h3>
              <ol className="rc-top">{o.topReports.map(t => <li key={t.report}><span>{t.name}</span><span className="rc-top-bar" aria-hidden="true"><span style={{ width: `${(t.count / o.topReports[0].count) * 100}%` }} /></span><b>{t.count}</b></li>)}</ol>
            </>}
          </div>
        </section>
      </div>
      {o && <p className="hint rc-policy">Exports contain only rows you are authorized to see. Files are kept for {o.retentionDays} days and only you can download yours; every export and download is audited. One export holds at most {o.maxRows.toLocaleString()} rows.</p>}
    </div>
  );
}
