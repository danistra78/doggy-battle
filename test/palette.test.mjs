import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PALETTE, PATTERNS, simulate, deltaE, assignColors, simDistance } from '../js/palette.js';
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

const CREAM = '#fdf8ee';
const labOf = (hex) => {
  const [r, g, b] = sim(hex, 'normal').map(lin);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (v) => (v > 216 / 24389 ? Math.cbrt(v) : (24389 / 27 * v + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
};
const chroma = (hex) => Math.hypot(labOf(hex)[1], labOf(hex)[2]);
const hue = (hex) => (Math.atan2(labOf(hex)[2], labOf(hex)[1]) * 180 / Math.PI + 360) % 360;

test('weiche Pastelle: Chroma >= 15 und ΔE zu Creme >= 15 (kein Grau, kein Fast-Weiss)', () => {
  for (const c of PALETTE) {
    assert.ok(chroma(c) >= 15, `${c} Chroma ${chroma(c).toFixed(1)}`);
    assert.ok(deltaE(c, CREAM) >= 15, `${c} ΔE Creme ${deltaE(c, CREAM).toFixed(1)}`);
  }
});

test('Farbtöne: höchstens 2 Palettenfarben pro 40°-Fenster des CIELab-Farbtonwinkels', () => {
  const hs = PALETTE.map(hue);
  for (const start of hs) {
    const n = hs.filter((h) => (h - start + 360) % 360 < 40).length;
    assert.ok(n <= 2, `${n} Farben ab ${start.toFixed(0)} Grad`);
  }
});

const load = (f) => JSON.parse(readFileSync(new URL(`../puzzles/${f}.json`, import.meta.url)));

test('assignColors: eindeutige Farben, Nachbar-ΔE >= 20 (deutan/protan), deterministisch, alle Rätsel', () => {
  for (const f of ['tutorial', 5, 6, 7, 8, 9, 10]) {
    for (const p of load(f)) {
      const cols = assignColors(p);
      assert.deepEqual(assignColors(p), cols);
      assert.equal(cols.length, p.n);
      assert.equal(new Set(cols).size, p.n, `${p.id}: Farben nicht eindeutig`);
      const m = regionMap(p);
      for (let r = 0; r < p.n; r++) for (let c = 0; c < p.n; c++) {
        const a = m[r * p.n + c];
        for (const b of [c + 1 < p.n ? m[r * p.n + c + 1] : a, r + 1 < p.n ? m[(r + 1) * p.n + c] : a]) {
          if (a === b) continue;
          assert.ok(simDistance(PALETTE[cols[a]], PALETTE[cols[b]]) >= 20, `${p.id} ${a}-${b}`);
        }
      }
    }
  }
});
