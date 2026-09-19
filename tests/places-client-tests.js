/* Real UI wiring, tested with mocked same-origin API. No Google charges. */
(async () => {
  const assert = require('node:assert/strict');
  const item = { id: 'google-test', placeId: 'test', source: 'google', real: true, name: 'صيدلية <script>alert(1)</script>',
    cats: ['pharmacy'], cat: 'pharmacy', catAr: 'صيدلية', lat: 30.04, lon: 31.24, distKm: 0.1,
    address: 'الدقي', city: 'الجيزة', openNow: true, attributions: [{ name: '<provider>', url: 'https://example.com/' }] };
  APP.route = { name: 'nearby', p: {} };
  REAL.lat = 30.04; REAL.lon = 31.24; REAL.keyword = ''; REAL.cat = ''; REAL.openOnly = false;
  global.fetch = async (url, opts) => {
    assert.equal(url, '/api/places/search');
    assert.deepEqual(JSON.parse(opts.body), { lat: 30.04, lon: 31.24, radiusKm: 3, keyword: 'صيدلية' });
    return { ok: true, json: async () => ({ items: [item] }) };
  };
  assert.equal(await realSearch({ keyword: 'صيدلية' }), true);
  assert.equal(REAL.all[0].source, 'google');
  const html = realCard(REAL.all[0]);
  assert.ok(html.includes('Google Maps') && html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(html.includes('&lt;provider&gt;'));
  assert.ok(!html.includes('openstreetmap.org'));
  assert.equal(realOpenState(REAL.all[0]), 'open');
  assert.equal(realOpenState({ source: 'google', openNow: false }), 'closed');
  assert.equal(realOpenState({ source: 'google', openNow: null }), 'unknown');
  assert.equal(isOpen(REAL.all[0]), true);
  assert.ok(!egyptMap().includes('data-store="google-test"'));
  assert.ok(!radialMap([{ st: REAL.all[0], storeId: 'google-test', dist: .1, price: 123 }], 3).includes('data-store="google-test"'));
  assert.ok(!EG_AREAS.some(a => /الخيمة|العبور|الإسكندرية/.test(a.ar)));
  assert.ok(!realSearchPanel().includes('مصر كلها'));

  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: { code: 'PLACES_NOT_CONFIGURED', message: 'البحث غير مفعّل بعد.' } }) });
  assert.equal(await realSearch(), false);
  assert.equal(REAL.err, 'البحث غير مفعّل بعد.');
  assert.deepEqual(REAL.items, []);
  assert.deepEqual(REAL.all, []);

  // A slow previous response must never overwrite the newer search.
  let resolveOld;
  global.fetch = () => new Promise(resolve => { resolveOld = resolve; });
  const old = realSearch({ keyword: 'قديم' });
  global.fetch = async () => ({ ok: true, json: async () => ({ items: [{ ...item, id: 'google-new', name: 'جديد' }] }) });
  assert.equal(await realSearch({ keyword: 'جديد' }), true);
  resolveOld({ ok: true, json: async () => ({ items: [item] }) });
  assert.equal(await old, false);
  assert.equal(REAL.all[0].name, 'جديد');

  // Area/GPS flows share the same generation guard.
  global.fetch = () => new Promise(resolve => { resolveOld = resolve; });
  const oldArea = realSearchArea('منطقة قديمة');
  global.fetch = async () => ({ ok: true, json: async () => ({ items: [item] }) });
  assert.equal(await realSearchArea('مدينة نصر'), true);
  resolveOld({ ok: true, json: async () => ({ lat: 29.99, lon: 31.1, where: 'قديم' }) });
  assert.equal(await oldArea, false);
  assert.equal(REAL.where, 'مدينة نصر');

  global.navigator.geolocation = { getCurrentPosition: ok => ok({ coords: { latitude: 31.2, longitude: 29.9 } }) };
  assert.equal(await realSearch({ locate: true }), false);
  assert.equal(REAL.err, serviceAreaError());
  global.location.protocol = 'file:';
  assert.equal(await realSearchArea('مدينة نصر'), false);
  assert.ok(REAL.err.includes('خادم'));
  delete global.location.protocol;
  console.log('✅ Google Places client: API wiring, escaping, attribution, no non-Google map pins, stale response guards, empty/error/GPS/file states');
})().catch(e => { console.error(e); process.exitCode = 1; });
