import { isAbsolute, relative, resolve } from 'node:path';

export function validateBaseUrl(value) {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('TIO_AUDIT_BASE_URL must be an HTTPS origin with no credentials, query, fragment or application path.');
  }
  return url.origin;
}

export function validateStorageState(value, repositoryRoot) {
  if (!value) return undefined;
  if (!isAbsolute(value)) throw new Error('TIO_AUDIT_STORAGE_STATE must be an absolute path outside the repository.');
  const inside = relative(resolve(repositoryRoot), resolve(value));
  if (!inside || (!inside.startsWith('..') && !isAbsolute(inside))) {
    throw new Error('Keep approved session files outside the repository.');
  }
  return value;
}

/** Deny by default: never send a browser mutation, external request, export or download. */
export function requestDecision(method, value, origin) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return 'blocked-method';
  const url = new URL(value);
  if (url.origin !== origin) return 'blocked-external-origin';
  // Notes tree is not a pure read: an empty account gets a starter notebook/section.
  // Block navigation and its API family so a future test cannot initialize production notes via GET.
  if (/^\/notes(?:\/|$)/i.test(url.pathname) || /^\/api\/v1\/notes(?:\/|$)/i.test(url.pathname)) {
    return 'blocked-notes-side-effect';
  }
  if (/\/(?:export|exports|download|downloads|logout|sync|test-connection)(?:\/|$)/i.test(url.pathname)) {
    return 'blocked-action-path';
  }
  return 'allow';
}

/** No create/edit routes, inferred IDs, arbitrary cross-site targets or API links. */
export function safeDetailPath(value, origin) {
  const url = new URL(value, origin);
  if (url.origin !== origin || !/^\/(?:cases|commitments|clients|projects|environments|contracts)\/\d+$/.test(url.pathname)) return undefined;
  if (url.search || url.hash) return undefined;
  return url.pathname;
}

/** These are existing approved read fixtures, never IDs to create or enumerate. */
export function statusRegressionFixture(env) {
  const values = [env.TIO_AUDIT_SAMPLE_TICKET_ID, env.TIO_AUDIT_SAMPLE_CLIENT_ID,
    env.TIO_AUDIT_SAMPLE_TICKET_REFERENCE, env.TIO_AUDIT_SAMPLE_STATUS_LABEL];
  if (values.some(value => !value)) return undefined;
  if (!/^\d+$/.test(values[0]) || BigInt(values[0]) <= 0n || !/^\d+$/.test(values[1]) || BigInt(values[1]) <= 0n) {
    throw new Error('Sample ticket/client IDs must be positive decimal IDs of approved existing records.');
  }
  if (values.slice(2).some(value => value.length > 128 || /[\r\n\x00-\x1f]/.test(value))) {
    throw new Error('Sample reference/status must be short single-line labels.');
  }
  return { ticketId: values[0], clientId: values[1], reference: values[2], statusLabel: values[3] };
}

/** Match only the named audit reference field, not arbitrary negative business values. */
export function tioUserIdSentinels(texts) {
  return texts.flatMap(text => [...text.matchAll(/\bTio\s+user\s+id\s*:\s*([^\r\n]*)/gi)]
    .flatMap(match => [...match[1].matchAll(/-\d+/g)].map(value => value[0])));
}
