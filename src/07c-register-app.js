/* =========================================================================
   دليل المحلات المسجّلة (Directory) + إحداثيات محافظات إضافية + أحداث التسجيل
   ========================================================================= */

/* ------------------------- إحداثيات مدن إضافية لتغطية أوسع ------------------------- */
const EXTRA_CITIES = {
  'الأقصر': [25.69, 32.64], 'أسوان': [24.09, 32.90], 'أسيوط': [27.18, 31.18], 'سوهاج': [26.55, 31.70],
  'المنيا': [28.10, 30.75], 'بني سويف': [29.09, 30.93], 'الفيوم': [29.31, 30.84], 'المنصورة': [31.04, 31.38],
  'طنطا': [30.79, 31.00], 'الزقازيق': [30.58, 31.50], 'الإسماعيلية': [30.60, 32.27], 'بورسعيد': [31.26, 32.30],
  'السويس': [29.97, 32.55], 'دمياط': [31.42, 31.81], 'كفر الشيخ': [31.11, 30.94], 'دمنهور': [31.03, 30.47],
  'بنها': [30.46, 31.18], 'شبين الكوم': [30.55, 31.01], 'الغردقة': [27.26, 33.81], 'شرم الشيخ': [27.91, 34.33],
  'مرسى مطروح': [31.35, 27.24], 'العريش': [31.13, 33.80], 'الخارجة': [25.44, 30.55], 'الداخلة': [25.50, 28.98],
  'الجيزة': [30.013, 31.209], 'القاهرة': [30.045, 31.240], 'الإسكندرية': [31.212, 29.950]
};

/* ------------------------- صفحة دليل المحلات ------------------------- */
function directoryPage() {
  const q = APP.route.p.q || '';
  const city = APP.route.p.city || '';
  const cat = APP.route.p.cat || '';
  const status = APP.route.p.status || 'all';
  const sort = APP.route.p.sort || 'new';
  const n = norm(q);

  const rows = DB.stores.map(s => {
    const r = DB.byStore[s.id] || [];
    const prods = r.map(l => { const p = PRODUCTS.find(x => x.id === l.productId); return p ? (p.name + ' ' + p.brand + ' ' + p.kw) : ''; }).join(' ');
    return Object.assign({}, s, { prods: prods, count: r.length, dist: distKm(LOC, s), open: isOpen(s), completeness: regCompletenessExtra(s) });
  }).filter(s => {
    if (city && s.city !== city) return false;
    if (cat && !s.cats.includes(cat)) return false;
    if (status === 'verified' && !s.verified) return false;
    if (status === 'pro' && s.plan !== 'pro') return false;
    if (status === 'new' && s.joined < 2026) return false;
    if (status === 'open' && !s.open) return false;
    if (n && !(norm(s.name + ' ' + s.area + ' ' + s.city + ' ' + s.desc + ' ' + s.prods).includes(n))) return false;
    return true;
  });

  if (sort === 'alpha') rows.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  else if (sort === 'rating') rows.sort((a, b) => b.rating - a.rating);
  else if (sort === 'products') rows.sort((a, b) => b.count - a.count);
  else if (sort === 'dist') rows.sort((a, b) => a.dist - b.dist);
  else rows.sort((a, b) => b.joined - a.joined || b.rating - a.rating);

  const cityStats = {};
  DB.stores.forEach(s => {
    cityStats[s.city] = cityStats[s.city] || { n: 0, v: 0, prods: 0 };
    cityStats[s.city].n++;
    if (s.verified) cityStats[s.city].v++;
    cityStats[s.city].prods += (DB.byStore[s.id] || []).length;
  });
  const cityRank = Object.entries(cityStats).sort((a, b) => b[1].n - a[1].n);
  const totalProducts = DB.listings.length;

  return shell('directory', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div>
        <div class="row wrapx gap6 mb6"><span class="badge p">دليل المحلات</span><span class="badge ink">${DB.stores.length} محلًا</span><span class="badge ink">${nf(totalProducts)} سعرًا مسجّلًا</span></div>
        <h1 style="font-size:26px">🏬 دليل المحلات المسجّلة على سوقي</h1>
        <p>كل محل هنا سجّل بياناته بنفسه: النشاط، الموقع، المنتجات والأسعار. ابحث بالاسم أو بالمنتج أو بالمنطقة — أو سجّل محلّك أنت.</p>
      </div>
      <div class="row gap6">
        <a class="btn primary" href="#/addstore">➕ سجّل محلّك</a>
        <a class="btn" href="#/stores">عرض ككروت ←</a>
      </div>
    </div>

    <!-- بحث ودليل -->
    <div class="card pad mb14">
      <div class="searchbig" style="margin:0;box-shadow:none;background:var(--surface-2);border:1px solid var(--line)">
        <label class="f"><span style="font-size:18px">🔍</span>
          <input id="dirQ" value="${esc(q)}" placeholder="ابحث باسم المحل، المنطقة، أو منتج يبيعه (مثال: نيل، الدقي، كارت شاشة)"></label>
        <button class="go" id="dirGo">ابحث في الدليل</button>
      </div>
      <div class="filters mt14">
        <div class="field" style="min-width:160px"><label>المحافظة / المدينة</label>
          <select class="select" id="dirCity"><option value="">كل المحافظات (${Object.keys(cityStats).length})</option>
            ${Object.keys(cityStats).sort().map(c => `<option ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="field" style="min-width:160px"><label>نوع النشاط</label>
          <select class="select" id="dirCat"><option value="">كل الأنشطة</option>
            ${CATS.filter(c => DB.stores.some(s => s.cats.includes(c.id))).map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.em} ${c.ar}</option>`).join('')}</select></div>
        <div class="field" style="min-width:170px"><label>حالة المحل</label>
          <select class="select" id="dirStatus">
            ${[['all', 'الكل'], ['verified', '✔️ موثق فقط'], ['pro', '💎 باقة احترافية'], ['new', '🆕 انضمّ حديثًا'], ['open', '🟢 مفتوح الآن']]
      .map(([v, l]) => `<option value="${v}" ${status === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div class="field" style="min-width:170px"><label>الترتيب</label>
          <select class="select" id="dirSort">
            ${[['new', 'الأحدث انضمامًا'], ['dist', 'الأقرب لي'], ['rating', 'أعلى تقييم'], ['products', 'الأكثر منتجات'], ['alpha', 'أبجدي']]
      .map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <span class="spacer"></span>
        <span class="tiny muted">${rows.length} محلًا مطابقًا</span>
      </div>
    </div>

    <!-- ملخص المحافظات -->
    <div class="grid g-4 mb14">
      ${cityRank.slice(0, 4).map(([c, v]) => `<a class="card pad hv" href="#/directory?city=${encodeURIComponent(c)}">
        <div class="between"><div class="b">${esc(c)}</div><span class="badge ink">${v.n} محلًا</span></div>
        <div class="tiny muted mt6">✔️ ${v.v} موثق · 📦 ${v.prods} سعرًا مسجّلًا</div>
        <div class="progress mt10"><i style="width:${Math.round(v.n / cityRank[0][1].n * 100)}%"></i></div>
      </a>`).join('')}
    </div>

    ${rows.length ? `
    <!-- جدول الموثوقية -->
    <div class="card mb14">
      <div class="between wrapx" style="padding:14px 16px">
        <div><div class="b">📋 سجل كامل لبيانات المحلات</div>
        <div class="tiny muted">مؤشر «الاكتمال» محسوب من الحقول المسجّلة فعلًا (هوية + موقع + تواصل + بضاعة + صور + مستندات).</div></div>
        <div class="row gap6"><span class="badge ok">80%+ ممتاز</span><span class="badge warn">50-79% متوسط</span><span class="badge bad">أقل من 50% ناقص</span></div>
      </div>
      <div class="tbl-wrap" style="border-radius:0;border-inline:0;border-bottom:0">
        <table class="tbl">
          <thead><tr><th>المحل</th><th>النشاط</th><th>المنطقة</th><th>المنتجات</th><th>التقييم</th><th>الحالة</th><th>الباقة</th><th>اكتمال البيانات</th><th>آخر تحديث أسعار</th><th></th></tr></thead>
          <tbody>
          ${rows.map(s => {
    const f = Math.min.apply(null, (DB.byStore[s.id] || [{ updatedH: 999 }]).map(l => l.updatedH));
    const fresh = Math.max(0, 100 - Math.min(100, Math.round(f / 24 * 100)));
    return `<tr>
              <td><div class="td-store">
                <span class="thumb" style="width:36px;height:36px;font-size:18px;border-radius:10px">${catOf(s.cats[0]).em}</span>
                <span><span class="b"><a href="#/store/${s.id}">${esc(s.name)}</a>${s.verified ? ' <span class="vf">✔️</span>' : ''}</span>
                <span class="tiny muted" style="display:block">${esc(s.area)} — ${esc(s.city)} · على المنصة منذ ${s.joined}</span></span></div></td>
              <td class="sm">${s.cats.slice(0, 2).map(c => catOf(c).ar).join('، ')}${s.cats.length > 2 ? ' +' + (s.cats.length - 2) : ''}</td>
              <td class="sm">${esc(s.area)}<div class="tiny muted">📍 ${kmTxt(s.dist)}</div></td>
              <td class="num">${s.count}</td>
              <td><span class="stars num">${stars(s.rating)}</span> <span class="tiny muted">${s.rating.toFixed(1)}</span></td>
              <td>${s.open ? '<span class="badge ok"><i class="dot g"></i> مفتوح</span>' : '<span class="badge ink">مغلق</span>'}</td>
              <td>${s.plan === 'pro' ? '<span class="badge acc">احترافي 💎</span>' : '<span class="badge ink">مجاني</span>'}</td>
              <td><span class="badge ${s.completeness.pct >= 80 ? 'ok' : s.completeness.pct >= 50 ? 'warn' : 'bad'}">${s.completeness.pct}%</span>
                <div class="tiny muted">${s.completeness.missing.length ? 'ناقص: ' + s.completeness.missing.slice(0, 2).map(esc).join(' · ') : 'مكتمل ✓'}</div></td>
              <td>${trustBadge(f)}</td>
              <td><div class="row gap6">
                <a class="btn sm2" href="#/store/${s.id}">عرض</a>
                <a class="btn primary sm2" href="#/addstore?step=6&edit=${s.id}">تحديث الأسعار</a>
              </div></td></tr>`;
  }).join('')}
          </tbody>
        </table>
      </div>
      <div style="padding:12px 16px" class="tiny muted">صاحب المحل يقدر يستكمل بياناته أو يحدّث أسعاره في أي وقت من زر «تحديث الأسعار» — ونسبة الاكتمال الظاهرة هي نفسها التي يراها في لوحة تحكمه.</div>
    </div>

    <div class="grid g-auto">${rows.slice(0, 24).map(s => storeCard(s)).join('')}</div>
    ${rows.length > 24 ? `<p class="center tiny muted mt14">تم عرض 24 محلًا من ${rows.length} — استخدم البحث والفلاتر للوصول السريع.</p>` : ''}
    ` : `
    <div class="card pad center">
      <div style="font-size:36px">🏬</div>
      <div class="b mt6">لا يوجد محل مطابق للبحث</div>
      <p class="sm muted mt6">جرّب كلمة أعم، أو ابحث باسم المنطقة، أو سجّل محلّك ليكون أول محل في هذه المنطقة.</p>
      <div class="row center gap6 mt14" style="justify-content:center">
        <button class="btn" onclick="go('directory')">إلغاء الفلاتر</button>
        <a class="btn primary" href="#/addstore">➕ سجّل محلّك</a>
      </div>
    </div>`}

    <!-- دعوة للتسجيل -->
    <section class="sec" style="padding-bottom:26px">
      <div class="card pad" style="background:linear-gradient(140deg,#2C0611,#470A1C);border:0;color:#fff">
        <div class="grid g-2" style="align-items:center">
          <div>
            <span class="badge" style="background:rgba(255,255,255,.12);color:#EFD3DB">انضم لدليل المحلات</span>
            <h2 style="font-size:22px;margin-top:12px">محلّك مش موجود؟ سجّله في 4 دقائق</h2>
            <p class="sm mt10" style="color:#D5BBC4">البيانات المطلوبة واضحة: النشاط، العنوان والموقع الدقيق، وسيلة تواصل، أول منتجاتك بأسعارها، ومواعيد العمل. لا رسوم ولا تعقيد — والتوثيق مجاني.</p>
          </div>
          <div class="row wrapx gap6">
            <a class="btn acc lg" href="#/addstore" style="color:#fff">➕ ابدأ تسجيل محلّك</a>
            <a class="btn lg" href="#/dashboard" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);color:#fff">شوف لوحة التحكم</a>
          </div>
        </div>
      </div>
    </section>
  </div>`);
}
function bindDirectory() {
  const q = $('#dirQ');
  if (q) q.onkeydown = e => { if (e.key === 'Enter') go('directory', Object.assign({}, APP.route.p, { q: q.value.trim() })); };
  const g = $('#dirGo'); if (g) g.onclick = () => go('directory', Object.assign({}, APP.route.p, { q: ($('#dirQ').value || '').trim() }));
  const c = $('#dirCity'); if (c) c.onchange = () => setParam('city', c.value);
  const a = $('#dirCat'); if (a) a.onchange = () => setParam('cat', a.value);
  const s = $('#dirStatus'); if (s) s.onchange = () => setParam('status', s.value);
  const so = $('#dirSort'); if (so) so.onchange = () => setParam('sort', so.value);
}

/* ------------------------- أحداث وحدة التسجيل ------------------------- */
function regBlankReset(keepEdit) {
  const fresh = regBlank();
  Object.keys(fresh).forEach(k => REG[k] = fresh[k]);
  if (keepEdit && APP.route.p.edit) REG.edit = APP.route.p.edit;
  regSave();
}
function regGotoStep(s) {
  REG.step = s; regSave();
  go('addstore', Object.assign({ step: s }, REG.edit ? { edit: REG.edit } : {}));
}
function regError(msg) {
  $('#regErr').innerHTML = `<div class="insight bad"><span class="ic">⚠️</span><div class="sm">${msg}</div></div>`;
  toast(msg.replace(/<[^>]+>/g, ''), 'warn', '⚠️');
}
function regValidate(step) {
  if (step === 1) {
    if (!REG.name || REG.name.length < 3) return 'اكتب اسم المتجر (3 أحرف على الأقل).';
    if (!REG.cats.length) return 'اختر قسمًا واحدًا على الأقل من «أقسام النشاط».';
  }
  if (step === 2) {
    if (!REG.city || !REG.area) return 'حدّد المحافظة والمنطقة.';
    if (!REG.street) return 'اكتب اسم الشارع — العنوان التفصيلي يساعد العميل يوصل.';
  }
  if (step === 4) {
    if (!REG.phone || !/^01\d{9}$/.test(String(REG.phone).replace(/\D/g, ''))) return 'اكتب رقم هاتف صحيح يبدأ بـ 01 (11 رقمًا).';
    if (!REG.priceManager) return 'حدّد اسم مسؤول تحديث الأسعار — بدون مسؤول، الأسعار بتقدم وتفقد المنصة مصداقيتها.';
    if (!REG.priceManagerPhone && !REG.whatsapp && !REG.phone) return 'أضف رقم واتساب لمسؤول الأسعار أو للتواصل.';
  }
  if (step === 6) {
    const ready = REG.products.filter(p => p.name && +p.price > 0);
    if (!ready.length) return 'أضف منتجًا واحدًا على الأقل باسم وسعر — هذا أساس ظهورك في نتائج البحث.';
    const bad = REG.products.find(p => p.name && !(+p.price > 0));
    if (bad) return `المنتج «${esc(bad.name)}» ليس له سعر. اضبط السعر أو احذف الصف.`;
  }
  if (step === 7) {
    const m = ['facade', 'inside', 'shelf'].some(k => REG.media[k]);
    if (!m) return 'أضف صورة واحدة على الأقل للمتجر (واجهة أو داخل) — الصور ترفع نسبة التواصل.';
  }
  if (step === 8) {
    if (!REG.edit && (!REG.agree || !REG.agreeTruth)) return 'لازم الموافقة على الشروط والإقرار بصحة البيانات قبل النشر.';
  }
  return null;
}
function regNext() {
  const step = regStep();
  const err = regValidate(step);
  if (err) return regError(err);
  if (step === 8) return regSubmit();
  regGotoStep(Math.min(8, step + 1));
}
function regSubmit() {
  const err = regValidate(8);
  if (err) return regError(err);
  const store = regToStore();
  const id = store.id;
  if (REG.edit && DB.stores.some(s => s.id === id)) return regUpdateExisting(store);
  DB.stores.push(store); DB.byStore[id] = []; DB.reviews[id] = [];
  REG.products.filter(p => p.name && +p.price > 0).forEach((row, i) => {
    const match = PRODUCTS.find(p => norm(p.name) === norm(row.name)) ||
      PRODUCTS.find(p => row.name.length > 4 && norm(p.name).includes(norm(row.name))) ||
      PRODUCTS.find(p => row.brand && norm(p.brand) === norm(row.brand) && row.model && norm(p.name).includes(norm(row.model)));
    const pid = match ? match.id : 'reg' + id + i;
    if (!match) PRODUCTS.push(P(pid, row.name, row.brand || 'متجر', row.cat || store.cats[0], +row.price, catOf(row.cat || store.cats[0]).em, norm(row.name + ' ' + (row.brand || ''))));
    const price = +row.price, old = row.old ? +row.old : null;
    const L = {
      id: 'L' + id + i, storeId: id, productId: pid, price: price,
      oldPrice: old && old > price ? old : null, disc: old && old > price ? Math.round((1 - price / old) * 100) : 0,
      inStock: row.stock !== false, updatedH: 0, brand: row.brand || (match ? match.brand : 'متجر'),
      cat: row.cat || store.cats[0], warranty: row.warranty || REG.warranty,
      offerEnds: old && old > price ? 10 : null
    };
    DB.listings.push(L); DB.byStore[id].push(L); (DB.byProduct[pid] = DB.byProduct[pid] || []).push(L);
  });
  DB.offers = DB.listings.filter(l => l.disc >= 10).sort((a, b) => b.disc - a.disc);
  DB.reviews[id] = [];
  APP.myStore = id; save('myStore', id);
  const pct = regCompleteness().pct;
  const n = DB.byStore[id].length;
  regBlankReset(false);
  toast(`تم تسجيل «${store.name}» ونشره 🎉 — ${n} منتجًا، اكتمال بيانات ${pct}%`, 'ok', '🏪');
  go('dashboard', { store: id, tab: 'overview' });
}
/* تحديث محل مسجّل ببيانات وحدة التسجيل (أسعار + بيانات + سجل تغييرات) */
function regUpdateExisting(store) {
  const old = DB.stores.find(s => s.id === store.id);
  const oldRows = (DB.byStore[store.id] || []).slice();
  Object.keys(store).forEach(k => { if (k !== 'id' && k !== 'weekly' && k !== 'rating' && k !== 'rc') old[k] = store[k]; });
  const kept = [];
  REG.products.filter(p => p.name && +p.price > 0).forEach((row, i) => {
    let L = oldRows.find(l => { const p = PRODUCTS.find(x => x.id === l.productId); return p && norm(p.name) === norm(row.name); });
    if (L) {
      const from = L.price;
      L.price = +row.price;
      L.oldPrice = row.old && +row.old > +row.price ? +row.old : null;
      L.disc = L.oldPrice ? Math.round((1 - L.price / L.oldPrice) * 100) : 0;
      L.inStock = row.stock !== false;
      L.warranty = row.warranty || L.warranty;
      L.updatedH = 0.02;
      if (from !== L.price) DB.priceLog.unshift({ store: store.id, product: row.name, from: from, to: L.price, by: 'المتجر', at: 'الآن' });
      kept.push(L.id);
      return;
    }
    const match = PRODUCTS.find(p => norm(p.name) === norm(row.name));
    const pid = match ? match.id : 'reg' + store.id + i;
    if (!match) PRODUCTS.push(P(pid, row.name, row.brand || 'متجر', row.cat || old.cats[0], +row.price, catOf(row.cat || old.cats[0]).em, norm(row.name)));
    const NL = {
      id: 'L' + store.id + 'u' + i, storeId: store.id, productId: pid, price: +row.price,
      oldPrice: row.old && +row.old > +row.price ? +row.old : null,
      disc: row.old && +row.old > +row.price ? Math.round((1 - +row.price / +row.old) * 100) : 0,
      inStock: row.stock !== false, updatedH: 0.02, brand: row.brand || 'متجر', cat: row.cat || old.cats[0],
      warranty: row.warranty || REG.warranty, offerEnds: row.old ? 10 : null
    };
    DB.listings.push(NL); DB.byStore[store.id].push(NL); (DB.byProduct[pid] = DB.byProduct[pid] || []).push(NL);
    kept.push(NL.id);
  });
  /* حذف الأسعار التي أُزيلت من الاستمارة */
  DB.byStore[store.id] = DB.byStore[store.id].filter(l => kept.indexOf(l.id) >= 0);
  DB.listings = DB.listings.filter(l => l.storeId !== store.id || kept.indexOf(l.id) >= 0);
  Object.keys(DB.byProduct).forEach(pid => { DB.byProduct[pid] = DB.byProduct[pid].filter(l => l.storeId !== store.id || kept.indexOf(l.id) >= 0); });
  old.completeness = regCompleteness().pct;
  old.plan = REG.plan || old.plan;
  DB.offers = DB.listings.filter(l => l.disc >= 10).sort((a, b) => b.disc - a.disc);
  const n = DB.byStore[store.id].length;
  const nm = old.name, pct = old.completeness;
  REG.edit = null; regSave();
  toast(`تم حفظ بيانات «${nm}» 💾 — ${n} منتجًا، اكتمال ${pct}%`, 'ok', '💾');
  go('store', { id: store.id, tab: 'info' });
}
function regToStore() {
  const id = REG.edit || ('new' + uid().slice(0, 5));
  const openH = Object.keys(REG.hours).map(k => REG.hours[k]).filter(h => !h.closed).map(h => parseInt(h.open, 10));
  const closeH = Object.keys(REG.hours).map(k => REG.hours[k]).filter(h => !h.closed).map(h => parseInt(h.close, 10));
  const oh = openH.length ? Math.min.apply(null, openH) : 10;
  let ch = closeH.length ? Math.max.apply(null, closeH) : 23;
  if (ch <= oh) ch = 24 + ch;                       // مواعيد تمتد بعد منتصف الليل
  const friH = REG.hours[5];
  const fri = friH.closed ? 'off' : (parseInt(friH.open, 10) >= 13 ? 'late' : 'normal');
  return {
    id: id, name: REG.name, area: REG.area || REG.city, city: REG.city, lat: +REG.lat, lon: +REG.lon,
    cats: REG.cats.length ? REG.cats : ['electronics'], rating: 0, rc: 0,
    openH: oh, closeH: ch, pf: 1, plan: REG.plan || 'free', verified: false,
    phone: REG.phone, whatsapp: REG.whatsapp || REG.phone, desc: REG.desc || 'متجر مسجّل على منصة سوقي.',
    address: [REG.street, REG.buildingNo ? 'رقم ' + REG.buildingNo : '', REG.floor, REG.area, REG.city].filter(Boolean).join('، '),
    fri: fri, sponsored: false, pay: REG.pay.slice(), svc: REG.svc.slice(),
    joined: 2026, views: 0, clicksWa: 0, calls: 0, dirs: 0,
    weekly: Array.from({ length: 8 }, () => 0),
    /* الحقول الجديدة المسجّلة */
    nameOnSign: REG.nameOnSign, legalType: REG.legalType, founded: REG.founded, sizeM2: REG.sizeM2,
    employees: REG.employees, tags: REG.tags.slice(), audience: REG.audience.slice(), wholesale: !!REG.wholesale,
    commercialReg: REG.commercialReg, taxId: REG.taxId, vatIncluded: !!REG.vatIncluded,
    district: REG.district, street: REG.street, buildingNo: REG.buildingNo, floor: REG.floor, landmark: REG.landmark,
    gmapsUrl: REG.gmapsUrl, parking: REG.parking, onMainStreet: !!REG.onMainStreet, nearMetro: !!REG.nearMetro,
    branches: REG.branches.slice(), delivery: !!REG.delivery, deliveryRadius: +REG.deliveryRadius || 0,
    deliveryFee: REG.deliveryFee, minOrder: REG.minOrder, prepTime: REG.prepTime, zones: (REG.zones || []).slice(),
    pickup: !!REG.pickup, phone2: REG.phone2, email: REG.email, website: REG.website, facebook: REG.facebook,
    instagram: REG.instagram, tiktok: REG.tiktok, hours: deep(REG.hours), hoursNotes: REG.hoursNotes,
    replyTime: REG.replyTime, contactPerson: REG.contactPerson, contactRole: REG.contactRole,
    priceManager: REG.priceManager, priceManagerPhone: REG.priceManagerPhone,
    installments: REG.installments.slice(), returnDays: REG.returnDays, warranty: REG.warranty,
    install: !!REG.install, installFee: REG.installFee, taxInvoice: !!REG.taxInvoice,
    media: deep(REG.media), docs: deep(REG.docs), logoEmoji: REG.logoEmoji,
    wantAds: !!REG.wantAds, wantFeatured: !!REG.wantFeatured, completeness: regCompleteness().pct
  };
}
function bindRegister() {
  /* الحقول النصية والأرقام */
  document.querySelectorAll('[data-reg]').forEach(el => {
    const key = el.dataset.reg;
    const handler = () => {
      let v = el.value;
      if (key === 'lat' || key === 'lon') v = parseFloat(v) || 0;
      REG[key] = v; regSave();
      if (key === 'lat' || key === 'lon') refreshRegMap();
      refreshSide();
      if (el.id === '') { } // noop
    };
    el.oninput = el.onchange = handler;
  });
  /* القوائم */
  document.querySelectorAll('[data-regsel]').forEach(sel => {
    sel.onchange = () => {
      REG[sel.dataset.regsel] = sel.value; regSave();
      if (sel.dataset.regsel === 'city') { const c = REG_CITIES[sel.value]; if (c) { REG.lat = c.lat; REG.lon = c.lon; } }
      render();
    };
  });
  /* الشرائح */
  document.querySelectorAll('[data-regchip]').forEach(b => {
    b.onclick = () => { regToggleIn(b.dataset.regchip, b.dataset.val); render(); };
  });
  /* المفاتيح */
  document.querySelectorAll('[data-regsw]').forEach(inp => {
    inp.onchange = () => { REG[inp.dataset.regsw] = inp.checked; regSave(); refreshSide(); };
  });
  /* كلمات التخصص */
  const tr = document.querySelector('[data-reg="tagsRaw"]');
  if (tr) tr.onkeydown = e => {
    if (e.key === 'Enter' && tr.value.trim()) {
      e.preventDefault();
      REG.tags = REG.tags || [];
      if (REG.tags.indexOf(tr.value.trim()) < 0) REG.tags.push(tr.value.trim());
      tr.value = ''; regSave(); render();
    }
  };
  document.querySelectorAll('[data-regtag]').forEach(b => b.onclick = () => { regToggleIn('tags', b.dataset.regtag); render(); });
  document.querySelectorAll('[data-regtagdel]').forEach(b => b.onclick = () => { regToggleIn('tags', b.dataset.regtagdel); render(); });
  /* رمز الشعار */
  document.querySelectorAll('[data-regemoji]').forEach(b => b.onclick = () => { REG.logoEmoji = b.dataset.regemoji; regSave(); render(); });
  /* الفروع */
  document.querySelectorAll('[data-regbr]').forEach(inp => {
    inp.oninput = inp.onchange = () => {
      const i = +inp.dataset.regbr, f = inp.dataset.f;
      REG.branches[i] = REG.branches[i] || { name: '', city: REG.city, area: '', phone: '', address: '' };
      REG.branches[i][f] = inp.value; regSave();
    };
  });
  document.querySelectorAll('[data-regbrdel]').forEach(b => b.onclick = () => { REG.branches.splice(+b.dataset.regbrdel, 1); regSave(); render(); });
  const ab = $('#regAddBranch');
  if (ab) ab.onclick = () => { REG.branches.push({ name: '', city: REG.city, area: '', phone: '', address: '' }); regSave(); render(); };
  /* مناطق التوصيل */
  document.querySelectorAll('[data-regzone]').forEach(b => b.onclick = () => { regToggleIn('zones', b.dataset.regzone); render(); });
  document.querySelectorAll('[data-regzonedel]').forEach(b => b.onclick = () => { regToggleIn('zones', b.dataset.regzonedel); render(); });
  /* مواعيد العمل */
  document.querySelectorAll('[data-reghr]').forEach(el => {
    el.onchange = el.oninput = () => {
      const d = +el.dataset.reghr, f = el.dataset.f;
      REG.hours[d] = REG.hours[d] || { open: '10:00', close: '23:00', closed: false, note: '' };
      REG.hours[d][f] = f === 'closed' ? el.checked : el.value;
      regSave();
      if (f === 'closed') render();
    };
  });
  const ha = $('#regHrsAll');
  if (ha) ha.onclick = () => {
    const src = REG.hours[0];
    for (let i = 1; i < 7; i++) if (!(REG.hours[i] || {}).closed || true) REG.hours[i] = Object.assign({}, src);
    regSave(); render(); toast('تم تطبيق مواعيد يوم واحد على كل الأيام', 'ok', '🕐');
  };
  const hf = $('#regHrsFri');
  if (hf) hf.onclick = () => { REG.hours[5] = { open: '14:00', close: '23:00', closed: false, note: 'بعد صلاة الجمعة' }; regSave(); render(); };
  /* المنتجات */
  document.querySelectorAll('[data-regp]').forEach(el => {
    const i = +el.dataset.regp, f = el.dataset.f;
    const h = () => {
      REG.products[i] = REG.products[i] || regNewProduct();
      REG.products[i][f] = f === 'stock' ? el.checked : el.value;
      regSave();
      if (f === 'price' || f === 'old' || f === 'name') refreshTotals();
    };
    el.oninput = el.onchange = h;
  });
  document.querySelectorAll('[data-regpdel]').forEach(b => b.onclick = () => { REG.products.splice(+b.dataset.regpdel, 1); regSave(); render(); });
  const ar = $('#regAddRow'); if (ar) ar.onclick = () => { REG.products.push(regNewProduct()); regSave(); render(); };
  const sg = $('#regSuggest');
  if (sg) sg.onclick = () => {
    const add = regSuggestedProducts();
    add.forEach(p => REG.products.push(p));
    regSave(); render();
    toast(`تمت إضافة ${add.length} منتجًا مقترحًا — عدّل الأسعار بالسعر الفعلي عندك`, 'ok', '📦');
  };
  const pp = $('#regParsePaste');
  if (pp) pp.onclick = () => {
    const rows = regParsePasted($('#regPaste').value);
    if (!rows.length) return toast('لم نتعرف على أي منتج وسعر في القائمة — اكتب كل منتج في سطر مع سعره', 'warn', '⚠️');
    rows.forEach(r => REG.products.push(r));
    regSave(); render();
    toast(`تم تحليل ${rows.length} منتجًا وإضافتها`, 'ok', '🧠');
  };
  const csv = $('#regCSV');
  if (csv) csv.onchange = () => {
    const file = csv.files && csv.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const rows = regParseCSV(String(fr.result));
      if (!rows.length) return toast('الملف لا يحتوي صفوفًا صالحة', 'warn', '⚠️');
      rows.forEach(r => REG.products.push(r));
      regSave(); render();
      toast(`تم استيراد ${rows.length} منتجًا من الملف`, 'ok', '📄');
    };
    fr.readAsText(file, 'utf-8');
  };
  const ct = $('#regCSVTemplate');
  if (ct) ct.onclick = () => {
    const blob = 'text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(regCSVTemplate());
    const a = document.createElement('a');
    a.href = 'data:' + blob; a.download = 'souqi-products-template.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast('تم تنزيل قالب CSV — افتحه في إكسل واملأه', 'ok', '⬇️');
  };
  /* الصور والمستندات */
  document.querySelectorAll('[data-regmedia]').forEach(b => b.onclick = () => {
    const k = b.dataset.regmedia;
    REG.media[k] = !REG.media[k]; regSave(); render();
    toast(REG.media[k] ? 'تم إضافة الصورة (محاكاة في النموذج)' : 'تم حذف الصورة', 'ok', REG.media[k] ? '🖼️' : '🗑️');
  });
  document.querySelectorAll('[data-regdoc]').forEach(inp => inp.onchange = () => {
    REG.docs[inp.dataset.regdoc] = inp.checked; regSave(); render();
  });
  /* الباقة في المراجعة */
  document.querySelectorAll('[data-regplan]').forEach(b => b.onclick = () => { REG.plan = b.dataset.regplan; regSave(); render(); });
  /* التنقل */
  const pv = $('#regPrev'); if (pv) pv.onclick = () => regGotoStep(Math.max(1, regStep() - 1));
  const nx = $('#regNext'); if (nx) nx.onclick = () => regNext();
  const sb = $('#regSubmit'); if (sb) sb.onclick = () => regSubmit();
  /* أدوات علوية */
  const fc = $('#regClear');
  if (fc) fc.onclick = () => { regBlankReset(false); go('addstore', { step: 1 }); toast('تم مسح المسودة', 'ok', '🗑️'); };
  const fd = $('#regFillDemo');
  if (fd) fd.onclick = () => { regFillDemo(); render(); toast('تم تعبئة بيانات تجريبية — عدّلها كما تشاء', 'ok', '🎲'); };
  const ds = $('#regDescSuggest');
  if (ds) ds.onclick = () => {
    const cats = REG.cats.map(c => catOf(c).ar).join(' و');
    const why = REG.tags.length ? REG.tags.slice(0, 3).join('، ') : 'منتجات أصلية وأسعار منافسة';
    REG.desc = `${REG.name || 'متجرنا'} متخصص في ${cats || 'المنتجات'} في ${REG.area || REG.city}${REG.landmark ? '، ' + REG.landmark : ''}. بنوفّر ${why}${REG.delivery ? ' مع خدمة توصيل' : ''}${REG.pay.includes('فيزا / ماستركارد') ? ' ودفع بالكارت' : ''}.`;
    regSave(); render();
  };
  /* الشريط الجانبي */
  document.querySelectorAll('[data-reggoto]').forEach(b => b.onclick = () => {
    const key = b.dataset.reggoto;
    regGotoStep(REG_FIELD_STEP[key] || 1);
  });
  bindRegMap();
}
function refreshSide() {
  const m = $('#regMeterHost'), p = $('#regPreviewHost');
  if (m) m.innerHTML = regMeter();
  if (p) p.innerHTML = regPreview();
  const pv = $('#regPreview'); if (pv && pv.parentElement) pv.outerHTML = regPreview();
}
function refreshTotals() {
  const t = regGroupTotal();
  const host = $('#regTotals');
  if (host) host.innerHTML = `
    ${statBox('منتجات جاهزة', '<span class="num">' + t.count + '</span>', 'بها اسم وسعر')}
    ${statBox('قيمة المخزون التقديرية', '<span class="num">' + egp(t.sum) + '</span>', 'السعر × الكمية')}
    ${statBox('أكبر نسبة خصم', t.disc ? pct(t.disc) : '—', 'من السعر قبل الخصم')}
    ${statBox('حد الباقة', REG.plan === 'pro' ? 'غير محدود' : PRODUCT_LIMIT_FREE + ' منتجًا', REG.plan === 'pro' ? 'احترافي 💎' : 'مجاني')}`;
}
function refreshRegMap() {
  const g = $('#regPin');
  if (!g) return;
  const x = PX(REG.lon), y = PY(REG.lat);
  g.innerHTML = `<circle cx="${x}" cy="${y}" r="17" fill="#800020" opacity=".18"/>
    <circle cx="${x}" cy="${y}" r="8" fill="#800020" stroke="#fff" stroke-width="2.6"/>
    <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="8" fill="#fff" font-weight="800">🏪</text>`;
  const n = nearestRegCity(REG.lat, REG.lon);
  const host = $('#regNearest');
  if (host) host.textContent = (n.city || '—') + ' (≈ ' + kmTxt(n.d) + ')';
}
function bindRegMap() {
  const svg = $('#regMap'); if (!svg) return;
  const base = { x: 0, y: 0, w: 780, h: 700 };
  let vb = Object.assign({}, base);
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const toSvg = (ev) => {
    const r = svg.getBoundingClientRect();
    return {
      x: vb.x + ((ev.clientX - r.left) / r.width) * vb.w,
      y: vb.y + ((ev.clientY - r.top) / r.height) * vb.h
    };
  };
  svg.addEventListener('click', e => {
    if (e.target.closest('[data-regcity]')) return;
    const p = toSvg(e);
    REG.lon = +(24.5 + (p.x - 40) / 56).toFixed(5);
    REG.lat = +(31.6 - (p.y - 34) / 62.8).toFixed(5);
    regSave(); refreshRegMap();
    const n = nearestRegCity(REG.lat, REG.lon);
    toast(`تم تحديد الموقع — أقرب مدينة: ${n.city} (≈ ${kmTxt(n.d)})`, 'ok', '📍');
    refreshSide();
  });
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: 0 }; });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.abs(dx) + Math.abs(dy);
    vb.x = drag.vx - dx * vb.w / r.width;
    vb.y = drag.vy - dy * vb.h / r.height;
    apply();
  });
  svg.addEventListener('pointerup', () => { drag = null; });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.15 : 0.87;
    const nw = clamp(vb.w * f, 220, 900);
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    vb.w = nw; vb.h = nw * (base.h / base.w);
    vb.x = cx - vb.w / 2; vb.y = cy - vb.h / 2;
    apply();
  }, { passive: false });
  document.querySelectorAll('[data-regcity]').forEach(g => g.onclick = () => {
    const c = g.dataset.regcity;
    REG.city = c; REG.lat = REG_CITIES[c].lat; REG.lon = REG_CITIES[c].lon;
    regSave(); refreshRegMap(); render();
    toast('تم اختيار ' + c, 'ok', '📍');
  });
  document.querySelectorAll('[data-regcityjump]').forEach(b => b.onclick = () => {
    const c = b.dataset.regcityjump;
    REG.city = c; REG.lat = REG_CITIES[c].lat; REG.lon = REG_CITIES[c].lon;
    regSave(); refreshRegMap(); render();
  });
  const me = $('#regMapMe');
  if (me) me.onclick = () => {
    if (!navigator.geolocation) return toast('المتصفح لا يدعم تحديد الموقع — اضغط على الخريطة', 'warn', '📍');
    toast('جارٍ قراءة موقعك...', 'ok', '📡');
    navigator.geolocation.getCurrentPosition(p => {
      REG.lat = +p.coords.latitude.toFixed(5); REG.lon = +p.coords.longitude.toFixed(5);
      const n = nearestRegCity(REG.lat, REG.lon);
      REG.city = n.city || REG.city;
      regSave(); refreshRegMap();
      toast('تم ضبط موقع المتجر من موقعك الحالي — أقرب مدينة: ' + n.city, 'ok', '📍');
    }, () => toast('لم نتمكن من قراءة الموقع — اضغط على الخريطة يدويًا', 'warn', '📍'));
  };
  const rs = $('#regMapReset');
  if (rs) rs.onclick = () => { vb = Object.assign({}, base); apply(); };
}
/* تعبئة تجريبية سريعة لتجربة الوحدة */
function regFillDemo() {
  const seed = uid();
  const cats = [['mobile', 'computer'], ['clothing', 'shoes'], ['home', 'supermarket'], ['electronics', 'audio']][Math.floor(rnd(seed) * 4)];
  const area = ['المهندسين', 'الدقي', 'مدينة نصر', 'المعادي'][Math.floor(rnd(seed + 'a') * 4)];
  const city = area === 'مدينة نصر' || area === 'المعادي' ? 'القاهرة' : 'الجيزة';
  const c = REG_CITIES[city];
  REG.name = 'محل ' + ['النور', 'الصفا', 'المستقبل', 'الشرق', 'الأمانة'][Math.floor(rnd(seed + 'n') * 5)];
  REG.nameOnSign = REG.name;
  REG.cats = cats; REG.area = area; REG.city = city;
  REG.lat = +(c.lat + (rnd(seed + 'x') - .5) * 0.02).toFixed(5);
  REG.lon = +(c.lon + (rnd(seed + 'y') - .5) * 0.02).toFixed(5);
  REG.street = 'شارع ' + ['الجيش', 'جامعة الدول', 'عباس العقاد', '9', 'الثورة'][Math.floor(rnd(seed + 's') * 5)];
  REG.buildingNo = String(3 + Math.floor(rnd(seed + 'b') * 60));
  REG.floor = 'الأرضي';
  REG.landmark = 'بجوار صيدلية ' + ['العزبي', 'النيل', 'سيف'][Math.floor(rnd(seed + 'l') * 3)];
  REG.founded = String(2012 + Math.floor(rnd(seed + 'f') * 12));
  REG.sizeM2 = String(40 + Math.floor(rnd(seed + 'm') * 160));
  REG.tags = ['ضمان الوكيل', 'توصيل سريع', 'أسعار جملة'].slice(0, 1 + Math.floor(rnd(seed + 't') * 3));
  REG.audience = ['أفراد', 'عائلات', 'شركات'];
  REG.desc = `${REG.name} في ${area} — تخصص في ${cats.map(x => catOf(x).ar).join(' و')}، بضاعة أصلية وأسعار منافسة مع خدمة توصيل داخل المنطقة.`;
  REG.phone = '01' + String(Math.floor(rnd(seed + 'p') * 3)) + String(Math.floor(rnd(seed + 'p2') * 90000000) + 10000000);
  REG.whatsapp = REG.phone; REG.email = 'shop@example.com';
  REG.facebook = REG.name; REG.contactPerson = 'أحمد'; REG.priceManager = 'أحمد';
  REG.priceManagerPhone = REG.phone;
  REG.gmapsUrl = 'https://maps.app.goo.gl/demo' + Math.floor(rnd(seed + 'g') * 900);
  REG.pay = ['كاش', 'فيزا / ماستركارد', 'انستاباي'];
  REG.installments = ['فاليو', 'أمان'];
  REG.svc = ['ضمان سنة', 'توصيل', 'تركيب'];
  REG.delivery = true; REG.deliveryRadius = 5 + Math.floor(rnd(seed + 'd') * 10);
  /* فرع إضافي + مناطق توصيل (لإظهار الخطوة 3 كاملة) */
  const nearArea = DB.stores.filter(x => x.city === city).map(x => x.area).filter((v, i, a) => a.indexOf(v) === i);
  REG.branches = [{
    name: 'فرع ' + (nearArea[1] || 'وسط البلد'), city: city, area: nearArea[1] || 'وسط البلد',
    phone: '01' + String(Math.floor(rnd(seed + 'bp') * 3)) + String(Math.floor(rnd(seed + 'bp2') * 90000000) + 10000000),
    address: 'شارع ' + ['الثورة', 'النيل', 'المحطة'][Math.floor(rnd(seed + 'ba') * 3)]
  }];
  REG.zones = nearArea.slice(0, 1 + Math.floor(rnd(seed + 'z') * 3));
  if (REG.zones.length === 0) REG.zones = [area];
  REG.media = { logo: true, facade: true, inside: true, shelf: false, products: false, video: '' };
  REG.docs = { commercialReg: true, tax: false, signPhoto: true, phoneProof: true, idCard: false };
  REG.hours[5] = { open: '14:00', close: '23:00', closed: false, note: 'بعد الصلاة' };
  REG.products = regSuggestedProducts().slice(0, 6).map(p => {
    const price = Math.round(p.base * 0.95 + rnd(seed + p.name) * 0.1 * (p.base || 1000));
    return Object.assign(p, { price: price, old: Math.round(price * 1.15) });
  });
  REG.products = productsFromSuggested(REG.cats, seed);
  regSave();
}
function productsFromSuggested(cats, seed) {
  const out = [];
  cats.forEach(c => {
    PRODUCTS.filter(p => p.cat === c).slice(0, 4).forEach(p => {
      const price = Math.round(p.base * (0.92 + rnd(seed + p.id) * 0.16));
      out.push({ name: p.name, cat: p.cat, brand: p.brand, model: '', price: price, old: Math.round(price * 1.14), qty: 2 + Math.floor(rnd(seed + p.id + 'q') * 9), stock: rnd(seed + p.id + 's') > .15, warranty: 'سنة', condition: 'جديد', desc: '' });
    });
  });
  return out.slice(0, 10);
}
