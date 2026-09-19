/* =========================================================================
   الجزء 4: الخرائط والرسوم البيانية (SVG خالص — بدون مكتبات خارجية)
   ========================================================================= */

/* إسقاط بسيط: خط الطول على المحور الأفقي وخط العرض رأسيًا بنسبة صحيحة لمصر */
const PX = (lon) => 40 + (lon - 24.5) * 56;
const PY = (lat) => 34 + (31.6 - lat) * 62.8;
const EG_VIEW = '0 0 780 700';

/* رسم تقريبي لحدود مصر + النيل */
const EG_COAST = [
  [31.55, 25.15], [31.45, 26.10], [31.35, 27.25], [31.10, 28.10], [30.95, 29.00], [31.10, 29.75],
  [31.25, 30.00], [31.32, 30.06], [31.35, 30.30], [31.45, 31.10], [31.52, 31.85], [31.60, 32.25],
  [31.25, 32.85], [31.20, 33.45], [31.15, 34.25], [31.30, 34.55], [30.55, 34.62], [29.50, 34.90],
  [29.20, 34.75], [28.60, 34.55], [28.10, 34.42], [27.72, 34.25], [28.20, 33.60], [28.70, 33.30],
  [29.30, 32.95], [29.85, 32.60], [29.97, 32.55], [29.30, 32.75], [28.50, 33.20], [27.25, 33.83],
  [26.20, 34.02], [25.25, 34.30], [24.30, 35.05], [23.10, 35.85], [22.70, 36.20], [22.20, 36.85],
  [22.00, 36.90], [22.00, 25.00], [25.00, 25.00], [29.00, 25.00]
];
const EG_NILE = [[24.09, 32.90], [24.50, 32.85], [25.30, 32.55], [25.69, 32.64], [26.55, 31.70], [27.18, 31.18], [28.10, 30.75], [29.09, 30.93], [30.01, 31.23], [30.13, 31.24]];
const EG_BRANCHES = [
  [[30.13, 31.24], [30.55, 31.05], [31.00, 30.60], [31.42, 30.40]],
  [[30.13, 31.24], [30.55, 31.30], [31.00, 31.45], [31.50, 31.72]]
];
const EG_CITY_LABELS = [
  ['الإسكندرية', 31.32, 30.06], ['مرسى مطروح', 31.35, 27.25], ['بورسعيد', 31.60, 32.25], ['دمياط', 31.52, 31.85],
  ['القاهرة', 30.05, 31.24], ['الجيزة', 29.99, 31.13], ['السويس', 29.97, 32.55], ['المنصورة', 31.04, 31.38],
  ['طنطا', 30.79, 31.00], ['الزقازيق', 30.58, 31.50], ['الإسماعيلية', 30.60, 32.27], ['وادي النطرون', 30.56, 30.40],
  ['الفيوم', 29.31, 30.84], ['بني سويف', 29.09, 30.93], ['المنيا', 28.10, 30.75], ['أسيوط', 27.18, 31.18],
  ['سوهاج', 26.55, 31.70], ['الأقصر', 25.69, 32.64], ['أسوان', 24.09, 32.90], ['الغردقة', 27.25, 33.83],
  ['شرم الشيخ', 27.91, 34.33], ['العريش', 31.13, 33.80], ['الخارجة', 25.44, 30.55], ['الداخلة', 25.50, 28.98]
];

const line = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + PX(p[1]).toFixed(1) + ' ' + PY(p[0]).toFixed(1)).join(' ');
const pinColor = (st) => st.sponsored ? '#B58900' : (st.verified ? '#800020' : '#4B4647');

/* ---------- خريطة مصر التفاعلية ---------- */
function egyptMap(o) {
  o = o || {};
  const h = o.height || 430;
  return `
  <div class="mapbox" id="egWrap" style="height:${h}px">
    <svg class="map-svg" id="egMap" viewBox="${EG_VIEW}" preserveAspectRatio="xMidYMid meet" style="height:${h}px">
      <defs>
        <linearGradient id="gLand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#FCFBFB"/><stop offset="1" stop-color="#F3F1F1"/>
        </linearGradient>
        <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-opacity=".35"/>
        </filter>
      </defs>
      <g id="egLayer">
        <rect x="0" y="0" width="780" height="700" fill="#EDEBEB"/>
        <path class="eg-land" fill="url(#gLand)" d="${line(EG_COAST)} Z"/>
        <path class="nile" d="${line(EG_NILE)}"/>
        ${EG_BRANCHES.map(b => `<path class="nile" d="${line(b)}"/>`).join('')}
        ${EG_CITY_LABELS.filter(c => ['الإسكندرية', 'القاهرة', 'المنصورة', 'أسيوط', 'الأقصر', 'أسوان', 'الغردقة', 'شرم الشيخ', 'مرسى مطروح', 'الفيوم', 'بورسعيد', 'الإسماعيلية'].includes(c[0]))
      .map(([n, la, lo]) => `<text class="ring-lbl" x="${PX(lo) + 6}" y="${PY(la) + 3}" font-size="10.5" fill="#8D8888">${n}</text>`).join('')}
        <g id="egPins">
          ${DB.stores.map(st => {
        const x = PX(st.lon), y = PY(st.lat);
        const col = pinColor(st);
        return `<g class="pin" data-store="${st.id}" data-x="${x}" data-y="${y}">
              <circle cx="${x}" cy="${y}" r="9" fill="${col}" opacity=".16"/>
              <circle cx="${x}" cy="${y}" r="5.4" fill="${col}" stroke="#fff" stroke-width="1.8" filter="url(#pinShadow)"/>
              ${st.sponsored ? `<text x="${x}" y="${y + 3.4}" font-size="7" text-anchor="middle" fill="#fff" font-weight="800">★</text>` : ''}
            </g>`;
      }).join('')}
          <g id="egUser">
            <circle cx="${PX(APP.loc.lon)}" cy="${PY(APP.loc.lat)}" r="13" fill="#4B4647" opacity=".16"/>
            <circle cx="${PX(APP.loc.lon)}" cy="${PY(APP.loc.lat)}" r="6" fill="#4B4647" stroke="#fff" stroke-width="2.2"/>
            <text x="${PX(APP.loc.lon)}" y="${PY(APP.loc.lat) + 4}" font-size="6.5" text-anchor="middle" fill="#fff" font-weight="800">أنت</text>
          </g>
        </g>
      </g>
    </svg>
    <div class="map-tools">
      <button id="egIn" title="تكبير">＋</button>
      <button id="egOut" title="تصغير">－</button>
      <button id="egReset" title="إعادة الضبط">⟳</button>
      <button id="egFindMe" title="موقعي">📍</button>
    </div>
    <div class="map-legend">
      <span class="row gap6"><i class="dot" style="background:#800020"></i> متجر موثق</span>
      <span class="row gap6"><i class="dot" style="background:#4B4647"></i> متجر مسجّل</span>
      <span class="row gap6"><i class="dot" style="background:#B58900"></i> متجر ممول (إعلان)</span>
      <span class="row gap6"><i class="dot" style="background:#4B4647"></i> موقعك الحالي</span>
    </div>
    <div id="egPop"></div>
  </div>`;
}

function drawEgyptMap() {
  const svg = $('#egMap'); if (!svg) return;
  const wrap = $('#egWrap'), pop = $('#egPop');
  const base = { x: 0, y: 0, w: 780, h: 700 };
  let vb = Object.assign({}, base);
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoom = (f, cx, cy) => {
    const nw = clamp(vb.w * f, 140, 900), nh = nw * (base.h / base.w);
    const px = cx == null ? vb.x + vb.w / 2 : cx, py = cy == null ? vb.y + vb.h / 2 : cy;
    vb.x = clamp(px - (px - vb.x) * (nw / vb.w), -40, base.w - nw + 40);
    vb.y = clamp(py - (py - vb.y) * (nh / vb.h), -40, base.h - nh + 40);
    vb.w = nw; vb.h = nh; apply();
  };
  $('#egIn').onclick = () => zoom(0.75);
  $('#egOut').onclick = () => zoom(1.33);
  $('#egReset').onclick = () => { vb = Object.assign({}, base); apply(); hide(); };
  $('#egFindMe').onclick = () => { zoomTo(APP.loc.lon, APP.loc.lat, 0.34); };
  function zoomTo(lon, lat, w) {
    vb.w = base.w * w; vb.h = base.h * w;
    vb.x = clamp(PX(lon) - vb.w / 2, -40, base.w - vb.w + 40);
    vb.y = clamp(PY(lat) - vb.h / 2, -40, base.h - vb.h + 40);
    apply();
  }
  // سحب
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.target.closest('.pin')) return;
    drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    vb.x = clamp(drag.vx - (e.clientX - drag.x) * vb.w / r.width, -40, base.w - vb.w + 40);
    vb.y = clamp(drag.vy - (e.clientY - drag.y) * vb.h / r.height, -40, base.h - vb.h + 40);
    apply();
  });
  svg.addEventListener('pointerup', () => { drag = null; });

  function hide() { pop.innerHTML = ''; }
  wrap.querySelectorAll('.pin').forEach(g => {
    g.onclick = (e) => {
      e.stopPropagation();
      const st = DB.stores.find(s => s.id === g.dataset.store);
      const r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2 - wr.left, cy = r.top - wr.top;
      pop.innerHTML = `<div class="map-pop" style="inset-inline-start:auto;left:${clamp(cx - 115, 8, wr.width - 250)}px;top:${clamp(cy - (cy > 210 ? 215 : -14), 8, wr.height - 40)}px">${storePop(st)}</div>`;
      pop.querySelectorAll('[data-act]').forEach(btn => {
        btn.onclick = () => { if (window.__act) window.__act(btn); };
      });
      bindGlobal();
    };
  });
  svg.addEventListener('click', e => { if (!e.target.closest('.pin')) hide(); });
  drawEgyptMap.zoomTo = zoomTo;
}
function storePop(st) {
  const rows = DB.byStore[st.id];
  const min = rows.length ? Math.min.apply(null, rows.map(l => l.price)) : 0;
  const d = distKm(LOC, st);
  const open = isOpen(st);
  return `
    <div class="b" style="font-size:14px">${esc(st.name)} ${st.verified ? '<span class="vf">✔️</span>' : ''}</div>
    <div class="tiny muted mt6">${catOf(st.cats[0]).ar} · ${esc(st.area)} — ${esc(st.city)}</div>
    <div class="row wrapx gap6 mt10">
      <span class="badge p"><span class="stars num">${st.rating.toFixed(1)}</span> ★</span>
      <span class="badge ink">📍 ${kmTxt(d)}</span>
      <span class="badge ${open ? 'ok' : 'bad'}">${open ? 'مفتوح الآن' : 'مغلق'}</span>
    </div>
    <div class="tiny mt10">💰 يبدأ السعر من <b class="num">${egp(min)}</b> · ${rows.length} منتجًا</div>
    <div class="row gap6 mt10">
      <a class="btn primary sm2" href="#/store/${st.id}">عرض المتجر</a>
      <button class="btn sm2" data-act="dirs" data-store="${st.id}">🧭 الاتجاهات</button>
    </div>`;
}

/* ---------- خريطة الرادار: المتاجر القريبة داخل نطاق ---------- */
function radialMap(rows, radiusKm, height) {
  const h = height || 430, C = 390, R = 320;
  // ترتيب الزوايا بتباعد ذهبي لتقليل التزاحم
  const sorted = rows.slice().sort((a, b) => a.dist - b.dist);
  const pts = sorted.map((r, i) => {
    const ang = ((i * 137.508) + hash(r.storeId || r.st.id) % 40) * Math.PI / 180;
    const rr = clamp(r.dist / radiusKm, 0.06, 1) * (R - 26);
    return { r, x: C + rr * Math.sin(ang), y: C - rr * Math.cos(ang) };
  });
  const rings = [0.25, 0.5, 0.75, 1];
  const best = rows.length ? Math.min.apply(null, rows.map(r => r.price)) : 0;
  const nearest = Math.min.apply(null, rows.map(r => r.dist).concat([99]));
  return `
  <div class="mapbox" id="radWrap" style="height:${h}px">
    <svg class="map-svg" viewBox="0 0 780 780" preserveAspectRatio="xMidYMid meet" style="height:${h}px">
      <defs>
        <radialGradient id="gRad" cx="50%" cy="50%" r="50%">
          <stop offset="0" stop-color="#FCFBFB"/><stop offset="1" stop-color="#F3F1F1"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="780" height="780" fill="#F7F6F6" rx="14"/>
      <circle cx="${C}" cy="${C}" r="${R}" fill="url(#gRad)"/>
      ${rings.map(f => `
        <circle cx="${C}" cy="${C}" r="${(R * f).toFixed(1)}" fill="none" stroke="#DAD6D6" stroke-width="${f === 1 ? 1.6 : 1}" ${f < 1 ? 'stroke-dasharray="5 7"' : ''}/>
        <text class="ring-lbl" x="${C + 6}" y="${(C - R * f + 13).toFixed(1)}">${kmTxt(radiusKm * f)}</text>`).join('')}
      <line x1="${C}" y1="${C - R}" x2="${C}" y2="${C + R}" stroke="#EDEBEB" stroke-width="1"/>
      <line x1="${C - R}" y1="${C}" x2="${C + R}" y2="${C}" stroke="#EDEBEB" stroke-width="1"/>
      <g>
        <circle cx="${C}" cy="${C}" r="16" fill="#4B4647" opacity=".14"/>
        <circle cx="${C}" cy="${C}" r="8" fill="#4B4647" stroke="#fff" stroke-width="2.4"/>
        <text x="${C}" y="${C + 30}" text-anchor="middle" class="ring-lbl" font-size="11" fill="#4B4647" font-weight="800">موقعك</text>
      </g>
      ${pts.map(p => {
    const st = p.r.st, isBest = p.r.price === best, isNear = p.r.dist === nearest;
    const col = isBest ? '#800020' : isNear ? '#B58900' : (st.verified ? '#4B4647' : '#8D8888');
    const em = catOf(st.cats[0]).em;
    return `<g class="pin" data-store="${st.id}" data-x="${p.x}" data-y="${p.y}">
          <circle cx="${p.x}" cy="${p.y}" r="17" fill="#fff" stroke="${col}" stroke-width="3" filter="url(#pinShadow)"/>
          <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-size="15">${em}</text>
          ${isBest ? `<text x="${p.x}" y="${p.y - 22}" text-anchor="middle" font-size="10" font-weight="800" fill="#63001A" style="paint-order:stroke;stroke:#fff;stroke-width:3">أرخص</text>` : ''}
          ${isNear && !isBest ? `<text x="${p.x}" y="${p.y - 22}" text-anchor="middle" font-size="10" font-weight="800" fill="#8A6600" style="paint-order:stroke;stroke:#fff;stroke-width:3">أقرب</text>` : ''}
        </g>`;
  }).join('')}
    </svg>
    <div class="map-tools"><button id="radIn">＋</button><button id="radOut">－</button><button id="radReset">⟳</button></div>
    <div class="map-legend">
      <span class="row gap6"><i class="dot" style="background:#800020"></i> أرخص سعر في النطاق</span>
      <span class="row gap6"><i class="dot" style="background:#B58900"></i> أقرب متجر</span>
      <span class="row gap6"><i class="dot" style="background:#4B4647"></i> متجر موثق</span>
    </div>
    <div id="radPop"></div>
  </div>`;
}
function bindRadialMap() {
  if (!$('#radIn')) return;   // لا توجد خريطة رادار في هذه الصفحة
  const svg = $('#radMap2') || $('.mapbox#radWrap svg'); if (!svg) return;
  const wrap = $('#radWrap'), pop = $('#radPop');
  const base = '0 0 780 780';
  let vb = { x: 0, y: 0, w: 780, h: 780 };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoom = (f) => { const nw = clamp(vb.w * f, 200, 900); const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2; vb.w = nw; vb.h = nw; vb.x = cx - nw / 2; vb.y = cy - nw / 2; apply(); };
  $('#radIn').onclick = () => zoom(0.78);
  $('#radOut').onclick = () => zoom(1.28);
  $('#radReset').onclick = () => { svg.setAttribute('viewBox', base); pop.innerHTML = ''; };
  let drag = null;
  svg.addEventListener('pointerdown', e => { if (e.target.closest('.pin')) return; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y }; });
  svg.addEventListener('pointermove', e => { if (!drag) return; const r = svg.getBoundingClientRect(); vb.x = drag.vx - (e.clientX - drag.x) * vb.w / r.width; vb.y = drag.vy - (e.clientY - drag.y) * vb.h / r.height; apply(); });
  svg.addEventListener('pointerup', () => drag = null);
  wrap.querySelectorAll('.pin').forEach(g => {
    g.onclick = (e) => {
      e.stopPropagation();
      const st = DB.stores.find(s => s.id === g.dataset.store);
      const r = g.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      const cx = r.left + r.width / 2 - wr.left, cy = r.top - wr.top;
      pop.innerHTML = `<div class="map-pop" style="inset-inline-start:auto;left:${clamp(cx - 115, 8, wr.width - 250)}px;top:${clamp(cy - 200, 8, wr.height - 40)}px">${storePop(st)}</div>`;
      bindGlobal();
    };
  });
}

/* ---------- رسوم بيانية ---------- */
function lineChart(points, o) {
  o = o || {};
  const W = 640, H = o.h || 200, pad = { t: 16, r: 14, b: 26, l: 52 };
  const vals = points.map(p => p.v);
  const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
  const lo = mn - (mx - mn) * .18, hi = mx + (mx - mn) * .18 || 1;
  const X = i => pad.l + (W - pad.l - pad.r) * (points.length <= 1 ? .5 : i / (points.length - 1));
  const Y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const d = points.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const area = d + ` L ${X(points.length - 1)} ${H - pad.b} L ${X(0)} ${H - pad.b} Z`;
  const ticks = [0, .25, .5, .75, 1].map(f => Math.round(lo + (hi - lo) * f));
  const last = points[points.length - 1].v, first = points[0].v;
  const up = last >= first;
  return `
  <svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs><linearGradient id="gc${o.id || 'x'}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${up ? '#B58900' : '#800020'}" stop-opacity=".26"/>
      <stop offset="1" stop-color="${up ? '#B58900' : '#800020'}" stop-opacity="0"/>
    </linearGradient></defs>
    ${ticks.map(t => `<g><line x1="${pad.l}" y1="${Y(t).toFixed(1)}" x2="${W - pad.r}" y2="${Y(t).toFixed(1)}" stroke="#F3F1F1"/><text x="${pad.l - 8}" y="${(Y(t) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#777272" class="num">${nf(t)}</text></g>`).join('')}
    <path d="${area}" fill="url(#gc${o.id || 'x'})"/>
    <path d="${d}" fill="none" stroke="${up ? '#C08A00' : '#800020'}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${points.map((p, i) => `<g><circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${i === points.length - 1 ? 5 : 3.4}" fill="#fff" stroke="${up ? '#C08A00' : '#800020'}" stroke-width="2.4"><title>${p.m}: ${nf(p.v)} ج.م</title></circle>
      ${i % 2 === 0 || i === points.length - 1 ? `<text x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="10" fill="#777272">${p.m}</text>` : ''}</g>`).join('')}
  </svg>`;
}
function barChart(labels, values, o) {
  o = o || {};
  const mx = Math.max.apply(null, values) || 1;
  return `<div class="bars">${values.map((v, i) => `<i style="height:${Math.max(6, v / mx * 100)}%" title="${labels[i]}: ${nf(v)}"><span>${labels[i]}</span></i>`).join('')}</div>`;
}
function donut(p, label, color) {
  const R = 42, C = 2 * Math.PI * R, off = C * (1 - p / 100);
  return `<div class="row gap14">
    <svg viewBox="0 0 110 110" style="width:104px;height:104px;flex:0 0 auto">
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="#EDEBEB" stroke-width="12"/>
      <circle cx="55" cy="55" r="${R}" fill="none" stroke="${color || '#800020'}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 55 55)"/>
      <text x="55" y="60" text-anchor="middle" font-size="20" font-weight="800" fill="#2B2728">${Math.round(p)}%</text>
    </svg>
    <div><div class="b">${label}</div><div class="tiny muted">محسوبة من عدد الأسعار ذات آخر تحديث معروف داخل القاعدة.</div></div>
  </div>`;
}
