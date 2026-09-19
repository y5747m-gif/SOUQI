/* =========================================================================
   الجزء 0: أيقونة العلامة — حقيبة تسوّق مصرية (هرم + نيل + شمس + حقيبة)
   أيقونة SVG واحدة تُستخدم: الشعار في الهيدر والفوتر + أيقونة التبويب (favicon)
   ========================================================================= */

/* المصدر الواحد للأيقونة — علامات __G1__..__G4__ تُستبدل بمعرّفات فريدة
   حتى لا تتعارض تدرجات الألوان عند تكرار الأيقونة في نفس الصفحة. */
const SOQ_ICON_SRC = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="__G1__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E0024"/><stop offset="1" stop-color="#480012"/></linearGradient>
<linearGradient id="__G2__" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F7E8ED"/></linearGradient>
<linearGradient id="__G3__" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD9A0"/><stop offset="1" stop-color="#EDB168"/></linearGradient>
<clipPath id="__G4__"><rect x="13" y="26.6" width="38" height="28.4" rx="6"/></clipPath>
</defs>
<rect width="64" height="64" rx="15" fill="url(#__G1__)"/>
<circle cx="49.6" cy="15.4" r="6.6" fill="url(#__G3__)"/>
<path d="M24.4 28.8c0-9.8 15.2-9.8 15.2 0" fill="none" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>
<rect x="13" y="26.6" width="38" height="28.4" rx="6" fill="url(#__G2__)"/>
<g clip-path="url(#__G4__)">
<circle cx="39.4" cy="38.2" r="7.6" fill="#F6C4D3"/>
<path d="M28.6 30.4 L20.2 46.6 H28.6 Z" fill="#7A0020"/>
<path d="M28.6 30.4 L37 46.6 H28.6 Z" fill="#A8002C"/>
<path d="M14.4 50.4q3.6-2.6 7.2 0t7.2 0 7.2 0 7.2 0" fill="none" stroke="#800020" stroke-width="2.3" stroke-linecap="round" opacity=".92"/>
<path d="M19.2 54.4q3.6-2.4 7.2 0t7.2 0 7.2 0" fill="none" stroke="#800020" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
</g>
</svg>`;

let SOQ_N = 0;
/* أيقونة العلامة بحجم مرن — op: {radius:true} لإزالة الاستدارة الداخلية */
function SOQ_ICON(size, op) {
  op = op || {};
  const n = ++SOQ_N;
  const svg = SOQ_ICON_SRC
    .replace(/__G1__/g, 'sb' + n).replace(/__G2__/g, 'sw' + n)
    .replace(/__G3__/g, 'ss' + n).replace(/__G4__/g, 'sc' + n);
  const s = size || 40;
  return `<svg class="soq-icon" width="${s}" height="${s}" viewBox="0 0 64 64" role="img" aria-label="سوقي — تسوّق في مصر" style="display:block;border-radius:${op.square ? Math.round(s * 0.16) : 'inherit'};flex:0 0 auto;${op.style || ''}">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;
}

/* نسخة مسطّحة (بدون خلفية) للاستخدام فوق خلفيات برجاندي ملوّنة */
function SOQ_ICON_MONO(size, color) {
  const s = size || 22;
  return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" style="display:block;flex:0 0 auto" role="img" aria-label="سوقي">
  <path d="M24.4 28.8c0-9.8 15.2-9.8 15.2 0" fill="none" stroke="${color || '#fff'}" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M14 33.4a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v15.2a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="none" stroke="${color || '#fff'}" stroke-width="3"/>
  <path d="M28.6 33.6 19.6 47h18z" fill="${color || '#fff'}" opacity=".9"/>
  </svg>`;
}

/* أيقونة التبويب (favicon) كـ data URI — تعمل بدون إنترنت */
function SOQ_FAVICON() {
  const svg = SOQ_ICON_SRC.replace(/__G1__/g, 'fbg').replace(/__G2__/g, 'fbw')
    .replace(/__G3__/g, 'fbs').replace(/__G4__/g, 'fbc');
  return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\n/g, ''));
}
/* حقنها في <head> عند التشغيل (احتياطي لو الملف اتحفظ بدون الهيدر) */
function injectBrandIcon() {
  const head = document.head; if (!head) return;
  if (!$('#soqFavicon')) {
    const l = document.createElement('link');
    l.id = 'soqFavicon'; l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = SOQ_FAVICON();
    head.appendChild(l);
  }
  if (!$('#soqTouch')) {
    const a = document.createElement('link');
    a.id = 'soqTouch'; a.rel = 'apple-touch-icon'; a.href = SOQ_FAVICON();
    head.appendChild(a);
  }
  if (!$('#soqManifest')) {
    const m = document.createElement('link');
    m.id = 'soqManifest'; m.rel = 'mask-icon'; m.href = SOQ_FAVICON(); m.color = '#800020';
    head.appendChild(m);
  }
}
/* علامة مصغّرة لعناوين الأقسام: أيقونة + اسم */
function brandMark(size) {
  return `<span class="brand" style="gap:9px">${SOQ_ICON(size || 34)}<span><b>سوقي</b><span>SOUQI</span></span></span>`;
}
