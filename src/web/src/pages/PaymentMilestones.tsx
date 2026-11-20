import { Fragment, useState } from 'react';
import { Link } from 'react-router';
import { put } from '../api';
import { fmtDate, fmtMoney } from '../format';
import { useForm, useRefresh, useTypes } from '../hooks';
import { Badge, Dialog, FormError, SelectInput, TextInput, useToast } from '../ui/kit';

// A124 (owner request, 19 Nov 2026): every contract payment term follows the payment milestone template — milestone, planned invoice date,
// invoice amount, %, actual invoice date, invoice number, work status, client approval, payment status, amount received, outstanding, notes.
// Planned values come from the contract; one row's values change through "Update" without editing the contract (PUT /contracts/{id}/payments/{paymentId}).

export type PaymentMilestone = {
  id: number; condition: string; percentage?: number | null; amount?: number | null; dueDate?: string | null; status: string; paidOn?: string | null; notes?: string | null;
  invoiceDate?: string | null; invoiceNumber?: string | null; workStatus?: string | null; workState?: string | null; clientApproval?: string | null; approvalState?: string | null;
  amountReceived?: number | null; received?: number | null; outstanding?: number | null; overdue?: boolean;
  /** Present when the rows of several contracts are shown together. */
  contractId?: number; contractRef?: string;
};

export const WORK_LIST = 'PaymentWorkStatus';
export const APPROVAL_LIST = 'PaymentClientApproval';
export const PAYMENT_STATUSES = ['Pending', 'Invoiced', 'Paid', 'Waived'];

const DONE = new Set(['Done', 'Approved', 'Paid']);
const BAD = new Set(['Rejected']);

/** A status as the application's own badge: complete (Done, Approved, Paid) in the success tone (the badge adds its tick), by its built-in behaviour. */
export function MilestoneMark({ label, state }: { label?: string | null; state?: string | null }) {
  if (!label) return <span className="hint">—</span>;
  if (state && DONE.has(state)) return <Badge tone="good">{label}</Badge>;
  if (state && BAD.has(state)) return <Badge tone="bad">{label}</Badge>;
  return <Badge>{label}</Badge>;
}

const sum = (rows: PaymentMilestone[], f: (r: PaymentMilestone) => number | null | undefined) => {
  const v = rows.map(f).filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};

/** The payment milestone template as a table. Read-only unless an edit target (contractId) and canEdit are given. */
export function PaymentMilestoneTable({ rows, currency, title, caption, canEdit, contractId, showContract }: {
  rows: PaymentMilestone[]; currency?: string | null; title?: string; caption: string; canEdit?: boolean; contractId?: number; showContract?: boolean;
}) {
  const T = useTypes();
  const [edit, setEdit] = useState<PaymentMilestone | null>(null);
  const money = (n?: number | null) => (n === null || n === undefined ? '' : fmtMoney(n, currency ?? undefined));
  const editable = !!canEdit && (contractId !== undefined || rows.every(r => r.contractId !== undefined));
  const cols = 13 + (showContract ? 1 : 0) + (editable ? 1 : 0);
  const pct = sum(rows, r => r.percentage);
  return (
    <div className="table-wrap pm-wrap">
      <table className="grid pm-table">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>
          <th className="num">#</th>{showContract && <th>Contract</th>}<th>Milestone description</th><th>Planned invoice date</th>
          <th className="num">Invoice amount{currency ? ` (${currency})` : ''}</th><th className="num">%</th><th>Actual invoice date</th><th>Invoice no.</th>
          <th>Work status</th><th>Client approval</th><th>Payment status</th><th className="num">Amount received{currency ? ` (${currency})` : ''}</th>
          <th className="num">Outstanding{currency ? ` (${currency})` : ''}</th><th>Notes</th>{editable && <th><span className="sr-only">Actions</span></th>}
        </tr></thead>
        <tbody>
          {title && <tr className="pm-group"><td colSpan={cols}>{title}</td></tr>}
          {rows.map((p, i) => (
            <Fragment key={p.id}>
              <tr>
                <td className="num">{i + 1}</td>
                {showContract && <td className="nowrap">{p.contractId ? <Link to={`/contracts/${p.contractId}`}>{p.contractRef}</Link> : p.contractRef}</td>}
                <td className="pm-desc">{p.condition}</td>
                <td className="nowrap">{p.dueDate ? fmtDate(p.dueDate) : <span className="hint">—</span>}{p.overdue && <> <Badge tone="bad">Overdue</Badge></>}</td>
                <td className="num nowrap">{money(p.amount)}</td>
                <td className="num nowrap">{p.percentage !== null && p.percentage !== undefined ? `${p.percentage.toFixed(1)}%` : ''}</td>
                <td className="nowrap">{p.invoiceDate ? fmtDate(p.invoiceDate) : <span className="hint">—</span>}</td>
                <td className="nowrap">{p.invoiceNumber ?? <span className="hint">—</span>}</td>
                <td className="nowrap"><MilestoneMark label={p.workStatus ? T.name(WORK_LIST, p.workStatus) : null} state={p.workState} /></td>
                <td className="nowrap"><MilestoneMark label={p.clientApproval ? T.name(APPROVAL_LIST, p.clientApproval) : null} state={p.approvalState} /></td>
                <td className="nowrap"><MilestoneMark label={p.status} state={p.status} />{p.paidOn && <div className="hint">on {fmtDate(p.paidOn)}</div>}</td>
                <td className="num nowrap">{money(p.received)}</td>
                <td className="num nowrap">{p.outstanding ? money(p.outstanding) : <span className="hint">-</span>}</td>
                <td className="pm-notes">{p.notes}</td>
                {editable && <td className="row-actions"><button className="linkbtn" onClick={() => setEdit(p)} aria-label={`Update milestone ${i + 1}`}>Update</button></td>}
              </tr>
            </Fragment>
          ))}
        </tbody>
        {rows.length > 1 && <tfoot><tr>
          <td /><td colSpan={showContract ? 3 : 2} className="num"><b>Total</b></td>
          <td className="num nowrap"><b>{money(sum(rows, r => r.amount))}</b></td>
          <td className={`num nowrap${(pct ?? 0) > 100 ? ' err' : ''}`}><b>{pct !== null ? `${pct.toFixed(1)}%` : ''}</b></td>
          <td colSpan={5} />
          <td className="num nowrap"><b>{money(sum(rows, r => r.received))}</b></td>
          <td className="num nowrap"><b>{money(sum(rows, r => r.outstanding))}</b></td>
          <td colSpan={editable ? 2 : 1} />
        </tr></tfoot>}
      </table>
      {edit && <MilestoneDialog row={edit} contractId={(contractId ?? edit.contractId)!} currency={currency} onClose={() => setEdit(null)} />}
    </div>
  );
}

/** Edit one payment milestone without opening the contract form. The server checks Contracts:Maintain where the contract is. */
export function MilestoneDialog({ row, contractId, currency, onClose }: { row: PaymentMilestone; contractId: number; currency?: string | null; onClose: () => void }) {
  const T = useTypes();
  const toast = useToast();
  const refresh = useRefresh();
  const s = (v?: number | string | null) => (v === null || v === undefined ? '' : String(v));
  const f = useForm({
    condition: row.condition, dueDate: s(row.dueDate), amount: s(row.amount), percentage: s(row.percentage), invoiceDate: s(row.invoiceDate), invoiceNumber: s(row.invoiceNumber),
    workStatus: s(row.workStatus), clientApproval: s(row.clientApproval), status: row.status, paidOn: s(row.paidOn), amountReceived: s(row.amountReceived), notes: s(row.notes)
  });
  const v = f.values;
  const n = (x: string) => (x.trim() === '' ? null : Number(x));
  const setStatus = (x: string) => {
    f.set('status', x);
    // Paid usually means the whole amount came in; prefill what is still empty, the person can change it.
    if (x === 'Paid' && !v.amountReceived && v.amount) f.set('amountReceived', v.amount);
    if (x === 'Paid' && !v.paidOn) f.set('paidOn', new Date().toISOString().slice(0, 10));
  };
  const outstanding = v.status === 'Waived' || !v.amount ? null : Math.max(0, Number(v.amount) - (v.amountReceived ? Number(v.amountReceived) : v.status === 'Paid' ? Number(v.amount) : 0));
  const save = async () => {
    const ok = await f.submit(async x => {
      await put(`/contracts/${contractId}/payments/${row.id}`, {
        id: row.id, condition: x.condition, dueDate: x.dueDate || null, amount: n(x.amount), percentage: n(x.percentage), invoiceDate: x.invoiceDate || null, invoiceNumber: x.invoiceNumber || null,
        workStatus: x.workStatus || null, clientApproval: x.clientApproval || null, status: x.status, paidOn: x.status === 'Paid' ? x.paidOn || null : null,
        amountReceived: n(x.amountReceived), notes: x.notes || null
      });
      return true;
    });
    if (ok) { toast('Milestone updated.'); await refresh(); onClose(); }
  };
  const err = (k: string) => f.fieldError(k) ?? f.fieldError('payment');
  return (
    <Dialog title="Update payment milestone" onClose={onClose} wide>
      <div className="notice">Only this milestone changes. The rest of the contract is not changed{currency ? <>; amounts are in {currency}</> : null}.</div>
      <FormError error={f.error} fields={['condition', 'dueDate', 'amount', 'percentage', 'invoiceDate', 'invoiceNumber', 'workStatus', 'clientApproval', 'status', 'paidOn', 'amountReceived', 'notes', 'payment']} />
      <h3 className="pm-dialog-head">Planned (from the contract)</h3>
      <div className="form-grid">
        <TextInput label="Milestone description" required wide multiline value={v.condition} onChange={x => f.set('condition', x)} error={err('condition')} maxLength={500} />
        <TextInput label="Planned invoice date" type="date" value={v.dueDate} onChange={x => f.set('dueDate', x)} />
        <TextInput label={`Invoice amount${currency ? ` (${currency})` : ''}`} type="number" value={v.amount} onChange={x => f.set('amount', x)} error={f.fieldError('amount')} />
        <TextInput label="% of the contract" type="number" value={v.percentage} onChange={x => f.set('percentage', x)} error={f.fieldError('percentage')} />
      </div>
      <h3 className="pm-dialog-head">Progress</h3>
      <div className="form-grid">
        <TextInput label="Actual invoice date" type="date" value={v.invoiceDate} onChange={x => f.set('invoiceDate', x)} error={f.fieldError('invoiceDate')} />
        <TextInput label="Invoice no." value={v.invoiceNumber} onChange={x => f.set('invoiceNumber', x)} maxLength={50} placeholder="e.g. INV002206" />
        <SelectInput label="Work status" value={v.workStatus} onChange={x => f.set('workStatus', x)} options={T.options(WORK_LIST, row.workStatus)} empty="— Not recorded —" />
        <SelectInput label="Client approval" value={v.clientApproval} onChange={x => f.set('clientApproval', x)} options={T.options(APPROVAL_LIST, row.clientApproval)} empty="— Not recorded —" />
        <SelectInput label="Payment status" required value={v.status} onChange={setStatus} options={PAYMENT_STATUSES.map(x => ({ value: x, label: x }))} empty={null} />
        {v.status === 'Paid' && <TextInput label="Paid on" type="date" required value={v.paidOn} onChange={x => f.set('paidOn', x)} error={f.fieldError('paidOn')} />}
        <TextInput label={`Amount received${currency ? ` (${currency})` : ''}`} type="number" value={v.amountReceived} onChange={x => f.set('amountReceived', x)}
          hint={outstanding !== null ? `Outstanding: ${outstanding ? fmtMoney(outstanding, currency ?? undefined) : '-'}` : undefined} />
        <TextInput label="Notes" wide multiline value={v.notes} onChange={x => f.set('notes', x)} maxLength={1000} />
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={f.busy} onClick={save}>{f.busy ? 'Saving…' : 'Save milestone'}</button>
      </div>
    </Dialog>
  );
}
