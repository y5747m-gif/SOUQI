/* =========================================================================
   الجزء 8: التهيئة والتشغيل
   ========================================================================= */

function demoModal() {
  openModal('ℹ️ عن هذا النموذج التجريبي', `
    <p class="sm">هذا نموذج تفاعلي كامل لمنصة <b>سوقي | SOUQI</b> يعمل كملف واحد بدون إنترنت وبدون أي مكتبات خارجية. كل الشاشات الحقيقية موجودة: البحث الذكي، مقارنة الأسعار، الخرائط، صفحة المتجر، العروض، لوحة تحكم المتجر، ولوحة الإدارة.</p>
    <hr class="sep">
    <div class="b mb10">ما هو حقيقي في النموذج</div>
    <div class="info-list">
      <div class="info-item"><span class="ic">🧠</span><span>محرك البحث العربي: يفهم العامية والميزانية والمسافة وحالة المتجر ويستخرج الفلاتر فعليًا.</span></div>
      <div class="info-item"><span class="ic">📐</span><span>حساب المسافات بمعادلة هافرساين من إحداثيات حقيقية للمناطق المصرية، وحساب «مفتوح الآن» من مواعيد العمل.</span></div>
      <div class="info-item"><span class="ic">⚖️</span><span>الترتيب الذكي: موازنة بين السعر والمسافة والخصم والتقييم وحداثة السعر.</span></div>
      <div class="info-item"><span class="ic">💾</span><span>تحديث الأسعار من لوحة المتجر يُحدّث نتائج البحث والرسوم فورًا، مع سجل تغييرات.</span></div>
      <div class="info-item"><span class="ic">🏪</span><span>معالج «أضف متجرك» ينشر متجرًا جديدًا فعلًا داخل النموذج ويظهر في البحث.</span></div>
      <div class="info-item"><span class="ic">🧭</span><span><b>بحث حقيقي في المحلات حولك:</b> صفحة «المتاجر القريبة» بتسأل قاعدة <b>OpenStreetMap</b> المفتوحة عن المحلات المسجّلة فعليًا على أرض الواقع حول موقعك (الاسم، النوع، العنوان، التليفون، المواعيد، المسافة) — مفيش أي محل وهمي في القسم ده. ولو محل مفيش له سعر مسجّل، بنقولها بصراحة وبنسمح لك تسجّل السعر — بدون اختراع أرقام.</span></div>
    </div>
    <hr class="sep">
    <div class="b mb10">ما هو توضيحي (بيانات تجريبية)</div>
    <div class="info-list">
      <div class="info-item"><span class="ic">🗄️</span><span>${DB.stores.filter(s => !s.real).length} متجرًا و${PRODUCTS.length} منتجًا و${nf(DB.listings.length)} سعرًا — بيانات مبنيّة لتشبه السوق المصري لكنها ليست بيانات حقيقية بعد.</span></div>
      <div class="info-item"><span class="ic">🔌</span><span>الدفع، التنبيهات، واتساب، والاتجاهات: محاكاة للأزرار (بدون خدمات خارجية).</span></div>
    </div>
    <div class="insight info mt14"><span class="ic">➡️</span><div class="sm">الخطوة التالية للمشروع: استبدال البيانات التجريبية ببيانات متاجر حقيقية في منطقة واحدة أولًا (راجع ملف <b>خطة_جمع_البيانات.md</b>)، ثم تشغيل نفس الواجهة على باكند Next.js + PostgreSQL.</div></div>`);
}
function tourModal() {
  openModal('🧭 جرّب أهم 7 ميزات في دقيقة', `
    <div class="timeline">
      <div class="tl-item"><div class="b sm">1 · البحث بالعامية</div><div class="tiny muted">اكتب في الصفحة الرئيسية: «عايز سماعة JBL تحت 3000 جنيه قريبة مني» وشوف كيف تُستخرج الفلاتر.</div></div>
      <div class="tl-item"><div class="b sm">2 · مقارنة الأسعار</div><div class="tiny muted">اضغط «☰ جدول» في صفحة النتائج لترى كل المتاجر في جدول واحد مع الترتيب حسب أي عمود.</div></div>
      <div class="tl-item"><div class="b sm">3 · صفحة المنتج وتاريخ السعر</div><div class="tiny muted">افتح أي منتج ثم تبويب «📊 تاريخ السعر» لتعرف إن كان الخصم حقيقيًا.</div></div>
      <div class="tl-item"><div class="b sm">4 · محلات حقيقية حولك</div><div class="tiny muted">صفحة «المتاجر القريبة»: اضغط «استخدم موقعي» وسوقي يبحث فعليًا في OpenStreetMap عن المحلات المسجّلة حولك (اسم، نوع، مسافة، تليفون، مواعيد) بنطاق من 300 متر حتى 25 كم — بدون أي محلات وهمية.</div></div>
      <div class="tl-item"><div class="b sm">5 · ماذا أشتري بميزانيتي</div><div class="tiny muted">افتح «المساعد» واكتب «عندي 10000 جنيه وعايز حاجة مفيدة للبيت».</div></div>
      <div class="tl-item"><div class="b sm">6 · لوحة تحكم المتجر</div><div class="tiny muted">عدّل سعر أي منتج واحفظ — وشوف أثره فورًا في البحث وفي «آخر تحديث».</div></div>
      <div class="tl-item" style="padding-bottom:0"><div class="b sm">7 · لوحة الإدارة والبلاغات</div><div class="tiny muted">جرّب «طلب تحديث الأسعار» و«توثيق متجر» وغيّر حالة بلاغ.</div></div>
    </div>`, `<button class="btn primary" onclick="closeModal();go('search',{q:'سماعة JBL تحت 3000 قريبة مني'})">ابدأ التجربة الآن</button><button class="btn" onclick="closeModal()">لاحقًا</button>`);
}
function init() {
  injectBrandIcon();          // أيقونة العلامة في تبويب المتصفح
  loadRealEdits();            // تصحيحات المستخدم على بيانات OSM
  loadUserPrices();           // الأسعار التي سجّلها المستخدم لمحلات حقيقية
  realCacheLoad();            // آخر نتائج بحث حقيقي (محفوظة على الجهاز)
  if (!location.hash) location.hash = '#/home';
  if (!APP.history.length) APP.history = [{ q: 'ايفون 15 تحت 40000', at: 'أمس' }, { q: 'سماعة JBL قريبة مني', at: 'منذ 3 أيام' }];
  render();
  setTimeout(() => {
    toast('أهلًا في سوقي! جرّب: «عايز سماعة JBL تحت 3000 جنيه قريبة مني»', 'ok', '👋');
  }, 800);
  setTimeout(() => {
    if (!load('seenTour', false)) { tourModal(); save('seenTour', true); }
  }, 2000);
}
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('error', (e) => {
  const box = document.getElementById('app');
  if (box && !box.innerHTML.trim()) box.innerHTML = '<div class="wrap" style="padding:40px 18px"><div class="card pad center"><div style="font-size:32px">⚠️</div><div class="b mt6">حدث خطأ أثناء تحميل الصفحة</div><p class="tiny muted mt6">' + (e.message || '') + '</p></div></div>';
});
