import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/state.js';
import { EMPTY, MARK, DOG } from '../js/rules.js';
import { FIX5, FIX5_CELLS } from './fixtures.mjs';

const n = FIX5.n;
const at = (r, c) => r * n + c;

test('tap zyklisch: mark, dog, empty', () => {
  const g = new Game(FIX5);
  const i = at(0, 0);
  g.tap(i); assert.equal(g.view(i), 'mark');
  g.tap(i); assert.equal(g.view(i), 'dog');
  g.tap(i); assert.equal(g.view(i), 'empty');
});

test('Auto-Pfote: Nachbar zeigt auto, tap macht dog', () => {
  const g = new Game(FIX5);
  g.set(at(2, 2), DOG);
  const nb = at(2, 3);
  assert.equal(g.view(nb), 'auto');
  g.tap(nb);
  assert.equal(g.view(nb), 'dog');
});

test('Doggy entfernen: auto wird empty, Hand-MARK bleibt', () => {
  const g = new Game(FIX5);
  const nb = at(2, 3), hand = at(2, 4);
  g.tap(hand);
  g.set(at(2, 2), DOG);
  assert.equal(g.view(nb), 'auto');
  assert.equal(g.view(hand), 'mark');
  g.tap(at(2, 2)); // dog -> empty (war EMPTY->... set DOG, tap: DOG->EMPTY)
  assert.equal(g.view(nb), 'empty');
  assert.equal(g.view(hand), 'mark');
});

test('autoMark=false: Nachbar bleibt empty', () => {
  const g = new Game(FIX5, undefined, false);
  g.set(at(2, 2), DOG);
  assert.equal(g.view(at(2, 3)), 'empty');
  g.autoMark = true;
  assert.equal(g.view(at(2, 3)), 'auto');
});

test('Wischen: nur leere werden mark, ein Undo', () => {
  const g = new Game(FIX5, undefined, false);
  const a = at(0, 0), b = at(0, 1), c = at(0, 2), d = at(0, 3);
  g.set(a, DOG); g.set(c, MARK);
  g.beginSwipe();
  for (const i of [a, b, c, d]) g.swipeOver(i);
  g.endSwipe();
  assert.deepEqual([a, b, c, d].map(i => g.view(i)), ['dog', 'mark', 'mark', 'mark']);
  assert.equal(g.undo(), true);
  assert.deepEqual([a, b, c, d].map(i => g.view(i)), ['dog', 'empty', 'mark', 'empty']);
});

test('Wisch ohne Änderung: kein Undo-Eintrag', () => {
  const g = new Game(FIX5, undefined, false);
  g.set(at(0, 0), DOG);
  g.undo();
  g.set(at(0, 0), DOG);
  g.beginSwipe();
  g.swipeOver(at(0, 0));
  g.endSwipe();
  assert.equal(g.undo(), true); // set
  assert.equal(g.undo(), false);
});

test('Undo nach set(i, DOG)', () => {
  const g = new Game(FIX5);
  g.set(at(1, 1), DOG);
  g.undo();
  assert.equal(g.cells[at(1, 1)], EMPTY);
});

test('onChange, toJSON, solved, conflicts', () => {
  const g = new Game(FIX5);
  let calls = 0;
  g.onChange(() => calls++);
  for (const i of FIX5_CELLS) g.set(i, DOG);
  assert.equal(calls, FIX5_CELLS.length);
  assert.equal(g.solved(), true);
  assert.equal(g.conflicts().size, 0);
  g.undo();
  assert.equal(calls, FIX5_CELLS.length + 1);
  assert.equal(g.solved(), false);
  const j = g.toJSON();
  assert.equal(j.puzzle, FIX5);
  assert.ok(Array.isArray(j.cells));
  const g2 = new Game(FIX5, Uint8Array.from(j.cells));
  assert.equal(g2.cells[FIX5_CELLS[0]], DOG);
});

test('Wischen: Auto-Pfoten werden nicht zu Hand-Pfoten', () => {
  const g = new Game(FIX5, undefined, true);
  g.set(at(2, 2), DOG);
  const auto = at(2, 3), far = at(0, 0);
  assert.equal(g.view(auto), 'auto');
  assert.equal(g.view(far), 'empty');
  g.beginSwipe();
  g.swipeOver(auto); g.swipeOver(far);
  g.endSwipe();
  assert.equal(g.cells[auto], EMPTY);
  assert.equal(g.cells[far], MARK);
  g.set(at(2, 2), EMPTY);
  assert.equal(g.view(auto), 'empty');
});
