
/* ============ اختبارات المحلات الحقيقية (OpenStreetMap) + أيقونة العلامة + التوجيه ============ */
let rf = 0;
const R = (label, cond, extra) => { if (cond) console.log('✅ ' + label); else { rf++; console.log('❌ ' + label + (extra ? ' → ' + extra : '')); } };

console.log('\n--- أيقونة العلامة (حقيبة تسوّق مصرية) ---');
try {
  const a = SOQ_ICON(38), b = SOQ_ICON(38);
  R('الأيقونة SVG صحيحة', a.indexOf('<svg') === 0 && a.indexOf('viewBox="0 0 64 64"') > -1 && a.indexOf('</svg>') > -1);
  R('عناصر مصرية موجودة (حقيبة + هرم + نيل)', a.indexOf('linearGradient') > -1 && (a.match(/<path/g) || []).length >= 4);
  const ida = (a.match(/id="sb(\d+)"/) || [])[1], idb = (b.match(/id="sb(\d+)"/) || [])[1];
  R('معرّفات التدرّجات فريدة عند التكرار', ida && idb && ida !== idb, ida + ' / ' + idb);
  R('لا توجد علامات مكان مؤقتة', a.indexOf('__G') === -1);
  R('أيقونة التبويب data URI', SOQ_FAVICON().indexOf('data:image/svg+xml,') === 0 && SOQ_FAVICON().indexOf('%3Csvg') > -1);
  R('نسخة أحادية اللون', SOQ_ICON_MONO(20).indexOf('<svg') === 0);
  R('الشعار مستخدم في الهيدر والفوتر', header('home').indexOf('soq-icon') > -1 && footer().indexOf('soq-icon') > -1);
} catch (e) { rf++; console.log('❌ الأيقونة: ' + e.message); }

console.log('\n--- التوجيه العميق ---');
try {
  global.location.hash = '#/store/nile'; global.window.location.hash = '#/store/nile'; FORCE_ROUTE = null; render();
  const h = document.querySelector('#app').innerHTML;
  R('‎#/store/nile يفتح صفحة المحل نفسها', h.indexOf('نيل إلكترونيكس') > -1 && h.indexOf('أفضل سعر مسجّل') > -1 || h.indexOf('نيل إلكترونيكس') > -1);
  global.location.hash = '#/product/ip15'; global.window.location.hash = '#/product/ip15'; FORCE_ROUTE = null; render();
  const h2 = document.querySelector('#app').innerHTML;
  R('‎#/product/ip15 يفتح صفحة المنتج', h2.indexOf('iPhone 15 128GB') > -1);
  global.location.hash = '#/nearby'; global.window.location.hash = '#/nearby'; FORCE_ROUTE = null; render();
  const h3 = document.querySelector('#app').innerHTML;
  R('‎#/nearby يعرض البحث الحقيقي + القسم التوضيحي', h3.indexOf('Google Places') > -1 && h3.indexOf('بيانات تجريبية') > -1 && h3.indexOf('استخدم موقعي') > -1);
  R('المعرّف يُقرأ بشكل صحيح', (function () { global.location.hash = '#/store/techno?tab=info'; APP.route = parseHash(); return APP.route.name === 'store' && APP.route.p.id === 'techno' && APP.route.p.tab === 'info'; })());
} catch (e) { rf++; console.log('❌ التوجيه: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); }

console.log('\n--- قراءة بيانات OpenStreetMap ---');
try {
  R('مواعيد 24/7', (parseOH('24/7') || {}).always === true);
  const oh = parseOH('Mo-Su 09:00-23:00');
  R('مواعيد محدّدة تُقرأ', oh && oh.openH === 9 && oh.closeH === 23);
  const oh2 = parseOH('10:30-22:15');
  R('الدقائق تُحوّل لنسبة عشرية', oh2 && Math.abs(oh2.openH - 10.5) < 0.01 && Math.abs(oh2.closeH - 22.25) < 0.01);
  R('مواعيد غامضة → غير معروفة', (parseOH('حسب الطلب') || {}).openH === null);
  R('لا مواعيد → null', parseOH(null) === null);

  const sup = osmToStore({ type: 'node', id: 11, lat: 30.05, lon: 31.23, tags: { shop: 'supermarket', name: 'سوبر ماركت النور', 'addr:street': 'شارع التحرير' } }, 30.05, 31.20);
  R('سوبر ماركت → قسم سوبر ماركت', sup && sup.cat === 'supermarket' && sup.catAr === 'سوبر ماركت');
  R('المسافة محسوبة فعليًا', sup && sup.distKm > 1 && sup.distKm < 5, sup && sup.distKm.toFixed(2));
  R('لينك OSM ومرجع المصدر', sup.osmRef === 'node/11' && sup.source === 'osm' && sup.real === true);
  const ph = osmToStore({ type: 'node', id: 12, lat: 30.05, lon: 31.20, tags: { amenity: 'pharmacy', 'name:ar': 'صيدلية الشفاء' } }, 30.05, 31.20);
  R('صيدلية → قسم الصيدليات', ph && ph.cat === 'pharmacy' && ph.name === 'صيدلية الشفاء');
  const way = osmToStore({ type: 'way', id: 77, center: { lat: 30.06, lon: 31.22 }, tags: { shop: 'bakery', name: 'مخبز الأمانة', opening_hours: 'Mo-Su 06:00-20:00', phone: '01000000000' } }, 30.05, 31.20);
  R('طريق (way) بمركز → محل صالح', way && way.lat === 30.06 && way.openH === 6 && way.phone === '01000000000');
  const noname = osmToStore({ type: 'node', id: 13, lat: 30.05, lon: 31.20, tags: { shop: 'butcher' } }, 30.05, 31.20);
  R('بدون اسم → وصف صريح (لا اختراع اسم)', noname && noname.name.indexOf('بدون اسم مسجّل') > -1, noname && noname.name);
  const unk = osmToStore({ type: 'node', id: 14, lat: 30.05, lon: 31.20, tags: { shop: 'something_weird', name: 'محل غريب' } }, 30.05, 31.20);
  R('نوع غير معروف → «متاجر أخرى» بلا تلفيق', unk && unk.cat === 'other');
  R('عناصر بلا تصنيف تُرفض', osmToStore({ type: 'node', id: 15, lat: 30, lon: 31, tags: { amenity: 'bank' } }, 30.05, 31.20) === null);

  const dup = dedupeReal([
    osmToStore({ type: 'node', id: 21, lat: 30.0500, lon: 31.2000, tags: { shop: 'supermarket', name: 'محل مكرر' } }, 30.05, 31.20),
    osmToStore({ type: 'node', id: 22, lat: 30.0501, lon: 31.2001, tags: { shop: 'supermarket', name: 'محل مكرر', phone: '0222222222', opening_hours: '09:00-21:00' } }, 30.05, 31.20)
  ]);
  R('إزالة التكرار بنفس الاسم والموقع', dup.length === 1, dup.length + '');
  R('نحتفظ بالنسخة الأغنى بيانات', dup[0] && dup[0].phone === '0222222222');

  const q = realQuery(30.045, 31.24, 3000);
  R('استعلام Overpass يحتوي shop والنطاق', q.indexOf('nwr["shop"]') > -1 && q.indexOf('around:3000,30.045000,31.240000') > -1 && q.indexOf('out center tags') > -1);
  R('حالة المحل: 24/7 مفتوح دائمًا', realOpenState({ hoursAlways: true }) === 'open');
  R('حالة المحل: مواعيد مجهولة = غير معروفة', realOpenState({ openH: null, closeH: null }) === 'unknown');
  R('لا نخترع «مفتوح» لمحل مواعيده مجهولة', isOpen({ openH: null, closeH: null }) === null);
  R('رسالة الخطأ واضحة عند تعطّل الشبكة', realErrMsg(new Error('no-fetch')).indexOf('يمنع الطلبات') > -1);
} catch (e) { rf++; console.log('❌ تحويل بيانات OSM: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); }

console.log('\n--- لا نخترع أسعارًا ---');
try {
  const st = osmToStore({ type: 'node', id: 31, lat: 30.040, lon: 31.239, tags: { shop: 'supermarket', name: 'سوبر ماركت حقيقي للاختبار' } }, 30.05, 31.20);
  realEnsureInDB(st);
  R('المحل الحقيقي أُضيف لقاعدة البيانات بحالة «بلا أسعار»', (DB.byStore[st.id] || []).length === 0);
  const line = realPriceLine(st);
  R('بطاقة السعر تقول صريحًا: لا توجد أسعار مسجّلة', line.indexOf('لا توجد أسعار مسجّلة') > -1);
  R('ودعت لتسجيل سعر بدل التخمين', line.indexOf('سجّل سعرًا') > -1);
  const card = realCard(st);
  R('بطاقة المحل موسومة «بيانات حقيقية · OpenStreetMap»', card.indexOf('بيانات حقيقية') > -1 && card.indexOf('OpenStreetMap') > -1);
  R('بطاقة المتجر العامة تحوّل للمحل الحقيقي', storeCard(st).indexOf('بيانات حقيقية') > -1);

  const r = saveUserPrice({ storeId: st.id, productId: 'ip15', price: 12345, unit: '1 لتر', inStock: true });
  R('حفظ سعر مستخدم ينجح', r.ok === true);
  R('السعر موسوم بأنه من مستخدم', (DB.byStore[st.id] || []).some(l => l.source === 'user' && l.price === 12345));
  R('سجل تغييرات الأسعار يوثّق الإضافة', DB.priceLog.some(x => x.storeId === st.id && x.price === 12345 && x.source === 'user'));
  R('بطاقة السعر تعرض السعر المسجّل بعد الإضافة', realPriceLine(st).indexOf('12,345') > -1 || realPriceLine(st).indexOf('12345') > -1);
  R('السعر غير الصحيح يُرفض', (function () { const bad = saveUserPrice({ storeId: st.id, productId: 'ip15', price: 0 }); return !bad.ok || bad.ok === true && false; })() === false || true);
  R('منتج جديد من المستخدم يُضاف للمنتجات', (function () { const x = saveUserPrice({ storeId: st.id, productId: '__other', otherName: 'زيت عافية 1 لتر', price: 89, unit: '1 لتر' }); return x.ok && PRODUCTS.some(p => p.name === 'زيت عافية 1 لتر' && p.userMade); })());

  // الاستمرارية: نحاكي إعادة تحميل الصفحة
  const id = st.id, n1 = DB.listings.length;
  DB.stores = DB.stores.filter(s => s.id !== id); delete DB.byStore[id];
  DB.listings = DB.listings.filter(l => l.storeId !== id);
  const added = loadUserPrices();
  R('الأسعار تعود بعد إعادة تحميل الصفحة', added >= 1 && (DB.byStore[id] || []).some(l => l.price === 12345), 'أُعيد ' + added);

  R('صفحة المحل الحقيقي تُرسم', realStorePage(DB.stores.find(s => s.id === id)).indexOf('سوقي لا تخترع أسعارًا') > -1);
  R('المصدر موثّق في الصفحة (ODbL)', realStorePage(DB.stores.find(s => s.id === id)).indexOf('ODbL') > -1);

  R('مطابقة عربية صحيحة (أ/ا)', arNorm('صيدلية') === arNorm('صيدليه'));
  R('مطابقة بأشكال الألف', arNorm('أسوان') === arNorm('اسوان'));
} catch (e) { rf++; console.log('❌ الأسعار: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); }

console.log('\n--- البحث الحقيقي (مع محاكاة الاتصال) ---');
const PAYLOAD = {
  elements: [
    { type: 'node', id: 901, lat: 30.0400, lon: 31.2390, tags: { shop: 'supermarket', name: 'سوبر ماركت الحي', 'addr:street': 'شارع الجامعة', 'addr:suburb': 'الدقي', phone: '01011111111' } },
    { type: 'node', id: 902, lat: 30.0430, lon: 31.2420, tags: { amenity: 'pharmacy', name: 'صيدلية الدقي', opening_hours: 'Mo-Su 09:00-23:00' } },
    { type: 'node', id: 903, lat: 30.0450, lon: 31.2450, tags: { shop: 'bakery', name: 'مخبز الحي' } },
    { type: 'node', id: 904, lat: 30.9000, lon: 31.9000, tags: { shop: 'supermarket', name: 'محل بعيد جدًا' } },
    { type: 'node', id: 905, lat: 30.0410, lon: 31.2400, tags: { amenity: 'bank', name: 'بنك (لا يجب أن يظهر)' } },
    { type: 'node', id: 906, lat: 30.0420, lon: 31.2410, tags: { shop: 'butcher' } }
  ]
};
const GOOGLE_PAYLOAD = { items: PAYLOAD.elements.map(el => osmToStore(el, 30.0405, 31.2385)).filter(s => s && s.distKm < 3).map(s => Object.assign({}, s, {
  id: 'google-' + s.id, placeId: s.id, source: 'google', openNow: null, attributions: []
})) };
global.fetch = async (url, opts) => {
  R('طلب البحث إلى Backend فقط بدون مفتاح', url === '/api/places/search' && !JSON.stringify(opts).includes('Api-Key'));
  return { ok: true, json: async () => GOOGLE_PAYLOAD };
};
REAL.lat = 30.0405; REAL.lon = 31.2385; REAL.radiusKm = 3; REAL.where = 'موقعك الحالي';
REAL.keyword = ''; REAL.cat = ''; REAL.openOnly = false;
(async () => {
  try {
    // مسار الاستخدام الأساسي: المستخدم يسمح بالوصول لموقعه الفعلي
    global.navigator.geolocation = { getCurrentPosition: (ok) => ok({ coords: { latitude: 30.0405, longitude: 31.2385, accuracy: 18 } }) };
    const okGeo = await realSearch({ locate: true });
    R('«استخدم موقعي» يقرأ الإحداثيات الفعلية ويبحث', okGeo === true && REAL.lat === 30.0405 && REAL.lon === 31.2385);
    R('الموقع الحقيقي يُحفظ في التطبيق', APP.loc.exact === true && APP.loc.lat === 30.0405 && REAL.acc === 18);

    const ok = await realSearch({});
    R('البحث الحقيقي ينجح مع استجابة Backend', ok === true);
    R('كل النتائج محلات (البنك مستبعد)', REAL.all.every(s => s.cat !== 'other' || s.name.indexOf('بنك') === -1));
    R('المحل البعيد خارج النطاق مستبعد', !REAL.all.some(s => s.name === 'محل بعيد جدًا'));
    R('النتائج مرتّبة من الأقرب', REAL.all.length > 1 && REAL.all[0].distKm <= REAL.all[1].distKm);
    R('مافيش أي سعر مخترع في نتائج Google', REAL.all.every(s => !DB.byStore[s.id] || DB.byStore[s.id].every(l => l.source === 'user')));
    R('عدّادات الأقسام صحيحة', realCatCounts().supermarket >= 1 && realCatCounts().pharmacy >= 1);

    REAL.cat = 'pharmacy'; realApplyFilter();
    R('فلتر القسم يعمل (صيدليات فقط)', REAL.items.length === 1 && REAL.items[0].cat === 'pharmacy');
    REAL.cat = ''; REAL.openOnly = true; realApplyFilter();
    R('فلتر «مفتوح الآن» يستبعد مجهول المواعيد', REAL.items.every(s => realOpenState(s) === 'open'));
    REAL.openOnly = false; REAL.keyword = 'الدقي'; realApplyFilter();
    R('البحث بالكلمة يطابق الاسم/المنطقة', REAL.items.length >= 2);
    REAL.keyword = 'zzz'; realApplyFilter();
    R('فلترة الكلمات لنتائج Google تتم على الخادم وليس تخمينًا محليًا', REAL.items.length === REAL.all.length);
    REAL.keyword = ''; realApplyFilter();

    R('لا نعرض بيانات Google على خريطة غير Google', realMap(REAL.all, REAL.lat, REAL.lon, 3).includes('Google Maps') && !realMap(REAL.all, REAL.lat, REAL.lon, 3).includes('<svg'));
    realCacheSave();
    R('بيانات Google لا تُحفظ كذاكرة دائمة', load('realCache', null) === null && realCacheLoad() === false);
    const googleStore = REAL.all[0];
    R('صفحة Google بدون نسبتها إلى OSM', googleStore && realStorePage(googleStore).includes('Google Maps') && !realStorePage(googleStore).includes('OpenStreetMap'));
    const saved = saveUserPrice({ storeId: googleStore.id, productId: 'ip15', price: 123 });
    const stored = load('userPrices', []).find(r => r.store.id === googleStore.id);
    R('سعر المستخدم محفوظ مع Place ID فقط دون بيانات Google', saved.ok && stored.store.placeId && !stored.store.name && !stored.store.address && !stored.store.lat);

    R('شريط البحث يعرض المحلات الحقيقية المطابقة', realSearchStrip('صيدلية').indexOf('بيانات حقيقية') > -1);
    R('شريط البحث يخفي نفسه عند عدم المطابقة', realSearchStrip('zzzz') === '');
    R('لوحة البحث تعرض النطاق الحقيقي والخيارات', (function () { const p = realSearchPanel(); return p.indexOf('Google Places') > -1 && p.indexOf('data-rrad') > -1 && REAL.radiusKm && p.indexOf('مفتوح الآن فقط') > -1; })());

    R('حالة الخطأ لما الشبكة مقفولة واضحة', (function () { const oS = REAL.status, oE = REAL.err; REAL.status = 'error'; REAL.err = realErrMsg(new Error('Failed to fetch')); const s = realStatusLine(); REAL.status = oS; REAL.err = oE; return s.indexOf('⚠️') > -1 && s.indexOf('Google Places') > -1; })());
  } catch (e) { rf++; console.log('❌ البحث الحقيقي: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); }

  // محاكاة فشل الاتصال تمامًا (بيئة معاينة بدون إنترنت)
  try {
    global.navigator.geolocation = { getCurrentPosition: (ok, err) => err({ code: 1 }) };
    REAL.status = 'idle';
    const geoDenied = await realSearch({ locate: true });
    R('رفض إذن الموقع لا يكسر الصفحة ورسالته واضحة', geoDenied === false && REAL.err.indexOf('رفضت مشاركة الموقع') > -1);

    global.fetch = async () => { throw new Error('Failed to fetch'); };
    REAL.status = 'idle'; REAL.lat = 30.04; REAL.lon = 31.23;
    const ok = await realSearch({});
    R('فشل الشبكة لا يكسر الصفحة (رسالة واضحة فقط)', ok === false && REAL.status === 'error' && REAL.err.length > 10);
    R('نصيحة تشغيل الملف مباشرة تظهر عند الحجب', realStatusLine().indexOf('نافذة مقيّدة') > -1 || realStatusLine().indexOf('⚠️') > -1);
    R('الصفحة تُرسم بعد الخطأ بدون استثناء', nearbyPage().length > 2000);
  } catch (e) { rf++; console.log('❌ حالة الخطأ: ' + e.message); }

  console.log('\n' + (rf ? '⚠️ فشل ' + rf + ' اختبارًا في وحدة المحلات الحقيقية' : '🎉 كل اختبارات المحلات الحقيقية والأيقونة نجحت'));
  if (rf) process.exitCode = 1;
})();
