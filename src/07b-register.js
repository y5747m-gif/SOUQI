/* =========================================================================
   ✅ وحدة تسجيل المحلات (Store Registration)
   بيانات المحل + الموقع + البضاعة + التواصل + المستندات — 8 خطوات
   ========================================================================= */

/* ------------------------- 1. حالة التسجيل ------------------------- */
function regBlank() {
  return {
    step: 1, edit: null, startedAt: Date.now(),
    /* الهوية */
    name: '', nameOnSign: '', legalType: 'فردي (صاحب محل)', founded: '', sizeM2: '', employees: '1-3',
    cats: [], tags: [], desc: '', audience: [], wholesale: false,
    commercialReg: '', taxId: '', vatIncluded: false,
    /* الموقع */
    city: 'الجيزة', district: '', area: '', street: '', buildingNo: '', floor: '', landmark: '',
    lat: 30.0380, lon: 31.2115, gmapsUrl: '', parking: 'شارع / غير مخصص', onMainStreet: true, nearMetro: false,
    /* الفروع والتوصيل */
    branches: [], zones: [], delivery: true, deliveryRadius: 5, deliveryFee: '', minOrder: '', prepTime: 'نفس اليوم',
    zones: [], pickup: true,
    /* التواصل والمواعيد */
    phone: '', phone2: '', whatsapp: '', email: '', website: '', facebook: '', instagram: '', tiktok: '',
    hours: regDefaultHours(), hoursNotes: '', replyTime: 'خلال ساعة',
    contactPerson: '', contactRole: 'مالك', priceManager: '', priceManagerPhone: '',
    /* الدفع والخدمات */
    pay: ['كاش'], installments: [], svc: [], returnDays: '14', warranty: 'سنة', install: false, installFee: '', taxInvoice: false,
    /* البضاعة */
    products: [], inventoryValue: 0,
    /* الصور والمستندات */
    media: { logo: false, facade: false, inside: false, shelf: false, products: false, video: '' },
    docs: { commercialReg: false, tax: false, signPhoto: false, phoneProof: false, idCard: false },
    allowPhotos: true, logoEmoji: '🏪',
    /* المراجعة */
    plan: 'free', wantAds: false, wantFeatured: false, notifyWa: true, notifyWeekly: true, agree: false, agreeTruth: false
  };
}
function regDefaultHours() {
  const h = {};
  for (let i = 0; i < 7; i++) {
    const fri = i === 5;
    h[i] = { closed: false, open: fri && false ? '' : (fri ? '14:00' : '10:00'), close: '23:00', note: '' };
  }
  h[5].open = '14:00';
  return h;
}
const REG = Object.assign(regBlank(), load('regDraft', {}));
REG.hours = Object.assign(regDefaultHours(), REG.hours || {});
REG.media = Object.assign({ logo: false, facade: false, inside: false, shelf: false, products: false, video: '' }, REG.media || {});
REG.docs = Object.assign({ commercialReg: false, tax: false, signPhoto: false, phoneProof: false, idCard: false }, REG.docs || {});
const regSave = () => save('regDraft', REG);
const HRS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00'];
const LEGAL_TYPES = ['فردي (صاحب محل)', 'شركة', 'فرع لسلسلة', 'وكيل معتمد', 'موزّع'];
const EMPLOYEES = ['1-3', '4-10', '11-25', '26-50', 'أكثر من 50'];
const AUDIENCE = ['أفراد', 'عائلات', 'شركات', 'جملة / تجار', 'طلبة', 'سياح'];
const INSTALLMENT_CO = ['فاليو', 'أمان', 'سيمبل', 'كونكت', 'بنوك مباشرة', 'تقسيط داخلي'];
const RETURN_OPTS = ['3 أيام', '7 أيام', '14 يومًا', '30 يومًا', 'بدون إرجاع'];
const WARRANTY_OPTS = ['بدون ضمان', '3 شهور', '6 شهور', 'سنة', 'سنتان', 'ضمان الوكيل'];
const PARKING = ['موقف خاص', 'شارع / غير مخصص', 'جراج مجاور'];
const PREP = ['فوري', 'نفس اليوم', '24 ساعة', '2-3 أيام'];
const REPLYT = ['خلال 15 دقيقة', 'خلال ساعة', 'خلال 3 ساعات', 'خلال يوم'];
const CONTACT_ROLES = ['مالك', 'مدير', 'مسؤول تسويق', 'موظف'];
const PRODUCT_LIMIT_FREE = 30;
const TAGS_SUGG = ['ضمان الوكيل', 'تركيب مجاني', 'توصيل سريع', 'أسعار جملة', 'منتجات أصلية', 'صيانة بعد البيع', 'استبدال فوري', 'خدمة تقسيط', 'تصوير المنتجات', 'طلب أونلاين'];

/* ------------------------- 2. أدوات المساعدة ------------------------- */
function regStep() { return clamp(parseInt(APP.route.p.step || REG.step || 1, 10), 1, 8); }
function regSet(k, v) { REG[k] = v; regSave(); }
function regToggleIn(k, v) {
  const arr = REG[k] || (REG[k] = []);
  const i = arr.indexOf(v);
  if (i < 0) arr.push(v); else arr.splice(i, 1);
  regSave();
}
function regProduct(idx, key, val) {
  REG.products[idx] = REG.products[idx] || regNewProduct();
  REG.products[idx][key] = val;
  if (key === 'price' || key === 'old') { }
  regSave();
}
function regNewProduct() { return { name: '', cat: REG.cats[0] || 'electronics', brand: '', model: '', price: '', old: '', qty: '', stock: true, warranty: REG.warranty, condition: 'جديد', desc: '' }; }
function regGroupTotal() {
  let sum = 0, count = 0, disc = 0;
  REG.products.forEach(p => {
    if (!p.name || !p.price) return;
    count++;
    const q = parseInt(p.qty || 1, 10) || 1;
    sum += (+p.price) * q;
    if (p.old && +p.old > +p.price) disc = Math.max(disc, Math.round((1 - (+p.price / +p.old)) * 100));
  });
  return { sum, count, disc };
}
function regCompleteness() {
  const checks = [];
  const add = (cond, key, label, weight) => { if (weight && !cond) checks.push({ key, label, weight }); return cond ? (weight || 1) : 0; };
  let score = 0;
  score += add(!!REG.name, 'name', 'اسم المتجر', 8);
  score += add(!!REG.nameOnSign || !!REG.name, 'nameOnSign', 'الاسم كما على اللافتة', 2);
  score += add(REG.cats.length > 0, 'cats', 'اختيار أقسام النشاط', 8);
  score += add(!!REG.desc && REG.desc.length > 20, 'desc', 'وصف المتجر (سطران على الأقل)', 4);
  score += add(!!REG.founded, 'founded', 'سنة التأسيس', 2);
  score += add(!!REG.sizeM2, 'sizeM2', 'مساحة المتجر', 1);
  score += add(!!REG.commercialReg || !!REG.taxId, 'commercialReg', 'السجل التجاري أو البطاقة الضريبية (للتوثيق)', 3);
  score += add(!!REG.city && !!REG.area, 'area', 'المحافظة والمنطقة', 8);
  score += add(!!REG.street && !!REG.buildingNo, 'street', 'الشارع ورقم العقار', 4);
  score += add(!!REG.landmark, 'landmark', 'علامة مميزة قريبة (تسهّل الوصول)', 2);
  score += add(!!REG.gmapsUrl, 'gmapsUrl', 'رابط الموقع على خرائط جوجل', 2);
  score += add(!!REG.phone, 'phone', 'رقم هاتف مُتحقق منه', 8);
  score += add(!!REG.whatsapp || !!REG.phone, 'whatsapp', 'رقم واتساب للتواصل', 6);
  score += add(!!REG.email || !!REG.facebook || !!REG.instagram, 'social', 'وسيلة تواصل إضافية (إيميل أو سوشيال)', 2);
  score += add(!!REG.contactPerson, 'contactPerson', 'اسم مسؤول التواصل', 2);
  score += add(!!REG.priceManager && !!REG.priceManagerPhone, 'priceManager', 'مسؤول تحديث الأسعار (اسم + رقم)', 6);
  score += add(REG.pay.length > 0, 'pay', 'طرق الدفع المتاحة', 3);
  score += add(REG.svc.length > 0, 'svc', 'الخدمات التي تقدمها', 3);
  score += add(!!REG.marketHoursSet(), 'hours', 'مواعيد العمل', 5);
  score += add(REG.products.filter(p => p.name && p.price).length > 0, 'products', 'إضافة أول منتجاتك بأسعارها', 12);
  score += add(REG.products.filter(p => p.name && p.price).length >= 5, 'products5', 'الوصول إلى 5 منتجات مسجّلة على الأقل', 5);
  score += add(REG.media.facade || REG.media.inside || REG.media.shelf, 'photos', 'صور المتجر (واجهة/داخل)', 3);
  score += add(REG.media.logo, 'logo', 'شعار المتجر', 1);
  score += add(Object.values(REG.docs).filter(Boolean).length >= 1, 'docs', 'رفع مستند واحد على الأقل للتوثيق', 2);
  score += add(REG.branches.some(b => b.name), 'branches', 'بيانات الفروع (إن وُجدت)', 1);
  score += add(REG.delivery && (+REG.deliveryRadius > 0), 'delivery', 'نطاق التوصيل', 2);
  const total = 8 + 2 + 8 + 4 + 2 + 1 + 3 + 8 + 4 + 2 + 2 + 8 + 6 + 2 + 2 + 6 + 3 + 3 + 5 + 12 + 5 + 3 + 1 + 2 + 1 + 2;
  const pct = Math.min(100, Math.round(score / total * 100));
  checks.sort((a, b) => b.weight - a.weight);
  return { pct, missing: checks, score, total };
}
REG.marketHoursSet = function () { return true; };

/* ------------------------- 3. قوالب المنتجات والاستيراد ------------------------- */
function regSuggestedProducts() {
  const cats = REG.cats.length ? REG.cats : ['electronics'];
  const out = [];
  cats.forEach(c => {
    PRODUCTS.filter(p => p.cat === c).slice(0, 6).forEach(p => out.push({ name: p.name, cat: p.cat, brand: p.brand, model: '', price: '', old: '', qty: '', stock: true, warranty: REG.warranty, condition: 'جديد', desc: '' }));
  });
  return out.slice(0, 12);
}
/* تحليل قائمة ملصوقة: «سماعة JBL 2500» أو «اسم المنتج - 2,500 - متوفر» */
function regParsePasted(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const rows = [];
  lines.forEach(line => {
    let name = line, price = '', old = '', stock = true;
    if (/خلص|غير متوفر|مش متوفر|ناقص/.test(line)) stock = false;
    const nums = (line.match(/\d[\d,\.]{2,}/g) || []).map(x => parseFloat(x.replace(/[,\s]/g, ''))).filter(n => n >= 20);
    if (nums.length >= 2) { old = Math.max(nums[0], nums[1]); price = Math.min(nums[0], nums[1]); }
    else if (nums.length === 1) { price = nums[0]; }
    name = line.replace(/\d[\d,\.]*/g, '').replace(/[-–|،,]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || !price) return;
    const prod = findProduct(name);
    rows.push({
      name: prod ? prod.name : name, cat: prod ? prod.cat : (REG.cats[0] || 'electronics'),
      brand: prod ? prod.brand : '', model: '', price: price, old: old || '', qty: '', stock,
      warranty: REG.warranty, condition: 'جديد', desc: ''
    });
  });
  return rows;
}
function regParseCSV(text) {
  const rows = [];
  String(text || '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    if (i === 0 && /اسم|name/i.test(line)) return;   // تخطّي صف العناوين
    const c = line.split(/[,;\t]/).map(x => x.replace(/^"|"$/g, '').trim());
    if (!c[0]) return;
    rows.push({
      name: c[0], price: c[1] || '', old: c[2] || '', brand: c[3] || '', model: c[4] || '',
      qty: c[5] || '', stock: !/0|لا|غير/.test(c[6] || ''), cat: REG.cats[0] || 'electronics',
      warranty: REG.warranty, condition: 'جديد', desc: c[7] || ''
    });
  });
  return rows;
}
function regCSVTemplate() {
  const head = 'name,price,price_before,brand,model,quantity,available,notes';
  const body = [
    'Samsung Galaxy A56 5G,24900,26500,Samsung,A56,5,1,ضمان سنة',
    'سماعة JBL Tune 520BT,2590,2790,JBL,T520BT,12,1,ألوان متعددة',
    'شاحن أصلي 25 وات,450,,Samsung,,30,1,'
  ].join('\n');
  return head + '\n' + body;
}

/* ------------------------- 4. عناصر الواجهة ------------------------- */
const fInput = (label, key, o) => {
  o = o || {};
  return `<div class="field ${o.cls || ''}">
    <label>${label}${o.req ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
    <input class="input ${o.num ? 'num' : ''}" data-reg="${key}" type="${o.type || 'text'}" value="${esc(REG[key] == null ? '' : REG[key])}" placeholder="${esc(o.ph || '')}" ${o.max ? 'maxlength="' + o.max + '"' : ''}>
    ${o.hint ? `<span class="tiny muted">${o.hint}</span>` : ''}
  </div>`;
};
const fArea = (label, key, o) => {
  o = o || {};
  return `<div class="field"><label>${label}${o.req ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
    <textarea class="input" rows="${o.rows || 3}" data-reg="${key}" placeholder="${esc(o.ph || '')}">${esc(REG[key] == null ? '' : REG[key])}</textarea>
    ${o.hint ? `<span class="tiny muted">${o.hint}</span>` : ''}</div>`;
};
const fSelect = (label, key, opts, o) => {
  o = o || {};
  return `<div class="field"><label>${label}${o.req ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
    <select class="select" data-regsel="${key}">${opts.map(op => {
    const val = Array.isArray(op) ? op[0] : op, lbl = Array.isArray(op) ? op[1] : op;
    return `<option value="${esc(val)}" ${String(REG[key]) === String(val) ? 'selected' : ''}>${esc(lbl)}</option>`;
  }).join('')}</select></div>`;
};
const fChips = (label, key, opts, o) => {
  o = o || {};
  return `<div class="field"><label>${label}${o.req ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
    <div class="chips">${opts.map(op => {
    const val = Array.isArray(op) ? op[0] : op, lbl = Array.isArray(op) ? op[1] : op;
    const on = (REG[key] || []).indexOf(val) >= 0;
    return `<button type="button" class="chip ${on ? 'p' : ''}" data-regchip="${key}" data-val="${esc(val)}">${on ? '✓ ' : ''}${esc(lbl)}</button>`;
  }).join('')}</div>${o.hint ? `<span class="tiny muted">${o.hint}</span>` : ''}</div>`;
};
const fSwitch = (label, key, hint) => `<label class="switch" style="margin:6px 0">${fSwInput(key, !!REG[key])} ${esc(label)}${hint ? ` <span class="tiny muted">${esc(hint)}</span>` : ''}</label>`;
const fSwInput = (key, on) => `<input type="checkbox" data-regsw="${key}" ${on ? 'checked' : ''}>`;

/* ------------------------- 5. الخريطة التفاعلية للاختيار ------------------------- */
const REG_CITIES = {};
DB.stores.forEach(s => { if (!REG_CITIES[s.city]) REG_CITIES[s.city] = { lat: s.lat, lon: s.lon, n: 0 }; REG_CITIES[s.city].n++; });
function nearestRegCity(lat, lon) {
  let best = null, bd = 1e9;
  Object.keys(REG_CITIES).forEach(c => {
    const d = distKm({ lat, lon }, { lat: REG_CITIES[c].lat, lon: REG_CITIES[c].lon });
    if (d < bd) { bd = d; best = c; }
  });
  return { city: best, d: bd };
}
function regMap(h) {
  const x = PX(REG.lon), y = PY(REG.lat);
  return `
  <div class="mapbox" id="regMapWrap" style="height:${h || 330}px">
    <svg class="map-svg map-pick" id="regMap" viewBox="${EG_VIEW}" preserveAspectRatio="xMidYMid meet" style="height:${h || 330}px">
      <defs><linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7F6F6"/><stop offset="1" stop-color="#EDEBEB"/></linearGradient></defs>
      <rect x="0" y="0" width="780" height="700" fill="#EDEBEB"/>
      <path class="eg-land" fill="url(#gReg)" d="${line(EG_COAST)} Z"/>
      <path class="nile" d="${line(EG_NILE)}"/>
      ${Object.keys(REG_CITIES).map(c => `<g class="pin" data-regcity="${esc(c)}">
        <circle cx="${PX(REG_CITIES[c].lon)}" cy="${PY(REG_CITIES[c].lat)}" r="4" fill="${c === REG.city ? '#800020' : '#8D8888'}"/>
        ${c === REG.city || REG_CITIES[c].n > 2 ? `<text class="lbl" x="${PX(REG_CITIES[c].lon) + 7}" y="${PY(REG_CITIES[c].lat) + 4}" font-size="10.5">${esc(c)}</text>` : ''}
      </g>`).join('')}
      <g id="regPin">
        <circle cx="${x}" cy="${y}" r="17" fill="#800020" opacity=".18"/>
        <circle cx="${x}" cy="${y}" r="8" fill="#800020" stroke="#fff" stroke-width="2.6"/>
        <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8" fill="#fff" font-weight="800">🏪</text>
      </g>
    </svg>
    <div class="map-tools"><button type="button" id="regMapMe" title="استخدم موقعي">📍</button><button type="button" id="regMapReset" title="إعادة الضبط">⟳</button></div>
    <div class="map-legend"><span class="row gap6"><i class="dot" style="background:#800020"></i> موقع متجرك</span><span class="tiny">اضغط على أي مكان داخل مصر لتحديد موقع المتجر بدقة</span></div>
    <div id="regMapPop"></div>
  </div>`;
}

/* ------------------------- 6. معاينة الكارت الحيّ ------------------------- */
function regPreview() {
  const cat = catOf(REG.cats[0] || 'electronics');
  const prods = REG.products.filter(p => p.name && p.price);
  const minP = prods.length ? Math.min.apply(null, prods.map(p => +p.price)) : 0;
  const nearest = nearestRegCity(REG.lat, REG.lon);
  const d = nearest.d;
  return `
  <div class="card pad" id="regPreview">
    <div class="between mb10"><div class="b sm">👁️ معاينة مباشرة لصفحتك</div><span class="badge ink">تتحدّث أثناء الكتابة</span></div>
    <div class="rel">
      <div class="thumb lg" style="position:absolute;inset-inline-start:0;top:0;font-size:34px">${esc(REG.logoEmoji || cat.em)}</div>
      <div style="padding-inline-start:88px">
        <div class="b" style="font-size:15px">${esc(REG.name || 'اسم المتجر')} ${REG.docs.commercialReg ? '<span class="vf">✔️</span>' : ''}</div>
        <div class="tiny muted">${esc(REG.area || 'المنطقة')} — ${esc(REG.city || 'المحافظة')}</div>
        <div class="tiny muted mt6">${cat.em} ${cat.ar}${REG.cats.length > 1 ? ' + ' + (REG.cats.length - 1) + ' أقسام' : ''}</div>
      </div>
    </div>
    <div class="row wrapx gap6 mt10">
      <span class="badge ${Object.keys(REG.hours).some(k => !REG.hours[k].closed) ? 'ok' : 'warn'}">${Object.keys(REG.hours).some(k => !REG.hours[k].closed) ? 'مواعيد محددة' : 'المواعيد ناقصة'}</span>
      <span class="badge ${REG.delivery ? 'p' : 'ink'}">${REG.delivery ? 'توصيل ' + (REG.deliveryRadius || '؟') + ' كم' : 'استلام من الفرع'}</span>
      <span class="badge ink">${prods.length} منتجًا</span>
      ${prods.length ? `<span class="badge acc">يبدأ من ${egp(minP)}</span>` : ''}
    </div>
    <div class="tiny muted mt10">📍 ${kmTxt(d)} من ${esc(nearest.city || 'أقرب مدينة')} · ${REG.phone ? '☎️ ' + esc(REG.phone) : 'لم يُضف هاتف بعد'}</div>
    ${REG.desc ? `<p class="tiny muted mt6" style="border-top:1px dashed var(--line);padding-top:8px">${esc(REG.desc.slice(0, 130))}${REG.desc.length > 130 ? '…' : ''}</p>` : ''}
  </div>`;
}

/* ------------------------- 7. مؤشر الاكتمال ------------------------- */
function regMeter() {
  const c = regCompleteness();
  const color = c.pct >= 80 ? 'var(--ok)' : c.pct >= 50 ? 'var(--warn)' : 'var(--danger)';
  return `
  <div class="card pad">
    <div class="between mb6"><div class="b sm">📋 اكتمال بيانات المحل</div><span class="b num" style="color:${color}">${c.pct}%</span></div>
    <div class="progress"><i style="width:${c.pct}%;background:${color}"></i></div>
    <div class="tiny muted mt10">${c.pct >= 90 ? 'ممتاز! بياناتك كاملة وستظهر بعلامة «بيانات محدثة».'
      : c.pct >= 60 ? 'جاهزة للنشر — وأكمل الناقص لتحصل على ترتيب أفضل وشارة التوثيق ✔️.'
        : 'أكمل الحقول الأساسية حتى تظهر صفحتك بالشكل الأمثل في نتائج البحث.'}</div>
    ${c.missing.length ? `<hr class="sep">
      <div class="tiny b mb6">ناقص (${c.missing.length}):</div>
      <div class="chips">${c.missing.slice(0, 9).map(m => `<span class="badge warn">${esc(m.label)}</span>`).join('')}</div>
      <button class="btn soft block sm2 mt10" data-reggoto="${c.missing[0].key}">أكمل: ${esc(c.missing[0].label)}</button>` : `<div class="insight mt10"><span class="ic">🏆</span><div class="tiny">بيانات المتجر مكتملة 100% — ستظهر أولًا في الترتيب الذكي.</div></div>`}
  </div>`;
}
const REG_FIELD_STEP = {
  name: 1, nameOnSign: 1, cats: 1, desc: 1, founded: 1, sizeM2: 1, commercialReg: 1,
  area: 2, street: 2, landmark: 2, gmapsUrl: 2,
  branches: 3, delivery: 3, zones: 3,
  phone: 4, whatsapp: 4, social: 4, contactPerson: 4, priceManager: 4, hours: 4,
  pay: 5, svc: 5,
  products: 6, products5: 6,
  photos: 7, logo: 7, docs: 7
};

/* ------------------------- 8. الصفحة ------------------------- */
function addStorePage() {
  /* وضع التعديل: استكمال بيانات متجر موجود */
  const editId = APP.route.p.edit;
  if (editId && REG.edit !== editId) regFromStore(editId);
  const step = regStep();
  REG.step = step;
  const c = regCompleteness();

  const STEPS = [
    ['1', 'هوية المتجر والنشاط', '🏬'], ['2', 'الموقع والعنوان بالتفصيل', '📍'], ['3', 'الفروع والتوصيل', '🚚'],
    ['4', 'التواصل ومواعيد العمل', '☎️'], ['5', 'الدفع والخدمات', '💳'], ['6', 'البضاعة والمنتجات', '📦'],
    ['7', 'الصور والمستندات', '🖼️'], ['8', 'المراجعة والنشر', '🚀']
  ];

  return shell('addstore', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div>
        <div class="row wrapx gap6 mb6"><span class="badge p">تسجيل المحلات</span><span class="badge ok">مجاني بالكامل</span><span class="badge ink">⏱️ 4-6 دقائق</span></div>
        <h1 style="font-size:26px">${REG.edit ? 'استكمال بيانات ' + esc(REG.name) : 'سجّل محلّك في سوقي'}</h1>
        <p>املأ بيانات المحل والموقع والبضاعة مرة واحدة — وبعدها تحديث الأسعار بياخد دقيقة أسبوعيًا. العملاء هيوصلوا لك وهم عارفين المنتج والسعر والمسافة.</p>
      </div>
      <div class="row gap6">
        <button class="btn sm2" id="regFillDemo">🎲 املأ البيانات تلقائيًا (تجربة)</button>
        <button class="btn sm2" id="regClear">🗑️ مسح</button>
      </div>
    </div>

    <!-- شريط الخطوات -->
    <div class="card pad mb14">
      <div class="steps-vert">
        ${STEPS.map(([n, t, em], i) => {
    const st = i + 1;
    const on = st === step, done = st < step;
    return `<a class="stepi ${on ? 'on' : ''} ${done ? 'done' : ''}" href="#/addstore?step=${st}${REG.edit ? '&edit=' + REG.edit : ''}">
          <span class="num">${done ? '✓' : n}</span><span>${em} ${t}</span></a>`;
  }).join('')}
      </div>
      <div class="between wrapx mt14">
        <span class="tiny muted">بياناتك تُحفظ تلقائيًا كمسودة على جهازك — تقدر ترجع تكمل في أي وقت.</span>
        <span class="badge ${c.pct >= 80 ? 'ok' : c.pct >= 50 ? 'warn' : 'bad'}">اكتمال البيانات ${c.pct}%</span>
      </div>
    </div>

    <div class="grid g-side">
      <!-- الاستمارة -->
      <div class="card pad">
        ${step === 1 ? regStep1() : ''}
        ${step === 2 ? regStep2() : ''}
        ${step === 3 ? regStep3() : ''}
        ${step === 4 ? regStep4() : ''}
        ${step === 5 ? regStep5() : ''}
        ${step === 6 ? regStep6() : ''}
        ${step === 7 ? regStep7() : ''}
        ${step === 8 ? regStep8() : ''}

        <hr class="sep">
        <div class="row between wrapx">
          <button class="btn" id="regPrev" ${step === 1 ? 'disabled' : ''}>→ الخطوة السابقة</button>
          <span class="tiny muted">الخطوة ${step} من 8</span>
          ${step < 8
      ? `<button class="btn primary" id="regNext">الخطوة التالية ←</button>`
      : `<button class="btn primary lg" id="regSubmit">🚀 إرسال ونشر المتجر</button>`}
        </div>
        <div id="regErr" class="mt10"></div>
      </div>

      <!-- الشريط الجانبي -->
      <aside>
        <div class="mb14" id="regMeterHost">${regMeter()}</div>
        <div class="mb14" id="regPreviewHost">${regPreview()}</div>
        <div class="card pad mb14">
          <div class="b sm mb10">💡 ليش البيانات دي مهمة؟</div>
          <div class="info-list">
            <div class="info-item"><span class="ic">🔎</span><span class="tiny">المنتج والسعر = ظهورك في نتائج البحث ومقارنة الأسعار.</span></div>
            <div class="info-item"><span class="ic">📍</span><span class="tiny">الموقع الدقيق = دخولك في «المتاجر القريبة مني» وترتيب المسافة.</span></div>
            <div class="info-item"><span class="ic">🕐</span><span class="tiny">مواعيد العمل = فلتر «مفتوح الآن» وحالة متجرك أمام العميل.</span></div>
            <div class="info-item"><span class="ic">💬</span><span class="tiny">الواتساب والهاتف = العملاء يتواصلوا معاك مباشرة بدون وسيط.</span></div>
            <div class="info-item"><span class="ic">✔️</span><span class="tiny">المستندات = شارة «متجر موثق» وثقة أعلى بنسبة تصل لثلاثة أضعاف.</span></div>
          </div>
        </div>
        <div class="card pad">
          <div class="between mb10"><div class="b sm">🆕 متاجر انضمّت حديثًا</div><a class="tiny" href="#/stores">الكل</a></div>
          ${DB.stores.slice(-4).reverse().map(s => `<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line-2)">
            <div><div class="sm"><a href="#/store/${s.id}">${esc(s.name)}</a> ${s.verified ? '✔️' : ''}</div>
            <div class="tiny muted">${catOf(s.cats[0]).ar} · ${esc(s.city)}</div></div>
            <span class="badge ${s.plan === 'pro' ? 'acc' : 'ink'}">${s.plan === 'pro' ? 'احترافي' : 'مجاني'}</span></div>`).join('')}
        </div>
      </aside>
    </div>
  </div>`);
}

/* ---------- الخطوة 1: الهوية ---------- */
function regStep1() {
  return `
  <h3 style="font-size:17px">🏬 هوية المتجر والنشاط</h3>
  <p class="tiny muted mt6">البيانات الأساسية اللي هتظهر للعميل في صفحتك وفي نتائج البحث.</p>
  <div class="grid g-2 mt14">
    ${fInput('اسم المتجر *', 'name', { req: true, ph: 'مثال: نيل إلكترونيكس' })}
    ${fInput('الاسم كما هو على اللافتة', 'nameOnSign', { ph: 'نفس الاسم المكتوب في اللافتة (للتوثيق)' })}
  </div>
  <div class="grid g-3 mt10">
    ${fSelect('الكيان القانوني', 'legalType', LEGAL_TYPES)}
    ${fInput('سنة التأسيس', 'founded', { num: true, ph: '2015' })}
    ${fSelect('عدد الموظفين', 'employees', EMPLOYEES)}
  </div>
  <div class="grid g-2 mt10">
    ${fInput('مساحة المتجر (متر مربع)', 'sizeM2', { num: true, ph: '80' })}
    ${fSelect('الباركينج / الموقف', 'parking', PARKING)}
  </div>
  <div class="mt14">${fChips('أقسام النشاط * (اختر كل ما تبيعه)', 'cats', CATS.map(c => [c.id, c.em + ' ' + c.ar]), { req: true })}</div>
  <div class="mt10">${fChips('جمهورك المستهدف', 'audience', AUDIENCE)}</div>
  <div class="mt14">
    ${fArea('وصف المتجر', 'desc', { rows: 3, ph: 'اكتب بالعامية: بتخصص في إيه؟ الماركات؟ الخدمات؟', hint: 'الوصف الجيد يرفع نسبة التواصل — سطرين كفاية.' })}
    <button class="btn soft sm2 mt6" id="regDescSuggest">✨ اقترح وصفًا من بياناتك</button>
  </div>
  <hr class="sep">
  <div class="b sm mb10">بيانات رسمية (للتوثيق فقط — لا تُنشر علنًا)</div>
  <div class="grid g-2">
    ${fInput('رقم السجل التجاري', 'commercialReg', { num: true, ph: 'اختياري — يسرّع التوثيق ✔️' })}
    ${fInput('رقم البطاقة الضريبية', 'taxId', { num: true, ph: 'اختياري — يسرّع التوثيق ✔️' })}
  </div>
  <div class="row wrapx gap14 mt14">
    ${fSwitch('بيع بسعر الجملة للتجار', 'wholesale')}
    ${fSwitch('السعر شامل ضريبة القيمة المضافة', 'vatIncluded')}
    ${fSwitch('يقع المتجر على شارع رئيسي (سهل الوصول)', 'onMainStreet')}
    ${fSwitch('قريب من محطة مترو / مواصلات', 'nearMetro')}
  </div>
  ${fInput('كلمات أو تخصصات إضافية', 'tagsRaw', { ph: 'اكتب كلمة واضغط Enter (مثال: قطع غيار أصلية، استيراد، تركيب)' })}
  <div class="chips mt6">${(REG.tags || []).map(t => `<span class="badge p">${esc(t)} <button type="button" class="x" style="width:auto;height:auto;padding:0 3px" data-regtagdel="${esc(t)}">✕</button></span>`).join('') || '<span class="tiny muted">لا توجد كلمات إضافية</span>'}</div>
  <div class="chips mt10">${TAGS_SUGG.map(t => `<button type="button" class="chip" data-regtag="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>`;
}

/* ---------- الخطوة 2: الموقع ---------- */
function regStep2() {
  const nearest = nearestRegCity(REG.lat, REG.lon);
  return `
  <h3 style="font-size:17px">📍 الموقع والعنوان بالتفصيل</h3>
  <p class="tiny muted mt6">الموقع الدقيق هو اللي يظهر العميل المسافة و«أقرب متجر» — اضغط على الخريطة لتحديد باب المحل.</p>
  <div class="grid g-2 mt14">
    ${fSelect('المحافظة *', 'city', Object.keys(REG_CITIES).concat(['أخرى']), { req: true })}
    ${fInput('المدينة / المركز', 'district', { ph: 'مثال: الدقي، طنطا، سموحة' })}
  </div>
  <div class="grid g-2 mt10">
    ${fInput('الحي / المنطقة *', 'area', { req: true, ph: 'مثال: المهندسين' })}
    ${fInput('علامة مميزة قريبة', 'landmark', { ph: 'مثال: بجوار صيدلية العزبي' })}
  </div>
  <div class="grid g-3 mt10">
    ${fInput('الشارع', 'street', { ph: 'شارع جامعة الدول' })}
    ${fInput('رقم العقار', 'buildingNo', { num: true, ph: '12' })}
    ${fInput('الدور / الوحدة', 'floor', { ph: 'الأرضي - محل 3' })}
  </div>
  <div class="mt14">${regMap(320)}</div>
  <div class="filters mt10">
    <span class="tiny muted">مدن سريعة:</span>
    ${Object.keys(REG_CITIES).filter(c => REG_CITIES[c].n >= 2).slice(0, 12).map(c => `<button type="button" class="chip ${REG.city === c ? 'p' : ''}" data-regcityjump="${esc(c)}">${esc(c)}</button>`).join('')}
  </div>
  <div class="grid g-3 mt14">
    ${fInput('خط العرض (Latitude)', 'lat', { num: true, hint: 'يُضبط تلقائيًا من الخريطة' })}
    ${fInput('خط الطول (Longitude)', 'lon', { num: true, hint: 'يُضبط تلقائيًا من الخريطة' })}
    <div class="field"><label>أقرب مدينة للنموذج</label><div class="input" style="background:var(--surface-2)"><span id="regNearest">${esc(nearest.city || '—')} (≈ ${kmTxt(nearest.d)})</span></div></div>
  </div>
  ${fInput('رابط الموقع على خرائط جوجل', 'gmapsUrl', { ph: 'https://maps.app.goo.gl/...', hint: 'انسخ الرابط من تطبيق الخرائط عند الوقوف أمام المحل.' })}
  <div class="insight info mt14"><span class="ic">🛰️</span><div class="tiny">نصيحة ميدانية: قف عند باب المحل واضغط «📍 موقعي»، ثم انسخ رابط جوجل ماب — بكده العميل يوصل لك بدقة حتى لو الشارع متشابه.</div></div>`;
}

/* ---------- الخطوة 3: الفروع والتوصيل ---------- */
function regStep3() {
  const z = REG.zones || [];
  const nearAreas = DB.stores.filter(s => s.city === REG.city).map(s => s.area).filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);
  return `
  <h3 style="font-size:17px">🚚 الفروع والتوصيل</h3>
  <p class="tiny muted mt6">لو عندك أكثر من فرع أضِفهم، وحدّد نطاق التوصيل — العميل بيحب يعرف يوصل له ولا لأ.</p>
  <div class="between wrapx mt14 mb10">
    <div class="b sm">الفروع (${REG.branches.length})</div>
    <button class="btn sm2" id="regAddBranch">➕ إضافة فرع</button>
  </div>
  ${REG.branches.length ? `<div class="tbl-wrap"><table class="tbl" style="min-width:560px">
    <thead><tr><th>اسم الفرع</th><th>المحافظة</th><th>المنطقة</th><th>هاتف الفرع</th><th>العنوان</th><th></th></tr></thead>
    <tbody>${REG.branches.map((b, i) => `<tr>
      <td><input class="input" data-regbr="${i}" data-f="name" value="${esc(b.name || '')}" placeholder="فرع المهندسين"></td>
      <td><input class="input" data-regbr="${i}" data-f="city" value="${esc(b.city || '')}" placeholder="${esc(REG.city)}"></td>
      <td><input class="input" data-regbr="${i}" data-f="area" value="${esc(b.area || '')}" placeholder="المنطقة"></td>
      <td><input class="input num" data-regbr="${i}" data-f="phone" value="${esc(b.phone || '')}" placeholder="01xxxxxxxxx"></td>
      <td><input class="input" data-regbr="${i}" data-f="address" value="${esc(b.address || '')}" placeholder="الشارع ورقم العقار"></td>
      <td><button type="button" class="btn sm2" data-regbrdel="${i}">🗑️</button></td>
    </tr>`).join('')}</tbody></table></div>
    <p class="tiny muted mt6">كل فرع يظهر كموقع منفصل على الخريطة، وله مواعيده وأسعاره الخاصة لو اختلفت.</p>`
      : '<div class="card pad center" style="background:var(--surface-2)"><div class="tiny muted">لا فروع إضافية — المتجر في الموقع الأساسي فقط.</div></div>'}
  <hr class="sep">
  <div class="row wrapx gap14">
    ${fSwitch('توفّر خدمة التوصيل', 'delivery')}
    ${fSwitch('استلام من الفرع (Pick-up)', 'pickup')}
  </div>
  <div class="grid g-3 mt10">
    ${fInput('نطاق التوصيل (كم)', 'deliveryRadius', { num: true, ph: '5' })}
    ${fInput('رسوم التوصيل (ج.م)', 'deliveryFee', { num: true, ph: 'اتركها فاضية لو مجاني' })}
    ${fSelect('وقت التجهيز', 'prepTime', PREP)}
  </div>
  ${fInput('الحد الأدنى للطلب (ج.م)', 'minOrder', { num: true, ph: 'مثال: 300' })}
  <div class="mt14">
    <label class="b sm">مناطق التوصيل <span class="tiny muted">(اضغط لإضافتها)</span></label>
    <div class="chips mt6">
      ${nearAreas.map(a => `<button type="button" class="chip ${z.indexOf(a) >= 0 ? 'p' : ''}" data-regzone="${esc(a)}">${z.indexOf(a) >= 0 ? '✓ ' : '+ '}${esc(a)}</button>`).join('')}
    </div>
    <div class="chips mt6">${z.length ? z.map(a => `<span class="badge p">${esc(a)} <button type="button" class="x" style="width:auto;height:auto;padding:0 3px" data-regzonedel="${esc(a)}">✕</button></span>`).join('') : '<span class="tiny muted">لم تُحدد مناطق توصيل</span>'}</div>
  </div>
  <div class="insight mt14"><span class="ic">📦</span><div class="tiny">المتاجر اللي فيها توصيل داخل النطاق بتظهر للعميل كخيار أول في صفحات المقارنة، خصوصًا للمنتجات الثقيلة (أجهزة منزلية، شاشات).</div></div>`;
}

/* ---------- الخطوة 4: التواصل ومواعيد العمل ---------- */
function regStep4() {
  return `
  <h3 style="font-size:17px">☎️ التواصل ومواعيد العمل</h3>
  <p class="tiny muted mt6">هنا يتحدد إزاي العميل يوصل لك، وفلتر «مفتوح الآن» في نتائج البحث.</p>
  <div class="grid g-2 mt14">
    ${fInput('رقم الهاتف * (يُتحقق منه برسالة)', 'phone', { req: true, num: true, ph: '01xxxxxxxxx' })}
    ${fInput('هاتف ثانٍ', 'phone2', { num: true, ph: 'اختياري' })}
  </div>
  <div class="grid g-2 mt10">
    ${fInput('رقم واتساب', 'whatsapp', { num: true, ph: 'نفس الهاتف لو لم تختلف', hint: 'الواتساب هو أهم وسيلة تواصل — 6 من كل 10 عملاء بيستخدموه.' })}
    ${fInput('البريد الإلكتروني', 'email', { ph: 'shop@example.com' })}
  </div>
  <div class="grid g-4 mt10">
    ${fInput('الموقع الإلكتروني', 'website', { ph: 'www.example.com' })}
    ${fInput('فيسبوك', 'facebook', { ph: 'اسم الصفحة' })}
    ${fInput('إنستجرام', 'instagram', { ph: '@account' })}
    ${fInput('تيك توك', 'tiktok', { ph: '@account' })}
  </div>
  <hr class="sep">
  <div class="b sm mb10">🕐 مواعيد العمل الأسبوعية</div>
  <div class="hrs-grid">
    ${AR_WEB.map((day, i) => {
    const h = REG.hours[i] || { open: '10:00', close: '23:00', closed: false };
    return `<div class="hrs-row ${i === new Date().getDay() ? 'today' : ''}">
        <span class="dname">${day}</span>
        <label class="row gap6"><input type="checkbox" data-reghr="${i}" data-f="closed" ${h.closed ? 'checked' : ''}> <span class="tiny">مغلق</span></label>
        <select class="select" data-reghr="${i}" data-f="open" ${h.closed ? 'disabled' : ''}>${HRS.map(t => `<option ${h.open === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <span class="tiny muted">إلى</span>
        <select class="select" data-reghr="${i}" data-f="close" ${h.closed ? 'disabled' : ''}>${HRS.map(t => `<option ${h.close === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input class="input" data-reghr="${i}" data-f="note" value="${esc(h.note || '')}" placeholder="ملاحظة (اختياري)">
      </div>`;
  }).join('')}
  </div>
  <div class="row wrapx gap6 mt10">
    <button class="btn sm2" id="regHrsAll">تطبيق مواعيد يوم واحد على الكل</button>
    <button class="btn sm2" id="regHrsFri">ضبط الجمعة (14:00 — 23:00)</button>
  </div>
  <div class="mt10">${fArea('ملاحظات المواعيد (رمضان / العيد / إجازات)', 'hoursNotes', { rows: 2, ph: 'مثال: في رمضان من 11 ص إلى 3 فجرًا.' })}</div>
  ${fSelect('متوسط زمن الرد على الواتساب', 'replyTime', REPLYT)}
  <hr class="sep">
  <div class="b sm mb10">👤 المسؤولون (مهم للاستمرارية)</div>
  <div class="grid g-2">
    ${fInput('اسم مسؤول التواصل', 'contactPerson', { ph: 'مثال: أحمد' })}
    ${fSelect('صفته', 'contactRole', CONTACT_ROLES)}
  </div>
  <div class="grid g-2 mt10">
    ${fInput('مسؤول تحديث الأسعار — الاسم *', 'priceManager', { ph: 'نفس صاحب المحل أو موظف محدد' })}
    ${fInput('رقم واتساب مسؤول الأسعار *', 'priceManagerPhone', { num: true, ph: '01xxxxxxxxx' })}
  </div>
  <div class="insight warn mt14"><span class="ic">🔔</span><div class="tiny">مسؤول الأسعار هو اللي بيستقبل تذكير أسبوعي من سوقي لتحديث الأسعار. المتاجر اللي بتحدّث أسعارها بانتظام بتظهر بشارة «بيانات محدثة» وبتاخد ترتيب أفضل في النتائج.</div></div>`;
}

/* ---------- الخطوة 5: الدفع والخدمات ---------- */
function regStep5() {
  const svcAll = Object.values(SVCS).flat().filter((v, i, a) => a.indexOf(v) === i);
  return `
  <h3 style="font-size:17px">💳 طرق الدفع والخدمات</h3>
  <p class="tiny muted mt6">العميل بيسأل: «أقدر أدفع بالكارت؟ فيه تقسيط؟ بتركّبوا؟ بترجّعوا؟» — الجواب هنا بيقلل المكالمات ويزيد الثقة.</p>
  <div class="mt14">${fChips('طرق الدفع المتاحة', 'pay', PAYS, { req: true })}</div>
  <div class="mt14">
    ${fChips('شركات التقسيط المتاحة', 'installments', INSTALLMENT_CO, { hint: 'اتركها فاضية لو مفيش تقسيط.' })}
    ${fSwitch('توفّر تركيب في المنزل', 'install')}
    ${fInput('رسوم التركيب (ج.م)', 'installFee', { num: true, ph: 'اتركها فاضية لو مجاني' })}
  </div>
  <div class="grid g-2 mt10">
    ${fSelect('سياسة الإرجاع / الاستبدال', 'returnDays', RETURN_OPTS)}
    ${fSelect('الضمان الافتراضي للمنتجات', 'warranty', WARRANTY_OPTS)}
  </div>
  <label class="switch mt10">${fSwInput('taxInvoice', !!REG.taxInvoice)} تُصدر فاتورة ضريبية</label>
  <div class="mt14">${fChips('الخدمات التي تقدّمها', 'svc', svcAll.slice(0, 20), { hint: 'اختيار الخدمات يظهر كشارات في صفحتك ويساعد العميل يقرر بسرعة.' })}</div>
  <div class="insight mt14"><span class="ic">🧾</span><div class="tiny">كل خدمة بتظهر على صفحتك: «ضمان سنة»، «تركيب مجاني»، «استبدال المقاس»، «توصيل نفس اليوم»… وبتفرق جدًا في قرار الشراء للمنتجات غالية السعر.</div></div>`;
}

/* ---------- الخطوة 6: البضاعة ---------- */
function regStep6() {
  const limit = REG.plan === 'pro' ? Infinity : PRODUCT_LIMIT_FREE;
  const t = regGroupTotal();
  const ready = REG.products.filter(p => p.name && p.price).length;
  return `
  <div class="between wrapx">
    <div><h3 style="font-size:17px">📦 البضاعة والمنتجات</h3>
    <p class="tiny muted mt6">أضف منتجاتك بأسعارها — ده قلب المنصة: العميل بيدور على المنتج مش على اسم المحل.</p></div>
    <span class="badge ${ready ? 'ok' : 'warn'}">${ready} منتجًا جاهزًا للنشر${REG.plan === 'pro' ? '' : ' / حد الباقة المجانية ' + PRODUCT_LIMIT_FREE}</span>
  </div>

  <div class="card pad mt14" style="background:var(--surface-2)">
    <div class="b sm mb10">طرق سريعة لإدخال البضاعة</div>
    <div class="grid g-2">
      <div>
        <label class="tiny b">1) أضف منتجات مقترحة من أقسامك (بنقرة)</label>
        <div class="row gap6 mt6">
          <button class="btn sm2" id="regSuggest">➕ إضافة 8-12 منتجًا شائعًا في قسمك</button>
          <button class="btn sm2" id="regAddRow">➕ صف فارغ</button>
        </div>
        <label class="tiny b mt10" style="display:block">2) الصق قائمة من واتساب / مذكرة</label>
        <textarea class="input mt6" id="regPaste" rows="3" placeholder="سماعة JBL Tune 520BT 2590&#10;شاشة سامسونج 24 بوصة 5600&#10;كارت شاشة RTX 4060 19800"></textarea>
        <button class="btn soft sm2 mt6" id="regParsePaste">🧠 تحليل القائمة وإضافتها</button>
      </div>
      <div>
        <label class="tiny b">3) استيراد ملف Excel / CSV</label>
        <div class="row gap6 mt6">
          <label class="btn sm2" style="cursor:pointer">📄 اختر ملف CSV<input type="file" id="regCSV" accept=".csv,.txt" style="display:none"></label>
          <button class="btn sm2" id="regCSVTemplate">⬇️ تحميل القالب</button>
        </div>
        <p class="tiny muted mt6">القالب: <b>الاسم، السعر، السعر قبل الخصم، الماركة، الموديل، الكمية، متوفر، ملاحظات</b></p>
        <div class="insight info mt10"><span class="ic">💡</span><div class="tiny">أسرع طريقة للجرد: صدّر قائمة أسعارك من الكاشير أو اكتبها في إكسل مرة واحدة، واستوردها هنا — وبعدها التحديث الأسبوعي بيكون بتعديل سعر واحد.</div></div>
      </div>
    </div>
  </div>

  <div class="tbl-wrap mt14"><table class="tbl" style="min-width:940px">
    <thead><tr>
      <th>المنتج *</th><th>القسم</th><th>الماركة</th><th>الموديل/SKU</th><th>الحالة</th>
      <th>السعر *</th><th>قبل الخصم</th><th>الكمية</th><th>متوفر</th><th>الضمان</th><th></th>
    </tr></thead>
    <tbody>
      ${(REG.products.length ? REG.products : [regNewProduct()]).map((p, i) => `<tr>
        <td><input class="input" data-regp="${i}" data-f="name" value="${esc(p.name || '')}" placeholder="اسم المنتج كما يُقال في السوق"></td>
        <td><select class="select" data-regp="${i}" data-f="cat">${CATS.map(c => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.em} ${c.ar}</option>`).join('')}</select></td>
        <td><input class="input" data-regp="${i}" data-f="brand" value="${esc(p.brand || '')}" placeholder="Samsung"></td>
        <td><input class="input" data-regp="${i}" data-f="model" value="${esc(p.model || '')}" placeholder="SM-A566"></td>
        <td><select class="select" data-regp="${i}" data-f="condition">${['جديد', 'مستعمل', 'مجدد', 'طلب مسبق'].map(c => `<option ${p.condition === c ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
        <td><input class="input num" data-regp="${i}" data-f="price" value="${esc(p.price || '')}" placeholder="24900"></td>
        <td><input class="input num" data-regp="${i}" data-f="old" value="${esc(p.old || '')}" placeholder="—"></td>
        <td><input class="input num" data-regp="${i}" data-f="qty" value="${esc(p.qty || '')}" placeholder="5" style="width:80px"></td>
        <td><input type="checkbox" data-regp="${i}" data-f="stock" ${p.stock !== false ? 'checked' : ''}></td>
        <td><select class="select" data-regp="${i}" data-f="warranty">${WARRANTY_OPTS.map(w => `<option ${p.warranty === w ? 'selected' : ''}>${w}</option>`).join('')}</select></td>
        <td><button type="button" class="btn sm2" data-regpdel="${i}">🗑️</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>

  <div class="stats mt14" id="regTotals">
    ${statBox('منتجات جاهزة', '<span class="num">' + t.count + '</span>', 'بها اسم وسعر')}
    ${statBox('قيمة المخزون التقديرية', '<span class="num">' + egp(t.sum) + '</span>', 'السعر × الكمية (تقديري)')}
    ${statBox('أكبر نسبة خصم', t.disc ? pct(t.disc) : '—', 'من السعر قبل الخصم')}
    ${statBox('حد الباقة', REG.plan === 'pro' ? 'غير محدود' : PRODUCT_LIMIT_FREE + ' منتجًا', REG.plan === 'pro' ? 'احترافي 💎' : 'مجاني')}
  </div>
  ${ready > limit ? `<div class="insight warn mt10"><span class="ic">💎</span><div class="tiny">تجاوزت حد الباقة المجانية (${PRODUCT_LIMIT_FREE} منتجًا). المنتجات الزائدة تُحفظ كمسودة وتُنشر عند الترقية للباقة الاحترافية (199 ج.م/شهر).</div></div>` : ''}
  <div class="insight mt14"><span class="ic">⚠️</span><div class="tiny">اضبط السعر النهائي بدقة — العميل بيوصل للمحل بناءً على السعر المعروض. أي فرق كبير بين السعر المسجّل وسعر الفرع بياخد بلاغ ويؤثر على مؤشر دقة بياناتك.</div></div>`;
}

/* ---------- الخطوة 7: الصور والمستندات ---------- */
function regStep7() {
  const mediaItems = [['logo', 'الشعار / اللوجو', '🏷️'], ['facade', 'واجهة المحل', '🏬'], ['inside', 'صور من داخل المتجر', '🛍️'], ['shelf', 'رفوف المنتجات', '📦'], ['products', 'صور المنتجات', '📷']];
  const docsItems = [['commercialReg', 'السجل التجاري', 'أو البطاقة الضريبية'], ['tax', 'البطاقة الضريبية', 'لكتابة الفاتورة الضريبية'], ['signPhoto', 'صورة اللافتة بالاسم', 'للتأكد من مطابقة الاسم'], ['phoneProof', 'إثبات ملكية رقم الهاتف', 'كود تحقق يُرسل على الرقم'], ['idCard', 'بطاقة الرقم القومي للمالك', 'اختياري — يسرّع التوثيق']];
  return `
  <h3 style="font-size:17px">🖼️ الصور والمستندات</h3>
  <p class="tiny muted mt6">الصور ترفع نسبة التواصل بشكل كبير، والمستندات بتخليك «متجر موثق ✔️».</p>
  <div class="grid g-2 mt14">
    <div>
      <div class="b sm mb10">صور المتجر</div>
      <div class="gallery">
        ${mediaItems.map(([k, l, em]) => `<button type="button" class="g" data-regmedia="${k}" style="${REG.media[k] ? 'border-color:var(--p);background:var(--p-s)' : ''}">
          <div style="text-align:center"><div style="font-size:26px">${REG.media[k] ? '✅' : em}</div>
          <div class="tiny mt6" style="font-weight:700">${l}</div></div></button>`).join('')}
      </div>
      <label class="switch mt10">${fSwInput('allowPhotos', REG.allowPhotos)} أسمح لسوقي بعرض الصور على صفحة المتجر</label>
      ${fInput('رابط فيديو للمتجر (يوتيوب / ريلز)', 'videoUrl', { ph: 'اختياري — رفع نسبة الثقة' })}
      <div class="field mt10"><label>رمز أو شعار مؤقت (اختر)</label>
        <div class="chips">${['🏪', '📱', '💻', '👕', '👟', '🏠', '💄', '🛒', '📚', '🔧', '🍔', '💊', '🚗', '🏋️', '🎧', '🖥️'].map(e => `<button type="button" class="chip ${REG.logoEmoji === e ? 'p' : ''}" data-regemoji="${e}" style="font-size:18px">${e}</button>`).join('')}</div>
        <span class="tiny muted">في النسخة النهائية يوصل فريق التصوير المجاني لأول 100 متجر لتصوير احترافي.</span>
      </div>
    </div>
    <div>
      <div class="b sm mb10">المستندات والتوثيق</div>
      <div class="info-list">
        ${docsItems.map(([k, l, hint]) => `<label class="docrow" style="display:flex;gap:10px;align-items:flex-start;border:1px solid ${REG.docs[k] ? 'var(--p)' : 'var(--line)'};background:${REG.docs[k] ? 'var(--p-s2)' : '#fff'};border-radius:12px;padding:11px;cursor:pointer">
          <input type="checkbox" data-regdoc="${k}" ${REG.docs[k] ? 'checked' : ''} style="margin-top:3px">
          <span><span class="b sm">${l}</span><span class="tiny muted" style="display:block">${hint}</span></span>
        </label>`).join('')}
      </div>
      <div class="insight info mt14"><span class="ic">🔒</span><div class="tiny">المستندات تُستخدم للتحقق فقط ولا تظهر للعملاء مطلقًا. تُخزَّن مشفّرة وتُحذف نهائيًا لو أوقفت التعاون (طبقًا لقانون حماية البيانات 151/2020).</div></div>
      <div class="grid g-2 mt14">
        ${kpiCard('مستندات مكتملة', Object.values(REG.docs).filter(Boolean).length + ' / ' + Object.keys(REG.docs).length, 'تكتمل بها شارة التوثيق ✔️')}
        ${kpiCard('صور مرفوعة', Object.keys(REG.media).filter(k => k !== 'video' && REG.media[k]).length + ' / 5', 'المرئيات ترفع التواصل ×2')}
      </div>
    </div>
  </div>`;
}

/* ---------- الخطوة 8: المراجعة ---------- */
function regStep8() {
  const c = regCompleteness();
  const prods = REG.products.filter(p => p.name && p.price);
  const hrs = AR_WEB.map((d, i) => {
    const h = REG.hours[i];
    return h && !h.closed ? `${d}: ${h.open} — ${h.close}` : `${d}: مغلق`;
  }).join(' · ');
  const cats = REG.cats.map(x => catOf(x).ar).join('، ');
  return `
  <h3 style="font-size:17px">${REG.edit ? '💾 مراجعة التعديلات وحفظها' : '🚀 مراجعة البيانات والموافقة على النشر'}</h3>
  <p class="tiny muted mt6">${REG.edit ? 'أي تعديل تحفظه يظهر فورًا على صفحتك العامة وفي نتائج البحث.' : 'راجع بياناتك — ثم اضغط إرسال. المراجعة بتاخد دقائق في النموذج التجريبي، و24 ساعة في النسخة الحقيقية.'}</p>

  <div class="grid g-2 mt14">
    <div class="panel">
      <div class="between"><div class="b" style="font-size:16px">${esc(REG.name || 'اسم المتجر')}</div><span class="badge ${c.pct >= 80 ? 'ok' : 'warn'}">${c.pct}% مكتمل</span></div>
      <div class="tiny muted mt6">${cats || 'لم تُحدد أقسام'}</div>
      <hr class="sep">
      <div class="info-list">
        <div class="info-item"><span class="ic">🏬</span><span class="sm">${esc(REG.legalType)}${REG.founded ? ' · تأسس ' + esc(REG.founded) : ''}${REG.sizeM2 ? ' · ' + esc(REG.sizeM2) + ' م²' : ''}${REG.employees ? ' · ' + esc(REG.employees) + ' موظفًا' : ''}</span></div>
        <div class="info-item"><span class="ic">📍</span><span class="sm">${esc(REG.street || 'الشارع')}${REG.buildingNo ? '، رقم ' + esc(REG.buildingNo) : ''} — ${esc(REG.area || 'المنطقة')}، ${esc(REG.city)}${REG.landmark ? ` <span class="tiny muted">(${esc(REG.landmark)})</span>` : ''}</span></div>
        <div class="info-item"><span class="ic">🛰️</span><span class="sm num">${(+REG.lat).toFixed(5)}, ${(+REG.lon).toFixed(5)} ${REG.gmapsUrl ? '· <span class="badge ok">رابط الخرائط ✓</span>' : ''}</span></div>
        <div class="info-item"><span class="ic">☎️</span><span class="sm num">${esc(REG.phone || '—')}${REG.phone2 ? ' / ' + esc(REG.phone2) : ''} · واتساب: ${esc(REG.whatsapp || REG.phone || '—')}</span></div>
        <div class="info-item"><span class="ic">🕐</span><span class="sm">${hrs}</span></div>
        <div class="info-item"><span class="ic">🚚</span><span class="sm">${REG.delivery ? 'توصيل داخل ' + esc(REG.deliveryRadius || '؟') + ' كم' + (REG.deliveryFee ? ' (رسوم ' + esc(REG.deliveryFee) + ' ج.م)' : ' — مجاني') : 'بدون توصيل'}${REG.pickup ? ' · استلام من الفرع متاح' : ''}</span></div>
        <div class="info-item"><span class="ic">💳</span><span class="sm">${REG.pay.join(' · ') || '—'}${REG.installments.length ? ' · تقسيط: ' + REG.installments.join(', ') : ''}</span></div>
        <div class="info-item"><span class="ic">🧰</span><span class="sm">${REG.svc.slice(0, 6).join(' · ') || '—'}</span></div>
        <div class="info-item"><span class="ic">👤</span><span class="sm">مسؤول الأسعار: ${esc(REG.priceManager || '—')} ${REG.priceManagerPhone ? '(' + esc(REG.priceManagerPhone) + ')' : ''}</span></div>
        <div class="info-item"><span class="ic">📦</span><span class="sm">${prods.length} منتجًا جاهزًا للنشر${REG.branches.length ? ' · ' + REG.branches.length + ' فرعًا إضافيًا' : ''}</span></div>
        <div class="info-item"><span class="ic">🖼️</span><span class="sm">صور: ${Object.keys(REG.media).filter(k => k !== 'video' && REG.media[k]).length}/5 · مستندات: ${Object.values(REG.docs).filter(Boolean).length}/5</span></div>
      </div>
    </div>

    <div>
      ${prods.length ? `<div class="card pad mb14">
        <div class="b sm mb10">📦 أول منتجاتك (${prods.length})</div>
        <div style="max-height:230px;overflow:auto">
          ${prods.slice(0, 12).map(p => `<div class="between" style="padding:6px 0;border-bottom:1px solid var(--line-2)">
            <div><div class="sm">${esc(p.name)}</div><div class="tiny muted">${esc(p.brand || '—')} · ${catOf(p.cat).ar}</div></div>
            <div class="num sm b">${egp(+p.price)}${p.old ? ` <span class="tiny" style="color:var(--acc)">خصم ${pct(Math.round((1 - p.price / p.old) * 100))}</span>` : ''}</div>
          </div>`).join('')}
        </div>
        ${prods.length > 12 ? `<p class="tiny muted mt6">+${prods.length - 12} منتجًا آخر…</p>` : ''}
      </div>` : ''}

      <div class="card pad mb14">
        <div class="b sm mb10">💰 اختر باقتك</div>
        <div class="grid" style="gap:8px">
          ${[['free', 'المجاني — 0 ج.م', 'صفحة متجر كاملة + 30 منتجًا + ظهور في البحث + معلومات التواصل'],
      ['pro', 'الاحترافي — 199 ج.م/شهر', 'منتجات غير محدودة + إحصائيات + عروض متقدمة + أولوية ظهور + تقارير الأسعار']]
      .map(([k, t, d]) => `<button type="button" class="card pad" style="text-align:right;cursor:pointer;border-color:${REG.plan === k ? 'var(--p)' : 'var(--line)'}" data-regplan="${k}">
            <div class="row between"><span class="b">${t}</span>${REG.plan === k ? '<span class="badge p">مختار</span>' : ''}</div>
            <div class="tiny muted mt6">${d}</div></button>`).join('')}
        </div>
        <div class="mt10">
          <label class="switch">${fSwInput('wantAds', !!REG.wantAds)} أرغب في مساحة إعلانية (تظهر بوسم «إعلان»)</label>
          <label class="switch">${fSwInput('wantFeatured', !!REG.wantFeatured)} أرغب في إبراز عرض في صفحة العروض</label>
          <label class="switch">${fSwInput('notifyWa', REG.notifyWa !== false)} إشعار واتساب فوري لما عميل يسأل عن منتج من صفحتي</label>
          <label class="switch">${fSwInput('notifyWeekly', REG.notifyWeekly !== false)} تقرير أسبوعي بالزيارات وضغطات واتساب</label>
        </div>
      </div>

      <div class="card pad">
        <div class="b sm mb10">✅ الإقرارات</div>
        ${REG.edit ? '<div class="insight ok mb10"><span class="ic">✔️</span><div class="tiny">أنت موافق على الشروط والإقرار مسبقًا من أول نشر للمحل — أي تعديل تحفظه يُعتبر مُقرًّا به.</div></div>' : ''}
        <label class="switch">${fSwInput('agree', REG.agree)} أوافق على <a href="#/home" style="border-bottom:1px dotted">شروط استخدام المنصة</a> وسياسة المحتوى</label>
        <label class="switch">${fSwInput('agreeTruth', REG.agreeTruth)} أُقر بأن البيانات والأسعار المُدخلة صحيحة، وألتزم بتحديثها عند تغيّرها</label>
        <div class="insight warn mt10"><span class="ic">🛡️</span><div class="tiny">المنصة تعرض «آخر تحديث» لكل سعر وزر إبلاغ للعملاء. المتاجر المتكررة في الأسعار الخاطئة يهبط مؤشر دقة بياناتها وتظهر بوسم تحذيري.</div></div>
      </div>
    </div>
  </div>`;
}

/* اكتمال بيانات متجر مسجّل (للتحقق السريع من لوحة التحكم والدليل) */
function regCompletenessExtra(st) {
  const missing = [];
  if (!st.desc || st.desc.length < 20) missing.push('وصف المتجر');
  if (!st.landmark) missing.push('علامة مميزة قريبة');
  if (!st.street || !st.buildingNo) missing.push('الشارع ورقم العقار');
  if (!st.hours) missing.push('تفصيل مواعيد الأيام');
  if (!st.priceManager) missing.push('مسؤول تحديث الأسعار');
  if (!(st.media && (st.media.facade || st.media.inside))) missing.push('صور المتجر');
  if (!st.gmapsUrl) missing.push('رابط خرائط جوجل');
  if (!(st.tags || []).length) missing.push('كلمات التخصص');
  const base = (DB.byStore[st.id] || []).length ? 55 : 30;
  const pct = Math.min(100, base + (8 - missing.length) * 5);
  return { pct: pct, missing: missing };
}

/* ------------------------- 9. وضع التعديل: تحميل بيانات متجر موجود ------------------------- */
function regFromStore(id) {
  const st = DB.stores.find(s => s.id === id);
  if (!st) return;
  const rows = DB.byStore[id] || [];
  REG.edit = id;
  REG.name = st.name; REG.nameOnSign = st.name; REG.cats = st.cats.slice();
  REG.desc = st.desc; REG.sizeM2 = REG.sizeM2 || ''; REG.founded = st.joined || '';
  REG.city = st.city; REG.area = st.area; REG.street = (st.address || '').split('،')[0] || st.area;
  REG.lat = st.lat; REG.lon = st.lon; REG.parking = REG.parking || PARKING[1];
  REG.phone = st.phone; REG.whatsapp = st.whatsapp; REG.pay = st.pay.slice(); REG.svc = st.svc.slice();
  REG.logoEmoji = catOf(st.cats[0]).em;
  hoursFromStore(st);
  REG.products = rows.map(l => {
    const p = PRODUCTS.find(x => x.id === l.productId) || { name: l.productId, brand: l.brand, cat: l.cat };
    return { name: p.name, cat: p.cat || l.cat, brand: p.brand || l.brand, model: '', price: l.price, old: l.oldPrice || '', qty: '', stock: l.inStock, warranty: l.warranty || REG.warranty, condition: 'جديد', desc: '' };
  });
  REG.media = { logo: true, facade: true, inside: true, shelf: true, products: false, video: '' };
  REG.docs = { commercialReg: st.verified, tax: st.verified, signPhoto: st.verified, phoneProof: true, idCard: false };
  regSave();
}
function hoursFromStore(st) {
  const h = {};
  for (let i = 0; i < 7; i++) {
    const closed = st.fri === 'off' && i === 5;
    const openH = st.fri === 'late' && i === 5 ? Math.max(st.openH, 14) : st.openH;
    h[i] = { closed: closed, open: timeTxt(openH), close: timeTxt(st.closeH % 24), note: '' };
  }
  REG.hours = h;
}
