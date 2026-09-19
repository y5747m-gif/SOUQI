/* =========================================================================
   الجزء 3: حالة التطبيق + التنقل + الهيكل العام + الصفحة الرئيسية
   ========================================================================= */

const APP = {
  route: { name: 'home', p: {} },
  loc: { lat: 30.0131, lon: 31.2089, label: 'الجيزة — الدقي', area: 'الدقي', city: 'الجيزة', exact: true },
  user: load('user', null),
  fav: load('fav', { stores: [], products: [] }),
  history: load('history', [{ q: 'ايفون 15 تحت 40000', at: 'أمس' }, { q: 'سماعة JBL قريبة مني', at: 'منذ 3 أيام' }]),
  myStore: load('myStore', 'nile'),
  radius: load('radius', 10)
};
const LOC = { get lat() { return APP.loc.lat; }, get lon() { return APP.loc.lon; } };

/* ---------------- التنقل ---------------- */
let FORCE_ROUTE = null;   // احتياطي لو كان تغيير الـhash غير مسموح (مثل بعض بيئات المعاينة)
function go(name, p) {
  const q = p ? Object.keys(p).filter(k => p[k] != null && p[k] !== '').map(k => k + '=' + encodeURIComponent(p[k])).join('&') : '';
  const want = name + (q ? '?' + q : '');
  let ok = false;
  try {
    location.hash = '#/' + want;
    ok = decodeURIComponent(location.hash).replace(/^#\/?/, '') === decodeURIComponent(want);
  } catch (e) { ok = false; }
  if (!ok) FORCE_ROUTE = { name: name, p: p || {} };
  render();
}
function parseHash() {
  if (FORCE_ROUTE) { const f = FORCE_ROUTE; FORCE_ROUTE = null; return f; }
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [rawPath, qs] = h.split('?');
  const seg = (rawPath || '').split('/').filter(Boolean);   // store/nile → ['store','nile']
  const p = {};
  if (seg[1]) p.id = seg[1];
  (qs || '').split('&').forEach(kv => { if (!kv) return; const [k, v] = kv.split('='); p[k] = v; });
  return { name: seg[0] || 'home', p };
}
function render() {
  APP.route = parseHash();
  const n = APP.route.name;
  const page = ({ home: homePage, search: resultsPage, product: productPage, store: storePage, offers: offersPage, nearby: nearbyPage, favorites: favoritesPage, account: accountPage, dashboard: dashboardPage, admin: adminPage, addstore: addStorePage, assistant: assistantPage, stores: storesPage, directory: directoryPage }[n]) || homePage;
  $('#app').innerHTML = page() + footer();
  $('#bottomnav-in').innerHTML = bottomNav(n);
  afterRender(n);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
window.addEventListener('hashchange', render);

/* ---------------- الهيكل العلوي ---------------- */
function shell(active, content) {
  return header(active) + content;
}
function header(active) {
  const favN = APP.fav.stores.length + APP.fav.products.length;
  const u = APP.user;
  const nav = [
    ['home', 'الرئيسية', 'الرئيسية'], ['search', 'ابحث', 'البحث'], ['nearby', 'الخريطة', 'الخريطة'],
    ['offers', 'العروض', '🔥 العروض'], ['directory', 'دليل المحلات', 'دليل المحلات'],
    ['dashboard', 'لوحة المتجر', 'لوحة المتجر'], ['admin', 'الإدارة', 'الإدارة']
  ];
  return `
  <header class="topbar">
    <div class="wrap inner">
      <a class="brand" href="#/home">
        <span class="logo">${SOQ_ICON(38)}</span>
        <span><b>سوقي</b><span>SOUQI</span></span>
      </a>
      <nav class="nav">
        ${nav.map(([r, l, t]) => `<a href="#/${r}" class="${active === r ? 'on' : ''}">${t}</a>`).join('')}
      </nav>
      <div class="searchmini">
        <input id="miniSearch" placeholder="ابحث عن منتج، متجر، أو خدمة..." value="${esc(APP.route.p.q || '')}">
        <span class="ic">🔍</span>
      </div>
      <button class="loc-chip" id="locBtn" title="تغيير موقعك">
        <span>📍</span><span class="t">${esc(APP.loc.label)}</span><span class="muted">▾</span>
      </button>
      <button class="btn sm2" id="favBtn" title="المفضلة">❤️ <span class="num">${favN}</span></button>
      ${u
      ? `<button class="btn sm2" id="userBtn"><span class="avatar" style="width:26px;height:26px;font-size:12px">${esc(u.name[0])}</span> ${esc(u.name)}</button>`
      : `<button class="btn primary sm2" id="loginBtn">دخول</button>`}
      <button class="btn dark sm2" id="addStoreBtn">➕ متجرك</button>
      <button class="env nowrap" id="envBadge" title="اضغط لمعرفة ما هو حقيقي وما هو توضيحي في النموذج">ℹ️ بيانات تجريبية</button>
    </div>
  </header>`;
}
function bottomNav(active) {
  const items = [['home', 'الرئيسية', '🏠'], ['search', 'البحث', '🔍'], ['nearby', 'الخريطة', '🗺️'], ['favorites', 'المفضلة', '❤️'], ['account', 'حسابي', '👤']];
  return items.map(([r, l, ic]) => `<a href="#/${r}" class="${active === r ? 'on' : ''}"><span class="ic">${ic}</span>${l}</a>`).join('');
}
function footer() {
  return `
  <footer class="site">
    <div class="wrap">
      <div class="fgrid">
        <div>
          <div class="brand" style="margin-bottom:10px"><span class="logo">${SOQ_ICON(38)}</span><span style="color:#fff"><b>سوقي</b><span style="color:#B0ABAB">SOUQI</span></span></div>
          <p style="font-size:13px;max-width:330px">منصة ذكية لاكتشاف المتاجر والمنتجات والعروض حولك في مصر. ابحث عن المنتج، قارن السعر، واعرف أقرب متجر — والبيانات المعروضة هي الأسعار المسجلة فعليًا من المتاجر.</p>
          <p class="tiny" style="margin-top:12px;color:#B0ABAB">النموذج التجريبي — الأسعار والمتاجر توضيحية لعرض إمكانيات المنصة.</p>
        </div>
        <div><h4>للمستخدمين</h4><a href="#/search">البحث عن منتج</a><a href="#/nearby">المتاجر القريبة</a><a href="#/offers">🔥 العروض والتخفيضات</a><a href="#/assistant">ماذا أشتري؟</a><a href="#/favorites">المفضلة والتنبيهات</a></div>
        <div><h4>لأصحاب المحلات</h4><a href="#/addstore">سجّل محلّك (8 خطوات)</a><a href="#/directory">دليل المحلات المسجّلة</a><a href="#/dashboard">لوحة تحكم المتجر</a><a href="#/dashboard">تحديث الأسعار</a></div>
        <div><h4>المنصة</h4><a href="#/admin">لوحة الإدارة</a><a href="#/home">كيف تعمل؟</a><a href="#/home">موثوقية البيانات</a><a href="#/home">الإبلاغ عن سعر</a></div>
      </div>
      <div class="fbottom">
        <span>© 2026 سوقي — SOUQI. جميع الحقوق محفوظة.</span>
        <span>صُنع في مصر 🇪🇬 — القاهرة الكبرى أولًا، ثم كل مصر</span>
      </div>
    </div>
  </footer>`;
}

/* ---------------- التنبيهات والنوافذ ---------------- */
function toast(msg, type, icon) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.innerHTML = `<span style="font-size:17px">${icon || '✅'}</span><span>${msg}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.transition = '.3s'; el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; setTimeout(() => el.remove(), 320); }, 3600);
}
function openModal(title, body, foot, wide) {
  $('#modal-root').innerHTML = `
  <div class="backdrop" id="backdrop">
    <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3 style="font-size:17px">${title}</h3><button class="x" id="modalX">✕</button></div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>
  </div>`;
  document.body.classList.add('noscroll');
  $('#modalX').onclick = closeModal;
  $('#backdrop').onclick = (e) => { if (e.target.id === 'backdrop') closeModal(); };
}
function closeModal() { $('#modal-root').innerHTML = ''; document.body.classList.remove('noscroll'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------- مكونات مشتركة ---------------- */
const priceHtml = (n) => `<span class="price num">${nf(n)}</span><span class="cur">ج.م</span>`;
function trustBadge(h) {
  const t = trustOf(h);
  return `<span class="badge ${t.cls}"><i class="dot ${t.dot}"></i> ${t.ar} · ${when(h)}</span>`;
}
function offerRibbon(l) { return l.disc ? `<span class="badge acc">🔥 خصم ${pct(l.disc)}</span>` : ''; }

function storeCard(st, o) {
  o = o || {};
  if (st.real) return realCard(st, o);   // محل حقيقي من OpenStreetMap
  const l = o.listing;
  const d = o.dist != null ? o.dist : distKm(LOC, st);
  const open = isOpen(st);
  const cat = catOf(st.cats[0]);
  return `
  <article class="card hv store-card rel" data-store="${st.id}">
    ${o.best ? `<span class="ribbon" style="background:var(--p)">أفضل اختيار</span>` : (st.sponsored ? `<span class="ribbon">إعلان · متجر ممول</span>` : '')}
    <div class="row" style="align-items:flex-start">
      <div class="thumb lg">${cat.em}</div>
      <div style="flex:1;min-width:0">
        <h3 class="trunc"><a href="#/store/${st.id}">${esc(st.name)}</a> ${st.verified ? `<span class="vf" title="متجر موثق">✔️</span>` : ''}</h3>
        <div class="meta mt6">
          <span class="stars num">${stars(st.rating)} <b>${st.rating.toFixed(1)}</b></span>
          <span class="muted">(${nf(st.rc)} تقييم)</span>
        </div>
        <div class="meta mt6">
          <span>📍 ${esc(st.area)} — ${esc(st.city)}</span>
          <span>🚶 ${kmTxt(d)}</span>
        </div>
        <div class="row wrapx mt10 gap6">
          <span class="badge ${open ? 'ok' : 'ink'}"><i class="dot ${open ? 'g' : 'r'}"></i> ${open ? 'مفتوح الآن' : 'مغلق'}</span>
          ${o.demoTag ? '<span class="badge warn">🧪 بيانات تجريبية</span>' : ''}
          <span class="badge p">${cat.ar}</span>
          ${st.delivery ? `<span class="badge info">🚚 توصيل${st.deliveryRadius ? ' ' + st.deliveryRadius + ' كم' : ''}</span>` : ''}
          ${st.plan === 'pro' ? '<span class="badge acc">💎 احترافي</span>' : ''}
          ${o.listing ? offerRibbon(o.listing) : ''}
        </div>
      </div>
    </div>
    ${l ? `
    <hr class="sep">
    <div class="between">
      <div>
        <div class="tiny muted">${esc(PRODUCTS.find(p => p.id === l.productId).name)}</div>
        <div class="priceline">${priceHtml(l.price)} ${l.oldPrice ? `<span class="price-old num">${nf(l.oldPrice)}</span>` : ''}</div>
        <div class="row wrapx gap6 mt6">
          ${l.inStock ? `<span class="badge ok">متوفر</span>` : `<span class="badge bad">غير متوفر</span>`}
          ${trustBadge(l.updatedH)}
        </div>
      </div>
      <div class="row" style="flex-direction:column;align-items:stretch;gap:6px;min-width:132px">
        <button class="btn primary sm2" data-act="wa" data-store="${st.id}" data-prod="${l.productId}">واتساب</button>
        <button class="btn sm2" data-act="call" data-store="${st.id}">☎️ اتصال</button>
      </div>
    </div>`: `
    <hr class="sep">
    <div class="between">
      <span class="tiny muted">يبدأ من ${egp((DB.byStore[st.id][0] || {}).price || 0)} · ${DB.byStore[st.id].length} منتج مسجّل</span>
      <span class="row gap6">
        <button class="btn sm2" data-act="fav-store" data-store="${st.id}">${APP.fav.stores.includes(st.id) ? '❤️ محفوظ' : '🤍 حفظ'}</button>
        <a class="btn primary sm2" href="#/store/${st.id}">عرض المتجر</a>
      </span>
    </div>`}
  </article>`;
}

function listingCard(r, o) {
  o = o || {};
  const st = r.st, p = PRODUCTS.find(x => x.id === r.productId);
  return `
  <article class="card hv store-card rel ${o.best ? 'best' : ''}">
    ${o.best ? `<span class="ribbon" style="background:var(--p)">أفضل سعر مسجّل</span>` : ''}
    <div class="row" style="align-items:flex-start">
      <div class="thumb lg">${p.em}</div>
      <div style="flex:1;min-width:0">
        <h3 class="trunc"><a href="#/store/${st.id}">${esc(st.name)}</a> ${st.verified ? '<span class="vf">✔️</span>' : ''}</h3>
        <div class="meta mt6">
          <span class="stars num">${stars(st.rating)} <b>${st.rating.toFixed(1)}</b></span>
          <span>📍 ${kmTxt(r.dist)}</span>
          <span class="${r.open ? '' : 'muted'}">${r.open ? '🟢 مفتوح' : '🔴 مغلق'}</span>
        </div>
      </div>
    </div>
    <hr class="sep">
    <div class="between">
      <div>
        <div class="priceline">${priceHtml(r.price)} ${r.oldPrice ? `<span class="price-old num">${nf(r.oldPrice)}</span>` : ''} ${offerRibbon(r)}</div>
        <div class="row wrapx gap6 mt6">
          ${r.inStock ? '<span class="badge ok">متوفر</span>' : '<span class="badge bad">غير متوفر</span>'}
          ${r.warranty ? `<span class="badge ink">ضمان ${esc(r.warranty)}</span>` : ''}
          ${trustBadge(r.updatedH)}
        </div>
      </div>
      <div class="row" style="flex-direction:column;align-items:stretch;gap:6px;min-width:140px">
        <a class="btn sm2" href="#/product/${r.productId}?store=${st.id}">التفاصيل</a>
        <button class="btn primary sm2" data-act="wa" data-store="${st.id}" data-prod="${r.productId}">واتساب المتجر</button>
      </div>
    </div>
  </article>`;
}
function kpiCard(l, v, d, cls) {
  return `<div class="kpi"><div class="l">${l}</div><div class="v num">${v}</div>${d ? `<div class="d ${cls || 'muted'}">${d}</div>` : ''}</div>`;
}
function statBox(l, v, s) {
  return `<div class="stat"><div class="l">${l}</div><div class="v num">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
}
function insight(kind, icon, title, body) {
  return `<div class="insight ${kind}"><span class="ic">${icon}</span><div><div class="b sm">${title}</div><div class="tiny muted mt6" style="color:inherit;opacity:.85">${body}</div></div></div>`;
}

/* ---------------- الصفحة الرئيسية ---------------- */
function homePage() {
  const near = DB.stores.map(st => Object.assign({}, st, { dist: distKm(LOC, st) })).sort((a, b) => a.dist - b.dist);
  const offersNear = DB.offers.map(l => {
    const st = DB.stores.find(s => s.id === l.storeId);
    return Object.assign({}, l, { st, dist: distKm(LOC, st) });
  }).filter(r => r.dist <= 25).sort((a, b) => b.disc - a.disc).slice(0, 6);
  const topStores = near.slice(0, 6);
  const stats = {
    stores: DB.stores.length,
    products: PRODUCTS.length,
    listings: DB.listings.length,
    cities: new Set(DB.stores.map(s => s.city)).size,
    offers: DB.offers.length
  };
  return `
  <section class="hero">
    <div class="wrap inner">
      <div class="row wrapx gap6 mb14">
        <span class="badge p" style="background:rgba(246,196,211,.16);color:#F6C4D3">محرك بحث للمتاجر الواقعية والمنتجات المحلية</span>
        <span class="badge" style="background:rgba(255,255,255,.1);color:#EBD3DB">مصر 🇪🇬 — القاهرة الكبرى + 15 محافظة</span>
      </div>
      <h1>اعرف المنتج... اعرف سعره... <span class="hl">واعرف مكانه</span></h1>
      <p class="sub">سوقي يجمع المتاجر الموجودة على أرض الواقع في قاعدة بيانات واحدة: المنتج، السعر المسجّل، المسافة، حالة المتجر، والعروض — ثم يحلّلها لك ويعرض الخيار الأفضل.</p>

      <div class="searchbig">
        <label class="f">
          <span style="font-size:19px">🔍</span>
          <input id="heroSearch" placeholder="اكتب طلبك بالعامية: عايز سماعة JBL تحت 3000 جنيه قريبة مني" autocomplete="off">
        </label>
        <button class="geo" id="heroGeo">📍 استخدام موقعي</button>
        <button class="go" id="heroGo">ابحث</button>
      </div>
      <div id="parseLive" class="mt10" style="min-height:30px"></div>
      <div class="search-hints mt6">
        <span>جرّب:</span>
        ${[['ايفون 15 بأقل سعر في 5 كم', 'ايفون 15 تحت 40000 قريب مني'], ['سماعة JBL أقل من 3000', 'سماعة JBL تحت 3000'], ['لابتوب لينوفو أرخص سعر', 'لابتوب لينوفو ارخص'], ['محلات أحذية مفتوحة الآن', 'احذية مفتوح الآن'], ['كارت شاشة RTX 4060 قريب مني', 'كارت شاشة RTX 4060 قريب']]
      .map(([t, q]) => `<a href="#/search?q=${encodeURIComponent(q)}">${t}</a>`).join(' · ')}
      </div>

      <div class="hero-stats">
        <div><b class="num">${stats.stores}</b><span>متجر مسجّل</span></div>
        <div><b class="num">${stats.products}</b><span>منتج في القاعدة</span></div>
        <div><b class="num">${nf(stats.listings)}</b><span>سعر مسجّل</span></div>
        <div><b class="num">${stats.offers}</b><span>عرض ساري</span></div>
        <div><b class="num">${stats.cities}</b><span>محافظة</span></div>
      </div>
    </div>
  </section>

  <div class="wrap">
    ${REAL.all.length ? `
    <section class="sec">
      <div class="sec-head">
        <div><h2>🏬 محلات حقيقية حولك</h2><p>${nf(REAL.all.length)} محلًا مسجّلًا فعليًا داخل ${kmTxt(REAL.radiusKm)} من ${esc(REAL.where || 'موقعك')} — بيانات OpenStreetMap</p></div>
        <a class="btn primary sm2" href="#/nearby">استعرض على الخريطة ←</a>
      </div>
      <div class="grid g-auto">${REAL.items.slice(0, 3).map(s => realCard(s)).join('')}</div>
    </section>` : `
    <section class="sec">
      <div class="card pad real-cta">
        <div class="row wrapx" style="align-items:center;gap:14px">
          <div style="font-size:38px">🏬</div>
          <div style="flex:1;min-width:240px">
            <div class="b">عايز تشوف المحلات الحقيقية اللي حواليك؟</div>
            <p class="sm muted mt6">سوقي بتروح لمصدر الخرائط المفتوح (OpenStreetMap) وترجّع لك المحلات المسجّلة فعليًا حول موقعك: الاسم، النوع، المسافة، التليفون، والمواعيد — بدون أي محل وهمي.</p>
          </div>
          <a class="btn primary" href="#/nearby">📍 ابحث حولي الآن</a>
        </div>
      </div>
    </section>`}
    <section class="sec">
      <div class="sec-head">
        <div><h2>ابحث بالقسم</h2><p>${CATS.length} قسمًا — من الموبايلات لأدوات الورش</p></div>
        <a class="btn sm2" href="#/search">كل الأقسام ←</a>
      </div>
      <div class="grid g-cats">
        ${CATS.map(c => {
          const n = DB.stores.filter(s => s.cats.includes(c.id)).length;
          return `<a class="cat" href="#/search?cat=${c.id}"><span class="ic">${c.em}</span><span class="nm">${c.ar}</span><span class="ct">${n} متجر</span></a>`;
        }).join('')}
      </div>
    </section>

    <section class="sec">
      <div class="sec-head">
        <div><h2>🔥 عروض قريبة منك</h2><p>خصومات مسجلة داخل نطاق 25 كم من ${esc(APP.loc.label)} — مرتّبة بأكبر خصم</p></div>
        <a class="btn sm2" href="#/offers">كل العروض ←</a>
      </div>
      <div class="grid g-auto">
        ${offersNear.length ? offersNear.map(l => listingCard(l)).join('') : `<div class="card pad">لا توجد عروض مسجلة في نطاقك الحالي. <button class="btn sm2" onclick="openRadius()">توسيع النطاق</button></div>`}
      </div>
    </section>

    <section class="sec">
      <div class="grid g-side">
        <div>
          <div class="sec-head"><div><h2>🏪 متاجر قريبة منك</h2><p>مرتبة حسب المسافة من موقعك الحالي</p></div></div>
          <div class="grid g-auto">${topStores.map(st => storeCard(st)).join('')}</div>
        </div>
        <aside>
          <div class="card pad" style="position:sticky;top:82px">
            <h3 style="font-size:17px">كيف يعمل سوقي؟</h3>
            <div class="timeline mt14">
              <div class="tl-item"><div class="b sm">1 · تفسير طلبك</div><div class="tiny muted">نفهم الجملة الطبيعية ونستخرج المنتج والميزانية والمسافة وحالة المتجر.</div></div>
              <div class="tl-item"><div class="b sm">2 · البحث في الأسعار المسجلة</div><div class="tiny muted">كل نتيجة تأتي من سعر سجّله المتجر فعليًا — لا اختراع ولا تقدير.</div></div>
              <div class="tl-item"><div class="b sm">3 · ترتيب ذكي وتحليل</div><div class="tiny muted">نوازن بين السعر والمسافة والخصم والتقييم وحداثة السعر.</div></div>
              <div class="tl-item" style="padding-bottom:0"><div class="b sm">4 · عرض المتجر والتواصل</div><div class="tiny muted">واتساب أو اتصال مباشر + اتجاهات على الخريطة.</div></div>
            </div>
            <hr class="sep">
            <div class="row wrapx gap6">
              <span class="badge ok"><i class="dot g"></i> بيانات حديثة</span>
              <span class="badge warn"><i class="dot y"></i> تحتاج تحديث</span>
              <span class="badge bad"><i class="dot r"></i> قديمة</span>
            </div>
            <p class="tiny muted mt10">كل سعر يظهر مع تاريخ آخر تحديث. لو البيانات قديمة، المنصة تقولها لك بوضوح بدل ما تعطيك معلومة تبدو مؤكدة وهي غير مؤكدة.</p>
            <button class="btn block sm2 mt10" id="trustInfo">اعرف أكثر عن موثوقية البيانات</button>
            <hr class="sep">
            <h4 class="b sm">🔔 راقب السعر</h4>
            <p class="tiny muted mt6">حدّد سعرًا تريده، ونبلّغك لما ينزل تحته في أي متجر مسجّل.</p>
            <button class="btn soft block sm2 mt10" onclick="openAlertModal('ip15')">جرّب الميزة</button>
          </div>
        </aside>
      </div>
    </section>

    <section class="sec">
      <div class="sec-head">
        <div><h2>🗺️ المتاجر على خريطة مصر</h2><p>${DB.stores.length} متجرًا في ${stats.cities} محافظة — اضغط على أي دبوس لعرض بياناته</p></div>
        <a class="btn sm2" href="#/nearby">فتح الخريطة الكاملة ←</a>
      </div>
      <div class="mapbox">${egyptMap({ height: 430 })}</div>
    </section>

    <section class="sec">
      <div class="grid g-2">
        <div class="card pad">
          <div class="between mb14"><h3 style="font-size:17px">📈 المنتجات الأكثر بحثًا</h3><span class="tiny muted">آخر 7 أيام</span></div>
          <div class="hbars">
            ${DB.trending.map(t => {
        const mx = DB.trending[0].c;
        const p = findProduct(t.k);
        return `<div class="hbar">
                <span>${p ? p.em : '🔎'} ${esc(t.k)}</span><span class="num b">${nf(t.c)}</span>
                <span class="tr"><i style="width:${Math.round(t.c / mx * 100)}%"></i></span>
              </div>`;
      }).join('')}
          </div>
        </div>
        <div class="card pad">
          <div class="between mb14"><h3 style="font-size:17px">🏪 المتاجر الأكثر زيارة هذا الأسبوع</h3><span class="tiny muted">حسب مشاهدات الصفحة</span></div>
          <div class="hbars">
            ${DB.stores.slice().sort((a, b) => b.views - a.views).slice(0, 8).map(s => {
        const mx = Math.max.apply(null, DB.stores.map(x => x.views));
        return `<div class="hbar"><span><a href="#/store/${s.id}">${esc(s.name)}</a> ${s.verified ? '✔️' : ''}</span><span class="num b">${nf(s.views)}</span>
              <span class="tr"><i style="width:${Math.round(s.views / mx * 100)}%"></i></span></div>`;
      }).join('')}
          </div>
          <p class="tiny muted mt14">لا يوجد «أفضل متجر» بشكل مطلق — كل مستخدم يرتب حسب ما يهمه: السعر، المسافة، الخصم، أو التقييم.</p>
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="card pad" style="background:linear-gradient(140deg,#2C0611,#470A1C);border:0;color:#fff">
        <div class="grid g-2" style="align-items:center">
          <div>
            <span class="badge" style="background:rgba(255,255,255,.12);color:#EFD3DB">لأصحاب المتاجر</span>
            <h2 style="font-size:23px;margin-top:12px">صفحة لمتجرك + منتجاتك بأسعارها… ومجانًا</h2>
            <p class="sm mt10" style="color:#D5BBC4">أضف متجرك في 5 دقائق: الاسم، العنوان، الموقع، المنتجات والأسعار. العملاء يبحثون عن المنتج ويجدونك أنت. أظهر علامة «✔️ متجر موثق» لزيادة الثقة، وتابع الإحصائيات مع الباقة الاحترافية.</p>
            <div class="row wrapx mt14 gap6">
              <span class="badge" style="background:rgba(255,255,255,.1);color:#F2DCE3">مجاني: صفحة + 30 منتجًا</span>
              <span class="badge" style="background:rgba(255,255,255,.1);color:#F2DCE3">احترافي: 199 ج.م / شهر</span>
              <span class="badge" style="background:rgba(255,255,255,.1);color:#F2DCE3">إعلانات وعروض مميزة</span>
            </div>
            <div class="row mt18 gap6">
              <a class="btn primary lg" href="#/addstore">➕ سجّل محلّك الآن</a>
              <a class="btn lg" href="#/dashboard" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18);color:#fff">شوف لوحة التحكم</a>
            </div>
          </div>
          <div>
            ${['📊 إحصائيات الزيارات والمنتجات الأكثر مشاهدة', '💬 عدد ضغطات واتساب والمكالمات وطلبات الاتجاهات', '💰 تحديث الأسعار وإنشاء العروض في ثوانٍ', '🔔 إشعارات للعملاء المهتمين بمنتجاتك', '📈 تقارير أسعار السوق والمنافسين']
      .map(t => `<div class="insight" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);margin-bottom:8px"><span class="ic">✔️</span><div class="sm" style="color:#FBE9EF">${t}</div></div>`).join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="sec" style="padding-bottom:26px">
      <div class="grid g-4">
        ${[
      ['🔎', 'بحث بالميزانية', 'قل ميزانيتك وسوقي يعرض كل ما يناسبها من المتاجر القريبة.', '#/assistant'],
      ['📊', 'تاريخ الأسعار', 'شوف سعر المنتج على مدار 12 شهرًا وتعرف هل الخصم حقيقي.', '#/product/ip15'],
      ['🔔', 'تنبيه تغيّر السعر', 'راقب المنتج ونبلّغك عند نزوله تحت السعر الذي تحدده.', '#/favorites'],
      ['🚨', 'إبلاغ المستخدمين', 'السعر في الفرع مختلف؟ بلّغ، والبلاغ يوصل للإدارة ويُحدَّث السعر.', '#/account']
    ].map(([ic, t, d, l]) => `<a class="card pad hv" href="${l}"><div style="font-size:24px">${ic}</div><div class="b mt6">${t}</div><div class="tiny muted mt6">${d}</div></a>`).join('')}
      </div>
    </section>
  </div>`;
}

/* ---------------- الأحداث العامة بعد كل رسم ---------------- */
function afterRender(page) {
  bindGlobal();
  bindRealSearch();   // أزرار البحث الحقيقي في أي صفحة تحتويها
  if (page === 'home') { drawEgyptMap(); bindLiveParse(); }
  if (page === 'search') bindResults();
  if (page === 'nearby') bindNearby();
  if (page === 'product') bindProduct();
  if (page === 'store') bindStorePage();
  if (page === 'offers') bindOffers();
  if (page === 'favorites') bindFavorites();
  if (page === 'dashboard') bindDashboard();
  if (page === 'admin') bindAdmin();
  if (page === 'assistant') bindAssistant();
  if (page === 'account') bindAccount();
  if (page === 'stores') bindStoresPage();
  if (page === 'addstore') bindRegister();
  if (page === 'directory') bindDirectory();
}
function bindGlobal() {
  const ms = $('#miniSearch');
  if (ms) {
    ms.onkeydown = e => { if (e.key === 'Enter' && ms.value.trim()) go('search', { q: ms.value.trim() }); };
  }
  const lb = $('#locBtn'); if (lb) lb.onclick = openLocation;
  const fb = $('#favBtn'); if (fb) fb.onclick = () => go('favorites');
  const lg = $('#loginBtn'); if (lg) lg.onclick = openLogin;
  const ub = $('#userBtn'); if (ub) ub.onclick = () => go('account');
  const adb = $('#addStoreBtn'); if (adb) adb.onclick = (e) => { e.preventDefault(); regBlankReset(false); go('addstore', { step: 1 }); };
  const ti = $('#trustInfo'); if (ti) ti.onclick = trustModal;
  const eb = $('#envBadge'); if (eb) eb.onclick = demoModal;

  document.querySelectorAll('[data-act]').forEach(b => {
    b.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const act = b.dataset.act, sid = b.dataset.store, pid = b.dataset.prod;
      if (act === 'wa') {
        const st = DB.stores.find(s => s.id === sid), p = PRODUCTS.find(x => x.id === pid);
        const l = (DB.byProduct[pid] || []).find(x => x.storeId === sid);
        const txt = `السلام عليكم، وصلت لكم من تطبيق سوقي.\nبسأل عن: ${p ? p.name : ''}\nالسعر المسجّل على المنصة: ${l ? nf(l.price) + ' ج.م' : '—'}\nهل متوفر حاليًا؟`;
        st.clicksWa++; save('db-touch', 1);
        toast(`تم فتح محادثة واتساب مع ${st.name}`, 'ok', '💬');
        window.open(waLink(st.whatsapp, txt), '_blank');
      }
      if (act === 'call') {
        const st = DB.stores.find(s => s.id === sid); st.calls++;
        toast(`جارٍ الاتصال بـ ${st.name} — ${st.phone}`, 'ok', '☎️');
      }
      if (act === 'dirs') {
        const st = DB.stores.find(s => s.id === sid);
        toast('تم فتح الاتجاهات في تطبيق الخرائط', 'ok', '🧭');
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${st.lat},${st.lon}`, '_blank');
      }
      if (act === 'fav-store') favStore(sid);
      if (act === 'fav-product') { e.stopPropagation(); favProduct(pid); }
      if (act === 'alert') openAlertModal(pid);
      if (act === 'report') openReportModal(sid, pid);
    };
  });
  document.querySelectorAll('a[href^="#/store/"]').forEach(a => {
    a.onclick = (e) => { e.stopPropagation(); };
  });
}
function favStore(id) {
  const i = APP.fav.stores.indexOf(id);
  if (i >= 0) APP.fav.stores.splice(i, 1); else APP.fav.stores.push(id);
  save('fav', APP.fav); render();
  toast(i >= 0 ? 'تم الحذف من المفضلة' : 'تم حفظ المتجر في المفضلة', 'ok', i >= 0 ? '🗑️' : '❤️');
}
function favProduct(id) {
  const i = APP.fav.products.indexOf(id);
  if (i >= 0) APP.fav.products.splice(i, 1); else APP.fav.products.push(id);
  save('fav', APP.fav); render();
  toast(i >= 0 ? 'تم إلغاء متابعة المنتج' : 'تتابع هذا المنتج الآن', 'ok', i >= 0 ? '🗑️' : '❤️');
}
