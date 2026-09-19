/* =========================================================================
   الجزء 5: صفحات البحث والمنتج والمتجر والعروض والقريب والمفضلة والحساب
   ========================================================================= */

function setParam(k, v) {
  const p = Object.assign({}, APP.route.p);
  if (v == null || v === '') delete p[k]; else p[k] = v;
  go(APP.route.name, p);
}
function resultsPage() {
  const q = APP.route.p.q || '';
  const cat = APP.route.p.cat || '';
  const city = APP.route.p.city || '';
  const sort = APP.route.p.sort || '';
  const view = APP.route.p.view || 'cards';
  const dist = APP.route.p.dist ? parseFloat(APP.route.p.dist) : 0;
  const openNow = APP.route.p.open === '1';
  const stock = APP.route.p.stock === '1';
  const off = APP.route.p.off === '1';

  const res = searchListings(q || (cat ? catOf(cat).ar : ''), {
    center: LOC, sort: sort || undefined, maxDist: dist || undefined,
    openNow, inStock: stock, onlyOffers: off, cat: cat || undefined, city: city || undefined
  });
  const parsed = res.parsed;
  const product = parsed.product && !cat ? parsed.product : null;
  const unknown = !!(parsed.unknown && !cat && !parsed.stores.length);
  const rows = unknown ? [] : res.rows;
  const a = analyze(rows, product ? 'product' : 'store');
  const title = product ? product.name : (cat ? catOf(cat).ar : (q || 'كل المتاجر'));
  const radius = dist || parsed.radiusK || 0;

  /* ---------- 1. شريط البحث + فهم الطلب ---------- */
  const searchBar = `
    <div class="card pad mb14">
      <div class="searchbig" style="margin:0;box-shadow:none;background:var(--surface-2);border:1px solid var(--line)">
        <label class="f"><span style="font-size:18px">🔍</span>
          <input id="resQ" value="${esc(q)}" placeholder="اكتب طلبك بالعامية: موبايل سامسونج تحت 20000 قريب مني"></label>
        <button class="geo" id="resGeo">📍 ${esc(APP.loc.label)}</button>
        <button class="go" id="resGo">ابحث</button>
      </div>
      <div id="parseLive" class="mt10"></div>
    </div>`;

  const parsedChips = [
    parsed.product ? chip('المنتج', esc(parsed.product.name)) : '',
    parsed.cat ? chip('القسم', parsed.cat.em + ' ' + parsed.cat.ar) : '',
    parsed.brand ? chip('الماركة', esc(parsed.brand)) : '',
    parsed.max != null ? chip('أقصى سعر', '<span class="num">' + egp(parsed.max) + '</span>') : '',
    parsed.min != null ? chip('أدنى سعر', '<span class="num">' + egp(parsed.min) + '</span>') : '',
    parsed.radiusK ? chip('النطاق', kmTxt(parsed.radiusK)) : '',
    parsed.near ? chip('المكان', 'قريب مني (' + esc(APP.loc.label) + ')') : '',
    parsed.city ? chip('المحافظة', esc(parsed.city)) : '',
    parsed.area ? chip('المنطقة', esc(parsed.area)) : '',
    parsed.openNow ? chip('الحالة', 'مفتوح الآن فقط') : '',
    parsed.discountMin ? chip('خصم لا يقل عن', pct(parsed.discountMin)) : ''
  ].filter(Boolean).join('');

  const understandPanel = (!parsed.used || unknown || !parsedChips) ? '' : `
    <div class="card pad mb14">
      <div class="between wrapx mb10">
        <div class="b sm">🧠 فهمنا من طلبك</div>
        <span class="tiny muted">الفلاتر مستخرجة من جملتك — وكل الأسعار من قاعدة بيانات المتاجر فقط</span>
      </div>
      <div class="parsed">${parsedChips}</div>
    </div>`;

  /* ---------- 2. الملاحظات الذكية ---------- */
  const notes = [];
  if (parsed.notes.indexOf('over-budget') >= 0) {
    notes.push(`<div class="insight warn mb14"><span class="ic">💸</span><div class="sm">
      <b>«${esc(parsed.productNamed)}» خارج ميزانيتك</b> — أقل سعر مسجّل له ${egp(parsed.productNamedMin)}${parsed.max != null ? ' وأنت حدّدت ' + egp(parsed.max) : ''}.
      بدلًا من عرض نتيجة غير مناسبة، نعرض أقرب البدائل داخل قسم ${esc(parsed.cat ? parsed.cat.ar : '')}.
      <div class="mt6"><button class="btn sm2" onclick="setParam('q','${esc(parsed.productNamed)}');setParam('max','');">اعرض كل أسعار المنتج</button></div>
    </div></div>`);
  }
  if (res.fallback) {
    notes.push(`<div class="insight info mb14"><span class="ic">🔄</span><div class="sm">لا يوجد «${esc(product ? product.name : 'المنتج')}» مطابق للشروط في المتاجر المسجلة حاليًا — نعرض بدائل من نفس القسم${parsed.max != null ? ' وداخل ميزانية ' + egp(parsed.max) : ''}.</div></div>`);
  }
  if (parsed.radiusK && !dist) {
    notes.push(`<div class="insight info mb14"><span class="ic">📍</span><div class="sm">طبّقنا النطاق المذكور في طلبك: ${kmTxt(parsed.radiusK)} حول ${esc(APP.loc.label)}. <button class="btn sm2" onclick="setParam('q','${esc(parsed.productNamed || q)}')">إلغاء النطاق والبحث في كل مصر</button></div></div>`);
  }

  /* ---------- 3. لوحة التحليل ---------- */
  const analysisPanel = !a ? '' : `
    <div class="panel dark mb14">
      <div class="between wrapx mb14">
        <div><h2 style="font-size:19px">نتائج «${esc(title)}»</h2>
        <p class="sm" style="color:#D2B4BE;max-width:760px;margin-top:6px">${a.text}</p></div>
        <div class="row gap6">
          <button class="btn sm2" id="alertBtnTop" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);color:#fff">🔔 راقب السعر</button>
          <button class="btn sm2" id="reportBtnTop" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);color:#fff">🚨 إبلاغ</button>
        </div>
      </div>
      <div class="stats">
        ${statBox('أقل سعر مسجّل', '<span style="color:#F6C4D3">' + egp(a.mn) + '</span>', product ? 'أعلى سعر ' + egp(a.mx) + ' — فرق ' + pct(a.savePct) : 'في ' + a.stores + ' متجرًا')}
        ${statBox('أقرب متجر', kmTxt(a.near.dist), esc(a.near.st.name))}
        ${statBox('أكبر خصم', a.offer.disc ? pct(a.offer.disc) : '—', a.offer.disc ? esc(a.offer.st.name) : 'لا يوجد خصم مسجّل')}
        ${statBox('مفتوح الآن', a.openN + ' من ' + a.n, 'متوسط تقييم المتاجر ' + a.avgRating.toFixed(1) + ' ★')}
        ${statBox('أسعار محدثة', a.fresh + ' خلال 24 ساعة', a.stale ? a.stale + ' سعرًا يحتاج تحديثًا' : 'كل الأسعار حديثة')}
      </div>
    </div>`;

  /* ---------- 4. الفلاتر ---------- */
  const filtersCard = `
    <div class="card pad mb14">
      <div class="between wrapx gap14">
        <div class="scroll-x" style="flex:1">
          ${[['', '✨ الترتيب الذكي'], ['price', '💰 الأرخص'], ['dist', '📍 الأقرب'], ['disc', '🔥 أكبر خصم'], ['rating', '⭐ أعلى تقييم'], ['fresh', '🕐 الأحدث تحديثًا']]
      .map(([k, l]) => `<button class="chip ${(sort || '') === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}
        </div>
        <div class="row gap6">
          ${[['cards', '▦ كروت'], ['table', '☰ جدول'], ['map', '🗺️ خريطة']].map(([k, l]) => `<button class="btn sm2 ${view === k ? 'primary' : ''}" data-view="${k}">${l}</button>`).join('')}
        </div>
      </div>
      <hr class="sep">
      <div class="filters">
        <div class="field" style="min-width:150px"><label>النطاق الجغرافي</label>
          <select class="select" id="fDist">
            ${[['', 'كل مصر'], ['1', '1 كم'], ['3', '3 كم'], ['5', '5 كم'], ['10', '10 كم'], ['25', '25 كم'], ['100', '100 كم']]
      .map(([v, l]) => `<option value="${v}" ${String(dist || '') === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        <div class="field" style="min-width:150px"><label>المحافظة</label>
          <select class="select" id="fCity"><option value="">كل المحافظات</option>
            ${Array.from(new Set(DB.stores.map(s => s.city))).map(c => `<option value="${esc(c)}" ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select></div>
        <div class="field" style="min-width:150px"><label>القسم</label>
          <select class="select" id="fCat"><option value="">كل الأقسام</option>
            ${CATS.map(c => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${c.em} ${c.ar}</option>`).join('')}
          </select></div>
        <label class="switch"><input type="checkbox" id="fOpen" ${openNow ? 'checked' : ''}> مفتوح الآن</label>
        <label class="switch"><input type="checkbox" id="fStock" ${stock ? 'checked' : ''}> متوفر فقط</label>
        <label class="switch"><input type="checkbox" id="fOff" ${off ? 'checked' : ''}> عروض فقط</label>
        <span class="spacer"></span>
        <span class="tiny muted">${rows.length} نتيجة${a ? ' — متوسط السعر ' + egp(a.avg) : ''}${radius ? ' داخل ' + kmTxt(radius) : ''}</span>
      </div>
    </div>`;

  const storeMatches = !parsed.stores.length ? '' : `
    <div class="card pad mb14">
      <div class="b mb10">🏪 متاجر مطابقة لما كتبته</div>
      <div class="grid g-4">${parsed.stores.map(st => storeCard(st)).join('')}</div>
    </div>`;

  /* ---------- 5. النتائج ---------- */
  const unknownCard = !unknown ? '' : `
    <div class="card pad mb14">
      <div class="between wrapx mb14">
        <div><div class="b" style="font-size:17px">🔍 مفيش منتج أو قسم واضح في «${esc(q)}»</div>
        <p class="sm muted mt6">سوقي يبحث في المنتجات المسجّلة فعليًا، ويفهم كذلك الجمل الطبيعية. اكتب مثل: «سماعة JBL تحت 3000 جنيه قريبة مني».</p></div>
        <button class="btn sm2" onclick="go('assistant')">🤔 جرّب «ماذا أشتري؟»</button>
      </div>
      <div class="b sm mb10">اختار قسمًا وابدأ منه</div>
      <div class="grid g-cats">${CATS.map(c => `<a class="cat" href="#/search?cat=${c.id}"><span class="ic">${c.em}</span><span class="nm">${c.ar}</span></a>`).join('')}</div>
      <hr class="sep">
      <div class="b sm mb10">أكثر ما يبحث عنه المستخدمون</div>
      <div class="chips">${DB.trending.map(t => `<a class="chip" href="#/search?q=${encodeURIComponent(t.k)}">🔎 ${esc(t.k)}</a>`).join('')}</div>
    </div>`;

  const emptyCard = (rows.length || unknown) ? '' : `
    <div class="card pad center mb14">
      <div style="font-size:34px">🔍</div>
      <div class="b mt6">لا توجد نتائج مطابقة للشروط الحالية</div>
      <p class="sm muted mt6">جرّب توسيع النطاق، أو إلغاء فلتر «مفتوح الآن»، أو البحث بكلمة أعم مثل «موبايل» أو «سماعة».</p>
      <div class="row center wrapx gap6 mt14" style="justify-content:center">
        <button class="btn sm2" onclick="setParam('dist','')">إلغاء النطاق</button>
        <button class="btn sm2" onclick="setParam('open','')">إلغاء «مفتوح الآن»</button>
        <button class="btn sm2" onclick="setParam('stock','')">إلغاء «متوفر فقط»</button>
        <button class="btn sm2" onclick="setParam('off','')">إلغاء «عروض فقط»</button>
      </div>
    </div>`;

  let results = '';
  if (view === 'table' && rows.length) results = comparisonTable(rows, { product });
  if (view === 'map' && rows.length) results = '<div class="mapbox mb14">' + radialMap(rows, radius || 25, 470) + '</div>';
  if (view === 'cards' && rows.length) {
    const minPrice = a ? a.mn : 0;
    results = '<div class="grid g-auto">' + rows.slice(0, 60).map(r => listingCard(r, { best: r.price === minPrice })).join('') + '</div>';
  }
  const moreNote = rows.length > 60 ? `<p class="center tiny muted mt14">تم عرض أول 60 نتيجة من ${rows.length} — استخدم الفلاتر لتضييق النتائج.</p>` : '';

  /* ---------- 6. مقترحات إضافية ---------- */
  const relCat = product ? product.cat : (cat || (parsed.cat ? parsed.cat.id : null));
  const relProducts = relCat ? PRODUCTS.filter(p => p.cat === relCat && (!product || p.id !== product.id) && (DB.byProduct[p.id] || []).length).slice(0, 6) : [];
  const relSection = !relProducts.length ? '' : `
    <section class="sec">
      <div class="sec-head"><div><h2>منتجات أخرى في نفس القسم</h2><p>اضغط على أي منتج لمشاهدة مقارنة أسعاره في المتاجر المسجّلة</p></div></div>
      <div class="grid g-4">
        ${relProducts.map(p => {
    const ls = DB.byProduct[p.id] || [];
    const mn = Math.min.apply(null, ls.map(l => l.price));
    return `<a class="card pad hv" href="#/product/${p.id}">
        <div class="thumb lg">${p.em}</div>
        <div class="b mt10">${esc(p.name)}</div>
        <div class="tiny muted mt6">${esc(p.brand)} · ${ls.length} متجرًا</div>
        <div class="priceline mt6">${priceHtml(mn)}</div></a>`;
  }).join('')}
      </div>
    </section>`;

  const nearbyStores = DB.stores.map(s => Object.assign({}, s, { dist: distKm(LOC, s) })).sort((x, y) => x.dist - y.dist).slice(0, 4);

  return shell('search', `
  <div class="wrap" style="padding-top:22px">
    <div class="row wrapx gap6 tiny muted mb10">
      <a href="#/home">الرئيسية</a><span>›</span><a href="#/search">البحث</a>
      ${parsed.cat ? `<span>›</span><a href="#/search?cat=${parsed.cat.id}">${parsed.cat.ar}</a>` : ''}
      ${q ? `<span>›</span><span>«${esc(q)}»</span>` : ''}
    </div>
    ${searchBar}
    ${realSearchStrip(q || catOf(cat).ar || '')}
    ${understandPanel}
    ${notes.join('')}
    ${analysisPanel}
    ${view === 'cards' && a ? recommendCard(rows) : ''}
    ${storeMatches}
    ${unknownCard}
    ${!unknown ? filtersCard : ''}
    ${emptyCard}
    ${results}
    ${moreNote}
    ${relSection}
    <section class="sec">
      <div class="sec-head"><div><h2>🏪 متاجر قريبة منك</h2><p>لو المنتج مش متوفر، فيه متاجر قريبة يمكن تسألها</p></div>
      <a class="btn sm2" href="#/stores">دليل المتاجر ←</a></div>
      <div class="grid g-4">${nearbyStores.map(s => storeCard(s)).join('')}</div>
    </section>
  </div>`);
}
function chip(l, v) { return `<span class="pf"><span class="lbl">${l}</span><b>${v}</b></span>`; }
/* توصية سوقي: أفضل 3 خيارات مع سبب واضح لكل خيار */
function recommendCard(rows) {
  if (rows.length < 2) return '';
  const prices = rows.map(r => r.price);
  const mn = Math.min.apply(null, prices), mx = Math.max.apply(null, prices);
  const scored = rows.map(r => {
    const sp = mx === mn ? 1 : 1 - (r.price - mn) / (mx - mn);
    const sd = 1 / (1 + r.dist / 3);
    const sdisc = clamp(r.disc / 30, 0, 1);
    const srate = clamp((r.st.rating - 3.4) / 1.6, 0, 1);
    const sfresh = r.updatedH < 24 ? 1 : r.updatedH < 96 ? .6 : .2;
    return { r, v: sp * .44 + sd * .22 + sdisc * .13 + srate * .11 + sfresh * .10 + (r.inStock ? .04 : 0) };
  }).sort((a, b) => b.v - a.v);
  const seen = {}, top = [];
  scored.forEach(x => { if (top.length < 3 && !seen[x.r.storeId]) { seen[x.r.storeId] = 1; top.push(x.r); } });
  const reason = (r, i) => {
    const why = [];
    if (r.price === mn) why.push('أرخص سعر مسجّل');
    else why.push('أعلى من الأرخص بـ ' + egp(r.price - mn));
    if (r.dist <= 3) why.push('قريب جدًا (' + kmTxt(r.dist) + ')');
    else why.push(kmTxt(r.dist) + ' منك');
    if (r.disc) why.push('خصم ' + pct(r.disc));
    if (r.updatedH < 24) why.push('سعر محدث خلال 24 ساعة');
    if (r.st.verified) why.push('متجر موثق ✔️');
    if (r.open) why.push('مفتوح الآن');
    if (r.inStock) why.push('متوفر');
    return why;
  };
  const label = ['الأفضل توازنًا', 'الأوفر في الوقت', 'خيار بديل'];
  return `
  <div class="card pad mb14" style="border-color:#EBD3DB;background:linear-gradient(180deg,#FDF7F9,#fff 55%)">
    <div class="between wrapx mb14">
      <div><div class="b" style="font-size:16px">✨ توصية سوقي</div>
      <div class="tiny muted">ترتيب يوازن بين السعر والمسافة والخصم والتقييم وحداثة السعر — بدون تحيّز لأي متجر.</div></div>
      <span class="badge p">${rows.length} خيارًا متاحًا</span>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
      ${top.map((r, i) => `
      <div class="panel" style="border-color:${i === 0 ? 'var(--p)' : 'var(--line)'}">
        <div class="between"><span class="badge ${i === 0 ? 'p' : 'ink'}">${label[i]}</span>
          <span class="tiny muted">${r.st.rating.toFixed(1)} ★</span></div>
        <div class="b mt10"><a href="#/store/${r.st.id}">${esc(r.st.name)}</a> ${r.st.verified ? '<span class="vf">✔️</span>' : ''}</div>
        <div class="priceline mt6">${priceHtml(r.price)} ${r.oldPrice ? `<span class="price-old num">${nf(r.oldPrice)}</span>` : ''}</div>
        <div class="chips mt10">${reason(r, i).map(t => `<span class="badge ink">${esc(t)}</span>`).join('')}</div>
        <div class="row gap6 mt10">
          <button class="btn primary sm2" data-act="wa" data-store="${r.st.id}" data-prod="${r.productId}">واتساب</button>
          <button class="btn sm2" data-act="dirs" data-store="${r.st.id}">🧭 الاتجاهات</button>
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

function comparisonTable(rows, o) {
  o = o || {};
  const mn = Math.min.apply(null, rows.map(r => r.price));
  const fields = [
    ['price', 'السعر'], ['disc', 'الخصم'], ['dist', 'المسافة'], ['rating', 'التقييم'], ['fresh', 'آخر تحديث']
  ];
  return `
  <div class="card mb14">
    <div class="between wrapx" style="padding:14px 16px">
      <div><div class="b">☰ جدول مقارنة الأسعار</div><div class="tiny muted">${o.product ? esc(o.product.name) + ' — ' : ''}اضغط على عنوان العمود لإعادة الترتيب</div></div>
      <div class="row gap6">${fields.map(([k, l]) => `<button class="chip ${APP.route.p.sort === k ? 'on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
    </div>
    <div class="tbl-wrap" style="border-radius:0;border-inline:0;border-bottom:0">
      <table class="tbl">
        <thead><tr>
          <th>المتجر</th><th>السعر المسجّل</th><th>الخصم</th><th>المسافة</th><th>الحالة</th><th>التوفر</th><th>آخر تحديث</th><th>إجراءات</th>
        </tr></thead>
        <tbody>
        ${rows.slice(0, 40).map(r => `
          <tr class="${r.price === mn ? 'win' : ''}">
            <td><div class="td-store">
              <span class="thumb" style="width:36px;height:36px;font-size:18px;border-radius:10px">${catOf(r.st.cats[0]).em}</span>
              <span><span class="b"><a href="#/store/${r.st.id}">${esc(r.st.name)}</a>${r.st.verified ? ' <span class="vf">✔️</span>' : ''}</span>
              <span class="tiny muted" style="display:block">${esc(r.st.area)} — ${esc(r.st.city)}</span></span></div></td>
            <td class="num"><b style="font-size:15px">${nf(r.price)}</b> <span class="cur">ج.م</span>
              ${r.oldPrice ? `<div class="tiny muted"><s>${nf(r.oldPrice)}</s></div>` : ''}
              ${r.price === mn ? '<div class="badge ok mt6">أرخص سعر</div>' : ''}</td>
            <td>${r.disc ? `<span class="badge acc">${pct(r.disc)}</span>` : '<span class="muted">—</span>'}
              ${r.offerEnds ? `<div class="tiny muted">ينتهي خلال ${r.offerEnds} يوم</div>` : ''}</td>
            <td class="num">${kmTxt(r.dist)}<div class="tiny muted">${r.dist < 25 ? '≈ ' + etaMin(r.dist) + ' د بالسيارة' : 'خارج النطاق المحلي'}</div></td>
            <td>${r.open ? '<span class="badge ok"><i class="dot g"></i> مفتوح</span>' : '<span class="badge ink">مغلق</span>'}
              <div class="tiny muted">${hoursTxt(r.st)}</div></td>
            <td>${r.inStock ? '<span class="badge p">متوفر</span>' : '<span class="badge bad">غير متوفر</span>'}
              ${r.warranty ? `<div class="tiny muted">ضمان ${esc(r.warranty)}</div>` : ''}</td>
            <td>${trustBadge(r.updatedH)}</td>
            <td><div class="row gap6">
              <button class="btn primary sm2" data-act="wa" data-store="${r.st.id}" data-prod="${r.productId}">واتساب</button>
              <button class="btn sm2" data-act="dirs" data-store="${r.st.id}">🧭</button>
            </div></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px" class="tiny muted">الأسعار المعروضة هي آخر سعر سجّله المتجر على المنصة. عند الزيارة، تأكد من السعر النهائي مع المتجر.</div>
  </div>`;
}

/* ---------------- صفحة المنتج ---------------- */
function productPage() {
  const pid = APP.route.p.id || APP.route.p.pid;
  const p = PRODUCTS.find(x => x.id === pid) || PRODUCTS[0];
  const rows = (DB.byProduct[p.id] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)), open: isOpen(DB.stores.find(s => s.id === l.storeId)) }));
  const rowsSorted = rows.slice().sort((a, b) => a.price - b.price);
  const a = analyze(rowsSorted, 'product');
  const hist = priceHistory(p.id);
  const tab = APP.route.p.tab || 'prices';
  const watched = APP.fav.products.includes(p.id);
  const alert = DB.alerts.find(x => x.productId === p.id);

  return shell('search', `
  <div class="wrap" style="padding-top:22px">
    <div class="row wrapx gap6 tiny muted mb10">
      <a href="#/home">الرئيسية</a><span>›</span>
      <a href="#/search?cat=${p.cat}">${catOf(p.cat).ar}</a><span>›</span>
      <a href="#/search?q=${encodeURIComponent(p.name)}">${esc(p.name)}</a>
    </div>
    <div class="grid g-side">
      <div>
        <div class="card pad mb14">
          <div class="row wrapx" style="align-items:flex-start">
            <div class="thumb" style="width:96px;height:96px;font-size:46px;border-radius:20px">${p.em}</div>
            <div style="flex:1;min-width:220px">
              <h1 style="font-size:22px">${esc(p.name)}</h1>
              <div class="row wrapx gap6 mt10">
                <span class="badge ink">${esc(p.brand)}</span>
                <span class="badge p">${catOf(p.cat).em} ${catOf(p.cat).ar}</span>
                ${a ? `<span class="badge ok">${a.stores} متجر مسجّل</span>` : ''}
                ${a && a.stale ? `<span class="badge warn">${a.stale} سعرًا يحتاج تحديثًا</span>` : ''}
              </div>
              ${a ? `<div class="row wrapx gap14 mt14">
                <div><div class="tiny muted">أقل سعر مسجّل</div><div class="priceline">${priceHtml(a.mn)}</div></div>
                <div><div class="tiny muted">أعلى سعر</div><div class="price" style="font-size:17px;color:var(--muted)">${egp(a.mx)}</div></div>
                <div><div class="tiny muted">الفرق بين المتاجر</div><div class="price" style="font-size:17px;color:var(--acc)">${egp(a.saving)} (${pct(a.savePct)})</div></div>
                <div><div class="tiny muted">متوسط السوق المسجّل</div><div class="price" style="font-size:17px">${egp(a.avg)}</div></div>
              </div>`: ''}
              <div class="row wrapx gap6 mt14">
                <button class="btn primary" data-act="alert" data-prod="${p.id}">🔔 ${alert ? 'تعديل التنبيه' : 'راقب السعر'}</button>
                <button class="btn ${watched ? 'soft' : ''}" data-act="fav-product" data-prod="${p.id}">${watched ? '❤️ في المفضلة' : '🤍 حفظ المنتج'}</button>
                <button class="btn" data-act="cart" data-prod="${p.id}">🛒 أضف لقائمة المشتريات</button>
                <button class="btn" data-act="report" data-prod="${p.id}" data-store="${rowsSorted[0] ? rowsSorted[0].st.id : ''}">🚨 إبلاغ عن سعر</button>
                <button class="btn" id="shareBtn">🔗 مشاركة</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="padding:6px 14px"><div class="tabs">
            ${[['prices', '💰 أفضل الأسعار'], ['table', '☰ مقارنة'], ['map', '🗺️ الخريطة'], ['hist', '📊 تاريخ السعر'], ['info', '📋 تفاصيل المنتج']]
      .map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/product/${p.id}?tab=${k}">${l}</a>`).join('')}
          </div></div>
          <div class="modal-body">
            ${tab === 'prices' ? (rowsSorted.length ? `<div class="grid g-auto">${rowsSorted.slice(0, 12).map((r, i) => listingCard(r, { best: i === 0 })).join('')}</div>` : '<p class="muted">لا توجد أسعار مسجلة لهذا المنتج بعد.</p>') : ''}
            ${tab === 'table' ? comparisonTable(rowsSorted, { product: p }) : ''}
            ${tab === 'map' ? `<div class="mapbox">${radialMap(rowsSorted, Math.min(50, Math.max(5, Math.ceil(a ? a.near.dist + 2 : 10))), 470)}</div>
              <p class="tiny muted mt10">المسافات محسوبة من موقعك الحالي (${esc(APP.loc.label)}) على خط مستقيم، وقد تختلف قليلًا عن مسار الطريق.</p>`: ''}
            ${tab === 'hist' ? `
              <div class="between wrapx mb14">
                <div><div class="b">📊 تاريخ سعر ${esc(p.name)}</div><div class="tiny muted">آخر 12 شهرًا حسب الأسعار المسجلة على المنصة (أقل سعر في السوق لكل شهر)</div></div>
                <div class="badge ${hist[hist.length - 1].v <= hist[0].v ? 'ok' : 'acc'}">${hist[hist.length - 1].v <= hist[0].v ? 'اتجاه نازل' : 'اتجاه صاعد'} ${Math.abs(Math.round((hist[hist.length - 1].v / hist[0].v - 1) * 100))}% خلال سنة</div>
              </div>
              ${lineChart(hist, { h: 230, id: 'hist' })}
              <div class="tbl-wrap mt14">
                <table class="tbl"><thead><tr><th>الشهر</th><th>أقل سعر مسجّل</th><th>التغيّر</th></tr></thead><tbody>
                ${hist.map((h, i) => {
        const prev = i ? hist[i - 1].v : h.v, d = h.v - prev;
        return `<tr><td>${h.m}</td><td class="num">${nf(h.v)} ج.م</td>
                  <td class="num ${d > 0 ? '' : ''}" style="color:${d > 0 ? 'var(--danger)' : d < 0 ? 'var(--ok)' : 'var(--muted)'}">${d === 0 ? '—' : (d > 0 ? '▲ ' : '▼ ') + nf(Math.abs(d))}</td></tr>`;
      }).join('')}
                </tbody></table>
              </div>`: ''}
            ${tab === 'info' ? `
              <div class="grid g-2">
                <div>
                  <h4 class="b">بيانات المنتج</h4>
                  <div class="info-list mt10">
                    <div class="info-item"><span class="ic">🏷️</span><span>الماركة: <b>${esc(p.brand)}</b></span></div>
                    <div class="info-item"><span class="ic">📂</span><span>القسم: <b>${catOf(p.cat).ar}</b></span></div>
                    <div class="info-item"><span class="ic">🆔</span><span>المعرّف: <b class="num">${p.id.toUpperCase()}</b></span></div>
                    <div class="info-item"><span class="ic">🏪</span><span>عدد المتاجر المسجلة: <b class="num">${rows.length}</b></span></div>
                  </div>
                </div>
                <div>
                  <h4 class="b">ملاحظات مهمة</h4>
                  <div class="insight warn mt10"><span class="ic">⚠️</span><div class="sm">الأسعار المعروضة سجّلها المتاجر بنفسها، وقد تتغير. المنصة تعرض تاريخ آخر تحديث لكل سعر، وتوصيتنا تأكيد السعر قبل الزيارة.</div></div>
                  <div class="insight mt10"><span class="ic">🧠</span><div class="sm">مطابقة المنتجات: نجمع نفس الموديل من المتاجر المختلفة مع مراعاة السعة واللون والإصدار قبل دمج النتائج.</div></div>
                </div>
              </div>`: ''}
          </div>
        </div>
      </div>

      <aside>
        <div class="card pad mb14">
          <div class="b">🔔 راقب السعر</div>
          ${alert ? `<div class="insight ok mt10"><span class="ic">✅</span><div class="sm">تنبيهك الحالي: أبلغني لو نزل السعر تحت <b>${egp(alert.target)}</b><br><span class="tiny muted">مطابق حاليًا: ${alertsMatch().filter(h => h.alert.id === alert.id).map(h => esc(h.best.st.name) + ' — ' + egp(h.best.price)).join(' · ') || 'لا يوجد بعد'}</span></div></div>`
      : `<p class="tiny muted mt6">حدّد السعر الذي تريده وسنراقب كل المتاجر المسجلة. مش هنجيب سعر من عندنا — هنبلّغك لما أي متجر يسجّل سعرًا أقل.</p>
              <button class="btn soft block mt10" data-act="alert" data-prod="${p.id}">إنشاء تنبيه سعر</button>`}
        </div>
        <div class="card pad mb14">
          <div class="between mb10"><div class="b">حالة البيانات</div><span class="tiny muted">لكل سعر</span></div>
          ${['ok', 'warn', 'bad'].map(() => '').join('')}
          <div class="hbars">
            ${[['حديثة (خلال 24 ساعة)', rows.filter(r => r.updatedH < 24).length, 'var(--ok)'],
        ['مقبولة (خلال 4 أيام)', rows.filter(r => r.updatedH >= 24 && r.updatedH < 96).length, 'var(--p)'],
        ['تحتاج تحديثًا', rows.filter(r => r.updatedH >= 96 && r.updatedH < 240).length, 'var(--warn)'],
        ['قديمة (أكثر من 10 أيام)', rows.filter(r => r.updatedH >= 240).length, 'var(--danger)']]
        .map(([l, v, c]) => `<div class="hbar"><span>${l}</span><span class="num b">${v}</span><span class="tr"><i style="width:${Math.round(v / Math.max(1, rows.length) * 100)}%;background:${c}"></i></span></div>`).join('')}
          </div>
          <hr class="sep">
          <div class="tiny muted">نسبة الأسعار المحدثة خلال 24 ساعة: <b>${Math.round(rows.filter(r => r.updatedH < 24).length / Math.max(1, rows.length) * 100)}%</b></div>
        </div>
        <div class="card pad">
          <div class="b mb10">أرخص 5 متاجر الآن</div>
          ${rowsSorted.slice(0, 5).map((r, i) => `
          <div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
            <div><div class="sm b"><a href="#/store/${r.st.id}">${esc(r.st.name)}</a> ${r.st.verified ? '✔️' : ''}</div>
            <div class="tiny muted">📍 ${kmTxt(r.dist)} · ${r.open ? 'مفتوح' : 'مغلق'} · ${when(r.updatedH)}</div></div>
            <div class="center"><div class="num b">${nf(r.price)}</div><div class="tiny muted">ج.م</div></div>
          </div>`).join('')}
          <a class="btn block sm2 mt10" href="#/search?q=${encodeURIComponent(p.name)}&sort=price">كل المتاجر (${rows.length})</a>
        </div>
      </aside>
    </div>
  </div>`);
}

/* ---------------- صفحة المتجر ---------------- */
function storePage() {
  const st = DB.stores.find(s => s.id === APP.route.p.id) || DB.stores[0];
  if (st && st.real) return realStorePage(st);   // محل حقيقي من OpenStreetMap له صفحته الخاصة
  const rows = DB.byStore[st.id];
  const tab = APP.route.p.tab || 'products';
  const d = distKm(LOC, st);
  const open = isOpen(st);
  const cat = catOf(st.cats[0]);
  const list = APP.route.p.list || 'all';
  let shown = rows.slice().sort((a, b) => {
    const s = APP.route.p.sort || 'price';
    if (s === 'disc') return (b.disc - a.disc) || a.price - b.price;
    if (s === 'recent') return a.updatedH - b.updatedH;
    return a.price - b.price;
  });
  if (list === 'offers') shown = shown.filter(l => l.disc > 0);
  if (list === 'stock') shown = shown.filter(l => l.inStock);
  const day = new Date().getDay();
  const rev = DB.reviews[st.id] || [];
  const scores = rev.length ? Object.keys(rev[0].scores).map(k => [k, (rev.reduce((a, r) => a + r.scores[k], 0) / rev.length).toFixed(1)]) : [];
  const nearRows = DB.stores.filter(s => s.id !== st.id && (DB.byStore[s.id] || []).length).map(s => Object.assign({}, s, { dist: distKm(st, s) })).sort((a, b) => a.dist - b.dist).slice(0, 5)
    .map(s => { const l = DB.byStore[s.id][0]; return { st: s, dist: s.dist, price: l.price, productId: l.productId, disc: 0, inStock: l.inStock, updatedH: l.updatedH, open: isOpen(s) }; });

  return shell('search', `
  <div class="wrap" style="padding-top:22px">
    <div class="row wrapx gap6 tiny muted mb10">
      <a href="#/home">الرئيسية</a><span>›</span>
      <a href="#/stores">المتاجر</a><span>›</span>
      <a href="#/stores?city=${encodeURIComponent(st.city)}">${esc(st.city)}</a><span>›</span><span>${esc(st.name)}</span>
    </div>

    <div class="card pad mb14">
      <div class="row wrapx" style="align-items:flex-start">
        <div class="thumb" style="width:104px;height:104px;font-size:50px;border-radius:22px">${cat.em}</div>
        <div style="flex:1;min-width:250px">
          <div class="row wrapx gap6">
            <h1 style="font-size:23px">${esc(st.name)}</h1>
            ${st.verified ? '<span class="badge p">✔️ متجر موثق</span>' : '<span class="badge ink">قيد التوثيق</span>'}
            ${st.plan === 'pro' ? '<span class="badge acc">💎 حساب احترافي</span>' : ''}
            ${st.sponsored ? '<span class="badge acc">إعلان · متجر ممول</span>' : ''}
          </div>
          <div class="row wrapx gap14 mt10">
            <span class="stars num">${stars(st.rating)} <b>${st.rating.toFixed(1)}</b> <span class="muted tiny">(${nf(st.rc)} تقييم)</span></span>
            <span class="badge ${open ? 'ok' : 'ink'}"><i class="dot ${open ? 'g' : 'r'}"></i> ${open ? 'مفتوح الآن' : 'مغلق الآن'}</span>
            <span class="tiny muted">${hoursTxt(st)} — ${esc(AR_WEB[day])}</span>
            <span class="tiny muted">📍 ${kmTxt(d)} منك · ≈ ${etaMin(d)} دقيقة بالسيارة</span>
          </div>
          <div class="row wrapx gap6 mt10">
            ${st.cats.map(c => `<a class="chip flat" href="#/search?cat=${c}">${catOf(c).em} ${catOf(c).ar}</a>`).join('')}
          </div>
          <p class="sm muted mt10" style="max-width:640px">${esc(st.desc)}</p>
          <div class="row wrapx gap6 mt14">
            <button class="btn primary" data-act="wa" data-store="${st.id}" data-prod="${rows.length ? rows[0].productId : ''}">💬 واتساب المتجر</button>
            <button class="btn" data-act="call" data-store="${st.id}">☎️ اتصال</button>
            <button class="btn" data-act="dirs" data-store="${st.id}">🧭 الاتجاهات</button>
            <button class="btn ${APP.fav.stores.includes(st.id) ? 'soft' : ''}" data-act="fav-store" data-store="${st.id}">${APP.fav.stores.includes(st.id) ? '❤️ محفوظ' : '🤍 حفظ'}</button>
            <button class="btn" data-act="report" data-store="${st.id}">🚨 إبلاغ</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="padding:6px 14px"><div class="tabs">
        ${[['products', `📦 المنتجات (${rows.length})`], ['offers', `🔥 العروض (${rows.filter(l => l.disc).length})`], ['info', 'ℹ️ معلومات المتجر'], ['photos', '🖼️ الصور'], ['reviews', `⭐ التقييمات (${rev.length})`], ['map', '🗺️ الموقع']]
      .map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/store/${st.id}?tab=${k}">${l}</a>`).join('')}
      </div></div>
      <div class="modal-body">
        ${tab === 'products' ? `
          <div class="between wrapx mb14">
            <div class="scroll-x">
              ${[['all', 'الكل'], ['offers', 'عروض فقط'], ['stock', 'المتوفر فقط']].map(([k, l]) => `<button class="chip ${list === k ? 'on' : ''}" data-list="${k}">${l}</button>`).join('')}
            </div>
            <div class="row gap6">
              <span class="tiny muted">ترتيب:</span>
              ${[['price', 'الأرخص'], ['disc', 'أكبر خصم'], ['recent', 'الأحدث تحديثًا']].map(([k, l]) => `<button class="chip ${(APP.route.p.sort || 'price') === k ? 'p' : ''}" data-sort="${k}">${l}</button>`).join('')}
            </div>
          </div>
          ${shown.length ? `<div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>المنتج</th><th>السعر المسجّل</th><th>الخصم</th><th>التوفر</th><th>آخر تحديث</th><th></th></tr></thead>
            <tbody>${shown.map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        return `<tr>
                <td><div class="td-store"><span class="thumb" style="width:36px;height:36px;font-size:18px;border-radius:10px">${p.em}</span>
                  <span><span class="b"><a href="#/product/${p.id}?store=${st.id}">${esc(p.name)}</a></span>
                  <span class="tiny muted" style="display:block">${esc(p.brand)} · ${catOf(p.cat).ar}</span></span></div></td>
                <td class="num"><b>${nf(l.price)}</b> ج.م ${l.oldPrice ? `<div class="tiny muted"><s>${nf(l.oldPrice)}</s> ${l.disc ? `<span class="badge acc">${pct(l.disc)}</span>` : ''}</div>` : ''}</td>
                <td>${l.disc ? `<span class="badge acc">${pct(l.disc)}</span>${l.offerEnds ? `<div class="tiny muted">يتبقى ${l.offerEnds} يوم</div>` : ''}` : '<span class="muted">—</span>'}</td>
                <td>${l.inStock ? '<span class="badge ok">متوفر</span>' : '<span class="badge bad">غير متوفر</span>'}${l.warranty ? `<div class="tiny muted">ضمان ${esc(l.warranty)}</div>` : ''}</td>
                <td>${trustBadge(l.updatedH)}</td>
                <td><div class="row gap6">
                  <button class="btn primary sm2" data-act="wa" data-store="${st.id}" data-prod="${l.productId}">واتساب</button>
                  <button class="btn sm2" data-act="alert" data-prod="${l.productId}">🔔</button>
                </div></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="muted">لا توجد منتجات مطابقة للفلتر.</p>'}
          <p class="tiny muted mt14">عدد المنتجات المعروضة: ${shown.length} من ${rows.length}. آخر تحديث لأسعار المتجر: ${when(Math.min.apply(null, rows.map(l => l.updatedH)))}.</p>`: ''}

        ${tab === 'offers' ? `
          ${rows.filter(l => l.disc).length ? `<div class="grid g-auto">${rows.filter(l => l.disc).sort((a, b) => b.disc - a.disc).map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        return `<div class="card pad hv rel">
              <span class="ribbon" style="background:var(--acc)">خصم ${pct(l.disc)}</span>
              <div class="row"><div class="thumb lg">${p.em}</div>
              <div><div class="b">${esc(p.name)}</div>
              <div class="priceline mt6"><span class="price-old num">${nf(l.oldPrice)}</span>${priceHtml(l.price)}</div>
              <div class="tiny muted mt6">توفير ${egp(l.oldPrice - l.price)}${l.offerEnds ? ` · ينتهي خلال ${l.offerEnds} يوم` : ''}</div></div></div>
              <div class="row gap6 mt10">
                <button class="btn primary sm2" data-act="wa" data-store="${st.id}" data-prod="${p.id}">اسأل عن العرض</button>
                <a class="btn sm2" href="#/product/${p.id}">مقارنة الأسعار</a>
              </div>
            </div>`;
      }).join('')}</div>`: '<p class="muted">لا توجد عروض مسجلة حاليًا لهذا المتجر.</p>'}` : ''}

        ${tab === 'info' ? `
          <div class="grid g-side">
            <div>
              <h4 class="b mb10">بيانات النشاط</h4>
              <div class="info-list">
                <div class="info-item"><span class="ic">🏬</span><span><b>الاسم كما على اللافتة:</b> ${esc(st.nameOnSign || st.name)}</span></div>
                <div class="info-item"><span class="ic">🏢</span><span><b>الكيان:</b> ${esc(st.legalType || '—')}${st.founded ? ` · تأسس ${esc(String(st.founded))}` : ''}${st.sizeM2 ? ` · ${esc(String(st.sizeM2))} م²` : ''}${st.employees ? ` · ${esc(st.employees)} موظفًا` : ''}</span></div>
                <div class="info-item"><span class="ic">🏷️</span><span><b>النشاط:</b> ${st.cats.map(c => catOf(c).em + ' ' + catOf(c).ar).join(' · ')}</span></div>
                ${(st.tags || []).length ? `<div class="info-item"><span class="ic">✨</span><span><b>التخصصات:</b> ${st.tags.map(t => `<span class="badge p">${esc(t)}</span>`).join(' ')}</span></div>` : ''}
                ${(st.audience || []).length ? `<div class="info-item"><span class="ic">👥</span><span><b>يخدم:</b> ${st.audience.map(a => `<span class="badge ink">${esc(a)}</span>`).join(' ')}</span></div>` : ''}
                ${st.wholesale ? `<div class="info-item"><span class="ic">📦</span><span><b>بيع بسعر الجملة للتجار</b> — يُفضّل التواصل المسبق.</span></div>` : ''}
              </div>
              <h4 class="b mt18 mb10">العنوان والوصول</h4>
              <div class="info-list">
                <div class="info-item"><span class="ic">📍</span><span>${esc(st.address || (st.area + '، ' + st.city))}</span></div>
                ${st.landmark ? `<div class="info-item"><span class="ic">🧭</span><span><b>علامة مميزة:</b> ${esc(st.landmark)}</span></div>` : ''}
                ${(st.street || st.buildingNo) ? `<div class="info-item"><span class="ic">🏠</span><span>${esc(st.street || '')}${st.buildingNo ? '، رقم ' + esc(String(st.buildingNo)) : ''}${st.floor ? ' · ' + esc(st.floor) : ''}</span></div>` : ''}
                <div class="info-item"><span class="ic">🛰️</span><span class="num">${st.lat.toFixed(5)}, ${st.lon.toFixed(5)}</span>
                  <span>${st.gmapsUrl ? `<a class="btn sm2" href="${esc(st.gmapsUrl)}" target="_blank">فتح في جوجل ماب</a>` : `<button class="btn sm2" data-act="dirs" data-store="${st.id}">الاتجاهات</button>`}</span></div>
                <div class="info-item"><span class="ic">🅿️</span><span>الموقف: ${esc(st.parking || 'غير محدد')}${st.onMainStreet ? ' · على شارع رئيسي' : ''}${st.nearMetro ? ' · قريب من المترو' : ''}</span></div>
                <div class="info-item"><span class="ic">🗺️</span><span>المسافة منك: <b>${kmTxt(distKm(LOC, st))}</b> · ≈ ${etaMin(distKm(LOC, st))} دقيقة بالسيارة</span></div>
                ${(st.branches && st.branches.length) ? `<div class="info-item"><span class="ic">🏪</span><span><b>الفروع (${st.branches.length}):</b><br>${st.branches.map(b => `${esc(b.name || 'فرع')} — ${esc(b.area || '')}${b.city ? '، ' + esc(b.city) : ''}${b.phone ? ` · <span class="num">${esc(b.phone)}</span>` : ''}`).join('<br>')}</span></div>` : ''}
              </div>
              <h4 class="b mt18 mb10">التواصل</h4>
              <div class="info-list">
                <div class="info-item"><span class="ic">☎️</span><span><a class="num" href="tel:${esc(st.phone)}">${esc(st.phone)}</a>${st.phone2 ? ` · <a class="num" href="tel:${esc(st.phone2)}">${esc(st.phone2)}</a>` : ''}</span></div>
                <div class="info-item"><span class="ic">💬</span><span>واتساب: <span class="num">${esc(st.whatsapp || st.phone)}</span> <button class="btn sm2" data-act="wa" data-store="${st.id}" data-prod="${rows.length ? rows[0].productId : ''}">فتح محادثة</button></span></div>
                ${st.replyTime ? `<div class="info-item"><span class="ic">⏱️</span><span>متوسط الرد على الواتساب: <b>${esc(st.replyTime)}</b></span></div>` : ''}
                ${st.email ? `<div class="info-item"><span class="ic">✉️</span><span>${esc(st.email)}</span></div>` : ''}
                ${(st.facebook || st.instagram || st.tiktok || st.website) ? `<div class="info-item"><span class="ic">🌐</span><span>${[st.website ? 'موقع: ' + esc(st.website) : '', st.facebook ? 'فيسبوك: ' + esc(st.facebook) : '', st.instagram ? 'إنستجرام: ' + esc(st.instagram) : '', st.tiktok ? 'تيك توك: ' + esc(st.tiktok) : ''].filter(Boolean).join(' · ')}</span></div>` : ''}
                ${(st.contactPerson || st.priceManager) ? `<div class="info-item"><span class="ic">👤</span><span>${st.contactPerson ? 'مسؤول التواصل: <b>' + esc(st.contactPerson) + '</b>' : ''}${st.priceManager ? ' · مسؤول الأسعار: <b>' + esc(st.priceManager) + '</b>' : ''}</span></div>` : ''}
              </div>
            </div>
            <div>
              <h4 class="b mb10">مواعيد العمل المسجلة</h4>
              <div class="hours">
                ${AR_WEB.map((dname, i) => {
    const h = (st.hours && st.hours[i]) || null;
    const closed = h ? h.closed : (st.fri === 'off' && i === 5);
    const late = !h && st.fri === 'late' && i === 5;
    const txt = closed ? 'مغلق' : h ? (h.open + ' — ' + h.close) : (late ? '02:00 م — ' + timeTxt(st.closeH) : hoursTxt(st));
    const today = i === new Date().getDay();
    return `<div class="d ${today ? 'today' : ''}"><span>${dname}${today ? ' (اليوم)' : ''}${h && h.note ? ' <span class="tiny muted">' + esc(h.note) + '</span>' : ''}</span><span class="num">${txt}</span></div>`;
  }).join('')}
              </div>
              ${st.hoursNotes ? `<div class="insight info mt10"><span class="ic">📅</span><div class="tiny">${esc(st.hoursNotes)}</div></div>` : ''}
              <h4 class="b mt18 mb10">الدفع والخدمات</h4>
              <div class="info-list">
                <div class="info-item"><span class="ic">💳</span><span>${(st.pay || []).map(x => `<span class="badge ink">${esc(x)}</span>`).join(' ')}${st.taxInvoice ? ' <span class="badge p">فاتورة ضريبية</span>' : ''}</span></div>
                ${(st.installments || []).length ? `<div class="info-item"><span class="ic">🧮</span><span>تقسيط: ${st.installments.map(x => `<span class="badge p">${esc(x)}</span>`).join(' ')}</span></div>` : ''}
                ${(st.svc || []).length ? `<div class="info-item"><span class="ic">🛠️</span><span>${st.svc.map(x => `<span class="badge p">${esc(x)}</span>`).join(' ')}</span></div>` : ''}
                <div class="info-item"><span class="ic">↩️</span><span>سياسة الإرجاع: <b>${esc(st.returnDays || 'غير محددة')}</b> · الضمان: <b>${esc(st.warranty || 'حسب المنتج')}</b></span></div>
                ${st.install ? `<div class="info-item"><span class="ic">🔧</span><span>تركيب في المنزل${st.installFee ? ' — رسوم ' + esc(String(st.installFee)) + ' ج.م' : ' — مجاني'}</span></div>` : ''}
                ${st.delivery ? `<div class="info-item"><span class="ic">🚚</span><span>توصيل داخل <b>${esc(String(st.deliveryRadius || '؟'))} كم</b>${st.deliveryFee ? ' (رسوم ' + esc(String(st.deliveryFee)) + ' ج.م)' : ' — مجاني'}${st.minOrder ? ' · حد أدنى ' + esc(String(st.minOrder)) + ' ج.م' : ''}${st.prepTime ? ' · ' + esc(st.prepTime) : ''}</span></div>` : ''}
                ${(st.zones || []).length ? `<div class="info-item"><span class="ic">📍</span><span>مناطق التوصيل: ${st.zones.map(z => `<span class="badge ink">${esc(z)}</span>`).join(' ')}</span></div>` : ''}
                ${st.pickup ? `<div class="info-item"><span class="ic">🏬</span><span>استلام من الفرع متاح</span></div>` : ''}
              </div>
              <h4 class="b mt18 mb10">مؤشرات الصفحة</h4>
              <div class="grid g-4">
                ${kpiCard('زيارات الصفحة', nf(st.views))}
                ${kpiCard('ضغطات واتساب', nf(st.clicksWa))}
                ${kpiCard('مكالمات', nf(st.calls))}
                ${kpiCard('طلبات اتجاهات', nf(st.dirs))}
              </div>
              <div class="card pad mt14">
                <div class="between mb10"><div class="b sm">📋 جودة البيانات</div><span class="badge ${(st.completeness || 60) >= 80 ? 'ok' : (st.completeness || 60) >= 50 ? 'warn' : 'bad'}">${st.completeness ? st.completeness + '%' : '—'}</span></div>
                <div class="progress"><i style="width:${st.completeness || 60}%"></i></div>
                <div class="tiny muted mt6">كل ما زادت تفاصيل بيانات المحل، زادت ثقة العميل وترتيب الظهور.</div>
                <a class="btn soft block sm2 mt10" href="#/addstore?step=1&edit=${st.id}">صاحب المحل؟ استكمل البيانات</a>
              </div>
            </div>
          </div>`: ''}

        ${tab === 'photos' ? `
          <div class="between wrapx mb14"><div class="b">صور المتجر والمنتجات</div><span class="tiny muted">في النسخة النهائية تُرفع الصور الحقيقية من لوحة تحكم المتجر</span></div>
          <div class="gallery">
            ${['🏬 واجهة المحل', '🛍️ داخــل المتجر', '📦 رف المنتجات', '🧾 كاونتر الدفع', '📱 قسم الموبايلات', '🎧 قسم السماعات', '💻 قسم اللابتوب', '🏷️ العروض'].map((t, i) => `
            <div class="g">${t.split(' ')[0]}</div>`).join('')}
          </div>
          <p class="tiny muted mt14">${['🏬 واجهة المحل', '🛍️ داخل المتجر', '📦 رف المنتجات', '🧾 كاونتر الدفع', '📱 قسم الموبايلات', '🎧 قسم السماعات', '💻 قسم اللابتوب', '🏷️ العروض'].join(' · ')}</p>`: ''}

        ${tab === 'reviews' ? `
          <div class="grid g-side">
            <div>
              <div class="between mb14">
                <div><div class="b">تقييمات العملاء</div><div class="tiny muted">التقييمات مرتبطة بعمليات تواصل فعلية عبر المنصة، وللإدارة حق حذف التقييمات الوهمية أو المسيئة.</div></div>
                <button class="btn primary sm2" id="addReview">✍️ أضف تقييمك</button>
              </div>
              <div class="grid" style="gap:10px">
                ${rev.map(r => `
                <div class="review">
                  <div class="row between">
                    <div class="row"><span class="avatar">${esc(r.user[0])}</span>
                      <div><div class="sm b">${esc(r.user)}</div><div class="tiny muted">${when(r.days * 24)} · شراء/تواصل موثّق</div></div></div>
                    <span class="stars num">${stars(r.rating)}</span>
                  </div>
                  <p class="sm mt10">${esc(r.txt)}</p>
                  <div class="row wrapx gap6 mt10">${Object.entries(r.scores).map(([k, v]) => `<span class="badge ink">${k}: ${v}/5</span>`).join('')}</div>
                </div>`).join('')}
              </div>
            </div>
            <aside>
              <div class="card pad">
                <div class="row center gap14" style="justify-content:center;text-align:center">
                  <div><div style="font-size:38px;font-weight:900" class="num">${st.rating.toFixed(1)}</div><div class="stars">${stars(st.rating)}</div><div class="tiny muted">${nf(st.rc)} تقييم</div></div>
                </div>
                <hr class="sep">
                <div class="hbars">
                  ${scores.map(([k, v]) => `<div class="hbar"><span>${k}</span><span class="num b">${v}/5</span><span class="tr"><i style="width:${v / 5 * 100}%"></i></span></div>`).join('')}
                  <div class="hbar"><span>دقة معلومات المنتجات</span><span class="num b">${(st.rating * .95).toFixed(1)}/5</span><span class="tr"><i style="width:${st.rating * .95 / 5 * 100}%"></i></span></div>
                </div>
                <p class="tiny muted mt14">التقييمات تساعد باقي المستخدمين، وبتظهر لصاحب المتجر في لوحة التحكم.</p>
              </div>
            </aside>
          </div>`: ''}

        ${tab === 'map' ? `
          <div class="grid g-2">
            <div>
              <div class="b mb10">موقع المتجر ومنافسوه القريبون</div>
              <div class="mapbox">${radialMap(nearRows, Math.max(1, Math.ceil(((nearRows[0] || { dist: 2 }).dist) * 3)), 420)}</div>
              <p class="tiny muted mt10">الخريطة تعرض المتجر (باللون الأخضر) وأقرب 5 متاجر مسجلة على المنصة.</p>
            </div>
            <div>
              <div class="card pad mb14">
                <div class="b">🧭 الوصول للمتجر</div>
                <div class="info-list mt10">
                  <div class="info-item"><span class="ic">📍</span><span>${esc(st.address)}</span></div>
                  <div class="info-item"><span class="ic">📏</span><span>المسافة من موقعك: <b>${kmTxt(d)}</b> (خط مستقيم)</span></div>
                  <div class="info-item"><span class="ic">🚗</span><span>وقت الوصول التقريبي: <b>${etaMin(d)} دقيقة</b></span></div>
                  <div class="info-item"><span class="ic">🅿️</span><span>انتظار: منطقة محيطة بالمتجر</span></div>
                </div>
                <button class="btn primary block mt14" data-act="dirs" data-store="${st.id}">ابدأ الطريق في الخرائط</button>
              </div>
              <div class="card pad">
                <div class="b mb10">متاجر قريبة من ${esc(st.name)}</div>
                ${nearRows.map(r => `<div class="between" style="padding:7px 0;border-bottom:1px solid var(--line-2)">
                  <div><a class="sm b" href="#/store/${r.st.id}">${esc(r.st.name)}</a> ${r.st.verified ? '✔️' : ''}
                  <div class="tiny muted">${catOf(r.st.cats[0]).ar} · ${kmTxt(r.dist)} · ${r.open ? 'مفتوح' : 'مغلق'}</div></div>
                  <span class="num sm b">من ${nf(r.price)}</span></div>`).join('')}
              </div>
            </div>
          </div>`: ''}
      </div>
    </div>
    <div class="card pad mt14">
      <div class="between wrapx">
        <div><div class="b">هل أنت صاحب ${esc(st.name)}؟</div><div class="tiny muted">اطّلع على إحصائيات صفحتك، حدّث الأسعار، وأنشئ عروضًا جديدة.</div></div>
        <div class="row gap6"><a class="btn primary sm2" href="#/dashboard">لوحة تحكم المتجر</a><button class="btn sm2" id="claimBtn">استلام هذه الصفحة</button></div>
      </div>
    </div>
  </div>`);
}

/* ---------------- ربط أحداث هذه الصفحات ---------------- */
function bindResults() {
  const q = $('#resQ');
  if (q) q.onkeydown = e => { if (e.key === 'Enter') go('search', Object.assign({}, APP.route.p, { q: q.value.trim() })); };
  const g = $('#resGo'); if (g) g.onclick = () => go('search', Object.assign({}, APP.route.p, { q: ($('#resQ').value || '').trim() }));
  const geo = $('#resGeo'); if (geo) geo.onclick = openLocation;
  document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => setParam('sort', b.dataset.sort));
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => setParam('view', b.dataset.view));
  const fd = $('#fDist'); if (fd) fd.onchange = () => setParam('dist', fd.value);
  const fc = $('#fCity'); if (fc) fc.onchange = () => setParam('city', fc.value);
  const ft = $('#fCat'); if (ft) ft.onchange = () => setParam('cat', ft.value);
  const fo = $('#fOpen'); if (fo) fo.onchange = () => setParam('open', fo.checked ? '1' : '');
  const fs = $('#fStock'); if (fs) fs.onchange = () => setParam('stock', fs.checked ? '1' : '');
  const fof = $('#fOff'); if (fof) fof.onchange = () => setParam('off', fof.checked ? '1' : '');
  const ab = $('#alertBtnTop'); if (ab) ab.onclick = () => openAlertModal(APP.route.p.q ? (findProduct(APP.route.p.q) || {}).id : 'ip15');
  const rb = $('#reportBtnTop'); if (rb) rb.onclick = () => openReportModal();
  if (APP.route.p.view === 'map') bindRadialMap();
}
function bindProduct() {
  const rows = (DB.byProduct[APP.route.p.id || APP.route.p.pid] || []);
  $('#shareBtn') && ($('#shareBtn').onclick = () => {
    const url = location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('تم نسخ رابط المنتج', 'ok', '🔗')).catch(() => toast('انسخ الرابط من شريط العنوان', 'warn', '🔗'));
    else toast('انسخ الرابط من شريط العنوان', 'warn', '🔗');
  });
  if (APP.route.p.tab === 'map' || APP.route.p.tab === 'hist') bindRadialMap();
}
function bindStorePage() {
  document.querySelectorAll('[data-list]').forEach(b => b.onclick = () => setParam('list', b.dataset.list));
  if (APP.route.p.tab === 'map') bindRadialMap();
  const ar = $('#addReview');
  if (ar) ar.onclick = () => {
    openModal('✍️ أضف تقييمك للمتجر', `
      <div class="field mb14"><label>تقييمك العام</label>
        <div class="row gap6" id="starPick">${[1, 2, 3, 4, 5].map(i => `<button class="btn sm2" data-star="${i}">★ ${i}</button>`).join('')}</div></div>
      <div class="grid g-4 mb14">
        ${['جودة الخدمة', 'الأسعار', 'التعامل', 'دقة المعلومات'].map(k => `
        <div class="field"><label>${k}</label><select class="select">${[5, 4, 3, 2, 1].map(v => `<option>${v}</option>`).join('')}</select></div>`).join('')}
      </div>
      <div class="field mb14"><label>تعليقك (اختياري)</label><textarea class="input" rows="3" placeholder="اكتب تجربتك مع المتجر..."></textarea></div>
      <label class="switch"><input type="checkbox" checked> أؤكد أن هذه تجربة حقيقية</label>`,
      `<button class="btn primary" id="revSave">إرسال التقييم</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
    $('#starPick').onclick = e => {
      const b = e.target.closest('[data-star]'); if (!b) return;
      $$('#starPick .btn').forEach(x => x.classList.remove('primary'));
      b.classList.add('primary');
    };
    $('#revSave').onclick = () => { closeModal(); toast('شكرًا! تقييمك هيظهر بعد المراجعة', 'ok', '⭐'); };
  };
  const cb = $('#claimBtn'); if (cb) cb.onclick = () => { closeModal(); go('addstore'); };
}
function bindOffers() { }
function bindFavorites() { }
