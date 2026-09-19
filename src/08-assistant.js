/* مكوّنات المساعد: اقتراحات الميزانية + رحلة الشراء (مفصولة لتبسيط القوالب) */
function whatBlock(p, q, gift, max, affordable, beyond) {
  const minP = (prod) => { const ls = DB.byProduct[prod.id] || []; return ls.length ? Math.min.apply(null, ls.map(l => l.price)) : prod.base; };
  if (!(p && p.used)) {
    return `<div class="center" style="padding:26px 10px">
      <div style="font-size:38px">💬</div>
      <div class="b mt6">اكتب ميزانيتك واحتياجك</div>
      <p class="sm muted mt6">مثال: «عندي 10000 جنيه وعايز حاجة مفيدة للبيت» أو «عايز هدية بميزانية 1000 جنيه».</p>
      <div class="row center wrapx gap6 mt18" style="justify-content:center">
        ${['هدية بميزانية 1000 جنيه', 'حاجة مفيدة للبيت تحت 10000', 'موبايل تحت 15000'].map(t => `<button class="chip" data-asq="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
    </div>`;
  }
  const chips = `
    <div class="parsed mb14">
      ${p.cat ? `<span class="pf"><span class="lbl">الفئة</span><b>${p.cat.em} ${p.cat.ar}</b></span>` : `<span class="pf"><span class="lbl">الفئة</span><b>${gift ? '🎁 هدايا' : 'اقتراحات عامة'}</b></span>`}
      ${max ? `<span class="pf"><span class="lbl">الميزانية</span><b class="num">${egp(max)}</b></span>` : ''}
      ${p.brand ? `<span class="pf"><span class="lbl">الماركة</span><b>${esc(p.brand)}</b></span>` : ''}
      ${p.near ? `<span class="pf"><span class="lbl">المكان</span><b>قريب مني</b></span>` : ''}
      <span class="pf"><span class="lbl">الموقع</span><b>${esc(APP.loc.label)}</b></span>
    </div>`;

  if (!affordable.length) {
    return chips + `<div class="center" style="padding:22px"><div style="font-size:34px">💸</div>
      <div class="b mt6">لا يوجد منتج مسجّل داخل هذه الميزانية</div>
      <p class="sm muted mt6">جرّب زيادة الميزانية أو تغيير الفئة. كل الاقتراحات تأتي من المنتجات المسجّلة فعليًا في قاعدة بيانات المتاجر.</p>
      <div class="row center wrapx gap6 mt14" style="justify-content:center">
        ${beyond.slice(0, 4).map(x => {
      const ls = DB.byProduct[x.id] || [];
      const b = ls.map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId) })).sort((a, c) => a.price - c.price)[0];
      return `<button class="chip" data-asq="${esc('ميزانية ' + Math.ceil(b.price / 1000) * 1000)}">${x.em} ${esc(x.name)} — ${egp(b.price)}</button>`;
    }).join('')}
      </div></div>`;
  }

  const cards = affordable.slice(0, 9).map((x, i) => {
    const ls = (DB.byProduct[x.id] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)) })).sort((a, b) => a.price - b.price);
    const b = ls[0];
    return `<article class="card pad hv rel ${i === 0 ? 'best' : ''}">
      ${i === 0 ? '<span class="ribbon" style="background:var(--p)">أفضل قيمة للميزانية</span>' : ''}
      <div class="row"><div class="thumb lg">${x.em}</div>
        <div style="flex:1;min-width:0"><div class="b">${esc(x.name)}</div>
          <div class="tiny muted">${esc(x.brand)} · ${catOf(x.cat).ar}</div>
          <div class="priceline mt6">${priceHtml(b.price)}</div></div></div>
      <hr class="sep">
      <div class="meta"><span>🏪 ${esc(b.st.name)} ${b.st.verified ? '✔️' : ''}</span><span>📍 ${kmTxt(b.dist)}</span><span>${b.inStock ? '🟢 متوفر' : '🔴 غير متوفر'}</span></div>
      <div class="tiny muted mt6">متاح في ${ls.length} متجر · ${trustOf(b.updatedH).ar}</div>
      <div class="row gap6 mt10">
        <a class="btn primary sm2" href="#/product/${x.id}">قارن الأسعار</a>
        <button class="btn sm2" data-act="cart" data-prod="${x.id}">🛒 أضف للقائمة</button>
      </div></article>`;
  }).join('');

  const beyondSec = !beyond.length ? '' : `
    <div class="mt18">
      <div class="b mb10">⬆️ لو زوّدت الميزانية شوية (حتى ${egp(Math.round(max * 1.4))})</div>
      <div class="grid g-4">
        ${beyond.slice(0, 4).map(x => {
    const ls = DB.byProduct[x.id] || [];
    const b = ls.map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId) })).sort((a, c) => a.price - c.price)[0];
    if (!b) return '';
    return `<div class="card pad"><div class="row"><span style="font-size:22px">${x.em}</span>
          <div><div class="sm b">${esc(x.name)}</div>
          <div class="tiny muted">أرخص سعر ${egp(b.price)} — زيادة ${egp(b.price - max)} عن ميزانيتك · ${esc(b.st.name)}</div></div></div></div>`;
  }).join('')}
      </div>
    </div>`;

  return chips + `
    <div class="b mb10">✅ ${affordable.length} خيارًا داخل ميزانيتك (أرخص سعر مسجّل لكل منتج)</div>
    <div class="grid g-auto">${cards}</div>
    ${beyondSec}
    <div class="insight info mt14"><span class="ic">🧠</span><div class="sm">الترتيب هنا يوازن بين استخدام الميزانية، قرب المتجر، وحداثة السعر — ولا يعرض أي منتج أو سعر غير مسجّل من متجر حقيقي على المنصة.</div></div>`;
}

function bundlesBlock() {
  const cards = BUNDLES.map(bd => {
    const items = bd.items.map(pid => {
      const p = PRODUCTS.find(x => x.id === pid);
      const ls = (DB.byProduct[pid] || []).map(l => Object.assign({}, l, { st: DB.stores.find(s => s.id === l.storeId), dist: distKm(LOC, DB.stores.find(s => s.id === l.storeId)) })).sort((a, b) => a.price - b.price);
      return { p, b: ls[0], n: ls.length };
    }).filter(x => x.b && x.p);
    if (!items.length) return '';
    const total = items.reduce((a, x) => a + x.b.price, 0);
    const stores = new Set(items.map(x => x.b.st.id)).size;
    const maxD = Math.max.apply(null, items.map(x => x.b.dist));
    const single = DB.stores.map(s => {
      const have = items.filter(x => (DB.byStore[s.id] || []).some(l => l.productId === x.p.id));
      if (have.length !== items.length) return null;
      return { st: s, total: have.reduce((a, x) => a + (DB.byStore[s.id].find(l => l.productId === x.p.id).price), 0) };
    }).filter(Boolean).sort((a, b) => a.total - b.total)[0];
    return `<div class="card pad mb14">
      <div class="between wrapx">
        <div class="row"><span style="font-size:26px">${bd.em}</span>
          <div><div class="b" style="font-size:16px">${bd.name}</div><div class="tiny muted">${bd.note}</div></div></div>
        <div class="center"><div class="tiny muted">التكلفة التقريبية</div><div class="price big num">${egp(total)}</div>
          <div class="tiny muted">${stores} متجر · أبعد نقطة ${kmTxt(maxD)}</div></div>
      </div>
      <div class="tbl-wrap mt14"><table class="tbl">
        <thead><tr><th>المكوّن</th><th>أرخص سعر مسجّل</th><th>المتجر</th><th>المسافة</th><th>بدائل</th><th></th></tr></thead>
        <tbody>${items.map(x => `<tr>
          <td><div class="td-store"><span class="thumb" style="width:34px;height:34px;font-size:16px;border-radius:9px">${x.p.em}</span><span class="sm b">${esc(x.p.name)}</span></div></td>
          <td class="num b">${egp(x.b.price)}</td>
          <td class="sm"><a href="#/store/${x.b.st.id}">${esc(x.b.st.name)}</a> ${x.b.st.verified ? '✔️' : ''}</td>
          <td class="num sm">${kmTxt(x.b.dist)}</td>
          <td class="sm num">${x.n} متجر</td>
          <td><a class="btn sm2" href="#/product/${x.p.id}">استبدال</a></td></tr>`).join('')}
        </tbody></table></div>
      <div class="row wrapx gap6 mt10">
        <span class="badge ink">إجمالي ${egp(total)}</span>
        ${single ? `<span class="badge ok">متاح كامل في ${esc(single.st.name)} بإجمالي ${egp(single.total)}</span>`
        : '<span class="badge warn">لا يوجد متجر واحد فيه كل المكوّنات — رتّب زيارتك على أساس المسافات</span>'}
      </div>
    </div>`;
  }).join('');
  return cards + `<div class="insight info"><span class="ic">🧠</span><div class="sm">هذه التجميعات مبنية على المنتجات المسجّلة على المنصة. في النسخة النهائية يمكن للمستخدم تخصيص التجميعة، ونظام التوافق (مثل توافق المعالج مع اللوحة) يكون من قاعدة بيانات المواصفات.</div></div>`;
}
