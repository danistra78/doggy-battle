import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const block = sw.match(/const FILES = \[([\s\S]*?)\];/)[1];
const files = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const listed = new Set(files.map((f) => normalize(f).replace(/\/$/, '')));

function imports(rel, seen = new Set()) {
  if (seen.has(rel)) return seen;
  seen.add(rel);
  const src = readFileSync(join(root, rel), 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*'(\.[^']+)'/g)) imports(normalize(join(dirname(rel), m[1])), seen);
  return seen;
}

test('Dateiliste ist relativ und jede Datei existiert', () => {
  assert.ok(files.length > 0);
  for (const f of files) {
    assert.ok(f.startsWith('./'), `nicht relativ: ${f}`);
    assert.ok(existsSync(join(root, f)), `fehlt: ${f}`);
  }
});

test('alle von main.js importierten Module sind gelistet', () => {
  for (const m of imports('js/main.js')) assert.ok(listed.has(m), `fehlt in sw.js: ${m}`);
});

test('alle Rätsel, index.html, Manifest und Icons sind gelistet', () => {
  for (const f of readdirSync(join(root, 'puzzles')).filter((n) => n.endsWith('.json'))) {
    assert.ok(listed.has(`puzzles/${f}`), `fehlt in sw.js: puzzles/${f}`);
  }
  for (const f of ['.', 'index.html', 'manifest.webmanifest', 'css/app.css', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png']) {
    assert.ok(listed.has(f), `fehlt in sw.js: ${f}`);
  }
});

test('Cache-Name ist gesetzt', () => {
  assert.match(sw, /const CACHE = 'doggy-v\d+';/);
});
