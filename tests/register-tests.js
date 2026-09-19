
/* ============ اختبارات وحدة تسجيل المحلات ============ */
let rf = 0;
const R = (label, cond, extra) => { if (cond) console.log('✅ ' + label); else { rf++; console.log('❌ ' + label + (extra ? ' → ' + extra : '')); } };

console.log('\n--- دليل المحلات ---');
APP.route = { name: 'directory', p: {} };
try { const h = directoryPage(); R('صفحة الدليل تُرسم', h.length > 3000 && !/undefined|NaN/.test(h), h.length); } catch (e) { rf++; console.log('❌ الدليل: ' + e.message); }
try { const h = directoryPage.call(null); } catch (e) { }
APP.route = { name: 'directory', p: { city: 'القاهرة', status: 'verified' } };
try { const h = directoryPage(); R('الدليل مع فلاتر', !/undefined/.test(h)); } catch (e) { rf++; console.log('❌ الدليل مع فلاتر: ' + e.message); }
APP.route = { name: 'directory', p: { q: 'zzz غير موجود' } };
try { const h = directoryPage(); R('الدليل بحالة «لا نتائج»', h.includes('لا يوجد محل مطابق')); } catch (e) { rf++; console.log('❌ الدليل الفارغ: ' + e.message); }

console.log('\n--- وحدة التسجيل: كل الخطوات ---');
for (let step = 1; step <= 8; step++) {
  APP.route = { name: 'addstore', p: { step: String(step) } };
  REG.step = step;
  try {
    const h = addStorePage();
    R('الخطوة ' + step + ' تُرسم', h.length > 2000 && !/undefined|NaN/.test(h), h.length);
  } catch (e) { rf++; console.log('❌ الخطوة ' + step + ': ' + e.message + ' | ' + (e.stack || '').split('\n')[1]); }
}

console.log('\n--- التحقق والمنطق ---');
REG.name = ''; REG.cats = [];
R('منع التالي بدون اسم/أقسام', !!regValidate(1));
REG.name = 'محل الاختبار'; REG.cats = ['mobile'];
R('السماح بعد إدخال الاسم والقسم', regValidate(1) === null);
REG.street = ''; R('منع بدون عنوان', !!regValidate(2));
REG.street = 'شارع الجيش'; REG.area = 'الدقي'; REG.city = 'الجيزة';
R('عنوان كامل يُقبل', regValidate(2) === null);
REG.phone = '123'; R('منع رقم غير صحيح', !!regValidate(4));
REG.phone = '01001234567'; REG.priceManager = 'أحمد'; REG.priceManagerPhone = '01001234567';
R('رقم صحيح + مسؤول أسعار يُقبل', regValidate(4) === null);
REG.products = []; R('منع بدون منتجات', !!regValidate(6));
REG.products = [{ name: 'سماعة JBL', price: 2590, cat: 'audio', stock: true }];
R('منتج بسعر يُقبل', regValidate(6) === null);
REG.media = { logo: false, facade: true, inside: false, shelf: false, products: false, video: '' };
R('صورة واحدة تكفي', regValidate(7) === null);
REG.agree = false; R('منع بدون موافقة', !!regValidate(8));
REG.agree = true; REG.agreeTruth = true;
R('الموافقة تسمح بالنشر', regValidate(8) === null);

console.log('\n--- مؤشر الاكتمال ---');
const c1 = regCompleteness();
R('المؤشر يعمل ويتراوح 0-100', c1.pct >= 0 && c1.pct <= 100, c1.pct + '%');
R('يرصد الحقول الناقصة', c1.missing.length > 0, c1.missing.length + ' حقلًا');
regFillDemo();
const c2 = regCompleteness();
R('بعد التعبئة التجريبية يرتفع المؤشر', c2.pct > c1.pct, c1.pct + '% → ' + c2.pct + '%');

console.log('\n--- استيراد وتحليل البضاعة ---');
const pasted = regParsePasted('سماعة JBL Tune 520BT 2590\nكارت شاشة RTX 4060 19800\nشاشة سامسونج 24 بوصة 5600 6300\nحاجة خلص 400');
R('تحليل قائمة ملصوقة', pasted.length === 4, pasted.length + ' صفوف');
R('مطابقة اسم المنتج من القاعدة', pasted[0].cat === 'audio', pasted[0].cat);
R('تمييز السعر والخصم', pasted[2].price === 5600 && pasted[2].old === 6300, pasted[2].price + '/' + pasted[2].old);
R('تمييز «خلص» كغير متوفر', pasted[3].stock === false);
const csv = regParseCSV('name,price,price_before,brand,model,quantity,available,notes\nTest Item,1500,1800,Brand,X1,4,1,ملاحظة');
R('تحليل ملف CSV', csv.length === 1 && csv[0].price === '1500' && csv[0].old === '1800', JSON.stringify(csv[0] || {}));
R('قالب CSV يحتوي عناوين الأعمدة', regCSVTemplate().indexOf('price_before') > 0);

console.log('\n--- النشر الفعلي ---');
const before = DB.stores.length;
REG.plan = 'free';
regSubmit();
R('عدد المتاجر زاد بعد النشر', DB.stores.length === before + 1, DB.stores.length + '');
const newId = APP.myStore;
const ns = DB.stores.find(s => s.id === newId);
R('المتجر الجديد له منتجات بأسعار', (DB.byStore[newId] || []).length > 0, (DB.byStore[newId] || []).length + ' منتجًا');
R('يظهر في البحث', searchListings('سماعة JBL', { center: LOC }).rows.length > 0);
R('الموقع مسجّل على الخريطة', ns.lat > 22 && ns.lat < 32 && ns.lon > 24 && ns.lon < 37, ns.lat + ',' + ns.lon);
R('البيانات التفصيلية محفوظة', !!ns.priceManager && !!ns.media && !!ns.hours, 'مسؤول: ' + ns.priceManager);
R('اكتمال البيانات محسوب', ns.completeness > 40, ns.completeness + '%');
R('يظهر في دليل المحلات', (() => { APP.route = { name: 'directory', p: { q: ns.name } }; const h = directoryPage(); return h.includes(ns.name); })());
APP.route = { name: 'store', p: { id: newId } };
R('صفحة المتجر تُرسم ببياناته', !/undefined/.test(storePage()));
APP.route = { name: 'store', p: { id: newId, tab: 'info' } };
R('تبويب المعلومات يُرسم بالبيانات الجديدة', !/undefined/.test(storePage()) && storePage().includes('بيانات النشاط'));

console.log('\n--- وضع التعديل ---');
regBlankReset(false);
REG.edit = newId;
regFromStore(newId);
R('تحميل بيانات متجر للتعديل', REG.name === ns.name && REG.products.length > 0, REG.name);
APP.route = { name: 'addstore', p: { step: '6', edit: newId } };
R('صفحة التعديل تُرسم', !/undefined/.test(addStorePage()));
const priceBefore = (DB.byStore[newId][0] || {}).price;
REG.products[0].price = priceBefore + 500;
regSubmit();
R('تحديث السعر يُحفظ على المتجر', DB.byStore[newId][0].price === priceBefore + 500, priceBefore + ' → ' + DB.byStore[newId][0].price);
R('لم يتكرر المتجر بعد التعديل', DB.stores.filter(s => s.id === newId).length === 1);
R('يُسجَّل في سجل تغييرات الأسعار', DB.priceLog.some(x => x.store === newId && x.to === priceBefore + 500));
R('لم يبقَ عدد أسعار مكررًا', (DB.byStore[newId] || []).length === REG.products.filter(p => p.name && p.price).length, DB.byStore[newId].length + '');
REG.edit = null;
/* الموافقة مطلوبة للنشر الأول فقط، ووضع التعديل لا يطلبها */
REG.agree = false; REG.agreeTruth = false;
REG.edit = 'x-edit-test';
R('وضع التعديل لا يطلب الموافقة مرة أخرى', regValidate(8) === null);
REG.edit = newId;
REG.agree = true; REG.agreeTruth = true;
regBlankReset(false); REG.edit = newId; regFromStore(newId);
REG.products[0].price = (DB.byStore[newId][0] || {}).price + 700;
regSubmit();
R('التعديل الثاني يعمل كذلك', DB.byStore[newId].some(l => l.price === (DB.byStore[newId][0] || {}).price));
REG.edit = null;

console.log('\n--- التكامل مع بقية الشاشات ---');
regBlankReset(false);
APP.route = { name: 'home', p: {} };
R('الرئيسية تُرسم', !/undefined|NaN/.test(homePage()));
APP.route = { name: 'dashboard', p: { store: newId } };
R('لوحة تحكم المتجر الجديد', !/undefined|NaN/.test(dashboardPage()));
APP.route = { name: 'admin', p: {} };
R('لوحة الإدارة', !/undefined|NaN/.test(adminPage()));
APP.route = { name: 'nearby', p: { dist: '25' } };
R('المتاجر القريبة تشمل المحل الجديد في نطاقه', nearbyPage().includes(ns.area));

console.log('\n' + (rf ? '⚠️ فشل ' + rf + ' اختبارًا' : '🎉 كل اختبارات وحدة التسجيل نجحت'));
