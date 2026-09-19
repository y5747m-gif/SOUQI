/* =========================================================================
   سوقي | SOUQI  —  النموذج التفاعلي
   ملف واحد قابل للتشغيل بدون إنترنت (بدون CDN / بدون مكتبات خارجية)
   الجزء 1: الأدوات المساعدة + قاعدة البيانات التجريبية
   ========================================================================= */
'use strict';

/* ------------------------- 1. أدوات مساعدة ------------------------- */
const AR_WEB = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round = (n, s = 1) => Math.round(n / s) * s;
/* هاش ثابت: نفس الرقم في كل مرة لنفس النص */
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
function rnd(seed) { const x = Math.sin(hash(seed) * 0.000123) * 43758.5453; return x - Math.floor(x); }
const rng = (seed, a, b) => a + rnd(seed) * (b - a);
const pick = (seed, arr) => arr[Math.floor(rnd(seed) * arr.length) % arr.length];

/* الأرقام: نستخدم أرقامًا لاتينية لسهولة القراءة (مثال: 24,900 ج.م) */
const nf = (n) => Math.round(n).toLocaleString('en-US');
const egp = (n) => nf(n) + ' ج.م';
const pct = (n) => Math.round(n) + '%';
const kmTxt = (d) => d < 1 ? nf(d * 1000) + ' م' : (d < 10 ? d.toFixed(1) : Math.round(d)) + ' كم';
const when = (h) => h == null ? '—' : h < 1 ? 'الآن' : h < 24 ? 'منذ ' + Math.round(h) + ' ساعة' : h < 48 ? 'أمس' : 'منذ ' + Math.round(h / 24) + ' يوم';
const timeTxt = (h) => String(Math.floor(h)).padStart(2, '0') + ':00';
const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const waLink = (p, t) => 'https://wa.me/' + String(p).replace(/^0/, '20').replace(/\D/g, '') + (t ? '?text=' + encodeURIComponent(t) : '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const deep = (o) => JSON.parse(JSON.stringify(o));
const save = (k, v) => { try { localStorage.setItem('souqi.' + k, JSON.stringify(v)); } catch (e) { } };
const load = (k, d) => { try { const v = localStorage.getItem('souqi.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };

/* مسافة هافرساين بالكيلومتر */
function distKm(a, b) {
  const R = 6371, t = (x) => x * Math.PI / 180;
  const dLat = t(b.lat - a.lat), dLon = t(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
/* وقت الوصول التقريبي (متوسط سرعة 22 كم/س داخل المدينة) */
const etaMin = (d) => Math.max(2, Math.round(d / 22 * 60));

/* هل المتجر مفتوح الآن؟ (يعتمد على مواعيد العمل المسجلة) */
function isOpen(st, now = new Date()) {
  if (st.source === 'google') return typeof st.openNow === 'boolean' ? st.openNow : null;
  if (st.openH == null || st.closeH == null) return null;   // مواعيد غير مسجّلة → لا نخمّن
  const h = now.getHours() + now.getMinutes() / 60;
  const isFri = now.getDay() === 5;
  let op = st.openH, cl = st.closeH;
  if (isFri) { if (st.fri === 'off') return false; if (st.fri === 'late') { op = Math.max(op, 14); if (h < op) return false; } }
  if (st.fri === 'off' && isFri) return false;
  if (cl > op) return h >= op && h < cl;
  return h >= op || h < cl; // مواعيد تمتد بعد منتصف الليل
}
const hoursTxt = (st) => timeTxt(st.openH) + ' — ' + timeTxt(st.closeH);

/* ------------------------- 2. الأقسام ------------------------- */
const CATS = [
  { id: 'mobile', ar: 'موبايلات', em: '📱' },
  { id: 'computer', ar: 'كمبيوتر ولابتوب', em: '💻' },
  { id: 'audio', ar: 'سماعات وصوتيات', em: '🎧' },
  { id: 'electronics', ar: 'إلكترونيات', em: '🖥️' },
  { id: 'gaming', ar: 'ألعاب وترفيه', em: '🎮' },
  { id: 'home', ar: 'منزل ومطبخ', em: '🏠' },
  { id: 'clothing', ar: 'ملابس وأزياء', em: '👕' },
  { id: 'shoes', ar: 'أحذية', em: '👟' },
  { id: 'beauty', ar: 'تجميل وعطور', em: '💄' },
  { id: 'supermarket', ar: 'سوبر ماركت', em: '🛒' },
  { id: 'books', ar: 'كتب ومكتبات', em: '📚' },
  { id: 'tools', ar: 'أدوات وعدد', em: '🔧' },
  { id: 'restaurant', ar: 'مطاعم', em: '🍔' },
  { id: 'pharmacy', ar: 'صيدليات', em: '💊' },
  { id: 'auto', ar: 'سيارات وقطع غيار', em: '🚗' },
  { id: 'sports', ar: 'رياضة ولياقة', em: '🏋️' }
];
const catOf = (id) => CATS.find(c => c.id === id) || { id: id, ar: id, em: '🏬' };

/* ------------------------- 3. المتاجر -------------------------
   الحقول: [المعرّف, الاسم, المنطقة, المحافظة, lat, lon, الأقسام, التقييم,
            عدد التقييمات, ساعة الفتح, ساعة الغلق, معامل السعر, الباقة,
            موثّق, الهاتف, وصف قصير, وضع الجمعة, ممول]
------------------------------------------------------------------- */
const RAW_STORES = [
  ['nile', 'نيل إلكترونيكس', 'الدقي', 'الجيزة', 30.0380, 31.2115, ['mobile', 'computer', 'audio', 'electronics', 'gaming'], 4.7, 214, 10, 23, 0.98, 'pro', 1, '01001234567', 'متجر متخصص في الموبايلات واللابتوبات الأصلية بضمان الوكيل، مع خدمة تركيب وصيانة داخل الفرع.', 'normal', 0],
  ['techno', 'تكنو ستور مصر', 'المهندسين', 'الجيزة', 30.0561, 31.2005, ['computer', 'mobile', 'audio', 'electronics', 'gaming'], 4.5, 168, 10, 23.5, 1.02, 'pro', 1, '01002345678', 'من أكبر متاجر الكمبيوتر والتجميعات في المهندسين، مع فريق دعم فني متخصص.', 'normal', 0],
  ['future', 'فيوتشر تك', 'فيصل', 'الجيزة', 30.0095, 31.1840, ['mobile', 'audio', 'electronics'], 4.2, 96, 11, 23, 0.96, 'free', 0, '01003456789', 'أسعار منافسة في الموبايلات والسماعات مع إمكانية التقسيط.', 'late', 0],
  ['mobilec', 'موبايل سنتر', 'وسط البلد', 'القاهرة', 30.0455, 31.2402, ['mobile', 'audio', 'electronics'], 4.6, 302, 10, 22, 0.94, 'pro', 1, '01004567890', 'من أقدم متاجر الموبايل في وسط البلد، ضمان ووكيل وأسعار جملة.', 'normal', 0],
  ['smarthome', 'سمارت هوم', 'مدينة نصر', 'القاهرة', 30.0510, 31.3400, ['electronics', 'home', 'computer'], 4.4, 121, 10, 23, 1.03, 'pro', 1, '01005678901', 'أجهزة منزلية ذكية وحلول الشبكات والكاميرات.', 'normal', 0],
  ['raed', 'الرائد كمبيوتر', 'العتبة', 'القاهرة', 30.0500, 31.2470, ['computer', 'electronics', 'gaming'], 4.6, 187, 10, 21.5, 0.93, 'pro', 1, '01006789012', 'تجميعات الكمبيوتر وقطع الغيار بأفضل الأسعار، وخدمة تجميع مجانية.', 'normal', 1],
  ['compu', 'كمبيو ماركت', 'شبرا', 'القاهرة', 30.0890, 31.2450, ['computer', 'electronics'], 4.0, 74, 11, 22, 0.97, 'free', 0, '01007890123', 'لابتوبات وطابعات ومستلزمات مكتبية.', 'late', 0],
  ['digizone', 'ديجيتال زون', 'المعادي', 'القاهرة', 29.9605, 31.2580, ['mobile', 'computer', 'audio'], 4.3, 88, 10.5, 23, 1.00, 'free', 0, '01008901234', 'موبايلات وسماعات ولابتوبات بضمان محلي.', 'normal', 0],
  ['misrmob', 'مصر موبايل', 'حلوان', 'القاهرة', 29.8480, 31.3330, ['mobile', 'audio'], 4.1, 51, 11, 23, 0.97, 'free', 0, '01009012345', 'موبايلات جديدة ومستعملة بحالة الزيرو.', 'normal', 0],
  ['homestyle', 'هوم ستايل', 'زهراء المعادي', 'القاهرة', 29.9700, 31.2800, ['home', 'supermarket'], 4.2, 64, 9, 22, 1.02, 'free', 0, '01011112222', 'مستلزمات المنزل والمطبخ وأدوات التنظيف.', 'normal', 0],
  ['elegance', 'الأناقة مودا', 'المهندسين', 'الجيزة', 30.0585, 31.2050, ['clothing', 'shoes', 'beauty'], 4.5, 143, 11, 23, 1.04, 'pro', 1, '01012223333', 'أزياء رجالية وحريمي بماركات تركية وجودتها عالية.', 'normal', 0],
  ['fashionh', 'فاشون هاوس', 'مدينة نصر', 'القاهرة', 30.0600, 31.3390, ['clothing', 'shoes'], 4.3, 112, 10.5, 23, 1.01, 'free', 0, '01013334444', 'ملابس رجالي وحريمي وأطفال، عرض جديد كل أسبوع.', 'normal', 0],
  ['trendsh', 'تريند شوز', 'المعادي', 'القاهرة', 29.9640, 31.2600, ['shoes', 'sports'], 4.4, 79, 11, 23, 0.99, 'free', 0, '01014445555', 'أحذية رياضية أصلية وموديلات محدودة.', 'normal', 0],
  ['sneaker', 'سنيكرز ستور', 'التجمع الخامس', 'القاهرة', 30.0080, 31.4400, ['shoes', 'sports', 'clothing'], 4.6, 98, 11, 23.5, 1.06, 'pro', 1, '01015556666', 'ستور سنيكرز متخصص في الإصدارات الجديدة.', 'normal', 0],
  ['glam', 'جلام بيوتي', 'مصر الجديدة', 'القاهرة', 30.0870, 31.3200, ['beauty', 'pharmacy'], 4.7, 156, 10, 22.5, 1.05, 'pro', 1, '01016667777', 'مستحضرات تجميل أصلية وعطور ومستلزمات العناية بالبشرة.', 'normal', 0],
  ['bayt', 'سوق البيت', 'السادس من أكتوبر', 'الجيزة', 29.9600, 30.9200, ['home', 'tools', 'supermarket'], 4.1, 58, 9, 22, 0.98, 'free', 0, '01017778888', 'كل احتياجات البيت من أدوات ومستلزمات بأسعار الجملة.', 'normal', 0],
  ['khair', 'مول الخير ماركت', 'الشيخ زايد', 'الجيزة', 30.0300, 30.9800, ['supermarket', 'home'], 4.4, 210, 9, 1, 1.03, 'pro', 1, '01018889999', 'سوبر ماركت كبير بمنتجات طازجة وأسعار المنافسة.', 'normal', 0],
  ['amal', 'مكتبة الأمل', 'وسط البلد', 'القاهرة', 30.0430, 31.2445, ['books', 'tools'], 4.8, 176, 9, 21, 0.95, 'pro', 1, '01019990000', 'مكتبة عامة وكتب دراسية وأدوات مكتبية.', 'off', 0],
  ['nasser', 'أدوات النصر', 'الموسكي', 'القاهرة', 30.0530, 31.2520, ['tools', 'home'], 4.3, 69, 9, 20, 0.92, 'free', 0, '01020201111', 'أدوات وعدد يدوية ولوازم ورش.', 'late', 0],
  ['familyph', 'صيدلية العائلة', 'الدقي', 'الجيزة', 30.0360, 31.2150, ['pharmacy', 'beauty'], 4.6, 132, 8, 0.5, 1.00, 'pro', 1, '01021312222', 'صيدلية وخدمة توصيل على مدار الساعة داخل الدقي.', 'normal', 0],
  ['crepe', 'كريب هاوس', 'المهندسين', 'الجيزة', 30.0600, 31.2020, ['restaurant'], 4.5, 421, 12, 3, 1.00, 'free', 0, '01022423333', 'كريب ووافل ومشروبات، توصيل مجاني للأوردرات فوق 300 جنيه.', 'normal', 0],
  ['autop', 'أوتو بارتس', 'إمبابة', 'الجيزة', 30.0800, 31.2080, ['auto', 'tools'], 4.2, 87, 9, 20, 0.96, 'free', 0, '01023534444', 'قطع غيار سيارات أصلية وبدائل بضمان.', 'off', 0],
  ['gymz', 'جيم زون', 'العجوزة', 'الجيزة', 30.0480, 31.2110, ['sports', 'shoes'], 4.4, 45, 9, 23, 1.01, 'free', 0, '01024645555', 'أدوات رياضية ومكملات ومستلزمات الجيم.', 'normal', 0],
  ['alexdig', 'أليكس ديجيتال', 'سموحة', 'الإسكندرية', 31.2120, 29.9500, ['mobile', 'computer', 'audio', 'electronics'], 4.6, 198, 10, 23, 0.99, 'pro', 1, '01025756666', 'موبايلات ولابتوبات وسماعات بضمان معتمد.', 'normal', 0],
  ['smartalex', 'سمارت ستور إسكندرية', 'سيدي جابر', 'الإسكندرية', 31.2200, 29.9450, ['computer', 'electronics', 'gaming'], 4.4, 121, 10, 23, 1.00, 'free', 0, '01026867777', 'كمبيوترات وتجميعات وشاشات.', 'normal', 0],
  ['falex', 'فاشون أليكس', 'المنشية', 'الإسكندرية', 31.1980, 29.8880, ['clothing', 'shoes'], 4.2, 88, 10, 23, 0.96, 'free', 0, '01027978888', 'أزياء متنوعة بأسعار مناسبة.', 'normal', 0],
  ['ramlph', 'صيدلية الرمل', 'الرمل', 'الإسكندرية', 31.2130, 29.9280, ['pharmacy', 'beauty'], 4.5, 110, 8.5, 23, 1.01, 'free', 0, '01028089999', 'صيدلية ومستحضرات عناية.', 'normal', 0],
  ['megamans', 'ميجا ستور المنصورة', 'المنصورة', 'الدقهلية', 31.0400, 31.3800, ['mobile', 'computer', 'electronics'], 4.5, 143, 10, 23, 0.97, 'pro', 1, '01029190000', 'أكبر متجر إلكترونيات في المنصورة.', 'normal', 0],
  ['tantatech', 'طنطا تك', 'طنطا', 'الغربية', 30.7900, 31.0000, ['mobile', 'computer', 'audio'], 4.3, 97, 10, 23, 0.98, 'free', 0, '01030201111', 'موبايلات ولابتوبات وخدمة صيانة.', 'normal', 0],
  ['zagmarket', 'الزقازيق ماركت', 'الزقازيق', 'الشرقية', 30.5800, 31.5000, ['supermarket', 'home', 'clothing'], 4.0, 61, 8, 22, 0.95, 'free', 0, '01031312222', 'سوبر ماركت ومستلزمات منزلية.', 'normal', 0],
  ['ismailia', 'الإسماعيلية سنتر', 'الإسماعيلية', 'الإسماعيلية', 30.6000, 32.2700, ['electronics', 'clothing', 'mobile'], 4.4, 76, 10, 23, 0.99, 'free', 0, '01032423333', 'إلكترونيات وملابس وهدايا.', 'normal', 0],
  ['portsaid', 'بورسعيد ستور', 'بورسعيد', 'بورسعيد', 31.2600, 32.3000, ['clothing', 'shoes', 'electronics'], 4.5, 134, 10, 23, 0.94, 'pro', 1, '01033534444', 'ملابس وأحذية مستوردة وأسعار المنطقة الحرة.', 'normal', 1],
  ['aswanm', 'أسوان موبايل', 'أسوان', 'أسوان', 24.0900, 32.9000, ['mobile', 'electronics'], 4.2, 58, 10, 23, 1.02, 'free', 0, '01034645555', 'موبايلات وملحقاتها مع خدمة تقسيط.', 'normal', 0],
  ['luxort', 'الأقصر تك', 'الأقصر', 'الأقصر', 25.6900, 32.6400, ['computer', 'mobile', 'electronics'], 4.3, 64, 10, 22.5, 1.01, 'free', 0, '01035756666', 'كمبيوترات وموبايلات وخدمات صيانة.', 'normal', 0],
  ['assiut', 'أسيوط سنتر', 'أسيوط', 'أسيوط', 27.1800, 31.1800, ['electronics', 'home', 'mobile'], 4.1, 71, 10, 23, 1.00, 'free', 0, '01036867777', 'إلكترونيات وأجهزة منزلية.', 'normal', 0],
  ['hurgh', 'الغردقة ماركت', 'الغردقة', 'البحر الأحمر', 27.2600, 33.8100, ['supermarket', 'electronics', 'home'], 4.4, 89, 9, 23, 1.04, 'free', 0, '01037978888', 'سوبر ماركت ومستلزمات الساحل والبحر.', 'normal', 0],
  ['sharm', 'شرم ستورز', 'شرم الشيخ', 'جنوب سيناء', 27.9100, 34.3300, ['clothing', 'electronics', 'supermarket'], 4.5, 102, 9, 23, 1.07, 'pro', 1, '01038089999', 'ملابس وإلكترونيات ومستلزمات سياحية.', 'normal', 0],
  ['matrouh', 'مطروح ماركت', 'مرسى مطروح', 'مطروح', 31.3500, 27.2400, ['supermarket', 'home'], 4.2, 47, 8, 22, 1.05, 'free', 0, '01039190000', 'سوبر ماركت ومستلزمات الساحل الشمالي.', 'normal', 0],
  ['fayoum', 'الفيوم تك', 'الفيوم', 'الفيوم', 29.3100, 30.8400, ['electronics', 'mobile', 'home'], 4.0, 52, 10, 22, 0.98, 'free', 0, '01040201111', 'إلكترونيات وأجهزة منزلية.', 'normal', 0],
  ['banha', 'بنها ستورز', 'بنها', 'القليوبية', 30.4600, 31.1800, ['clothing', 'electronics', 'supermarket'], 4.1, 66, 10, 23, 0.99, 'free', 0, '01041312222', 'ملابس وإلكترونيات وكل احتياجات الأسرة.', 'normal', 0],
  ['sharq', 'مطعم الشرق للمشويات', 'مدينة نصر', 'القاهرة', 30.0560, 31.3450, ['restaurant'], 4.6, 512, 11, 2, 0.95, 'free', 0, '01042423333', 'مشويات وفراخ مشوية وأسماك، وتوصيل داخل مدينة نصر والمصر الجديدة.', 'normal', 0],
  ['nileph', 'صيدلية النيل', 'المهندسين', 'الجيزة', 30.0590, 31.1990, ['pharmacy', 'beauty'], 4.7, 189, 8, 1.5, 1.00, 'pro', 1, '01043534444', 'صيدلية شاملة بأدوية ومستحضرات عناية، وخدمة توصيل حتى الفجر.', 'normal', 0],
  ['horrya', 'قطع غيار الحرية', 'سموحة', 'الإسكندرية', 31.2090, 29.9560, ['auto', 'tools'], 4.4, 73, 9, 21, 0.97, 'free', 0, '01044645555', 'قطع غيار أصلية وبديلة لجميع الماركات مع خدمة التركيب.', 'normal', 0],
  ['tagamoa', 'مول التجمع التجاري', 'التجمع الأول', 'القاهرة', 30.0500, 31.4600, ['sports', 'clothing', 'shoes'], 4.3, 118, 10, 23, 1.03, 'pro', 1, '01045756666', 'متجر رياضي وأزياء وأحذية بماركات عالمية.', 'normal', 0]
];

/* ------------------------- 4. المنتجات -------------------------
   [المعرّف, الاسم, الماركة, القسم, السعر المرجعي, الرمز, كلمات البحث]
---------------------------------------------------------------- */
const P = (id, name, brand, cat, base, em, kw) => ({ id, name, brand, cat, base, em, kw });
const PRODUCTS = [
  P('ip15', 'iPhone 15 128GB', 'Apple', 'mobile', 36500, '📱', 'ايفون ابل iphone موبايل هاتف'),
  P('ip13', 'iPhone 13 128GB', 'Apple', 'mobile', 27900, '📱', 'ايفون ابل iphone 13 موبايل'),
  P('sa56', 'Samsung Galaxy A56 5G', 'Samsung', 'mobile', 24900, '📱', 'سامسونج جالاكسي galaxy a56 موبايل'),
  P('ss24fe', 'Samsung Galaxy S24 FE', 'Samsung', 'mobile', 38500, '📱', 'سامسونج جالاكسي s24 fe موبايل'),
  P('s24u', 'Samsung Galaxy S24 Ultra 256GB', 'Samsung', 'mobile', 62900, '📱', 'سامسونج جالاكسي الترا s24 ultra موبايل'),
  P('rn14', 'Xiaomi Redmi Note 14 Pro', 'Xiaomi', 'mobile', 13900, '📱', 'شاومي ريدمي redmi note 14 موبايل'),
  P('xi14', 'Xiaomi 14T Pro', 'Xiaomi', 'mobile', 32500, '📱', 'شاومي xiaomi 14t موبايل'),
  P('oppo', 'Oppo Reno 12 5G', 'Oppo', 'mobile', 21900, '📱', 'اوبو رينو oppo reno 12 موبايل'),
  P('honor', 'Honor X9c', 'Honor', 'mobile', 14200, '📱', 'هونر honor موبايل'),
  P('realme', 'Realme 13 Pro+', 'Realme', 'mobile', 19400, '📱', 'ريلمي realme موبايل'),
  P('infinix', 'Infinix Hot 50 Pro', 'Infinix', 'mobile', 9800, '📱', 'انفينكس infinix موبايل رخيص'),
  P('tab', 'Samsung Galaxy Tab A9+', 'Samsung', 'mobile', 11500, '📲', 'تابلت سامسونج tab جهاز لوحي'),
  P('watch', 'Apple Watch SE 2', 'Apple', 'mobile', 12900, '⌚', 'ساعة ابل watch smartwatch'),
  P('gwatch', 'Samsung Galaxy Watch 7', 'Samsung', 'mobile', 14900, '⌚', 'ساعة سامسونج watch smartwatch'),
  P('jbl520', 'سماعة JBL Tune 520BT', 'JBL', 'audio', 2650, '🎧', 'سماعة هيدفون jbl بلوتوث headphones'),
  P('jblgo4', 'سماعة JBL Go 4', 'JBL', 'audio', 1950, '🔊', 'سماعة بلوتوث jbl سبيكر'),
  P('ankerq30', 'سماعة Anker Soundcore Life Q30', 'Anker', 'audio', 2950, '🎧', 'سماعة انكر anker soundcore هيدفون'),
  P('sony520', 'سماعة Sony WH-CH520', 'Sony', 'audio', 2780, '🎧', 'سماعة سوني sony هيدفون بلوتوث'),
  P('buds', 'سماعة Samsung Galaxy Buds FE', 'Samsung', 'audio', 3100, '🎧', 'سماعة سامسونج buds ايربودز'),
  P('boom', 'مكبر صوت بلوتوث Anker 40W', 'Anker', 'audio', 4200, '🔊', 'سبيكر مكبر صوت anker بلوتوث'),
  P('lenovo3', 'لابتوب Lenovo IdeaPad Slim 3 i5', 'Lenovo', 'computer', 26900, '💻', 'لابتوب لينوفو lenovo ideapad كمبيوتر محمول'),
  P('hp15', 'لابتوب HP Victus 15 RTX 2050', 'HP', 'computer', 38900, '💻', 'لابتوب اتش بي hp victus العاب جيمنج'),
  P('asus', 'لابتوب Asus TUF Gaming F15 RTX 4060', 'Asus', 'computer', 62900, '💻', 'لابتوب اسوس asus tuf جيمنج العاب'),
  P('dell', 'لابتوب Dell Inspiron 15 i7', 'Dell', 'computer', 31500, '💻', 'لابتوب ديل dell inspiron'),
  P('macair', 'لابتوب MacBook Air M2', 'Apple', 'computer', 52900, '💻', 'لابتوب ماك بوك macbook ابل m2'),
  P('rtx4060', 'كارت شاشة MSI RTX 4060 Ventus 8GB', 'MSI', 'computer', 19800, '🎮', 'كارت شاشة جي فورس rtx 4060 vga graphics'),
  P('ram16', 'رام Kingston Fury DDR4 16GB', 'Kingston', 'computer', 1850, '🧩', 'رام كينجستون ram ميموري 16 جيجا'),
  P('ssd1t', 'هارد SSD Samsung 1TB NVMe', 'Samsung', 'computer', 2900, '💾', 'هارد ssd سامسونج تخزين'),
  P('mon24', 'شاشة Samsung 24 بوصة 75Hz', 'Samsung', 'electronics', 5600, '🖥️', 'شاشة مونيتور monitor سامسونج'),
  P('router', 'راوتر TP-Link Archer C6', 'TP-Link', 'electronics', 1250, '📶', 'راوتر واي فاي wifi tp-link شبكة'),
  P('mx3s', 'ماوس لوجيتك MX Master 3S', 'Logitech', 'electronics', 4900, '🖱️', 'ماوس لوجيتك mouse لاسلكي'),
  P('ps5', 'PlayStation 5 Slim', 'Sony', 'gaming', 34500, '🎮', 'بلايستيشن بلاي ستيشن ps5 جهاز العاب'),
  P('xbox', 'Xbox Series S 512GB', 'Microsoft', 'gaming', 18500, '🎮', 'اكس بوكس xbox جهاز العاب'),
  P('powerbank', 'باور بانك Anker 10000mAh', 'Anker', 'electronics', 1150, '🔋', 'باور بانك شاحن متنقل انكر power bank'),
  P('af1', 'حذاء Nike Air Force 1', 'Nike', 'shoes', 4600, '👟', 'حذاء نايك nike sneakers احذية'),
  P('ub', 'حذاء Adidas Ultraboost Light', 'Adidas', 'shoes', 6900, '👟', 'حذاء اديداس adidas ultraboost رياضي'),
  P('samba', 'حذاء Adidas Samba OG', 'Adidas', 'shoes', 5300, '👟', 'حذاء اديداس samba سنيكرز'),
  P('puma', 'حذاء Puma RS-X', 'Puma', 'shoes', 3300, '👟', 'حذاء بوما puma رياضي'),
  P('levis', 'بنطلون Levi\u2019s 501 جينز', 'Levi\u2019s', 'clothing', 3950, '👖', 'بنطلون جينز ليفايس levis 501 ملابس'),
  P('tshirt', 'تيشيرت قطن رجالي', 'محلي', 'clothing', 480, '👕', 'تيشيرت تي شيرت قطن ملابس رجالي'),
  P('shirt', 'قميص كلاسيك رجالي', 'محلي', 'clothing', 850, '👔', 'قميص كلاسيك ملابس رجالي'),
  P('dress', 'فستان سوارية حريمي', 'محلي', 'clothing', 1650, '👗', 'فستان سوارية حريمي ملابس نسائي'),
  P('hijab', 'طرحة شيفون تركي', 'محلي', 'clothing', 320, '🧣', 'طرحة شيفون حجاب اكسسوار'),
  P('airfryer', 'قلاية هوائية Philips XL', 'Philips', 'home', 6600, '🍟', 'قلاية هوائية فيليبس air fryer مطبخ'),
  P('tefal', 'طقم أواني تيفال 10 قطع', 'Tefal', 'home', 3400, '🍳', 'طقم اواني تيفال tefal حلل مطبخ'),
  P('vac', 'مكنسة تورنيدو 2000 وات', 'Tornado', 'home', 5200, '🧹', 'مكنسة كهربائية تورنيدو vacuum منزل'),
  P('fan', 'مروحة توشيبا 16 بوصة', 'Toshiba', 'home', 1450, '🌀', 'مروحة توشيبا منزل صيف'),
  P('mug', 'طقم أكواب قهوة 6 قطع', 'محلي', 'home', 450, '☕', 'اكواب طقم قهوة مطبخ'),
  P('sauvage', 'عطر Dior Sauvage 100ml', 'Dior', 'beauty', 6900, '🧴', 'عطر ديور sauvage برفيوم'),
  P('cerave', 'كريم مرطب CeraVe 454g', 'CeraVe', 'beauty', 720, '🧴', 'كريم مرطب سيرافي cerave عناية بالبشرة'),
  P('loreal', 'شامبو L\u2019Oréal Paris 400ml', 'L\u2019Oréal', 'beauty', 380, '🧴', 'شامبو لوريال loreal شعر'),
  P('philips', 'ماكينة حلاقة Philips Series 3000', 'Philips', 'beauty', 2650, '🪒', 'ماكينة حلاقة فيليبس philips رجالي'),
  P('rice', 'أرز مصري فاخر 5 كجم', 'محلي', 'supermarket', 185, '🍚', 'ارز بسمتي مصري سوبر ماركت'),
  P('oil', 'زيت عافية دوار الشمس 1 لتر', 'Afia', 'supermarket', 95, '🫒', 'زيت عافية سوبر ماركت مطبخ'),
  P('cheese', 'جبنة بيضاء 1 كجم', 'محلي', 'supermarket', 165, '🧀', 'جبنة بيضاء كجم سوبر ماركت'),
  P('coffee', 'قهوة محمصة 250 جم', 'محلي', 'supermarket', 210, '☕', 'قهوة محمصة بن سوبر ماركت'),
  P('atomic', 'كتاب العادات الذرية', 'مكتبة', 'books', 260, '📕', 'كتاب العادات الذرية قراءة'),
  P('novel', 'رواية أولاد حارتنا', 'مكتبة', 'books', 145, '📗', 'رواية كتاب ادب'),
  P('notebook', 'نوت بوك A5 + طقم أقلام', 'محلي', 'books', 120, '📓', 'نوت بوك كراسة اقلام مدرسة'),
  P('drill', 'شنيور بوش 500 وات', 'Bosch', 'tools', 3950, '🛠️', 'شنيور دريل بوش bosch عدة'),
  P('toolset', 'طقم مفكات 40 قطعة', 'محلي', 'tools', 460, '🔧', 'طقم مفكات عدة ادوات'),
  P('ladder', 'سلم ألومنيوم 5 درجات', 'محلي', 'tools', 1250, '🪜', 'سلم الومنيوم عدة ادوات'),
  P('crepe', 'وجبة كريب فراخ', 'كريب هاوس', 'restaurant', 135, '🥙', 'كريب فراخ وجبة مطعم'),
  P('pizza', 'بيتزا وسط عائلي', 'مطعم', 'restaurant', 220, '🍕', 'بيتزا عائلي مطعم وجبة'),
  P('chicken', 'وجبة فراخ مشوية كاملة', 'مطعم', 'restaurant', 380, '🍗', 'فراخ مشوية وجبة مطعم'),
  P('vitd', 'فيتامين د 50000 وحدة', 'صيدلية', 'pharmacy', 95, '💊', 'فيتامين د مكمل صيدلية'),
  P('panadol', 'بنادول اكسترا 24 قرص', 'GSK', 'pharmacy', 78, '💊', 'بنادول مسكن صيدلية'),
  P('sunscreen', 'واقي شمس SPF50', 'La Roche-Posay', 'pharmacy', 890, '🧴', 'واقي شمس صيدلية عناية'),
  P('motoroil', 'زيت موتور Shell 5W-30 4 لتر', 'Shell', 'auto', 1450, '🛢️', 'زيت موتور سيارة شل'),
  P('tire', 'كاوتش 195/65 R15', 'Bridgestone', 'auto', 2950, '🛞', 'كاوتش اطار سيارة'),
  P('dumbbell', 'دمبل 10 كجم', 'محلي', 'sports', 780, '🏋️', 'دمبل اثقال رياضة جيم'),
  P('yoga', 'سجادة يوجا 6 مم', 'محلي', 'sports', 460, '🧘', 'سجادة يوجا رياضة')
];

/* لوائح مساعدة */
const PAYS = ['كاش', 'فيزا / ماستركارد', 'محفظة إلكترونية', 'انستاباي', 'فاليو', 'تقسيط بدون فائدة'];
const SVCS = {
  mobile: ['ضمان سنة', 'تركيب شاشة حماية', 'نقل بيانات من القديم', 'تقسيط', 'استبدال خلال 14 يوم'],
  computer: ['تجميع مجاني', 'تركيب ويندوز', 'ضمان سنة', 'صيانة بعد البيع', 'تقسيط'],
  electronics: ['ضمان سنة', 'تركيب في المنزل', 'خدمة صيانة', 'توصيل'],
  audio: ['ضمان سنة', 'تجربة قبل الشراء', 'توصيل'],
  home: ['توصيل', 'تركيب', 'ضمان', 'استبدال خلال 14 يوم'],
  clothing: ['استبدال المقاس', 'تعديل مجاني', 'قياس أونلاين'],
  shoes: ['استبدال المقاس', 'توصيل', 'تنظيف مجاني أول مرة'],
  beauty: ['عينات مجانية', 'استشارة تجميل', 'منتجات أصلية 100%'],
  supermarket: ['توصيل في نفس اليوم', 'عروض أسبوعية', 'خدمة طلبات واتساب'],
  books: ['طلب الكتب غير المتوفرة', 'توصيل', 'خصم للطلبة'],
  tools: ['ضمان', 'توصيل', 'خدمة سن العدد'],
  restaurant: ['توصيل', 'طلب واتساب', 'جلسات عائلية'],
  pharmacy: ['توصيل 24 ساعة', 'قياس ضغط وسكر', 'منتجات أصلية'],
  auto: ['تركيب', 'ضمان', 'فحص مجاني'],
  sports: ['ضمان', 'توصيل', 'استشارة تدريب']
};
const REVIEW_TXT = [
  'تعامل راقي جدًا والسعر كان أفضل من كل الأماكن اللي سألت فيها.',
  'المنتج أصلي وبالضمان، والمكان نضيف والخدمة سريعة.',
  'الأسعار معقولة بس كنت محتاج أستنى شوية لحد ما جهازي اتظبط.',
  'اتصلت اسأل عن السعر وقالولي بالضبط زي الموقع، جيت ولقيته متوفر.',
  'أفضل ميزة عندهم خدمة ما بعد البيع، ساعدوني في التركيب.',
  'الموظف شرح لي كل حاجة بصراحة وما ضغطش عليّ في الشراء.',
  'المكان صغير شوية بس البضاعة أصلية والأسعار منافسة.',
  'اشتريت منهم أكتر من مرة والتجربة ثابتة، أنصح بيهم.',
  'في فرق بسيط بين السعر على الموقع والفرع، اتعدل بعد ما قلت لهم.',
  'خدمة الواتساب سريعة، ردوا عليّ في دقايق وحددوا المتوفر.'
];
const USER_NAMES = ['أحمد م.', 'محمود ع.', 'سارة ح.', 'منة الله ص.', 'كريم ط.', 'نورهان ف.', 'يوسف ب.', 'هبة ر.', 'عمرو س.', 'دينا ك.', 'مصطفى ج.', 'رنا و.'];

/* ------------------------- 5. بناء قاعدة البيانات ------------------------- */
const CITY_COORDS = {}; // إحداثي تقريبي لكل محافظة (لحساب المسافة بين المحافظات غير الموجودة)
/* نطاق الخدمة الإلزامي: القاهرة والجيزة فقط. لا تُعرض ولا تُحلّل أي بيانات خارجهما. */
const SERVICE_CITIES = new Set(['القاهرة', 'الجيزة']);
const SERVICE_CITY_LABEL = 'القاهرة والجيزة';
const DB = { stores: [], listings: [], byStore: {}, byProduct: {}, offers: [], reviews: {}, alerts: [], reports: [] };

/* كم متجرًا يغطي كل قسم؟ (لاستكمال الأقسام النادرة مثل المطاعم والصيدليات) */
const CAT_COUNT = {};
RAW_STORES.forEach(r => (r[6] || []).forEach(c => CAT_COUNT[c] = (CAT_COUNT[c] || 0) + 1));

RAW_STORES.forEach((r, si) => {
  const [id, name, area, city, lat, lon, cats, rating, rc, openH, closeH, pf, plan, verified, phone, desc, fri, sponsored] = r;
  if (!SERVICE_CITIES.has(city)) return; // حماية مركزية تمنع تسرب محافظات خارج نطاق الخدمة
  const seed = 'st' + id;
  const st = {
    id, name, area, city, lat, lon, cats, rating, rc, openH, closeH, pf, plan,
    verified: !!verified, phone, desc, fri, sponsored: !!sponsored,
    delivery: true, deliveryFeeBase: 25, deliveryRadius: 25,
    whatsapp: phone, pay: PAYS.slice(0, 3 + Math.floor(rnd(seed + 'pay') * 3)),
    svc: SVCS[cats[0]].slice(0, 2 + Math.floor(rnd(seed + 'sv') * 3)),
    address: 'شارع ' + pick(seed + 'a', ['الجيش', 'النيل', 'الطيران', 'سعد زغلول', 'الثورة', 'المحطة', 'السلام', 'الجمهورية', 'الهرم', 'المشير']) +
      '، ' + area + '، ' + city,
    joined: 2019 + Math.floor(rnd(seed + 'j') * 6),
    views: 400 + Math.floor(rnd(seed + 'v') * 9000),
    clicksWa: 40 + Math.floor(rnd(seed + 'w') * 900),
    calls: 30 + Math.floor(rnd(seed + 'c') * 700),
    dirs: 20 + Math.floor(rnd(seed + 'd') * 500),
    weekly: Array.from({ length: 8 }, (_, i) => 60 + Math.floor(rnd(seed + 'wk' + i) * 340))
  };
  DB.stores.push(st);

  // منتجات المتجر: كل الأقسام التابعة له + عيّنة عشوائية ثابتة
  const mine = PRODUCTS.filter(p => st.cats.includes(p.cat));
  const ops = Math.max(4, Math.round((openH + closeH > 24 ? 23 : closeH) - openH));
  mine.forEach(p => {
    const rare = (CAT_COUNT[p.cat] || 1) <= 3;   // قسم نادر: نضمّن كل منتجاته
    const force = rare || (['ip15', 'sa56', 'jbl520', 'lenovo3', 'rtx4060', 'rn14'].includes(p.id) && si < 24);
    if (!force && rnd(id + p.id) > 0.62) return;
    const price = round(p.base * pf * (1 + (rnd(id + p.id + 'p') - 0.5) * 0.07), p.base > 3000 ? 50 : 5);
    const hasOff = rnd(id + p.id + 'o') < 0.3;
    const disc = 4 + Math.floor(rnd(id + p.id + 'dc') * 22);
    const oldPrice = hasOff ? round(price / (1 - disc / 100), p.base > 3000 ? 50 : 5) : null;
    const hrs = [0.5, 3, 9, 26, 74, 190, 400][Math.floor(rnd(id + p.id + 'u') * 7)];
    const L = {
      id: 'L' + id + p.id, storeId: id, productId: p.id, price,
      oldPrice, disc: hasOff ? disc : 0,
      inStock: rnd(id + p.id + 's') > 0.12,
      updatedH: hrs, brand: p.brand, cat: p.cat,
      warranty: p.cat === 'restaurant' || p.cat === 'supermarket' ? null : (rnd(id + p.id + 'wr') < 0.7 ? 'سنة' : '6 شهور'),
      offerEnds: hasOff ? Math.ceil(2 + rnd(id + p.id + 'oe') * 14) : null,
      updatedPrice: null // آخر تحديث ليدويًا بواسطة المتجر
    };
    DB.listings.push(L);
    (DB.byStore[id] = DB.byStore[id] || []).push(L);
    (DB.byProduct[p.id] = DB.byProduct[p.id] || []).push(L);
  });
  DB.byStore[id].sort((a, b) => a.price - b.price);

  // تقييمات تجريبية
  DB.reviews[id] = Array.from({ length: 2 + Math.floor(rnd(seed + 'rv') * 3) }, (_, i) => ({
    user: pick(seed + 'ru' + i, USER_NAMES),
    rating: clamp(Math.round(st.rating + (rnd(seed + 'rr' + i) - 0.5) * 2), 3, 5),
    txt: pick(seed + 'rt' + i, REVIEW_TXT),
    days: 3 + Math.floor(rnd(seed + 'rd' + i) * 90),
    scores: {
      خدمة: clamp(Math.round(st.rating + (rnd(seed + 's1' + i) - .5)), 3, 5),
      أسعار: clamp(Math.round(st.rating - .4 + (rnd(seed + 's2' + i) - .5)), 3, 5),
      تعامل: clamp(Math.round(st.rating + (rnd(seed + 's3' + i) - .5) * 1.2), 3, 5)
    }
  }));
});
DB.offers = DB.listings.filter(l => l.disc >= 10).sort((a, b) => b.disc - a.disc);

/* عروض وبلاغات وتنبيهات تجريبية */
DB.alerts = [
  { id: uid(), productId: 'ip15', storeName: 'أي متجر', target: 35000, created: 12, hits: 1 },
  { id: uid(), productId: 'jbl520', storeName: 'نيل إلكترونيكس', target: 2500, created: 40, hits: 0 }
];
DB.reports = [
  { id: 'R-1041', type: 'سعر غير صحيح', target: 'موبايل سنتر — iPhone 15', note: 'السعر في الفرع 37,500 وليس 36,200', at: 'منذ ساعتين', status: 'جديد' },
  { id: 'R-1040', type: 'المنتج غير متوفر', target: 'كمبيو ماركت — هارد SSD 1TB', note: 'قالوا خلص من التوكيل', at: 'منذ 5 ساعات', status: 'جديد' },
  { id: 'R-1039', type: 'بيانات المتجر غير صحيحة', target: 'فيوتشر تك — رقم الهاتف', note: 'الرقم مغلق', at: 'أمس', status: 'قيد المراجعة' },
  { id: 'R-1038', type: 'متجر مغلق في المواعيد', target: 'أدوات النصر', note: 'وصلت 7:30 مساءً والمحل مغلق', at: 'أمس', status: 'تم' },
  { id: 'R-1037', type: 'العرض انتهى', target: 'تكنو ستور مصر — راوتر TP-Link', note: 'العرض خلص بدري', at: 'منذ يومين', status: 'تم' },
  { id: 'R-1036', type: 'سعر غير صحيح', target: 'تريند شوز — حذاء Nike AF1', note: 'السعر أعلى من المعلن', at: 'منذ 3 أيام', status: 'مغلق' }
];
DB.trending = [
  { k: 'ايفون 15', c: 4820 }, { k: 'سماعة JBL', c: 3910 }, { k: 'لابتوب لينوفو', c: 2870 },
  { k: 'كارت شاشة 4060', c: 2440 }, { k: 'سامسونج A56', c: 2210 }, { k: 'قلاية هوائية', c: 1980 },
  { k: 'موبايل تحت 10000', c: 1760 }, { k: 'بلايستيشن 5', c: 1520 }
];
