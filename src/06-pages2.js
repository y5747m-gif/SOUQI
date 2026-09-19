/* =========================================================================
   الجزء 6: العروض + المتاجر القريبة + دليل المتاجر + المفضلة + الحساب
   ========================================================================= */

/* ---------------- 🔥 العروض ---------------- */
function offersPage() {
  const cat = APP.route.p.cat || '';
  const dist = APP.route.p.dist ? parseFloat(APP.route.p.dist) : 25;
  const minD = APP.route.p.min ? parseFloat(APP.route.p.min) : 0;
  const city = APP.route.p.city || '';
  const sort = APP.route.p.sort || 'disc';
  let rows = DB.offers.map(l => {
    const st = DB.stores.find(s => s.id === l.storeId);
    return Object.assign({}, l, { st, dist: distKm(LOC, st), open: isOpen(st) });
  }).filter(r => r.dist <= dist && r.disc >= minD && (!cat || r.cat === cat) && (!city || r.st.city === city));
  rows.sort((a, b) => sort === 'disc' ? b.disc - a.disc : sort === 'save' ? (b.oldPrice - b.price) - (a.oldPrice - a.price) : sort === 'end' ? (a.offerEnds || 99) - (b.offerEnds || 99) : a.price - b.price);
  const save = rows.reduce((a, r) => a + (r.oldPrice - r.price), 0);
  const byCat = CATS.map(c => ({ c, n: rows.filter(r => r.cat === c.id).length, mx: rows.filter(r => r.cat === c.id).reduce((a, r) => Math.max(a, r.disc), 0) })).filter(x => x.n).sort((a, b) => b.n - a.n);

  return shell('offers', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">🔥 عروض قريبة منك</h1>
      <p>${rows.length} عرضًا ساريًا داخل ${kmTxt(dist)} من ${esc(APP.loc.label)} — إجمالي توفير ممكن <b class="num">${egp(save)}</b></p></div>
      <button class="btn sm2" id="offRadius">📍 تغيير النطاق</button>
    </div>

    <div class="card pad mb14">
      <div class="scroll-x mb14">
        <button class="chip ${!cat ? 'on' : ''}" data-cat="">كل الأقسام</button>
        ${CATS.filter(c => DB.offers.some(l => l.cat === c.id)).map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.em} ${c.ar}</button>`).join('')}
      </div>
      <div class="filters">
        <div class="field" style="min-width:130px"><label>أدنى خصم</label>
          <select class="select" id="offMin">${[[0, 'كل الخصومات'], [10, '10% وأكثر'], [15, '15% وأكثر'], [20, '20% وأكثر'], [25, '25% وأكثر']].map(([v, l]) => `<option value="${v}" ${minD === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field" style="min-width:150px"><label>المحافظة</label>
          <select class="select" id="offCity"><option value="">كل المحافظات</option>${Array.from(new Set(DB.offers.map(l => DB.stores.find(s => s.id === l.storeId).city))).map(c => `<option ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="field" style="min-width:150px"><label>الترتيب</label>
          <select class="select" id="offSort">
            <option value="disc">أكبر نسبة خصم</option>
            <option value="save" ${sort === 'save' ? 'selected' : ''}>أكبر توفير بالجنيه</option>
            <option value="end" ${sort === 'end' ? 'selected' : ''}>الأقرب انتهاءً</option>
            <option value="price" ${sort === 'price' ? 'selected' : ''}>الأرخص سعرًا</option>
          </select></div>
      </div>
    </div>

    <div class="grid g-side">
      <div>
        <div class="grid g-auto">
          ${rows.length ? rows.slice(0, 24).map(r => {
        const p = PRODUCTS.find(x => x.id === r.productId);
        const save = r.oldPrice - r.price;
        return `<article class="card pad hv rel">
              <span class="ribbon">خصم ${pct(r.disc)}</span>
              <div class="row" style="align-items:flex-start">
                <div class="thumb lg">${p.em}</div>
                <div style="flex:1;min-width:0">
                  <div class="b trunc">${esc(p.name)}</div>
                  <div class="tiny muted mt6"><a href="#/store/${r.st.id}">${esc(r.st.name)}</a> ${r.st.verified ? '✔️' : ''} · ${esc(r.st.area)}</div>
                  <div class="row wrapx gap6 mt6">
                    <span class="badge p">📍 ${kmTxt(r.dist)}</span>
                    <span class="badge ${r.open ? 'ok' : 'ink'}">${r.open ? 'مفتوح الآن' : 'مغلق'}</span>
                    <span class="badge ink">${catOf(r.cat).em} ${catOf(r.cat).ar}</span>
                  </div>
                </div>
              </div>
              <hr class="sep">
              <div class="between">
                <div>
                  <div class="priceline"><span class="price-old num">${nf(r.oldPrice)}</span>${priceHtml(r.price)}</div>
                  <div class="tiny" style="color:var(--acc);font-weight:700">توفير ${egp(save)}${r.offerEnds ? ` · ينتهي خلال ${r.offerEnds} يوم` : ''}</div>
                  <div class="row wrapx gap6 mt6">${trustBadge(r.updatedH)}${r.inStock ? '<span class="badge ok">متوفر</span>' : '<span class="badge bad">غير متوفر</span>'}</div>
                </div>
                <div class="row" style="flex-direction:column;gap:6px;min-width:120px">
                  <button class="btn primary sm2" data-act="wa" data-store="${r.st.id}" data-prod="${r.productId}">اسأل عن العرض</button>
                  <a class="btn sm2" href="#/product/${r.productId}">مقارنة الأسعار</a>
                </div>
              </div>
            </article>`;
      }).join('') : `<div class="card pad center"><div style="font-size:30px">🛍️</div><div class="b mt6">لا توجد عروض مطابقة</div><p class="sm muted">جرّب تقليل أدنى خصم أو توسيع النطاق.</p></div>`}
        </div>
      </div>
      <aside>
        <div class="card pad mb14">
          <div class="b mb10">📊 العروض حسب القسم</div>
          <div class="hbars">
            ${byCat.slice(0, 8).map(x => `<div class="hbar"><span>${x.c.em} ${x.c.ar}</span><span class="num b">${x.n} عرض</span>
              <span class="tr"><i style="width:${Math.round(x.n / byCat[0].n * 100)}%"></i></span></div>`).join('')}
          </div>
        </div>
        <div class="card pad mb14">
          <div class="b mb10">⏳ عروض تنتهي قريبًا</div>
          ${rows.filter(r => r.offerEnds).sort((a, b) => a.offerEnds - b.offerEnds).slice(0, 5).map(r => {
        const p = PRODUCTS.find(x => x.id === r.productId);
        return `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
            <div><div class="sm b trunc" style="max-width:200px">${p.em} ${esc(p.name)}</div>
            <div class="tiny muted">${esc(r.st.name)} · ${kmTxt(r.dist)}</div></div>
            <div class="center"><div class="num b">${egp(r.price)}</div><div class="tiny" style="color:var(--danger)">يتبقى ${r.offerEnds} يوم</div></div>
          </div>`;
      }).join('') || '<p class="tiny muted">لا توجد عروض بموعد انتهاء محدد.</p>'}
        </div>
        <div class="card pad">
          <div class="b mb10">💡 نصيحة</div>
          <p class="tiny muted">الخصم الكبير مش دايمًا الأرخص: قارن السعر بعد الخصم مع متوسط السوق المسجّل قبل ما تقرر، وشوف المسافة والتوفر.</p>
          <button class="btn soft block sm2 mt10" onclick="go('assistant')">جرّب «ماذا أشتري؟» حسب ميزانيتك</button>
        </div>
      </aside>
    </div>
  </div>`);
}
function bindOffers() {
  document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => setParam('cat', b.dataset.cat));
  const m = $('#offMin'); if (m) m.onchange = () => setParam('min', m.value === '0' ? '' : m.value);
  const c = $('#offCity'); if (c) c.onchange = () => setParam('city', c.value);
  const s = $('#offSort'); if (s) s.onchange = () => setParam('sort', s.value);
  const r = $('#offRadius'); if (r) r.onclick = () => openRadius((v) => setParam('dist', v));
}

/* ---------------- 📍 المتاجر القريبة ---------------- */
function nearbyPage() {
  if (REAL.status === 'ready') realEnsureAllInDB();   // روابط صفحة المحل تعمل
  const dist = APP.route.p.dist ? parseFloat(APP.route.p.dist) : 5;
  const cat = APP.route.p.cat || '';
  const openOnly = APP.route.p.open === '1';
  const list = DB.stores.filter(s => !s.real)
    .map(s => Object.assign({}, s, { dist: distKm(LOC, s), open: isOpen(s) }))
    .filter(s => s.dist <= dist && (!cat || s.cats.includes(cat)) && (!openOnly || s.open))
    .sort((a, b) => a.dist - b.dist);
  const nearestByCat = CATS.map(c => {
    const best = DB.stores.filter(s => !s.real).map(s => Object.assign({}, s, { dist: distKm(LOC, s) })).filter(s => s.cats.includes(c.id)).sort((a, b) => a.dist - b.dist)[0];
    return best ? { c, st: best } : null;
  }).filter(Boolean);

  return shell('nearby', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">📍 المتاجر القريبة مني</h1>
      <p>القسم الأساسي ده <b>بحث حقيقي</b> في محلات مسجّلة على أرض الواقع (Google Maps) داخل النطاق اللي تختاره — مش بيانات وهمية.</p></div>
      <button class="btn primary sm2" id="nbLoc">📍 استخدام موقعي</button>
    </div>

    ${realSearchPanel()}
    <div id="realResults">${realNearbySection()}</div>

    <section class="sec" style="margin-top:28px;border-top:1px dashed var(--line);padding-top:24px">
      <div class="sec-head">
        <div><h2>عرض توضيحي: مقارنة الأسعار والعروض</h2>
        <p>القسم ده <b>بيانات تجريبية</b> مبنية لتشبيه السوق المصري، والغرض منه إظهار شكل مقارنة الأسعار وترتيب النتائج في النسخة النهائية — تجارب الواجهة فقط، مش محلات حقيقية.</p></div>
        <span class="badge warn">🧪 بيانات تجريبية</span>
      </div>

      <div class="card pad mb14">
        <div class="between wrapx">
          <div>
            <div class="tiny muted mb6">نطاق العرض التوضيحي (المتاجر التجريبية)</div>
            <div class="row wrapx gap6">
              ${[['0.5', '500 متر'], ['1', '1 كم'], ['3', '3 كم'], ['5', '5 كم'], ['10', '10 كم'], ['25', '25 كم'], ['100', '100 كم']]
      .map(([v, l]) => `<button class="chip ${String(dist) === v ? 'on' : ''}" data-dist="${v}">${l}</button>`).join('')}
            </div>
          </div>
          <div class="row wrapx gap14">
            <label class="switch"><input type="checkbox" id="nbOpen" ${openOnly ? 'checked' : ''}> مفتوح الآن فقط</label>
            <button class="btn sm2" id="nbDemoLoc">📍 غيّر موقع العرض التوضيحي</button>
          </div>
        </div>
        <hr class="sep">
        <div class="scroll-x">
          <button class="chip ${!cat ? 'on' : ''}" data-cat="">كل الأقسام</button>
          ${CATS.filter(c => DB.stores.some(s => !s.real && s.cats.includes(c.id) && distKm(LOC, s) <= dist)).map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.em} ${c.ar}</button>`).join('')}
        </div>
      </div>

      <div class="stats mb14">
        ${statBox('متاجر تجريبية داخل النطاق', `<span class="num">${list.length}</span>`, `من إجمالي ${DB.stores.filter(s => !s.real).length} متجرًا في العرض التوضيحي`)}
        ${statBox('مفتوح الآن', `<span class="num">${list.filter(s => isOpen(s)).length}</span>`, 'حسب المواعيد التجريبية')}
        ${statBox('أقرب متجر تجريبي', list.length ? kmTxt(list[0].dist) : '—', list.length ? esc(list[0].name) : '')}
        ${statBox('محلات حقيقية (للمقارنة)', `<span class="num">${nf(REAL.all.length)}</span>`, REAL.all.length ? 'من Google Maps في النطاق ' + kmTxt(REAL.radiusKm) : 'ابحث فوق لتحميلها')}
      </div>

      <div class="grid g-side">
        <div>
          <div class="sec-head"><div><h2>متاجر تجريبية داخل ${kmTxt(dist)}</h2><p>الأسعار هنا توضيحية لعرض شكل المقارنة — المحلات الحقيقية فوق في قسم البحث الحقيقي</p></div></div>
          <div class="grid g-auto">
            ${list.length ? list.map(s => storeCard(s, { demoTag: true })).join('') : '<div class="card pad">لا توجد متاجر تجريبية في هذا النطاق. جرّب توسيع النطاق.</div>'}
          </div>
        </div>
        <aside>
          <div class="card pad mb14">
            <div class="b mb10">🧭 أقرب متجر تجريبي لكل قسم</div>
            ${nearestByCat.slice(0, 10).map(x => `<div class="between" style="padding:7px 0;border-bottom:1px solid var(--line-2)">
              <div><div class="sm">${x.c.em} <b>${x.c.ar}</b></div>
              <div class="tiny muted"><a href="#/store/${x.st.id}">${esc(x.st.name)}</a></div></div>
              <div class="num sm b">${kmTxt(x.st.dist)}</div></div>`).join('')}
          </div>
          <div class="card pad mb14">
            <div class="b mb10">✅ المحلات الحقيقية فوق</div>
            <p class="tiny muted">الأسماء والمواقع اللي في القسم الأول جايّة من Google Places عبر خادم سوقي — مفيش أي محل مُختلق. الفرصة الوحيدة للنقص: المواعيد أو الأسعار مش دائمًا مسجّلة، وسوقي بتقولها بصراحة بدل ما تخترعها.</p>
            <button class="btn soft block sm2 mt10" id="nbRealGo">🏬 ابحث في المحلات الحقيقية</button>
          </div>
          <div class="card pad">
            <div class="b mb10">💡 ترتيب النتائج</div>
            <p class="tiny muted">القريب مش دايمًا الأفضل: لو فرق السعر كبير، ممكن يستحق تروح للمتجر الأبعد. سوقي بيوريك الفرق بين السعر والمسافة في كل نتيجة.</p>
            <a class="btn soft block sm2 mt10" href="#/search?sort=dist">ابحث ورتّب حسب الأقرب</a>
          </div>
        </aside>
      </div>
    </section>
  </div>`);
}
function bindNearby() {
  const l = $('#nbLoc'); if (l) l.onclick = () => realSearch({ locate: true });
  const dl = $('#nbDemoLoc'); if (dl) dl.onclick = openLocation;
  const rg = $('#nbRealGo'); if (rg) rg.onclick = () => { const el = $('#realLocate'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  document.querySelectorAll('[data-dist]').forEach(b => b.onclick = () => setParam('dist', b.dataset.dist));
  document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => setParam('cat', b.dataset.cat));
  const o = $('#nbOpen'); if (o) o.onchange = () => setParam('open', o.checked ? '1' : '');
  bindRealSearch();
}

/* ---------------- 🏪 دليل المتاجر ---------------- */
function storesPage() {
  const city = APP.route.p.city || '';
  const cat = APP.route.p.cat || '';
  const sort = APP.route.p.sort || 'dist';
  const vf = APP.route.p.vf === '1';
  let list = DB.stores.map(s => Object.assign({}, s, { dist: distKm(LOC, s), open: isOpen(s) }))
    .filter(s => (!city || s.city === city) && (!cat || s.cats.includes(cat)) && (!vf || s.verified));
  list.sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'views' ? b.views - a.views : sort === 'products' ? DB.byStore[b.id].length - DB.byStore[a.id].length : a.dist - b.dist);
  const cities = Array.from(new Set(DB.stores.map(s => s.city)));
  return shell('search', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">🏪 دليل المتاجر</h1><p>${DB.stores.length} متجرًا في ${cities.length} محافظة — ${DB.stores.filter(s => s.verified).length} متجرًا موثقًا</p></div>
      <button class="btn primary sm2" onclick="go('addstore')">➕ أضف متجرك</button>
    </div>
    <div class="card pad mb14">
      <div class="filters">
        <div class="field" style="min-width:160px"><label>المحافظة</label>
          <select class="select" id="stCity"><option value="">كل المحافظات</option>${cities.map(c => `<option ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        <div class="field" style="min-width:160px"><label>القسم</label>
          <select class="select" id="stCat"><option value="">كل الأقسام</option>${CATS.map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.em} ${c.ar}</option>`).join('')}</select></div>
        <div class="field" style="min-width:160px"><label>الترتيب</label>
          <select class="select" id="stSort">
            <option value="dist">الأقرب لي</option><option value="rating" ${sort === 'rating' ? 'selected' : ''}>أعلى تقييم</option>
            <option value="views" ${sort === 'views' ? 'selected' : ''}>الأكثر زيارة</option><option value="products" ${sort === 'products' ? 'selected' : ''}>الأكثر منتجات</option>
          </select></div>
        <label class="switch"><input type="checkbox" id="stVf" ${vf ? 'checked' : ''}> متاجر موثقة فقط ✔️</label>
        <span class="spacer"></span>
        <span class="tiny muted">${list.length} متجرًا</span>
      </div>
    </div>
    <div class="grid g-auto">${list.map(s => storeCard(s)).join('')}</div>
  </div>`);
}
function bindStoresPage() {
  const c = $('#stCity'); if (c) c.onchange = () => setParam('city', c.value);
  const a = $('#stCat'); if (a) a.onchange = () => setParam('cat', a.value);
  const s = $('#stSort'); if (s) s.onchange = () => setParam('sort', s.value);
  const v = $('#stVf'); if (v) v.onchange = () => setParam('vf', v.checked ? '1' : '');
}

/* ---------------- ❤️ المفضلة والتنبيهات ---------------- */
function favoritesPage() {
  const tab = APP.route.p.tab || 'products';
  const stores = APP.fav.stores.map(id => DB.stores.find(s => s.id === id)).filter(Boolean);
  const prods = APP.fav.products.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
  const hits = alertsMatch();
  return shell('favorites', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">❤️ المفضلة والمتابعة</h1><p>${stores.length} متجرًا محفوظًا · ${prods.length} منتجًا متابعًا · ${DB.alerts.length} تنبيه سعر</p></div>
      <button class="btn primary sm2" onclick="go('search')">🔍 ابحث عن المزيد</button>
    </div>

    <div class="card mb14"><div style="padding:6px 14px"><div class="tabs">
      ${[['products', `📦 منتجات أتابعها (${prods.length})`], ['stores', `🏪 متاجري المفضلة (${stores.length})`], ['alerts', `🔔 تنبيهات الأسعار (${DB.alerts.length})`], ['cart', `🛒 قائمة المشتريات (${(load('cart', [])).length})`]]
      .map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/favorites?tab=${k}">${l}</a>`).join('')}
    </div></div>
    <div class="modal-body">
      ${tab === 'products' ? (prods.length ? `<div class="grid g-auto">${prods.map(p => {
      const ls = (DB.byProduct[p.id] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)) })).sort((a, b) => a.price - b.price);
      const best = ls[0];
      const hist = priceHistory(p.id);
      const tr = hist[hist.length - 1].v - hist[0].v;
      return `<article class="card pad hv">
          <div class="row"><div class="thumb lg">${p.em}</div>
          <div style="flex:1;min-width:0"><div class="b trunc">${esc(p.name)}</div>
          <div class="tiny muted">${esc(p.brand)} · ${ls.length} متجرًا مسجّلًا</div>
          <div class="priceline mt6">${best ? priceHtml(best.price) : ''}</div></div>
          <button class="btn sm2" data-act="fav-product" data-prod="${p.id}">🗑️</button></div>
          <hr class="sep">
          <div class="between">
            <div><div class="tiny muted">اتجاه آخر 12 شهرًا</div>
              <div class="sm b" style="color:${tr > 0 ? 'var(--danger)' : 'var(--ok)'}">${tr > 0 ? '▲' : '▼'} ${egp(Math.abs(tr))} (${Math.abs(Math.round(tr / hist[0].v * 100))}%)</div>
              <div class="tiny muted">من ${hist[0].m} إلى ${hist[hist.length - 1].m}</div></div>
            <div class="center"><div class="tiny muted">أقرب متجر</div><div class="sm b">${best ? kmTxt(best.dist) : '—'}</div>
              <div class="tiny muted">${best ? esc(best.st.name) : ''}</div></div>
          </div>
          <div class="row gap6 mt10">
            <a class="btn sm2" href="#/product/${p.id}">مقارنة الأسعار</a>
            <button class="btn sm2" data-act="alert" data-prod="${p.id}">🔔 راقب السعر</button>
            <button class="btn sm2" data-act="cart" data-prod="${p.id}">🛒 أضف للقائمة</button>
          </div>
        </article>`;
    }).join('')}</div>` : emptyState('🤍', 'لا توجد منتجات متابَعة', 'اضغط على «حفظ المنتج» في صفحة أي منتج، وستجده هنا مع جدول أسعاره.', 'ابحث عن منتج', 'search')) : ''}

      ${tab === 'stores' ? (stores.length ? `<div class="grid g-auto">${stores.map(s => storeCard(s)).join('')}</div>`
      : emptyState('🏪', 'لا توجد متاجر محفوظة', 'اضغط 🤍 حفظ في أي متجر لتصله بسرعة بعد كده.', 'تصفّح المتاجر', 'stores')) : ''}

      ${tab === 'alerts' ? `
        <div class="between wrapx mb14">
          <div><div class="b">🔔 تنبيهات السعر</div><div class="tiny muted">نراقب كل المتاجر المسجّلة ونبلّغك لما السعر ينزل تحت الحد الذي تحدده.</div></div>
          <button class="btn primary sm2" id="newAlert">➕ تنبيه جديد</button>
        </div>
        ${DB.alerts.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>المنتج</th><th>الحد المطلوب</th><th>الحالة الحالية</th><th>أرخص متجر الآن</th><th>المسافة</th><th></th></tr></thead><tbody>
          ${DB.alerts.map(a => {
        const p = PRODUCTS.find(x => x.id === a.productId);
        const ls = (DB.byProduct[a.productId] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)) })).sort((x, y) => x.price - y.price);
        const best = ls[0], hit = hits.find(h => h.alert.id === a.id);
        return `<tr class="${hit ? 'win' : ''}">
            <td><div class="td-store"><span class="thumb" style="width:36px;height:36px;font-size:18px;border-radius:10px">${p.em}</span>
              <span><span class="b"><a href="#/product/${p.id}">${esc(p.name)}</a></span><span class="tiny muted" style="display:block">تم إنشاؤه ${when(a.created)}</span></span></div></td>
            <td class="num b">${egp(a.target)}</td>
            <td>${hit ? `<span class="badge ok">✅ تحقق الشرط (${hit.count} متجر)</span>` : `<span class="badge warn">⏳ لسه مراقب</span>`}</td>
            <td class="num">${best ? egp(best.price) : '—'}</td>
            <td class="num">${best ? kmTxt(best.dist) : '—'}<div class="tiny muted">${best ? esc(best.st.name) : ''}</div></td>
            <td><div class="row gap6"><button class="btn sm2" data-act="alert-edit" data-prod="${p.id}">تعديل</button>
              <button class="btn sm2" data-act="alert-del" data-prod="${p.id}">حذف</button></div></td></tr>`;
      }).join('')}
        </tbody></table></div>` : emptyState('🔔', 'لا توجد تنبيهات', 'حدّد سعرًا تريده لأي منتج، وسنراقبه بدلًا عنك.', 'ابدأ من منتج', 'search')}
        <div class="insight info mt14"><span class="ic">🔔</span><div class="sm">مثال على الإشعار: «انخفض السعر — iPhone 15 أصبح متاحًا بسعر 34,000 ج.م في متجر نيل إلكترونيكس، يبعد 2.8 كم، مفتوح الآن».</div></div>`: ''}

      ${tab === 'cart' ? cartView() : ''}
    </div></div>
  </div>`);
}
function emptyState(ic, t, d, btn, route) {
  return `<div class="center" style="padding:26px 10px">
    <div style="font-size:38px">${ic}</div><div class="b mt6">${t}</div>
    <p class="sm muted mt6">${d}</p>
    <button class="btn primary mt14" onclick="go('${route}')">${btn}</button></div>`;
}
function cartView() {
  const cart = load('cart', []);
  if (!cart.length) return emptyState('🛒', 'قائمة المشتريات فارغة', 'أضف المنتجات التي تريد شراءها، وسوقي يحسب أرخص إجمالي ويخبرك إذا كانت في نفس المتجر أم لا.', 'تصفّح المنتجات', 'search');
  const items = cart.map(pid => {
    const p = PRODUCTS.find(x => x.id === pid);
    const ls = (DB.byProduct[pid] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)) })).sort((a, b) => a.price - b.price);
    return { p, best: ls[0], all: ls };
  }).filter(x => x.p && x.best);
  const total = items.reduce((a, x) => a + x.best.price, 0);
  const storeCounts = {};
  items.forEach(x => storeCounts[x.best.st.id] = (storeCounts[x.best.st.id] || 0) + 1);
  const sameStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0];
  const same = sameStore ? DB.stores.find(s => s.id === sameStore[0]) : null;
  const maxDist = Math.max.apply(null, items.map(x => x.best.dist));
  const sameItems = same ? items.filter(x => x.best.st.id === same.id) : [];
  return `
  <div class="between wrapx mb14">
    <div><div class="b">🛒 قائمة مشترياتك</div><div class="tiny muted">أسعار مبنية على أرخص سعر مسجّل لكل منتج</div></div>
    <button class="btn sm2" id="cartClear">🗑️ إفراغ القائمة</button>
  </div>
  <div class="tbl-wrap mb14"><table class="tbl"><thead><tr><th>المنتج</th><th>أرخص سعر</th><th>المتجر</th><th>المسافة</th><th>التوفر</th><th></th></tr></thead><tbody>
    ${items.map(x => `<tr>
      <td><div class="td-store"><span class="thumb" style="width:36px;height:36px;font-size:18px;border-radius:10px">${x.p.em}</span>
      <span class="b">${esc(x.p.name)}</span></div></td>
      <td class="num b">${egp(x.best.price)}</td>
      <td><a href="#/store/${x.best.st.id}">${esc(x.best.st.name)}</a> ${x.best.st.verified ? '✔️' : ''}</td>
      <td class="num">${kmTxt(x.best.dist)}</td>
      <td>${x.best.inStock ? '<span class="badge ok">متوفر</span>' : '<span class="badge bad">غير متوفر</span>'}</td>
      <td><button class="btn sm2" data-act="cart-del" data-prod="${x.p.id}">حذف</button></td></tr>`).join('')}
  </tbody></table></div>
  <div class="grid g-2">
    <div class="panel">
      <div class="between"><span class="b">إجمالي القائمة (أرخص الأسعار)</span><span class="price">${egp(total)}</span></div>
      <hr class="sep">
      <div class="info-item"><span class="ic">🚶</span><span>أقصى مسافة داخل القائمة: <b>${kmTxt(maxDist)}</b> — قد تحتاج زيارة أكثر من متجر.</span></div>
      ${same ? `<div class="info-item mt10"><span class="ic">🏪</span><span>${same.name} عنده <b>${sameItems.length}</b> من ${items.length} منتجات — توفير وقت لو جمعت أكبر عدد ممكن من متجر واحد.</span></div>` : ''}
    </div>
    <div class="panel">
      <div class="b mb10">🧩 بديل: شراء كل شيء من متجر واحد</div>
      ${(() => {
    const cands = DB.stores.map(s => {
      const ls = items.map(x => (DB.byStore[s.id] || []).find(l => l.productId === x.p.id)).filter(Boolean);
      if (ls.length < Math.ceil(items.length * 0.6)) return null;
      const t = ls.reduce((a, l) => a + l.price, 0);
      const avgPrice = items.reduce((a, x) => a + x.best.price, 0) / items.length;
      return { st: s, have: ls.length, total: t + (items.length - ls.length) * avgPrice, dist: distKm(LOC, s) };
    }).filter(Boolean).sort((a, b) => a.total - b.total).slice(0, 3);
    return cands.map(c => `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
        <div><div class="sm b"><a href="#/store/${c.st.id}">${esc(c.st.name)}</a> ${c.st.verified ? '✔️' : ''}</div>
        <div class="tiny muted">عنده ${c.have} من ${items.length} · ${kmTxt(c.dist)}</div></div>
        <div class="num b">${egp(c.total)}</div></div>`).join('') || '<p class="tiny muted">لا يوجد متجر واحد يجمع أغلب القائمة.</p>';
  })()}
      <p class="tiny muted mt10">الإجماليات تقديرية: لو المتجر مش عنده منتج، حسبنا متوسط سعر السوق له لتقدير الفرق.</p>
    </div>
  </div>`;
}
function bindFavorites() {
  const na = $('#newAlert'); if (na) na.onclick = () => openAlertModal('ip15');
  const cc = $('#cartClear'); if (cc) cc.onclick = () => { save('cart', []); render(); toast('تم إفراغ قائمة المشتريات', 'ok', '🗑️'); };
  document.querySelectorAll('[data-act="alert-edit"]').forEach(b => b.onclick = () => openAlertModal(b.dataset.prod, true));
  document.querySelectorAll('[data-act="alert-del"]').forEach(b => b.onclick = () => {
    DB.alerts = DB.alerts.filter(a => a.productId !== b.dataset.prod); render(); toast('تم حذف التنبيه', 'ok', '🗑️');
  });
  document.querySelectorAll('[data-act="cart-del"]').forEach(b => b.onclick = () => {
    const cart = load('cart', []).filter(x => x !== b.dataset.prod); save('cart', cart); render(); toast('تم الحذف من القائمة', 'ok', '🗑️');
  });
  document.querySelectorAll('[data-act="cart"]').forEach(b => b.onclick = () => {
    const cart = load('cart', []); if (!cart.includes(b.dataset.prod)) cart.push(b.dataset.prod);
    save('cart', cart); render(); toast('تمت الإضافة لقائمة المشتريات', 'ok', '🛒');
  });
}

/* ---------------- 👤 حسابي ---------------- */
function accountPage() {
  const cart = load('cart', []);
  const hits = alertsMatch();
  if (!APP.user) {
    return shell('account', `
    <div class="wrap" style="padding-top:22px">
      <div class="grid g-side">
        <div class="card pad">
          <h1 style="font-size:23px">حسابك على سوقي</h1>
          <p class="sm muted mt10">سجّل الدخول لحفظ المتاجر والمنتجات، متابعة الأسعار، إنشاء قائمة مشتريات، واستقبال تنبيهات انخفاض السعر.</p>
          <div class="grid g-4 mt18">
            ${[['❤️', 'مفضلة المتاجر والمنتجات'], ['🔔', 'تنبيهات تغيّر السعر'], ['🛒', 'قائمة مشتريات بأسعار السوق'], ['📍', 'عناوين محفوظة']].map(([i, t]) => `<div class="stat"><div class="l">${i}</div><div class="b sm mt6">${t}</div></div>`).join('')}
          </div>
          <button class="btn primary lg mt18" id="accLogin">📱 الدخول برقم الموبايل</button>
          <p class="tiny muted mt10">نموذج تجريبي: أي رقم موبايل يعمل، وكود التحقق يظهر على الشاشة.</p>
        </div>
        <aside class="card pad">
          <h3 style="font-size:17px">تجربة سريعة بدون حساب</h3>
          <div class="info-list mt14">
            <div class="info-item"><span class="ic">🔍</span><span><a href="#/search">ابحث عن منتج</a> ومقارنة أسعاره</span></div>
            <div class="info-item"><span class="ic">🗺️</span><span><a href="#/nearby">شوف المتاجر القريبة</a> على الخريطة</span></div>
            <div class="info-item"><span class="ic">🔥</span><span><a href="#/offers">تصفّح العروض</a> في نطاقك</span></div>
            <div class="info-item"><span class="ic">🤔</span><span><a href="#/assistant">ماذا أشتري</a> بميزانيتك؟</span></div>
          </div>
        </aside>
      </div>
    </div>`);
  }
  const u = APP.user;
  const reports = DB.reports.slice(0, 3);
  return shell('account', `
  <div class="wrap" style="padding-top:22px">
    <div class="card pad mb14">
      <div class="row wrapx between">
        <div class="row">
          <span class="avatar" style="width:54px;height:54px;font-size:22px">${esc(u.name[0])}</span>
          <div><div class="b" style="font-size:18px">${esc(u.name)}</div>
          <div class="tiny muted">${esc(u.phone)} · ${esc(APP.loc.city)} · عضو منذ ${u.since}</div></div>
        </div>
        <div class="row gap6">
          <button class="btn sm2" id="accLoc">📍 تغيير الموقع</button>
          <button class="btn sm2" id="accOut">خروج</button>
        </div>
      </div>
      <hr class="sep">
      <div class="stats">
        ${statBox('متاجر محفوظة', APP.fav.stores.length, 'في المفضلة')}
        ${statBox('منتجات متابَعة', APP.fav.products.length, 'مع تتبع السعر')}
        ${statBox('تنبيهات نشطة', DB.alerts.length + (hits.length ? ` <span class="badge ok">${hits.length} تحقق</span>` : ''), 'راقب السعر')}
        ${statBox('قائمة المشتريات', cart.length, 'منتجات')}
      </div>
    </div>
    <div class="grid g-side">
      <div>
        <div class="card pad mb14">
          <div class="between mb10"><div class="b">🔍 عمليات البحث المحفوظة</div><button class="btn sm2" onclick="go('search')">بحث جديد</button></div>
          ${APP.history.map(h => `<div class="between" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
            <div><a class="sm b" href="#/search?q=${encodeURIComponent(h.q)}">${esc(h.q)}</a><div class="tiny muted">${esc(h.at)}</div></div>
            <div class="row gap6"><button class="btn sm2" onclick="runSaved('${esc(h.q)}')">تشغيل</button>
            <button class="btn sm2" onclick="delSaved('${esc(h.q)}')">حذف</button></div></div>`).join('') || '<p class="tiny muted">لا يوجد سجل بحث.</p>'}
        </div>
        <div class="card pad">
          <div class="b mb10">🚨 بلاغاتي</div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>النوع</th><th>الهدف</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
            ${reports.map(r => `<tr><td>${esc(r.type)}</td><td class="sm">${esc(r.target)}</td>
              <td><span class="badge ${r.status === 'جديد' ? 'warn' : r.status === 'تم' ? 'ok' : 'info'}">${esc(r.status)}</span></td>
              <td class="tiny muted">${esc(r.at)}</td></tr>`).join('')}
          </tbody></table></div>
          <button class="btn sm2 mt14" id="accReport">🚨 إرسال بلاغ جديد</button>
        </div>
      </div>
      <aside>
        <div class="card pad mb14">
          <div class="b mb10">⚙️ الإعدادات</div>
          <label class="switch mb10"><input type="checkbox" checked> تنبيهات انخفاض السعر</label>
          <label class="switch mb10"><input type="checkbox" checked> تنبيهات العروض القريبة</label>
          <label class="switch mb10"><input type="checkbox"> إشعارات المتاجر الجديدة في منطقتي</label>
          <hr class="sep">
          <div class="field"><label>نطاق البحث الافتراضي</label>
            <select class="select" id="accRadius">${[1, 3, 5, 10, 25, 50].map(v => `<option value="${v}" ${APP.radius == v ? 'selected' : ''}>${v} كم</option>`).join('')}</select></div>
          <div class="field mt10"><label>ترتيب النتائج الافتراضي</label>
            <select class="select"><option>الترتيب الذكي</option><option>الأرخص</option><option>الأقرب</option></select></div>
        </div>
        <div class="card pad">
          <div class="b mb10">🔔 آخر ما تحقق من تنبيهاتك</div>
          ${hits.length ? hits.map(h => {
    const p = PRODUCTS.find(x => x.id === h.alert.productId);
    return `<div class="insight ok mb6"><span class="ic">${p.em}</span><div class="sm"><b>${esc(p.name)}</b> أصبح بسعر <b>${egp(h.best.price)}</b><br>
        <span class="tiny muted">في ${esc(h.best.st.name)} — ${kmTxt(distKm(LOC, h.best.st))} · ${h.best.st.open || isOpen(h.best.st) ? 'مفتوح' : 'مغلق'}</span></div></div>`;
  }).join('') : '<p class="tiny muted">لا شيء بعد — هنبلّغك أول ما ينزل السعر.</p>'}
        </div>
      </aside>
    </div>
  </div>`);
}
function runSaved(q) { go('search', { q }); }
function delSaved(q) { APP.history = APP.history.filter(h => h.q !== q); save('history', APP.history); render(); }
function bindAccount() {
  document.querySelectorAll('#accLogin,#loginBtn').forEach(b => { if (b) b.onclick = openLogin; });
  const o = $('#accOut'); if (o) o.onclick = () => { APP.user = null; save('user', null); render(); toast('تم تسجيل الخروج', 'ok', '👋'); };
  const l = $('#accLoc'); if (l) l.onclick = openLocation;
  const r = $('#accReport'); if (r) r.onclick = () => openReportModal();
  const rr = $('#accRadius'); if (rr) rr.onchange = () => { APP.radius = +rr.value; save('radius', APP.radius); toast('تم حفظ النطاق الافتراضي', 'ok', '⚙️'); };
}
