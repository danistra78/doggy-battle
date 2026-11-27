import test from 'node:test';
import assert from 'node:assert/strict';
import { FIX5, FIX5_CELLS } from './fixtures.mjs';
import { EMPTY, MARK, DOG, regionMap, influence, conflicts, autoMarks, isSolved } from '../js/rules.js';

const n = FIX5.n;
const board = (dogs, marks = []) => {
  const c = new Uint8Array(n * n);
  for (const i of marks) c[i] = MARK;
  for (const i of dogs) c[i] = DOG;
  return c;
};

test('Konstanten', () => assert.deepEqual([EMPTY, MARK, DOG], [0, 1, 2]));

test('regionMap', () => {
  const m = regionMap(FIX5);
  assert.ok(m instanceof Int8Array);
  assert.equal(m.length, 25);
  assert.equal(m[0], 0);
  assert.equal(m[3], 1);
  assert.equal(m[14], 2);
});

test('influence der Ecke 0', () => {
  const inf = influence(FIX5, 0);
  const m = regionMap(FIX5);
  const exp = new Set([1, 5, 6]);
  for (let k = 0; k < n; k++) { exp.add(k); exp.add(k * n); }
  for (let i = 0; i < 25; i++) if (m[i] === m[0]) exp.add(i);
  exp.delete(0);
  assert.deepEqual(inf, [...exp].sort((a, b) => a - b));
  assert.ok(!inf.includes(0));
});

test('conflicts: gleiche Zeile', () => assert.deepEqual([...conflicts(FIX5, board([0, 4]))].sort(), [0, 4]));
test('conflicts: gleiche Spalte', () => assert.deepEqual([...conflicts(FIX5, board([4, 24]))].sort((a, b) => a - b), [4, 24]));
test('conflicts: diagonal berührend', () => assert.deepEqual([...conflicts(FIX5, board([10, 16]))].sort((a, b) => a - b), [10, 16]));
test('conflicts: gleicher Bereich', () => {
  // 3 und 12 liegen beide in Bereich B, sonst ohne Bezug
  assert.deepEqual([...conflicts(FIX5, board([3, 12]))].sort((a, b) => a - b), [3, 12]);
});
test('conflicts: Lösung ohne Konflikt', () => assert.equal(conflicts(FIX5, board(FIX5_CELLS)).size, 0));
test('conflicts: ignoriert MARK', () => assert.equal(conflicts(FIX5, board([0], [1, 2])).size, 0));

test('autoMarks: ein Doggy', () => {
  const marks = [1];
  const am = autoMarks(FIX5, board([0], marks));
  const exp = influence(FIX5, 0).filter(i => !marks.includes(i));
  assert.deepEqual([...am].sort((a, b) => a - b), exp);
});
test('autoMarks: kein Doggy', () => assert.equal(autoMarks(FIX5, board([])).size, 0));

test('isSolved', () => {
  assert.equal(isSolved(FIX5, board(FIX5_CELLS)), true);
  assert.equal(isSolved(FIX5, board(FIX5_CELLS.slice(1))), false);
  assert.equal(isSolved(FIX5, board([0, 1, 12, 18, 24])), false); // 5 Doggys, Konflikt
});
