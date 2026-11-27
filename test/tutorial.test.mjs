import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regionMap } from '../js/rules.js';
import { lineDemo, regionDemo, touchDemo } from '../js/tutorial.js';

const pool = JSON.parse(readFileSync(new URL('../puzzles/tutorial.json', import.meta.url)));
const sol = (p) => p.solution.map((c, r) => r * p.n + c);
const near = (n, a, b) => Math.abs((a % n) - (b % n)) <= 1 && Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1;

for (const p of pool) {
  test(`${p.id}: lineDemo Zeile/Spalte`, () => {
    for (const kind of ['row', 'column']) {
      const { line, good, bad } = lineDemo(p, kind);
      assert.equal(line.length, p.n);
      assert.ok(sol(p).includes(good));
      assert.ok(line.includes(good) && line.includes(bad) && good !== bad);
      assert.ok(!sol(p).includes(bad));
    }
  });
  test(`${p.id}: regionDemo ein Doggy je Bereich`, () => {
    const reg = regionMap(p);
    const items = regionDemo(p);
    assert.equal(items.length, p.n);
    for (const { region, cells, dog } of items) {
      assert.ok(cells.every((c) => reg[c] === region));
      assert.equal(reg[dog], region);
      assert.ok(sol(p).includes(dog));
    }
  });
  test(`${p.id}: touchDemo`, () => {
    const { dog, bad, paws } = touchDemo(p);
    assert.ok(sol(p).includes(dog));
    assert.ok(near(p.n, dog, bad) && paws.every((c) => near(p.n, dog, c)));
    assert.ok(!paws.includes(bad) && !paws.includes(dog) && bad !== dog);
  });
}
