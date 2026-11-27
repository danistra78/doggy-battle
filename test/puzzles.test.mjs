import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { countSolutions, solveLogic, difficulty } from '../js/solver.js';
import { isSolved } from '../js/rules.js';
import { canonical } from '../js/generator.js';
import { regionsConnected, solutionCells, cmpList } from './fixtures.mjs';

const dir = new URL('../puzzles/', import.meta.url);
const files = { 'tutorial.json': [4, 3], '5.json': [5, 100], '6.json': [6, 100], '7.json': [7, 100],
  '8.json': [8, 100], '9.json': [9, 100], '10.json': [10, 300] };

test('puzzles/: genau die erwarteten Dateien', () => {
  assert.deepEqual(readdirSync(dir).sort(), Object.keys(files).sort());
});

for (const [file, [n, count]] of Object.entries(files)) {
  test(`puzzles/${file}: ${count} gültige Rätsel ${n}×${n}`, () => {
    const list = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.equal(list.length, count);
    const canon = new Set();
    list.forEach((p, k) => {
      assert.equal(p.id, `${n}-${String(k + 1).padStart(3, '0')}`);
      assert.equal(p.n, n);
      assert.equal(p.regions.length, n * n);
      assert.equal(p.solution.length, n);
      assert.ok(regionsConnected(p), p.id);
      assert.ok(isSolved(p, solutionCells(p)), p.id);
      assert.equal(countSolutions(p), 1, p.id);
      const res = solveLogic(p);
      assert.equal(res.solved, true, p.id);
      assert.deepEqual(p.difficulty, difficulty(res), p.id);
      if (k > 0) assert.ok(cmpList(list[k - 1].difficulty, p.difficulty) <= 0, `sortiert: ${p.id}`);
      canon.add(canonical(p));
    });
    assert.equal(canon.size, count, 'keine Dubletten');
  });
}
