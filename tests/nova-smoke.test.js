import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

test('NOVA STUDY dashboard exposes the Arabic study experience', () => {
  for (const phrase of ['NOVA STUDY', 'موادي الدراسية', 'خطة اليوم', 'آخر الملفات', 'مساعدك الدراسي الذكي', 'الإحصائيات']) {
    assert.match(html, new RegExp(phrase));
  }
});

test('desktop and mobile navigation are available', () => {
  assert.match(html, /class="sidebar"/);
  assert.match(html, /class="mobile-bottom"/);
  assert.match(html, /data-nav="subjects"/);
  assert.match(html, /data-action="assistant"/);
});

test('embedded JavaScript is syntactically valid', async () => {
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script && script.length > 5000);
  const file = join(tmpdir(), 'nova-index-check.js');
  await writeFile(file, script);
  const result = spawnSync(process.execPath, ['--check', file], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
});

test('PWA manifest and offline cache use NOVA branding', () => {
  assert.equal(manifest.short_name, 'NOVA STUDY');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.theme_color, '#070B24');
  assert.ok(manifest.icons.some(icon => icon.src === 'nova-icon-512.png'));
  assert.match(sw, /nova-books\.webp/);
});
