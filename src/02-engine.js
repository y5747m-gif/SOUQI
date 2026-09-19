/* =========================================================================
   الجزء 2: محرك البحث الذكي + محرك التحليل + تاريخ الأسعار
   (كل التحليل يعتمد فقط على الأسعار المسجلة في قاعدة البيانات)
   ========================================================================= */

/* ---------- تطبيع النص العربي: إزالة التشكيل وتوحيد الحروف ---------- */
const AR_MAP = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ئ': 'ي', 'ؤ': 'و', 'ة': 'ه', 'گ': 'ك', 'ک': 'ك', 'ی': 'ي', 'ﻻ': 'لا' };
function norm(s) {
  return String(s || '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱىئؤةگکیﻻ]/g, c => AR_MAP[c] || c)
    .replace(/[^\w\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
const STOP = new Set(['في', 'من', 'على', 'عن', 'عايز', 'عاوز', 'اريد', 'أريد', 'محتاج', 'ممكن', 'هات', 'لي', 'عندي', 'بحوالي', 'جنيه', 'جنية', 'جنيها', 'ال', 'و', 'او', 'أو', 'جدا', 'كمان', 'قريب', 'قريبة', 'مني', 'لحد', 'حتى', 'اقل', 'أقل', 'اكثر', 'أكثر']);
const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const fixDigits = (s) => String(s).replace(/[٠-٩]/g, d => AR_DIGITS[d]);

/* ---------- البحث عن منتج: مطابقة بالمعرّف أو الماركة أو الكلمات ---------- */
function findProduct(q) {
  const n = norm(q);
  if (!n) return null;
  const toks = n.split(' ').filter(t => t.length > 1 && !STOP.has(t));
  let best = null, bestScore = 0;
  PRODUCTS.forEach(p => {
    const hay = norm(p.name + ' ' + p.brand + ' ' + p.kw + ' ' + p.cat + ' ' + catOf(p.cat).ar);
    let sc = 0;
    if (n.includes(norm(p.id))) sc += 6;
    if (p.kw.split(' ').some(k => k.length > 2 && n.includes(norm(k)))) sc += 5;
    if (n.includes(norm(p.brand))) sc += 3;
    toks.forEach(t => { if (hay.includes(t)) sc += 2.2; });
    const pn = norm(p.name).split(' ');
    if (pn.filter(t => t.length > 2 && n.includes(t)).length >= 2) sc += 3.5;
    if (sc > bestScore) { bestScore = sc; best = p; }
  });
  return bestScore >= 4 ? best : null;
}
function findCategory(q) {
  const n = norm(q);
  let hit = null, len = 0;
  CATS.forEach(c => {
    const words = [c.id, c.ar, ...(c.ar.split(' '))].map(norm).filter(w => w.length > 2);
    words.forEach(w => {
      if (n.includes(w) || w.includes(n)) {
        const score = w.length + (n === w ? 5 : 0);
        if (score > len) { len = score; hit = c; }
      }
    });
  });
  // كلمات شعبية إضافية
  const extra = [
    ['موبايل', 'mobile'], ['تليفون', 'mobile'], ['هاتف', 'mobile'], ['تابلت', 'mobile'], ['ساعه', 'mobile'],
    ['لاب توب', 'computer'], ['لابتوب', 'computer'], ['كمبيوتر', 'computer'], ['رام', 'computer'], ['هارد', 'computer'], ['كارت', 'computer'],
    ['سماعه', 'audio'], ['هيدفون', 'audio'], ['اسبيكر', 'audio'], ['مكبر', 'audio'],
    ['شاشه', 'electronics'], ['راوتر', 'electronics'], ['ماوس', 'electronics'], ['باور', 'electronics'],
    ['بلايستيشن', 'gaming'], ['اكس بوكس', 'gaming'], ['لعبه', 'gaming'],
    ['حله', 'home'], ['قلايه', 'home'], ['مكنسه', 'home'], ['مروحه', 'home'], ['اثاث', 'home'],
    ['قميص', 'clothing'], ['بنطلون', 'clothing'], ['تيشيرت', 'clothing'], ['فستان', 'clothing'], ['ملابس', 'clothing'],
    ['جزمة', 'shoes'], ['حزاء', 'shoes'], ['احذيه', 'shoes'], ['سنيكرز', 'shoes'],
    ['عطر', 'beauty'], ['كريم', 'beauty'], ['ميكب', 'beauty'], ['شامبو', 'beauty'],
    ['بقاله', 'supermarket'], ['سوبر', 'supermarket'], ['زيت', 'supermarket'], ['ارز', 'supermarket'],
    ['كتاب', 'books'], ['مكتبه', 'books'], ['روايه', 'books'],
    ['شنيور', 'tools'], ['مفك', 'tools'], ['سلم', 'tools'], ['ادوات', 'tools'],
    ['مطعم', 'restaurant'], ['وجبه', 'restaurant'], ['بيتزا', 'restaurant'], ['كريب', 'restaurant'],
    ['صيدليه', 'pharmacy'], ['دوا', 'pharmacy'], ['فيتامين', 'pharmacy'],
    ['سياره', 'auto'], ['كاوتش', 'auto'], ['زيت موتور', 'auto'],
    ['دمبل', 'sports'], ['جيم', 'sports'], ['رياضه', 'sports']
  ];
  extra.forEach(([w, cid]) => { if (n.includes(norm(w)) && w.length > len) { len = w.length; hit = catOf(cid); } });
  return hit;
}
const BRANDS = Array.from(new Set(PRODUCTS.map(p => p.brand)).values()).filter(b => b !== 'محلي' && b !== 'مطعم' && b !== 'مكتبة' && b !== 'صيدلية');
function findBrand(q) { const n = norm(q); return BRANDS.find(b => n.includes(norm(b))) || null; }

/* ---------- تحويل الجملة الطبيعية إلى فلاتر ----------
   مثال: "عايز سماعة JBL تحت 3000 جنيه قريبة مني"
   → {cat:audio, brand:JBL, max:3000, near:true, ...}
------------------------------------------------------------- */
function parseQuery(q) {
  const raw = fixDigits(q || '');
  const n = norm(raw);
  const p = {
    q: raw, tokens: n.split(' ').filter(t => t && !STOP.has(t)),
    cat: null, brand: null, product: null, max: null, min: null, near: false, openNow: false,
    cheap: false, best: false, discountMin: 0, radiusK: null, used: false, unknown: true, stores: [], notes: []
  };

  /* الميزانية القصوى */
  let m = raw.match(/(?:أقل|اقل|تحت|بأقل|بحد أقصى|حد اقصى|ميزانية|معايا|عندي|لحد|حتى|في حدود|بحدود)\s*(\d[\d,\.]*)\s*(?:الف|ألف|ف)?/);
  if (!m) m = raw.match(/(\d[\d,\.]*)\s*(?:جنيه|جنية|ج\.م|EGP|egp)/);
  if (m) { let v = parseFloat(m[1].replace(/[,\s]/g, '')); if (/الف|ألف/.test(m[0])) v *= 1000; if (v > 150) p.max = v; }
  let m2 = raw.match(/(?:أكثر من|اكثر من|فوق|أعلى من|اعلى من|يبدأ من|من غير أقل من)\s*(\d[\d,\.]*)\s*(?:الف|ألف|ف)?/);
  if (m2) { let v = parseFloat(m2[1].replace(/[,\s]/g, '')); if (/الف|ألف/.test(m2[0]) || v < 500) v *= 1000; p.min = v; }
  if (!p.max) { const mm = n.match(/(\d{2,4})\s*(?:الف|ألف)/); if (mm) p.max = parseFloat(mm[1]) * 1000; }

  /* النطاق الجغرافي المذكور في الجملة */
  const rm = n.match(/(\d+(?:[.,]\d+)?)\s*(?:كم|كيلو|كيلومتر)/);
  if (rm) p.radiusK = parseFloat(rm[1].replace(',', '.'));
  else { const mm2 = n.match(/(\d{3,5})\s*(?:متر|م)\s*(?:مني|من موقعي|حولي)?/); if (mm2) p.radiusK = parseFloat(mm2[1]) / 1000; }

  /* نية الطلب */
  if (/(قريب|جنبي|حوالي|حولي|نفس المنطقة|قريبة مني|قريب مني|بجانبي|بالقرب|جمبي)/.test(n)) p.near = true;
  if (/(مفتوح|فاتح|شغال|الان|دلوقتي|يعمل حاليا|مفتوحه)/.test(n)) p.openNow = true;
  if (/(ارخص|رخيص|اقل سعر|افضل سعر|باقل|توفير)/.test(n)) p.cheap = true;
  if (/(افضل|احسن|كويس|جوده|ممتاز)/.test(n)) p.best = true;
  const dm = n.match(/(\d+)\s*(?:%|في الميه|بالميه)\s*(?:خصم)?/);
  if (dm) p.discountMin = parseFloat(dm[1]);

  /* المحافظة أو المنطقة */
  const cities = Array.from(new Set(DB.stores.map(s => s.city)));
  const areas = Array.from(new Set(DB.stores.map(s => s.area)));
  p.city = cities.find(c => n.includes(norm(c))) || null;
  p.area = areas.find(a => n.includes(norm(a))) || null;

  /* المتاجر المذكورة بالاسم */
  p.stores = DB.stores.filter(st => {
    const sn = norm(st.name);
    return sn.length > 5 && (n.includes(sn) || (n.length > 5 && sn.includes(n)));
  });

  /* التمييز بين «منتج محدد» و«قسم عام»: «محلات أحذية» تعني القسم لا منتجًا واحدًا */
  const generic = /(محل|محلات|متجر|متاجر|اماكن|مكان|انواع|نوع|ستور|شوب|store|market|توكيل|موزع)/.test(n);
  const WEAK = ['رجالي', 'حريمي', 'نسائي', 'ولادي', 'اطفالي', 'قطن', 'كلاسيك', 'جديد', 'اصلي', 'رخيص', 'غالي', 'محل', 'محلات', 'متجر', 'متاجر', 'سعر', 'اسعار', 'افضل', 'احسن', 'مفتوح', 'مفتوحه', 'يبيع', 'بتاع', 'مناسب'];
  const catHit = findCategory(raw);
  const prodHit = findProduct(raw);
  if (generic && catHit) {
    const strong = p.tokens.filter(t => t.length > 2 && WEAK.indexOf(t) < 0);
    const specific = prodHit && strong.some(t => norm(prodHit.name + ' ' + prodHit.brand).includes(t));
    if (!specific) { p.cat = catHit; p.product = null; p.notes.push('general'); }
    else { p.product = prodHit; p.cat = catOf(prodHit.cat); }
  } else { p.product = prodHit; p.cat = prodHit ? catOf(prodHit.cat) : catHit; }
  p.brand = findBrand(raw);
  if (p.product && p.notes.indexOf('general') < 0 && (p.brand || p.max)) {
    // التأكد أن الماركة المذكورة تطابق المنتج
    if (p.brand && norm(p.product.brand) !== norm(p.brand)) {
      const alt = PRODUCTS.filter(x => norm(x.brand) === norm(p.brand) && (!p.cat || x.cat === p.product.cat));
      if (alt.length) p.product = alt[0];
    }
  }

  /* لو المنتج المحدد خارج الميزانية ⇒ نعرض بدائل داخل نفس القسم */
  if (p.product && p.max != null) {
    const ls = DB.byProduct[p.product.id] || [];
    const mn = ls.length ? Math.min.apply(null, ls.map(l => l.price)) : p.product.base;
    if (mn > p.max) {
      p.productNamed = p.product.name; p.productNamedMin = mn;
      p.cat = catOf(p.product.cat); p.product = null; p.notes.push('over-budget');
    }
  }

  p.used = !!(p.product || p.cat || p.brand) || p.max != null || p.near || p.openNow || p.discountMin > 0 || p.stores.length > 0;
  p.unknown = !(p.product || p.cat || p.brand) && p.max == null && !p.near && !p.openNow && !p.discountMin && !p.stores.length;
  return p;
}

/* ---------- محرك البحث الرئيسي ---------- */
function searchListings(q, opt) {
  opt = opt || {};
  const parsed = parseQuery(q);
  const center = opt.center || LOC;
  let rows = DB.listings.slice();

  // الفلترة
  if (parsed.product && !opt.ignoreProduct) rows = rows.filter(l => l.productId === parsed.product.id);
  else if (parsed.cat) rows = rows.filter(l => l.cat === parsed.cat.id);
  if (parsed.brand) rows = rows.filter(l => norm(l.brand) === norm(parsed.brand));
  if (parsed.max != null) rows = rows.filter(l => l.price <= parsed.max);
  if (parsed.min != null) rows = rows.filter(l => l.price >= parsed.min);
  if (parsed.discountMin) rows = rows.filter(l => l.disc >= parsed.discountMin);
  if (opt.cat) rows = rows.filter(l => l.cat === opt.cat);
  if (opt.city) rows = rows.filter(l => DB.stores.find(s => s.id === l.storeId).city === opt.city);
  if (opt.inStock) rows = rows.filter(l => l.inStock);
  if (opt.onlyOffers) rows = rows.filter(l => l.disc > 0);

  // المسافة والحالة
  rows = rows.map(l => {
    const st = DB.stores.find(s => s.id === l.storeId);
    return Object.assign({}, l, { st, dist: distKm(center, st), open: isOpen(st) });
  });
  const rk = opt.maxDist || parsed.radiusK || 0;
  if (rk) rows = rows.filter(r => r.dist <= rk);
  if (opt.openNow || parsed.openNow) rows = rows.filter(r => r.open);

  /* لا يوجد للسعر المحدد نتيجة؟ نوسّع للقسم نفسه بنفس الشروط ونوضح ذلك للمستخدم */
  let fallback = false;
  if (!rows.length && parsed.product && (parsed.max != null || opt.maxDist || parsed.radiusK)) {
    const backup = DB.listings.filter(l => l.cat === parsed.product.cat).map(l => {
      const st = DB.stores.find(s => s.id === l.storeId);
      return Object.assign({}, l, { st, dist: distKm(center, st), open: isOpen(st) });
    }).filter(l => l.price <= (parsed.max != null ? parsed.max : Infinity))
      .filter(l => !rk || l.dist <= rk)
      .filter(l => !opt.inStock || l.inStock)
      .filter(l => !(opt.openNow || parsed.openNow) || l.open);
    if (backup.length) { rows = backup; fallback = true; }
  }

  // الترتيب
  const sort = opt.sort || (parsed.cheap ? 'price' : parsed.near ? 'dist' : (parsed.product ? 'total' : 'total'));
  if (sort === 'total') {
    const prices = rows.map(x => x.price);
    const mn = Math.min.apply(null, prices.concat([0])), mx = Math.max.apply(null, prices.concat([0]));
    rows.sort((a, b) => scoreRow(b, mn, mx) - scoreRow(a, mn, mx) || a.price - b.price);
  } else {
    rows.sort((a, b) => {
      if (sort === 'price') return a.price - b.price || a.dist - b.dist;
      if (sort === 'dist') return a.dist - b.dist || a.price - b.price;
      if (sort === 'disc') return b.disc - a.disc || a.price - b.price;
      if (sort === 'rating') return b.st.rating - a.st.rating || a.price - b.price;
      if (sort === 'fresh') return a.updatedH - b.updatedH;
      return a.price - b.price;
    });
  }
  return { rows, parsed, total: rows.length, fallback, radiusK: rk };
}
function scoreRow(r, mn, mx) {
  const sp = mx === mn ? 1 : 1 - (r.price - mn) / (mx - mn);          // 1 = الأرخص
  const sd = 1 / (1 + r.dist / 3);                                      // القرب
  const sdisc = clamp(r.disc / 30, 0, 1);                               // الخصم
  const srate = (r.st.rating - 3.2) / 1.8;                              // التقييم
  const sfresh = r.updatedH < 24 ? 1 : r.updatedH < 96 ? 0.6 : 0.2;     // حداثة السعر
  const sstock = r.inStock ? 1 : 0;
  return sp * .34 + sd * .24 + sdisc * .14 + srate * .12 + sfresh * .08 + sstock * .08;
}

/* ---------- محرك التحليل: ملخص وصفي بالأرقام ---------- */
function analyze(rows, mode) {
  mode = mode || 'product';
  if (!rows.length) return null;
  const prices = rows.map(r => r.price);
  const mn = Math.min.apply(null, prices), mx = Math.max.apply(null, prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const near = rows.reduce((a, b) => a.dist < b.dist ? a : b);
  const offer = rows.reduce((a, b) => (b.disc > a.disc ? b : a), rows[0]);
  const fresh = rows.filter(r => r.updatedH < 24).length;
  const stale = rows.filter(r => r.updatedH >= 168).length;
  const openN = rows.filter(r => r.open).length;
  const inStock = rows.filter(r => r.inStock).length;
  const saving = Math.round(mx - mn);
  const savePct = mx ? Math.round((mx - mn) / mx * 100) : 0;
  const avgRating = rows.reduce((a, b) => a + b.st.rating, 0) / rows.length;
  const stores = new Set(rows.map(r => r.storeId)).size;
  const cities = Array.from(new Set(rows.map(r => r.st.city)));
  return {
    n: rows.length, stores, mn, mx, avg: Math.round(avg), saving, savePct, near, offer,
    fresh, stale, openN, inStock, avgRating, cities,
    text: (mode === 'store'
      ? `يوجد ${rows.length} سعرًا مسجّلًا في ${stores} متجرًا${cities.length > 1 ? ' داخل ' + cities.length + ' محافظة' : ''}. ` +
        `أقل سعر مسجّل ${egp(mn)} وأعلى سعر ${egp(mx)} حسب المنتج والمتجر. ` +
        `أقرب متجر ${kmTxt(near.dist)} في ${near.st.area}. ` +
        (offer.disc ? `أكبر خصم معلن ${pct(offer.disc)} عند ${offer.st.name}. ` : '') +
        `يوجد ${openN} متجر مفتوح الآن، وأسعار ${fresh} سعرًا محدثة خلال 24 ساعة${stale ? `، و${stale} سعرًا يحتاج تحديثًا` : ''}.`
      :
      `المنتج متوفر في ${stores} متجر مسجّل${cities.length > 1 ? ' في ' + cities.length + ' محافظة' : ''}. ` +
      `أقل سعر مسجّل ${egp(mn)}، وأعلى سعر ${egp(mx)} — فرق ${egp(saving)} (${pct(savePct)}). ` +
      `أقرب متجر ${kmTxt(near.dist)} في ${near.st.area}. ` +
      (offer.disc ? `أكبر خصم معلن ${pct(offer.disc)} عند ${offer.st.name}. ` : 'لا توجد خصومات مسجلة حاليًا. ') +
      `يوجد ${openN} متجر مفتوح الآن، و${inStock} منهم أكدوا التوفر. ` +
      `أسعار ${fresh} متجر محدثة خلال 24 ساعة${stale ? `، و${stale} متجر يحتاج تحديث السعر` : ''}.`)
  };
}

/* ---------- موثوقية وحداثة البيانات ---------- */
const TRUST = [
  { max: 24, lvl: 'fresh', ar: 'حديثة', cls: 'ok', dot: 'g', pctv: 100 },
  { max: 96, lvl: 'ok', ar: 'مقبولة', cls: 'p', dot: 'g', pctv: 75 },
  { max: 240, lvl: 'warn', ar: 'تحتاج تحديث', cls: 'warn', dot: 'y', pctv: 45 },
  { max: 1e9, lvl: 'old', ar: 'قديمة', cls: 'bad', dot: 'r', pctv: 18 }
];
const trustOf = (h) => TRUST.find(t => h <= t.max);

/* ---------- تاريخ الأسعار (آخر 12 شهرًا) ---------- */
function priceHistory(pid) {
  const p = PRODUCTS.find(x => x.id === pid);
  if (!p) return [];
  const months = ['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر'];
  const out = [];
  let v = p.base * rng('h' + pid, 1.06, 1.16);
  months.forEach((mn, i) => {
    const drift = rng('h' + pid + i, -0.035, 0.02);
    v = v * (1 + drift);
    out.push({ m: mn, v: round(v, p.base > 3000 ? 50 : 5) });
  });
  const live = DB.byProduct[pid] || [];
  if (live.length) out[out.length - 1].v = Math.min.apply(null, live.map(l => l.price));
  return out;
}
/* سلسلة يومية لأي متجر/منتج (لعرض الاتجاه) */
function daySeries(seed, base, days, vol) {
  let v = base * (1 + (rnd(seed + 'ds') - .5) * vol);
  return Array.from({ length: days }, (_, i) => {
    v = v * (1 + (rnd(seed + 'd' + i) - .5) * vol / 2);
    return Math.round(v);
  });
}

/* ---------- تنبيهات السعر ---------- */
function alertsMatch() {
  const hits = [];
  DB.alerts.forEach(a => {
    const rows = (DB.byProduct[a.productId] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId) }))
      .filter(l => l.price <= a.target && l.inStock);
    if (rows.length) hits.push({ alert: a, best: rows.sort((x, y) => x.price - y.price)[0], count: rows.length });
  });
  return hits;
}
