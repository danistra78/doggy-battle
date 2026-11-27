import test from 'node:test';
import assert from 'node:assert/strict';
import { rng, generate, transform, canonical } from '../js/generator.js';
import { countSolutions, solveLogic, difficulty } from '../js/solver.js';
import { isSolved } from '../js/rules.js';
import { FIX5, regionsConnected, solutionCells } from './fixtures.mjs';

// erstes Rätsel aus einer Zufallsfolge (generate darf null liefern)
function first(n, seed) {
  const rand = rng(seed);
  for (let k = 0; k < 500; k++) {
    const p = generate(n, rand);
    if (p) return p;
  }
  throw new Error(`kein Rätsel für n=${n}, seed=${seed}`);
}

test('rng: deterministisch, Werte in [0,1)', () => {
  const a = rng(7), b = rng(7), c = rng(8);
  const xa = Array.from({ length: 20 }, a), xb = Array.from({ length: 20 }, b);
  assert.deepEqual(xa, xb);
  assert.notDeepEqual(xa, Array.from({ length: 20 }, c));
  for (const x of xa) assert.ok(x >= 0 && x < 1);
});

test('generate: gleicher Seed -> gleiches Ergebnis', () => {
  assert.deepEqual(generate(6, rng(1)), generate(6, rng(1)));
  assert.deepEqual(first(6, 1), first(6, 1));
});

test('generate: Doggys in verschiedenen Bereichen, jeder Bereich >= 1 Zelle', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const p = first(6, seed);
    const regs = p.solution.map((c, r) => p.regions[r * p.n + c]);
    assert.equal(new Set(regs).size, p.n);
    for (let g = 0; g < p.n; g++) assert.ok(p.regions.includes(String.fromCharCode(65 + g)));
  }
});

for (let n = 5; n <= 8; n++) {
  test(`generate: n=${n} eindeutig, logisch lösbar, Bereiche zusammenhängend`, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const p = first(n, seed);
      assert.equal(p.n, n);
      assert.equal(p.regions.length, n * n);
      assert.equal(p.solution.length, n);
      assert.ok(regionsConnected(p), `zusammenhängend: ${p.regions}`);
      assert.equal(countSolutions(p), 1);
      const res = solveLogic(p);
      assert.equal(res.solved, true);
      assert.deepEqual(res.cells.filter(v => v === 2).length, n);
      assert.ok(isSolved(p, solutionCells(p)));
      assert.deepEqual(p.difficulty, difficulty(res));
    }
  });
}

test('transform: 8 Varianten, t=0 identisch, Lösung bleibt gültig', () => {
  const p = first(7, 3);
  assert.deepEqual(transform(p, 0).regions, p.regions);
  const seen = new Set();
  for (let t = 0; t < 8; t++) {
    const q = transform(p, t);
    seen.add(q.regions);
    assert.ok(regionsConnected(q));
    assert.ok(isSolved(q, solutionCells(q)));
    assert.equal(countSolutions(q), 1);
  }
  assert.ok(seen.size >= 2);
});

test('transform: Bereiche nach erstem Auftreten benannt', () => {
  const q = transform(FIX5, 1);
  let next = 65;
  const map = new Map();
  for (const ch of q.regions) if (!map.has(ch)) { assert.equal(ch.charCodeAt(0), next++); map.set(ch, 1); }
});

test('canonical: invariant unter allen Transformationen', () => {
  for (const p of [FIX5, first(6, 2), first(8, 4)]) {
    const c = canonical(p);
    for (let t = 0; t < 8; t++) assert.equal(canonical(transform(p, t)), c);
  }
});
