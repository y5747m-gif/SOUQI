let fails = 0;
const check = (label, html) => {
  if (typeof html !== 'string') { console.log('❌ ' + label + ': ليست نصًا'); fails++; return; }
  const bad = [];
  if (/undefined/.test(html)) bad.push('undefined');
  if (/NaN/.test(html)) bad.push('NaN');
  if (/\[object Object\]/.test(html)) bad.push('[object Object]');
  if (bad.length) { fails++; console.log('❌ ' + label + ' → مشاكل: ' + bad.join(', ') + ' | طول ' + html.length);
    const m = html.match(/.{0,90}(undefined|NaN|\[object Object\]).{0,90}/); if (m) console.log('    ...' + m[0].replace(/\n/g,' ') + '...');
  } else console.log('✅ ' + label + ' (' + html.length + ' حرف)');
};

console.log('--- قاعدة البيانات ---');
console.log('متاجر: ' + DB.stores.length + ' | منتجات: ' + PRODUCTS.length + ' | أسعار: ' + DB.listings.length + ' | عروض: ' + DB.offers.length);
const noListing = PRODUCTS.filter(p => !(DB.byProduct[p.id]||[]).length).map(p=>p.id);
console.log('منتجات بدون أي سعر: ' + (noListing.length ? noListing.join(', ') : 'لا شيء'));
const storesNoProducts = DB.stores.filter(s => !(DB.byStore[s.id]||[]).length).map(s=>s.name);
console.log('متاجر بدون منتجات: ' + (storesNoProducts.length ? storesNoProducts.join(', ') : 'لا شيء'));

console.log('\n--- محرك البحث والفهم ---');
const queries = [
  'عايز أشتري iPhone 15 بأقل سعر في نطاق 5 كم',
  'عايز سماعة JBL تحت 3000 جنيه قريبة مني',
  'موبايل سامسونج أقل من 20000',
  'محل ملابس رجالي قريب مني',
  'أرخص لابتوب Lenovo',
  'محلات أحذية مفتوحة الآن',
  'أقرب محل يبيع كارت شاشة RTX',
  'لدي 15000 جنيه وأريد هاتفًا',
  'قلاية هوائية',
  'zzz شيء غير موجود'
];
queries.forEach(q => {
  const p = parseQuery(q);
  const r = searchListings(q, { center: LOC });
  const a = analyze(r.rows, p.product ? 'product' : 'store');
  console.log('• «' + q + '» → منتج: ' + (p.product ? p.product.name : '—') + ' | قسم: ' + (p.cat ? p.cat.ar : '—') + ' | سقف: ' + (p.max || '—') + ' | قريب: ' + (p.near?'نعم':'لا') + ' | نتائج: ' + r.rows.length + (a ? ' | أقل سعر: ' + a.mn + ' | أقرب: ' + a.near.dist.toFixed(2) + ' كم' : ''));
});

console.log('\n--- رسم الصفحات ---');
const pages = [
  ['الرئيسية','homePage','home',{}],
  ['نتائج بحث (منتج)','resultsPage','search',{q:'ايفون 15 تحت 40000 قريب مني'}],
  ['نتائج بحث (جدول)','resultsPage','search',{q:'سماعة JBL تحت 3000',view:'table'}],
  ['نتائج بحث (خريطة)','resultsPage','search',{q:'لابتوب لينوفو',view:'map'}],
  ['بحث فارغ','resultsPage','search',{q:'zzz غير موجود'}],
  ['قسم','resultsPage','search',{q:'',cat:'home'}],
  ['صفحة منتج','productPage','product',{id:'ip15'}],
  ['منتج: تاريخ السعر','productPage','product',{id:'sa56',tab:'hist'}],
  ['منتج: خريطة','productPage','product',{id:'jbl520',tab:'map'}],
  ['منتج: تفاصيل','productPage','product',{id:'rtx4060',tab:'info'}],
  ['صفحة متجر','storePage','store',{id:'nile'}],
  ['متجر: عروض','storePage','store',{id:'nile',tab:'offers'}],
  ['متجر: معلومات','storePage','store',{id:'techno',tab:'info'}],
  ['متجر: تقييمات','storePage','store',{id:'mobilec',tab:'reviews'}],
  ['متجر: خريطة','storePage','store',{id:'raed',tab:'map'}],
  ['العروض','offersPage','offers',{}],
  ['العروض: قسم','offersPage','offers',{cat:'electronics',min:'15'}],
  ['القريب','nearbyPage','nearby',{dist:'10'}],
  ['القريب: 500م','nearbyPage','nearby',{dist:'0.5'}],
  ['دليل المتاجر','storesPage','stores',{}],
  ['المفضلة: منتجات','favoritesPage','favorites',{tab:'products'}],
  ['المفضلة: متاجر','favoritesPage','favorites',{tab:'stores'}],
  ['المفضلة: تنبيهات','favoritesPage','favorites',{tab:'alerts'}],
  ['المفضلة: قائمة مشتريات','favoritesPage','favorites',{tab:'cart'}],
  ['حسابي (زائر)','accountPage','account',{}],
  ['لوحة المتجر','dashboardPage','dashboard',{store:'nile'}],
  ['لوحة المتجر: منتجات','dashboardPage','dashboard',{store:'nile',tab:'products'}],
  ['لوحة المتجر: عروض','dashboardPage','dashboard',{store:'nile',tab:'offers'}],
  ['لوحة المتجر: منافسون','dashboardPage','dashboard',{store:'techno',tab:'market'}],
  ['لوحة المتجر: باقة','dashboardPage','dashboard',{store:'nile',tab:'plan'}],
  ['الإدارة','adminPage','admin',{}],
  ['الإدارة: متاجر','adminPage','admin',{tab:'stores'}],
  ['الإدارة: بلاغات','adminPage','admin',{tab:'reports'}],
  ['الإدارة: منتجات','adminPage','admin',{tab:'products'}],
  ['الإدارة: إعلانات','adminPage','admin',{tab:'ads'}],
  ['إضافة متجر','addStorePage','addstore',{}],
  ['المساعد','assistantPage','assistant',{}],
  ['المساعد: ميزانية','assistantPage','assistant',{q:'عايز حاجة مفيدة للبيت تحت 10000'}],
  ['المساعد: هدية','assistantPage','assistant',{q:'هدية بميزانية 1000 جنيه'}],
  ['المساعد: تجميعة','assistantPage','assistant',{tab:'bundle'}]
];
pages.forEach(([label, fn, route, params]) => {
  APP.route = { name: route, p: params };
  try { check(label, eval(fn + '()')); }
  catch (e) { fails++; console.log('❌ ' + label + ' → خطأ: ' + e.message + '\n    ' + (e.stack||'').split('\n')[1]); }
});

console.log('\n--- مكونات مساعدة ---');
try { check('خريطة مصر', egyptMap({height:430})); } catch(e){ fails++; console.log('❌ خريطة مصر: '+e.message); }
try { const rows = searchListings('سماعة JBL', {center:LOC}).rows; check('خريطة الرادار', radialMap(rows, 10, 430)); } catch(e){ fails++; console.log('❌ الرادار: '+e.message); }
try { check('رسم تاريخ السعر', lineChart(priceHistory('ip15'), {h:200,id:'t'})); } catch(e){ fails++; console.log('❌ الرسم: '+e.message); }
try { check('دونات', donut(72,'اختبار')); } catch(e){ fails++; console.log('❌ الدونات: '+e.message); }
try { APP.fav = {stores:['nile'],products:['ip15']}; save('cart',['ip15','rtx4060']); check('قائمة المشتريات', cartView()); } catch(e){ fails++; console.log('❌ السلة: '+e.message); }

console.log('\n--- الموثوقية والتنبيهات ---');
console.log('تنبيهات متحققة: ' + alertsMatch().length + ' من ' + DB.alerts.length);
console.log('تاريخ أسعار ip15: ' + priceHistory('ip15').map(x=>x.v).join(' → '));

console.log('\n' + (fails ? '⚠️ عدد المشاكل: ' + fails : '🎉 كل الاختبارات نجحت بدون أخطاء'));
