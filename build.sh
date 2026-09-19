#!/usr/bin/env bash
# ============================================================
#  سوقي | SOUQI — سكربت البناء والاختبار
#  يجمع ملفات src/*.js داخل ملف واحد souqi.html ويعمل اختبار تشغيلي.
#  الاستخدام:  bash build.sh        (بناء + اختبار)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "▸ تجميع ملفات المصدر..."
cat src/*.js > /tmp/souqi-app.js
node --check /tmp/souqi-app.js && echo "  ✔ فحص الصياغة ناجح"

echo "▸ حقن الكود داخل souqi.html..."
python3 - <<'PY'
import re, io
html = io.open('souqi.html', encoding='utf-8').read()
js  = io.open('/tmp/souqi-app.js', encoding='utf-8').read()
banner = ('<script>\n/* ============================================================\n'
          '   سوقي | SOUQI — تطبيق النموذج التفاعلي (Vanilla JS، بدون أي مكتبات)\n'
          '   مبني من مجلد src/ بواسطة build.sh\n'
          '   ============================================================ */\n')
html = re.sub(r'\n<script>.*?</script>\n</body>', '\n</body>', html, flags=re.S)
if '</body>' not in html:
    raise SystemExit('لم يتم العثور على </body>')
html = html.replace('</body>', banner + js + '\n</script>\n</body>')
io.open('souqi.html', 'w', encoding='utf-8').write(html)
print('  ✔ حجم الملف النهائي: %.1f كيلوبايت' % (len(html.encode()) / 1024))
PY

echo "▸ اختبار التشغيل..."
cat tests/dom-stub.js /tmp/souqi-app.js tests/render-tests.js > /tmp/souqi-render.js
node /tmp/souqi-render.js | tail -6
cat tests/dom-stub.js /tmp/souqi-app.js tests/boot-tests.js > /tmp/souqi-boot.js
node /tmp/souqi-boot.js | tail -3
echo "▸ اختبار وحدة تسجيل المحلات..."
cat tests/dom-stub.js /tmp/souqi-app.js tests/register-tests.js > /tmp/souqi-reg.js
node /tmp/souqi-reg.js | tail -4
echo "▸ اختبار المحلات الحقيقية والأيقونة..."
cat tests/dom-stub.js /tmp/souqi-app.js tests/real-tests.js > /tmp/souqi-real.js
node /tmp/souqi-real.js | tail -8
echo "▸ اختبارات واجهة Google Places..."
cat tests/dom-stub.js /tmp/souqi-app.js tests/places-client-tests.js > /tmp/souqi-places-client.js
node /tmp/souqi-places-client.js
echo "▸ اختبارات Backend Google Places..."
node --test tests/places-server.test.js
echo "✅ تم البناء والاختبار بنجاح — شغّل npm start لفتح التطبيق والبحث الحقيقي."
