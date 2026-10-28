// Thin client for the hub API: same-origin cookies (organization sign-in), antiforgery header on changes,
// If-Match for edits, and Problem Details turned into ApiError with field errors.

export class ApiError extends Error {
  status: number;
  title: string;
  detail?: string;
  errors: Record<string, string[]>;
  traceId?: string;

  constructor(status: number, body: Partial<{ title: string; detail: string; errors: Record<string, string[]>; traceId: string }>) {
    super(body.title || `Request failed (${status})`);
    this.status = status;
    this.title = body.title || `Request failed (${status})`;
    this.detail = body.detail ?? undefined;
    this.errors = body.errors ?? {};
    this.traceId = body.traceId;
  }

  /** First error for a field, accepting camelCase or PascalCase keys. */
  field(name: string): string | undefined {
    const key = Object.keys(this.errors).find(k => k.toLowerCase() === name.toLowerCase());
    return key ? this.errors[key][0] : undefined;
  }

  get summary(): string {
    const first = Object.values(this.errors)[0]?.[0];
    return this.detail || first || this.title;
  }

  get isConflict() { return this.status === 412; }
}

const BASE = '/api/v1';

function xsrf(): string | undefined {
  const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** signal cancels the request (stale previews); headers adds request headers (for example Idempotency-Key). */
type Options = { method?: string; body?: unknown; version?: string; retried?: boolean; signal?: AbortSignal; headers?: Record<string, string> };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') { const t = xsrf(); if (t) headers['X-XSRF-TOKEN'] = t; }
  if (opts.version) headers['If-Match'] = `"${opts.version}"`;
  const res = await fetch(BASE + path, { method, headers, credentials: 'same-origin', signal: opts.signal, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  if (text) { try { data = JSON.parse(text); } catch { data = { title: text.slice(0, 200) }; } }
  if (!res.ok) {
    if (res.status === 400 && !opts.retried && (data as { title?: string })?.title?.startsWith('Security token')) {
      const me = await fetch(BASE + '/me', { credentials: 'same-origin' });
      if (!me.ok) await fetch(BASE + '/auth/config', { credentials: 'same-origin' });
      return api<T>(path, { ...opts, retried: true });
    }
    // Forms sign-in: an ended session goes to the sign-in page; a temporary password must be changed first.
    if (res.status === 401 && !path.startsWith('/auth/') && !location.pathname.startsWith('/login')) {
      location.assign(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
    }
    if (res.status === 403 && (data as { title?: string })?.title === 'Password change required' && location.pathname !== '/account/password') {
      location.assign('/account/password');
    }
    throw new ApiError(res.status, (data as object) ?? { title: res.statusText });
  }
  const etag = res.headers.get('ETag');
  if (etag && data && typeof data === 'object' && !Array.isArray(data)) {
    const tag = etag.replace(/^W\//, '').replace(/"/g, '');
    (data as Record<string, unknown>).etag = tag;
    if (!('version' in data)) (data as Record<string, unknown>).version = tag;
  }
  return data as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T = unknown>(path: string, body?: unknown, version?: string) => api<T>(path, { method: 'POST', body: body ?? {}, version });
export const put = <T = unknown>(path: string, body: unknown, version?: string) => api<T>(path, { method: 'PUT', body, version });
export const del = <T = unknown>(path: string, version?: string, body?: unknown) => api<T>(path, { method: 'DELETE', version, body });

/** A46: multipart upload (the browser sets the boundary); same antiforgery header and error handling as the JSON calls. A71: PUT for the client logo. */
export async function upload<T = unknown>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const t = xsrf(); if (t) headers['X-XSRF-TOKEN'] = t;
  const res = await fetch(BASE + path, { method, headers, credentials: 'same-origin', body: form });
  const text = await res.text();
  let data: unknown = undefined;
  if (text) { try { data = JSON.parse(text); } catch { data = { title: text.slice(0, 200) }; } }
  if (res.status === 413) throw new ApiError(413, { title: 'The upload is too large for the server.' });
  if (!res.ok) throw new ApiError(res.status, (data as object) ?? { title: res.statusText });
  return data as T;
}

export type Params = Record<string, string | number | boolean | null | undefined>;

/** Query string from params, skipping empty values. */
export function qs(params: Params): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** CSV download with the screen's filters. The server checks the Export grant and scope, and audits the export. */
export function exportCsv(report: string, params: Params = {}) {
  window.location.href = `${BASE}/export/${report}${qs(params)}`;
}

export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number };
export type UserRef = { id: number; name: string; isActive: boolean };
