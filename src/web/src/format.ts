// Display helpers. Timestamps are stored in UTC and shown in the user's selected time zone (DAT-04).

let zone = 'UTC';
export function setDisplayZone(z: string | undefined) { if (z) zone = z; }
export function displayZone() { return zone; }

export function fmtDateTime(v?: string | null, tz?: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(+d)) return v;
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz ?? zone, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** An amount with two decimals and its currency code, e.g. "45,000.00 AED". */
export function fmtMoney(n?: number | null, cur?: string | null): string {
  if (n === null || n === undefined) return '';
  return `${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur ? ` ${cur}` : ''}`;
}

export function fmtDate(v?: string | null): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(v));
}

/** Value for a datetime-local input, in the display zone. */
export function toLocalInput(v?: string | null): string {
  if (!v) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(v));
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour') === '24' ? '00' : g('hour')}:${g('minute')}`;
}

/** Converts a datetime-local value entered in the display zone to an ISO instant. */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const [date, time] = v.split('T');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = (time ?? '00:00').split(':').map(Number);
  // Find the UTC instant whose wall-clock time in the zone equals the input.
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (t: number) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t));
    const n = (k: string) => Number(p.find(x => x.type === k)?.value);
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute')) - t;
  };
  const first = guess - offset(guess);
  return new Date(guess - offset(first)).toISOString();
}

export function inDays(days: number, hour = 9): string {
  const d = new Date(Date.now() + days * 86400000);
  return toLocalInput(d.toISOString()).slice(0, 11) + String(hour).padStart(2, '0') + ':00';
}

/** Human labels for enum values: "InProgress" → "In progress". */
export function label(v?: string | null): string {
  if (!v) return '';
  const special: Record<string, string> = {
    TIO: 'TIO', OtherItdDivision: 'Other ITD division', CustomerIT: 'Customer IT', UAT: 'UAT', DR: 'DR', VM: 'VM', vCPU: 'vCPU', PhysicalCore: 'Physical core',
    GB: 'GB', GiB: 'GiB', TB: 'TB', TiB: 'TiB', TCP: 'TCP', UDP: 'UDP', ICMP: 'ICMP', NAT: 'NAT', CustomerCloud: 'Customer Cloud', InternalOnPrem: 'Internal On-prem',
    LogicalEndpoint: 'Logical endpoint', RecordedContractualDeadline: 'Recorded deadline',
    Manager: 'TIO Manager', Engineer: 'Operation Engineer', OnPrem: 'On-prem', OneWay: 'One way', Dependencies: 'Firewall rules', TCPandUDP: 'TCP and UDP'
  };
  if (special[v]) return special[v];
  const s = v.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function qty(v?: number | null, unit?: string | null): string {
  if (v === null || v === undefined) return 'Unknown';
  return `${v}${unit ? ' ' + label(unit) : ''}`;
}
