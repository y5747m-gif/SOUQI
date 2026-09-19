/* محاكاة تشغيل الموقع: نظام التوجيه + كل الصفحات */
const routes = ['#/home','#/search?q=سماعة JBL تحت 3000 قريبة مني','#/search?cat=mobile','#/search?q=zzz',
 '#/product/ip15','#/product/sa56?tab=hist','#/product/jbl520?tab=map','#/product/rtx4060?tab=table',
 '#/store/nile','#/store/nile?tab=offers','#/store/raed?tab=map','#/store/mobilec?tab=reviews',
 '#/offers','#/nearby','#/nearby?dist=0.5','#/stores','#/favorites','#/favorites?tab=alerts','#/favorites?tab=cart',
 '#/account','#/dashboard','#/dashboard?tab=products','#/admin','#/admin?tab=reports','#/addstore','#/assistant',
 '#/assistant?tab=bundle','#/assistant?q=هدية بميزانية 1000 جنيه',
 '#/directory','#/directory?city=القاهرة&status=verified','#/directory?q=نيل',
 '#/addstore?step=1','#/addstore?step=2','#/addstore?step=3','#/addstore?step=4','#/addstore?step=5','#/addstore?step=6','#/addstore?step=7','#/addstore?step=8',
 '#/addstore?step=1&edit=nile','#/addstore?step=6&edit=techno','#/addstore?step=8&edit=nile'];
let ok=0, bad=0;
routes.forEach(h => {
  global.location.hash = h;
  window.location.hash = h;
  try {
    render();
    const html = global.document.querySelector('#app').innerHTML;
    ok++;
    if (!html || html.length < 400) { bad++; console.log('⚠️ ' + h + ' → محتوى قصير (' + html.length + ')'); }
  } catch (e) { bad++; console.log('❌ ' + h + ' → ' + e.message + ' | ' + (e.stack||'').split('\n')[1]); }
});
/* اختبار التفاعلات الأساسية */
try {
  global.location.hash = '#/search?q=ايفون 15';
  render();
  parseQuery('سماعة jbl تحت 3000');
  scoreRow({price:100,dist:1,disc:10,updatedH:5,inStock:true,st:{rating:4.5}}, 100, 200);
  priceHistory('ip15'); alertsMatch(); daySeries('x',100,8,.05);
  isOpen(DB.stores[0]); hoursTxt(DB.stores[0]); trustOf(3); etaMin(2.5);
  console.log('✅ الدوال المساعدة تعمل');
} catch(e) { bad++; console.log('❌ دوال مساعدة: ' + e.message); }
console.log('\nنتيجة التشغيل: ' + ok + ' صفحة ناجحة من ' + routes.length + (bad ? ' | مشاكل: ' + bad : ' | بدون مشاكل 🎉'));

if (bad) process.exitCode = 1;
