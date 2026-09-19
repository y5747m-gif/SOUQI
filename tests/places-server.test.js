'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPlaces, provinceOf, validateSearch, normalizePlace } = require('../server/places');
const { createServer, limiter } = require('../server');
const center = { lat: 30.04, lon: 31.24, radiusKm: 3 };
function place(overrides = {}) {
  return {
    id: 'ChIJ_test', displayName: { text: 'صيدلية الاختبار' },
    location: { latitude: 30.041, longitude: 31.241 },
    addressComponents: [
      { types: ['country'], shortText: 'EG', longText: 'مصر' },
      { types: ['administrative_area_level_1'], shortText: 'Cairo', longText: 'محافظة القاهرة' }
    ],
    types: ['pharmacy', 'store'], primaryType: 'pharmacy',
    currentOpeningHours: { openNow: true, weekdayDescriptions: ['السبت: ٩ ص–١٠ م'] },
    ...overrides
  };
}
const withProvince = (name, country = 'EG') => place({ addressComponents: [
  { types: ['country'], shortText: country }, { types: ['administrative_area_level_1'], longText: name }
] });
const response = places => ({ ok: true, json: async () => ({ places }) });

test('province verification: Arabic/English allowed; missing, neighbours and misleading names rejected', () => {
  for (const name of ['القاهرة', 'محافظة القاهرة', 'Cairo Governorate', 'الجيزة', 'محافظة الجيزة', 'Giza Governorate']) assert.ok(provinceOf(withProvince(name)), name);
  for (const name of ['القليوبية', 'Qalyubia Governorate', 'Alexandria', 'Cairo Road', 'Giza Gardens', '']) assert.equal(provinceOf(withProvince(name)), null, name);
  assert.equal(provinceOf(withProvince('Cairo', 'US')), null);
  assert.equal(provinceOf(place({ addressComponents: [], formattedAddress: 'Cairo, Egypt' })), null);
  assert.equal(provinceOf(place({ addressComponents: [{ types: ['country'], shortText: 'EG' }, { types: ['locality'], longText: 'Cairo' }] })), null);
});

test('strict numeric validation and server-owned input schema', () => {
  assert.deepEqual(validateSearch(center), { ...center, keyword: '' });
  for (const input of [null, [], {}, { ...center, lat: '30.04' }, { ...center, lon: null }, { ...center, radiusKm: 0 }, { ...center, radiusKm: 26 }, { ...center, radiusKm: NaN }, { ...center, keyword: 'x'.repeat(121) }, { ...center, keyword: {} }, { ...center, keyword: '\n' }, { ...center, url: 'http://evil' }]) assert.throws(() => validateSearch(input), { code: 'INVALID_INPUT' });
  assert.throws(() => validateSearch({ ...center, lat: 31.2, lon: 29.9 }), { code: 'OUTSIDE_SERVICE_AREA' });
});

test('normalization: circle bound, safe URLs, unknown hours, no fabricated prices', () => {
  const p = normalizePlace(place({ websiteUri: 'javascript:alert(1)', currentOpeningHours: undefined }), center);
  assert.equal(p.website, ''); assert.equal(p.openNow, null); assert.equal(p.cat, 'pharmacy');
  assert.ok(p.mapsUrl.includes('query_place_id=ChIJ_test'));
  assert.ok(!('price' in p));
  assert.equal(normalizePlace(place({ location: { latitude: 30.1, longitude: 31.3 } }), center), null);
  assert.equal(normalizePlace(place({ businessStatus: 'CLOSED_PERMANENTLY' }), center), null);
  assert.equal(normalizePlace(place({ types: ['bank'] }), center), null);
  assert.equal(normalizePlace(place({ id: '<script>' }), center), null);
  assert.equal(normalizePlace(place({ location: { latitude: '30.04', longitude: 31.24 } }), center), null);
});

test('nearby search: fixed endpoint, field mask, secret header; filters every result and deduplicates', async () => {
  let captured;
  const api = createPlaces({ apiKey: 'server-secret', fetchImpl: async (url, opts) => {
    captured = { url, ...opts };
    return response([place(), place(), withProvince('Giza'), withProvince('Qalyubia Governorate'), place({ id: 'unknown', addressComponents: [] }), place({ id: 'far', location: { latitude: 30.3, longitude: 31.5 } })]);
  } });
  const data = await api.search(center);
  assert.equal(data.items.length, 1);
  assert.equal(captured.url, 'https://places.googleapis.com/v1/places:searchNearby');
  assert.equal(captured.headers['X-Goog-Api-Key'], 'server-secret');
  assert.ok(captured.headers['X-Goog-FieldMask'].includes('places.addressComponents'));
  assert.ok(!captured.headers['X-Goog-FieldMask'].includes('*'));
  const body = JSON.parse(captured.body);
  assert.equal(body.maxResultCount, 20); assert.equal(body.locationRestriction.circle.radius, 3000);
  assert.ok(!JSON.stringify(data).includes('server-secret'));
});

test('text search uses a restriction (not bias); circle and province filtering still applied', async () => {
  const api = createPlaces({ apiKey: 'secret', fetchImpl: async (url, opts) => {
    assert.ok(url.endsWith(':searchText'));
    const b = JSON.parse(opts.body);
    assert.equal(b.textQuery, 'صيدلية'); assert.ok(b.locationRestriction.rectangle); assert.equal(b.locationBias, undefined);
    return response([place(), withProvince('القليوبية')]);
  } });
  assert.equal((await api.search({ ...center, keyword: 'صيدلية' })).items.length, 1);
});

test('area search rejects outside/unknown provinces and can choose a later valid match', async () => {
  const api = createPlaces({ apiKey: 'secret', fetchImpl: async () => response([withProvince('Alexandria'), withProvince('Giza')]) });
  assert.equal((await api.area({ q: 'الدقي' })).lat, 30.041);
  const outside = createPlaces({ apiKey: 'secret', fetchImpl: async () => response([withProvince('Qalyubia Governorate')]) });
  await assert.rejects(outside.area({ q: 'شبرا الخيمة' }), { code: 'OUTSIDE_SERVICE_AREA' });
  await assert.rejects(outside.area({ q: 'a' }), { code: 'INVALID_INPUT' });
});

test('missing key, quota, bad response, transport failure and timeout have sanitized errors', async () => {
  await assert.rejects(createPlaces().search(center), { code: 'PLACES_NOT_CONFIGURED' });
  for (const [fetchImpl, code] of [
    [async () => ({ ok: false, status: 403, json: async () => ({ secret: 'key' }) }), 'PLACES_UNAVAILABLE'],
    [async () => ({ ok: false, status: 429 }), 'RATE_LIMITED'],
    [async () => { throw new Error('secret-key'); }, 'PLACES_UNAVAILABLE'],
    [async () => ({ ok: true, json: async () => ({ places: {} }) }), 'PLACES_UNAVAILABLE']
  ]) await assert.rejects(createPlaces({ apiKey: 'key', fetchImpl }).search(center), e => e.code === code && !e.message.includes('key'));
  const hanging = createPlaces({ apiKey: 'key', timeoutMs: 5, fetchImpl: (_u, { signal }) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(new Error('abort')))) });
  await assert.rejects(hanging.search(center), { code: 'PLACES_TIMEOUT' });
});

async function runServer(t, env = {}, fetchImpl = async () => response([place()])) {
  const server = createServer({ env: { GOOGLE_PLACES_API_KEY: 'NEVER-EXPOSE-THIS', ...env }, fetchImpl });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, post: (body = center, headers = {}) => fetch(base + '/api/places/search', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }) };
}

test('HTTP: same-origin works; cross-origin and unsupported methods/content fail closed', async t => {
  const { base, post } = await runServer(t);
  assert.equal((await post(center, { Origin: base })).status, 200);
  assert.equal((await post(center, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await post(center, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await post(center, { Origin: 'null' })).status, 403);
  assert.equal((await fetch(base + '/api/places/search')).status, 405);
  assert.equal((await post(center, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('not-json')).status, 400);
  assert.equal((await post('a'.repeat(4097))).status, 413);
});

test('HTTP: static allowlist does not leak server files, secrets, or Git', async t => {
  const { base, post } = await runServer(t);
  for (const route of ['/.env', '/.git/config', '/server/index.js', '/server/places.js', '/package.json', '/api/unknown', '/%2e%2e/.env']) assert.equal((await fetch(base + route)).status, 404, route);
  for (const route of ['/', '/souqi.html', '/souqi-icon.svg']) {
    const r = await fetch(base + route); assert.equal(r.status, 200); assert.ok(!(await r.text()).includes('NEVER-EXPOSE-THIS'));
    assert.ok(r.headers.get('content-security-policy').includes("connect-src 'self'"));
  }
  const r = await post(); assert.equal(r.headers.get('cache-control'), 'no-store'); assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('HTTP: per-IP limit cannot be bypassed with untrusted forwarded header', async t => {
  const { post } = await runServer(t, { PLACES_PER_IP_PER_MINUTE: '1' });
  assert.equal((await post()).status, 200);
  const limited = await post(center, { 'X-Forwarded-For': '203.0.113.99' });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('retry-after'), '60');
});

test('HTTP: configured exact preview origin is accepted; missing key returns 503', async t => {
  const { post } = await runServer(t, { APP_ORIGINS: 'https://3000-example.e2b.app', GOOGLE_PLACES_API_KEY: '' });
  const r = await post(center, { Origin: 'https://3000-example.e2b.app' });
  assert.equal(r.status, 503); assert.equal((await r.json()).error.code, 'PLACES_NOT_CONFIGURED');
  assert.equal((await post(center, { Origin: 'https://3000-example.e2b.app.evil.test' })).status, 403);
  assert.throws(() => createServer({ env: { NODE_ENV: 'production' } }), /APP_ORIGINS/);
});

test('rate limiter enforces a global budget and expires windows', () => {
  let now = 60000;
  const take = limiter(2, 3, () => now);
  assert.equal(take('a'), true); assert.equal(take('a'), true); assert.equal(take('a'), false);
  assert.equal(take('b'), true); assert.equal(take('c'), false);
  now += 60000; assert.equal(take('a'), true);
});

test('HTTP: concurrency cap bounds billable upstream work', async t => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const { post } = await runServer(t, { PLACES_MAX_CONCURRENT: '1' }, async () => {
    entered();
    await new Promise(resolve => { release = resolve; });
    return response([]);
  });
  const first = post();
  await started;
  try { assert.equal((await post()).status, 429); }
  finally { release(); }
  assert.equal((await first).status, 200);
});
