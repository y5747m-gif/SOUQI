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
const STOP = new Set(['في', 'من', 'على', 'عن', 'عايز', 'عايزه', 'عاوز', 'عاوزه', 'اريد', 'أريد', 'محتاج', 'محتاجه', 'ممكن', 'هات', 'لي', 'عندي', 'بحوالي', 'جنيه', 'جنية', 'جنيها', 'ال', 'و', 'او', 'أو', 'جدا', 'كمان', 'قريب', 'قريبة', 'مني', 'لحد', 'حتى', 'اقل', 'أقل', 'اكثر', 'أكثر', 'نفسي', 'بدور', 'ادور', 'بدوّر', 'ابحث', 'دور', 'لو', 'سمحت', 'ياريت', 'اشتري', 'شراء', 'فين', 'الاقي', 'ألاقي', 'حاجه', 'حاجة', 'تقريبا', 'حوالي', 'بس', 'يعني', 'كده', 'دلوقتي']);
const AR_DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
const fixDigits = (s) => String(s).replace(/[٠-٩]/g, d => AR_DIGITS[d]);

/* ---------- الأرقام المنطوقة بالعامية → أرقام ----------
   «الفين» → 2000 ، «خمس آلاف» → 5000 ، «15k» → 15000 ، «ميه» → 100 */
const UNIT_WORDS = {
  'اتنين': 2, 'اثنين': 2, 'تلات': 3, 'تلاته': 3, 'ثلاث': 3, 'ثلاثه': 3, 'اربع': 4, 'اربعه': 4,
  'خمس': 5, 'خمسه': 5, 'ست': 6, 'سته': 6, 'سبع': 7, 'سبعه': 7, 'تمان': 8, 'تمانيه': 8, 'ثمان': 8, 'ثمانيه': 8,
  'تسع': 9, 'تسعه': 9, 'عشر': 10, 'عشره': 10, 'خمستاشر': 15, 'عشرين': 20, 'تلاتين': 30, 'ثلاثين': 30,
  'اربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70, 'تمانين': 80, 'ثمانين': 80, 'تسعين': 90, 'ميه': 100, 'ميت': 100
};
function spokenNums(s) {
  let t = String(s);
  // 15k أو ١٥ك → 15000
  t = t.replace(/(\d+(?:[.,]\d+)?)\s*[kK]\b/g, (m, v) => String(Math.round(parseFloat(v.replace(',', '.')) * 1000)));
  // الفين → 2000
  t = t.replace(/[أا]لفين/g, '2000');
  // «خمس آلاف» / «تلاتة الاف» → 5000 / 3000  (ملحوظة: \b لا يعمل مع العربية)
  t = t.replace(/([\u0600-\u06FF]+)\s+(?:[آأا]لاف|[أا]لف)(?![\u0600-\u06FF])/g, (m, w) => {
    const key = norm(w);
    return UNIT_WORDS[key] ? String(UNIT_WORDS[key] * 1000) : m;
  });
  return t;
}

/* ---------- مطابقة ضبابية: تتسامح مع خطأ إملائي أو خطأين ----------
   «سمسونج» تطابق «سامسونج» ، «ايفوون» تطابق «ايفون» */
function editDist(a, b, maxD) {
  if (Math.abs(a.length - b.length) > maxD) return maxD + 1;
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxD) return maxD + 1; // قطع مبكر
    prev = cur;
  }
  return prev[b.length];
}
function fuzzyEq(a, b) {
  if (a === b) return true;
  const len = Math.min(a.length, b.length);
  const maxD = len >= 7 ? 2 : len >= 4 ? 1 : 0;
  if (!maxD) return false;
  return editDist(a, b, maxD) <= maxD;
}
function fuzzyIn(tok, hayToks) { return hayToks.some(h => fuzzyEq(tok, h)); }

/* ---------- البحث عن منتج: مطابقة بالمعرّف أو الماركة أو الكلمات ---------- */
function findProduct(q) {
  const n = norm(q);
  if (!n) return null;
  const toks = n.split(' ').filter(t => t.length > 1 && !STOP.has(t));
  let best = null, bestScore = 0;
  PRODUCTS.forEach(p => {
    const hay = norm(p.name + ' ' + p.brand + ' ' + p.kw + ' ' + p.cat + ' ' + catOf(p.cat).ar);
    const hayToks = hay.split(' ').filter(t => t.length > 2);
    let sc = 0;
    if (n.includes(norm(p.id))) sc += 6;
    if (p.kw.split(' ').some(k => k.length > 2 && n.includes(norm(k)))) sc += 5;
    if (n.includes(norm(p.brand))) sc += 3;
    toks.forEach(t => {
      if (hay.includes(t)) sc += 2.2;
      else if (t.length > 3 && fuzzyIn(t, hayToks)) sc += 1.8; // تسامح مع الخطأ الإملائي
    });
    const pn = norm(p.name).split(' ');
    if (pn.filter(t => t.length > 2 && n.includes(t)).length >= 2) sc += 3.5;
    if (sc > bestScore) { bestScore = sc; best = p; }
  });
  return bestScore >= 4 ? best : null;
}
function findCategory(q) {
  const n = norm(q);
  if (!n) return null; // استعلام فارغ لا يطابق أي فئة
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
    ['موبايل', 'mobile'], ['تليفون', 'mobile'], ['هاتف', 'mobile'], ['تابلت', 'mobile'], ['ساعه', 'mobile'], ['فون', 'mobile'], ['جوال', 'mobile'],
    ['لاب توب', 'computer'], ['لابتوب', 'computer'], ['كمبيوتر', 'computer'], ['رام', 'computer'], ['هارد', 'computer'], ['كارت', 'computer'], ['كيبورد', 'computer'], ['بروسيسور', 'computer'],
    ['سماعه', 'audio'], ['هيدفون', 'audio'], ['اسبيكر', 'audio'], ['مكبر', 'audio'], ['ايربودز', 'audio'], ['صوتيات', 'audio'],
    ['شاشه', 'electronics'], ['راوتر', 'electronics'], ['ماوس', 'electronics'], ['باور', 'electronics'], ['شاحن', 'electronics'], ['كابل', 'electronics'],
    ['بلايستيشن', 'gaming'], ['اكس بوكس', 'gaming'], ['لعبه', 'gaming'], ['جيمنج', 'gaming'], ['دراع', 'gaming'],
    ['حله', 'home'], ['قلايه', 'home'], ['مكنسه', 'home'], ['مروحه', 'home'], ['اثاث', 'home'], ['غساله', 'home'], ['بوتجاز', 'home'], ['سخان', 'home'], ['مكواه', 'home'], ['خلاط', 'home'], ['تلاجه', 'home'],
    ['قميص', 'clothing'], ['بنطلون', 'clothing'], ['تيشيرت', 'clothing'], ['فستان', 'clothing'], ['ملابس', 'clothing'], ['جاكيت', 'clothing'], ['هودي', 'clothing'], ['بدله', 'clothing'], ['هدوم', 'clothing'],
    ['جزمة', 'shoes'], ['حزاء', 'shoes'], ['احذيه', 'shoes'], ['سنيكرز', 'shoes'], ['كوتشي', 'shoes'], ['شبشب', 'shoes'], ['صندل', 'shoes'],
    ['عطر', 'beauty'], ['كريم', 'beauty'], ['ميكب', 'beauty'], ['شامبو', 'beauty'], ['برفان', 'beauty'], ['مكياج', 'beauty'], ['لوشن', 'beauty'],
    ['بقاله', 'supermarket'], ['سوبر', 'supermarket'], ['زيت', 'supermarket'], ['ارز', 'supermarket'], ['سكر', 'supermarket'], ['مكرونه', 'supermarket'], ['شاي', 'supermarket'], ['لبن', 'supermarket'],
    ['كتاب', 'books'], ['مكتبه', 'books'], ['روايه', 'books'], ['قصص', 'books'], ['كراسه', 'books'],
    ['شنيور', 'tools'], ['مفك', 'tools'], ['سلم', 'tools'], ['ادوات', 'tools'], ['شاكوش', 'tools'], ['كماشه', 'tools'], ['مثقاب', 'tools'],
    ['مطعم', 'restaurant'], ['وجبه', 'restaurant'], ['بيتزا', 'restaurant'], ['كريب', 'restaurant'], ['برجر', 'restaurant'], ['شاورما', 'restaurant'], ['فراخ', 'restaurant'], ['اكل', 'restaurant'],
    ['صيدليه', 'pharmacy'], ['دوا', 'pharmacy'], ['فيتامين', 'pharmacy'], ['مسكن', 'pharmacy'], ['علاج', 'pharmacy'],
    ['سياره', 'auto'], ['كاوتش', 'auto'], ['زيت موتور', 'auto'], ['بطاريه عربيه', 'auto'], ['فلتر', 'auto'],
    ['دمبل', 'sports'], ['جيم', 'sports'], ['رياضه', 'sports'], ['مشايه', 'sports'], ['عجله', 'sports'], ['دراجه', 'sports']
  ];
  extra.forEach(([w, cid]) => { if (n.includes(norm(w)) && w.length > len) { len = w.length; hit = catOf(cid); } });
  // مطابقة ضبابية للكلمات الشعبية عند عدم وجود نتيجة مباشرة («سماعا» → سماعة)
  if (!hit) {
    const toks = n.split(' ').filter(t => t.length > 3);
    outer: for (const t of toks) {
      for (const [w, cid] of extra) {
        if (fuzzyEq(t, norm(w))) { hit = catOf(cid); break outer; }
      }
    }
  }
  return hit;
}
const BRANDS = Array.from(new Set(PRODUCTS.map(p => p.brand)).values()).filter(b => b !== 'محلي' && b !== 'مطعم' && b !== 'مكتبة' && b !== 'صيدلية');
/* أسماء الماركات بالعربي كما يكتبها الناس فعلًا */
const BRAND_AR = {
  'ابل': 'Apple', 'ايفون': 'Apple', 'سامسونج': 'Samsung', 'سامسونغ': 'Samsung', 'سمسنج': 'Samsung',
  'شاومي': 'Xiaomi', 'شياومي': 'Xiaomi', 'ريدمي': 'Xiaomi', 'اوبو': 'Oppo', 'ريلمي': 'Realme',
  'هواوي': 'Huawei', 'انكر': 'Anker', 'جي بي ال': 'JBL', 'سوني': 'Sony', 'ال جي': 'LG',
  'توشيبا': 'Toshiba', 'لينوفو': 'Lenovo', 'اتش بي': 'HP', 'ديل': 'Dell', 'اسوس': 'Asus',
  'نايك': 'Nike', 'اديداس': 'Adidas', 'بوما': 'Puma', 'فيليبس': 'Philips', 'تورنيدو': 'Tornado', 'براون': 'Braun'
};
function findBrand(q) {
  const n = norm(q);
  const direct = BRANDS.find(b => n.includes(norm(b)));
  if (direct) return direct;
  // الاسم العربي للماركة
  for (const ar in BRAND_AR) {
    if (n.includes(norm(ar)) && BRANDS.some(b => norm(b) === norm(BRAND_AR[ar]))) return BRAND_AR[ar];
  }
  // مطابقة ضبابية: «سمسونج» → Samsung (بالاسم العربي أو اللاتيني)
  const toks = n.split(' ').filter(t => t.length > 3);
  for (const t of toks) {
    const hitB = BRANDS.find(b => fuzzyEq(t, norm(b)));
    if (hitB) return hitB;
    for (const ar in BRAND_AR) {
      if (fuzzyEq(t, norm(ar)) && BRANDS.some(b => norm(b) === norm(BRAND_AR[ar]))) return BRAND_AR[ar];
    }
  }
  return null;
}

/* ---------- تحويل الجملة الطبيعية إلى فلاتر ----------
   مثال: "عايز سماعة JBL تحت 3000 جنيه قريبة مني"
   → {cat:audio, brand:JBL, max:3000, near:true, ...}
------------------------------------------------------------- */
function parseQuery(q) {
  const raw = spokenNums(fixDigits(q || ''));
  const n = norm(raw);
  const p = {
    q: raw, tokens: n.split(' ').filter(t => t && !STOP.has(t)),
    cat: null, brand: null, product: null, max: null, min: null, near: false, openNow: false,
    cheap: false, best: false, discountMin: 0, radiusK: null, used: false, unknown: true, stores: [], notes: []
  };

  /* نطاق سعري صريح: «بين 2000 و5000» ، «من 3000 لـ 6000» */
  let rg = raw.match(/(?:ما بين|بين)\s*(\d[\d,\.]*)\s*(?:و|الى|إلى|ل)ـ?\s*(\d[\d,\.]*)/);
  if (!rg) rg = raw.match(/من\s*(\d[\d,\.]*)\s*(?:الى|إلى|لحد|حتى|لغاية|ل)ـ?\s*(\d[\d,\.]*)/);
  if (rg) {
    let a = parseFloat(rg[1].replace(/[,\s]/g, '')), b = parseFloat(rg[2].replace(/[,\s]/g, ''));
    if (a > b) { const t = a; a = b; b = t; }
    if (b > 150) { p.min = a; p.max = b; p.notes.push('range'); }
  }

  /* سعر تقريبي: «حوالي 4000» ، «تقريبًا 3000» → نطاق ±20% */
  if (p.max == null) {
    const am = raw.match(/(?:حوالي|تقريبا|تقريبًا|بحوالي|يدور حول|قد)\s*(\d[\d,\.]*)\s*(?:الف|ألف)?/);
    if (am) {
      let v = parseFloat(am[1].replace(/[,\s]/g, ''));
      if (/الف|ألف/.test(am[0])) v *= 1000;
      if (v > 150) { p.min = Math.round(v * 0.8); p.max = Math.round(v * 1.2); p.notes.push('approx'); }
    }
  }

  /* الميزانية القصوى */
  let m = p.max != null ? null : raw.match(/(?:أقل|اقل|تحت|بأقل|بحد أقصى|حد اقصى|ميزانية|معايا|عندي|لحد|حتى|في حدود|بحدود)\s*(\d[\d,\.]*)\s*(?:الف|ألف|ف)?/);
  if (!m && p.max == null) m = raw.match(/(\d[\d,\.]*)\s*(?:جنيه|جنية|ج\.م|EGP|egp)/);
  if (m) { let v = parseFloat(m[1].replace(/[,\s]/g, '')); if (/الف|ألف/.test(m[0])) v *= 1000; if (v > 150) p.max = v; }
  let m2 = p.min != null ? null : raw.match(/(?:أكثر من|اكثر من|فوق|أعلى من|اعلى من|يبدأ من|من غير أقل من)\s*(\d[\d,\.]*)\s*(?:الف|ألف|ف)?/);
  if (m2) { let v = parseFloat(m2[1].replace(/[,\s]/g, '')); if (/الف|ألف/.test(m2[0]) || v < 500) v *= 1000; p.min = v; }
  if (!p.max) { const mm = n.match(/(\d{2,4})\s*(?:الف|ألف)/); if (mm) p.max = parseFloat(mm[1]) * 1000; }

  /* النطاق الجغرافي المذكور في الجملة */
  const rm = n.match(/(\d+(?:[.,]\d+)?)\s*(?:كم|كيلو|كيلومتر)/);
  if (rm) p.radiusK = parseFloat(rm[1].replace(',', '.'));
  else { const mm2 = n.match(/(\d{3,5})\s*(?:متر|م)\s*(?:مني|من موقعي|حولي)?/); if (mm2) p.radiusK = parseFloat(mm2[1]) / 1000; }

  /* نية الطلب */
  if (/(قريب|جنبي|حوالي(?!\s*\d)|حولي|حواليا|حوالين|نفس المنطقة|قريبة مني|قريب مني|بجانبي|بالقرب|جمبي|جنب البيت|في منطقتي)/.test(n)) p.near = true;
  if (/(مفتوح|فاتح|شغال|الان|دلوقتي|يعمل حاليا|مفتوحه|لسه فاتح)/.test(n)) p.openNow = true;
  if (/(ارخص|رخيص|اقل سعر|افضل سعر|باقل|توفير|اوفر|علي قد الايد|اقتصادي)/.test(n)) p.cheap = true;
  if (/(افضل|احسن|كويس|جوده|ممتاز|اعلي تقييم|قيمه مقابل)/.test(n)) p.best = true;
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
  let rows = DB.listings.slice(); // بُنيت القاعدة أصلًا من SERVICE_CITIES فقط

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
    const dist = distKm(center, st);
    const shipping = st.delivery ? Math.round((st.deliveryFeeBase || 25) + dist * 5) : 0;
    return Object.assign({}, l, { st, dist, shipping, totalCost: l.price + shipping, open: isOpen(st) });
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
      if (sort === 'price') return (a.totalCost || a.price) - (b.totalCost || b.price) || a.price - b.price;
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
