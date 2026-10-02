/* =========================================================================
   سوقي كتطبيق هاتف (PWA) + باقة سوقي بلس للمستخدمين
   ========================================================================= */
let SOUQI_INSTALL_EVENT = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  SOUQI_INSTALL_EVENT = event;
  document.querySelectorAll('#installAppBtn').forEach(b => b.style.display = 'inline-flex');
});
window.addEventListener('appinstalled', () => {
  SOUQI_INSTALL_EVENT = null;
  save('appInstalled', true);
  toast('تم تثبيت سوقي كتطبيق على هاتفك بنجاح', 'ok', '✅');
});

function isStandaloneApp() {
  return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
function isIOSDevice() { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); }

async function installSOUQI() {
  if (isStandaloneApp()) {
    return openModal('✅ سوقي مثبّت بالفعل', `
      <div class="center"><div style="font-size:52px">📱</div><p class="sm mt10">أنت تستخدم الآن النسخة المثبّتة من سوقي. تفتح بملء الشاشة، ولها أيقونة مستقلة، وتحتفظ بالشاشات الأساسية للعمل دون اتصال.</p></div>`,
      `<button class="btn primary" onclick="closeModal()">حسنًا</button>`);
  }
  if (SOUQI_INSTALL_EVENT) {
    SOUQI_INSTALL_EVENT.prompt();
    const choice = await SOUQI_INSTALL_EVENT.userChoice;
    if (choice && choice.outcome === 'accepted') toast('جارٍ إضافة سوقي إلى هاتفك…', 'ok', '📲');
    SOUQI_INSTALL_EVENT = null;
    return;
  }
  const secure = location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname || '');
  const ios = isIOSDevice();
  openModal('📲 تحميل سوقي كتطبيق على الهاتف', `
    <div class="install-banner card pad mb14">
      <div class="row"><div style="font-size:42px">${SOQ_ICON(52)}</div><div><div class="b">تطبيق سوقي الكامل</div><div class="tiny muted">أيقونة على الشاشة · ملء الشاشة · وصول أسرع · عمل أساسي بدون إنترنت</div></div></div>
    </div>
    ${!secure ? `<div class="insight warn mb14"><span class="ic">🔒</span><div class="sm"><b>افتح النسخة المنشورة الآمنة</b><br>التثبيت كتطبيق يحتاج رابط HTTPS، ولا يعمل عند فتح ملف HTML مباشرة من مدير الملفات.</div></div>` : ''}
    <div class="b mb10">${ios ? 'على iPhone أو iPad' : 'من متصفح هاتفك'}</div>
    <div class="info-list">
      ${ios ? `
        <div class="install-step"><div class="sm">اضغط زر <b>المشاركة</b> في Safari <b>□↑</b>.</div></div>
        <div class="install-step"><div class="sm">مرّر واختر <b>إضافة إلى الشاشة الرئيسية</b>.</div></div>
        <div class="install-step"><div class="sm">اضغط <b>إضافة</b>، ثم افتح أيقونة سوقي.</div></div>` : `
        <div class="install-step"><div class="sm">افتح قائمة المتصفح <b>⋮</b>.</div></div>
        <div class="install-step"><div class="sm">اختر <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>.</div></div>
        <div class="install-step"><div class="sm">وافق على التثبيت، ثم افتح أيقونة سوقي مثل أي تطبيق.</div></div>`}
    </div>`, `<button class="btn primary" onclick="closeModal()">فهمت</button><a class="btn" href="#/plans" onclick="closeModal()">استكشف سوقي بلس</a>`);
}

const USER_PLAN_FEATURES = [
  ['كل البحث والمقارنة والخرائط', true, true],
  ['المتاجر الحقيقية والعروض القريبة', true, true],
  ['المفضلة وقائمة المشتريات', true, true],
  ['تنبيهات الأسعار', 'حتى 5 تنبيهات', 'غير محدودة وفورية'],
  ['المساعد الذكي للميزانية', 'اقتراحات أساسية', 'تحليل أعمق وبدائل أذكى'],
  ['تاريخ الأسعار', '12 شهرًا', '24 شهرًا + توقع اتجاه السعر'],
  ['مقارنة المنتجات', '3 منتجات', 'حتى 10 منتجات بتقرير مفصل'],
  ['نطاق البحث المحفوظ', 'موقع واحد', 'مواقع متعددة للبيت والعمل'],
  ['قوائم الشراء', 'قائمة واحدة', 'قوائم عائلية مشتركة'],
  ['الإعلانات', 'قد تظهر إعلانات معلّمة', 'بدون إعلانات'],
  ['الدعم', 'دعم عادي', 'دعم أولوية'],
  ['العمل دون اتصال', 'الشاشات الأساسية', 'حفظ مقارنات وقوائم موسّع']
];

function plusWorkspace() {
  const priced = PRODUCTS.map(p => {
    const rows = (DB.byProduct[p.id] || []).filter(x => x.inStock);
    if (!rows.length) return null;
    const prices = rows.map(x => x.price), low = Math.min.apply(null, prices), high = Math.max.apply(null, prices);
    return { p, rows, low, high, saving: high - low, best: rows.find(x => x.price === low) };
  }).filter(Boolean).sort((a, b) => b.saving - a.saving);
  const top = priced[0], deals = DB.offers.slice().sort((a, b) => b.disc - a.disc);
  const avgSaving = priced.length ? Math.round(priced.reduce((s, x) => s + x.saving, 0) / priced.length) : 0;
  return `<section class="sec"><div class="sec-head"><div><h2>✦ مركز بلس الذكي</h2><p>تحليل حي مبني على الأسعار المسجّلة حاليًا — لا توجد أسعار مولّدة.</p></div><span class="badge acc">خاص ببلس</span></div>
    <div class="grid g-4 mb14">
      ${kpiCard('فرص توفير مكتشفة', nf(priced.filter(x => x.saving > 0).length), 'بمقارنة المتاجر الآن', 'ok')}
      ${kpiCard('متوسط فرق السعر', egp(avgSaving), 'بين أعلى وأقل متجر')}
      ${kpiCard('أقوى خصم حالي', deals.length ? pct(deals[0].disc) : '—', deals.length ? esc((PRODUCTS.find(p => p.id === deals[0].productId) || {}).name || '') : '')}
      ${kpiCard('تنبيهات بلس', '∞', 'فورية وغير محدودة', 'ok')}
    </div>
    <div class="grid g-2">
      <div class="card pad"><div class="between"><div><div class="b">💰 أكبر فرصة توفير الآن</div><div class="tiny muted mt6">مقارنة تلقائية لكل الأسعار المتاحة</div></div><span style="font-size:30px">${top ? top.p.em : '📊'}</span></div>
        ${top ? `<h3 class="mt14">${esc(top.p.name)}</h3><div class="priceline mt6">وفر حتى <span class="price">${egp(top.saving)}</span></div><p class="tiny muted mt6">أقل سعر ${egp(top.low)} مقابل أعلى سعر ${egp(top.high)} في ${top.rows.length} متاجر.</p><a class="btn primary sm2 mt14" href="#/product/${top.p.id}">عرض المقارنة</a>` : '<p class="sm muted mt14">لا توجد بيانات كافية الآن.</p>'}
      </div>
      <div class="card pad"><div class="b">🧠 تقرير قرار الشراء</div><p class="sm muted mt6">يحلل الانتشار، فروق الأسعار، الخصومات وحداثة البيانات ليعطيك ملخصًا قابلًا للتنفيذ.</p><div class="info-list mt14"><div class="info-item"><span class="ic">✓</span><span class="sm">يعتمد على بيانات سوقي المسجّلة فقط</span></div><div class="info-item"><span class="ic">✓</span><span class="sm">يفصل بين السعر والخصم والمسافة</span></div><div class="info-item"><span class="ic">✓</span><span class="sm">يقترح أفضل خطوة تالية بوضوح</span></div></div><button class="btn primary block mt14" id="plusReport">إنشاء التقرير الذكي</button></div>
    </div></section>`;
}

function plansPage() {
  const plus = APP.userPlan === 'plus';
  return shell('plans', `
    <div class="wrap" style="padding-top:22px;padding-bottom:34px">
      <section class="plan-hero card mb14">
        <div style="position:relative;z-index:1;max-width:760px">
          <div class="row wrapx gap6 mb10"><span class="badge" style="background:#fff1;color:#fff">✦ نسخة أقوى</span><span class="offline-pill" style="color:#c9ffe8">● تطبيق قابل للتثبيت</span></div>
          <h1 style="font-size:clamp(27px,4vw,44px);line-height:1.25">سوقي بلس <span style="color:#ffe29a">يعرف السوق بشكل أعمق</span></h1>
          <p class="mt10" style="font-size:16px;max-width:680px">كل ما تحبه في سوقي المجاني، بدون حذف أي ميزة — مع تنبيهات غير محدودة، تحليل أقوى للأسعار، مقارنة أوسع، قوائم عائلية، وتجربة بلا إعلانات.</p>
          <div class="row wrapx mt18 gap6">
            <button class="btn lg" style="background:#fff;color:#570019" id="heroPlanBtn">${plus ? '✓ بلس مفعّل على حسابك' : 'ابدأ بلس — 49 ج.م / شهر'}</button>
            <button class="btn lg" style="background:#fff1;border-color:#fff3;color:#fff" id="plansInstall">⬇️ تحميل التطبيق</button>
          </div>
        </div>
      </section>

      ${plus ? plusWorkspace() : ''}

      <section class="sec">
        <div class="sec-head"><div><h2>اختر التجربة المناسبة لك</h2><p>ابدأ مجانًا، ورقِّ وقتما تحتاج إمكانيات أكبر.</p></div><span class="badge ok">لا نفقد بياناتك عند تغيير الباقة</span></div>
        <div class="grid g-2">
          <article class="card plan-card">
            <div class="between"><div><span class="badge ink">سوقي المجاني</span><h3 class="mt10">كل الأساسيات القوية</h3></div>${!plus ? '<span class="badge p">باقتك الحالية</span>' : ''}</div>
            <div class="plan-price mt14">0 ج.م <small>/ دائمًا</small></div>
            <p class="sm muted mt10">بحث ومقارنة وخرائط ومتاجر حقيقية ومفضلة وتنبيهات أساسية.</p>
            <div class="mt14">
              ${['بحث ذكي بالعامية والميزانية', 'مقارنة أسعار ومتاجر قريبة', 'عروض وخرائط وتاريخ سعر', 'حتى 5 تنبيهات للأسعار', 'قائمة مشتريات ومفضلة'].map(x => `<div class="feature-check"><span class="yes">✓</span><span class="sm">${x}</span></div>`).join('')}
            </div>
            <button class="btn block mt18" data-user-plan="free" ${!plus ? 'disabled' : ''}>${!plus ? 'باقتك الحالية' : 'الرجوع للمجاني'}</button>
          </article>
          <article class="card plan-card pro">
            <div class="between"><div><span class="badge acc">✦ سوقي بلس</span><h3 class="mt10">الأقوى والأذكى</h3></div>${plus ? '<span class="badge acc">مفعّل</span>' : '<span class="badge ok">وفر 29% سنويًا</span>'}</div>
            <div class="plan-price mt14">49 ج.م <small>/ شهر</small></div>
            <p class="sm muted mt10">أو 419 ج.م سنويًا. كل المجاني، لكن بقدرات وتحليلات أعلى.</p>
            <div class="mt14">
              ${['كل تفاصيل ومزايا النسخة المجانية', 'تنبيهات أسعار فورية وغير محدودة', 'تحليل ذكي متقدم وتوقع اتجاه السعر', 'مقارنة 10 منتجات وتقارير مفصلة', 'قوائم عائلية ومواقع متعددة', 'تجربة كاملة بلا إعلانات'].map(x => `<div class="feature-check"><span class="plus">✦</span><span class="sm">${x}</span></div>`).join('')}
            </div>
            <button class="btn primary block mt18" data-user-plan="plus" ${plus ? 'disabled' : ''}>${plus ? 'بلس مفعّل بالفعل ✓' : 'الترقية إلى سوقي بلس'}</button>
          </article>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><div><h2>مقارنة تفصيلية</h2><p>لا شيء يختفي من النسخة المجانية؛ بلس يوسّع ويطوّر الإمكانيات.</p></div></div>
        <div class="card tbl-wrap"><table class="tbl compare-table"><thead><tr><th>الإمكانية</th><th>المجاني</th><th class="pro-col">✦ بلس</th></tr></thead><tbody>
          ${USER_PLAN_FEATURES.map(([name, free, pro]) => `<tr><td class="b">${name}</td><td>${free === true ? '✓ متاح' : free}</td><td class="pro-col b">${pro === true ? '✓ متاح' : pro}</td></tr>`).join('')}
        </tbody></table></div>
      </section>

      <section class="sec"><div class="card pad install-banner">
        <div class="row wrapx" style="align-items:center"><div style="font-size:46px">📲</div><div style="flex:1;min-width:220px"><div class="b" style="font-size:18px">نزّل سوقي كتطبيق حقيقي على هاتفك</div><p class="sm muted mt6">ليس اختصارًا لواجهة فقط: يعمل في نافذة مستقلة بملء الشاشة، بأيقونة سوقي، وتخزين محلي، وذاكرة عمل دون اتصال للشاشات الأساسية.</p></div><button class="btn primary" id="bottomInstall">⬇️ تثبيت التطبيق الآن</button></div>
      </div></section>
    </div>`);
}

function openPlusCheckout() {
  if (APP.userPlan === 'plus') return toast('سوقي بلس مفعّل بالفعل على حسابك', 'ok', '✦');
  openModal('✦ الترقية إلى سوقي بلس', `
    <div class="card pad" style="background:#fffaf0;border-color:#e4cf95"><div class="between"><div><div class="b">سوقي بلس</div><div class="tiny muted">كل المجاني + الإمكانيات المتقدمة</div></div><div class="price big">49 <span class="cur">ج.م/شهر</span></div></div></div>
    <div class="field mt14"><label>دورة الاشتراك</label><select class="select" id="plusCycle"><option value="monthly">شهري — 49 ج.م</option><option value="annual">سنوي — 419 ج.م (وفر 169 ج.م)</option></select></div>
    <div class="insight info mt14"><span class="ic">🔒</span><div class="sm"><b>هذه تجربة توضيحية آمنة.</b><br>لن تُطلب بيانات بطاقة ولن يتم تحصيل مبلغ في هذا النموذج. الربط الفعلي يحتاج بوابة دفع وحساب مستخدم على الخادم.</div></div>`,
    `<button class="btn primary" id="confirmPlus">تجربة تفعيل بلس</button><button class="btn" onclick="closeModal()">إلغاء</button>`);
  $('#confirmPlus').onclick = () => {
    APP.userPlan = 'plus'; save('userPlan', 'plus'); closeModal(); render();
    toast('تم تفعيل تجربة سوقي بلس — استمتع بالإمكانيات الأقوى', 'ok', '✦');
  };
}

function bindPlans() {
  ['#plansInstall', '#bottomInstall'].forEach(sel => { const b = $(sel); if (b) b.onclick = installSOUQI; });
  const hero = $('#heroPlanBtn'); if (hero) hero.onclick = openPlusCheckout;
  const report = $('#plusReport'); if (report) report.onclick = () => {
    const candidates = PRODUCTS.map(p => {
      const rows = (DB.byProduct[p.id] || []).filter(x => x.inStock).sort((a, b) => a.price - b.price);
      return rows.length > 1 ? { p, rows, saving: rows[rows.length - 1].price - rows[0].price } : null;
    }).filter(Boolean).sort((a, b) => b.saving - a.saving).slice(0, 5);
    openModal('🧠 تقرير سوقي بلس الذكي', `
      <div class="insight ok mb14"><span class="ic">✦</span><div class="sm"><b>الخلاصة:</b> وجدنا ${candidates.length} فرص بارزة. الشراء من أقل متجر في الفرص أدناه قد يحقق فرقًا واضحًا مقارنة بأعلى سعر مسجّل.</div></div>
      <div class="timeline">${candidates.map((x, i) => { const best = x.rows[0], st = DB.stores.find(s => s.id === best.storeId); return `<div class="tl-item"><div class="between"><div class="sm b">${i + 1}. ${esc(x.p.name)}</div><span class="badge ok">توفير ${egp(x.saving)}</span></div><div class="tiny muted mt6">أفضل سعر مسجّل ${egp(best.price)} لدى ${st ? esc(st.name) : 'متجر مسجّل'} · ${trustOf(best.updatedH).ar}</div></div>`; }).join('')}</div>
      <div class="insight info mt14"><span class="ic">🛡️</span><div class="tiny">التقرير يقارن أرقام قاعدة البيانات فقط ولا يخترع سعرًا. أكّد السعر والتوفر مع المتجر قبل الشراء.</div></div>`, `<button class="btn primary" onclick="closeModal()">تم</button>`, true);
  };
  document.querySelectorAll('[data-user-plan]').forEach(b => b.onclick = () => {
    if (b.dataset.userPlan === 'plus') return openPlusCheckout();
    APP.userPlan = 'free'; save('userPlan', 'free'); render(); toast('تم الرجوع إلى الباقة المجانية مع الاحتفاظ ببياناتك', 'ok', '✓');
  });
}

function initPWA() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname || ''))) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
