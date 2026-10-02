import fs from 'node:fs';
import assert from 'node:assert/strict';

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('souqi.html', 'utf8');
const source = fs.readFileSync('src/08b-pwa-plans.js', 'utf8');

assert.strictEqual(manifest.display, 'standalone', 'التطبيق يجب أن يعمل في نافذة مستقلة');
assert.ok(manifest.start_url.includes('souqi.html'), 'رابط بدء التطبيق غير صحيح');
assert.ok(manifest.icons.some(i => i.sizes === '192x192'), 'أيقونة 192 مطلوبة');
assert.ok(manifest.icons.some(i => i.sizes === '512x512'), 'أيقونة 512 مطلوبة');
assert.ok(html.includes('rel="manifest"'), 'ملف HTML يجب أن يربط manifest');
assert.ok(html.includes('id="installAppBtn"'), 'زر تحميل التطبيق غير موجود');
assert.ok(html.includes('function plansPage()'), 'صفحة الباقات لم تدخل البناء النهائي');
assert.ok(source.includes("provider === 'paymob' ? 'card' : 'fawry_reference'"), 'ربط الدفع الحقيقي غير موجود');
assert.ok(source.includes('/api/subscriptions/checkout'), 'واجهة الاشتراك غير مربوطة بالـ API');
assert.ok(source.includes('plusWorkspace'), 'مركز بلس الذكي غير موجود');
assert.ok(sw.includes("self.addEventListener('fetch'"), 'دعم العمل دون اتصال غير موجود');
assert.ok(sw.includes("self.addEventListener('install'"), 'تثبيت service worker غير موجود');
console.log('🎉 اختبارات التطبيق المثبّت وسوقي بلس نجحت');
