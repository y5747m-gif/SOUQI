/* =========================================================================
   الجزء 4-ب: المتاجر الحقيقية حولك — بحث حقيقي في OpenStreetMap
   -------------------------------------------------------------------------
   الفكرة: مفيش بيانات وهمية في «المتاجر القريبة». الأداة بتاخد موقعك الفعلي
   (GPS) أو أي منطقة تختارها، وبتسأل قاعدة بيانات OpenStreetMap المفتوحة عن
   المحلات الحقيقية المسجّلة على أرض الواقع داخل النطاق، وترجّع:
   الاسم • النوع • العنوان • المسافة • التليفون • المواعيد • لينك الخريطة.
   وبخصوص الأسعار: لا نعرف أي سعر من OSM، فبنقول بوضوح «لا توجد أسعار مسجّلة»
   وبنسمح للمستخدم إنه يسجّل السعر بنفسه — ومش بنخترع أي رقم.
   ========================================================================= */

const REAL = {
  status: 'idle',        // idle | locating | loading | ready | error
  all: [],               // كل المتاجر الحقيقية في النطاق
  items: [],             // بعد الفلاتر (قسم/كلمة/مفتوح)
  edits: {},             // تعديلات المستخدم على نتائج OpenStreetMap (اسم/نوع/مواعيد/تعليق)
  at: 0,                 // وقت آخر بحث
  lat: null, lon: null, acc: null, where: '',
  radiusKm: 3,
  keyword: '', cat: '', openOnly: false,
  err: '', endpoint: '', usedCache: false, note: ''
};
const OSM_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/* مناطقة مصر بإحداثيات حقيقية — تُستخدم لو الجهاز رفض مشاركة الموقع */
const EG_AREAS = [
  { ar: 'وسط القاهرة', lat: 30.0459, lon: 31.2405 }, { ar: 'مدينة نصر', lat: 30.0586, lon: 31.3305 },
  { ar: 'مصر الجديدة', lat: 30.0896, lon: 31.3321 }, { ar: 'المعادي', lat: 29.9603, lon: 31.2503 },
  { ar: 'حلوان', lat: 29.8500, lon: 31.3300 }, { ar: 'شبرا الخيمة', lat: 30.1286, lon: 31.2422 },
  { ar: 'العبور', lat: 30.2280, lon: 31.4560 }, { ar: 'القاهرة الجديدة (التجمع)', lat: 30.0074, lon: 31.4913 },
  { ar: 'مدينة 6 أكتوبر', lat: 29.9285, lon: 30.9188 }, { ar: 'الشيخ زايد', lat: 30.0055, lon: 30.9750 },
  { ar: 'الجيزة — الدقي', lat: 30.0131, lon: 31.2089 }, { ar: 'الهرم وفيصل', lat: 29.9900, lon: 31.1700 },
  { ar: 'الإسكندرية — وسط البلد', lat: 31.2001, lon: 29.9187 }, { ar: 'سموحة', lat: 31.2150, lon: 29.9500 },
  { ar: 'العجمي', lat: 31.1300, lon: 29.7800 }, { ar: 'المنصورة', lat: 31.0409, lon: 31.3785 },
  { ar: 'طنطا', lat: 30.7865, lon: 31.0004 }, { ar: 'دمنهور', lat: 31.0341, lon: 30.4682 },
  { ar: 'كفر الشيخ', lat: 31.1107, lon: 30.9388 }, { ar: 'الزقازيق', lat: 30.5877, lon: 31.5020 },
  { ar: 'بنها', lat: 30.4662, lon: 31.1837 }, { ar: 'دمياط', lat: 31.4165, lon: 31.8133 },
  { ar: 'بورسعيد', lat: 31.2653, lon: 32.3019 }, { ar: 'الإسماعيلية', lat: 30.5965, lon: 32.2715 },
  { ar: 'السويس', lat: 29.9668, lon: 32.5498 }, { ar: 'الفيوم', lat: 29.3084, lon: 30.8428 },
  { ar: 'بني سويف', lat: 29.0661, lon: 31.0994 }, { ar: 'المنيا', lat: 28.1099, lon: 30.7503 },
  { ar: 'أسيوط', lat: 27.1809, lon: 31.1837 }, { ar: 'سوهاج', lat: 26.5591, lon: 31.6957 },
  { ar: 'قنا', lat: 26.1551, lon: 32.7160 }, { ar: 'الأقصر', lat: 25.6872, lon: 32.6396 },
  { ar: 'أسوان', lat: 24.0889, lon: 32.8998 }, { ar: 'الغردقة', lat: 27.2579, lon: 33.8116 },
  { ar: 'شرم الشيخ', lat: 27.9158, lon: 34.3300 }, { ar: 'مرسى مطروح', lat: 31.3543, lon: 27.2373 },
  { ar: 'العريش', lat: 31.1312, lon: 33.7984 }, { ar: 'الطور (سيناء)', lat: 28.2410, lon: 33.6220 }
];

/* تحويل وسوم OpenStreetMap → أقسام سوقي + اسم نوع عربي دقيق */
const OSM_TYPES = {
  'shop=supermarket': ['supermarket', 'سوبر ماركت'], 'shop=convenience': ['supermarket', 'بقالة'],
  'shop=grocery': ['supermarket', 'بقالة'], 'shop=general': ['supermarket', 'بقالة عامة'],
  'shop=greengrocer': ['supermarket', 'خضار وفاكهة'], 'shop=fruit': ['supermarket', 'فاكهة'],
  'shop=butcher': ['supermarket', 'جزارة'], 'shop=seafood': ['supermarket', 'أسماك'],
  'shop=cheese': ['supermarket', 'أجبان وألبان'], 'shop=dairy': ['supermarket', 'ألبان'],
  'shop=deli': ['supermarket', 'أغذية'], 'shop=kiosk': ['supermarket', 'كشك'],
  'shop=spices': ['supermarket', 'عطارة'], 'shop=confectionery': ['supermarket', 'حلويات ومكسرات'],
  'shop=nuts': ['supermarket', 'مكسرات'], 'shop=beverages': ['supermarket', 'مشروبات'],
  'shop=water': ['supermarket', 'مياه'], 'shop=pasta': ['supermarket', 'مكرونة'],
  'shop=pastry': ['restaurant', 'حلويات وباتيسري'], 'shop=bakery': ['restaurant', 'مخبز'],
  'shop=coffee': ['restaurant', 'قهوة'], 'shop=tea': ['supermarket', 'شاي'],
  'shop=tobacco': ['supermarket', 'دخان'], 'shop=e-cigarette': ['supermarket', 'فيب'],
  'shop=alcohol': ['supermarket', 'مشروبات'],
  'shop=variety_store': ['home', 'متجر متنوع'], 'shop=department_store': ['home', 'متجر شامل'],
  'shop=wholesale': ['supermarket', 'جملة'],
  'shop=marketplace': ['supermarket', 'سوق'], 'amenity=marketplace': ['supermarket', 'سوق شعبي'],
  'shop=pharmacy': ['pharmacy', 'صيدلية'], 'amenity=pharmacy': ['pharmacy', 'صيدلية'],
  'healthcare=pharmacy': ['pharmacy', 'صيدلية'], 'shop=chemist': ['pharmacy', 'صيدلية'],
  'shop=herbalist': ['pharmacy', 'أعشاب طبية'], 'shop=medical_supply': ['pharmacy', 'مستلزمات طبية'],
  'shop=optician': ['pharmacy', 'نظارات وبصريات'], 'shop=hearing_aids': ['pharmacy', 'سماعات طبية'],
  'shop=mobile_phone': ['mobile', 'موبايلات'], 'shop=telecommunication': ['mobile', 'اتصالات'],
  'shop=electronics': ['electronics', 'إلكترونيات'], 'shop=computer': ['computer', 'كمبيوتر'],
  'shop=hifi': ['audio', 'صوتيات'], 'shop=music': ['audio', 'موسيقى'],
  'shop=musical_instrument': ['audio', 'آلات موسيقية'], 'shop=video_games': ['gaming', 'ألعاب فيديو'],
  'shop=toys': ['gaming', 'ألعاب أطفال'], 'shop=games': ['gaming', 'ألعاب'],
  'shop=clothes': ['clothing', 'ملابس'], 'shop=boutique': ['clothing', 'بوتيك'],
  'shop=fabric': ['clothing', 'أقمشة'], 'shop=tailor': ['clothing', 'خياطة'],
  'shop=jewelry': ['clothing', 'مجوهرات'], 'shop=watches': ['clothing', 'ساعات'],
  'shop=shoes': ['shoes', 'أحذية'], 'shop=bag': ['shoes', 'شنط'], 'shop=leather': ['shoes', 'جلود'],
  'shop=beauty': ['beauty', 'تجميل'], 'shop=cosmetics': ['beauty', 'مستحضرات تجميل'],
  'shop=perfumery': ['beauty', 'عطور'], 'shop=hairdresser': ['beauty', 'كوافير وحلاقة'],
  'shop=massage': ['beauty', 'مساج'], 'shop=nails': ['beauty', 'أظافر'],
  'shop=books': ['books', 'مكتبة وكتب'], 'shop=stationery': ['books', 'أدوات مكتبية'],
  'shop=newsagent': ['books', 'صحف ومجلات'], 'shop=copyshop': ['books', 'تصوير وطباعة'],
  'shop=art': ['books', 'أدوات فنية'],
  'shop=hardware': ['tools', 'أدوات وخردوات'], 'shop=doityourself': ['tools', 'مستلزمات تشطيب'],
  'shop=paint': ['tools', 'دهانات'], 'shop=electrical': ['tools', 'أدوات كهربائية'],
  'shop=garden_centre': ['tools', 'مستلزمات زراعة'], 'shop=trade': ['tools', 'مواد بناء'],
  'shop=glaziery': ['tools', 'زجاج وألمنيوم'], 'shop=tools': ['tools', 'عدد وأدوات'],
  'shop=car': ['auto', 'سيارات'], 'shop=car_repair': ['auto', 'ورشة سيارات'],
  'amenity=car_repair': ['auto', 'ورشة سيارات'], 'shop=car_parts': ['auto', 'قطع غيار'],
  'shop=tyres': ['auto', 'إطارات'], 'shop=motorcycle': ['auto', 'موتوسيكلات'],
  'shop=car_wash': ['auto', 'غسيل سيارات'], 'amenity=car_wash': ['auto', 'غسيل سيارات'],
  'amenity=fuel': ['auto', 'محطة بنزين'], 'shop=bicycle': ['sports', 'دراجات'],
  'shop=sports': ['sports', 'رياضة'], 'shop=outdoor': ['sports', 'مستلزمات رحلات'],
  'shop=fitness': ['sports', 'لياقة'], 'leisure=fitness_centre': ['sports', 'جيم'],
  'shop=furniture': ['home', 'أثاث'], 'shop=interior_decoration': ['home', 'ديكور'],
  'shop=houseware': ['home', 'أدوات منزلية'], 'shop=kitchen': ['home', 'مطابخ'],
  'shop=bed': ['home', 'مفروشات'], 'shop=curtain': ['home', 'ستائر'],
  'shop=carpet': ['home', 'سجاد'], 'shop=lighting': ['home', 'إضاءة'],
  'shop=appliance': ['home', 'أجهزة منزلية'], 'shop=pet': ['home', 'مستلزمات حيوانات'],
  'shop=florist': ['home', 'زهور'], 'shop=laundry': ['home', 'مغسلة'],
  'amenity=restaurant': ['restaurant', 'مطعم'], 'amenity=fast_food': ['restaurant', 'وجبات سريعة'],
  'amenity=cafe': ['restaurant', 'كافيه'], 'amenity=food_court': ['restaurant', 'فود كورت'],
  'amenity=ice_cream': ['restaurant', 'آيس كريم'], 'amenity=juice_bar': ['restaurant', 'عصائر'],
  'amenity=internet_cafe': ['electronics', 'كافيه إنترنت'],
  'craft=electrician': ['tools', 'كهربائي'], 'craft=plumber': ['tools', 'سبّاك'],
  'craft=carpenter': ['tools', 'نجار'], 'craft=car_repair': ['auto', 'ورشة سيارات'],
  'craft=tailor': ['clothing', 'خياط'], 'craft=shoemaker': ['shoes', 'إصلاح أحذية'],
  'craft=photographer': ['books', 'استوديو تصوير']
};
const OSM_CAT_META = { other: ['🏬', 'متاجر أخرى'] };

/* ------------------------- 1. أدوات مساعدة ------------------------- */
function arNorm(s) {
  return String(s == null ? '' : s).replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
}
function realCatInfo(cat) {
  const c = CATS.find(x => x.id === cat);
  if (c) return { id: c.id, ar: c.ar, em: c.em };
  return { id: 'other', ar: OSM_CAT_META.other[1], em: OSM_CAT_META.other[0] };
}
/* نوع المحل من وسوم OSM */
function osmKindOf(tags) {
  tags = tags || {};
  const keys = ['shop', 'amenity', 'craft', 'healthcare', 'leisure'];
  // خرائط صريحة فقط: أي عنصر غير تجاري (بنك/مستشفى/مدرسة) لا يُعتبر محلًا
  for (const k of keys) if (tags[k]) { const hit = OSM_TYPES[k + '=' + tags[k]]; if (hit) return { kind: k, val: tags[k], cat: hit[0], ar: hit[1] }; }
  if (tags.shop) return { kind: 'shop', val: tags.shop, cat: 'other', ar: 'متجر' };
  if (tags.craft) return { kind: 'craft', val: tags.craft, cat: 'other', ar: 'ورشة' };
  return null;
}
/* الاسم: عربي إن وُجد، وإلا الاسم المسجّل أو العلامة التجارية، وإلا وصف واضح */
function osmName(tags, arType) {
  tags = tags || {};
  const ar = tags['name:ar'], nm = tags.name, en = tags['name:en'];
  const main = (ar && /[ء-ي]/.test(ar) ? ar : nm || en || tags.brand || tags.operator || '');
  if (main) return main;
  return arType + ' (بدون اسم مسجّل)';
}
/* مواعيد العمل: محاولة قراءة الوسم النصي، وإن فشلنا نقول «غير معروفة» بصراحة */
function parseOH(s) {
  if (!s || typeof s !== 'string') return null;
  const t = s.trim();
  if (/^24\s*\/\s*7/i.test(t)) return { always: true, raw: t };
  let m = t.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (m) return { always: false, openH: (+m[1]) + (+m[2]) / 60, closeH: (+m[3]) + (+m[4]) / 60, raw: t };
  m = t.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
  if (m) return { always: false, openH: +m[1], closeH: +m[2], raw: t };
  return { always: false, openH: null, closeH: null, raw: t };
}
function realHoursText(st) {
  if (!st) return 'مواعيد غير مسجّلة';
  if (st.hoursAlways) return 'مفتوح 24 ساعة';
  if (st.openH == null || st.closeH == null) return 'مواعيد غير مسجّلة';
  if (st.hoursRaw && st.hoursRaw.length <= 26) return st.hoursRaw.replace(/;/g, ' · ');
  return timeTxt(st.openH) + ' — ' + timeTxt(st.closeH);
}
/* حالة المحل: مفتوح / مغلق / غير معروفة — بلا تخمين */
function realOpenState(st) {
  if (!st) return 'unknown';
  if (st.hoursAlways) return 'open';
  if (st.openH == null || st.closeH == null) return 'unknown';
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (st.closeH > st.openH) return (h >= st.openH && h < st.closeH) ? 'open' : 'closed';
  return (h >= st.openH || h < st.closeH) ? 'open' : 'closed';
}
function realOpenBadge(st) {
  const s = realOpenState(st);
  if (s === 'open') return '<span class="badge ok"><i class="dot g"></i> مفتوح الآن (حسب مواعيد OSM)</span>';
  if (s === 'closed') return '<span class="badge ink"><i class="dot r"></i> مغلق حاليًا</span>';
  return '<span class="badge ink">🕒 مواعيد غير مسجّلة</span>';
}
function realAddr(tags, area) {
  tags = tags || {};
  const str = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const ar2 = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] || tags['addr:district'];
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:state'];
  const parts = [str, ar2 || area, city].filter(Boolean);
  return parts.join('، ');
}
/* وسم OSM → متجر داخل التطبيق */
function osmToStore(el, uLat, uLon) {
  if (!el || !el.tags) return null;
  const info = osmKindOf(el.tags);
  if (!info) return null;
  const lat = el.lat != null ? el.lat : (el.center && el.center.lat);
  const lon = el.lon != null ? el.lon : (el.center && el.center.lon);
  if (lat == null || lon == null) return null;
  const tags = el.tags;
  const oh = parseOH(tags.opening_hours);
  const id = 'osm-' + (el.type === 'node' ? 'n' : el.type === 'way' ? 'w' : 'r') + el.id;
  const st = {
    id, real: true, source: 'osm', osmRef: el.type + '/' + el.id,
    name: osmName(tags, info.ar), cat: info.cat, catAr: info.ar, subLabel: info.ar,
    cats: [info.cat], lat, lon,
    area: tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:district'] || '',
    city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:state'] || '',
    address: realAddr(tags, REAL.where || ''),
    phone: tags.phone || tags['contact:phone'] || tags.mobile || '',
    website: tags.website || tags['contact:website'] || '',
    hoursRaw: tags.opening_hours || '', hoursAlways: !!(oh && oh.always),
    openH: oh && !oh.always && oh.openH != null ? oh.openH : null,
    closeH: oh && !oh.always && oh.closeH != null ? oh.closeH : null,
    verified: false, rating: 0, rc: 0, plan: 'osm', delivery: false,
    pay: [], svc: [], fri: '', joined: null, views: 0, clicksWa: 0, calls: 0, dirs: 0, weekly: [],
    desc: '', tags, distKm: distKm({ lat: uLat, lon: uLon }, { lat, lon })
  };
  // تعديلات المستخدم المحلية على بيانات OSM
  const e = REAL.edits[id];
  if (e) { if (e.name) st.name = e.name; if (e.catAr) { st.catAr = e.catAr; st.subLabel = e.catAr; } if (e.area) st.area = e.area; if (e.note) st.desc = e.note; st.edited = true; }
  return st;
}
/* إزالة التكرار: نفس الاسم داخل 80 مترًا = محل واحد */
function dedupeReal(list) {
  const out = [];
  list.forEach(s => {
    const dup = out.find(o => arNorm(o.name) === arNorm(s.name) && distKm(o, s) < 0.08);
    if (!dup) { out.push(s); return; }
    // نحتفظ بالأغنى بيانات
    const rich = (o) => (o.phone ? 2 : 0) + (o.hoursRaw ? 2 : 0) + (o.address ? 1 : 0) + Object.keys(o.tags || {}).length / 10;
    if (rich(s) > rich(dup)) Object.assign(dup, s);
  });
  return out;
}
function realQuery(lat, lon, radiusM) {
  const A = `(around:${radiusM},${lat.toFixed(6)},${lon.toFixed(6)})`;
  return `[out:json][timeout:25];(` +
    `nwr["shop"]${A};` +
    `nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|pharmacy|marketplace|fuel|car_wash|car_repair|bakery|internet_cafe|juice_bar)$"]${A};` +
    `nwr["craft"]${A};` +
    `nwr["healthcare"="pharmacy"]${A};` +
    `);out center tags 400;`;
}
const realHost = (u) => String(u).replace(/^https?:\/\//, '').split('/')[0];

/* ------------------------- 2. الاتصال بالخدمة ------------------------- */
async function realFetch(query, ms) {
  if (typeof fetch !== 'function' || typeof AbortController !== 'function')
    throw new Error('no-fetch');
  let last = null;
  for (const url of OSM_ENDPOINTS) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), ms || 16000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: ctl.signal
      });
      clearTimeout(t);
      if (!res.ok) { last = new Error('http:' + res.status); continue; }
      const json = await res.json();
      REAL.endpoint = realHost(url);
      return json;
    } catch (e) { last = e; }
  }
  throw last || new Error('service');
}
async function realGeocodeArea(q) {
  if (typeof fetch !== 'function') throw new Error('no-fetch');
  const url = NOMINATIM + '?format=json&limit=1&countrycodes=eg&accept-language=ar&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('http:' + res.status);
  const j = await res.json();
  if (!j.length) return null;
  return { lat: +j[0].lat, lon: +j[0].lon, where: j[0].display_name.split(',').slice(0, 2).join('، ') };
}
function realErrMsg(e) {
  const m = String((e && e.message) || e || '');
  if (m === 'no-fetch') return 'المتصفح لا يدعم الاتصال بالخدمة، أو المتصفح يمنع الطلبات الخارجية في هذه البيئة.';
  if (m.includes('http:403') || m.includes('http:429')) return 'خدمة OpenStreetMap رفضت الطلب مؤقتًا (حد استخدام). استنى دقيقة وجرّب تاني.';
  if (m === 'service' || m.includes('abort')) return 'تعذّر الوصول لخدمة OpenStreetMap. تأكد من الإنترنت وجرّب مرة أخرى.';
  return 'تعذّر الوصول لخدمة OpenStreetMap (' + (m || 'خطأ غير معروف') + ').';
}
const realIsNetworkBlocked = () => /no-fetch|Failed to fetch|NetworkError|Load failed|ERR_|abort/i.test(REAL.err || '');

/* ------------------------- 3. الموقع الحقيقي ------------------------- */
function realLocate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('geo-unsupported'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy || 0) }),
      err => reject(new Error(err && err.code === 1 ? 'geo-denied' : err && err.code === 3 ? 'geo-timeout' : 'geo-fail')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  });
}
function realLocateMsg(e) {
  const m = String((e && e.message) || '');
  if (m === 'geo-unsupported') return 'جهازك/المتصفح لا يدعم تحديد الموقع. اختر منطقتك من القائمة وجرّب.';
  if (m === 'geo-denied') return 'رفضت مشاركة الموقع. اختر منطقتك من القائمة يدويًا — البحث هيبقى حقيقي برضه.';
  if (m === 'geo-timeout') return 'تحديد الموقع أخد وقتًا طويلًا. جرّب تاني أو اختر منطقتك يدويًا.';
  return 'تعذّر تحديد موقعك. اختار منطقتك من القائمة.';
}
function realApprox() {
  const n = DB.stores.map(s => Object.assign({}, s, { d: distKm(LOC, s) })).sort((a, b) => a.d - b.d)[0];
  return n ? { where: n.area + ' — ' + n.city, lat: APP.loc.lat, lon: APP.loc.lon } : { where: APP.loc.label, lat: APP.loc.lat, lon: APP.loc.lon };
}

/* ------------------------- 4. البحث ------------------------- */
function realApplyFilter() {
  const kw = arNorm(REAL.keyword);
  REAL.items = REAL.all.filter(s => {
    if (REAL.cat && s.cat !== REAL.cat) return false;
    if (REAL.openOnly && realOpenState(s) !== 'open') return false;
    if (kw && !(arNorm(s.name).includes(kw) || arNorm(s.catAr).includes(kw) || arNorm(s.area).includes(kw) || arNorm(s.city).includes(kw))) return false;
    return true;
  });
  return REAL.items;
}
function realCatCounts() {
  const m = {};
  REAL.all.forEach(s => m[s.cat] = (m[s.cat] || 0) + 1);
  return m;
}
async function realSearch(opts) {
  opts = opts || {};
  if (opts.radiusKm) REAL.radiusKm = parseFloat(opts.radiusKm);
  if (opts.keyword != null) REAL.keyword = opts.keyword;
  if (opts.cat != null) REAL.cat = opts.cat;
  if (opts.openOnly != null) REAL.openOnly = opts.openOnly;
  if (opts.locate) {
    REAL.status = 'locating'; REAL.err = ''; realRefreshUI();
    try {
      const p = await realLocate();
      REAL.lat = p.lat; REAL.lon = p.lon; REAL.acc = p.acc;
      REAL.where = 'موقعك الحالي' + (p.acc ? ' (±' + p.acc + ' م)' : '');
      APP.loc = { lat: p.lat, lon: p.lon, label: REAL.where, area: 'موقعك الحالي', city: '', exact: true };
      save('loc', APP.loc);
    } catch (e) { REAL.status = 'error'; REAL.err = realLocateMsg(e); realRefreshUI(); return false; }
  }
  if (REAL.lat == null) {
    REAL.status = 'error';
    REAL.err = 'لسه محددناش موقعك. اضغط «📍 استخدم موقعي» أو اختار منطقتك من القائمة.';
    realRefreshUI(); return false;
  }
  REAL.status = 'loading'; REAL.err = ''; REAL.note = ''; realRefreshUI();
  try {
    const json = await realFetch(realQuery(REAL.lat, REAL.lon, Math.max(300, Math.round(REAL.radiusKm * 1000))));
    const list = (json.elements || []).map(el => osmToStore(el, REAL.lat, REAL.lon))
      .filter(s => s && s.distKm <= REAL.radiusKm + 0.02);
    REAL.all = dedupeReal(list).sort((a, b) => a.distKm - b.distKm);
    REAL.at = Date.now(); REAL.usedCache = false;
    realApplyFilter();
    REAL.status = 'ready';
    realCacheSave();
    if (!REAL.all.length) REAL.note = 'مفيش محلات مسجّلة على OpenStreetMap في النطاق ده. جرّب توسّع النطاق أو غيّر المنطقة.';
    toast(REAL.all.length ? `لقينا <b>${REAL.all.length}</b> محلًا حقيقيًا حولك` : 'مفيش محلات مسجّلة في النطاق ده — وسّعه', REAL.all.length ? 'ok' : 'warn', REAL.all.length ? '🏬' : '🔍');
  } catch (e) {
    REAL.status = 'error'; REAL.err = realErrMsg(e);
  }
  realRefreshUI();
  return REAL.status === 'ready';
}
async function realSearchArea(q, opts) {
  opts = opts || {};
  const known = EG_AREAS.find(a => arNorm(a.ar) === arNorm(q));
  REAL.status = 'locating'; REAL.err = ''; realRefreshUI();
  try {
    let p = known ? { lat: known.lat, lon: known.lon, where: known.ar } : await realGeocodeArea(q);
    if (!p) { REAL.status = 'error'; REAL.err = 'مش عارفين نحدد «' + esc(q) + '» على الخريطة. اكتب اسم المنطقة أو المحافظة بشكل أوضح (مثال: المنصورة).'; realRefreshUI(); return false; }
    REAL.lat = p.lat; REAL.lon = p.lon; REAL.acc = null; REAL.where = p.where;
    APP.loc = { lat: p.lat, lon: p.lon, label: p.where, area: p.where, city: '', exact: false };
    save('loc', APP.loc);
  } catch (e) {
    REAL.status = 'error'; REAL.err = realErrMsg(e); realRefreshUI(); return false;
  }
  return realSearch(opts);
}
function realCacheSave() {
  try {
    const items = REAL.all.slice(0, 220).map(s => ({
      id: s.id, osmRef: s.osmRef, name: s.name, cat: s.cat, catAr: s.catAr, subLabel: s.subLabel,
      lat: s.lat, lon: s.lon, area: s.area, city: s.city, address: s.address, phone: s.phone,
      website: s.website, hoursRaw: s.hoursRaw, hoursAlways: s.hoursAlways, openH: s.openH, closeH: s.closeH
    }));
    save('realCache', { at: REAL.at, lat: REAL.lat, lon: REAL.lon, where: REAL.where, radiusKm: REAL.radiusKm, endpoint: REAL.endpoint, items });
  } catch (e) { }
}
function realCacheLoad() {
  const c = load('realCache', null);
  if (!c || !c.items || !c.items.length) return false;
  REAL.lat = c.lat; REAL.lon = c.lon; REAL.where = c.where; REAL.radiusKm = c.radiusKm || REAL.radiusKm;
  REAL.endpoint = c.endpoint || '';
  REAL.all = c.items.map(s => Object.assign({
    real: true, source: 'osm', cats: [s.cat], verified: false, rating: 0, rc: 0, plan: 'osm',
    delivery: false, pay: [], svc: [], views: 0, desc: '', tags: {}
  }, s, { distKm: distKm({ lat: c.lat, lon: c.lon }, { lat: s.lat, lon: s.lon }) }))
    .sort((a, b) => a.distKm - b.distKm);
  REAL.at = c.at; REAL.status = 'ready'; REAL.usedCache = true;
  realApplyFilter();
  return true;
}
function realRefreshUI() {
  if (APP.route.name === 'nearby') render();
  else {
    const box = $('#realLive');
    if (box) box.innerHTML = realStatusLine();
  }
}
const realLastUpdate = () => {
  if (!REAL.at) return '—';
  const m = Math.round((Date.now() - REAL.at) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return 'منذ ' + m + ' دقيقة';
  const h = Math.round(m / 60);
  return h < 24 ? 'منذ ' + h + ' ساعة' : 'منذ ' + Math.round(h / 24) + ' يوم';
};

/* ------------------------- 5. الأسعار: لا اختراع ------------------------- */
const realPrices = (id) => (DB.byStore[id] || []).filter(l => l.source === 'user');
function realPriceLine(st) {
  const mine = realPrices(st.id);
  if (!mine.length) return `
    <div class="real-noprice">
      <div class="b sm">💰 الأسعار: لا توجد أسعار مسجّلة لهذا المحل</div>
      <p class="tiny muted mt6">إحنا ما بنخترعش أسعار. OpenStreetMap بتعطينا الاسم والموقع والنوع فقط — السعر لسه محدش سجّله.</p>
      <div class="row gap6 mt10 wrapx">
        <button class="btn primary sm2" data-act="real-price" data-store="${st.id}">➕ سجّل سعرًا (كن أول واحد)</button>
        <a class="btn sm2" href="#/store/${st.id}">👁️ صفحة المحل</a>
      </div>
    </div>`;
  const l = mine[0];
  return `
    <div class="real-price">
      <div class="between">
        <div>
          <div class="tiny muted">${esc(productName(l.productId))}</div>
          <div class="priceline">${priceHtml(l.price)}</div>
          <div class="row wrapx gap6 mt6">
            <span class="badge ok">متوفر</span>
            <span class="badge p">👤 سجّله مستخدم من سوقي</span>
            ${trustBadge(l.updatedH)}
          </div>
        </div>
        <div class="row" style="flex-direction:column;gap:6px;min-width:130px">
          <button class="btn sm2" data-act="real-price" data-store="${st.id}">➕ أضف سعرًا آخر</button>
          ${mine.length > 1 ? `<span class="tiny muted center">+${mine.length - 1} سعر آخر مسجّل</span>` : ''}
        </div>
      </div>
    </div>`;
}

/* ------------------------- 6. المكوّنات (UI) ------------------------- */
function realStatusLine() {
  if (REAL.status === 'locating') return `<div class="real-status load"><span class="spin"></span> بنحدّد موقعك الفعلي… <span class="tiny muted">(المتصفح هيسألك تسمح بالوصول للموقع)</span></div>`;
  if (REAL.status === 'loading') return `<div class="real-status load"><span class="spin"></span> بنسأل OpenStreetMap عن المحلات الحقيقية داخل ${kmTxt(REAL.radiusKm)}… <span class="tiny muted">(قد تاخد ٥–٢٠ ثانية)</span></div>`;
  if (REAL.status === 'error') return `<div class="real-status bad">⚠️ ${esc(REAL.err)}${realIsNetworkBlocked() ? '<div class="tiny mt6">ملاحظة: المعاينة داخل نافذة مقيّدة تمنع الاتصال بالإنترنت — نزّل الملف <b>souqi.html</b> وافتحه في المتصفح مباشرة وسيعمل البحث الحقيقي فورًا.</div>' : ''}</div>`;
  if (REAL.status === 'ready') return `<div class="real-status ok">✅ <b>${nf(REAL.all.length)}</b> محل حقيقي داخل ${kmTxt(REAL.radiusKm)}${REAL.where ? ' حول <b>' + esc(REAL.where) + '</b>' : ''} · النتائج الظاهرة: <b>${nf(REAL.items.length)}</b>${REAL.usedCache ? ' · <span class="badge warn">نتائج محفوظة ' + realLastUpdate() + '</span>' : ''}${REAL.endpoint ? ' · <span class="tiny muted">المصدر: ' + esc(REAL.endpoint) + '</span>' : ''}</div>`;
  return `<div class="real-status idle">📍 اضغط «استخدم موقعي» أو اختار منطقتك، وسوقي هيرجّع لك المحلات الحقيقية المسجّلة حولك — بالاسم والنوع والمسافة، وبدون أي بيانات وهمية.</div>`;
}
function realSearchPanel() {
  const cats = realCatCounts();
  const chips = Object.keys(cats).sort((a, b) => cats[b] - cats[a]).map(id => {
    const c = realCatInfo(id);
    return `<button class="chip ${REAL.cat === id ? 'on' : ''}" data-rcat="${id}">${c.em} ${c.ar} <span class="num muted">${cats[id]}</span></button>`;
  }).join('');
  return `
  <div class="card pad mb14 real-panel">
    <div class="between wrapx mb10">
      <div>
        <div class="b">🏬 بحث حقيقي في محلات حولك — بيانات OpenStreetMap</div>
        <div class="tiny muted mt6">مصدر مفتوح وموثّق (ODbL): الأسماء والمواقع والنوع والتليفون والمواعيد من الواقع. مفيش أي محل وهمي في هذا القسم.</div>
      </div>
      <div class="row gap6 wrapx">
        <button class="btn primary sm2" id="realLocate">📍 استخدم موقعي وابحث</button>
        <button class="btn sm2" id="realRefresh" ${REAL.lat == null ? 'disabled' : ''}>⟳ تحديث النتائج</button>
      </div>
    </div>

    <div class="row wrapx gap8 mb10">
      <div class="field" style="flex:1;min-width:220px"><label>أو ابحث حول منطقة بالاسم (مصر كلها)</label>
        <div class="row gap6">
          <input class="select" id="realArea" list="realAreas" placeholder="مثال: المنصورة / مدينة نصر / الغردقة" value="">
          <button class="btn sm2" id="realAreaGo" style="white-space:nowrap">ابحث هنا</button>
        </div>
        <datalist id="realAreas">${EG_AREAS.map(a => `<option value="${esc(a.ar)}"></option>`).join('')}</datalist>
      </div>
      <div class="field" style="min-width:180px"><label>بحث بالاسم أو النوع</label>
        <input class="select" id="realKw" placeholder="صيدلية، سوبر ماركت، اسم محل…" value="${esc(REAL.keyword)}"></div>
    </div>

    <div class="row wrapx gap14 mb10">
      <div>
        <div class="tiny muted mb6">النطاق حول موقعك</div>
        <div class="row wrapx gap6">
          ${[[0.3, '300 م'], [0.5, '500 م'], [1, '1 كم'], [3, '3 كم'], [5, '5 كم'], [10, '10 كم'], [25, '25 كم']]
      .map(([v, l]) => `<button class="chip ${Math.abs(REAL.radiusKm - v) < 0.001 ? 'on' : ''}" data-rrad="${v}">${l}</button>`).join('')}
        </div>
      </div>
      <label class="switch" style="align-self:flex-end"><input type="checkbox" id="realOpen" ${REAL.openOnly ? 'checked' : ''}> مفتوح الآن فقط</label>
    </div>

    ${chips ? `<div class="scroll-x mb10"><button class="chip ${!REAL.cat ? 'on' : ''}" data-rcat="">كل الأنواع</button>${chips}</div>` : ''}
    <div id="realLive">${realStatusLine()}</div>
    <div class="tiny muted mt10">ℹ️ البيانات © مساهمو OpenStreetMap — منشورة تحت رخصة ODbL. سوقي لا تخترع أسعارًا: أي سعر تشوفه هنا مسجّل بواسطة مستخدم أو متجر بالفعل.</div>
  </div>`;
}
function realStats() {
  const open = REAL.items.filter(s => realOpenState(s) === 'open').length;
  const unk = REAL.items.filter(s => realOpenState(s) === 'unknown').length;
  const priced = REAL.items.filter(s => realPrices(s.id).length).length;
  const nearest = REAL.items[0];
  return `<div class="stats mb14">
    ${statBox('محلات حقيقية في النطاق', `<span class="num">${nf(REAL.all.length)}</span>`, 'من قاعدة بيانات OpenStreetMap')}
    ${statBox('ظاهرة بعد الفلترة', `<span class="num">${nf(REAL.items.length)}</span>`, REAL.cat ? 'فلتر النوع + كلمة البحث' : 'كل الأنواع')}
    ${statBox('مفتوح الآن', `<span class="num">${nf(open)}</span>`, unk ? `${nf(unk)} محلًا مواعيده غير مسجّلة` : 'حسب مواعيد OSM')}
    ${statBox('أقرب محل', nearest ? kmTxt(nearest.distKm) : '—', nearest ? esc(nearest.name) : '—')}
    ${statBox('فيه أسعار مسجّلة', `<span class="num">${nf(priced)}</span>`, priced ? 'مسجّلة بمستخدمين' : 'لسه محدش سجّل — كن الأول')}
  </div>`;
}
function realCard(st, o) {
  o = o || {};
  const c = realCatInfo(st.cat);
  const pn = realPrices(st.id).length;
  return `
  <article class="card hv store-card rel real-card" data-store="${st.id}">
    <span class="ribbon real-ribbon">🧭 بيانات حقيقية · OpenStreetMap</span>
    <div class="row" style="align-items:flex-start">
      <div class="thumb lg">${c.em}</div>
      <div style="flex:1;min-width:0">
        <h3 class="trunc"><a href="#/store/${st.id}">${esc(st.name)}</a> ${o.edited ? '<span class="vf" title="عدّلته أنت">✏️</span>' : ''}</h3>
        <div class="meta mt6">
          <span>📍 ${esc(st.address || st.area || st.city || 'موقع على الخريطة')}</span>
          <span>🚶 ${kmTxt(st.distKm)}</span>
        </div>
        <div class="meta mt6">
          <span class="tiny muted">🕒 ${esc(realHoursText(st))}</span>
        </div>
        <div class="row wrapx mt10 gap6">
          <span class="badge p">${c.em} ${esc(st.catAr || c.ar)}</span>
          ${realOpenBadge(st)}
          ${st.phone ? `<span class="badge info">☎️ ${esc(st.phone)}</span>` : ''}
          ${pn ? `<span class="badge ok">💰 ${pn} سعر مسجّل</span>` : ''}
        </div>
      </div>
    </div>
    <hr class="sep">
    ${realPriceLine(st)}
    <hr class="sep">
    <div class="between wrapx">
      <div class="row gap6 wrapx">
        <a class="btn sm2" href="https://www.openstreetmap.org/${st.osmRef}" target="_blank" rel="noopener">🗺️ على الخريطة</a>
        <a class="btn sm2" href="https://www.google.com/maps/search/?api=1&query=${st.lat},${st.lon}" target="_blank" rel="noopener">🧭 الاتجاهات</a>
        ${st.phone ? `<a class="btn sm2" href="tel:${esc(st.phone)}">☎️ اتصال</a>` : ''}
        ${st.website ? `<a class="btn sm2" href="${esc(st.website)}" target="_blank" rel="noopener">🌐 الموقع</a>` : ''}
      </div>
      <button class="btn ghost sm2" data-act="real-edit" data-store="${st.id}">✏️ صحّح بيانات المحل</button>
    </div>
  </article>`;
}
/* خريطة الحي الحقيقية: إسقاط فعلي لإحداثيات المتاجر حول موقعك */
function realMap(items, uLat, uLon, radiusKm) {
  const W = 780, H = 620, cx = W / 2, cy = H / 2, pad = 46;
  const k = Math.cos(uLat * Math.PI / 180);
  const pxPerKm = (Math.min(W, H) / 2 - pad) / radiusKm;
  const pt = (lat, lon) => ({ x: cx + (lon - uLon) * 111.32 * k * pxPerKm, y: cy - (lat - uLat) * 110.57 * pxPerKm });
  const shown = items.slice(0, 90);
  return `
  <div class="mapbox mb14" id="realMapWrap" style="height:${H}px">
    <svg class="map-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="height:${H}px">
      <defs>
        <radialGradient id="rGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F3F1F1"/></radialGradient>
        <filter id="rPin"><feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-color="#2B2728" flood-opacity=".22"/></filter>
      </defs>
      <rect width="${W}" height="${H}" rx="14" fill="#F7F6F6"/>
      <rect x="${pad / 2}" y="${pad / 2}" width="${W - pad}" height="${H - pad}" rx="12" fill="url(#rGlow)"/>
      ${[0.25, 0.5, 0.75, 1].map(f => `<circle cx="${cx}" cy="${cy}" r="${(pxPerKm * radiusKm * f).toFixed(1)}" fill="none" stroke="#DAD6D6" stroke-width="${f === 1 ? 1.6 : 1}" ${f < 1 ? 'stroke-dasharray="6 8"' : ''}/>
        <text x="${cx + 6}" y="${(cy - pxPerKm * radiusKm * f + 13).toFixed(1)}" class="ring-lbl">${kmTxt(radiusKm * f)}</text>`).join('')}
      <line x1="${cx}" y1="${pad / 2}" x2="${cx}" y2="${H - pad / 2}" stroke="#E5E2E2" stroke-width="1"/>
      <line x1="${pad / 2}" y1="${cy}" x2="${W - pad / 2}" y2="${cy}" stroke="#E5E2E2" stroke-width="1"/>
      <text x="${cx}" y="${pad / 2 - 8}" text-anchor="middle" class="ring-lbl">شمال ↑</text>
      <text x="${cx}" y="${H - pad / 2 + 18}" text-anchor="middle" class="ring-lbl">↓ جنوب</text>
      <text x="${W - pad / 2 + 26}" y="${cy + 4}" text-anchor="middle" class="ring-lbl">شرق</text>
      <text x="${pad / 2 - 26}" y="${cy + 4}" text-anchor="middle" class="ring-lbl">غرب</text>
      ${shown.map((s, i) => {
    const p = pt(s.lat, s.lon);
    if (p.x < 20 || p.x > W - 20 || p.y < 20 || p.y > H - 20) return '';
    const c = realCatInfo(s.cat), near = i < 3;
    return `<g class="pin real-pin" data-store="${s.id}">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${near ? 17 : 14}" fill="#fff" stroke="${near ? '#800020' : '#8D8888'}" stroke-width="${near ? 3 : 2.2}" filter="url(#rPin)"/>
        <text x="${p.x.toFixed(1)}" y="${(p.y + 5).toFixed(1)}" text-anchor="middle" font-size="${near ? 15 : 13}">${c.em}</text>
        ${near ? `<text x="${p.x.toFixed(1)}" y="${(p.y - 22).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#63001A" style="paint-order:stroke;stroke:#fff;stroke-width:3">${esc(String(s.name).slice(0, 22))}</text>` : ''}
      </g>`;
  }).join('')}
      <g>
        <circle cx="${cx}" cy="${cy}" r="17" fill="#800020" opacity=".14"/>
        <circle cx="${cx}" cy="${cy}" r="8" fill="#800020" stroke="#fff" stroke-width="2.6"/>
        <text x="${cx}" y="${cy + 30}" text-anchor="middle" class="ring-lbl" font-size="11" fill="#63001A" font-weight="800">موقعك</text>
      </g>
    </svg>
    <div class="map-legend">
      <span class="row gap6"><i class="dot" style="background:#800020"></i> أقرب ٣ محلات</span>
      <span class="row gap6"><i class="dot" style="background:#8D8888"></i> باقي المحلات الحقيقية</span>
    </div>
  </div>`;
}
/* قسم كامل جاهز للاستخدام في أي صفحة */
function realNearbySection() {
  if (REAL.status === 'ready' && REAL.items.length) {
    return `
      ${realStats()}
      ${realMap(REAL.items, REAL.lat, REAL.lon, REAL.radiusKm)}
      <div class="sec-head"><div><h2>🏬 محلات حقيقية داخل ${kmTxt(REAL.radiusKm)}</h2>
      <p>مرتّبة من الأقرب — الاسم والموقع من OpenStreetMap، والأسعار فقط ما سجّله المستخدمون</p></div>
      <span class="badge ok">✅ بيانات واقعية</span></div>
      <div class="grid g-auto">${REAL.items.slice(0, 60).map(s => realCard(s)).join('')}</div>
      ${REAL.items.length > 60 ? `<p class="tiny muted mt10">بنعرض أول ٦٠ محلًا من ${nf(REAL.items.length)} — ضيّق النطاق أو فلتر النوع لنتائج أدق.</p>` : ''}`;
  }
  if (REAL.status === 'ready') {
    return `<div class="card pad center">
      <div style="font-size:34px">🔍</div>
      <div class="b mt6">مفيش محلات مسجّلة في النطاق ده على OpenStreetMap</div>
      <p class="sm muted mt6">جرّب توسيع النطاق (مثلًا ${kmTxt(REAL.radiusKm * 3)}) أو غيّر المنطقة — كل ما النطاق يكبر، كل ما تظهر محلات أكتر.</p>
      <div class="row gap6 mt10" style="justify-content:center">
        <button class="btn primary sm2" data-rrad="${REAL.radiusKm * 3}">وسّع النطاق إلى ${kmTxt(REAL.radiusKm * 3)}</button>
        <button class="btn sm2" id="realPickArea">غيّر المنطقة</button>
      </div></div>`;
  }
  return '';
}
/* شريط صغير لصفحة نتائج البحث: محلات حقيقية بنفس الاسم */
function realMatchesFor(q, limit) {
  const kw = arNorm(q);
  if (!kw || !REAL.all.length) return [];
  const words = kw.split(' ').filter(w => w.length > 2);
  const score = (s) => {
    const t = arNorm(s.name + ' ' + s.catAr + ' ' + (s.city || '') + ' ' + (s.area || ''));
    return words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  };
  return REAL.all.map(s => ({ s, n: score(s) })).filter(x => x.n >= Math.min(2, words.length)).sort((a, b) => b.n - a.n || a.s.distKm - b.s.distKm).slice(0, limit || 3).map(x => x.s);
}
function realSearchStrip(q) {
  const hits = realMatchesFor(q, 3);
  if (!hits.length) return '';
  return `<div class="card pad mb14 real-strip">
    <div class="between wrapx mb10"><div class="b">🏬 محلات حقيقية مطابقة لبحثك (من OpenStreetMap)</div>
    <a class="btn sm2" href="#/nearby">كل المحلات حولي ←</a></div>
    <div class="grid g-auto">${hits.map(s => realCard(s)).join('')}</div>
  </div>`;
}

/* ------------------------- 7. تسجيل سعر لمحل حقيقي ------------------------- */
function productName(pid) {
  const p = PRODUCTS.find(x => x.id === pid);
  return p ? p.name : 'منتج غير معروف';
}
function openRealPrice(storeId) {
  const st = DB.stores.find(s => s.id === storeId);
  if (!st) return;
  const list = PRODUCTS.filter(p => p.cat === st.cat);
  const opts = (list.length ? list : PRODUCTS).slice(0, 60);
  openModal('💰 سجّل سعرًا حقيقيًا — ' + esc(st.name), `
    <div class="insight info mb10"><span class="ic">ℹ️</span><div class="tiny">السعر اللي هتسجّله هيظهر باسمك على المنصة ويُوسم بأنه <b>سعر سجّله مستخدم</b> — عشان محدش ياخد رقم مخترع. اكتب السعر المعلن فعليًا في المحل.</div></div>
    <div class="field mb10"><label>المنتج</label>
      <select class="select" id="rpProd">${opts.map(p => `<option value="${p.id}">${p.em} ${esc(p.name)}</option>`).join('')}<option value="__other">✏️ منتج آخر (اكتبه بنفسك)</option></select></div>
    <div class="field mb10" id="rpOtherWrap" style="display:none"><label>اسم المنتج</label><input class="select" id="rpOtherName" placeholder="مثال: زيت عافية 1 لتر"></div>
    <div class="row gap8 wrapx mb10">
      <div class="field" style="flex:1"><label>السعر (ج.م)</label><input class="select" id="rpPrice" type="number" min="1" step="0.5" placeholder="مثال: 89"></div>
      <div class="field" style="flex:1"><label>الحجم/الوحدة (اختياري)</label><input class="select" id="rpUnit" placeholder="مثال: 1 لتر"></div>
    </div>
    <div class="field mb10"><label>ملاحظة (اختياري)</label><input class="select" id="rpNote" placeholder="مثال: السعر على الرف، مع الخصم"></div>
    <label class="switch"><input type="checkbox" id="rpStock" checked> المنتج متوفر حاليًا</label>
    <div class="tiny muted mt10">📍 ${esc(st.name)} — ${esc(st.address || st.area || st.city || '')} · المسافة ${kmTxt(st.distKm != null ? st.distKm : distKm(LOC, st))}</div>`,
    `<button class="btn primary" id="rpSave">نشر السعر</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  const sel = $('#rpProd'), other = $('#rpOtherWrap');
  sel.onchange = () => { other.style.display = sel.value === '__other' ? '' : 'none'; };
  $('#rpSave').onclick = () => {
    const pid = sel.value;
    const otherName = $('#rpOtherName') ? $('#rpOtherName').value.trim() : '';
    const price = parseFloat($('#rpPrice').value);
    if (!(price > 0)) { toast('اكتب سعرًا صحيحًا أكبر من صفر', 'warn', '⚠️'); return; }
    if (pid === '__other' && !otherName) { toast('اكتب اسم المنتج', 'warn', '⚠️'); return; }
    const r = saveUserPrice({ storeId, productId: pid, otherName, price, unit: $('#rpUnit').value.trim(), note: $('#rpNote').value.trim(), inStock: $('#rpStock').checked });
    closeModal();
    if (r.ok) { toast('تم تسجيل السعر: ' + nf(price) + ' ج.م لـ ' + esc(r.product.name), 'ok', '💰'); render(); }
    else toast(r.msg || 'تعذّر الحفظ', 'warn', '⚠️');
  };
}
function saveUserPrice(o) {
  const st = DB.stores.find(s => s.id === o.storeId);
  if (!st) return { ok: false, msg: 'المحل غير موجود' };
  let p = null;
  if (o.productId === '__other') {
    p = { id: 'u-' + uid(), name: o.otherName, cat: st.cat || 'home', em: '🏷️', unit: o.unit || '', userMade: true };
    PRODUCTS.push(p);
  } else {
    p = PRODUCTS.find(x => x.id === o.productId);
    if (!p) return { ok: false, msg: 'المنتج غير معروف' };
  }
  const l = {
    id: uid(), storeId: st.id, productId: p.id, price: +o.price, oldPrice: 0, disc: 0,
    inStock: o.inStock !== false, updatedH: 0, source: 'user', by: 'أنت', at: Date.now(),
    unit: o.unit || p.unit || '', note: o.note || ''
  };
  DB.listings.push(l);
  (DB.byStore[st.id] = DB.byStore[st.id] || []).push(l);
  (DB.byProduct[p.id] = DB.byProduct[p.id] || []).push(l);
  DB.priceLog.push({ at: Date.now(), storeId: st.id, productId: p.id, price: l.price, by: 'user', source: 'user', note: o.note || '' });
  persistUserPrices();
  return { ok: true, product: p, listing: l };
}
function persistUserPrices() {
  const arr = DB.listings.filter(l => l.source === 'user').map(l => {
    const st = DB.stores.find(s => s.id === l.storeId) || {};
    const p = PRODUCTS.find(x => x.id === l.productId) || {};
    return {
      listing: { productId: l.productId, price: l.price, inStock: l.inStock, unit: l.unit, note: l.note, at: l.at, by: l.by },
      product: p.userMade ? { id: p.id, name: p.name, cat: p.cat, em: p.em, unit: p.unit } : null,
      store: {
        id: st.id, name: st.name, cat: st.cat, catAr: st.catAr, lat: st.lat, lon: st.lon, real: !!st.real,
        area: st.area, city: st.city, address: st.address, phone: st.phone, osmRef: st.osmRef,
        hoursRaw: st.hoursRaw, hoursAlways: st.hoursAlways, openH: st.openH, closeH: st.closeH
      }
    };
  });
  save('userPrices', arr.slice(-300));
}
function loadUserPrices() {
  const arr = load('userPrices', []);
  if (!Array.isArray(arr) || !arr.length) return 0;
  let n = 0;
  arr.forEach(rec => {
    if (!rec || !rec.store || !rec.listing) return;
    const s = rec.store;
    if (!PRODUCTS.some(p => p.id === rec.listing.productId) && rec.product) PRODUCTS.push(rec.product);
    if (!DB.stores.some(x => x.id === s.id)) {
      DB.stores.push(Object.assign({
        real: true, source: 'osm', cats: [s.cat || 'other'], verified: false, rating: 0, rc: 0,
        plan: 'osm', delivery: false, pay: [], svc: [], views: 0, weekly: [], tags: {}, distKm: null
      }, s, { id: s.id, cats: [s.cat || 'other'] }));
      DB.byStore[s.id] = DB.byStore[s.id] || [];
    }
    if (DB.listings.some(l => l.storeId === s.id && l.productId === rec.listing.productId)) return;
    const l = Object.assign({ id: uid(), storeId: s.id, oldPrice: 0, disc: 0, updatedH: 0, source: 'user', by: 'أنت' }, rec.listing);
    DB.listings.push(l);
    (DB.byStore[s.id] = DB.byStore[s.id] || []).push(l);
    (DB.byProduct[l.productId] = DB.byProduct[l.productId] || []).push(l);
    n++;
  });
  return n;
}
/* دمج نتيجة حقيقية في قاعدة البيانات العامة حتى تعمل صفحة المحل والسعر */
function realEnsureInDB(st) {
  if (!st) return null;
  const found = DB.stores.find(s => s.id === st.id);
  if (found) {
    if (st.distKm != null) found.distKm = st.distKm;
    return found;
  }
  DB.stores.push(st);
  DB.byStore[st.id] = DB.byStore[st.id] || [];
  return st;
}
function realEnsureAllInDB() { REAL.all.forEach(realEnsureInDB); }

/* ------------------------- 8. تعديل بيانات محل حقيقي ------------------------- */
function openRealEdit(storeId) {
  const st = DB.stores.find(s => s.id === storeId);
  if (!st) return;
  const e = REAL.edits[storeId] || {};
  openModal('✏️ صحّح بيانات المحل (OpenStreetMap)', `
    <p class="sm">البيانات الأصلية من OpenStreetMap. تصحيحك بيتحفظ عندك على الجهاز ويظهر في كل النتائج — وسوقي بتعرضه كتعديل مستخدم لا كبيان رسمي.</p>
    <div class="field mb10"><label>الاسم الصحيح</label><input class="select" id="reName" value="${esc(e.name || st.name)}"></div>
    <div class="field mb10"><label>النوع</label><input class="select" id="reCat" value="${esc(e.catAr || st.catAr || '')}" placeholder="مثال: صيدلية"></div>
    <div class="field mb10"><label>المنطقة</label><input class="select" id="reArea" value="${esc(e.area || st.area || '')}" placeholder="مثال: الدقي"></div>
    <div class="field mb10"><label>ملاحظة عن المحل</label><input class="select" id="reNote" value="${esc(e.note || st.desc || '')}" placeholder="مثال: بيفتح بعد المغرب"></div>
    <div class="field mb10"><label>التليفون (لو تعرفه)</label><input class="select" id="rePhone" value="${esc(st.phone || '')}"></div>
    <div class="tiny muted">لينك المرجع على OpenStreetMap: <a href="https://www.openstreetmap.org/${st.osmRef || ''}" target="_blank" rel="noopener">${esc(st.osmRef || '')}</a></div>`,
    `<button class="btn primary" id="reSave">حفظ التصحيح</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  $('#reSave').onclick = () => {
    REAL.edits[storeId] = {
      name: $('#reName').value.trim(), catAr: $('#reCat').value.trim(),
      area: $('#reArea').value.trim(), note: $('#reNote').value.trim()
    };
    const phone = $('#rePhone').value.trim();
    if (phone) st.phone = phone;
    st.name = REAL.edits[storeId].name || st.name;
    st.catAr = REAL.edits[storeId].catAr || st.catAr;
    st.subLabel = st.catAr;
    st.area = REAL.edits[storeId].area || st.area;
    st.desc = REAL.edits[storeId].note || st.desc;
    st.edited = true;
    save('realEdits', REAL.edits);
    REAL.all = REAL.all.map(s => s.id === storeId ? st : s);
    realApplyFilter();
    closeModal(); toast('تم حفظ تصحيحك — شكرًا لتحسين البيانات', 'ok', '✏️'); render();
  };
}
function loadRealEdits() { const e = load('realEdits', null); if (e && typeof e === 'object') REAL.edits = e; }

/* ------------------------- 9. الربط بالأحداث ------------------------- */
function bindRealSearch() {
  const loc = $('#realLocate'); if (loc) loc.onclick = () => realSearch({ locate: true });
  const rf = $('#realRefresh'); if (rf) rf.onclick = () => { if (REAL.lat != null) realSearch({}); };
  const ag = $('#realAreaGo'); if (ag) ag.onclick = () => { const v = ($('#realArea') || {}).value || ''; if (v.trim()) realSearchArea(v.trim()); };
  const ai = $('#realArea'); if (ai) ai.onkeydown = e => { if (e.key === 'Enter' && ai.value.trim()) realSearchArea(ai.value.trim()); };
  const pa = $('#realPickArea'); if (pa) pa.onclick = () => { const i = $('#realArea'); if (i) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus(); } };
  const kw = $('#realKw');
  if (kw) {
    let t = null;
    kw.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        REAL.keyword = kw.value.trim(); realApplyFilter();
        const box = $('#realResults');
        if (box) box.innerHTML = realNearbySection(); else render();
      }, 380);
    };
  }
  const op = $('#realOpen'); if (op) op.onchange = () => { REAL.openOnly = op.checked; realApplyFilter(); render(); };
  document.querySelectorAll('[data-rrad]').forEach(b => b.onclick = () => { REAL.radiusKm = parseFloat(b.dataset.rrad); if (REAL.lat != null) realSearch({ radiusKm: REAL.radiusKm }); else render(); });
  document.querySelectorAll('[data-rcat]').forEach(b => b.onclick = () => { REAL.cat = b.dataset.rcat; realApplyFilter(); render(); });
  document.querySelectorAll('.real-pin').forEach(g => g.onclick = () => { const st = DB.stores.find(s => s.id === g.dataset.store); if (st) { realEnsureInDB(st); go('store', { id: st.id }); } });
  document.querySelectorAll('[data-act="real-price"]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); openRealPrice(b.dataset.store); });
  document.querySelectorAll('[data-act="real-edit"]').forEach(b => b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); openRealEdit(b.dataset.store); });
}

/* ------------------------- 10. صفحة محل حقيقي ------------------------- */
function realStorePage(st) {
  const tab = APP.route.p.tab || 'prices';
  const c = realCatInfo(st.cat);
  const mine = realPrices(st.id);
  const d = st.distKm != null ? st.distKm : distKm(LOC, st);
  const tags = st.tags || {};
  const interesting = ['brand', 'operator', 'wheelchair', 'cuisine', 'description', 'payment:cards', 'delivery', 'organic', 'second_hand'];
  const tabBtn = (id, label) => `<a class="tab ${tab === id ? 'on' : ''}" href="#/store/${st.id}?tab=${id}">${label}</a>`;
  const p = realGeocodeAreaDone(st);
  return shell('nearby', `
  <div class="wrap" style="padding-top:22px">
    <div class="row wrapx gap6 tiny muted mb10">
      <a href="#/home">الرئيسية</a><span>›</span><a href="#/nearby">المحلات حولي</a><span>›</span><span>${esc(st.name)}</span>
    </div>

    <div class="card pad mb14">
      <div class="row wrapx" style="align-items:flex-start">
        <div class="thumb" style="width:104px;height:104px;font-size:50px;border-radius:22px">${c.em}</div>
        <div style="flex:1;min-width:250px">
          <div class="row wrapx gap6">
            <h1 style="font-size:23px">${esc(st.name)}</h1>
            <span class="badge ok">🧭 بيانات حقيقية · OpenStreetMap</span>
            ${st.edited ? '<span class="badge p">✏️ معدّل بواسطتك</span>' : ''}
          </div>
          <div class="row wrapx gap14 mt10">
            <span class="badge p">${c.em} ${esc(st.catAr || c.ar)}</span>
            ${realOpenBadge(st)}
            <span class="tiny muted">🕒 ${esc(realHoursText(st))}</span>
            <span class="tiny muted">📍 ${kmTxt(d)} منك · ≈ ${etaMin(d)} دقيقة</span>
          </div>
          <p class="sm muted mt10" style="max-width:640px">${esc(st.address || (st.area ? st.area + (st.city ? '، ' + st.city : '') : 'العنوان مش مسجّل على OpenStreetMap — شوف الموقع على الخريطة.'))}</p>
          <div class="row wrapx gap6 mt14">
            ${st.phone ? `<a class="btn primary" href="tel:${esc(st.phone)}">☎️ اتصال</a>` : ''}
            ${st.phone ? `<a class="btn" href="${waLink(st.phone, 'السلام عليكم، وصلت لكم من تطبيق سوقي')}" target="_blank" rel="noopener">💬 واتساب</a>` : ''}
            <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${st.lat},${st.lon}" target="_blank" rel="noopener">🧭 الاتجاهات</a>
            <button class="btn primary" data-act="real-price" data-store="${st.id}">➕ سجّل سعرًا</button>
            <button class="btn ghost" data-act="real-edit" data-store="${st.id}">✏️ صحّح البيانات</button>
          </div>
        </div>
      </div>
    </div>

    <div class="insight info mb14"><span class="ic">🧭</span><div class="tiny">
      <b>مصدر البيانات:</b> OpenStreetMap (مشروع خرائط مفتوح) بترخيص ODbL — الاسم والنوع والموقع والتليفون والمواعيد كما سجّلها مساهمو الخرائط،
      و<b>سوقي لا تخترع أسعارًا</b>: أي سعر يظهر هنا سجّله مستخدم أو صاحب المحل.
      ${st.osmRef ? ` · <a href="https://www.openstreetmap.org/${st.osmRef}" target="_blank" rel="noopener">المرجع الأصلي (${esc(st.osmRef)})</a>` : ''}
    </div></div>

    <div class="tabs mb14">${tabBtn('prices', '💰 الأسعار المسجّلة')}${tabBtn('nearby', '🗺️ محلات حقيقية حوله')}${tabBtn('info', '📋 بيانات المحل')}</div>

    ${tab === 'prices' ? (mine.length ? `
      <div class="grid g-auto">
        ${mine.map(l => `<article class="card pad">
          <div class="between"><div class="b">${esc(productName(l.productId))}</div>${trustBadge(l.updatedH)}</div>
          <div class="priceline mt6">${priceHtml(l.price)}${l.unit ? ` <span class="cur">/ ${esc(l.unit)}</span>` : ''}</div>
          <div class="row wrapx gap6 mt10">
            <span class="badge ${l.inStock ? 'ok' : 'bad'}">${l.inStock ? 'متوفر' : 'غير متوفر'}</span>
            <span class="badge p">👤 سجّله: ${esc(l.by || 'مستخدم')}</span>
            ${l.note ? `<span class="badge ink">${esc(l.note)}</span>` : ''}
          </div>
          <a class="btn soft block sm2 mt10" href="#/product/${l.productId}">قارن مع باقي المحلات ←</a>
        </article>`).join('')}
      </div>` : `
      <div class="card pad center">
        <div style="font-size:34px">💰</div>
        <div class="b mt6">لا توجد أسعار مسجّلة لهذا المحل بعد</div>
        <p class="sm muted mt6" style="max-width:560px;margin-inline:auto">المحل موجود فعلًا على أرض الواقع (من OpenStreetMap)، لكن محدش سجّل أسعاره. لو تعرف سعر أي منتج فيه، سجّله وهيساعد كل الناس — ومش هنعرض أي رقم من عندنا.</p>
        <div class="row gap6 mt10" style="justify-content:center">
          <button class="btn primary" data-act="real-price" data-store="${st.id}">➕ سجّل أول سعر</button>
          <a class="btn" href="#/nearby">شوف محلات تانية حولي</a>
        </div>
      </div>`) : ''}

    ${tab === 'nearby' ? (REAL.all.length ? `
      ${realMap(REAL.all.filter(s => s.id !== st.id).slice(0, 40), st.lat, st.lon, Math.max(0.5, Math.min(REAL.radiusKm, 5)))}
      <div class="grid g-auto">${REAL.all.filter(s => s.id !== st.id).slice(0, 12).map(s => realCard(s)).join('') || '<div class="card pad">مفيش محلات تانية في النتائج الحالية — افتح «المحلات حولي» وابحث في نطاق أوسع.</div>'}</div>`
      : `<div class="card pad center"><div style="font-size:30px">🗺️</div><div class="b mt6">لسه مفيش نتائج حقيقية محفوظة</div>
         <p class="sm muted mt6">افتح «المحلات حولي» وابحث حول موقعك، وهتلاقي هنا المحلات الحقيقية القريبة من هذا المحل.</p>
         <a class="btn primary sm2 mt10" href="#/nearby">ابحث في المحلات الحقيقية ←</a></div>`) : ''}

    ${tab === 'info' ? `
      <div class="grid g-side">
        <div class="card pad">
          <div class="b mb10">📋 البيانات كما هي مسجّلة على OpenStreetMap</div>
          <div class="info-list">
            <div class="info-item"><span class="ic">🏪</span><span>الاسم: <b>${esc(st.name)}</b></span></div>
            <div class="info-item"><span class="ic">${c.em}</span><span>النوع: <b>${esc(st.catAr || c.ar)}</b>${tags.shop ? ` <span class="tiny muted">(osm: shop=${esc(tags.shop)})</span>` : tags.amenity ? ` <span class="tiny muted">(osm: amenity=${esc(tags.amenity)})</span>` : ''}</span></div>
            <div class="info-item"><span class="ic">📍</span><span>العنوان: ${esc(st.address || st.area || '—')}</span></div>
            <div class="info-item"><span class="ic">🧭</span><span>الإحداثيات: <span class="num" dir="ltr">${st.lat.toFixed(5)}, ${st.lon.toFixed(5)}</span></span></div>
            <div class="info-item"><span class="ic">🕒</span><span>المواعيد: ${esc(st.hoursRaw || 'غير مسجّلة')}</span></div>
            ${st.phone ? `<div class="info-item"><span class="ic">☎️</span><span>التليفون: <b>${esc(st.phone)}</b></span></div>` : ''}
            ${st.website ? `<div class="info-item"><span class="ic">🌐</span><span><a href="${esc(st.website)}" target="_blank" rel="noopener">${esc(st.website)}</a></span></div>` : ''}
            ${interesting.filter(k => tags[k]).map(k => `<div class="info-item"><span class="ic">🏷️</span><span>${esc(k)}: <b>${esc(tags[k])}</b></span></div>`).join('')}
          </div>
          <hr class="sep">
          <div class="row wrapx gap6">
            <a class="btn sm2" href="https://www.openstreetmap.org/${st.osmRef}" target="_blank" rel="noopener">🗺️ افتح على OpenStreetMap</a>
            <a class="btn sm2" href="https://www.openstreetmap.org/edit?${(st.osmRef || '').split('/')[0]}=${(st.osmRef || '').split('/')[1]}" target="_blank" rel="noopener">✍️ حسّن البيانات في المصدر</a>
            <button class="btn sm2" data-act="real-edit" data-store="${st.id}">✏️ صحّح هنا</button>
          </div>
        </div>
        <aside>
          <div class="card pad mb14">
            <div class="b mb10">🤝 هل هذا محلك؟</div>
            <p class="tiny muted">لو المحل بتاعك، سجّله على سوقي وضيف أسعارك ومنتجاتك وصورك — وساعتها هتظهر لك لوحة تحكم كاملة وشارة متجر موثق.</p>
            <button class="btn primary block sm2 mt10" id="claimReal" data-store="${st.id}">🏬 ده محلي — سجّله على سوقي</button>
          </div>
          <div class="card pad">
            <div class="b mb10">💡 ملاحظة صريحة</div>
            <p class="tiny muted">سوقي ما بتحقّقش من هذا المحل بنفسها: البيانات جاية من خرائط مفتوحة. لو لقيت معلومة غلط، صحّحها من زر «✏️ صحّح البيانات» وهتتحدّث عندك فورًا، والأفضل كمان تصحّحها في المصدر نفسه عشان تفيد الكل.</p>
          </div>
        </aside>
      </div>` : ''}
  </div>`);
}
/* مساعدة: هل عندنا إحداثيات المنطقة الحالية؟ */
function realGeocodeAreaDone(st) { return !!(st && st.lat != null); }
