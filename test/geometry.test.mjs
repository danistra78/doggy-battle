import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regionOutline, cellAt, classifyGesture } from '../js/geometry.js';

const count = (s, ch) => (s.match(new RegExp(ch, 'g')) ?? []).length;

test('1x1-Bereich: Pfad mit 4 Bögen', () => {
  const puzzle = { n: 2, regions: 'ABBB' };
  const d = regionOutline(puzzle, 0);
  assert.equal(count(d, 'A'), 4);
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
});

test('L-förmiger Bereich: 5 konvexe Bögen, 1 spitze Ecke', () => {
  const puzzle = { n: 2, regions: 'AAAB' };
  const d = regionOutline(puzzle, 0);
  assert.equal(count(d, 'A'), 5);
  // 6 Ecken insgesamt, davon 5 mit Bogen; die übrige ist spitz (nur L zur Ecke)
  assert.equal(count(d, 'L'), 6);
  assert.equal(count(d, 'L') - count(d, 'A'), 1);
});

test('Kontur skaliert mit Zellgrösse', () => {
  const puzzle = { n: 2, regions: 'ABBB' };
  const d = regionOutline(puzzle, 0, 100, 18);
  assert.match(d, /A18 18/);
});

test('cellAt: Mitte, Rand, ausserhalb', () => {
  assert.equal(cellAt(5, 5, 8, 80), 0);
  assert.equal(cellAt(75, 5, 8, 80), 7);
  assert.equal(cellAt(15, 25, 8, 80), 17);
  assert.equal(cellAt(0, 0, 8, 80), 0);
  assert.equal(cellAt(79.9, 79.9, 8, 80), 63);
  assert.equal(cellAt(80, 10, 8, 80), -1);
  assert.equal(cellAt(-1, 10, 8, 80), -1);
  assert.equal(cellAt(10, 90, 8, 80), -1);
});

test('classifyGesture: 5-px-Zittern über Zellgrenze bleibt Tipp auf Startzelle', () => {
  const pts = [{ x: 8, y: 5 }, { x: 11, y: 6 }, { x: 13, y: 5 }, { x: 9, y: 5 }];
  assert.deepEqual(classifyGesture(pts, 8, 80), { kind: 'tap', cell: 0 });
});

test('classifyGesture: 30-px-Wisch über 3 Zellen', () => {
  const pts = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 25, y: 5 }, { x: 35, y: 5 }];
  assert.deepEqual(classifyGesture(pts, 8, 80), { kind: 'swipe', cells: [0, 1, 2, 3] });
  const three = [{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 24, y: 5 }];
  assert.deepEqual(classifyGesture(three, 8, 80), { kind: 'swipe', cells: [0, 1, 2] });
});

test('classifyGesture: >8 px innerhalb einer Zelle bleibt Tipp', () => {
  const pts = [{ x: 51, y: 5 }, { x: 59, y: 5 }, { x: 52, y: 8 }];
  assert.equal(classifyGesture([{ x: 41, y: 5 }, { x: 49.5, y: 5 }, { x: 41, y: 12 }], 4, 160).kind, 'tap');
  assert.equal(classifyGesture(pts, 4, 160).kind, 'tap');
});
