import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PALETTE, PATTERNS, simulate, deltaE, assignColors } from '../js/palette.js';
import { regionMap } from '../js/rules.js';

const TYPES = ['deutan', 'protan'];
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const sim = (hex, t) => (t === 'normal' ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : simulate(hex, t));

test('Palette und Muster: je 10, Muster verschieden', () => {
  assert.equal(PALETTE.length, 10);
  assert.equal(PATTERNS.length, 10);
  assert.equal(new Set(PALETTE).size, 10);
  assert.equal(new Set(PATTERNS).size, 10);
  for (const c of PALETTE) assert.match(c, /^#[0-9a-f]{6}$/);
});

test('simulate und deltaE: Grundverhalten', () => {
  assert.deepEqual(simulate('#ffffff', 'deutan'), [255, 255, 255]);
  assert.deepEqual(simulate('#000000', 'protan'), [0, 0, 0]);
  assert.equal(deltaE('#336699', '#336699'), 0);
  assert.ok(Math.abs(deltaE('#000000', '#ffffff') - 100) < 0.1);
  // Rot und Grün rücken unter Deutan näher zusammen
  assert.ok(deltaE(simulate('#ff0000', 'deutan'), simulate('#00ff00', 'deutan')) < deltaE('#ff0000', '#00ff00'));
});

test('alle Paare: min(ΔE normal, deutan, protan) >= 10', () => {
  for (let i = 0; i < 10; i++) {
    for (let j = i + 1; j < 10; j++) {
      for (const t of ['normal', ...TYPES]) {
        const d = deltaE(sim(PALETTE[i], t), sim(PALETTE[j], t));
        assert.ok(d >= 10, `${PALETTE[i]} / ${PALETTE[j]} ${t}: ${d.toFixed(1)}`);
      }
    }
  }
});

test('Kontrast zu Symbolgrau #4a4a4a >= 3:1', () => {
  for (const c of PALETTE) assert.ok(contrast(c, '#4a4a4a') >= 3, `${c}: ${contrast(c, '#4a4a4a').toFixed(2)}`);
});

test('assignColors: Nachbarbereiche unter beiden Simulationen ΔE >= 20, deterministisch', () => {
  const all = JSON.parse(readFileSync(new URL('../puzzles/10.json', import.meta.url)));
  for (let k = 0; k < 20; k++) {
    const p = all[k * Math.floor(all.length / 20)];
    const cols = assignColors(p);
    assert.deepEqual(assignColors(p), cols);
    const m = regionMap(p);
    assert.equal(cols.length, p.n);
    const pairs = new Set();
    for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
      const a = m[r * p.n + c];
      if (c + 1 < p.n) pairs.add(`${a},${m[r * p.n + c + 1]}`);
      if (r + 1 < p.n) pairs.add(`${a},${m[(r + 1) * p.n + c]}`);
    }
    for (const key of pairs) {
      const [a, b] = key.split(',').map(Number);
      if (a === b) continue;
      for (const t of TYPES) {
        const d = deltaE(simulate(PALETTE[cols[a]], t), simulate(PALETTE[cols[b]], t));
        assert.ok(d >= 20, `${p.id} ${a}-${b} ${t}: ${d.toFixed(1)}`);
      }
    }
  }
});
