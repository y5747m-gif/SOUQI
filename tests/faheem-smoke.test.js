import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

test('Faheem app shell exposes the requested Arabic study workflow', () => {
  for (const phrase of ['فهيم', 'إضافة ومعالجة المحتوى', 'كانفاس الطالب', 'تسوية الأشكال', 'تصدير ومشاركة الخريطة', 'البطاقات الذكية']) {
    assert.match(html, new RegExp(phrase));
  }
});

test('mind-map workspace starts without demo course content', () => {
  assert.doesNotMatch(html, /الديناميكا الحرارية|دورة كارنو|الفيزياء التطبيقية|علم البيانات/);
  assert.match(html, /اكتب المفهوم الأساسي هنا/);
});

test('embedded JavaScript is syntactically valid', async () => {
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script && script.length > 1000);
  const file = join(tmpdir(), 'faheem-index-check.js');
  await writeFile(file, script);
  const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
});

test('PWA manifest is branded for Faheem', () => {
  assert.equal(manifest.short_name, 'فهيم');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.theme_color, '#1E3A2F');
  assert.ok(manifest.icons.some(icon => icon.src === 'faheem-icon-512.png'));
});
