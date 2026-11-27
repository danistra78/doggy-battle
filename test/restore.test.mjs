import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreGame } from '../js/restore.js';
import { reset } from '../js/progress.js';

const p4 = { id: 't', n: 4, regions: 'AABBAABBCCDDCCDD', solution: [1, 3, 0, 2] };
const pools = { 4: [p4, p4, p4], 5: [] };

test('ohne current: frisches Rätsel des Abschnitts', () => {
  const g = restoreGame(reset(), pools);
  assert.equal(g.puzzle, p4);
  assert.equal(g.cells.length, 16);
});

test('gültiges current wird wiederhergestellt, autoMark übernommen', () => {
  const cells = new Array(16).fill(0); cells[3] = 2;
  const save = { ...reset(), current: { puzzle: p4, cells }, settings: { sound: true, autoMark: false } };
  const g = restoreGame(save, pools);
  assert.equal(g.cells[3], 2);
  assert.equal(g.autoMark, false);
});

test('unbrauchbares current fällt zurück', () => {
  const bad = [
    { puzzle: p4, cells: [0, 1] },
    { puzzle: { n: 4 }, cells: new Array(16).fill(0) },
    { puzzle: p4, cells: new Array(16).fill(7) },
    { puzzle: 5, cells: new Array(16).fill(0) },
    { puzzle: p4, cells: 'x' },
  ];
  for (const current of bad) {
    const g = restoreGame({ ...reset(), current }, pools);
    assert.equal(g.puzzle, p4);
    assert.equal(g.cells.every((v) => v === 0), true);
  }
});
