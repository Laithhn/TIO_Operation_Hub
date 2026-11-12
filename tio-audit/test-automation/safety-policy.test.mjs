import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { validateBaseUrl, validateStorageState, requestDecision, safeDetailPath, statusRegressionFixture, tioUserIdSentinels } from './safety-policy.mjs';
import { routes, viewports } from './route-catalog.mjs';

const origin = 'https://audit.invalid';
test('Only a credential-free HTTPS origin is accepted', () => {
  assert.equal(validateBaseUrl(), undefined);
  assert.equal(validateBaseUrl(origin + '/'), origin);
  for (const value of ['http://audit.invalid', 'https://name:secret@audit.invalid', origin + '/cases', origin + '?token=x', origin + '#x']) {
    assert.throws(() => validateBaseUrl(value));
  }
});
test('Session paths must be absolute and outside the repository', () => {
  const root = resolve('.');
  assert.equal(validateStorageState(undefined, root), undefined);
  assert.throws(() => validateStorageState('state.json', root));
  assert.throws(() => validateStorageState(resolve(root, 'state.json'), root));
  assert.throws(() => validateStorageState(root, root));
  const external = resolve(root, '..', 'approved-private-session.json');
  assert.equal(validateStorageState(external, root), external);
});
test('Every browser mutation, external origin and action-like GET is blocked', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'CONNECT']) {
    assert.equal(requestDecision(method, origin + '/api/v1/reports/cases/preview', origin), 'blocked-method');
  }
  assert.equal(requestDecision('GET', 'https://external.invalid/tile.png', origin), 'blocked-external-origin');
  for (const path of ['/api/v1/export/cases', '/api/v1/exports/1/download', '/api/v1/auth/logout', '/api/v1/admin/sync']) {
    assert.equal(requestDecision('GET', origin + path, origin), 'blocked-action-path');
  }
  assert.equal(requestDecision('GET', origin + '/api/v1/cases?page=1', origin), 'allow');
  assert.equal(requestDecision('GET', origin + '/api/v1/auth/config', origin), 'allow');
});
test('Detail navigation only uses same-origin known read routes without query values', () => {
  assert.equal(safeDetailPath('/cases/123', origin), '/cases/123');
  for (const path of ['/cases/new', '/cases/123/edit', '/api/v1/cases/123', '/cases/123?delete=true', 'https://external.invalid/cases/123']) {
    assert.equal(safeDetailPath(path, origin), undefined);
  }
});
test('Route catalog contains no duplicate routes, create/edit forms or invented detail IDs', () => {
  assert.equal(new Set(routes.map(([, route]) => route)).size, routes.length);
  for (const [, route] of routes) {
    assert.match(route, /^\/[a-z0-9/\-]*$/);
    assert.doesNotMatch(route, /\/(?:new|edit)(?:\/|$)|\/[0-9]+(?:\/|$)/);
  }
  assert.deepEqual(viewports.map(({ width, height }) => [width, height]), [[1920, 1080], [1366, 768], [768, 1024], [390, 844]]);
});
test('Status comparison requires explicit existing sample fixtures and valid identifiers', () => {
  assert.equal(statusRegressionFixture({}), undefined);
  const env = { TIO_AUDIT_SAMPLE_TICKET_ID: '12203', TIO_AUDIT_SAMPLE_CLIENT_ID: '1',
    TIO_AUDIT_SAMPLE_TICKET_REFERENCE: 'CS-4003', TIO_AUDIT_SAMPLE_STATUS_LABEL: 'Waiting for customer' };
  assert.equal(statusRegressionFixture(env).ticketId, '12203');
  assert.throws(() => statusRegressionFixture({ ...env, TIO_AUDIT_SAMPLE_CLIENT_ID: '-1' }));
  assert.throws(() => statusRegressionFixture({ ...env, TIO_AUDIT_SAMPLE_STATUS_LABEL: 'x\ny' }));
});
test('Temporary-ID matcher is restricted to labeled Tio user id audit values', () => {
  assert.deepEqual(tioUserIdSentinels(['Amount: 10 → -55', 'Tio user id: — → 24', 'Client id: — → -3']), []);
  assert.deepEqual(tioUserIdSentinels(['Tio user id: — → -9223372036854775000']), ['-9223372036854775000']);
  assert.deepEqual(tioUserIdSentinels(['TIO user id: -9 → 24']), ['-9']);
});
test('GET cannot navigate to or initialize Notes even in future tests', () => {
  for (const path of ['/notes', '/notes/', '/notes?page=1', '/api/v1/notes/tree', '/api/v1/notes/tree?x=1', '/api/v1/notes/pages/42']) {
    assert.equal(requestDecision('GET', origin + path, origin), 'blocked-notes-side-effect');
  }
  assert.equal(requestDecision('GET', origin + '/api/v1/cases/42', origin), 'allow');
});
