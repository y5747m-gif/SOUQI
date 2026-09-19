/* =========================================================================
   الجزء 7: المساعد الذكي + إضافة متجر + لوحة تحكم المتجر + لوحة الإدارة + النوافذ
   ========================================================================= */

/* ---------------- 🤔 المساعد: ماذا أشتري؟ + رحلة الشراء ---------------- */
const BUNDLES = [
  { id: 'gaming', name: 'تجميعة كمبيوتر للألعاب', em: '🎮', items: ['rtx4060', 'ram16', 'ssd1t', 'mon24', 'mx3s'], note: 'تجميعة متوسطة تشغّل الألعاب الحديثة على إعدادات عالية.' },
  { id: 'home', name: 'تجهيز بيت جديد (أساسيات)', em: '🏠', items: ['tefal', 'airfryer', 'vac', 'fan', 'mug'], note: 'أساسيات المطبخ والتنظيف لأول سكن.' },
  { id: 'gym', name: 'بداية رياضة في البيت', em: '🏋️', items: ['dumbbell', 'yoga'], note: 'بداية بسيطة بدون اشتراك جيم.' },
  { id: 'workshop', name: 'عدة صيانة للبيت', em: '🔧', items: ['drill', 'toolset', 'ladder'], note: 'لمعالجة أعطال البيت بنفسك.' },
  { id: 'student', name: 'مستلزمات بداية الدراسة', em: '🎒', items: ['lenovo3', 'notebook', 'ram16'], note: 'لابتوب ومستلزمات للجامعة أو المدرسة.' }
];

function assistantPage() {
  const q = APP.route.p.q != null ? APP.route.p.q : '';
  const tab = APP.route.p.tab || 'what';
  const p = q ? parseQuery(q) : null;
  const gift = /هديه|هدية|gift|عيد ميلاد/.test(norm(q));
  const max = p && p.max ? p.max : null;
  const minP = (prod) => { const ls = DB.byProduct[prod.id] || []; return ls.length ? Math.min.apply(null, ls.map(l => l.price)) : prod.base; };

  let pool = PRODUCTS.slice();
  if (gift) pool = pool.filter(x => ['audio', 'books', 'beauty', 'electronics', 'sports', 'clothing', 'home', 'mobile'].includes(x.cat));
  else if (p && p.cat) pool = pool.filter(x => x.cat === p.cat.id);
  else pool = pool.filter(x => ['home', 'electronics', 'audio', 'mobile', 'supermarket'].includes(x.cat));
  if (p && p.brand) pool = pool.filter(x => norm(x.brand) === norm(p.brand));
  const affordable = pool.filter(x => DB.byProduct[x.id] && DB.byProduct[x.id].length && (!max || minP(x) <= max));
  const beyond = max ? pool.filter(x => DB.byProduct[x.id] && DB.byProduct[x.id].length && minP(x) > max && minP(x) <= max * 1.4) : [];
  // ترتيب: أفضل استخدام للميزانية + التوفر في متاجر قريبة
  affordable.sort((a, b) => valScore(b) - valScore(a));
  function valScore(x) {
    const ls = DB.byProduct[x.id] || [];
    if (!ls.length) return -99;
    const price = minP(x);
    const budgetUse = max ? (price / max) : 0.6;
    const near = Math.min.apply(null, ls.map(l => distKm(LOC, DB.stores.find(s => s.id === l.storeId))));
    const fresh = ls.filter(l => l.updatedH < 96).length / ls.length;
    return budgetUse * 2.4 + (1 / (1 + near / 5)) + fresh * .8 + ls.length * .05;
  }

  return shell('search', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">🤔 ماذا أشتري؟</h1>
      <p>قل ميزانيتك واحتياجك بالعامية — سوقي يقترح من المتاجر المسجلة فعليًا، بدون اختراع أسعار أو منتجات.</p></div>
    </div>

    <div class="card pad mb14">
      <div class="searchbig" style="margin:0;box-shadow:none;background:var(--surface-2);border:1px solid var(--line)">
        <label class="f"><span style="font-size:18px">💬</span>
          <input id="asQ" value="${esc(q)}" placeholder="مثال: عندي 10000 جنيه وعايز حاجة مفيدة للبيت"></label>
        <button class="go" id="asGo">اقترح لي</button>
      </div>
      <div class="scroll-x mt10">
        ${[['عندي 10000 جنيه وعايز حاجة مفيدة للبيت', 'عايز حاجة مفيدة للبيت تحت 10000'],
      ['عايز هدية لشخص عمره 20 سنة بميزانية 1000 جنيه', 'هدية بميزانية 1000 جنيه'],
      ['أفضل موبايل تحت 15000 جنيه', 'موبايل تحت 15000'],
      ['أدوات مطبخ ومستلزمات بيت بأقل من 5000', 'مستلزمات منزل تحت 5000'],
      ['حاجة للرياضة في البيت بميزانية 2000', 'رياضة تحت 2000'],
      ['مكتبة ومستلزمات دراسة بأقل من 1000', 'كتب ومكتبة تحت 1000']]
      .map(([l, v]) => `<button class="chip" data-asq="${esc(v)}">${l}</button>`).join('')}
      </div>
    </div>

    <div class="card mb14"><div style="padding:6px 14px"><div class="tabs">
      ${[['what', '💡 اقتراحات حسب ميزانيتك'], ['bundle', '🧩 رحلة شراء (تجميعة)']].map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/assistant?tab=${k}${q ? '&q=' + encodeURIComponent(q) : ''}">${l}</a>`).join('')}
    </div></div>
    <div class="modal-body">
      ${tab === 'what' ? whatBlock(p, q, gift, max, affordable, beyond) : ''}

      ${tab === 'bundle' ? bundlesBlock() : ''}
    </div></div>
  </div>`);
}
function bindAssistant() {
  const i = $('#asQ');
  if (i) i.onkeydown = e => { if (e.key === 'Enter') go('assistant', { q: i.value.trim() }); };
  const g = $('#asGo'); if (g) g.onclick = () => go('assistant', { q: ($('#asQ').value || '').trim() });
  document.querySelectorAll('[data-asq]').forEach(b => b.onclick = () => go('assistant', { q: b.dataset.asq }));
  document.querySelectorAll('[data-act="cart"]').forEach(b => b.onclick = () => {
    const cart = load('cart', []); if (!cart.includes(b.dataset.prod)) cart.push(b.dataset.prod);
    save('cart', cart); toast('تمت الإضافة لقائمة المشتريات', 'ok', '🛒'); render();
  });
}

/* ---------------- 📊 لوحة تحكم المتجر ---------------- */
DB.priceLog = DB.priceLog || [
  { store: 'nile', product: 'iPhone 15 128GB', from: 36900, to: 35850, by: 'المتجر', at: 'منذ 3 ساعات' },
  { store: 'nile', product: 'سماعة JBL Tune 520BT', from: 2750, to: 2590, by: 'المتجر', at: 'أمس' },
  { store: 'nile', product: 'لابتوب Lenovo IdeaPad Slim 3 i5', from: 27400, to: 26900, by: 'الإدارة (بلاغ مستخدم)', at: 'منذ 3 أيام' },
  { store: 'mobilec', product: 'iPhone 15 128GB', from: 37200, to: 36200, by: 'المتجر', at: 'منذ يومين' },
  { store: 'techno', product: 'كارت شاشة MSI RTX 4060', from: 20400, to: 19800, by: 'المتجر', at: 'منذ 5 أيام' }
];
function dashboardPage() {
  const st = DB.stores.find(s => s.id === (APP.route.p.store || APP.myStore)) || DB.stores[0];
  const rows = DB.byStore[st.id] || [];
  const tab = APP.route.p.tab || 'overview';
  const stale = rows.filter(l => l.updatedH > 96);
  const freshPct = rows.length ? Math.round(rows.filter(l => l.updatedH <= 24).length / rows.length * 100) : 0;
  const weekly = st.weekly || Array.from({ length: 8 }, () => 0);
  const weekLbl = ['س1', 'س2', 'س3', 'س4', 'س5', 'س6', 'س7', 'س8'];
  const bestSeller = rows.slice().sort((a, b) => (b.disc - a.disc) || a.price - b.price).slice(0, 5);
  const market = rows.map(l => {
    const all = DB.byProduct[l.productId] || [];
    const prices = all.map(x => x.price);
    const mn = Math.min.apply(null, prices), avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { l, mn, avg, pos: l.price === mn ? 'cheapest' : l.price <= avg ? 'below' : 'above', diff: Math.round((l.price / avg - 1) * 100), n: all.length };
  }).sort((a, b) => a.diff - b.diff);

  return shell('dashboard', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">📊 لوحة تحكم المتجر</h1><p>كل ما تحتاجه لإدارة صفحتك وأسعارك وعروضك — والعملاء يشوفوا البيانات المحدثة فورًا.</p></div>
      <div class="row gap6">
        <select class="select" id="dbStore" style="min-width:210px">
          ${DB.stores.map(s => `<option value="${s.id}" ${s.id === st.id ? 'selected' : ''}>${esc(s.name)} — ${esc(s.city)}</option>`).join('')}
        </select>
        <a class="btn primary sm2" href="#/store/${st.id}">عرض الصفحة العامة ↗</a>
        <a class="btn sm2" href="#/addstore?step=1&edit=${st.id}">✏️ تعديل بيانات المحل</a>
      </div>
    </div>

    <div class="card pad mb14">
      <div class="row wrapx between">
        <div class="row"><div class="thumb lg">${catOf(st.cats[0]).em}</div>
          <div><div class="b" style="font-size:18px">${esc(st.name)} ${st.verified ? '<span class="vf">✔️</span>' : ''}</div>
          <div class="tiny muted">${esc(st.area)} — ${esc(st.city)} · ${rows.length} منتجًا · باقة ${st.plan === 'pro' ? 'احترافية 💎' : 'مجانية'}</div></div></div>
        <div class="row gap6">
          <span class="badge ${freshPct >= 70 ? 'ok' : freshPct >= 40 ? 'warn' : 'bad'}">${freshPct}% من أسعارك محدثة خلال 24 ساعة</span>
          ${stale.length ? `<span class="badge warn">${stale.length} منتجًا يحتاج تحديث سعر</span>` : '<span class="badge ok">كل الأسعار حديثة</span>'}
        </div>
      </div>
    </div>

    <div class="card"><div style="padding:6px 14px"><div class="tabs">
      ${[['overview', '📈 نظرة عامة'], ['products', '📦 المنتجات والأسعار'], ['offers', '🔥 العروض'], ['market', '⚖️ موقعك بين المنافسين'], ['reviews', '⭐ التقييمات'], ['plan', '💎 الباقة']]
      .map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/dashboard?store=${st.id}&tab=${k}">${l}</a>`).join('')}
    </div></div>
    <div class="modal-body">
      ${tab === 'overview' ? `
        ${(() => { const cc = regCompletenessExtra(st); return cc.missing.length ? `
        <div class="insight warn mb14"><span class="ic">📋</span><div class="sm">
          <b>اكتمال بيانات محلّك ${cc.pct}%</b> — ناقص: ${cc.missing.slice(0, 5).map(m => esc(m)).join(' · ')}${cc.missing.length > 5 ? ' +' + (cc.missing.length - 5) : ''}.
          <div class="mt6"><a class="btn sm2" href="#/addstore?step=1&edit=${st.id}">استكمل البيانات</a>
          <a class="btn sm2" href="#/directory">شوف ترتيبك بين المحلات</a></div>
        </div></div>` : ''; })()}
        <div class="grid g-4 mb14">
          ${kpiCard('مشاهدات الصفحة', nf(st.views), '▲ 12% عن الأسبوع الماضي', 'ok')}
          ${kpiCard('ضغطات واتساب', nf(st.clicksWa), '▲ 8%', 'ok')}
          ${kpiCard('مكالمات', nf(st.calls), '▼ 3%', 'warn')}
          ${kpiCard('طلبات اتجاهات', nf(st.dirs), '▲ 21%', 'ok')}
        </div>
        <div class="grid g-2">
          <div class="card pad">
            <div class="between mb10"><div class="b">📅 التفاعل خلال 8 أسابيع</div><div class="tiny muted">مشاهدات + ضغطات تواصل</div></div>
            ${barChart(weekLbl, weekly)}
            <p class="tiny muted mt18">أعلى أسبوع: <b>${nf(Math.max.apply(null, weekly))}</b> تفاعل · آخر أسبوع: <b>${nf(weekly[weekly.length - 1])}</b></p>
          </div>
          <div class="card pad">
            <div class="b mb10">🕐 حالة أسعارك</div>
            ${donut(freshPct, 'أسعار محدثة خلال 24 ساعة', freshPct >= 70 ? '#800020' : freshPct >= 40 ? '#C99700' : '#C2413F')}
            <hr class="sep">
            <div class="hbars">
              ${[['خلال 24 ساعة', rows.filter(l => l.updatedH <= 24).length, 'var(--ok)'],
      ['1-4 أيام', rows.filter(l => l.updatedH > 24 && l.updatedH <= 96).length, 'var(--p)'],
      ['4-10 أيام', rows.filter(l => l.updatedH > 96 && l.updatedH <= 240).length, 'var(--warn)'],
      ['أكثر من 10 أيام', rows.filter(l => l.updatedH > 240).length, 'var(--danger)']]
      .map(([k, v, c]) => `<div class="hbar"><span>${k}</span><span class="num b">${v}</span><span class="tr"><i style="width:${rows.length ? v / rows.length * 100 : 0}%;background:${c}"></i></span></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="card pad mt14">
          <div class="between mb10"><div class="b">🔔 منتجات تحتاج تحديث سعر (${stale.length})</div>
            <button class="btn primary sm2" id="dbBulk">تحديث كل الأسعار الآن</button></div>
          ${stale.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>المنتج</th><th>سعرك</th><th>متوسط السوق</th><th>آخر تحديث</th><th></th></tr></thead><tbody>
            ${stale.slice(0, 8).map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        const all = DB.byProduct[l.productId] || [];
        const avg = Math.round(all.reduce((a, b) => a + b.price, 0) / all.length);
        return `<tr><td><div class="td-store"><span class="thumb" style="width:32px;height:32px;font-size:15px;border-radius:8px">${p.em}</span><span class="sm b">${esc(p.name)}</span></div></td>
              <td class="num b">${nf(l.price)}</td><td class="num ${l.price <= avg ? '' : 'muted'}">${nf(avg)}</td>
              <td>${trustBadge(l.updatedH)}</td>
              <td><button class="btn sm2" data-quick="${l.id}">تأكيد السعر الحالي</button></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="sm muted">كل أسعارك محدثة. ممتاز 👏</p>'}
        </div>
        <div class="card pad mt14">
          <div class="b mb10">🔥 أكثر منتجاتك تفاعلًا (تقديري)</div>
          <div class="hbars">
            ${bestSeller.map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        const v = Math.round(rows.length ? (1 - rows.indexOf(l) / rows.length) * 100 + (l.disc || 0) : 0);
        return `<div class="hbar"><span>${p.em} ${esc(p.name)}</span><span class="num b">${v} نقطة تفاعل</span><span class="tr"><i style="width:${clamp(v, 5, 100)}%"></i></span></div>`;
      }).join('')}
          </div>
        </div>`: ''}

      ${tab === 'products' ? `
        <div class="between wrapx mb14">
          <div><div class="b">📦 المنتجات والأسعار (${rows.length})</div>
          <div class="tiny muted">عدّل السعر واحفظ — الحفظ يسجّل «آخر تحديث الآن» ويحدّث الصفحة العامة ونتائج البحث فورًا.</div></div>
          <div class="row gap6">
            <input class="input" id="dbFilter" placeholder="ابحث في منتجاتك..." style="width:200px">
            <button class="btn sm2" id="dbAddProd">➕ منتج جديد</button>
          </div>
        </div>
        <div class="tbl-wrap"><table class="tbl" id="dbTable">
          <thead><tr><th>المنتج</th><th>سعرك الحالي</th><th>السعر قبل الخصم</th><th>الخصم</th><th>متوفر</th><th>آخر تحديث</th><th>حفظ</th></tr></thead>
          <tbody>
            ${rows.map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        return `<tr data-name="${esc(norm(p.name))}">
              <td><div class="td-store"><span class="thumb" style="width:34px;height:34px;font-size:16px;border-radius:9px">${p.em}</span>
                <span><span class="sm b">${esc(p.name)}</span><span class="tiny muted" style="display:block">${esc(p.brand)} · ${catOf(p.cat).ar}</span></span></div></td>
              <td><input class="input num" style="width:110px" value="${l.price}" data-inp="${l.id}"></td>
              <td>${l.oldPrice ? `<span class="num muted">${nf(l.oldPrice)}</span>` : `<input class="input num" style="width:110px" placeholder="—" data-oldinp="${l.id}">`}</td>
              <td>${l.disc ? `<span class="badge acc">${pct(l.disc)}</span>` : '<span class="muted tiny">لا يوجد</span>'}</td>
              <td><input type="checkbox" data-stock="${l.id}" ${l.inStock ? 'checked' : ''}></td>
              <td>${trustBadge(l.updatedH)}</td>
              <td><div class="row gap6"><button class="btn primary sm2" data-save="${l.id}">💾 حفظ</button>
                <button class="btn sm2" data-fresh="${l.id}">✔️ تأكيد</button></div></td>
            </tr>`;
      }).join('')}
          </tbody></table></div>
        <div class="card pad mt14">
          <div class="b mb10">🧾 سجل تغييرات الأسعار (يُحفظ تاريخيًا)</div>
          <div class="timeline">
            ${DB.priceLog.map(x => `<div class="tl-item">
              <div class="sm"><b>${esc(x.product)}</b> — من <span class="num">${nf(x.from)}</span> إلى <span class="num" style="color:var(--p-d)">${nf(x.to)}</span> ج.م</div>
              <div class="tiny muted">بواسطة: ${esc(x.by)} · ${esc(x.at)}</div></div>`).join('')}
          </div>
        </div>`: ''}

      ${tab === 'offers' ? `
        <div class="between wrapx mb14">
          <div><div class="b">🔥 إدارة العروض</div><div class="tiny muted">العرض يُنشر في صفحتك وفي صفحة «العروض القريبة» لمن هم داخل النطاق.</div></div>
          <button class="btn primary sm2" id="dbNewOffer">➕ إنشاء عرض جديد</button>
        </div>
        <div class="grid g-auto">
          ${rows.filter(l => l.disc).map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId);
        return `<div class="card pad rel">
              <span class="ribbon">خصم ${pct(l.disc)}</span>
              <div class="row"><div class="thumb lg">${p.em}</div>
              <div><div class="b">${esc(p.name)}</div>
              <div class="priceline mt6"><span class="price-old num">${nf(l.oldPrice)}</span>${priceHtml(l.price)}</div>
              <div class="tiny muted mt6">توفير ${egp(l.oldPrice - l.price)} · ينتهي خلال ${l.offerEnds || 7} يوم</div></div></div>
              <div class="row gap6 mt10">
                <button class="btn sm2" data-offdel="${l.id}">إنهاء العرض</button>
                <button class="btn sm2" data-offext="${l.id}">تمديد أسبوع</button>
              </div></div>`;
      }).join('') || '<p class="sm muted">لا توجد عروض نشطة. أنشئ عرضًا لجذب العملاء.</p>'}
        </div>`: ''}

      ${tab === 'market' ? `
        <div class="between wrapx mb14">
          <div><div class="b">⚖️ سعرك مقارنة بباقي المتاجر المسجلة</div>
          <div class="tiny muted">بيانات مبنية على الأسعار المسجّلة على المنصة — مفيدة لتحديد سعرك بدقة.</div></div>
          <span class="badge ink">${market.filter(m => m.pos === 'cheapest').length} منتجًا بسعرك الأرخص</span>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المنتج</th><th>سعرك</th><th>أرخص سعر في السوق</th><th>متوسط السوق</th><th>موقعك</th><th>عدد المتاجر</th></tr></thead><tbody>
          ${market.map(m => {
        const p = PRODUCTS.find(x => x.id === m.l.productId);
        return `<tr><td><div class="td-store"><span class="thumb" style="width:32px;height:32px;font-size:15px;border-radius:8px">${p.em}</span><span class="sm b">${esc(p.name)}</span></div></td>
            <td class="num b">${nf(m.l.price)}</td>
            <td class="num">${nf(m.mn)}</td>
            <td class="num">${nf(m.avg)}</td>
            <td>${m.pos === 'cheapest' ? '<span class="badge ok">الأرخص في السوق</span>' : m.pos === 'below' ? `<span class="badge p">أقل من المتوسط ${Math.abs(m.diff)}%</span>` : `<span class="badge warn">أعلى من المتوسط ${m.diff}%</span>`}</td>
            <td class="num sm">${m.n}</td></tr>`;
      }).join('')}
        </tbody></table></div>
        <div class="insight info mt14"><span class="ic">💡</span><div class="sm">نصيحة: لو سعرك أعلى من المتوسط في منتج مطلوب، جرّب خصمًا بسيطًا — العملاء اللي بيراقبوا السعر هيجيلهم إشعار بذلك.</div></div>`: ''}

      ${tab === 'reviews' ? `
        <div class="grid g-side">
          <div>
            <div class="b mb10">⭐ تقييمات عملائك</div>
            ${(DB.reviews[st.id] || []).map(r => `<div class="review mb10">
              <div class="row between"><div class="row"><span class="avatar">${esc(r.user[0])}</span>
                <div><div class="sm b">${esc(r.user)}</div><div class="tiny muted">${when(r.days * 24)}</div></div></div>
                <span class="stars">${stars(r.rating)}</span></div>
              <p class="sm mt10">${esc(r.txt)}</p></div>`).join('') || '<p class="sm muted">لا توجد تقييمات بعد.</p>'}
          </div>
          <aside class="card pad">
            <div class="b mb10">ملخص</div>
            <div class="center"><div style="font-size:34px;font-weight:900" class="num">${st.rating.toFixed(1)}</div><div class="stars">${stars(st.rating)}</div><div class="tiny muted">${nf(st.rc)} تقييم</div></div>
            <hr class="sep">
            <div class="hbars">
              ${[['جودة الخدمة', 4.7], ['الأسعار', 4.3], ['التعامل', 4.8], ['دقة المعلومات', 4.2]]
      .map(([k, v]) => `<div class="hbar"><span>${k}</span><span class="num b">${v}/5</span><span class="tr"><i style="width:${v / 5 * 100}%"></i></span></div>`).join('')}
            </div>
            <p class="tiny muted mt14">التقييمات الوهمية تُراجع من الإدارة، والتقييمات المسيئة تُحذف.</p>
          </aside>
        </div>`: ''}

      ${tab === 'plan' ? `
        <div class="grid g-2">
          ${[['free', 'المجاني', '0 ج.م', ['صفحة متجر كاملة', 'حتى 30 منتجًا', 'معلومات تواصل وموقع', 'ظهور في نتائج البحث']],
      ['pro', 'الاحترافي', '199 ج.م / شهر', ['منتجات غير محدودة', 'إحصائيات كاملة وتقارير', 'عروض متقدمة وتنبيهات', 'أولوية في الظهور + شارة', 'تحليل أسعار المنافسين']]]
      .map(([k, t, pr, feats]) => `<div class="card pad ${st.plan === k ? 'best' : ''}">
          <div class="between"><div class="b" style="font-size:17px">${t}</div>${st.plan === k ? '<span class="badge p">باقتك الحالية</span>' : ''}</div>
          <div class="price big mt10">${pr}</div>
          <div class="info-list mt14">${feats.map(f => `<div class="info-item"><span class="ic">✅</span><span class="sm">${f}</span></div>`).join('')}</div>
          ${st.plan === k ? '' : `<button class="btn primary block mt14" data-plan="${k}">التبديل إلى ${t}</button>`}
        </div>`).join('')}
        </div>
        <div class="card pad mt14">
          <div class="b mb10">📢 إعلانات ومساحات مميزة</div>
          <div class="grid g-4">
            ${[['متجر ممول (إعلان)', 'من 500 ج.م / أسبوع', 'ظهور بادئة مميزة في نتائج البحث والصفحة الرئيسية'], ['عرض مميز', 'من 300 ج.م', 'إبراز عرض واحد في صفحة العروض'], ['بانر قسم', 'من 900 ج.م / أسبوع', 'ظهور أعلى قسم معين'], ['تقرير سوق', 'من 200 ج.م', 'تحليل أسعار الفئة التي تعمل بها']]
      .map(([t, p2, d]) => `<div class="stat"><div class="l">${t}</div><div class="b mt6">${p2}</div><div class="s mt6">${d}</div></div>`).join('')}
          </div>
          <p class="tiny muted mt14">كل المساحات المدفوعة تُعلَّم بوضوح «إعلان» حتى يعرف المستخدم الفرق بين نتيجة مدفوعة ونتيجة عضوية.</p>
        </div>`: ''}
    </div></div>
  </div>`);
}
function bindDashboard() {
  const sw = $('#dbStore'); if (sw) sw.onchange = () => { APP.myStore = sw.value; save('myStore', sw.value); setParam('store', sw.value); };
  document.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
    const id = b.dataset.save;
    const l = DB.listings.find(x => x.id === id);
    const inp = document.querySelector(`[data-inp="${id}"]`), old = document.querySelector(`[data-oldinp="${id}"]`), stk = document.querySelector(`[data-stock="${id}"]`);
    const np = +inp.value;
    if (!np || np <= 0) return toast('اكتب سعرًا صحيحًا', 'warn', '⚠️');
    const from = l.price;
    l.price = np;
    if (old && old.value) { l.oldPrice = +old.value; l.disc = Math.max(0, Math.round((1 - np / (+old.value)) * 100)); }
    l.inStock = stk ? stk.checked : l.inStock;
    l.updatedH = 0.02;
    const p = PRODUCTS.find(x => x.id === l.productId);
    DB.priceLog.unshift({ store: l.storeId, product: p.name, from, to: np, by: 'المتجر', at: 'الآن' });
    toast(`تم تحديث سعر ${p.name}: ${egp(from)} ← ${egp(np)} وظهر «محدث الآن» للعملاء`, 'ok', '💾');
    render();
  });
  document.querySelectorAll('[data-fresh]').forEach(b => b.onclick = () => {
    const l = DB.listings.find(x => x.id === b.dataset.fresh); l.updatedH = 0.05; toast('تم تأكيد السعر كأحدث بيانات', 'ok', '✔️'); render();
  });
  document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
    const l = DB.listings.find(x => x.id === b.dataset.quick); l.updatedH = 0.05; toast('تم تأكيد السعر الحالي كبيانات حديثة', 'ok', '✔️'); render();
  });
  const bl = $('#dbBulk');
  if (bl) bl.onclick = () => {
    DB.byStore[APP.route.p.store || APP.myStore].forEach(l => l.updatedH = 0.03);
    toast('تم تحديث كل الأسعار — كل أسعارك الآن «حديثة»', 'ok', '🔄'); render();
  };
  const no = $('#dbNewOffer');
  if (no) no.onclick = () => {
    const rows2 = DB.byStore[APP.route.p.store || APP.myStore];
    openModal('🔥 إنشاء عرض جديد', `
      <div class="field mb14"><label>المنتج</label><select class="select" id="ofProd">
        ${rows2.map(l => { const p = PRODUCTS.find(x => x.id === l.productId); return `<option value="${l.id}">${esc(p.name)} — سعرك ${nf(l.price)}</option>`; }).join('')}
      </select></div>
      <div class="grid g-2 mb14">
        <div class="field"><label>نسبة الخصم</label><select class="select" id="ofDisc">${[5, 8, 10, 15, 20, 25, 30].map(v => `<option value="${v}">${v}%</option>`).join('')}</select></div>
        <div class="field"><label>مدة العرض</label><select class="select" id="ofDur">${[[3, '3 أيام'], [7, 'أسبوع'], [14, 'أسبوعان'], [30, 'شهر']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      </div>
      <label class="switch"><input type="checkbox" checked> إرسال إشعار للمستخدمين الذين يتابعون هذا المنتج 🔔</label>
      <div class="insight info mt14"><span class="ic">👥</span><div class="sm">يوجد <b>${3 + Math.floor(rnd('sub' + (APP.route.p.store || APP.myStore)) * 30)}</b> مستخدمًا يتابعون منتجات متجرك — العرض سيظهر لهم في تنبيهاتهم.</div></div>`,
      `<button class="btn primary" id="ofSave">نشر العرض</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
    $('#ofSave').onclick = () => {
      const l = DB.listings.find(x => x.id === $('#ofProd').value);
      const d = +$('#ofDisc').value, dur = +$('#ofDur').value;
      l.oldPrice = round(l.price / (1 - d / 100), 5); l.disc = d; l.offerEnds = dur; l.updatedH = 0.02;
      DB.offers = DB.listings.filter(x => x.disc >= 10).sort((a, b) => b.disc - a.disc);
      closeModal(); render(); toast('تم نشر العرض وظهر في صفحة العروض القريبة', 'ok', '🔥');
    };
  };
  document.querySelectorAll('[data-offdel]').forEach(b => b.onclick = () => {
    const l = DB.listings.find(x => x.id === b.dataset.offdel); l.disc = 0; l.oldPrice = null; l.offerEnds = null;
    DB.offers = DB.listings.filter(x => x.disc >= 10); render(); toast('تم إنهاء العرض', 'ok', '⏹️');
  });
  document.querySelectorAll('[data-offext]').forEach(b => b.onclick = () => {
    const l = DB.listings.find(x => x.id === b.dataset.offext); l.offerEnds = (l.offerEnds || 7) + 7; render(); toast('تم تمديد العرض أسبوعًا', 'ok', '⏱️');
  });
  document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
    const st = DB.stores.find(s => s.id === (APP.route.p.store || APP.myStore));
    st.plan = b.dataset.plan; render();
    toast(st.plan === 'pro' ? 'تم تفعيل الباقة الاحترافية (توضيحي) 💎' : 'تم الرجوع للباقة المجانية', 'ok', '💎');
  });
  const f = $('#dbFilter');
  if (f) f.oninput = () => {
    const v = norm(f.value);
    $$('#dbTable tbody tr').forEach(tr => tr.style.display = !v || tr.dataset.name.includes(v) ? '' : 'none');
  };
  const ap = $('#dbAddProd');
  if (ap) ap.onclick = () => openAddProduct();
}
function openAddProduct() {
  const storeId = APP.route.p.store || APP.myStore;
  openModal('➕ إضافة منتج جديد', `
    <div class="field mb14"><label>اسم المنتج</label><input class="input" id="npName" placeholder="مثال: سماعة JBL Tune 520BT"></div>
    <div class="grid g-2 mb14">
      <div class="field"><label>السعر الحالي (ج.م)</label><input class="input num" id="npPrice" placeholder="0"></div>
      <div class="field"><label>السعر قبل الخصم (اختياري)</label><input class="input num" id="npOld" placeholder="—"></div>
    </div>
    <div class="grid g-2 mb14">
      <div class="field"><label>القسم</label><select class="select" id="npCat">${CATS.map(c => `<option value="${c.id}">${c.em} ${c.ar}</option>`).join('')}</select></div>
      <div class="field"><label>الماركة</label><input class="input" id="npBrand" placeholder="JBL"></div>
    </div>
    <label class="switch"><input type="checkbox" id="npStock" checked> متوفر حاليًا</label>`,
    `<button class="btn primary" id="npSave">إضافة المنتج</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  $('#npSave').onclick = () => {
    const name = $('#npName').value.trim(), price = +$('#npPrice').value, old = +$('#npOld').value || null, cat = $('#npCat').value;
    if (!name || !price) return toast('اكتب اسم المنتج والسعر', 'warn', '⚠️');
    const pid = 'c' + uid().slice(0, 5);
    PRODUCTS.push(P(pid, name, $('#npBrand').value.trim() || 'متجر', cat, price, catOf(cat).em, norm(name)));
    const l = { id: 'L' + pid, storeId, productId: pid, price, oldPrice: old, disc: old ? Math.round((1 - price / old) * 100) : 0, inStock: $('#npStock').checked, updatedH: 0, brand: $('#npBrand').value.trim() || 'متجر', cat, warranty: 'سنة', offerEnds: old ? 10 : null };
    DB.listings.push(l); (DB.byStore[storeId] = DB.byStore[storeId] || []).push(l); (DB.byProduct[pid] = DB.byProduct[pid] || []).push(l);
    closeModal(); render(); toast('تم إضافة المنتج ونشره على صفحتك', 'ok', '📦');
  };
}

/* ---------------- 🛡️ لوحة الإدارة ---------------- */
function adminPage() {
  const tab = APP.route.p.tab || 'overview';
  const totalListings = DB.listings.length;
  const staleAll = DB.listings.filter(l => l.updatedH > 96);
  const pending = DB.reports.filter(r => r.status === 'جديد');
  const byCity = {};
  DB.stores.forEach(s => byCity[s.city] = (byCity[s.city] || 0) + 1);
  const cityRows = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
  const staleByStore = DB.stores.map(s => ({ s, n: (DB.byStore[s.id] || []).filter(l => l.updatedH > 96).length, t: (DB.byStore[s.id] || []).length })).filter(x => x.n).sort((a, b) => b.n - a.n);

  return shell('admin', `
  <div class="wrap" style="padding-top:22px">
    <div class="sec-head">
      <div><h1 style="font-size:25px">🛡️ لوحة تحكم الإدارة</h1><p>إدارة المتاجر، المنتجات، البلاغات، وموثوقية البيانات على مستوى المنصة.</p></div>
      <div class="row gap6"><span class="badge warn">${pending.length} بلاغ جديد</span><span class="badge danger" style="background:var(--danger-s);color:var(--danger)">${staleAll.length} سعرًا يحتاج تحديثًا</span></div>
    </div>

    <div class="grid g-4 mb14">
      ${kpiCard('إجمالي المتاجر', nf(DB.stores.length), `${DB.stores.filter(s => s.verified).length} موثق · ${DB.stores.filter(s => s.plan === 'pro').length} احترافي`)}
      ${kpiCard('إجمالي المنتجات', nf(PRODUCTS.length), `${nf(totalListings)} سعرًا مسجّلًا`)}
      ${kpiCard('المستخدمون', '12,480', '▲ 340 هذا الأسبوع', 'ok')}
      ${kpiCard('البلاغات المفتوحة', nf(pending.length), `${DB.reports.length} بلاغًا إجمالًا`)}
    </div>

    <div class="card"><div style="padding:6px 14px"><div class="tabs">
      ${[['overview', '📊 نظرة عامة'], ['stores', '🏪 المتاجر'], ['reports', '🚨 البلاغات'], ['products', '📦 المنتجات والأسعار'], ['ads', '📢 الإعلانات والاشتراكات']]
      .map(([k, l]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/admin?tab=${k}">${l}</a>`).join('')}
    </div></div>
    <div class="modal-body">
      ${tab === 'overview' ? `
        <div class="grid g-2">
          <div class="card pad">
            <div class="b mb10">🗺️ توزيع المتاجر على المحافظات</div>
            <div class="hbars">${cityRows.slice(0, 10).map(([c, n]) => `<div class="hbar"><span>${esc(c)}</span><span class="num b">${n}</span><span class="tr"><i style="width:${n / cityRows[0][1] * 100}%"></i></span></div>`).join('')}</div>
            <p class="tiny muted mt14">التوسع المقترح: مراكز المدن ذات الكثافة التجارية العالية (القاهرة الكبرى ← الإسكندرية ← الدلتا ← الصعيد).</p>
          </div>
          <div class="card pad">
            <div class="b mb10">🕐 موثوقية البيانات على المنصة</div>
            <div class="hbars">
              ${[['حديثة (24 ساعة)', DB.listings.filter(l => l.updatedH <= 24).length, 'var(--ok)'],
      ['مقبولة (1-4 أيام)', DB.listings.filter(l => l.updatedH > 24 && l.updatedH <= 96).length, 'var(--p)'],
      ['تحتاج تحديثًا (4-10 أيام)', DB.listings.filter(l => l.updatedH > 96 && l.updatedH <= 240).length, 'var(--warn)'],
      ['قديمة (أكثر من 10 أيام)', DB.listings.filter(l => l.updatedH > 240).length, 'var(--danger)']]
      .map(([k, v, c]) => `<div class="hbar"><span>${k}</span><span class="num b">${v}</span><span class="tr"><i style="width:${v / totalListings * 100}%;background:${c}"></i></span></div>`).join('')}
            </div>
            <hr class="sep">
            ${donut(Math.round(DB.listings.filter(l => l.updatedH <= 96).length / totalListings * 100), 'نسبة الأسعار الموثوقة (خلال 4 أيام)')}
          </div>
        </div>
        <div class="grid g-2 mt14">
          <div class="card pad">
            <div class="b mb10">📈 أهم مؤشرات الأسبوع</div>
            <div class="hbars">
              ${[['عمليات بحث', 18420], ['ضغطات واتساب', 3260], ['مكالمات', 2740], ['طلبات اتجاهات', 1980], ['تنبيهات سعر جديدة', 640], ['تقييمات جديدة', 128]]
      .map(([k, v]) => `<div class="hbar"><span>${k}</span><span class="num b">${nf(v)}</span><span class="tr"><i style="width:${v / 18420 * 100}%"></i></span></div>`).join('')}
            </div>
          </div>
          <div class="card pad">
            <div class="b mb10">🎯 أكثر الأقسام بحثًا والمتاجر التي تغطيها</div>
            <div class="hbars">
              ${CATS.slice(0, 8).map(c => {
        const n = DB.stores.filter(s => s.cats.includes(c.id)).length;
        return `<div class="hbar"><span>${c.em} ${c.ar}</span><span class="num b">${n} متجر</span><span class="tr"><i style="width:${n / DB.stores.length * 145}%"></i></span></div>`;
      }).join('')}
            </div>
            <p class="tiny muted mt14">الفجوات = أقسام عليها بحث عالٍ وعدد متاجر قليل ⇒ أولوية في التوظيف التجاري (Sales).</p>
          </div>
        </div>`: ''}

      ${tab === 'stores' ? `
        <div class="between wrapx mb14">
          <div><div class="b">🏪 إدارة المتاجر (${DB.stores.length})</div><div class="tiny muted">الموافقة على المتاجر الجديدة، التوثيق ✔️، ومراقبة حداثة البيانات.</div></div>
          <div class="row gap6"><input class="input" id="adSearch" placeholder="ابحث باسم المتجر..." style="width:200px">
            <select class="select" id="adCity" style="width:160px"><option value="">كل المحافظات</option>${Object.keys(byCity).map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
        </div>
        <div class="tbl-wrap"><table class="tbl" id="adTable"><thead><tr>
          <th>المتجر</th><th>المحافظة</th><th>المنتجات</th><th>حداثة البيانات</th><th>الباقة</th><th>التوثيق</th><th>إجراءات</th></tr></thead><tbody>
          ${DB.stores.map(s => {
        const rows3 = DB.byStore[s.id] || [];
        const fresh = rows3.length ? Math.round(rows3.filter(l => l.updatedH <= 96).length / rows3.length * 100) : 0;
        return `<tr data-name="${esc(norm(s.name))}" data-city="${esc(s.city)}">
              <td><div class="td-store"><span class="thumb" style="width:34px;height:34px;font-size:16px;border-radius:9px">${catOf(s.cats[0]).em}</span>
                <span><span class="b"><a href="#/store/${s.id}">${esc(s.name)}</a></span><span class="tiny muted" style="display:block">${esc(s.area)} · منذ ${s.joined}</span></span></div></td>
              <td class="sm">${esc(s.city)}</td>
              <td class="num">${rows3.length}</td>
              <td><span class="badge ${fresh >= 70 ? 'ok' : fresh >= 40 ? 'warn' : 'bad'}">${fresh}% موثوق</span></td>
              <td>${s.plan === 'pro' ? '<span class="badge acc">احترافي</span>' : '<span class="badge ink">مجاني</span>'}</td>
              <td>${s.verified ? '<span class="badge p">✔️ موثق</span>' : '<span class="badge warn">قيد المراجعة</span>'}</td>
              <td><div class="row gap6">
                <button class="btn sm2" data-admin-vf="${s.id}">${s.verified ? 'إلغاء التوثيق' : 'توثيق ✔️'}</button>
                <button class="btn sm2" data-admin-ping="${s.id}">طلب تحديث الأسعار</button>
              </div></td></tr>`;
      }).join('')}
        </tbody></table></div>`: ''}

      ${tab === 'reports' ? `
        <div class="between wrapx mb14">
          <div><div class="b">🚨 بلاغات المستخدمين (${DB.reports.length})</div>
          <div class="tiny muted">بلاغات الأسعار الخاطئة والتوفر ومعلومات المتاجر — كل بلاغ يوصل هنا ويُتابع حتى الإغلاق.</div></div>
          <span class="badge warn">${pending.length} بحاجة إلى مراجعة</span>
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>الرقم</th><th>النوع</th><th>الهدف</th><th>ملاحظة المستخدم</th><th>الوقت</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
          ${DB.reports.map(r => `<tr>
            <td class="num sm">${esc(r.id)}</td>
            <td><span class="badge ${r.type.includes('سعر') ? 'acc' : 'ink'}">${esc(r.type)}</span></td>
            <td class="sm">${esc(r.target)}</td>
            <td class="sm muted">${esc(r.note)}</td>
            <td class="tiny muted">${esc(r.at)}</td>
            <td><span class="badge ${r.status === 'جديد' ? 'warn' : r.status === 'تم' ? 'ok' : 'info'}">${esc(r.status)}</span></td>
            <td><div class="row gap6">
              <button class="btn sm2" data-rep-next="${r.id}">تقديم الحالة</button>
              <button class="btn sm2" data-rep-stale="${r.id}">طلب تحديث السعر من المتجر</button>
            </div></td></tr>`).join('')}
        </tbody></table></div>
        <div class="insight info mt14"><span class="ic">⚙️</span><div class="sm">في النسخة النهائية: ربط البلاغ بسجل تغييرات السعر للمتجر، وتنبيه تلقائي للمتجر المخالف، وخصم على «مؤشر دقة البيانات» الظاهر في صفحته.</div></div>`: ''}

      ${tab === 'products' ? `
        <div class="between wrapx mb14">
          <div><div class="b">📦 المنتجات التي تحتاج تحديث سعر (${staleAll.length})</div>
          <div class="tiny muted">نطلبها من المتاجر، ولو ما استجابش تتدرج حالة البيانات لـ«قديمة» ويظهر تحذير للمستخدم.</div></div>
          <button class="btn primary sm2" id="adPingAll">📨 إرسال طلبات تحديث لكل المتاجر</button>
        </div>
        <div class="hbars mb14">
          ${staleByStore.slice(0, 8).map(x => `<div class="hbar"><span><a href="#/store/${x.s.id}">${esc(x.s.name)}</a></span><span class="num b">${x.n} / ${x.t}</span>
            <span class="tr"><i style="width:${x.n / x.t * 100}%;background:var(--warn)"></i></span></div>`).join('')}
        </div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>المنتج</th><th>المتجر</th><th>السعر</th><th>آخر تحديث</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>
          ${staleAll.slice(0, 25).map(l => {
        const p = PRODUCTS.find(x => x.id === l.productId), s = DB.stores.find(x => x.id === l.storeId);
        return `<tr><td><div class="td-store"><span class="thumb" style="width:32px;height:32px;font-size:15px;border-radius:8px">${p.em}</span><span class="sm b">${esc(p.name)}</span></div></td>
            <td class="sm"><a href="#/store/${s.id}">${esc(s.name)}</a></td>
            <td class="num">${nf(l.price)}</td><td>${trustBadge(l.updatedH)}</td>
            <td>${l.updatedH > 240 ? '<span class="badge bad">قديم</span>' : '<span class="badge warn">يحتاج تحديثًا</span>'}</td>
            <td><div class="row gap6"><button class="btn sm2" data-adm-ping="${l.storeId}">طلب من المتجر</button>
              <button class="btn sm2" data-adm-fix="${l.id}">تعليم كمُراجَع</button></div></td></tr>`;
      }).join('')}
        </tbody></table></div>`: ''}

      ${tab === 'ads' ? `
        <div class="grid g-2">
          <div class="card pad">
            <div class="b mb10">📢 حملات إعلانية نشطة (توضيحي)</div>
            <div class="tbl-wrap"><table class="tbl" style="min-width:auto"><thead><tr><th>المتجر</th><th>النوع</th><th>المدة</th><th>المشاهدات</th><th>النقرات</th></tr></thead><tbody>
              ${DB.stores.filter(s => s.sponsored).map(s => `<tr><td class="sm b"><a href="#/store/${s.id}">${esc(s.name)}</a></td>
                <td><span class="badge acc">متجر ممول</span></td><td class="sm">أسبوع</td>
                <td class="num">${nf(s.views)}</td><td class="num">${nf(s.clicksWa)}</td></tr>`).join('')}
              <tr><td class="sm b">الرائد كمبيوتر</td><td><span class="badge acc">بانر قسم</span></td><td class="sm">5 أيام</td><td class="num">4,120</td><td class="num">318</td></tr>
            </tbody></table></div>
            <p class="tiny muted mt14">كل المساحات المدفوعة تُعلّم بوضوح «إعلان» في الواجهة.</p>
          </div>
          <div class="card pad">
            <div class="b mb10">💎 الاشتراكات</div>
            <div class="hbars">
              ${[['احترافي (199 ج.م/شهر)', DB.stores.filter(s => s.plan === 'pro').length], ['مجاني', DB.stores.filter(s => s.plan === 'free').length]]
      .map(([k, v]) => `<div class="hbar"><span>${k}</span><span class="num b">${v} متجرًا</span><span class="tr"><i style="width:${v / DB.stores.length * 100}%"></i></span></div>`).join('')}
            </div>
            <hr class="sep">
            <div class="grid g-4">
              ${kpiCard('إيراد اشتراكات تقديري', egp(DB.stores.filter(s => s.plan === 'pro').length * 199), 'شهريًا')}
              ${kpiCard('إعلانات', egp(8500), 'هذا الشهر', 'ok')}
            </div>
            <div class="insight warn mt14"><span class="ic">📌</span><div class="sm">التسعير والمراحل: MVP مجاني بالكامل للمتاجر، ثم إدخال الاحترافي بعد الوصول لعدد كافٍ من المتاجر النشطة والمستخدمين.</div></div>
          </div>
        </div>`: ''}
    </div></div>
  </div>`);
}
function bindAdmin() {
  document.querySelectorAll('[data-admin-vf]').forEach(b => b.onclick = () => {
    const s = DB.stores.find(x => x.id === b.dataset.adminVf); s.verified = !s.verified; render();
    toast(s.verified ? `تم توثيق ${s.name} ✔️` : `تم إلغاء توثيق ${s.name}`, 'ok', '🛡️');
  });
  document.querySelectorAll('[data-admin-ping]').forEach(b => b.onclick = () => {
    const s = DB.stores.find(x => x.id === b.dataset.adminPing);
    toast(`تم إرسال طلب تحديث أسعار إلى ${s.name} (واتساب + إيميل)`, 'ok', '📨');
  });
  document.querySelectorAll('[data-rep-next]').forEach(b => b.onclick = () => {
    const r = DB.reports.find(x => x.id === b.dataset.repNext);
    r.status = r.status === 'جديد' ? 'قيد المراجعة' : r.status === 'قيد المراجعة' ? 'تم' : 'مغلق';
    render(); toast('تم تحديث حالة البلاغ: ' + r.status, 'ok', '🚨');
  });
  document.querySelectorAll('[data-rep-stale]').forEach(b => b.onclick = () => {
    const r = DB.reports.find(x => x.id === b.dataset.repStale);
    const st = DB.stores.find(s => r.target.includes(s.name));
    if (st) DB.byStore[st.id].forEach(l => { });
    r.status = 'قيد المراجعة'; render(); toast('تم إرسال طلب تحديث سعر للمتجر', 'ok', '📨');
  });
  document.querySelectorAll('[data-adm-fix]').forEach(b => b.onclick = () => {
    const l = DB.listings.find(x => x.id === b.dataset.admFix); l.updatedH = 2; render(); toast('تم تعليم السعر كمُراجَع', 'ok', '✔️');
  });
  document.querySelectorAll('[data-adm-ping]').forEach(b => b.onclick = () => toast('تم إرسال طلب تحديث للمتجر', 'ok', '📨'));
  const pa = $('#adPingAll');
  if (pa) pa.onclick = () => {
    staleAllForAdmin().forEach(l => l.updatedH = 1);
    render(); toast('تم إرسال طلبات تحديث وتعليم الأسعار كمُراجَعة', 'ok', '📨');
  };
  const s = $('#adSearch'), c = $('#adCity');
  const filt = () => {
    const v = norm(s.value), city = c.value;
    $$('#adTable tbody tr').forEach(tr => {
      const ok = (!v || tr.dataset.name.includes(v)) && (!city || tr.dataset.city === city);
      tr.style.display = ok ? '' : 'none';
    });
  };
  if (s) s.oninput = filt; if (c) c.onchange = filt;
}
function staleAllForAdmin() { return DB.listings.filter(l => l.updatedH > 96); }

/* ---------------- النوافذ المساعدة ---------------- */
function openRadius(cb) {
  openModal('📍 نطاق البحث', `
    <p class="sm muted">حدّد المسافة التي تقبلها للوصول للمتجر. القريب أرخص في الوقت، لكن السعر الأفضل قد يستحق مشوارًا أطول.</p>
    <div class="chips mt14">
      ${[['0.5', '500 متر'], ['1', '1 كم'], ['3', '3 كم'], ['5', '5 كم'], ['10', '10 كم'], ['25', '25 كم'], ['100', '100 كم']].map(([v, l]) => `<button class="chip" data-rc="${v}">${l}</button>`).join('')}
    </div>`,
    `<button class="btn" onclick="closeModal()">إغلاق</button>`);
  $$('[data-rc]').forEach(b => b.onclick = () => {
    APP.radius = +b.dataset.rc; save('radius', APP.radius);
    closeModal();
    if (cb) cb(b.dataset.rc); else go('search', { dist: b.dataset.rc });
    toast('تم تحديث النطاق إلى ' + b.textContent, 'ok', '📍');
  });
}
function openLocation() {
  const cities = Array.from(new Set(DB.stores.map(s => s.city)));
  const areas = Array.from(new Set(DB.stores.map(s => s.area)));
  openModal('📍 تحديد موقعك', `
    <p class="sm muted">نستخدم موقعك لحساب المسافات وترتيب المتاجر القريبة. في حالة عدم السماح بالوصول للموقع، اختر منطقتك يدويًا.</p>
    <button class="btn primary block mt14" id="useGeo">📍 استخدام موقعي الحالي</button>
    <hr class="sep">
    <div class="field mb10"><label>ابحث عن منطقتك أو محافظتك</label><input class="input" id="locQ" placeholder="مثال: المهندسين، مدينة نصر، الإسكندرية"></div>
    <div class="scroll-x mb10">${cities.slice(0, 10).map(c => `<button class="chip" data-loccity="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="tabs" style="border:0;margin-bottom:8px"><span class="tab on">المناطق</span><span class="tiny muted" style="padding:12px 0">اضغط لاختيار منطقتك</span></div>
    <div class="chips" id="areaList">
      ${areas.map(a => {
    const st = DB.stores.find(s => s.area === a);
    return `<button class="chip" data-locarea="${esc(a)}" data-city="${esc(st.city)}">📍 ${esc(a)} — ${esc(st.city)}</button>`;
  }).join('')}
    </div>
    <div class="insight info mt14"><span class="ic">🔒</span><div class="tiny">في النموذج التجريبي: الموقع الافتراضي هو وسط الجيزة. في النسخة النهائية لا يُحفظ موقع دقيق بدون إذنك، ويمكنك استخدام «تقريبي» للمدينة فقط.</div></div>`,
    `<button class="btn" onclick="closeModal()">إلغاء</button>`);
  $('#useGeo').onclick = () => {
    if (!navigator.geolocation) return toast('المتصفح لا يدعم تحديد الموقع', 'warn', '📍');
    toast('جارٍ قراءة موقعك...', 'ok', '📡');
    navigator.geolocation.getCurrentPosition(p => {
      const lat = p.coords.latitude, lon = p.coords.longitude;
      const nearest = DB.stores.map(s => ({ s, d: distKm({ lat, lon }, s) })).sort((a, b) => a.d - b.d)[0];
      APP.loc = { lat, lon, label: 'موقعك الحالي — قريب من ' + nearest.s.area, area: nearest.s.area, city: nearest.s.city, exact: true };
      closeModal(); render(); toast('تم تحديد موقعك وحساب المسافات', 'ok', '📍');
    }, () => toast('لم نتمكن من قراءة موقعك — اختر منطقتك يدويًا', 'warn', '⚠️'));
  };
  $$('[data-locarea]').forEach(b => b.onclick = () => {
    const st = DB.stores.find(s => s.area === b.dataset.locarea);
    APP.loc = { lat: st.lat, lon: st.lon, label: st.area + ' — ' + st.city, area: st.area, city: st.city, exact: false };
    closeModal(); render(); toast('تم تحديد موقعك: ' + st.area, 'ok', '📍');
  });
  $$('[data-loccity]').forEach(b => b.onclick = () => {
    const list = DB.stores.filter(s => s.city === b.dataset.loccity);
    const lat = list.reduce((a, s) => a + s.lat, 0) / list.length, lon = list.reduce((a, s) => a + s.lon, 0) / list.length;
    APP.loc = { lat, lon, label: 'وسط ' + b.dataset.loccity, area: b.dataset.loccity, city: b.dataset.loccity, exact: false };
    closeModal(); render(); toast('تم تحديد المحافظة: ' + b.dataset.loccity, 'ok', '📍');
  });
  const lq = $('#locQ');
  if (lq) lq.oninput = () => {
    const v = norm(lq.value);
    $$('#areaList [data-locarea]').forEach(b => b.style.display = (!v || norm(b.textContent).includes(v)) ? '' : 'none');
  };
}
function openLogin() {
  openModal('📱 الدخول إلى سوقي', `
    <div class="field mb10"><label>رقم الموبايل</label><input class="input num" id="lgPhone" placeholder="01xxxxxxxxx" value="${APP.user ? esc(APP.user.phone) : ''}"></div>
    <button class="btn primary block" id="lgSend">إرسال كود التحقق</button>
    <div id="lgStep2" class="hide mt14">
      <div class="field mb10"><label>كود التحقق (وصل رسالة نصية)</label><input class="input num" id="lgOtp" placeholder="4 أرقام" value="1234"></div>
      <div class="insight info"><span class="ic">💬</span><div class="sm">كود النموذج التجريبي: <b class="num">1234</b></div></div>
      <div class="field mt10"><label>اسمك</label><input class="input" id="lgName" placeholder="مثال: أحمد"></div>
      <button class="btn primary block mt10" id="lgGo">دخول</button>
    </div>
    <p class="tiny muted mt14">بتسجيلك، تقدر تحفظ متاجر ومنتجات، تتابع الأسعار، وتستقبل تنبيهات الانخفاض. بيانات النموذج محلية على جهازك فقط.</p>`);
  $('#lgSend').onclick = () => {
    if (!$('#lgPhone').value.trim()) return toast('اكتب رقم الموبايل', 'warn', '⚠️');
    $('#lgStep2').classList.remove('hide');
    toast('تم إرسال الكود — استخدم 1234', 'ok', '💬');
  };
  $('#lgGo').onclick = () => {
    if ($('#lgOtp').value.trim() !== '1234') return toast('الكود غير صحيح — جرّب 1234', 'warn', '⚠️');
    APP.user = { name: ($('#lgName').value.trim() || 'مستخدم سوقي'), phone: $('#lgPhone').value.trim(), since: 'سبتمبر 2026' };
    save('user', APP.user); closeModal(); render(); toast('أهلًا بك في سوقي يا ' + APP.user.name + ' 👋', 'ok', '🎉');
  };
}
function openAlertModal(pid, edit) {
  const products = PRODUCTS.filter(p => (DB.byProduct[p.id] || []).length);
  const cur = (DB.alerts.find(a => a.productId === pid) || {}).target || '';
  const p = PRODUCTS.find(x => x.id === pid) || products[0];
  const ls = (DB.byProduct[p.id] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId) })).sort((a, b) => a.price - b.price);
  const best = ls[0];
  openModal('🔔 تنبيه تغيّر السعر', `
    <p class="sm muted">حدّد الحد الذي تريد الشراء عنده. نراقب كل المتاجر المسجّلة ونرسل إشعارًا لما ينزل أي متجر تحت هذا السعر — بدون أي سعر مُقدّر من عندنا.</p>
    <div class="field mt14 mb10"><label>المنتج</label>
      <select class="select" id="alProd">${products.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.em} ${esc(x.name)}</option>`).join('')}</select></div>
    ${best ? `<div class="insight mt6"><span class="ic">💰</span><div class="sm">أرخص سعر مسجّل حاليًا: <b>${egp(best.price)}</b> في ${esc(best.st.name)} (${kmTxt(distKm(LOC, best.st))}) — محدّث ${when(ls[0].updatedH)}</div></div>` : ''}
    <div class="field mt14 mb10"><label>أبلغني لو السعر نزل تحت (ج.م)</label>
      <input class="input num" id="alTarget" value="${cur || (best ? Math.round(best.price * 0.95 / 50) * 50 : '')}" placeholder="مثال: 24000"></div>
    <div class="row wrapx gap6 mb14">
      ${best ? [['‎-3%', .97], ['‎-5%', .95], ['‎-10%', .90], ['‎-15%', .85]].map(([l, f]) => `<button class="chip" data-sugg="${Math.round(best.price * f / 50) * 50}">${l} (${nf(Math.round(best.price * f / 50) * 50)})</button>`).join('') : ''}
    </div>
    <div class="grid g-2 mb10">
      <div class="field"><label>نطاق المتابعة</label><select class="select" id="alScope">
        <option value="any">أي متجر على المنصة</option><option value="near">متاجر داخل 10 كم فقط</option><option value="open">المتاجر المفتوحة فقط</option></select></div>
      <div class="field"><label>طريقة الإشعار</label><select class="select"><option>إشعار داخلي + بريد إلكتروني</option><option>واتساب</option><option>كل الوسائل</option></select></div>
    </div>
    <label class="switch"><input type="checkbox" checked> أبلغني أيضا عند ظهور الخصومات على هذا المنتج</label>`,
    `<button class="btn primary" id="alSave">حفظ التنبيه</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  $$('[data-sugg]').forEach(b => b.onclick = () => $('#alTarget').value = b.dataset.sugg);
  $('#alProd').onchange = () => openAlertModal($('#alProd').value);
  $('#alSave').onclick = () => {
    const target = +$('#alTarget').value;
    if (!target) return toast('حدّد السعر المطلوب', 'warn', '⚠️');
    const existing = DB.alerts.find(a => a.productId === p.id);
    if (existing) { existing.target = target; existing.created = 0; } else DB.alerts.push({ id: uid(), productId: p.id, storeName: 'أي متجر', target, created: 0, hits: 0 });
    closeModal(); render();
    const hit = alertsMatch().find(h => h.alert.productId === p.id);
    toast(hit ? `تنبيهك متحقق حاليًا! ${esc(hit.best.st.name)} بسعر ${egp(hit.best.price)}` : 'تم حفظ التنبيه — هنبلّغك عند الانخفاض', 'ok', '🔔');
  };
}
function openReportModal(sid, pid) {
  const types = ['السعر غير صحيح', 'المنتج غير متوفر', 'العرض انتهى', 'المتجر مغلق في المواعيد', 'بيانات المتجر غير صحيحة', 'صورة أو وصف مخالف', 'تقييم مسيء'];
  openModal('🚨 إبلاغ', `
    <p class="sm muted">بلاغك يصل لإدارة المنصة ويساعد في تحديث السعر أو إيقاف البيانات الخاطئة. شكرًا لمساعدتك في تحسين دقة المنصة.</p>
    <div class="field mt14 mb10"><label>نوع البلاغ</label>
      <div class="chips" id="repTypes">${types.map((t, i) => `<button class="chip ${i === 0 ? 'p' : ''}" data-rep="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
    <div class="field mb10"><label>المتجر / المنتج</label>
      <input class="input" value="${esc(sid ? (DB.stores.find(s => s.id === sid) || {}).name || '' : '')}${pid ? ' — ' + esc((PRODUCTS.find(x => x.id === pid) || {}).name || '') : ''}" placeholder="اسم المتجر أو المنتج"></div>
    <div class="field mb10"><label>السعر الصحيح في الفرع (اختياري)</label><input class="input num" placeholder="مثال: 24500"></div>
    <div class="field mb10"><label>ملاحظاتك</label><textarea class="input" rows="3" placeholder="وضّح ما حدث بالتفصيل..."></textarea></div>
    <label class="switch"><input type="checkbox" checked> أرسل لي إشعار بحالة البلاغ</label>`,
    `<button class="btn primary" id="repSave">إرسال البلاغ</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  $$('#repTypes .chip').forEach(b => b.onclick = () => { $$('#repTypes .chip').forEach(x => x.classList.remove('p')); b.classList.add('p'); });
  $('#repSave').onclick = () => {
    const type = ($('#repTypes .chip.p') || {}).textContent || 'سعر غير صحيح';
    DB.reports.unshift({ id: 'R-' + (1042 + DB.reports.length), type, target: $('#modal-root input.input').value || 'غير محدد', note: 'بلاغ جديد من مستخدم', at: 'الآن', status: 'جديد' });
    closeModal(); toast('تم إرسال البلاغ — هيتابع مع المتجر وتسجيل السعر الصحيح', 'ok', '🚨');
  };
}
function trustModal() {
  openModal('🛡️ موثوقية البيانات في سوقي', `
    <p class="sm">المنصة تعرض فقط ما سجّله المتجر فعليًا، وتوضح للمستخدم عمر المعلومة. هذا ما يميزها عن معلومة تبدو مؤكدة وهي غير مؤكدة.</p>
    <div class="mt14">
      ${TRUST.slice().reverse().map(t => `<div class="insight ${t.lvl === 'fresh' ? '' : t.lvl === 'ok' ? 'info' : t.lvl === 'warn' ? 'warn' : 'bad'} mb6">
        <span class="ic"><i class="dot ${t.dot}"></i></span>
        <div class="sm"><b>${t.ar}</b> — ${t.lvl === 'fresh' ? 'السعر اتحدّث خلال 24 ساعة.' : t.lvl === 'ok' ? 'آخر تحديث خلال 4 أيام.' : t.lvl === 'warn' ? 'آخر تحديث من 4 إلى 10 أيام — نُنبّه المستخدم.' : 'أكثر من 10 أيام — يظهر تحذير واضح للمستخدم ونطلب من المتجر التحديث.'}</div></div>`).join('')}
    </div>
    <hr class="sep">
    <div class="b mb10">كيف نحمي دقة الأسعار؟</div>
    <div class="info-list">
      <div class="info-item"><span class="ic">🧾</span><span>سجل تغييرات لكل سعر: من عدّله، متى، وما السعر السابق.</span></div>
      <div class="info-item"><span class="ic">📈</span><span>تاريخ أسعار 12 شهرًا لكل منتج، لمقارنة العروض ببعضها.</span></div>
      <div class="info-item"><span class="ic">🚨</span><span>بلاغات المستخدمين تُراجع وتُغلق، والمتاجر المتكررة الخطأ يُخفَّض مؤشر دقتها.</span></div>
      <div class="info-item"><span class="ic">🤖</span><span>الذكاء الاصطناعي يستخدم لفهم الطلب ومطابقة الموديلات — لا لاختراع أسعار.</span></div>
      <div class="info-item"><span class="ic">⏱️</span><span>طلب تحديث دوري من المتاجر، وأولوية ظهور للبيانات الحديثة.</span></div>
    </div>`, `<button class="btn primary" onclick="closeModal()">فهمت</button>`);
}

/* ---------------- المحرك الحي أثناء الكتابة ---------------- */
function bindLiveParse() {
  ['#heroSearch', '#resQ', '#miniSearch'].forEach(sel => {
    const el = $(sel); if (!el) return;
    const box = sel === '#heroSearch' || sel === '#resQ' ? $('#parseLive') : null;
    const upd = () => {
      const q = el.value.trim();
      if (!box) return;
      if (!q) { box.innerHTML = ''; return; }
      const p = parseQuery(q);
      const chips = [];
      if (p.product) chips.push(`<span class="pf ${el.id === 'heroSearch' ? '' : ''}" style="${el.id === 'heroSearch' ? 'background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.16);color:#FBE9EF' : ''}"><span class="lbl" style="${el.id === 'heroSearch' ? 'color:#D2B4BE' : ''}">المنتج</span><b>${esc(p.product.name)}</b></span>`);
      if (p.cat && !p.product) chips.push(`<span class="pf"><span class="lbl">القسم</span><b>${p.cat.em} ${p.cat.ar}</b></span>`);
      if (p.brand) chips.push(`<span class="pf"><span class="lbl">الماركة</span><b>${esc(p.brand)}</b></span>`);
      if (p.max) chips.push(`<span class="pf"><span class="lbl">أقصى سعر</span><b class="num">${egp(p.max)}</b></span>`);
      if (p.near) chips.push(`<span class="pf"><span class="lbl">المكان</span><b>قريب مني</b></span>`);
      if (/مفتوح|فاتح|شغال|دلوقتي/.test(norm(q))) chips.push(`<span class="pf"><span class="lbl">الحالة</span><b>مفتوح الآن</b></span>`);
      box.innerHTML = chips.length
        ? `<div class="row wrapx gap6" style="align-items:center"><span class="tiny" style="color:${el.id === 'heroSearch' ? '#D2B4BE' : 'var(--muted)'}">🧠 فهمت من طلبك:</span>${chips.join('')}</div>`
        : `<div class="tiny" style="color:${el.id === 'heroSearch' ? '#D2B4BE' : 'var(--muted)'}">اكتب بحرية: اسم المنتج، ميزانيتك، و«قريبة مني» — وسوقي يفهم الطلب ويعرض النتائج.</div>`;
    };
    el.oninput = upd;
    el.onkeydown = e => { if (e.key === 'Enter') { searchFrom(el.value.trim(), sel); } };
    upd();
  });
  const hg = $('#heroGo'); if (hg) hg.onclick = () => searchFrom(($('#heroSearch') || {}).value || '', '#heroSearch');
  const hgeo = $('#heroGeo'); if (hgeo) hgeo.onclick = () => { go('nearby'); realSearch({ locate: true }); };   // موقع حقيقي + بحث حقيقي
}
function searchFrom(q, from) {
  if (!q) return toast('اكتب ما تبحث عنه أولًا', 'warn', '🔍');
  APP.history.unshift({ q, at: 'الآن' }); APP.history = APP.history.slice(0, 8); save('history', APP.history);
  go('search', { q });
}
